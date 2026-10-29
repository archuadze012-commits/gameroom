## 2026-10-29 - Prevent XSS in JSON-LD with dangerouslySetInnerHTML
**Vulnerability:** JSON-LD injected using `dangerouslySetInnerHTML` combined with `JSON.stringify` does not escape `<` or `/`, creating a potential Cross-Site Scripting (XSS) vulnerability.
**Learning:** `JSON.stringify` alone is insufficient to prevent XSS when rendering strings inside script tags, as an attacker could supply content that prematurely closes the script tag (`</script>`) and injects malicious payload.
**Prevention:** Always sanitize the serialized string by escaping HTML characters (e.g., replacing `<` with `\u003c`) before injection via `dangerouslySetInnerHTML`.
