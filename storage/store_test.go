package storage

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

func openTestStore(t *testing.T) (*Store, string) {
	t.Helper()
	path := filepath.Join(t.TempDir(), "sub", "dir", "grpcui.db")
	s, err := Open(path)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	t.Cleanup(func() { _ = s.Close() })
	return s, path
}

// do sends a request to h and returns the status and body. It checks that
// JSON responses say so.
func do(t *testing.T, h http.Handler, method, path, body string) (int, string) {
	t.Helper()
	var r *http.Request
	if body == "" {
		r = httptest.NewRequest(method, path, nil)
	} else {
		r = httptest.NewRequest(method, path, strings.NewReader(body))
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code == http.StatusOK {
		if ct := w.Header().Get("Content-Type"); ct != "application/json" {
			t.Errorf("%s %s: Content-Type %q, want application/json", method, path, ct)
		}
	}
	return w.Code, w.Body.String()
}

// mustDo is like do but fails the test unless the status is want. It decodes
// a JSON response into out, if not nil.
func mustDo(t *testing.T, h http.Handler, method, path, body string, want int, out any) {
	t.Helper()
	code, resp := do(t, h, method, path, body)
	if code != want {
		t.Fatalf("%s %s: status %d (%s), want %d", method, path, code, strings.TrimSpace(resp), want)
	}
	if out != nil {
		if err := json.Unmarshal([]byte(resp), out); err != nil {
			t.Fatalf("%s %s: bad JSON %q: %v", method, path, resp, err)
		}
	}
}

func historyPath(target string) string {
	return "/history?target=" + url.QueryEscape(target)
}

func historyItemJSON(method, startTime string) string {
	return fmt.Sprintf(`{"service":"test.KitchenSink","method":%q,"startTime":%q,"durationMS":54.2,`+
		`"request":{"timeout_seconds":5,"metadata":[{"name":"x-a","value":"b"}],"data":{"a":1}},`+
		`"responseData":{"responseMsgCount":1,"error":{"name":"NotFound","code":5}},"failureStatus":"HTTP 401"}`,
		method, startTime)
}

type historyList struct {
	Items []map[string]any `json:"items"`
}

func TestOpenTwice(t *testing.T) {
	s, path := openTestStore(t)
	h := s.Handler()
	mustDo(t, h, "POST", "/saved", `{"name":"n","service":"s","method":"m","request":{"data":{}}}`, 200, nil)
	if err := s.Close(); err != nil {
		t.Fatal(err)
	}

	s2, err := Open(path)
	if err != nil {
		t.Fatalf("reopen: %v", err)
	}
	defer func() { _ = s2.Close() }()
	var version int
	if err := s2.db.QueryRow("PRAGMA user_version").Scan(&version); err != nil {
		t.Fatal(err)
	}
	if version != len(migrations) {
		t.Errorf("user_version = %d, want %d", version, len(migrations))
	}
	var mode string
	if err := s2.db.QueryRow("PRAGMA journal_mode").Scan(&mode); err != nil {
		t.Fatal(err)
	}
	if mode != "wal" {
		t.Errorf("journal_mode = %q, want wal", mode)
	}
	var list struct{ Items []savedRequest }
	mustDo(t, s2.Handler(), "GET", "/saved", "", 200, &list)
	if len(list.Items) != 1 {
		t.Errorf("got %d saved requests after reopen, want 1", len(list.Items))
	}
}

func TestOpenNewerSchema(t *testing.T) {
	s, path := openTestStore(t)
	if _, err := s.db.Exec(fmt.Sprintf("PRAGMA user_version = %d", len(migrations)+1)); err != nil {
		t.Fatal(err)
	}
	_ = s.Close()
	if s2, err := Open(path); err == nil {
		_ = s2.Close()
		t.Fatal("Open succeeded on a database with a newer schema")
	}
}

func TestOpenOddPath(t *testing.T) {
	path := filepath.Join(t.TempDir(), "a?b#c %20d", "grpcui.db")
	s, err := Open(path)
	if err != nil {
		t.Fatalf("Open(%q): %v", path, err)
	}
	defer func() { _ = s.Close() }()
	var file string
	if err := s.db.QueryRow("SELECT file FROM pragma_database_list WHERE name = 'main'").Scan(&file); err != nil {
		t.Fatal(err)
	}
	// compare without resolving symlinks such as macOS's /var -> /private/var
	if filepath.Base(filepath.Dir(file)) != "a?b#c %20d" {
		t.Errorf("database opened at %q, want %q", file, path)
	}
}

func TestHistory(t *testing.T) {
	s, _ := openTestStore(t)
	h := s.Handler()

	var list historyList
	mustDo(t, h, "GET", historyPath("a:1"), "", 200, &list)
	if list.Items == nil || len(list.Items) != 0 {
		t.Fatalf("empty history: got %v, want []", list.Items)
	}

	var added struct{ ID int64 }
	item := historyItemJSON("Exchange", "2026-11-03T20:26:28.000Z")
	mustDo(t, h, "POST", "/history", `{"target":"a:1","item":`+item+`}`, 200, &added)
	if added.ID <= 0 {
		t.Fatalf("bad id %d", added.ID)
	}
	// a client-sent id is ignored
	item2 := strings.Replace(historyItemJSON("Second", "2026-11-03T20:27:00.000Z"), "{", `{"id":999,`, 1)
	var added2 struct{ ID int64 }
	mustDo(t, h, "POST", "/history", `{"target":"a:1","item":`+item2+`}`, 200, &added2)
	if added2.ID == 999 || added2.ID <= added.ID {
		t.Fatalf("second id %d, first %d", added2.ID, added.ID)
	}

	mustDo(t, h, "GET", historyPath("a:1"), "", 200, &list)
	if len(list.Items) != 2 {
		t.Fatalf("got %d items, want 2", len(list.Items))
	}
	if list.Items[0]["method"] != "Second" || list.Items[0]["id"] != float64(added2.ID) {
		t.Errorf("newest item = %v", list.Items[0])
	}
	// the whole object is kept
	first := list.Items[1]
	var want map[string]any
	_ = json.Unmarshal([]byte(item), &want)
	want["id"] = float64(added.ID)
	if got, _ := json.Marshal(first); string(got) != string(mustMarshal(want)) {
		t.Errorf("stored item\n%s\nwant\n%s", got, mustMarshal(want))
	}

	// other targets are separate; an empty target is a target
	mustDo(t, h, "GET", historyPath("b:2"), "", 200, &list)
	if len(list.Items) != 0 {
		t.Errorf("target b:2 has %d items, want 0", len(list.Items))
	}
	mustDo(t, h, "POST", "/history", `{"target":"","item":`+item+`}`, 200, nil)
	mustDo(t, h, "GET", historyPath(""), "", 200, &list)
	if len(list.Items) != 1 {
		t.Errorf("empty target has %d items, want 1", len(list.Items))
	}

	// delete one
	mustDo(t, h, "DELETE", fmt.Sprintf("/history/%d", added.ID), "", 204, nil)
	mustDo(t, h, "DELETE", fmt.Sprintf("/history/%d", added.ID), "", 404, nil)
	mustDo(t, h, "DELETE", "/history/abc", "", 404, nil)
	mustDo(t, h, "GET", historyPath("a:1"), "", 200, &list)
	if len(list.Items) != 1 || list.Items[0]["method"] != "Second" {
		t.Errorf("after delete: %v", list.Items)
	}

	// clear a target
	mustDo(t, h, "DELETE", historyPath("a:1"), "", 204, nil)
	mustDo(t, h, "GET", historyPath("a:1"), "", 200, &list)
	if len(list.Items) != 0 {
		t.Errorf("after clear: %d items", len(list.Items))
	}
	mustDo(t, h, "GET", historyPath(""), "", 200, &list)
	if len(list.Items) != 1 {
		t.Errorf("clear removed another target's items")
	}
}

func mustMarshal(v any) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return b
}

func TestHistoryValidation(t *testing.T) {
	s, _ := openTestStore(t)
	h := s.Handler()
	for _, tc := range []struct{ name, body string }{
		{"not JSON", `{`},
		{"no target", `{"item":` + historyItemJSON("M", "t") + `}`},
		{"no item", `{"target":"a"}`},
		{"item not object", `{"target":"a","item":[1]}`},
		{"no service", `{"target":"a","item":{"method":"M","startTime":"t"}}`},
		{"empty service", `{"target":"a","item":{"service":"","method":"M","startTime":"t"}}`},
		{"service not string", `{"target":"a","item":{"service":1,"method":"M","startTime":"t"}}`},
		{"no method", `{"target":"a","item":{"service":"S","startTime":"t"}}`},
		{"no startTime", `{"target":"a","item":{"service":"S","method":"M"}}`},
		{"null startTime", `{"target":"a","item":{"service":"S","method":"M","startTime":null}}`},
	} {
		if code, body := do(t, h, "POST", "/history", tc.body); code != 400 {
			t.Errorf("%s: status %d (%s), want 400", tc.name, code, body)
		}
	}
	mustDo(t, h, "GET", "/history", "", 400, nil)
	mustDo(t, h, "DELETE", "/history", "", 400, nil)

	code, body := do(t, h, "POST", "/history/import",
		`{"target":"a","items":[`+historyItemJSON("M", "t")+`,{"service":"S"}]}`)
	if code != 400 || !strings.Contains(body, "item 1") {
		t.Errorf("bad import item: status %d (%s), want 400 naming item 1", code, body)
	}
	var list historyList
	mustDo(t, h, "GET", historyPath("a"), "", 200, &list)
	if len(list.Items) != 0 {
		t.Errorf("failed import stored %d items", len(list.Items))
	}

	// too large
	big := `{"target":"a","item":{"service":"S","method":"M","startTime":"t","x":"` +
		strings.Repeat("x", maxBodySize) + `"}}`
	mustDo(t, h, "POST", "/history", big, http.StatusRequestEntityTooLarge, nil)
}

func TestHistoryTrim(t *testing.T) {
	s, _ := openTestStore(t)
	h := s.Handler()
	for i := 0; i < maxHistoryPerTarget+5; i++ {
		mustDo(t, h, "POST", "/history", `{"target":"a","item":`+historyItemJSON(fmt.Sprint("M", i), "t")+`}`, 200, nil)
	}
	mustDo(t, h, "POST", "/history", `{"target":"b","item":`+historyItemJSON("B", "t")+`}`, 200, nil)

	var list historyList
	mustDo(t, h, "GET", historyPath("a"), "", 200, &list)
	if len(list.Items) != maxHistoryPerTarget {
		t.Fatalf("got %d items, want %d", len(list.Items), maxHistoryPerTarget)
	}
	if got, want := list.Items[0]["method"], fmt.Sprint("M", maxHistoryPerTarget+4); got != want {
		t.Errorf("newest = %v, want %v", got, want)
	}
	if got := list.Items[len(list.Items)-1]["method"]; got != "M5" {
		t.Errorf("oldest = %v, want M5", got)
	}
	var n int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM history WHERE target = 'a'`).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != maxHistoryPerTarget {
		t.Errorf("table has %d rows for target a, want %d", n, maxHistoryPerTarget)
	}
	mustDo(t, h, "GET", historyPath("b"), "", 200, &list)
	if len(list.Items) != 1 {
		t.Errorf("target b has %d items, want 1", len(list.Items))
	}

	// an import is trimmed too
	var items []string
	for i := 0; i < 150; i++ {
		items = append(items, historyItemJSON(fmt.Sprint("I", i), fmt.Sprintf("2026-01-01T00:00:%02d.%03dZ", i/10, i%10)))
	}
	var imp struct{ Imported int }
	mustDo(t, h, "POST", "/history/import", `{"target":"c","items":[`+strings.Join(items, ",")+`]}`, 200, &imp)
	if imp.Imported != 150 {
		t.Errorf("imported = %d, want 150", imp.Imported)
	}
	mustDo(t, h, "GET", historyPath("c"), "", 200, &list)
	if len(list.Items) != maxHistoryPerTarget || list.Items[0]["method"] != "I149" || list.Items[99]["method"] != "I50" {
		t.Errorf("after import: %d items, newest %v, oldest %v", len(list.Items), list.Items[0]["method"], list.Items[len(list.Items)-1]["method"])
	}
}

func TestHistoryImportOrder(t *testing.T) {
	s, _ := openTestStore(t)
	h := s.Handler()
	body := `{"target":"a","items":[` + strings.Join([]string{
		historyItemJSON("Middle", "2026-11-03T10:00:00Z"),
		historyItemJSON("Newest", "2026-11-03T12:00:00.5+01:00"), // 11:00:00.5Z
		historyItemJSON("Oldest", "2026-11-03T09:59:59.999Z"),
		historyItemJSON("Newer", "2026-11-03T10:30:00+00:00"),
	}, ",") + `]}`
	var imp struct{ Imported int }
	mustDo(t, h, "POST", "/history/import", body, 200, &imp)
	if imp.Imported != 4 {
		t.Errorf("imported = %d, want 4", imp.Imported)
	}
	var list historyList
	mustDo(t, h, "GET", historyPath("a"), "", 200, &list)
	var got []string
	for _, it := range list.Items {
		got = append(got, it["method"].(string))
	}
	if strings.Join(got, ",") != "Newest,Newer,Middle,Oldest" {
		t.Errorf("order = %v", got)
	}
	for i := 1; i < len(list.Items); i++ {
		if list.Items[i]["id"].(float64) >= list.Items[i-1]["id"].(float64) {
			t.Errorf("ids not descending: %v", list.Items)
		}
	}

	// empty import
	mustDo(t, h, "POST", "/history/import", `{"target":"a","items":[]}`, 200, &imp)
	if imp.Imported != 0 {
		t.Errorf("empty import imported %d", imp.Imported)
	}
}

func savedJSON(name, service, method, request string) string {
	return fmt.Sprintf(`{"name":%q,"description":"d","service":%q,"method":%q,"request":%s}`, name, service, method, request)
}

func TestSaved(t *testing.T) {
	s, _ := openTestStore(t)
	h := s.Handler()

	var list struct{ Items []savedRequest }
	mustDo(t, h, "GET", "/saved", "", 200, &list)
	if list.Items == nil || len(list.Items) != 0 {
		t.Fatalf("empty list: %v", list.Items)
	}

	var a savedRequest
	mustDo(t, h, "POST", "/saved", `{"id":77,"createdAt":"x","name":"  get one ","description":"first",`+
		`"service":" pkg.Svc ","method":"Get","request":{"timeout_secs":5,"metadata":[{"name":"k","value":"v"}],"data":{"b":2,"a":[1,2.50,12345678901234567890]}}}`,
		200, &a)
	if a.ID <= 0 || a.ID == 77 || a.Name != "get one" || a.Service != "pkg.Svc" || a.Method != "Get" || a.Description != "first" {
		t.Errorf("stored %+v", a)
	}
	if a.CreatedAt == "" || a.CreatedAt == "x" || a.UpdatedAt != a.CreatedAt {
		t.Errorf("times %q %q", a.CreatedAt, a.UpdatedAt)
	}
	wantReq := `{"timeout_secs":5,"metadata":[{"name":"k","value":"v"}],"data":{"a":[1,2.50,12345678901234567890],"b":2}}`
	if string(a.Request) != wantReq {
		t.Errorf("request = %s, want %s", a.Request, wantReq)
	}

	var b, c savedRequest
	mustDo(t, h, "POST", "/saved", savedJSON("b", "pkg.Svc", "Delete", `{"data":"x","metadata":[]}`), 200, &b)
	if string(b.Request) != `{"data":"x"}` {
		t.Errorf("request = %s", b.Request)
	}
	mustDo(t, h, "POST", "/saved", savedJSON("a", "pkg.Svc", "Get", `{"data":0}`), 200, &c)

	mustDo(t, h, "GET", "/saved", "", 200, &list)
	var names []string
	for _, it := range list.Items {
		names = append(names, it.Method+"/"+it.Name)
	}
	if strings.Join(names, ",") != "Delete/b,Get/a,Get/get one" {
		t.Errorf("order = %v", names)
	}

	// PUT replaces every field
	var u savedRequest
	mustDo(t, h, "PUT", fmt.Sprintf("/saved/%d", a.ID), savedJSON("renamed", "other.Svc", "List", `{"data":[]}`), 200, &u)
	if u.ID != a.ID || u.Name != "renamed" || u.Service != "other.Svc" || u.Method != "List" || u.Description != "d" ||
		string(u.Request) != `{"data":[]}` || u.CreatedAt != a.CreatedAt {
		t.Errorf("updated = %+v", u)
	}
	mustDo(t, h, "PUT", "/saved/9999", savedJSON("x", "s", "m", `{"data":1}`), 404, nil)
	mustDo(t, h, "PUT", fmt.Sprintf("/saved/%d", a.ID), savedJSON("", "s", "m", `{"data":1}`), 400, nil)

	// DELETE
	mustDo(t, h, "DELETE", fmt.Sprintf("/saved/%d", b.ID), "", 204, nil)
	mustDo(t, h, "DELETE", fmt.Sprintf("/saved/%d", b.ID), "", 404, nil)
	mustDo(t, h, "GET", "/saved", "", 200, &list)
	if len(list.Items) != 2 {
		t.Errorf("after delete: %d items", len(list.Items))
	}
}

func TestSavedValidation(t *testing.T) {
	s, _ := openTestStore(t)
	h := s.Handler()
	for _, tc := range []struct{ name, body string }{
		{"not JSON", `{`},
		{"not object", `[1]`},
		{"blank name", savedJSON("  ", "s", "m", `{"data":1}`)},
		{"blank service", savedJSON("n", "", "m", `{"data":1}`)},
		{"blank method", savedJSON("n", "s", " ", `{"data":1}`)},
		{"no request", `{"name":"n","service":"s","method":"m"}`},
		{"null request", savedJSON("n", "s", "m", `null`)},
		{"request not object", savedJSON("n", "s", "m", `"x"`)},
		{"no data", savedJSON("n", "s", "m", `{"timeout_secs":1}`)},
		{"null data", savedJSON("n", "s", "m", `{"data":null}`)},
		{"bad timeout", savedJSON("n", "s", "m", `{"data":1,"timeout_secs":"5"}`)},
		{"negative timeout", savedJSON("n", "s", "m", `{"data":1,"timeout_secs":-1}`)},
		{"bad metadata", savedJSON("n", "s", "m", `{"data":1,"metadata":{"a":"b"}}`)},
	} {
		if code, body := do(t, h, "POST", "/saved", tc.body); code != 400 {
			t.Errorf("%s: status %d (%s), want 400", tc.name, code, body)
		}
	}
}

func TestSavedImport(t *testing.T) {
	s, _ := openTestStore(t)
	h := s.Handler()
	mustDo(t, h, "POST", "/saved", savedJSON("one", "pkg.Svc", "Get", `{"data":{"a":1,"b":2}}`), 200, nil)

	type importResult struct{ Imported, Skipped, Renamed int }
	var res importResult
	body := `{"items":[` + strings.Join([]string{
		// same as stored, with keys in another order and other description: skipped
		`{"id":5,"name":"one","description":"other","service":"pkg.Svc","method":"Get","request":{"data":{"b":2, "a":1}}}`,
		// same name, other data: imported as "one (2)"
		savedJSON("one", "pkg.Svc", "Get", `{"data":{"a":1,"b":3}}`),
		// new: imported
		savedJSON("two", "pkg.Svc", "Get", `{"data":{},"timeout_secs":2}`),
		// duplicate of the previous item: skipped
		savedJSON("two", "pkg.Svc", "Get", `{"timeout_secs":2,"data":{},"metadata":[]}`),
		// other method: imported
		savedJSON("two", "pkg.Svc", "List", `{"data":{}}`),
	}, ",") + `]}`
	mustDo(t, h, "POST", "/saved/import", body, 200, &res)
	if res != (importResult{Imported: 3, Skipped: 2, Renamed: 1}) {
		t.Errorf("import = %+v, want 3 imported, 2 skipped, 1 renamed", res)
	}
	// importing the same again skips everything
	mustDo(t, h, "POST", "/saved/import", body, 200, &res)
	if res != (importResult{Imported: 0, Skipped: 5}) {
		t.Errorf("second import = %+v, want 0 imported, 5 skipped", res)
	}

	var list struct{ Items []savedRequest }
	mustDo(t, h, "GET", "/saved", "", 200, &list)
	if len(list.Items) != 4 {
		t.Fatalf("got %d saved requests, want 4", len(list.Items))
	}

	// an -examples file (bare array) can be imported
	mustDo(t, h, "POST", "/saved/import",
		`[{"name":"ex","description":"","service":"pkg.Svc","method":"Get","request":{"timeout_secs":0,"metadata":null,"data":{"x":true}}}]`,
		200, &res)
	if res != (importResult{Imported: 1}) {
		t.Errorf("examples import = %+v", res)
	}

	// all or nothing
	code, msg := do(t, h, "POST", "/saved/import", `{"items":[`+
		savedJSON("new1", "pkg.Svc", "Get", `{"data":1}`)+","+
		savedJSON("new2", "pkg.Svc", "Get", `{"data":2}`)+","+
		savedJSON("bad", "pkg.Svc", "Get", `{"data":null}`)+`]}`)
	if code != 400 || !strings.Contains(msg, "item 2") {
		t.Errorf("bad import: status %d (%s), want 400 naming item 2", code, msg)
	}
	mustDo(t, h, "GET", "/saved", "", 200, &list)
	if len(list.Items) != 5 {
		t.Errorf("failed import changed the store: %d items, want 5", len(list.Items))
	}

	mustDo(t, h, "POST", "/saved/import", `{}`, 400, nil)
	mustDo(t, h, "POST", "/saved/import", `{"items":[]}`, 200, &res)
	if res != (importResult{}) {
		t.Errorf("empty import = %+v", res)
	}
}

func TestRouting(t *testing.T) {
	s, _ := openTestStore(t)
	h := s.Handler()
	for _, tc := range []struct {
		method, path string
		want         int
	}{
		{"GET", "/", 404},
		{"GET", "/nope", 404},
		{"GET", "/history/", 404},
		{"GET", "/saved/1/x", 404},
		{"PUT", "/history", 405},
		{"GET", "/history/1", 405},
		{"GET", "/history/import", 405},
		{"PATCH", "/saved", 405},
		{"GET", "/saved/1", 405},
		{"POST", "/saved/1", 405},
		{"GET", "/saved/import", 405},
		{"DELETE", "/saved/0", 404},
		{"DELETE", "/saved/-1", 404},
	} {
		if code, body := do(t, h, tc.method, tc.path, ""); code != tc.want {
			t.Errorf("%s %s: status %d (%s), want %d", tc.method, tc.path, code, strings.TrimSpace(body), tc.want)
		}
	}
}

func TestTwoStores(t *testing.T) {
	s1, path := openTestStore(t)
	s2, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = s2.Close() }()
	h1, h2 := s1.Handler(), s2.Handler()

	const n = 30
	var wg sync.WaitGroup
	errs := make(chan string, 4*n)
	for _, h := range []http.Handler{h1, h2} {
		wg.Add(1)
		go func(h http.Handler) {
			defer wg.Done()
			for i := 0; i < n; i++ {
				for _, req := range []struct{ method, path, body string }{
					{"POST", "/history", `{"target":"a","item":` + historyItemJSON("M", "t") + `}`},
					{"POST", "/saved/import", `{"items":[` + savedJSON("x", "s", "m", fmt.Sprintf(`{"data":%d}`, i)) + `]}`},
					{"GET", historyPath("a"), ""},
				} {
					r := httptest.NewRequest(req.method, req.path, strings.NewReader(req.body))
					w := httptest.NewRecorder()
					h.ServeHTTP(w, r)
					if w.Code != 200 {
						errs <- fmt.Sprintf("%s %s: %d %s", req.method, req.path, w.Code, w.Body.String())
					}
				}
			}
		}(h)
	}
	wg.Wait()
	close(errs)
	for e := range errs {
		t.Error(e)
	}

	var list historyList
	mustDo(t, h1, "GET", historyPath("a"), "", 200, &list)
	if len(list.Items) != 2*n {
		t.Errorf("history has %d items, want %d", len(list.Items), 2*n)
	}
	var saved struct{ Items []savedRequest }
	mustDo(t, h2, "GET", "/saved", "", 200, &saved)
	if len(saved.Items) != n {
		t.Errorf("saved has %d items, want %d (each data imported once)", len(saved.Items), n)
	}
}
