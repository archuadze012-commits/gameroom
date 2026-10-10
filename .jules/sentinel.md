## 2024-03-XX - JSON-LD XSS via dangerouslySetInnerHTML
**Vulnerability:** dangerouslySetInnerHTML is used with JSON.stringify() to inject JSON-LD without escaping HTML characters, allowing XSS.
**Learning:** JSON.stringify() does not escape '<' or '/', meaning malicious strings (like '</script><script>alert(1)</script>') can break out of the JSON context when parsed by the browser.
**Prevention:** Use a safe stringify function (e.g., replacing '<' with '<') before using dangerouslySetInnerHTML, or use a library that handles this automatically.
