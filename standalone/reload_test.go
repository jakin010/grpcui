package standalone

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/jhump/protoreflect/desc"
	"google.golang.org/grpc/health/grpc_health_v1"
	reflectionpb "google.golang.org/grpc/reflection/grpc_reflection_v1"
)

func methodsOf(t *testing.T, fd *desc.FileDescriptor) []*desc.MethodDescriptor {
	t.Helper()
	var methods []*desc.MethodDescriptor
	for _, sd := range fd.GetServices() {
		methods = append(methods, sd.GetMethods()...)
	}
	return methods
}

func TestReloadSchema(t *testing.T) {
	health, err := desc.WrapFile(grpc_health_v1.File_grpc_health_v1_health_proto)
	if err != nil {
		t.Fatal(err)
	}
	refl, err := desc.WrapFile(reflectionpb.File_grpc_reflection_v1_reflection_proto)
	if err != nil {
		t.Fatal(err)
	}

	// starts with the health service; a reload finds the reflection service
	// instead (or fails, when failNext is set)
	failNext := false
	reload := func(ctx context.Context) ([]*desc.MethodDescriptor, []*desc.FileDescriptor, error) {
		if failNext {
			return nil, nil, errors.New("server unreachable")
		}
		return methodsOf(t, refl), []*desc.FileDescriptor{refl}, nil
	}
	h := Handler(nil, "localhost:1234", methodsOf(t, health), []*desc.FileDescriptor{health}, WithSchemaReloader(reload))

	send := func(method, path string, csrf bool) *httptest.ResponseRecorder {
		t.Helper()
		r := httptest.NewRequest(method, path, strings.NewReader("{}"))
		r.Header.Set("Content-Type", "application/json")
		if csrf {
			r.AddCookie(&http.Cookie{Name: csrfCookieName, Value: "tok"})
			r.Header.Set(csrfHeaderName, "tok")
		}
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		return w
	}
	const healthCheck = "/metadata?method=grpc.health.v1.Health.Check"
	const reflInfo = "/metadata?method=grpc.reflection.v1.ServerReflection.ServerReflectionInfo"

	index := send("GET", "/", false).Body.String()
	if !strings.Contains(index, `"reloadURI":"reload"`) || !strings.Contains(index, "grpc.health.v1.Health") {
		t.Fatal("index should offer reloading and list the health service")
	}
	if w := send("GET", healthCheck, false); w.Code != 200 {
		t.Fatalf("health metadata before reload: status %d", w.Code)
	}

	if w := send("POST", "/reload", false); w.Code != http.StatusUnauthorized {
		t.Fatalf("reload without CSRF token: status %d, want 401", w.Code)
	}
	if w := send("GET", "/reload", true); w.Code != http.StatusMethodNotAllowed {
		t.Fatalf("GET reload: status %d, want 405", w.Code)
	}

	w := send("POST", "/reload", true)
	if w.Code != 200 {
		t.Fatalf("reload: status %d: %s", w.Code, w.Body)
	}
	var got struct {
		Services []string                    `json:"services"`
		Methods  map[string][]map[string]any `json:"methods"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	if len(got.Services) != 1 || got.Services[0] != "grpc.reflection.v1.ServerReflection" {
		t.Fatalf("reload returned services %v", got.Services)
	}

	// everything serves the new schema
	if w := send("GET", reflInfo, false); w.Code != 200 {
		t.Errorf("reflection metadata after reload: status %d", w.Code)
	}
	if w := send("GET", healthCheck, false); w.Code == 200 {
		t.Error("health metadata should be gone after reload")
	}
	index = send("GET", "/", false).Body.String()
	if strings.Contains(index, "grpc.health.v1.Health") || !strings.Contains(index, "grpc.reflection.v1.ServerReflection") {
		t.Error("index should list the reloaded services")
	}
	if w := send("POST", "/invoke/grpc.health.v1.Health.Check", true); w.Code != http.StatusNotFound {
		t.Errorf("invoking a removed method: status %d, want 404", w.Code)
	}

	// a failed reload keeps the current schema
	failNext = true
	if w := send("POST", "/reload", true); w.Code != http.StatusBadGateway || !strings.Contains(w.Body.String(), "server unreachable") {
		t.Errorf("failed reload: status %d, body %q", w.Code, w.Body)
	}
	if w := send("GET", reflInfo, false); w.Code != 200 {
		t.Errorf("schema should be unchanged after a failed reload: status %d", w.Code)
	}
}

func TestNoReloadByDefault(t *testing.T) {
	h := Handler(nil, "localhost:1234", nil, nil)
	r := httptest.NewRequest("GET", "/", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if strings.Contains(w.Body.String(), "reloadURI") {
		t.Error("index shouldn't offer reloading without a reloader")
	}
}
