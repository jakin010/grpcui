package storage

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"time"
)

// historyItem is a history entry checked and ready to store.
type historyItem struct {
	// startTime is the entry's "startTime" string, as sent.
	service, method, startTime string
	// item is the entry's JSON object, without any "id" member.
	item []byte
}

// parseHistoryItem checks a history entry sent by the web form.
func parseHistoryItem(raw json.RawMessage) (historyItem, error) {
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(raw, &fields); err != nil || fields == nil {
		return historyItem{}, fmt.Errorf("item must be a JSON object")
	}
	delete(fields, "id")
	var h historyItem
	for _, f := range []struct {
		name     string
		dest     *string
		nonEmpty bool
	}{
		{"service", &h.service, true},
		{"method", &h.method, true},
		{"startTime", &h.startTime, false},
	} {
		v, ok := fields[f.name]
		if !ok || json.Unmarshal(v, f.dest) != nil || string(v) == "null" {
			return historyItem{}, fmt.Errorf("item must have a %q string", f.name)
		}
		if f.nonEmpty && *f.dest == "" {
			return historyItem{}, fmt.Errorf("item %q must not be empty", f.name)
		}
	}
	item, err := json.Marshal(fields)
	if err != nil {
		return historyItem{}, err
	}
	h.item = item
	return h, nil
}

// withID returns the stored item JSON with an "id" member added.
func withID(id int64, item string) json.RawMessage {
	if len(item) < 2 || item[0] != '{' {
		// cannot happen for items stored by this package
		return json.RawMessage(fmt.Sprintf(`{"id":%d}`, id))
	}
	sep := ","
	if item == "{}" {
		sep = ""
	}
	return json.RawMessage(`{"id":` + strconv.FormatInt(id, 10) + sep + item[1:])
}

// sortableTimeLayout is how history.start_time is stored: RFC 3339 in UTC
// with all nine fraction digits, so that every value has the same width and
// comparing them as strings compares them as times.
const sortableTimeLayout = "2006-01-02T15:04:05.000000000Z07:00"

// sortableTime returns an entry's start time as stored in history.start_time.
// A start time that is not an RFC 3339 time (or is outside years 0-9999) is
// stored as the given fallback time.
func sortableTime(startTime string, fallback time.Time) string {
	t, err := time.Parse(time.RFC3339Nano, startTime)
	if err != nil || t.UTC().Year() < 0 || t.UTC().Year() > 9999 {
		t = fallback
	}
	return t.UTC().Format(sortableTimeLayout)
}

// normalizeHistoryStartTimes is schema migration 2. It rewrites the
// start_time of existing history entries (stored as sent by the web form) in
// sortable form. Entries whose start time is not a time sort as the oldest,
// since there is no way to tell when they were made.
func normalizeHistoryStartTimes(ctx context.Context, tx *sql.Tx) error {
	rows, err := tx.QueryContext(ctx, `SELECT id, start_time FROM history`)
	if err != nil {
		return err
	}
	type row struct {
		id        int64
		startTime string
	}
	var all []row
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.id, &r.startTime); err != nil {
			_ = rows.Close()
			return err
		}
		all = append(all, r)
	}
	if err := rows.Close(); err != nil {
		return err
	}
	if err := rows.Err(); err != nil {
		return err
	}
	stmt, err := tx.PrepareContext(ctx, `UPDATE history SET start_time = ? WHERE id = ?`)
	if err != nil {
		return err
	}
	defer func() { _ = stmt.Close() }()
	for _, r := range all {
		if _, err := stmt.ExecContext(ctx, sortableTime(r.startTime, time.Time{}), r.id); err != nil {
			return err
		}
	}
	return nil
}

// historyOrder orders a target's history entries newest first. Entries with
// the same start time are in the order they were added.
const historyOrder = `ORDER BY start_time DESC, id DESC`

func (s *Store) listHistory(ctx context.Context, target string) ([]json.RawMessage, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, item FROM history WHERE target = ? `+historyOrder+` LIMIT ?`,
		target, maxHistoryPerTarget)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	items := []json.RawMessage{}
	for rows.Next() {
		var id int64
		var item string
		if err := rows.Scan(&id, &item); err != nil {
			return nil, err
		}
		items = append(items, withID(id, item))
	}
	return items, rows.Err()
}

// addHistory stores the given entries, in order, and then removes the
// target's oldest entries (by start time) beyond maxHistoryPerTarget. It
// returns the id of the last entry added. An entry whose start time is not
// an RFC 3339 time is sorted as if it started now.
func (s *Store) addHistory(ctx context.Context, target string, items []historyItem) (int64, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer func() { _ = tx.Rollback() }()

	var lastID int64
	added := time.Now()
	for _, h := range items {
		res, err := tx.ExecContext(ctx,
			`INSERT INTO history (target, service, method, start_time, item) VALUES (?, ?, ?, ?, ?)`,
			target, h.service, h.method, sortableTime(h.startTime, added), string(h.item))
		if err != nil {
			return 0, err
		}
		if lastID, err = res.LastInsertId(); err != nil {
			return 0, err
		}
	}
	if _, err := tx.ExecContext(ctx,
		`DELETE FROM history WHERE target = ? AND id NOT IN
			(SELECT id FROM history WHERE target = ? `+historyOrder+` LIMIT ?)`,
		target, target, maxHistoryPerTarget); err != nil {
		return 0, err
	}
	return lastID, tx.Commit()
}

func (s *Store) deleteHistoryItem(ctx context.Context, id int64) (bool, error) {
	res, err := s.db.ExecContext(ctx, `DELETE FROM history WHERE id = ?`, id)
	if err != nil {
		return false, err
	}
	n, err := res.RowsAffected()
	return n > 0, err
}

func (s *Store) clearHistory(ctx context.Context, target string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM history WHERE target = ?`, target)
	return err
}

// sortByStartTime sorts entries oldest first. Times in RFC 3339 form are
// compared as times; if any is not, all are compared as strings.
func sortByStartTime(items []historyItem) {
	times := make([]time.Time, len(items))
	allTimes := true
	for i, h := range items {
		t, err := time.Parse(time.RFC3339Nano, h.startTime)
		if err != nil {
			allTimes = false
			break
		}
		times[i] = t
	}
	idx := make([]int, len(items))
	for i := range idx {
		idx[i] = i
	}
	sort.SliceStable(idx, func(a, b int) bool {
		if allTimes {
			return times[idx[a]].Before(times[idx[b]])
		}
		return items[idx[a]].startTime < items[idx[b]].startTime
	})
	sorted := make([]historyItem, len(items))
	for i, j := range idx {
		sorted[i] = items[j]
	}
	copy(items, sorted)
}

// targetParam returns the request's "target" query parameter. It writes an
// error and returns false if there is none. The target may be empty.
func targetParam(w http.ResponseWriter, r *http.Request) (string, bool) {
	q := r.URL.Query()
	if !q.Has("target") {
		http.Error(w, "missing target parameter", http.StatusBadRequest)
		return "", false
	}
	return q.Get("target"), true
}

func (s *Store) handleListHistory(w http.ResponseWriter, r *http.Request) {
	target, ok := targetParam(w, r)
	if !ok {
		return
	}
	items, err := s.listHistory(r.Context(), target)
	if err != nil {
		dbError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *Store) handleAddHistory(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Target *string         `json:"target"`
		Item   json.RawMessage `json:"item"`
	}
	if !readJSON(w, r, &body) {
		return
	}
	if body.Target == nil {
		http.Error(w, "missing target", http.StatusBadRequest)
		return
	}
	h, err := parseHistoryItem(body.Item)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	id, err := s.addHistory(r.Context(), *body.Target, []historyItem{h})
	if err != nil {
		dbError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]int64{"id": id})
}

func (s *Store) handleImportHistory(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Target *string           `json:"target"`
		Items  []json.RawMessage `json:"items"`
	}
	if !readJSON(w, r, &body) {
		return
	}
	if body.Target == nil {
		http.Error(w, "missing target", http.StatusBadRequest)
		return
	}
	if body.Items == nil {
		http.Error(w, "missing items", http.StatusBadRequest)
		return
	}
	items := make([]historyItem, len(body.Items))
	for i, raw := range body.Items {
		h, err := parseHistoryItem(raw)
		if err != nil {
			http.Error(w, fmt.Sprintf("item %d: %v", i, err), http.StatusBadRequest)
			return
		}
		items[i] = h
	}
	sortByStartTime(items)
	if _, err := s.addHistory(r.Context(), *body.Target, items); err != nil {
		dbError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]int{"imported": len(items)})
}

func (s *Store) handleDeleteHistoryItem(w http.ResponseWriter, r *http.Request) {
	id, ok := idParam(w, r)
	if !ok {
		return
	}
	found, err := s.deleteHistoryItem(r.Context(), id)
	if err != nil {
		dbError(w, err)
		return
	}
	if !found {
		http.Error(w, "history item not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Store) handleClearHistory(w http.ResponseWriter, r *http.Request) {
	target, ok := targetParam(w, r)
	if !ok {
		return
	}
	if err := s.clearHistory(r.Context(), target); err != nil {
		dbError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
