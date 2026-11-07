package storage

import (
	"context"
	"database/sql"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "modernc.org/sqlite" // registers the "sqlite" database/sql driver
)

// maxHistoryPerTarget is how many history entries the store keeps for each
// target. Older entries are removed when new ones are added.
const maxHistoryPerTarget = 100

// busyTimeout is how long a statement waits for a lock held by another
// connection (possibly in another process) before failing.
const busyTimeout = 5 * time.Second

// migration is one step of the schema. It runs sql, if not empty, and then
// fn, if not nil, in the transaction that brings the schema up to date.
type migration struct {
	sql string
	fn  func(ctx context.Context, tx *sql.Tx) error
}

// migrations creates and updates the schema. The database's user_version is
// the number of migrations applied to it. Add to the end; never change an
// existing entry.
var migrations = []migration{
	// 1: initial schema
	{sql: `CREATE TABLE history (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		target TEXT NOT NULL,
		service TEXT NOT NULL,
		method TEXT NOT NULL,
		start_time TEXT NOT NULL,
		item TEXT NOT NULL
	);
	CREATE INDEX history_target_id ON history (target, id);
	CREATE TABLE saved_requests (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		service TEXT NOT NULL,
		method TEXT NOT NULL,
		name TEXT NOT NULL,
		description TEXT NOT NULL DEFAULT '',
		request TEXT NOT NULL,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL
	);
	CREATE INDEX saved_requests_method ON saved_requests (service, method, name);`},
	// 2: history is ordered by start time, so history.start_time holds
	// sortable UTC times (see sortableTime)
	{
		sql: `DROP INDEX history_target_id;
		CREATE INDEX history_target_time ON history (target, start_time, id);`,
		fn: normalizeHistoryStartTimes,
	},
	// 3: passkeys made or recorded by passkey flows, and the flows
	{sql: `CREATE TABLE passkeys (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		kind TEXT NOT NULL,
		status TEXT NOT NULL,
		rp_id TEXT NOT NULL,
		origin TEXT NOT NULL DEFAULT '',
		credential_id TEXT NOT NULL,
		user_id TEXT NOT NULL DEFAULT '',
		user_name TEXT NOT NULL DEFAULT '',
		display_name TEXT NOT NULL DEFAULT '',
		public_key TEXT NOT NULL DEFAULT '',
		private_key BLOB,
		sign_count INTEGER NOT NULL DEFAULT 0,
		created_at TEXT NOT NULL,
		last_used_at TEXT
	);
	CREATE UNIQUE INDEX passkeys_credential ON passkeys (rp_id, credential_id);
	CREATE TABLE passkey_flows (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		kind TEXT NOT NULL,
		flow TEXT NOT NULL,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL
	);`},
}

// Store is a SQLite database of request history, saved requests, passkeys
// and passkey flows. It is
// safe for concurrent use, and several Stores (in one or more processes) may
// use the same database file.
type Store struct {
	db *sql.DB
}

// Open opens the SQLite database at the given path, creating the file and
// its parent directories if needed, and brings its schema up to date.
func Open(path string) (*Store, error) {
	if path == "" {
		return nil, fmt.Errorf("no database path given")
	}
	abs, err := filepath.Abs(path)
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(filepath.Dir(abs), 0700); err != nil {
		return nil, fmt.Errorf("failed to create folder for database: %w", err)
	}
	// The database holds request metadata, which can include credentials, so
	// keep it private to the user. SQLite gives the -wal and -shm files the
	// same mode as the database. Opening for writing here also catches a
	// read-only file before the UI starts relying on it.
	if err := makePrivate(abs); err != nil {
		return nil, err
	}

	db, err := sql.Open("sqlite", dsn(abs))
	if err != nil {
		return nil, err
	}
	s := &Store{db: db}
	if err := s.migrate(context.Background()); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("failed to open database %s: %w", abs, err)
	}
	return s, nil
}

// dsn returns the driver's data source name for the database file at the
// given absolute path. It is a "file:" URI, so the path may contain any
// character. The pragmas apply to every connection the pool opens.
func dsn(abs string) string {
	p := filepath.ToSlash(abs)
	if !strings.HasPrefix(p, "/") {
		p = "/" + p // Windows: file:///C:/...
	}
	q := url.Values{}
	q.Add("_pragma", fmt.Sprintf("busy_timeout(%d)", busyTimeout.Milliseconds()))
	q.Add("_pragma", "journal_mode(WAL)")
	q.Add("_pragma", "synchronous(NORMAL)")
	// Take the write lock when a transaction starts, so that transactions
	// wait for each other (busy_timeout) instead of failing when one of them
	// tries to upgrade a read lock.
	q.Set("_txlock", "immediate")
	u := url.URL{Scheme: "file", Path: p, RawQuery: q.Encode()}
	return u.String()
}

// migrate applies the migrations the database does not have yet.
func (s *Store) migrate(ctx context.Context) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var version int
	if err := tx.QueryRowContext(ctx, "PRAGMA user_version").Scan(&version); err != nil {
		return err
	}
	if version > len(migrations) {
		return fmt.Errorf("database schema version %d is newer than this version of grpcui supports (%d)", version, len(migrations))
	}
	for i := version; i < len(migrations); i++ {
		m := migrations[i]
		if m.sql != "" {
			if _, err := tx.ExecContext(ctx, m.sql); err != nil {
				return fmt.Errorf("schema migration %d failed: %w", i+1, err)
			}
		}
		if m.fn != nil {
			if err := m.fn(ctx, tx); err != nil {
				return fmt.Errorf("schema migration %d failed: %w", i+1, err)
			}
		}
	}
	// PRAGMA does not take parameters; the value is a number we control.
	// This is written even when nothing changed, so that a database that
	// can't be written (read-only file, folder or file system) fails here.
	if _, err := tx.ExecContext(ctx, fmt.Sprintf("PRAGMA user_version = %d", len(migrations))); err != nil {
		return err
	}
	return tx.Commit()
}

// makePrivate creates the database file if needed and makes it and its
// -wal/-shm files readable and writable only by the current user.
func makePrivate(abs string) error {
	f, err := os.OpenFile(abs, os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		return fmt.Errorf("failed to open database %s for writing: %w", abs, err)
	}
	if err := f.Close(); err != nil {
		return err
	}
	for _, p := range []string{abs, abs + "-wal", abs + "-shm"} {
		info, err := os.Stat(p)
		if err != nil {
			continue // -wal and -shm only exist while the database is in use
		}
		if info.Mode().Perm()&0077 != 0 {
			if err := os.Chmod(p, 0600); err != nil {
				return fmt.Errorf("failed to make database file %s private: %w", p, err)
			}
		}
	}
	return nil
}

// Close closes the database.
func (s *Store) Close() error {
	return s.db.Close()
}

// now returns the current time, formatted as stored in the database.
func now() string {
	return time.Now().UTC().Format(time.RFC3339)
}
