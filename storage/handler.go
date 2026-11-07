package storage

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
)

// maxBodySize limits the size of request bodies.
const maxBodySize = 16 << 20

// Handler returns an HTTP handler that serves the history and saved requests
// API described in the package documentation. Its paths are relative to
// where it is mounted: it serves "/history", "/saved" and so on, so mount it
// with http.StripPrefix.
func (s *Store) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /history", s.handleListHistory)
	mux.HandleFunc("POST /history", s.handleAddHistory)
	mux.HandleFunc("DELETE /history", s.handleClearHistory)
	mux.HandleFunc("POST /history/import", s.handleImportHistory)
	mux.HandleFunc("DELETE /history/{id}", s.handleDeleteHistoryItem)
	mux.HandleFunc("GET /saved", s.handleListSaved)
	mux.HandleFunc("POST /saved", s.handleAddSaved)
	mux.HandleFunc("POST /saved/import", s.handleImportSaved)
	mux.HandleFunc("PUT /saved/{id}", s.handleUpdateSaved)
	mux.HandleFunc("DELETE /saved/{id}", s.handleDeleteSaved)
	mux.HandleFunc("GET /passkeys", s.handleListPasskeys)
	mux.HandleFunc("POST /passkeys", s.handleRecordPasskey)
	mux.HandleFunc("POST /passkeys/create", s.handleCreatePasskey)
	mux.HandleFunc("POST /passkeys/sign", s.handleSignWithPasskey)
	mux.HandleFunc("POST /passkeys/{id}/confirm", s.handleConfirmPasskey)
	mux.HandleFunc("DELETE /passkeys/{id}", s.handleDeletePasskey)
	mux.HandleFunc("GET /flows", s.handleListFlows)
	mux.HandleFunc("POST /flows", s.handleAddFlow)
	mux.HandleFunc("PUT /flows/{id}", s.handleUpdateFlow)
	mux.HandleFunc("DELETE /flows/{id}", s.handleDeleteFlow)
	return mux
}

// readJSON decodes the request body into dest. It writes an error and
// returns false if the body is too large or not valid JSON.
func readJSON(w http.ResponseWriter, r *http.Request, dest any) bool {
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxBodySize))
	if err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			http.Error(w, "request body too large", http.StatusRequestEntityTooLarge)
		} else {
			http.Error(w, "failed to read request body", http.StatusBadRequest)
		}
		return false
	}
	if err := json.Unmarshal(body, dest); err != nil {
		http.Error(w, "invalid JSON: "+err.Error(), http.StatusBadRequest)
		return false
	}
	return true
}

// writeJSON writes v as a JSON response.
func writeJSON(w http.ResponseWriter, status int, v any) {
	data, err := json.Marshal(v)
	if err != nil {
		http.Error(w, "failed to encode response", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_, _ = w.Write(data)
}

// dbError reports a database failure.
func dbError(w http.ResponseWriter, err error) {
	http.Error(w, "database error: "+err.Error(), http.StatusInternalServerError)
}

// idParam returns the request's {id} path value. It writes a 404 and
// returns false if it is not a valid id.
func idParam(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		http.NotFound(w, r)
		return 0, false
	}
	return id, true
}
