## 2026-11-06 - XSS vulnerability in dangerouslySetInnerHTML with JSON.stringify
**Vulnerability:** XSS vulnerability where `<script type="application/ld+json">` payload can be escaped by providing `<` in string payload.
**Learning:** `JSON.stringify` does not escape `<` which means that when used in `dangerouslySetInnerHTML`, the injected `<script>` tag can be broken out of using `</script>`.
**Prevention:** In React, explicitly escape `<` in JSON strings that are injected via `dangerouslySetInnerHTML` by calling `.replace(/</g, '\\u003c')`.
