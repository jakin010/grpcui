package storage

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
)

// savedRequest is a saved request as sent and returned by the API.
type savedRequest struct {
	ID          int64           `json:"id"`
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Service     string          `json:"service"`
	Method      string          `json:"method"`
	Request     json.RawMessage `json:"request"`
	CreatedAt   string          `json:"createdAt"`
	UpdatedAt   string          `json:"updatedAt"`
}

// savedRequestInput is the part of a saved request that clients set.
type savedRequestInput struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Service     string          `json:"service"`
	Method      string          `json:"method"`
	Request     json.RawMessage `json:"request"`
}

// requestBody is the "request" member of a saved request.
type requestBody struct {
	TimeoutSecs *float64         `json:"timeout_secs,omitempty"`
	Metadata    []metadataPair   `json:"metadata,omitempty"`
	Data        *json.RawMessage `json:"data"`
}

type metadataPair struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// validSavedRequest is a saved request checked and ready to store.
type validSavedRequest struct {
	name, description, service, method string
	// request is the canonical JSON of the request body, so that equal
	// requests are stored as equal strings.
	request string
}

// parseSavedRequest checks a saved request sent by a client.
func parseSavedRequest(raw json.RawMessage) (validSavedRequest, error) {
	var in savedRequestInput
	if err := json.Unmarshal(raw, &in); err != nil {
		return validSavedRequest{}, fmt.Errorf("not a valid saved request: %v", err)
	}
	v := validSavedRequest{
		name:        strings.TrimSpace(in.Name),
		description: in.Description,
		service:     strings.TrimSpace(in.Service),
		method:      strings.TrimSpace(in.Method),
	}
	switch {
	case v.name == "":
		return v, fmt.Errorf("name must not be empty")
	case v.service == "":
		return v, fmt.Errorf("service must not be empty")
	case v.method == "":
		return v, fmt.Errorf("method must not be empty")
	}

	if len(in.Request) == 0 || string(in.Request) == "null" {
		return v, fmt.Errorf("request is required")
	}
	var req requestBody
	if err := json.Unmarshal(in.Request, &req); err != nil {
		return v, fmt.Errorf("not a valid request: %v", err)
	}
	if req.Data == nil || string(*req.Data) == "null" {
		return v, fmt.Errorf("request.data is required and must not be null")
	}
	if t := req.TimeoutSecs; t != nil && (*t < 0 || math.IsInf(*t, 0) || math.IsNaN(*t)) {
		return v, fmt.Errorf("request.timeout_secs must not be negative")
	}
	data, err := canonicalJSON(*req.Data)
	if err != nil {
		return v, fmt.Errorf("not a valid request.data: %v", err)
	}
	req.Data = &data
	if len(req.Metadata) == 0 {
		req.Metadata = nil
	}
	canon, err := json.Marshal(req)
	if err != nil {
		return v, err
	}
	v.request = string(canon)
	return v, nil
}

// canonicalJSON re-encodes the given JSON with object keys sorted and no
// insignificant space. Numbers keep their exact text.
func canonicalJSON(raw json.RawMessage) (json.RawMessage, error) {
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	var v any
	if err := dec.Decode(&v); err != nil {
		return nil, err
	}
	return json.Marshal(v)
}

const savedColumns = `id, name, description, service, method, request, created_at, updated_at`

func scanSaved(row interface{ Scan(...any) error }) (savedRequest, error) {
	var sr savedRequest
	var req string
	err := row.Scan(&sr.ID, &sr.Name, &sr.Description, &sr.Service, &sr.Method, &req, &sr.CreatedAt, &sr.UpdatedAt)
	sr.Request = json.RawMessage(req)
	return sr, err
}

func (s *Store) listSaved(ctx context.Context) ([]savedRequest, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT `+savedColumns+` FROM saved_requests ORDER BY service, method, name, id`)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	items := []savedRequest{}
	for rows.Next() {
		sr, err := scanSaved(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, sr)
	}
	return items, rows.Err()
}

func (s *Store) getSaved(ctx context.Context, id int64) (savedRequest, error) {
	return scanSaved(s.db.QueryRowContext(ctx, `SELECT `+savedColumns+` FROM saved_requests WHERE id = ?`, id))
}

func (s *Store) addSaved(ctx context.Context, v validSavedRequest) (savedRequest, error) {
	t := now()
	res, err := s.db.ExecContext(ctx,
		`INSERT INTO saved_requests (service, method, name, description, request, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		v.service, v.method, v.name, v.description, v.request, t, t)
	if err != nil {
		return savedRequest{}, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return savedRequest{}, err
	}
	return s.getSaved(ctx, id)
}

// updateSaved replaces the saved request with the given id. It returns
// sql.ErrNoRows if there is none.
func (s *Store) updateSaved(ctx context.Context, id int64, v validSavedRequest) (savedRequest, error) {
	res, err := s.db.ExecContext(ctx,
		`UPDATE saved_requests SET service = ?, method = ?, name = ?, description = ?, request = ?, updated_at = ?
		 WHERE id = ?`,
		v.service, v.method, v.name, v.description, v.request, now(), id)
	if err != nil {
		return savedRequest{}, err
	}
	if n, err := res.RowsAffected(); err != nil {
		return savedRequest{}, err
	} else if n == 0 {
		return savedRequest{}, sql.ErrNoRows
	}
	return s.getSaved(ctx, id)
}

func (s *Store) deleteSaved(ctx context.Context, id int64) (bool, error) {
	res, err := s.db.ExecContext(ctx, `DELETE FROM saved_requests WHERE id = ?`, id)
	if err != nil {
		return false, err
	}
	n, err := res.RowsAffected()
	return n > 0, err
}

// importSaved adds the given saved requests in one transaction. It skips
// those already stored or earlier in items, with the same service, method,
// name and request; the stored name may also be one an earlier import gave
// it (see numberedName). An item whose service, method and name are taken by
// a different request is added under the first free numbered name. It
// returns how many it added (renamed ones included), skipped and renamed.
func (s *Store) importSaved(ctx context.Context, items []validSavedRequest) (imported, skipped, renamed int, err error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, 0, 0, err
	}
	defer func() { _ = tx.Rollback() }()

	t := now()
	for _, v := range items {
		// The transaction sees its own inserts, so earlier items of this
		// import count as stored.
		names, err := savedNames(ctx, tx, v.service, v.method, "")
		if err != nil {
			return 0, 0, 0, err
		}
		same, err := savedNames(ctx, tx, v.service, v.method, v.request)
		if err != nil {
			return 0, 0, 0, err
		}
		if isStoredAs(v.name, same) {
			skipped++
			continue
		}
		name := v.name
		if names[name] {
			for n := 2; ; n++ {
				if name = numberedName(v.name, n); !names[name] {
					break
				}
			}
			renamed++
		}
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO saved_requests (service, method, name, description, request, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			v.service, v.method, name, v.description, v.request, t, t); err != nil {
			return 0, 0, 0, err
		}
		imported++
	}
	return imported, skipped, renamed, tx.Commit()
}

// savedNames returns the names of the saved requests of the given method,
// only those with the given request if it is not empty.
func savedNames(ctx context.Context, tx *sql.Tx, service, method, request string) (map[string]bool, error) {
	query := `SELECT name FROM saved_requests WHERE service = ? AND method = ?`
	args := []any{service, method}
	if request != "" {
		query += ` AND request = ?`
		args = append(args, request)
	}
	rows, err := tx.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	names := map[string]bool{}
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		names[name] = true
	}
	return names, rows.Err()
}

// numberedName returns the name an import gives the n-th item named name.
func numberedName(name string, n int) string {
	return fmt.Sprintf("%s (%d)", name, n)
}

// isStoredAs reports whether names holds name, or a numbered name an import
// may have made from it: "<name> (N)" with N >= 2.
func isStoredAs(name string, names map[string]bool) bool {
	if names[name] {
		return true
	}
	for stored := range names {
		rest, ok := strings.CutPrefix(stored, name+" (")
		if !ok {
			continue
		}
		num, ok := strings.CutSuffix(rest, ")")
		if !ok {
			continue
		}
		if n, err := strconv.Atoi(num); err == nil && n >= 2 && numberedName(name, n) == stored {
			return true
		}
	}
	return false
}

func (s *Store) handleListSaved(w http.ResponseWriter, r *http.Request) {
	items, err := s.listSaved(r.Context())
	if err != nil {
		dbError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *Store) handleAddSaved(w http.ResponseWriter, r *http.Request) {
	var raw json.RawMessage
	if !readJSON(w, r, &raw) {
		return
	}
	v, err := parseSavedRequest(raw)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	sr, err := s.addSaved(r.Context(), v)
	if err != nil {
		dbError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, sr)
}

func (s *Store) handleUpdateSaved(w http.ResponseWriter, r *http.Request) {
	id, ok := idParam(w, r)
	if !ok {
		return
	}
	var raw json.RawMessage
	if !readJSON(w, r, &raw) {
		return
	}
	v, err := parseSavedRequest(raw)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	sr, err := s.updateSaved(r.Context(), id, v)
	if errors.Is(err, sql.ErrNoRows) {
		http.Error(w, "saved request not found", http.StatusNotFound)
		return
	} else if err != nil {
		dbError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, sr)
}

func (s *Store) handleDeleteSaved(w http.ResponseWriter, r *http.Request) {
	id, ok := idParam(w, r)
	if !ok {
		return
	}
	found, err := s.deleteSaved(r.Context(), id)
	if err != nil {
		dbError(w, err)
		return
	}
	if !found {
		http.Error(w, "saved request not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Store) handleImportSaved(w http.ResponseWriter, r *http.Request) {
	var raw json.RawMessage
	if !readJSON(w, r, &raw) {
		return
	}
	var rawItems []json.RawMessage
	if trimmed := bytes.TrimSpace(raw); len(trimmed) > 0 && trimmed[0] == '[' {
		// a bare array, such as an -examples file
		if err := json.Unmarshal(trimmed, &rawItems); err != nil {
			http.Error(w, "invalid JSON: "+err.Error(), http.StatusBadRequest)
			return
		}
	} else {
		var body struct {
			Items []json.RawMessage `json:"items"`
		}
		if err := json.Unmarshal(trimmed, &body); err != nil {
			http.Error(w, "invalid JSON: "+err.Error(), http.StatusBadRequest)
			return
		}
		if body.Items == nil {
			http.Error(w, "missing items", http.StatusBadRequest)
			return
		}
		rawItems = body.Items
	}
	items := make([]validSavedRequest, len(rawItems))
	for i, raw := range rawItems {
		v, err := parseSavedRequest(raw)
		if err != nil {
			http.Error(w, fmt.Sprintf("item %d: %v", i, err), http.StatusBadRequest)
			return
		}
		items[i] = v
	}
	imported, skipped, renamed, err := s.importSaved(r.Context(), items)
	if err != nil {
		dbError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]int{"imported": imported, "skipped": skipped, "renamed": renamed})
}
