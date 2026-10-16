## 2026-10-16 - Prevent XSS in dangerouslySetInnerHTML with JSON.stringify
**Vulnerability:** XSS vulnerability through `dangerouslySetInnerHTML` injecting unsanitized `JSON.stringify` data.
**Learning:** `JSON.stringify` does not escape HTML characters like `<` or `/`. Passing it directly into `dangerouslySetInnerHTML` can allow attackers to break out of `<script>` tags and execute arbitrary JavaScript.
**Prevention:** Always sanitize the serialized string by escaping HTML characters, for example replacing `<` with `\u003c`, before injecting it with `dangerouslySetInnerHTML`.
