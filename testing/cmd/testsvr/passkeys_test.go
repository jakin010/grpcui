package main

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/fullstorydev/grpcui/internal/webauthn"
)

// Checks grpcui's virtual authenticator against go-webauthn, through the
// demo relying party.
func TestVirtualAuthenticatorWithDemo(t *testing.T) {
	d := newPasskeyDemo("localhost", []string{"https://localhost", "http://localhost:*"})
	stored := map[string]*webauthn.Passkey{}
	exists := func(rpID string, id []byte) bool { return stored[string(id)] != nil }

	register := func(user, origin string) *webauthn.Passkey {
		t.Helper()
		opts, sid, err := d.beginRegistration(user, "")
		if err != nil {
			t.Fatal(err)
		}
		var co webauthn.CreationOptions
		roundTrip(t, opts, &co)
		pk, cred, err := webauthn.Create(co, origin, exists)
		if err != nil {
			t.Fatal(err)
		}
		if _, _, err := d.finishRegistration(sid, cred); err != nil {
			t.Fatalf("finishRegistration: %v\n%s", err, cred)
		}
		stored[string(pk.CredentialID)] = pk
		return pk
	}
	login := func(user, origin string, pk *webauthn.Passkey) error {
		t.Helper()
		opts, sid, err := d.beginLogin(user)
		if err != nil {
			t.Fatal(err)
		}
		var ro webauthn.RequestOptions
		roundTrip(t, opts, &ro)
		cred, err := webauthn.Get(ro, origin, pk)
		if err != nil {
			t.Fatal(err)
		}
		_, c, err := d.finishLogin(sid, cred)
		if err == nil && c.Authenticator.SignCount != pk.SignCount {
			t.Errorf("server sign count %d, passkey %d", c.Authenticator.SignCount, pk.SignCount)
		}
		return err
	}

	pk := register("alice", "https://localhost")
	for i := 0; i < 2; i++ {
		if err := login("alice", "https://localhost", pk); err != nil {
			t.Fatalf("login %d: %v", i, err)
		}
	}
	if err := login("", "http://localhost:8080", pk); err != nil {
		t.Fatalf("discoverable login: %v", err)
	}
	if pk.SignCount != 3 {
		t.Errorf("sign count = %d, want 3", pk.SignCount)
	}

	// the server excludes alice's passkey, which this authenticator holds
	opts, _, err := d.beginRegistration("alice", "")
	if err != nil {
		t.Fatal(err)
	}
	var co webauthn.CreationOptions
	roundTrip(t, opts, &co)
	if _, _, err := webauthn.Create(co, "https://localhost", exists); err == nil || !strings.Contains(err.Error(), "already") {
		t.Errorf("Create with an excluded passkey: err = %v", err)
	}

	// the server rejects an origin it doesn't allow
	if err := login("alice", "https://evil.example", pk); err == nil {
		t.Error("login from another origin succeeded")
	}

	// a signature from another passkey with alice's credential ID must fail
	other := register("bob", "https://localhost")
	other.CredentialID = pk.CredentialID
	if err := login("alice", "https://localhost", other); err == nil {
		t.Error("login signed with the wrong key succeeded")
	}
}

func roundTrip(t *testing.T, in, out any) {
	t.Helper()
	data, err := json.Marshal(in)
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(data, out); err != nil {
		t.Fatal(err)
	}
}
