## 2024-10-27 - [JSON-LD XSS Injection in React Components]
**Vulnerability:** JSON-LD injected directly into a script tag using `dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}` allows closing the script tag early if the JSON data contains something like `</script><script>alert(1)</script>`.
**Learning:** `JSON.stringify()` output is not safe for direct HTML injection because it doesn't escape HTML-sensitive characters like `<`. React's `dangerouslySetInnerHTML` bypasses its built-in XSS protection, requiring manual serialization safety.
**Prevention:** Always escape `<` characters when stringifying JSON for HTML injection. For example, use `JSON.stringify(data).replace(/</g, '\\u003c')`.
