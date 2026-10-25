## 2026-10-25 - XSS via dangerouslySetInnerHTML and JSON-LD
**Vulnerability:** XSS vulnerability found in JSON-LD injection using `dangerouslySetInnerHTML` without escaping HTML tags.
**Learning:** `JSON.stringify()` does not escape `<` or `/`, allowing XSS if malicious JSON is injected into a script tag via `dangerouslySetInnerHTML`.
**Prevention:** Always escape HTML characters (e.g., replacing `<` with `\u003c`) before injecting serialized JSON strings in React.
