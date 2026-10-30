## 2026-10-30 - Fix XSS in JSON-LD serialization
**Vulnerability:** JSON-LD script tags using `dangerouslySetInnerHTML` with `JSON.stringify` directly are vulnerable to XSS if an attacker inputs content containing `</script><script>alert(1)</script>`. `JSON.stringify` does not escape `<` or `/`.
**Learning:** React's `dangerouslySetInnerHTML` does not sanitize content, and `JSON.stringify` alone is insufficient for safely injecting JSON into HTML script tags.
**Prevention:** When using `dangerouslySetInnerHTML` for JSON injection, always sanitize the serialized string by escaping HTML characters, e.g., using `.replace(/</g, '\\u003c')`.
