package standalone

import (
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/fullstorydev/grpcui/storage"
)

func TestHandlerWithStorage(t *testing.T) {
	store, err := storage.Open(filepath.Join(t.TempDir(), "grpcui.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = store.Close() }()
	// No methods are needed to serve the page and the storage API, and the
	// channel is only used to invoke RPCs.
	h := Handler(nil, "localhost:1234", nil, nil, WithStorage(store.Handler()))

	send := func(method, path, body string, cookie, header string) *httptest.ResponseRecorder {
		t.Helper()
		r := httptest.NewRequest(method, path, strings.NewReader(body))
		if cookie != "" {
			r.AddCookie(&http.Cookie{Name: csrfCookieName, Value: cookie})
		}
		if header != "" {
			r.Header.Set(csrfHeaderName, header)
		}
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		return w
	}

	// the page tells the form where the API is
	if w := send("GET", "/", "", "", ""); w.Code != 200 || !strings.Contains(w.Body.String(), `"storageURI":"api"`) {
		t.Errorf("index: status %d, storageURI missing from config", w.Code)
	}

	const saved = `{"name":"n","service":"pkg.Svc","method":"M","request":{"data":{}}}`
	for _, tc := range []struct {
		name           string
		cookie, header string
	}{
		{"no token", "", ""},
		{"cookie only", "tok", ""},
		{"header only", "", "tok"},
		{"mismatch", "tok", "other"},
	} {
		if w := send("POST", "/api/saved", saved, tc.cookie, tc.header); w.Code != http.StatusUnauthorized {
			t.Errorf("%s: status %d, want 401", tc.name, w.Code)
		}
	}
	if w := send("DELETE", "/api/history?target=x", "", "", ""); w.Code != http.StatusUnauthorized {
		t.Errorf("DELETE without token: status %d, want 401", w.Code)
	}

	if w := send("POST", "/api/saved", saved, "tok", "tok"); w.Code != 200 {
		t.Errorf("POST with token: status %d (%s), want 200", w.Code, w.Body.String())
	}
	w := send("GET", "/api/saved", "", "", "")
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"name":"n"`) {
		t.Errorf("GET without token: status %d (%s), want 200 with the saved request", w.Code, w.Body.String())
	}
	if w := send("GET", "/api/nope", "", "", ""); w.Code != 404 {
		t.Errorf("unknown API path: status %d, want 404", w.Code)
	}
}

func TestHandlerWithoutStorage(t *testing.T) {
	h := Handler(nil, "localhost:1234", nil, nil)
	r := httptest.NewRequest("GET", "/", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if !strings.Contains(w.Body.String(), `"storageURI":""`) {
		t.Errorf("index: storageURI should be empty")
	}
	r = httptest.NewRequest("GET", "/api/saved", nil)
	w = httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 404 {
		t.Errorf("GET /api/saved without storage: status %d, want 404", w.Code)
	}
}
