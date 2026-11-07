package webauthn

import (
	"encoding/binary"
)

// The little CBOR (RFC 8949) a WebAuthn authenticator writes: unsigned and
// negative integers, byte and text strings, and maps. Map entries are
// written in the order given, so callers list them in CTAP2 canonical order.

type cborEntry struct {
	key, value any
}

type cborMap []cborEntry

func cborEncode(v any) []byte {
	return cborAppend(nil, v)
}

func cborAppend(b []byte, v any) []byte {
	switch v := v.(type) {
	case int:
		if v >= 0 {
			return cborHead(b, 0, uint64(v))
		}
		return cborHead(b, 1, uint64(-1-v))
	case []byte:
		return append(cborHead(b, 2, uint64(len(v))), v...)
	case string:
		return append(cborHead(b, 3, uint64(len(v))), v...)
	case cborMap:
		b = cborHead(b, 5, uint64(len(v)))
		for _, e := range v {
			b = cborAppend(b, e.key)
			b = cborAppend(b, e.value)
		}
		return b
	default:
		panic("cbor: unsupported type")
	}
}

// cborHead writes a major type and argument in the shortest form.
func cborHead(b []byte, major byte, n uint64) []byte {
	m := major << 5
	switch {
	case n < 24:
		return append(b, m|byte(n))
	case n <= 0xff:
		return append(b, m|24, byte(n))
	case n <= 0xffff:
		return binary.BigEndian.AppendUint16(append(b, m|25), uint16(n))
	case n <= 0xffffffff:
		return binary.BigEndian.AppendUint32(append(b, m|26), uint32(n))
	default:
		return binary.BigEndian.AppendUint64(append(b, m|27), n)
	}
}
