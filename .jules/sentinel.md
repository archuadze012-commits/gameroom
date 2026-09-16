## 2024-09-16 - XSS vulnerability in JSON-LD injection via dangerouslySetInnerHTML
**Vulnerability:** Unescaped HTML characters inside JSON when injected via `dangerouslySetInnerHTML` in React applications.
**Learning:** `JSON.stringify()` does not escape HTML control characters like `<`. If this stringified JSON is passed directly into a `<script type="application/ld+json">` tag via `dangerouslySetInnerHTML`, and the JSON contains user-controlled content, a malicious user can close the script tag prematurely (e.g. via `</script>`) and inject arbitrary script content, leading to Cross-Site Scripting (XSS).
**Prevention:** Sanitize the serialized string by escaping HTML characters, specifically replacing `<` with `\u003c`, before injecting it.
