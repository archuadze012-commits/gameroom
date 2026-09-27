## 2025-03-09 - JSON-LD Script XSS Vulnerability
**Vulnerability:** XSS vulnerability through `dangerouslySetInnerHTML` injecting unescaped `JSON.stringify` data into `<script>` tags for JSON-LD structured data.
**Learning:** `JSON.stringify` does not escape HTML control characters like `<`. When this output is placed directly in a `<script>` tag using `dangerouslySetInnerHTML`, a malicious actor could construct a string containing `</script><script>alert('XSS')</script>` which breaks out of the original script block and executes arbitrary JavaScript.
**Prevention:** Always escape `<` characters in the output of `JSON.stringify` by replacing them with their unicode representation (e.g., `JSON.stringify(data).replace(/</g, '\u003c')`) before injecting it via `dangerouslySetInnerHTML`.
