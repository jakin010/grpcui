// Package webauthn is a virtual WebAuthn authenticator: it creates passkeys
// and signs login challenges in software, producing the same JSON a browser's
// navigator.credentials.create() and get() return (PublicKeyCredential's
// toJSON form). It lets grpcui test a server's passkey RPCs for any relying
// party ID, which a real authenticator only allows on that site.
//
// Passkeys use ES256 (ECDSA P-256 with SHA-256) and "none" attestation.
package webauthn

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"strings"
)

// algES256 is the COSE algorithm number of ES256.
const algES256 = -7

// Authenticator data flags.
const (
	flagUserPresent  = 0x01
	flagUserVerified = 0x04
	flagAttested     = 0x40
)

// Descriptor names a credential in allowCredentials or excludeCredentials.
type Descriptor struct {
	Type       string   `json:"type,omitempty"`
	ID         string   `json:"id"`
	Transports []string `json:"transports,omitempty"`
}

// CreationOptions is PublicKeyCredentialCreationOptionsJSON. Binary values
// are base64url (standard base64 is accepted too).
type CreationOptions struct {
	Challenge string `json:"challenge"`
	RP        struct {
		ID   string `json:"id,omitempty"`
		Name string `json:"name,omitempty"`
	} `json:"rp"`
	User struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		DisplayName string `json:"displayName,omitempty"`
	} `json:"user"`
	PubKeyCredParams []struct {
		Type string `json:"type,omitempty"`
		Alg  int    `json:"alg"`
	} `json:"pubKeyCredParams,omitempty"`
	ExcludeCredentials []Descriptor `json:"excludeCredentials,omitempty"`
}

// RequestOptions is PublicKeyCredentialRequestOptionsJSON.
type RequestOptions struct {
	Challenge        string       `json:"challenge"`
	RPID             string       `json:"rpId,omitempty"`
	AllowCredentials []Descriptor `json:"allowCredentials,omitempty"`
}

// Passkey is a passkey made by this authenticator.
type Passkey struct {
	CredentialID []byte
	RPID         string
	UserID       []byte
	UserName     string
	DisplayName  string
	PrivateKey   *ecdsa.PrivateKey
	SignCount    uint32
}

// PublicKey returns the passkey's public key in SubjectPublicKeyInfo form.
func (p *Passkey) PublicKey() []byte {
	der, err := x509.MarshalPKIXPublicKey(&p.PrivateKey.PublicKey)
	if err != nil {
		panic(err) // can't happen for a P-256 key
	}
	return der
}

// Error is a problem with the options, as opposed to a failure of the
// authenticator itself. Its message says what to fix.
type Error struct{ msg string }

func (e *Error) Error() string { return e.msg }

func errorf(format string, args ...any) error {
	return &Error{msg: fmt.Sprintf(format, args...)}
}

// DecodeBinary decodes a WebAuthn binary value: base64url or standard
// base64, with or without padding.
func DecodeBinary(s string) ([]byte, error) {
	s = strings.TrimRight(strings.TrimSpace(s), "=")
	s = strings.NewReplacer("+", "-", "/", "_").Replace(s)
	return base64.RawURLEncoding.DecodeString(s)
}

// EncodeBinary encodes a binary value as base64url without padding.
func EncodeBinary(b []byte) string {
	return base64.RawURLEncoding.EncodeToString(b)
}

func decodeField(name, s string, required bool) ([]byte, error) {
	if s == "" {
		if required {
			return nil, errorf("%s is required", name)
		}
		return nil, nil
	}
	b, err := DecodeBinary(s)
	if err != nil {
		return nil, errorf("%s is not base64: %v", name, err)
	}
	return b, nil
}

// checkOrigin checks the origin and returns the relying party ID to use: the
// one given or, if empty, the origin's host.
func checkOrigin(origin, rpID string) (string, error) {
	u, err := url.Parse(origin)
	if err != nil || (u.Scheme != "https" && u.Scheme != "http") || u.Host == "" || u.Path != "" && u.Path != "/" {
		return "", errorf("origin %q must be a scheme and host, such as https://example.com", origin)
	}
	if rpID == "" {
		rpID = u.Hostname()
	}
	return rpID, nil
}

// clientData returns the clientDataJSON for a ceremony, with members in the
// order browsers write them.
func clientData(typ string, challenge []byte, origin string) []byte {
	enc := func(s string) string {
		b, _ := json.Marshal(s)
		return string(b)
	}
	return []byte(`{"type":` + enc(typ) +
		`,"challenge":` + enc(EncodeBinary(challenge)) +
		`,"origin":` + enc(strings.TrimSuffix(origin, "/")) +
		`,"crossOrigin":false}`)
}

// authData returns authenticator data, without attested credential data.
func authData(rpID string, flags byte, signCount uint32) []byte {
	h := sha256.Sum256([]byte(rpID))
	b := append(h[:], flags)
	return binary.BigEndian.AppendUint32(b, signCount)
}

// coseKey returns the public key as a COSE_Key.
func coseKey(pub *ecdsa.PublicKey) []byte {
	x := make([]byte, 32)
	y := make([]byte, 32)
	pub.X.FillBytes(x)
	pub.Y.FillBytes(y)
	return cborEncode(cborMap{
		{1, 2},        // kty: EC2
		{3, algES256}, // alg
		{-1, 1},       // crv: P-256
		{-2, x},       // x
		{-3, y},       // y
	})
}

// Create makes a passkey for the given options, as navigator.credentials.create()
// would on the given origin. It returns the passkey and the credential JSON
// (a RegistrationResponseJSON). exists says whether this authenticator already
// holds a credential ID, for excludeCredentials.
func Create(opts CreationOptions, origin string, exists func(rpID string, credentialID []byte) bool) (*Passkey, json.RawMessage, error) {
	rpID, err := checkOrigin(origin, opts.RP.ID)
	if err != nil {
		return nil, nil, err
	}
	challenge, err := decodeField("challenge", opts.Challenge, true)
	if err != nil {
		return nil, nil, err
	}
	userID, err := decodeField("user.id", opts.User.ID, true)
	if err != nil {
		return nil, nil, err
	}
	if len(userID) > 64 {
		return nil, nil, errorf("user.id is %d bytes; WebAuthn allows at most 64", len(userID))
	}
	if opts.User.Name == "" {
		return nil, nil, errorf("user.name is required")
	}
	if len(opts.PubKeyCredParams) > 0 {
		ok := false
		for _, p := range opts.PubKeyCredParams {
			ok = ok || (p.Alg == algES256 && (p.Type == "" || p.Type == "public-key"))
		}
		if !ok {
			return nil, nil, errorf("pubKeyCredParams doesn't allow ES256 (-7), the only algorithm grpcui's passkeys use")
		}
	}
	for i, d := range opts.ExcludeCredentials {
		id, err := decodeField(fmt.Sprintf("excludeCredentials[%d].id", i), d.ID, true)
		if err != nil {
			return nil, nil, err
		}
		if exists != nil && exists(rpID, id) {
			return nil, nil, errorf("a passkey in excludeCredentials is already stored for %s: the server says this account already has it", rpID)
		}
	}

	priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, nil, err
	}
	credID := make([]byte, 16)
	if _, err := rand.Read(credID); err != nil {
		return nil, nil, err
	}
	pk := &Passkey{
		CredentialID: credID,
		RPID:         rpID,
		UserID:       userID,
		UserName:     opts.User.Name,
		DisplayName:  opts.User.DisplayName,
		PrivateKey:   priv,
	}

	ad := authData(rpID, flagUserPresent|flagUserVerified|flagAttested, 0)
	ad = append(ad, make([]byte, 16)...) // AAGUID: none
	ad = binary.BigEndian.AppendUint16(ad, uint16(len(credID)))
	ad = append(ad, credID...)
	ad = append(ad, coseKey(&priv.PublicKey)...)
	attestation := cborEncode(cborMap{
		{"fmt", "none"},
		{"attStmt", cborMap{}},
		{"authData", ad},
	})
	cd := clientData("webauthn.create", challenge, origin)

	cred, err := json.Marshal(map[string]any{
		"id":    EncodeBinary(credID),
		"rawId": EncodeBinary(credID),
		"type":  "public-key",
		"response": map[string]any{
			"clientDataJSON":     EncodeBinary(cd),
			"attestationObject":  EncodeBinary(attestation),
			"authenticatorData":  EncodeBinary(ad),
			"transports":         []string{"internal"},
			"publicKey":          EncodeBinary(pk.PublicKey()),
			"publicKeyAlgorithm": algES256,
		},
		"authenticatorAttachment": "platform",
		"clientExtensionResults":  map[string]any{},
	})
	if err != nil {
		return nil, nil, err
	}
	return pk, cred, nil
}

// ResolveRPID returns the relying party ID a login with these options is for.
func (opts RequestOptions) ResolveRPID(origin string) (string, error) {
	return checkOrigin(origin, opts.RPID)
}

// Allows says whether the options let the given credential answer.
func (opts RequestOptions) Allows(credentialID []byte) (bool, error) {
	if len(opts.AllowCredentials) == 0 {
		return true, nil // a discoverable login: any passkey for the site
	}
	for i, d := range opts.AllowCredentials {
		id, err := decodeField(fmt.Sprintf("allowCredentials[%d].id", i), d.ID, true)
		if err != nil {
			return false, err
		}
		if string(id) == string(credentialID) {
			return true, nil
		}
	}
	return false, nil
}

// Get signs a login challenge with the passkey, as navigator.credentials.get()
// would on the given origin. It increases the passkey's sign count and returns
// the credential JSON (an AuthenticationResponseJSON).
func Get(opts RequestOptions, origin string, pk *Passkey) (json.RawMessage, error) {
	rpID, err := opts.ResolveRPID(origin)
	if err != nil {
		return nil, err
	}
	if rpID != pk.RPID {
		return nil, errorf("this passkey is for %s, not %s", pk.RPID, rpID)
	}
	challenge, err := decodeField("challenge", opts.Challenge, true)
	if err != nil {
		return nil, err
	}
	allowed, err := opts.Allows(pk.CredentialID)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, errorf("allowCredentials doesn't include this passkey")
	}
	if pk.PrivateKey == nil {
		return nil, errors.New("passkey has no private key")
	}

	pk.SignCount++
	ad := authData(rpID, flagUserPresent|flagUserVerified, pk.SignCount)
	cd := clientData("webauthn.get", challenge, origin)
	cdHash := sha256.Sum256(cd)
	digest := sha256.Sum256(append(append([]byte{}, ad...), cdHash[:]...))
	sig, err := ecdsa.SignASN1(rand.Reader, pk.PrivateKey, digest[:])
	if err != nil {
		return nil, err
	}
	resp := map[string]any{
		"clientDataJSON":    EncodeBinary(cd),
		"authenticatorData": EncodeBinary(ad),
		"signature":         EncodeBinary(sig),
	}
	if len(pk.UserID) > 0 {
		resp["userHandle"] = EncodeBinary(pk.UserID)
	}
	return json.Marshal(map[string]any{
		"id":                      EncodeBinary(pk.CredentialID),
		"rawId":                   EncodeBinary(pk.CredentialID),
		"type":                    "public-key",
		"response":                resp,
		"authenticatorAttachment": "platform",
		"clientExtensionResults":  map[string]any{},
	})
}

// MarshalPrivateKey encodes a private key as PKCS #8.
func MarshalPrivateKey(k *ecdsa.PrivateKey) ([]byte, error) {
	return x509.MarshalPKCS8PrivateKey(k)
}

// ParsePrivateKey decodes a PKCS #8 private key made by MarshalPrivateKey.
func ParsePrivateKey(der []byte) (*ecdsa.PrivateKey, error) {
	k, err := x509.ParsePKCS8PrivateKey(der)
	if err != nil {
		return nil, err
	}
	ek, ok := k.(*ecdsa.PrivateKey)
	if !ok {
		return nil, errors.New("not an ECDSA key")
	}
	return ek, nil
}
