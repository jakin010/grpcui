package grpcui

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"math"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/golang/protobuf/jsonpb" //lint:ignore SA1019 we have to import this because it appears in grpcurl APIs used herein
	"github.com/golang/protobuf/proto"  //lint:ignore SA1019 we have to import this because it appears in grpcurl APIs used herein
	"github.com/jhump/protoreflect/desc"
	"github.com/jhump/protoreflect/dynamic"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"

	"github.com/fullstorydev/grpcurl"
)

// Live calls
//
// Besides the one-shot invocation (all request messages in, all responses
// out), the invoke handler supports live calls, where request messages can be
// sent while the call runs and responses are streamed back as they arrive.
// They are driven with the "op" query parameter, all as POSTs to the method's
// path (send, close and cancel work even if the schema has been reloaded since
// the call started):
//
//	?op=open             body like a one-shot invocation; the response is a
//	                     stream of newline-delimited JSON events (see
//	                     liveEvent) that ends when the call does
//	?op=send&id=ID       body {"data": [msg, ...]}: sends more messages
//	?op=close&id=ID      half-closes the call (no more messages will be sent)
//	?op=cancel&id=ID     cancels the call
//
// The first event of an opened call is "open", which carries the ID. For
// methods that are not client-streaming, the call is half-closed right after
// the messages given to open.

// liveEvent is one line of an opened call's response.
type liveEvent struct {
	Type string `json:"type"` // open, headers, sent, message, end, failure

	ID       string           `json:"id,omitempty"`       // open
	Headers  []rpcMetadata    `json:"headers,omitempty"`  // headers
	Sent     int              `json:"sent,omitempty"`     // sent: how many messages have been sent so far
	Message  json.RawMessage  `json:"message,omitempty"`  // message
	IsError  bool             `json:"isError,omitempty"`  // message: true if it couldn't be decoded
	Error    *rpcError        `json:"error,omitempty"`    // end: the call's status, if not OK
	Trailers []rpcMetadata    `json:"trailers,omitempty"` // end
	Requests *rpcRequestStats `json:"requests,omitempty"` // end
	Text     string           `json:"text,omitempty"`     // failure: what went wrong
	Elapsed  float64          `json:"elapsedMS"`          // all: milliseconds since the call was opened
}

type liveCalls struct {
	mu    sync.Mutex
	calls map[string]*liveCall
}

func newLiveCalls() *liveCalls {
	return &liveCalls{calls: map[string]*liveCall{}}
}

// liveCall is a call that is running. Request messages wait in queue until
// grpcurl asks for the next one.
type liveCall struct {
	id     string
	method string
	md     *desc.MethodDescriptor
	// descSource resolves the method's messages, as of when the call started
	descSource grpcurl.DescriptorSource
	ctx        context.Context // ends when the call is cancelled or times out
	cancel     context.CancelFunc

	mu         sync.Mutex
	queue      []json.RawMessage
	total      int
	halfClosed bool
	notify     chan struct{} // signalled when queue or halfClosed changes
	done       chan struct{} // closed when the call ends
	doneOnce   sync.Once
}

func (c *liveCall) finish() {
	c.doneOnce.Do(func() { close(c.done) })
}

func (c *liveCall) signal() {
	select {
	case c.notify <- struct{}{}:
	default:
	}
}

var (
	errCallEnded  = errors.New("the call has already ended")
	errHalfClosed = errors.New("the call is no longer accepting messages")
)

func (c *liveCall) enqueue(msgs []json.RawMessage) error {
	select {
	case <-c.done:
		return errCallEnded
	default:
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.halfClosed {
		return errHalfClosed
	}
	c.queue = append(c.queue, msgs...)
	c.total += len(msgs)
	c.signal()
	return nil
}

func (c *liveCall) closeSend() {
	c.mu.Lock()
	c.halfClosed = true
	c.mu.Unlock()
	c.signal()
}

// next blocks until there is a message to send, returning io.EOF once the
// call is half-closed (or over) and the queue is empty.
func (c *liveCall) next() (json.RawMessage, error) {
	for {
		c.mu.Lock()
		if len(c.queue) > 0 {
			m := c.queue[0]
			c.queue = c.queue[1:]
			c.mu.Unlock()
			return m, nil
		}
		closed := c.halfClosed
		c.mu.Unlock()
		if closed {
			return nil, io.EOF
		}
		select {
		case <-c.notify:
		case <-c.done:
			return nil, io.EOF
		case <-c.ctx.Done():
			// cancelled or timed out: stop sending, so grpcurl goes on to
			// collect the call's status
			return nil, io.EOF
		}
	}
}

func newCallID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}

func (lc *liveCalls) get(id, method string) *liveCall {
	lc.mu.Lock()
	defer lc.mu.Unlock()
	c := lc.calls[id]
	if c == nil || c.method != method {
		return nil
	}
	return c
}

func (lc *liveCalls) add(c *liveCall) {
	lc.mu.Lock()
	lc.calls[c.id] = c
	lc.mu.Unlock()
}

func (lc *liveCalls) remove(id string) {
	lc.mu.Lock()
	delete(lc.calls, id)
	lc.mu.Unlock()
}

// validateMessages checks that each message is valid JSON for the method's
// request type, so a bad message is reported to the sender instead of ending
// the call.
func validateMessages(md *desc.MethodDescriptor, descSource grpcurl.DescriptorSource, msgs []json.RawMessage) error {
	u := jsonpb.Unmarshaler{AnyResolver: grpcurl.AnyResolverFromDescriptorSource(descSource)}
	for i, raw := range msgs {
		m := dynamic.NewMessage(md.GetInputType())
		if err := u.Unmarshal(bytes.NewReader(raw), m); err != nil {
			if len(msgs) == 1 {
				return err
			}
			return errors.New("message " + strconv.Itoa(i+1) + ": " + err.Error())
		}
	}
	return nil
}

// serveOp handles send, close and cancel for a running call.
func (lc *liveCalls) serveOp(w http.ResponseWriter, r *http.Request, op, method string) {
	call := lc.get(r.URL.Query().Get("id"), method)
	if call == nil {
		http.Error(w, "No such call. It may have ended already.", http.StatusGone)
		return
	}
	switch op {
	case "send":
		var input struct {
			Data []json.RawMessage `json:"data"`
		}
		if err := json.NewDecoder(io.LimitReader(r.Body, 64<<20)).Decode(&input); err != nil {
			http.Error(w, "Failed to parse JSON: "+err.Error(), http.StatusBadRequest)
			return
		}
		if !call.md.IsClientStreaming() {
			http.Error(w, "This method takes a single request message, so nothing more can be sent.", http.StatusConflict)
			return
		}
		if err := validateMessages(call.md, call.descSource, input.Data); err != nil {
			http.Error(w, "Invalid request message: "+err.Error(), http.StatusBadRequest)
			return
		}
		if err := call.enqueue(input.Data); err != nil {
			code := http.StatusConflict
			if err == errCallEnded {
				code = http.StatusGone
			}
			http.Error(w, err.Error(), code)
			return
		}
	case "close":
		call.closeSend()
	case "cancel":
		call.cancel()
	default:
		http.Error(w, "Unknown op "+op, http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte("{}"))
}

func (lc *liveCalls) open(w http.ResponseWriter, r *http.Request, md *desc.MethodDescriptor, ch grpc.ClientConnInterface, descSource grpcurl.DescriptorSource, options *InvokeOptions) {
	var input rpcInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Failed to parse JSON: "+err.Error(), http.StatusBadRequest)
		return
	}
	if err := validateMessages(md, descSource, input.Data); err != nil {
		http.Error(w, "Invalid request message: "+err.Error(), http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()
	if input.TimeoutSeconds > 0 {
		timeout := time.Duration(input.TimeoutSeconds * float32(time.Second))
		if timeout < 0 {
			timeout = time.Duration(math.MaxInt64)
		}
		var cancelTimeout context.CancelFunc
		ctx, cancelTimeout = context.WithTimeout(ctx, timeout)
		defer cancelTimeout()
	}

	call := &liveCall{
		id:         newCallID(),
		method:     md.GetFullyQualifiedName(),
		md:         md,
		descSource: descSource,
		ctx:        ctx,
		cancel:     cancel,
		notify:     make(chan struct{}, 1),
		done:       make(chan struct{}),
	}
	call.queue = append(call.queue, input.Data...)
	call.total = len(input.Data)
	if !md.IsClientStreaming() {
		call.halfClosed = true
	}
	lc.add(call)
	defer lc.remove(call.id)
	defer call.finish()

	rc := http.NewResponseController(w)
	start := time.Now()
	var writeMu sync.Mutex
	emit := func(ev liveEvent) {
		ev.Elapsed = float64(time.Since(start).Microseconds()) / 1000
		b, err := json.Marshal(ev)
		if err != nil {
			return
		}
		writeMu.Lock()
		defer writeMu.Unlock()
		w.Write(append(b, '\n'))
		_ = rc.Flush()
	}

	w.Header().Set("Content-Type", "application/x-ndjson")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(http.StatusOK)
	emit(liveEvent{Type: "open", ID: call.id})

	stats := &rpcRequestStats{}
	var statsMu sync.Mutex
	requestFunc := func(m proto.Message) error {
		raw, err := call.next()
		if err != nil {
			return err
		}
		if err := jsonpb.Unmarshal(bytes.NewReader(raw), m); err != nil {
			return status.Error(codes.InvalidArgument, err.Error())
		}
		statsMu.Lock()
		stats.Sent++
		sent := stats.Sent
		statsMu.Unlock()
		emit(liveEvent{Type: "sent", Sent: sent})
		return nil
	}

	webFormHdrs := make(metadata.MD, len(input.Metadata))
	for _, hdr := range input.Metadata {
		webFormHdrs.Append(hdr.Name, hdr.Value)
	}
	invokeHdrs := options.computeHeaders(r.Header, webFormHdrs)

	handler := &liveHandler{
		descSource:   descSource,
		emitDefaults: options.EmitDefaults,
		emit:         emit,
		onEnd: func() *rpcRequestStats {
			// the call is over: stop waiting for messages to send (grpcurl
			// waits for its sending goroutine before returning)
			call.finish()
			call.mu.Lock()
			total := call.total
			call.mu.Unlock()
			statsMu.Lock()
			defer statsMu.Unlock()
			return &rpcRequestStats{Total: total, Sent: stats.Sent}
		},
	}
	err := grpcurl.InvokeRPC(ctx, descSource, ch, md.GetFullyQualifiedName(), invokeHdrs, handler, requestFunc)
	if handler.ended {
		return
	}
	switch {
	case ctx.Err() != nil:
		// cancelled or timed out before the call got going, so grpcurl had
		// no status to report
		handler.OnReceiveTrailers(status.FromContextError(ctx.Err()), nil)
	case err != nil:
		emit(liveEvent{Type: "failure", Text: err.Error()})
	default:
		emit(liveEvent{Type: "failure", Text: "The call ended without a status."})
	}
}

type liveHandler struct {
	descSource   grpcurl.DescriptorSource
	emitDefaults bool
	emit         func(liveEvent)
	onEnd        func() *rpcRequestStats
	ended        bool
}

func (*liveHandler) OnResolveMethod(*desc.MethodDescriptor) {}

func (*liveHandler) OnSendHeaders(metadata.MD) {}

func (h *liveHandler) OnReceiveHeaders(md metadata.MD) {
	h.emit(liveEvent{Type: "headers", Headers: responseMetadata(md)})
}

func (h *liveHandler) OnReceiveResponse(m proto.Message) {
	el := responseToJSON(h.descSource, m, h.emitDefaults)
	h.emit(liveEvent{Type: "message", Message: el.Data, IsError: el.IsError})
}

func (h *liveHandler) OnReceiveTrailers(stat *status.Status, md metadata.MD) {
	h.ended = true
	reqs := h.onEnd()
	h.emit(liveEvent{
		Type:     "end",
		Error:    toRpcError(h.descSource, stat, h.emitDefaults),
		Trailers: responseMetadata(md),
		Requests: reqs,
	})
}
