package storage

import (
	"crypto/rand"
	"fmt"
	"net/http"
	"strings"
	"testing"

	"github.com/fullstorydev/grpcui/internal/webauthn"
)

func randomB64(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return webauthn.EncodeBinary(b)
}

func TestPasskeyLifecycle(t *testing.T) {
	s, _ := openTestStore(t)
	h := s.Handler()

	createBody := fmt.Sprintf(`{"origin":"https://example.com","options":{
		"challenge":%q,"rp":{"id":"example.com","name":"Example"},
		"user":{"id":%q,"name":"alice"},"pubKeyCredParams":[{"type":"public-key","alg":-7}]}}`,
		randomB64(32), randomB64(16))
	var created struct {
		Passkey    passkey        `json:"passkey"`
		Credential map[string]any `json:"credential"`
	}
	mustDo(t, h, "POST", "/passkeys/create", createBody, http.StatusOK, &created)
	pk := created.Passkey
	if pk.Status != statusPending || pk.Kind != kindVirtual || pk.RPID != "example.com" || pk.UserName != "alice" {
		t.Fatalf("created passkey = %+v", pk)
	}
	if created.Credential["id"] != pk.CredentialID {
		t.Errorf("credential id %v, passkey %v", created.Credential["id"], pk.CredentialID)
	}

	signBody := func(allow string) string {
		return fmt.Sprintf(`{"origin":"https://example.com","options":{"challenge":%q,"rpId":"example.com"%s}}`, randomB64(32), allow)
	}
	// pending passkeys can't sign
	if code, body := do(t, h, "POST", "/passkeys/sign", signBody("")); code != http.StatusUnprocessableEntity {
		t.Fatalf("sign with pending passkey: %d %s", code, body)
	}
	mustDo(t, h, "POST", fmt.Sprintf("/passkeys/%d/confirm", pk.ID), "", http.StatusOK, nil)

	var signed struct {
		Passkey    passkey        `json:"passkey"`
		Credential map[string]any `json:"credential"`
	}
	mustDo(t, h, "POST", "/passkeys/sign", signBody(""), http.StatusOK, &signed)
	mustDo(t, h, "POST", "/passkeys/sign", signBody(fmt.Sprintf(`,"allowCredentials":[{"type":"public-key","id":%q}]`, pk.CredentialID)), http.StatusOK, &signed)
	if signed.Passkey.SignCount != 2 || signed.Passkey.LastUsedAt == nil {
		t.Errorf("after two logins: %+v", signed.Passkey)
	}
	resp, _ := signed.Credential["response"].(map[string]any)
	if resp["signature"] == nil || resp["userHandle"] == nil {
		t.Errorf("assertion response = %v", resp)
	}

	// not in allowCredentials
	if code, body := do(t, h, "POST", "/passkeys/sign", signBody(fmt.Sprintf(`,"allowCredentials":[{"id":%q}]`, randomB64(16)))); code != http.StatusUnprocessableEntity || !strings.Contains(body, "allowCredentials") {
		t.Errorf("sign with other allowCredentials: %d %s", code, body)
	}
	// another site
	if code, _ := do(t, h, "POST", "/passkeys/sign", `{"origin":"https://other.test","options":{"challenge":"AAAA"}}`); code != http.StatusUnprocessableEntity {
		t.Errorf("sign for another site: %d", code)
	}

	// the list never includes private keys
	code, body := do(t, h, "GET", "/passkeys", "")
	if code != http.StatusOK || strings.Contains(strings.ToLower(body), "private") || !strings.Contains(body, pk.CredentialID) {
		t.Errorf("list: %d %s", code, body)
	}

	// excludeCredentials with the stored passkey
	excl := strings.Replace(createBody, `"pubKeyCredParams"`, fmt.Sprintf(`"excludeCredentials":[{"id":%q}],"pubKeyCredParams"`, pk.CredentialID), 1)
	if code, body := do(t, h, "POST", "/passkeys/create", excl); code != http.StatusUnprocessableEntity {
		t.Errorf("create with excluded passkey: %d %s", code, body)
	}
	// bad options
	if code, _ := do(t, h, "POST", "/passkeys/create", `{"origin":"https://example.com","options":{"challenge":"AAAA","user":{"id":"AAAA"}}}`); code != http.StatusUnprocessableEntity {
		t.Errorf("create without user.name: %d", code)
	}
	if code, _ := do(t, h, "POST", "/passkeys/create", `{"origin":"example.com","options":{}}`); code != http.StatusUnprocessableEntity {
		t.Errorf("create with bad origin: %d", code)
	}

	mustDo(t, h, "DELETE", fmt.Sprintf("/passkeys/%d", pk.ID), "", http.StatusNoContent, nil)
	mustDo(t, h, "DELETE", fmt.Sprintf("/passkeys/%d", pk.ID), "", http.StatusNotFound, nil)
}

func TestRecordDevicePasskey(t *testing.T) {
	s, _ := openTestStore(t)
	h := s.Handler()
	cred := randomB64(16)
	body := fmt.Sprintf(`{"rpId":"localhost","origin":"http://localhost:8080","credentialId":%q,"userName":"bob"}`, cred)
	var p passkey
	mustDo(t, h, "POST", "/passkeys", body, http.StatusOK, &p)
	if p.Kind != kindDevice || p.Status != statusPending {
		t.Errorf("recorded = %+v", p)
	}
	mustDo(t, h, "POST", "/passkeys", body, http.StatusConflict, nil)
	mustDo(t, h, "POST", "/passkeys", `{"rpId":"localhost"}`, http.StatusBadRequest, nil)
	// device passkeys can't sign in grpcui
	if code, _ := do(t, h, "POST", "/passkeys/sign", `{"origin":"http://localhost:8080","options":{"challenge":"AAAA"}}`); code != http.StatusUnprocessableEntity {
		t.Errorf("sign with device passkey: %d", code)
	}
}

func TestFlows(t *testing.T) {
	s, _ := openTestStore(t)
	h := s.Handler()
	var f flow
	mustDo(t, h, "POST", "/flows", `{"name":" Login alice ","kind":"login","flow":{"b":1,"a":{"y":2,"x":1}}}`, http.StatusOK, &f)
	if f.Name != "Login alice" || string(f.Flow) != `{"a":{"x":1,"y":2},"b":1}` {
		t.Errorf("added flow = %+v (%s)", f, f.Flow)
	}
	mustDo(t, h, "PUT", fmt.Sprintf("/flows/%d", f.ID), `{"name":"Register","kind":"register","flow":{}}`, http.StatusOK, &f)
	if f.Kind != "register" {
		t.Errorf("updated flow = %+v", f)
	}
	var list struct{ Items []flow }
	mustDo(t, h, "GET", "/flows", "", http.StatusOK, &list)
	if len(list.Items) != 1 {
		t.Errorf("list = %+v", list)
	}
	for _, bad := range []string{`{"kind":"login","flow":{}}`, `{"name":"x","kind":"other","flow":{}}`, `{"name":"x","kind":"login","flow":[]}`, `{"name":"x","kind":"login"}`} {
		mustDo(t, h, "POST", "/flows", bad, http.StatusBadRequest, nil)
	}
	mustDo(t, h, "PUT", "/flows/99", `{"name":"x","kind":"login","flow":{}}`, http.StatusNotFound, nil)
	mustDo(t, h, "DELETE", fmt.Sprintf("/flows/%d", f.ID), "", http.StatusNoContent, nil)
	mustDo(t, h, "DELETE", fmt.Sprintf("/flows/%d", f.ID), "", http.StatusNotFound, nil)
}
