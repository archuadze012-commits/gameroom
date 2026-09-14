## 2024-05-18 - Prevent XSS in JSON-LD script tags injected via dangerouslySetInnerHTML
**Vulnerability:** XSS vulnerability through unescaped `<` or `/` characters when serializing data via `JSON.stringify` directly into `dangerouslySetInnerHTML`.
**Learning:** `JSON.stringify` alone does not escape HTML control characters like `<`. If this serialized string is placed inside `<script>` tags using `dangerouslySetInnerHTML`, a payload like `</script><script>alert(1)</script>` can break out of the script context and execute arbitrary code.
**Prevention:** Always sanitize strings serialized with `JSON.stringify` by replacing `<` with `\u003c` (e.g. `JSON.stringify(data).replace(/</g, '\\u003c')`) before injecting them into `dangerouslySetInnerHTML`.
