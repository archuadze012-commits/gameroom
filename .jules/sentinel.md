## 2026-11-07 - JSON-LD XSS via dangerouslySetInnerHTML
**Vulnerability:** JSON-LD injected via `dangerouslySetInnerHTML` was only serialized with `JSON.stringify()`, which does not escape `<` or `/`, creating a potential Cross-Site Scripting (XSS) vulnerability.
**Learning:** `JSON.stringify()` is insufficient for securely injecting JSON into HTML script tags because browsers can still parse terminating `</script>` tags or other HTML tags within the JSON payload if not properly escaped.
**Prevention:** Always sanitize serialized JSON strings by escaping HTML-sensitive characters (e.g., replacing `<` with `\u003c`) before injecting them into the DOM.
