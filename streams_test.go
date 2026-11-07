package grpcui

import (
	"bufio"
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/jhump/protoreflect/desc"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/reflection"
	reflectionpb "google.golang.org/grpc/reflection/grpc_reflection_v1"
)

// startReflectionServer runs a gRPC server whose reflection service (a
// bidirectional stream) the tests call through the invoke handler.
func startReflectionServer(t *testing.T) (http.Handler, string) {
	t.Helper()
	lis, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	svr := grpc.NewServer()
	reflection.RegisterV1(svr)
	go svr.Serve(lis)
	t.Cleanup(svr.Stop)

	cc, err := grpc.NewClient(lis.Addr().String(), grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { cc.Close() })

	fd, err := desc.WrapFile(reflectionpb.File_grpc_reflection_v1_reflection_proto)
	if err != nil {
		t.Fatal(err)
	}
	md := fd.FindService("grpc.reflection.v1.ServerReflection").FindMethodByName("ServerReflectionInfo")
	return RPCInvokeHandler(cc, []*desc.MethodDescriptor{md}), "/" + md.GetFullyQualifiedName()
}

func post(t *testing.T, url, body string) *http.Response {
	t.Helper()
	resp, err := http.Post(url, "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	return resp
}

func nextEvent(t *testing.T, events chan liveEvent) liveEvent {
	t.Helper()
	select {
	case ev, ok := <-events:
		if !ok {
			t.Fatal("event stream ended early")
		}
		return ev
	case <-time.After(5 * time.Second):
		t.Fatal("timed out waiting for an event")
	}
	return liveEvent{}
}

// openCall opens a live call and returns its ID and a channel of its events.
func openCall(t *testing.T, base, data string) (string, chan liveEvent) {
	t.Helper()
	resp := post(t, base+"?op=open", `{"data": [`+data+`]}`)
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		t.Fatalf("open: HTTP %d: %s", resp.StatusCode, b)
	}
	events := make(chan liveEvent, 100)
	go func() {
		defer close(events)
		defer resp.Body.Close()
		sc := bufio.NewScanner(resp.Body)
		for sc.Scan() {
			var ev liveEvent
			if err := json.Unmarshal(sc.Bytes(), &ev); err != nil {
				t.Errorf("bad event %q: %v", sc.Text(), err)
				return
			}
			events <- ev
		}
		if err := sc.Err(); err != nil {
			t.Logf("reading events: %v", err)
		}
	}()
	ev := nextEvent(t, events)
	if ev.Type != "open" || ev.ID == "" {
		t.Fatalf("first event should be open with an ID, got %+v", ev)
	}
	return ev.ID, events
}

// waitFor skips events until one of the given type arrives.
func waitFor(t *testing.T, events chan liveEvent, typ string) liveEvent {
	t.Helper()
	for {
		ev := nextEvent(t, events)
		if ev.Type == typ {
			return ev
		}
		if ev.Type == "end" || ev.Type == "failure" {
			t.Fatalf("waiting for %q, call ended: %+v", typ, ev)
		}
	}
}

func TestLiveCallBidi(t *testing.T) {
	h, path := startReflectionServer(t)
	srv := httptest.NewServer(h)
	defer srv.Close()
	base := srv.URL + path

	id, events := openCall(t, base, `{"listServices": ""}`)
	if ev := waitFor(t, events, "message"); !strings.Contains(string(ev.Message), "grpc.reflection.v1.ServerReflection") {
		t.Fatalf("unexpected response: %s", ev.Message)
	}

	// more messages while the call is open
	if resp := post(t, base+"?op=send&id="+id, `{"data": [{"listServices": ""}]}`); resp.StatusCode != http.StatusOK {
		t.Fatalf("send: HTTP %d", resp.StatusCode)
	}
	if ev := waitFor(t, events, "sent"); ev.Sent != 2 {
		t.Fatalf("expected 2 sent, got %d", ev.Sent)
	}
	waitFor(t, events, "message")

	// a bad message is refused and the call carries on
	if resp := post(t, base+"?op=send&id="+id, `{"data": [{"noSuchField": 1}]}`); resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("bad send: expected HTTP 400, got %d", resp.StatusCode)
	}

	if resp := post(t, base+"?op=close&id="+id, `{}`); resp.StatusCode != http.StatusOK {
		t.Fatalf("close: HTTP %d", resp.StatusCode)
	}
	end := waitFor(t, events, "end")
	if end.Error != nil {
		t.Fatalf("expected OK, got %+v", end.Error)
	}
	if end.Requests == nil || end.Requests.Total != 2 || end.Requests.Sent != 2 {
		t.Fatalf("unexpected request stats %+v", end.Requests)
	}

	// the call is gone once it ends
	if resp := post(t, base+"?op=send&id="+id, `{"data": [{}]}`); resp.StatusCode != http.StatusGone {
		t.Fatalf("send after end: expected HTTP 410, got %d", resp.StatusCode)
	}
}

func TestLiveCallCancel(t *testing.T) {
	h, path := startReflectionServer(t)
	srv := httptest.NewServer(h)
	defer srv.Close()
	base := srv.URL + path

	// nothing sent yet, so the call waits for messages until cancelled
	id, events := openCall(t, base, "")
	if resp := post(t, base+"?op=cancel&id="+id, `{}`); resp.StatusCode != http.StatusOK {
		t.Fatalf("cancel: HTTP %d", resp.StatusCode)
	}
	end := waitFor(t, events, "end")
	if end.Error == nil || end.Error.Name != "Canceled" {
		t.Fatalf("expected Canceled, got %+v", end.Error)
	}
}

func TestLiveCallTimeout(t *testing.T) {
	h, path := startReflectionServer(t)
	srv := httptest.NewServer(h)
	defer srv.Close()
	base := srv.URL + path

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, "POST", base+"?op=open", strings.NewReader(`{"timeout_seconds": 0.2, "data": []}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(b), `"DeadlineExceeded"`) {
		t.Fatalf("expected the call to time out, got:\n%s", b)
	}
}
