## 2024-05-24 - JSON-LD Injection XSS
**Vulnerability:** XSS via unsafe JSON serialization in JSON-LD `<script>` blocks using `dangerouslySetInnerHTML={{ __html: JSON.stringify(...) }}`.
**Learning:** `JSON.stringify` does not escape HTML control characters like `<` or `>`. When its output is placed inside a `<script>` tag and parsed by the browser, malicious data (e.g., `</script><script>alert('XSS')</script>`) can break out of the script block and execute arbitrary JavaScript.
**Prevention:** Always escape HTML characters in serialized JSON before injecting them into HTML. Specifically, replace `<` with `\u003c` (e.g., `JSON.stringify(data).replace(/</g, "\\u003c")`) to safely embed JSON within `<script>` blocks.
