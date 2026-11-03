// Package storage keeps the gRPC web UI's request history and saved requests
// in a SQLite database, and serves them to the web form over a small JSON API.
//
// Open the database with Open and mount the handler returned by
// Store.Handler. The handler's paths are relative, so mount it under a prefix
// with http.StripPrefix:
//
//	store, err := storage.Open("/path/to/grpcui.db")
//	if err != nil {
//		return err
//	}
//	defer store.Close()
//	mux.Handle("/api/", http.StripPrefix("/api", store.Handler()))
//
// Then tell the web form where the API is, with the StorageURI field of
// grpcui.WebFormOptions (the standalone package does all of this for you when
// given standalone.WithStorage(store.Handler())). The handler does no CSRF checks
// of its own: wrap it with one, as the standalone package does.
//
// Several processes can share one database file: the store uses SQLite's WAL
// journal and waits for locks held by other connections.
//
// # History
//
// The history is the list of RPCs sent from the web form, kept per target
// (the address of the gRPC server the UI sends RPCs to). An entry is a JSON
// object made by the web form, stored as is; it must have non-empty "service"
// and "method" strings and a "startTime" string, normally an RFC 3339 time.
// The store adds an "id" number when returning it.
//
// Entries are ordered by "startTime", newest first, whatever order they were
// added in; entries with the same start time are listed newest added first.
// The store keeps the 100 newest entries of each target, by that order. An
// entry whose "startTime" is not an RFC 3339 time is sorted as if it started
// when it was added.
//
//	GET    /history?target=T   {"items":[...]}, newest first
//	POST   /history            {"target":T,"item":{...}} -> {"id":N}
//	POST   /history/import     {"target":T,"items":[...]} -> {"imported":N}
//	DELETE /history/{id}       removes one entry
//	DELETE /history?target=T   removes every entry of target T
//
// Imported entries are added (and get ids) in the order of their "startTime"
// values.
//
// # Saved requests
//
// A saved request is a named request body for one gRPC method, meant to be
// exported and shared. It has the same form as an entry of grpcui's -examples
// file, plus "id", "createdAt" and "updatedAt" (RFC 3339 times):
//
//	{"id":1, "name":"...", "description":"...",
//	 "service":"pkg.Service", "method":"Method",
//	 "request":{"timeout_secs":5, "metadata":[{"name":"...","value":"..."}],
//	            "data":{...}},
//	 "createdAt":"...", "updatedAt":"..."}
//
// The name, service and method must not be blank, and request.data must be
// present and not null. The other request fields may be omitted.
//
//	GET    /saved              {"items":[...]}, by service, method and name
//	POST   /saved              a saved request -> the stored saved request
//	PUT    /saved/{id}         a saved request -> the updated saved request
//	DELETE /saved/{id}         removes one saved request
//	POST   /saved/import       {"items":[...]} -> {"imported":N,"skipped":M,"renamed":R}
//
// POST and PUT ignore any "id", "createdAt" and "updatedAt" in the body.
// An import skips items that are already stored, or that appear earlier in
// the same import, with the same service, method, name and request (also
// when stored under a name the import gave it, see below). An item with the
// same service, method and name as a stored or earlier item but a different
// request is imported under the first free name of the form "<name> (2)",
// "<name> (3)" and so on; "imported" counts these items too, and "renamed"
// says how many there were. An import imports nothing if any item is invalid. The import body may also be a bare
// JSON array of items, such as the contents of an -examples file.
//
// # Errors
//
// Errors have a non-2xx status and a short plain-text message. Unknown paths
// get 404 and unsupported methods 405. Request bodies are limited to 16 MiB.
package storage
