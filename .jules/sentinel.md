## 2024-05-31 - [XSS vulnerability via unescaped JSON-LD]
**Vulnerability:** XSS vulnerability through `dangerouslySetInnerHTML` injecting JSON-LD without proper HTML escaping (e.g. `<` and `>`).
**Learning:** `JSON.stringify` does not escape HTML control characters like `<`. Therefore, injecting JSON directly into a script tag using `dangerouslySetInnerHTML` can lead to XSS if the JSON contains user-controllable data.
**Prevention:** Always escape HTML characters (e.g., `<` -> `\u003c`, `>` -> `\u003e`) when serializing JSON for inclusion in HTML script tags, or use safe serialization libraries.
