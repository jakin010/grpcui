package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestIsLoopback(t *testing.T) {
	for addr, want := range map[string]bool{
		"127.0.0.1": true, "localhost": true, "LocalHost": true, "::1": true, "[::1]": true, "127.0.0.2": true,
		"0.0.0.0": false, "": false, "192.168.1.5": false, "example.com": false, "::": false,
	} {
		if got := isLoopback(addr); got != want {
			t.Errorf("isLoopback(%q) = %v, want %v", addr, got, want)
		}
	}
}

func checkHosts(t *testing.T, h http.Handler, hosts map[string]int) {
	t.Helper()
	for host, want := range hosts {
		r := httptest.NewRequest(http.MethodGet, "/api/history?target=x", nil)
		r.Host = host
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		if w.Code != want {
			t.Errorf("Host %q: got status %d, want %d", host, w.Code, want)
		}
	}
}

var noContent = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNoContent)
})

func TestRequireLoopbackHostAllowHost(t *testing.T) {
	h := requireLoopbackHost(noContent, "127.0.0.1", []string{"grpcui.local", "Proxy.Example.COM", "[fd00::1]"})
	checkHosts(t, h, map[string]int{
		"grpcui.local":          http.StatusNoContent,
		"grpcui.local:443":      http.StatusNoContent,
		"GRPCUI.Local:8080":     http.StatusNoContent,
		"grpcui.local.":         http.StatusNoContent,
		"proxy.example.com":     http.StatusNoContent,
		"[fd00::1]:8080":        http.StatusNoContent,
		"localhost:8080":        http.StatusNoContent,
		"127.0.0.1:8080":        http.StatusNoContent,
		"other.local":           http.StatusForbidden,
		"grpcui.local.evil.com": http.StatusForbidden,
		"evil.grpcui.local":     http.StatusForbidden,
		"example.com":           http.StatusForbidden,
		"[fd00::2]:8080":        http.StatusForbidden,
		"":                      http.StatusForbidden,
	})
	// the bind address itself is accepted, whatever its form
	checkHosts(t, requireLoopbackHost(noContent, "[::1]", nil), map[string]int{"[::1]:1": http.StatusNoContent, "x.test": http.StatusForbidden})
}

func TestCheckAllowedHost(t *testing.T) {
	for host, ok := range map[string]bool{
		"grpcui.local": true, "GRPCUI.local": true, "10.0.0.1": true, "::1": true, "[::1]": true,
		"grpcui.local:8080": false, "[::1]:80": false, "": false, " ": false, "http://x": false, "a b": false,
	} {
		if err := checkAllowedHost(host); (err == nil) != ok {
			t.Errorf("checkAllowedHost(%q) = %v, want ok=%v", host, err, ok)
		}
	}
}

func TestChooseDatabase(t *testing.T) {
	for _, tc := range []struct {
		bind, db   string
		explicit   bool
		wantPath   string
		wantNotice string // substring; "" means no notice
	}{
		{"127.0.0.1", "/d/grpcui.db", false, "/d/grpcui.db", ""},
		{"localhost", "/d/grpcui.db", true, "/d/grpcui.db", ""},
		{"::1", "/d/grpcui.db", false, "/d/grpcui.db", ""},
		{"0.0.0.0", "/d/grpcui.db", false, "", "kept in each browser"},
		{"", "/d/grpcui.db", false, "", "-db=path"},
		{"192.168.1.5", "/d/grpcui.db", true, "/d/grpcui.db", "credentials"},
		{"0.0.0.0", "", true, "", ""},
		{"0.0.0.0", "", false, "", ""},
	} {
		path, notice := chooseDatabase(tc.bind, tc.db, tc.explicit)
		if path != tc.wantPath {
			t.Errorf("chooseDatabase(%q, %q, %v): path %q, want %q", tc.bind, tc.db, tc.explicit, path, tc.wantPath)
		}
		if (tc.wantNotice == "") != (notice == "") || !strings.Contains(notice, tc.wantNotice) {
			t.Errorf("chooseDatabase(%q, %q, %v): notice %q, want one containing %q", tc.bind, tc.db, tc.explicit, notice, tc.wantNotice)
		}
		if strings.Contains(notice, "\n") {
			t.Errorf("notice %q is more than one line", notice)
		}
	}
}

func TestRequireLoopbackHost(t *testing.T) {
	h := requireLoopbackHost(noContent, "127.0.0.1", nil)
	for host, want := range map[string]int{
		"127.0.0.1:8080":        http.StatusNoContent,
		"localhost:8080":        http.StatusNoContent,
		"localhost":             http.StatusNoContent,
		"[::1]:8080":            http.StatusNoContent,
		"evil.example.com:8080": http.StatusForbidden,
		"evil.example.com":      http.StatusForbidden,
		"10.0.0.1:8080":         http.StatusForbidden,
	} {
		r := httptest.NewRequest(http.MethodGet, "/api/history?target=x", nil)
		r.Host = host
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		if w.Code != want {
			t.Errorf("Host %q: got status %d, want %d", host, w.Code, want)
		}
	}
}
