package storage

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/fullstorydev/grpcui/internal/webauthn"
)

// Passkey kinds.
const (
	// kindVirtual passkeys are made by grpcui's virtual authenticator; the
	// database holds their private keys.
	kindVirtual = "virtual"
	// kindDevice passkeys live on a real authenticator (Touch ID, a security
	// key); the database only records them.
	kindDevice = "device"
)

// Passkey statuses.
const (
	// statusPending passkeys were created but the server has not accepted
	// them yet.
	statusPending = "pending"
	// statusConfirmed passkeys were accepted by the server.
	statusConfirmed = "confirmed"
)

// passkey is a stored passkey as returned by the API. It never includes the
// private key.
type passkey struct {
	ID           int64   `json:"id"`
	Kind         string  `json:"kind"`
	Status       string  `json:"status"`
	RPID         string  `json:"rpId"`
	Origin       string  `json:"origin"`
	CredentialID string  `json:"credentialId"` // base64url
	UserID       string  `json:"userId"`       // base64url
	UserName     string  `json:"userName"`
	DisplayName  string  `json:"displayName"`
	PublicKey    string  `json:"publicKey"` // SubjectPublicKeyInfo, base64url
	SignCount    uint32  `json:"signCount"`
	CreatedAt    string  `json:"createdAt"`
	LastUsedAt   *string `json:"lastUsedAt"`
}

const passkeyColumns = `id, kind, status, rp_id, origin, credential_id, user_id, user_name, display_name, public_key, sign_count, created_at, last_used_at`

func scanPasskey(row interface{ Scan(...any) error }) (passkey, error) {
	var p passkey
	err := row.Scan(&p.ID, &p.Kind, &p.Status, &p.RPID, &p.Origin, &p.CredentialID, &p.UserID, &p.UserName,
		&p.DisplayName, &p.PublicKey, &p.SignCount, &p.CreatedAt, &p.LastUsedAt)
	return p, err
}

type querier interface {
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

func listPasskeys(ctx context.Context, q querier, where string, args ...any) ([]passkey, error) {
	rows, err := q.QueryContext(ctx, `SELECT `+passkeyColumns+` FROM passkeys `+where+` ORDER BY rp_id, user_name, id`, args...)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	items := []passkey{}
	for rows.Next() {
		p, err := scanPasskey(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, p)
	}
	return items, rows.Err()
}

func getPasskey(ctx context.Context, q querier, id int64) (passkey, error) {
	return scanPasskey(q.QueryRowContext(ctx, `SELECT `+passkeyColumns+` FROM passkeys WHERE id = ?`, id))
}

func (s *Store) handleListPasskeys(w http.ResponseWriter, r *http.Request) {
	items, err := listPasskeys(r.Context(), s.db, "")
	if err != nil {
		dbError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// optionsError reports options the authenticator can't use.
func optionsError(w http.ResponseWriter, err error) {
	var werr *webauthn.Error
	if errors.As(err, &werr) {
		http.Error(w, err.Error(), http.StatusUnprocessableEntity)
	} else {
		http.Error(w, "authenticator failed: "+err.Error(), http.StatusInternalServerError)
	}
}

// handleCreatePasskey makes a virtual passkey and stores it as pending.
func (s *Store) handleCreatePasskey(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Options *webauthn.CreationOptions `json:"options"`
		Origin  string                    `json:"origin"`
	}
	if !readJSON(w, r, &body) {
		return
	}
	if body.Options == nil {
		http.Error(w, "options is required", http.StatusBadRequest)
		return
	}
	ctx := r.Context()
	var lookupErr error
	exists := func(rpID string, credID []byte) bool {
		var n int
		err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM passkeys WHERE rp_id = ? AND credential_id = ? AND status = ?`,
			rpID, webauthn.EncodeBinary(credID), statusConfirmed).Scan(&n)
		if err != nil {
			lookupErr = err
		}
		return n > 0
	}
	pk, cred, err := webauthn.Create(*body.Options, body.Origin, exists)
	if lookupErr != nil {
		dbError(w, lookupErr)
		return
	}
	if err != nil {
		optionsError(w, err)
		return
	}
	der, err := webauthn.MarshalPrivateKey(pk.PrivateKey)
	if err != nil {
		optionsError(w, err)
		return
	}
	res, err := s.db.ExecContext(ctx,
		`INSERT INTO passkeys (kind, status, rp_id, origin, credential_id, user_id, user_name, display_name, public_key, private_key, sign_count, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
		kindVirtual, statusPending, pk.RPID, strings.TrimSuffix(body.Origin, "/"), webauthn.EncodeBinary(pk.CredentialID),
		webauthn.EncodeBinary(pk.UserID), pk.UserName, pk.DisplayName, webauthn.EncodeBinary(pk.PublicKey()), der, now())
	if err != nil {
		dbError(w, err)
		return
	}
	id, err := res.LastInsertId()
	if err != nil {
		dbError(w, err)
		return
	}
	p, err := getPasskey(ctx, s.db, id)
	if err != nil {
		dbError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"passkey": p, "credential": cred})
}

// handleSignWithPasskey answers a login challenge with a virtual passkey:
// the one given by id or, if none is given, the most recently used one that
// the options allow.
func (s *Store) handleSignWithPasskey(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Options *webauthn.RequestOptions `json:"options"`
		Origin  string                   `json:"origin"`
		ID      int64                    `json:"id"`
	}
	if !readJSON(w, r, &body) {
		return
	}
	if body.Options == nil {
		http.Error(w, "options is required", http.StatusBadRequest)
		return
	}
	rpID, err := body.Options.ResolveRPID(body.Origin)
	if err != nil {
		optionsError(w, err)
		return
	}

	ctx := r.Context()
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		dbError(w, err)
		return
	}
	defer func() { _ = tx.Rollback() }()

	query := `SELECT id, credential_id, user_id, user_name, display_name, private_key, sign_count FROM passkeys
		WHERE kind = ? AND status = ? AND rp_id = ?`
	args := []any{kindVirtual, statusConfirmed, rpID}
	if body.ID != 0 {
		query += ` AND id = ?`
		args = append(args, body.ID)
	}
	query += ` ORDER BY COALESCE(last_used_at, created_at) DESC, id DESC`
	rows, err := tx.QueryContext(ctx, query, args...)
	if err != nil {
		dbError(w, err)
		return
	}
	var chosen *webauthn.Passkey
	var chosenID int64
	considered := 0
	for rows.Next() && chosen == nil {
		var id int64
		var credID, userID string
		var der []byte
		pk := &webauthn.Passkey{RPID: rpID}
		if err := rows.Scan(&id, &credID, &userID, &pk.UserName, &pk.DisplayName, &der, &pk.SignCount); err != nil {
			_ = rows.Close()
			dbError(w, err)
			return
		}
		considered++
		if pk.CredentialID, err = webauthn.DecodeBinary(credID); err != nil {
			continue
		}
		if ok, err := body.Options.Allows(pk.CredentialID); err != nil {
			_ = rows.Close()
			optionsError(w, err)
			return
		} else if !ok {
			continue
		}
		pk.UserID, _ = webauthn.DecodeBinary(userID)
		if pk.PrivateKey, err = webauthn.ParsePrivateKey(der); err != nil {
			_ = rows.Close()
			dbError(w, fmt.Errorf("passkey %d has a bad private key: %w", id, err))
			return
		}
		chosen, chosenID = pk, id
	}
	if err := rows.Err(); err != nil {
		_ = rows.Close()
		dbError(w, err)
		return
	}
	_ = rows.Close()

	if chosen == nil {
		switch {
		case body.ID != 0 && considered == 0:
			http.Error(w, fmt.Sprintf("passkey %d is not a confirmed grpcui passkey for %s", body.ID, rpID), http.StatusUnprocessableEntity)
		case considered == 0:
			http.Error(w, "grpcui has no confirmed passkeys for "+rpID+"; run a registration flow first", http.StatusUnprocessableEntity)
		default:
			http.Error(w, "the server's allowCredentials doesn't include any of grpcui's passkeys for "+rpID, http.StatusUnprocessableEntity)
		}
		return
	}

	cred, err := webauthn.Get(*body.Options, body.Origin, chosen)
	if err != nil {
		optionsError(w, err)
		return
	}
	if _, err := tx.ExecContext(ctx, `UPDATE passkeys SET sign_count = ?, last_used_at = ? WHERE id = ?`,
		chosen.SignCount, now(), chosenID); err != nil {
		dbError(w, err)
		return
	}
	if err := tx.Commit(); err != nil {
		dbError(w, err)
		return
	}
	p, err := getPasskey(ctx, s.db, chosenID)
	if err != nil {
		dbError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"passkey": p, "credential": cred})
}

// handleRecordPasskey records a passkey made by a real authenticator, which
// keeps its private key.
func (s *Store) handleRecordPasskey(w http.ResponseWriter, r *http.Request) {
	var body struct {
		RPID         string `json:"rpId"`
		Origin       string `json:"origin"`
		CredentialID string `json:"credentialId"`
		UserID       string `json:"userId"`
		UserName     string `json:"userName"`
		DisplayName  string `json:"displayName"`
		PublicKey    string `json:"publicKey"`
	}
	if !readJSON(w, r, &body) {
		return
	}
	if strings.TrimSpace(body.RPID) == "" || body.CredentialID == "" {
		http.Error(w, "rpId and credentialId are required", http.StatusBadRequest)
		return
	}
	norm := func(name, v string) (string, bool) {
		if v == "" {
			return "", true
		}
		b, err := webauthn.DecodeBinary(v)
		if err != nil {
			http.Error(w, name+" is not base64", http.StatusBadRequest)
			return "", false
		}
		return webauthn.EncodeBinary(b), true
	}
	credID, ok := norm("credentialId", body.CredentialID)
	if !ok {
		return
	}
	userID, ok := norm("userId", body.UserID)
	if !ok {
		return
	}
	pub, ok := norm("publicKey", body.PublicKey)
	if !ok {
		return
	}
	res, err := s.db.ExecContext(r.Context(),
		`INSERT INTO passkeys (kind, status, rp_id, origin, credential_id, user_id, user_name, display_name, public_key, sign_count, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
		kindDevice, statusPending, strings.TrimSpace(body.RPID), strings.TrimSuffix(body.Origin, "/"), credID, userID,
		body.UserName, body.DisplayName, pub, now())
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			http.Error(w, "this passkey is already recorded", http.StatusConflict)
			return
		}
		dbError(w, err)
		return
	}
	id, err := res.LastInsertId()
	if err != nil {
		dbError(w, err)
		return
	}
	p, err := getPasskey(r.Context(), s.db, id)
	if err != nil {
		dbError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, p)
}

// handleConfirmPasskey marks a passkey as accepted by the server.
func (s *Store) handleConfirmPasskey(w http.ResponseWriter, r *http.Request) {
	id, ok := idParam(w, r)
	if !ok {
		return
	}
	res, err := s.db.ExecContext(r.Context(), `UPDATE passkeys SET status = ? WHERE id = ?`, statusConfirmed, id)
	if err != nil {
		dbError(w, err)
		return
	}
	if n, err := res.RowsAffected(); err != nil {
		dbError(w, err)
		return
	} else if n == 0 {
		http.Error(w, "passkey not found", http.StatusNotFound)
		return
	}
	p, err := getPasskey(r.Context(), s.db, id)
	if err != nil {
		dbError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (s *Store) handleDeletePasskey(w http.ResponseWriter, r *http.Request) {
	id, ok := idParam(w, r)
	if !ok {
		return
	}
	res, err := s.db.ExecContext(r.Context(), `DELETE FROM passkeys WHERE id = ?`, id)
	if err != nil {
		dbError(w, err)
		return
	}
	if n, err := res.RowsAffected(); err != nil {
		dbError(w, err)
		return
	} else if n == 0 {
		http.Error(w, "passkey not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ----- flows -----

// flow is a saved passkey flow: which RPCs begin and finish a passkey
// ceremony and how their fields map to and from the passkey. The web form
// defines and runs it; the store only checks its outline.
type flow struct {
	ID        int64           `json:"id"`
	Name      string          `json:"name"`
	Kind      string          `json:"kind"`
	Flow      json.RawMessage `json:"flow"`
	CreatedAt string          `json:"createdAt"`
	UpdatedAt string          `json:"updatedAt"`
}

type validFlow struct {
	name, kind, flow string
}

func parseFlow(raw json.RawMessage) (validFlow, error) {
	var in struct {
		Name string          `json:"name"`
		Kind string          `json:"kind"`
		Flow json.RawMessage `json:"flow"`
	}
	if err := json.Unmarshal(raw, &in); err != nil {
		return validFlow{}, fmt.Errorf("not a valid flow: %v", err)
	}
	v := validFlow{name: strings.TrimSpace(in.Name), kind: in.Kind}
	if v.name == "" {
		return v, fmt.Errorf("name must not be empty")
	}
	if v.kind != "register" && v.kind != "login" {
		return v, fmt.Errorf(`kind must be "register" or "login"`)
	}
	var obj map[string]json.RawMessage
	if err := json.Unmarshal(in.Flow, &obj); err != nil || obj == nil {
		return v, fmt.Errorf("flow must be a JSON object")
	}
	canon, err := canonicalJSON(in.Flow)
	if err != nil {
		return v, err
	}
	v.flow = string(canon)
	return v, nil
}

const flowColumns = `id, name, kind, flow, created_at, updated_at`

func scanFlow(row interface{ Scan(...any) error }) (flow, error) {
	var f flow
	var body string
	err := row.Scan(&f.ID, &f.Name, &f.Kind, &body, &f.CreatedAt, &f.UpdatedAt)
	f.Flow = json.RawMessage(body)
	return f, err
}

func (s *Store) getFlow(ctx context.Context, id int64) (flow, error) {
	return scanFlow(s.db.QueryRowContext(ctx, `SELECT `+flowColumns+` FROM passkey_flows WHERE id = ?`, id))
}

func (s *Store) handleListFlows(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.QueryContext(r.Context(), `SELECT `+flowColumns+` FROM passkey_flows ORDER BY name, id`)
	if err != nil {
		dbError(w, err)
		return
	}
	defer func() { _ = rows.Close() }()
	items := []flow{}
	for rows.Next() {
		f, err := scanFlow(rows)
		if err != nil {
			dbError(w, err)
			return
		}
		items = append(items, f)
	}
	if err := rows.Err(); err != nil {
		dbError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (s *Store) handleAddFlow(w http.ResponseWriter, r *http.Request) {
	var raw json.RawMessage
	if !readJSON(w, r, &raw) {
		return
	}
	v, err := parseFlow(raw)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	t := now()
	res, err := s.db.ExecContext(r.Context(),
		`INSERT INTO passkey_flows (name, kind, flow, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
		v.name, v.kind, v.flow, t, t)
	if err != nil {
		dbError(w, err)
		return
	}
	id, err := res.LastInsertId()
	if err != nil {
		dbError(w, err)
		return
	}
	f, err := s.getFlow(r.Context(), id)
	if err != nil {
		dbError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, f)
}

func (s *Store) handleUpdateFlow(w http.ResponseWriter, r *http.Request) {
	id, ok := idParam(w, r)
	if !ok {
		return
	}
	var raw json.RawMessage
	if !readJSON(w, r, &raw) {
		return
	}
	v, err := parseFlow(raw)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	res, err := s.db.ExecContext(r.Context(),
		`UPDATE passkey_flows SET name = ?, kind = ?, flow = ?, updated_at = ? WHERE id = ?`,
		v.name, v.kind, v.flow, now(), id)
	if err != nil {
		dbError(w, err)
		return
	}
	if n, err := res.RowsAffected(); err != nil {
		dbError(w, err)
		return
	} else if n == 0 {
		http.Error(w, "flow not found", http.StatusNotFound)
		return
	}
	f, err := s.getFlow(r.Context(), id)
	if err != nil {
		dbError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, f)
}

func (s *Store) handleDeleteFlow(w http.ResponseWriter, r *http.Request) {
	id, ok := idParam(w, r)
	if !ok {
		return
	}
	res, err := s.db.ExecContext(r.Context(), `DELETE FROM passkey_flows WHERE id = ?`, id)
	if err != nil {
		dbError(w, err)
		return
	}
	if n, err := res.RowsAffected(); err != nil {
		dbError(w, err)
		return
	} else if n == 0 {
		http.Error(w, "flow not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
