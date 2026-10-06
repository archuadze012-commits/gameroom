## 2024-03-05 - [JSON-LD XSS via dangerouslySetInnerHTML]
**Vulnerability:** XSS vulnerability through `dangerouslySetInnerHTML` injecting JSON-LD schema without escaping HTML characters.
**Learning:** `JSON.stringify()` does not escape `<` or `/`, meaning if attacker-controlled input is present in the object, they could potentially break out of the script tag and inject malicious HTML/JS.
**Prevention:** Sanitize the serialized string by replacing `<` with `\u003c` before injection.
