## 2024-05-15 - XSS Vulnerability in JSON-LD Injection
**Vulnerability:** JSON-LD data was injected into the DOM using `dangerouslySetInnerHTML` and `JSON.stringify()`, which does not escape HTML characters like `<` or `/`, creating a potential Cross-Site Scripting (XSS) vulnerability.
**Learning:** `JSON.stringify()` is not safe to use directly inside `<script>` tags or `dangerouslySetInnerHTML` in React because it doesn't escape HTML tags. Malicious user input within the JSON could close the `<script>` tag prematurely and execute arbitrary JavaScript.
**Prevention:** Always sanitize serialized JSON strings by escaping HTML characters (e.g., `.replace(/</g, '\\u003c')`) before injecting them into the DOM.
