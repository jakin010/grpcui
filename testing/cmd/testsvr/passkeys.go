package main

// The passkey demo services described in passkeys.proto. The proto is parsed
// when the server starts and its messages are dynamic, so it needs no
// generated code. Passkeys are checked with github.com/go-webauthn/webauthn,
// an implementation independent of grpcui's virtual authenticator.

import (
	"context"
	"crypto/rand"
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/jhump/protoreflect/desc/protoparse"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/reflect/protodesc"
	"google.golang.org/protobuf/reflect/protoreflect"
	"google.golang.org/protobuf/reflect/protoregistry"
	"google.golang.org/protobuf/types/dynamicpb"
)

//go:embed passkeys.proto
var passkeysProto string

const passkeysProtoName = "passkeys.proto"

// passkeyFile parses passkeys.proto.
func passkeyFile() (protoreflect.FileDescriptor, error) {
	p := protoparse.Parser{
		Accessor:              protoparse.FileContentsFromMap(map[string]string{passkeysProtoName: passkeysProto}),
		IncludeSourceCodeInfo: true,
	}
	fds, err := p.ParseFiles(passkeysProtoName)
	if err != nil {
		return nil, err
	}
	return fds[0].UnwrapFile(), nil
}

// demoUser is a user of the demo relying party.
type demoUser struct {
	id          []byte
	name        string
	displayName string
	credentials []webauthn.Credential
}

func (u *demoUser) WebAuthnID() []byte                         { return u.id }
func (u *demoUser) WebAuthnName() string                       { return u.name }
func (u *demoUser) WebAuthnDisplayName() string                { return u.displayName }
func (u *demoUser) WebAuthnCredentials() []webauthn.Credential { return u.credentials }

type demoSession struct {
	data     webauthn.SessionData
	userName string // empty for a discoverable login
}

// passkeyDemo is the relying party behind both demo services.
type passkeyDemo struct {
	rpID    string
	rpName  string
	origins []string // allowed origins; "http://localhost:*" allows any port

	mu       sync.Mutex
	users    map[string]*demoUser // by name
	sessions map[string]demoSession
}

func newPasskeyDemo(rpID string, origins []string) *passkeyDemo {
	return &passkeyDemo{
		rpID:     rpID,
		rpName:   "grpcui passkey demo",
		origins:  origins,
		users:    map[string]*demoUser{},
		sessions: map[string]demoSession{},
	}
}

// relyingParty returns a go-webauthn instance that accepts the given origin,
// or an error if the origin is not allowed.
func (d *passkeyDemo) relyingParty(origin string) (*webauthn.WebAuthn, error) {
	if origin == "" {
		origin = "https://" + d.rpID
	} else if !d.originAllowed(origin) {
		return nil, status.Errorf(codes.PermissionDenied, "origin %q is not allowed (allowed: %s)", origin, strings.Join(d.origins, ", "))
	}
	return webauthn.New(&webauthn.Config{
		RPID:          d.rpID,
		RPDisplayName: d.rpName,
		RPOrigins:     []string{origin},
	})
}

func (d *passkeyDemo) originAllowed(origin string) bool {
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}
	for _, o := range d.origins {
		if o == origin {
			return true
		}
		if base, ok := strings.CutSuffix(o, ":*"); ok && u.Port() != "" && u.Scheme+"://"+u.Hostname() == base {
			return true
		}
	}
	return false
}

func randomID() []byte {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return b
}

func (d *passkeyDemo) newSession(s demoSession) string {
	id := base64.RawURLEncoding.EncodeToString(randomID())
	d.sessions[id] = s
	// forget sessions that have expired
	for k, v := range d.sessions {
		if !v.data.Expires.IsZero() && time.Now().After(v.data.Expires) {
			delete(d.sessions, k)
		}
	}
	return id
}

func (d *passkeyDemo) takeSession(id string) (demoSession, error) {
	if id == "" {
		return demoSession{}, status.Error(codes.InvalidArgument, "session_id is required")
	}
	s, ok := d.sessions[id]
	if !ok {
		return demoSession{}, status.Error(codes.NotFound, "unknown or already used session_id")
	}
	delete(d.sessions, id)
	return s, nil
}

// beginRegistration returns the creation options and a session id.
func (d *passkeyDemo) beginRegistration(userName, displayName string) (*protocol.PublicKeyCredentialCreationOptions, string, error) {
	userName = strings.TrimSpace(userName)
	if userName == "" {
		return nil, "", status.Error(codes.InvalidArgument, "user_name is required")
	}
	rp, err := d.relyingParty("")
	if err != nil {
		return nil, "", err
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	u := d.users[userName]
	if u == nil {
		if displayName == "" {
			displayName = userName
		}
		u = &demoUser{id: randomID(), name: userName, displayName: displayName}
		d.users[userName] = u
	}
	exclude := make([]protocol.CredentialDescriptor, 0, len(u.credentials))
	for _, c := range u.credentials {
		exclude = append(exclude, c.Descriptor())
	}
	creation, session, err := rp.BeginRegistration(u,
		webauthn.WithExclusions(exclude),
		webauthn.WithResidentKeyRequirement(protocol.ResidentKeyRequirementRequired))
	if err != nil {
		return nil, "", webauthnError(err)
	}
	return &creation.Response, d.newSession(demoSession{data: *session, userName: userName}), nil
}

// finishRegistration checks a registration response (as JSON).
func (d *passkeyDemo) finishRegistration(sessionID string, credential []byte) (*demoUser, *webauthn.Credential, error) {
	parsed, err := protocol.ParseCredentialCreationResponseBytes(credential)
	if err != nil {
		return nil, nil, webauthnError(err)
	}
	rp, err := d.relyingParty(parsed.Response.CollectedClientData.Origin)
	if err != nil {
		return nil, nil, err
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	s, err := d.takeSession(sessionID)
	if err != nil {
		return nil, nil, err
	}
	u := d.users[s.userName]
	if u == nil {
		return nil, nil, status.Error(codes.NotFound, "user no longer exists")
	}
	cred, err := rp.CreateCredential(u, s.data, parsed)
	if err != nil {
		return nil, nil, webauthnError(err)
	}
	u.credentials = append(u.credentials, *cred)
	return u, cred, nil
}

// beginLogin returns the request options and a session id.
func (d *passkeyDemo) beginLogin(userName string) (*protocol.PublicKeyCredentialRequestOptions, string, error) {
	userName = strings.TrimSpace(userName)
	rp, err := d.relyingParty("")
	if err != nil {
		return nil, "", err
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	var assertion *protocol.CredentialAssertion
	var session *webauthn.SessionData
	if userName == "" {
		assertion, session, err = rp.BeginDiscoverableLogin()
	} else {
		u := d.users[userName]
		if u == nil {
			return nil, "", status.Errorf(codes.NotFound, "no user named %q; register first", userName)
		}
		if len(u.credentials) == 0 {
			return nil, "", status.Errorf(codes.FailedPrecondition, "user %q has no passkeys; register first", userName)
		}
		assertion, session, err = rp.BeginLogin(u)
	}
	if err != nil {
		return nil, "", webauthnError(err)
	}
	return &assertion.Response, d.newSession(demoSession{data: *session, userName: userName}), nil
}

// finishLogin checks an assertion response (as JSON).
func (d *passkeyDemo) finishLogin(sessionID string, credential []byte) (*demoUser, *webauthn.Credential, error) {
	parsed, err := protocol.ParseCredentialRequestResponseBytes(credential)
	if err != nil {
		return nil, nil, webauthnError(err)
	}
	rp, err := d.relyingParty(parsed.Response.CollectedClientData.Origin)
	if err != nil {
		return nil, nil, err
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	s, err := d.takeSession(sessionID)
	if err != nil {
		return nil, nil, err
	}
	var u *demoUser
	var cred *webauthn.Credential
	if s.userName == "" {
		cred, err = rp.ValidateDiscoverableLogin(func(_, userHandle []byte) (webauthn.User, error) {
			for _, cand := range d.users {
				if string(cand.id) == string(userHandle) {
					u = cand
					return cand, nil
				}
			}
			return nil, errors.New("no user has this user handle")
		}, s.data, parsed)
	} else {
		u = d.users[s.userName]
		if u == nil {
			return nil, nil, status.Error(codes.NotFound, "user no longer exists")
		}
		cred, err = rp.ValidateLogin(u, s.data, parsed)
	}
	if err != nil {
		return nil, nil, webauthnError(err)
	}
	for i := range u.credentials {
		if string(u.credentials[i].ID) == string(cred.ID) {
			u.credentials[i] = *cred
		}
	}
	return u, cred, nil
}

// webauthnError turns a go-webauthn error into a gRPC status with its
// debugging details, which say exactly which check failed.
func webauthnError(err error) error {
	if _, ok := status.FromError(err); ok {
		return err
	}
	var perr *protocol.Error
	if errors.As(err, &perr) {
		msg := perr.Details
		if perr.DevInfo != "" {
			msg += ": " + perr.DevInfo
		}
		return status.Error(codes.Unauthenticated, msg)
	}
	return status.Error(codes.Unauthenticated, err.Error())
}

// ----- the two services -----

func b64url(b []byte) string {
	return base64.RawURLEncoding.EncodeToString(b)
}

// registrationJSON is the JSON form of a registration response.
func registrationJSON(id, clientData, attestation []byte, transports []string) []byte {
	if transports == nil {
		transports = []string{}
	}
	data, _ := json.Marshal(map[string]any{
		"id":    b64url(id),
		"rawId": b64url(id),
		"type":  "public-key",
		"response": map[string]any{
			"clientDataJSON":    b64url(clientData),
			"attestationObject": b64url(attestation),
			"transports":        transports,
		},
	})
	return data
}

// assertionJSON is the JSON form of an authentication response.
func assertionJSON(id, clientData, authData, sig, userHandle []byte) []byte {
	resp := map[string]any{
		"clientDataJSON":    b64url(clientData),
		"authenticatorData": b64url(authData),
		"signature":         b64url(sig),
	}
	if len(userHandle) > 0 {
		resp["userHandle"] = b64url(userHandle)
	}
	data, _ := json.Marshal(map[string]any{
		"id":       b64url(id),
		"rawId":    b64url(id),
		"type":     "public-key",
		"response": resp,
	})
	return data
}

// msg wraps a dynamic message for reading and writing fields by name.
type msg struct{ m *dynamicpb.Message }

func (m msg) fd(name string) protoreflect.FieldDescriptor {
	fd := m.m.Descriptor().Fields().ByName(protoreflect.Name(name))
	if fd == nil {
		panic(fmt.Sprintf("%s has no field %s", m.m.Descriptor().FullName(), name))
	}
	return fd
}
func (m msg) str(name string) string   { return m.m.Get(m.fd(name)).String() }
func (m msg) bytes(name string) []byte { return m.m.Get(m.fd(name)).Bytes() }
func (m msg) strs(name string) []string {
	l := m.m.Get(m.fd(name)).List()
	out := make([]string, l.Len())
	for i := range out {
		out[i] = l.Get(i).String()
	}
	return out
}
func (m msg) set(name string, v any) msg {
	fd := m.fd(name)
	switch v := v.(type) {
	case [][]byte:
		l := m.m.Mutable(fd).List()
		for _, b := range v {
			l.Append(protoreflect.ValueOfBytes(b))
		}
	default:
		m.m.Set(fd, protoreflect.ValueOf(v))
	}
	return m
}

type rpcHandler func(ctx context.Context, req msg, out msg) error

// registerPasskeyServices adds both demo services to the server.
func registerPasskeyServices(svr *grpc.Server, file protoreflect.FileDescriptor, d *passkeyDemo) {
	field := map[string]rpcHandler{
		"BeginRegistration": func(_ context.Context, req, out msg) error {
			opts, sid, err := d.beginRegistration(req.str("user_name"), req.str("display_name"))
			if err != nil {
				return err
			}
			var exclude [][]byte
			for _, c := range opts.CredentialExcludeList {
				exclude = append(exclude, c.CredentialID)
			}
			userID, _ := opts.User.ID.(protocol.URLEncodedBase64)
			out.set("challenge", []byte(opts.Challenge)).
				set("rp_id", opts.RelyingParty.ID).
				set("rp_name", opts.RelyingParty.Name).
				set("user_id", []byte(userID)).
				set("user_name", opts.User.Name).
				set("display_name", opts.User.DisplayName).
				set("existing_credential_ids", exclude).
				set("session_id", sid)
			return nil
		},
		"FinishRegistration": func(_ context.Context, req, out msg) error {
			cred := registrationJSON(req.bytes("credential_id"), req.bytes("client_data_json"), req.bytes("attestation_object"), req.strs("transports"))
			u, c, err := d.finishRegistration(req.str("session_id"), cred)
			if err != nil {
				return err
			}
			out.set("user_name", u.name).set("credential_id", c.ID).set("passkey_count", int32(len(u.credentials)))
			return nil
		},
		"BeginLogin": func(_ context.Context, req, out msg) error {
			opts, sid, err := d.beginLogin(req.str("user_name"))
			if err != nil {
				return err
			}
			var allow [][]byte
			for _, c := range opts.AllowedCredentials {
				allow = append(allow, c.CredentialID)
			}
			out.set("challenge", []byte(opts.Challenge)).
				set("rp_id", opts.RelyingPartyID).
				set("credential_ids", allow).
				set("session_id", sid)
			return nil
		},
		"FinishLogin": func(_ context.Context, req, out msg) error {
			cred := assertionJSON(req.bytes("credential_id"), req.bytes("client_data_json"), req.bytes("authenticator_data"), req.bytes("signature"), req.bytes("user_handle"))
			return finishLoginResponse(d, req.str("session_id"), cred, out)
		},
	}
	whole := map[string]rpcHandler{
		"BeginRegistration": func(_ context.Context, req, out msg) error {
			opts, sid, err := d.beginRegistration(req.str("user_name"), req.str("display_name"))
			if err != nil {
				return err
			}
			data, err := json.Marshal(opts)
			if err != nil {
				return err
			}
			out.set("session_id", sid).set("options", string(data))
			return nil
		},
		"FinishRegistration": func(_ context.Context, req, out msg) error {
			u, c, err := d.finishRegistration(req.str("session_id"), []byte(req.str("credential")))
			if err != nil {
				return err
			}
			out.set("user_name", u.name).set("credential_id", c.ID).set("passkey_count", int32(len(u.credentials)))
			return nil
		},
		"BeginLogin": func(_ context.Context, req, out msg) error {
			opts, sid, err := d.beginLogin(req.str("user_name"))
			if err != nil {
				return err
			}
			data, err := json.Marshal(opts)
			if err != nil {
				return err
			}
			out.set("session_id", sid).set("options", string(data))
			return nil
		},
		"FinishLogin": func(_ context.Context, req, out msg) error {
			return finishLoginResponse(d, req.str("session_id"), []byte(req.str("credential")), out)
		},
	}
	registerDynamicService(svr, file.Services().ByName("PasskeyDemo"), field)
	registerDynamicService(svr, file.Services().ByName("PasskeyDemoJSON"), whole)
}

func finishLoginResponse(d *passkeyDemo, sessionID string, cred []byte, out msg) error {
	u, c, err := d.finishLogin(sessionID, cred)
	if err != nil {
		return err
	}
	out.set("user_name", u.name).
		set("sign_count", c.Authenticator.SignCount).
		set("message", "Signed in as "+u.name)
	return nil
}

// registerDynamicService registers a service whose unary methods take and
// return dynamic messages.
func registerDynamicService(svr *grpc.Server, sd protoreflect.ServiceDescriptor, handlers map[string]rpcHandler) {
	desc := grpc.ServiceDesc{
		ServiceName: string(sd.FullName()),
		HandlerType: (*any)(nil),
		Metadata:    passkeysProtoName,
	}
	for i := 0; i < sd.Methods().Len(); i++ {
		md := sd.Methods().Get(i)
		fn := handlers[string(md.Name())]
		if fn == nil {
			panic("no handler for " + string(md.FullName()))
		}
		fullMethod := "/" + string(sd.FullName()) + "/" + string(md.Name())
		desc.Methods = append(desc.Methods, grpc.MethodDesc{
			MethodName: string(md.Name()),
			Handler: func(_ any, ctx context.Context, dec func(any) error, interceptor grpc.UnaryServerInterceptor) (any, error) {
				req := dynamicpb.NewMessage(md.Input())
				if err := dec(req); err != nil {
					return nil, err
				}
				call := func(ctx context.Context, req any) (any, error) {
					out := dynamicpb.NewMessage(md.Output())
					if err := fn(ctx, msg{req.(*dynamicpb.Message)}, msg{out}); err != nil {
						return nil, err
					}
					return out, nil
				}
				if interceptor == nil {
					return call(ctx, req)
				}
				return interceptor(ctx, req, &grpc.UnaryServerInfo{FullMethod: fullMethod}, call)
			},
		})
	}
	svr.RegisterService(&desc, struct{}{})
}

// combinedResolver finds descriptors in extra first, then in next. It lets
// the reflection service describe the dynamic demo services.
type combinedResolver struct {
	extra *protoregistry.Files
	next  protodesc.Resolver
}

func newCombinedResolver(next protodesc.Resolver, files ...protoreflect.FileDescriptor) (*combinedResolver, error) {
	extra := &protoregistry.Files{}
	for _, f := range files {
		if err := extra.RegisterFile(f); err != nil {
			return nil, err
		}
	}
	return &combinedResolver{extra: extra, next: next}, nil
}

func (r *combinedResolver) FindFileByPath(path string) (protoreflect.FileDescriptor, error) {
	if fd, err := r.extra.FindFileByPath(path); err == nil {
		return fd, nil
	}
	return r.next.FindFileByPath(path)
}

func (r *combinedResolver) FindDescriptorByName(name protoreflect.FullName) (protoreflect.Descriptor, error) {
	if d, err := r.extra.FindDescriptorByName(name); err == nil {
		return d, nil
	}
	return r.next.FindDescriptorByName(name)
}
