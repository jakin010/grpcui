package storage

import (
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"
)

func TestHistoryImportNeedsItems(t *testing.T) {
	s, _ := openTestStore(t)
	h := s.Handler()
	for _, body := range []string{`{"target":"t"}`, `{"target":"t","items":null}`, `{"target":"t","item":[]}`} {
		if status, _ := do(t, h, http.MethodPost, "/history/import", body); status != http.StatusBadRequest {
			t.Errorf("POST /history/import %s: got status %d, want 400", body, status)
		}
	}
	// an empty list is fine
	if status, _ := do(t, h, http.MethodPost, "/history/import", `{"target":"t","items":[]}`); status != http.StatusOK {
		t.Errorf("POST /history/import with empty items: got status %d, want 200", status)
	}
}

func TestDatabaseFilesArePrivate(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("file modes are not meaningful on Windows")
	}
	dir := t.TempDir()
	path := filepath.Join(dir, "grpcui.db")
	// an existing database that is readable by everyone gets tightened
	if err := os.WriteFile(path, nil, 0644); err != nil {
		t.Fatal(err)
	}
	s, err := Open(path)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer func() { _ = s.Close() }()
	// write something so the -wal and -shm files exist
	if status, _ := do(t, s.Handler(), http.MethodPost, "/history", `{"target":"t","item":`+historyItemJSON("M", "2026-01-01T00:00:00Z")+`}`); status != http.StatusOK {
		t.Fatalf("POST /history: status %d", status)
	}
	for _, p := range []string{path, path + "-wal", path + "-shm"} {
		info, err := os.Stat(p)
		if err != nil {
			continue
		}
		if mode := info.Mode().Perm(); mode&0077 != 0 {
			t.Errorf("%s has mode %v, want no group or other access", filepath.Base(p), mode)
		}
	}
}

func TestOpenReadOnlyFails(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("file modes are not meaningful on Windows")
	}
	if os.Geteuid() == 0 {
		t.Skip("root can write read-only files")
	}
	path := filepath.Join(t.TempDir(), "grpcui.db")
	s, err := Open(path)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	_ = s.Close()
	for _, suffix := range []string{"-wal", "-shm"} {
		_ = os.Remove(path + suffix)
	}
	if err := os.Chmod(path, 0400); err != nil {
		t.Fatal(err)
	}
	if s, err := Open(path); err == nil {
		_ = s.Close()
		t.Fatal("Open of a read-only database succeeded, want an error")
	}
}

func historyMethods(t *testing.T, h http.Handler, target string) []string {
	t.Helper()
	var list historyList
	mustDo(t, h, "GET", historyPath(target), "", 200, &list)
	var got []string
	for _, it := range list.Items {
		got = append(got, it["method"].(string))
	}
	return got
}

func TestHistoryOrderedByStartTime(t *testing.T) {
	s, _ := openTestStore(t)
	h := s.Handler()
	mustDo(t, h, "POST", "/history", `{"target":"a","item":`+historyItemJSON("New", "2026-11-03T12:00:00.000Z")+`}`, 200, nil)
	// imported later, but older
	mustDo(t, h, "POST", "/history/import", `{"target":"a","items":[`+
		historyItemJSON("Old", "2025-01-01T00:00:00Z")+","+
		// same instant as New, in another zone and with more digits: added later, so listed first
		historyItemJSON("SameAsNew", "2026-11-03T13:00:00.000000+01:00")+","+
		historyItemJSON("Newest", "2026-11-03T12:00:00.1Z")+`]}`, 200, nil)
	if got := strings.Join(historyMethods(t, h, "a"), ","); got != "Newest,SameAsNew,New,Old" {
		t.Errorf("order = %s, want Newest,SameAsNew,New,Old", got)
	}
	// the item keeps the startTime it was sent with
	var list historyList
	mustDo(t, h, "GET", historyPath("a"), "", 200, &list)
	if got := list.Items[1]["startTime"]; got != "2026-11-03T13:00:00.000000+01:00" {
		t.Errorf("startTime = %v, want it unchanged", got)
	}
}

func TestHistoryCapKeepsNewestByTime(t *testing.T) {
	s, _ := openTestStore(t)
	h := s.Handler()
	var items []string
	for i := 0; i < maxHistoryPerTarget; i++ {
		items = append(items, historyItemJSON(fmt.Sprint("New", i), fmt.Sprintf("2026-06-01T00:%02d:%02dZ", i/60, i%60)))
	}
	mustDo(t, h, "POST", "/history/import", `{"target":"a","items":[`+strings.Join(items, ",")+`]}`, 200, nil)
	// importing older entries into a full history keeps the newer ones
	mustDo(t, h, "POST", "/history/import", `{"target":"a","items":[`+
		historyItemJSON("Old1", "2020-01-01T00:00:00Z")+","+historyItemJSON("Old2", "2020-01-02T00:00:00Z")+`]}`, 200, nil)
	got := historyMethods(t, h, "a")
	if len(got) != maxHistoryPerTarget || got[0] != fmt.Sprint("New", maxHistoryPerTarget-1) || got[len(got)-1] != "New0" {
		t.Errorf("after importing old entries: %d items, newest %s, oldest %s", len(got), got[0], got[len(got)-1])
	}
	// one newer entry evicts the oldest
	mustDo(t, h, "POST", "/history", `{"target":"a","item":`+historyItemJSON("Newer", "2026-07-01T00:00:00Z")+`}`, 200, nil)
	got = historyMethods(t, h, "a")
	if len(got) != maxHistoryPerTarget || got[0] != "Newer" || got[len(got)-1] != "New1" {
		t.Errorf("after adding a newer entry: %d items, newest %s, oldest %s", len(got), got[0], got[len(got)-1])
	}
	var n int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM history WHERE target = 'a'`).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != maxHistoryPerTarget {
		t.Errorf("table has %d rows, want %d", n, maxHistoryPerTarget)
	}
}

func TestSortableTime(t *testing.T) {
	fallback := time.Date(2026, 1, 2, 3, 4, 5, 6, time.UTC)
	for in, want := range map[string]string{
		"2026-11-03T20:26:28.000Z":            "2026-11-03T20:26:28.000000000Z",
		"2026-11-03T20:26:28Z":                "2026-11-03T20:26:28.000000000Z",
		"2026-11-03T21:26:28.123456789+01:00": "2026-11-03T20:26:28.123456789Z",
		"not a time":                          "2026-01-02T03:04:05.000000006Z",
		"":                                    "2026-01-02T03:04:05.000000006Z",
		"0000-01-01T00:00:00+01:00":           "2026-01-02T03:04:05.000000006Z", // year -1 in UTC
	} {
		if got := sortableTime(in, fallback); got != want {
			t.Errorf("sortableTime(%q) = %q, want %q", in, got, want)
		}
	}
}

// TestMigrateHistoryStartTimes opens a database made before history was
// ordered by start time.
func TestMigrateHistoryStartTimes(t *testing.T) {
	path := filepath.Join(t.TempDir(), "old.db")
	db, err := sql.Open("sqlite", dsn(path))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(migrations[0].sql + `; PRAGMA user_version = 1`); err != nil {
		t.Fatal(err)
	}
	for _, r := range []struct{ method, startTime string }{
		{"New", "2026-11-03T20:26:28.000Z"},
		{"Old", "2025-01-01T00:00:00.000Z"}, // imported after New
		{"Odd", "yesterday"},
		{"Newest", "2026-11-03T21:00:00.5+00:30"}, // 20:30:00.5Z
	} {
		if _, err := db.Exec(`INSERT INTO history (target, service, method, start_time, item) VALUES ('a', 's', ?, ?, ?)`,
			r.method, r.startTime, historyItemJSON(r.method, r.startTime)); err != nil {
			t.Fatal(err)
		}
	}
	_ = db.Close()

	s, err := Open(path)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer func() { _ = s.Close() }()
	if got := strings.Join(historyMethods(t, s.Handler(), "a"), ","); got != "Newest,New,Old,Odd" {
		t.Errorf("order after migration = %s, want Newest,New,Old,Odd", got)
	}
	var st string
	if err := s.db.QueryRow(`SELECT start_time FROM history WHERE method = 'New'`).Scan(&st); err != nil {
		t.Fatal(err)
	}
	if st != "2026-11-03T20:26:28.000000000Z" {
		t.Errorf("migrated start_time = %q", st)
	}
}

func TestSavedImportRenamesClashes(t *testing.T) {
	s, _ := openTestStore(t)
	h := s.Handler()
	mustDo(t, h, "POST", "/saved", savedJSON("one", "pkg.Svc", "Get", `{"data":{"v":1}}`), 200, nil)
	// "one (3)" is taken by something else, so the second rename skips it
	mustDo(t, h, "POST", "/saved", savedJSON("one (3)", "pkg.Svc", "Get", `{"data":{"other":true}}`), 200, nil)

	type importResult struct{ Imported, Skipped, Renamed int }
	var res importResult
	body := `{"items":[` + strings.Join([]string{
		savedJSON("one", "pkg.Svc", "Get", `{"data":{"v":1}}`),  // exact duplicate: skipped
		savedJSON("one", "pkg.Svc", "Get", `{"data":{"v":2}}`),  // -> one (2)
		savedJSON("one", "pkg.Svc", "Get", `{"data":{"v":3}}`),  // -> one (4), as one (3) is taken
		savedJSON("one", "pkg.Svc", "Get", `{"data":{"v":2}}`),  // duplicate of an earlier item: skipped
		savedJSON("one", "pkg.Svc", "List", `{"data":{"v":2}}`), // other method: no clash
		savedJSON("two", "pkg.Svc", "Get", `{"data":{"v":1}}`),  // other name: no clash
	}, ",") + `]}`
	mustDo(t, h, "POST", "/saved/import", body, 200, &res)
	if res != (importResult{Imported: 4, Skipped: 2, Renamed: 2}) {
		t.Errorf("import = %+v, want 4 imported, 2 skipped, 2 renamed", res)
	}

	var list struct{ Items []savedRequest }
	mustDo(t, h, "GET", "/saved", "", 200, &list)
	got := map[string]string{}
	for _, it := range list.Items {
		got[it.Method+" "+it.Name] = string(it.Request)
	}
	want := map[string]string{
		"Get one":     `{"data":{"v":1}}`,
		"Get one (2)": `{"data":{"v":2}}`,
		"Get one (3)": `{"data":{"other":true}}`,
		"Get one (4)": `{"data":{"v":3}}`,
		"Get two":     `{"data":{"v":1}}`,
		"List one":    `{"data":{"v":2}}`,
	}
	if fmt.Sprint(got) != fmt.Sprint(want) {
		t.Errorf("saved requests:\n%v\nwant\n%v", got, want)
	}
	// names are unique per method
	if len(got) != len(list.Items) {
		t.Errorf("%d saved requests but %d distinct names", len(list.Items), len(got))
	}

	// importing the same file again finds the renamed copies and adds nothing
	mustDo(t, h, "POST", "/saved/import", body, 200, &res)
	if res != (importResult{Skipped: 6}) {
		t.Errorf("second import = %+v, want 6 skipped", res)
	}
}

func TestIsStoredAs(t *testing.T) {
	names := map[string]bool{"a (2)": true, "b (1)": true, "c (02)": true, "d (x)": true, "e (10)": true}
	for name, want := range map[string]bool{"a": true, "b": false, "c": false, "d": false, "e": true, "a (2)": true, "f": false} {
		if got := isStoredAs(name, names); got != want {
			t.Errorf("isStoredAs(%q) = %v, want %v", name, got, want)
		}
	}
}
