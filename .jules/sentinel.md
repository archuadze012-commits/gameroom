## 2026-10-24 - [XSS via JSON-LD Serialization]
**Vulnerability:** JSON-LD data was serialized and injected via `dangerouslySetInnerHTML` using `JSON.stringify(data)` without HTML character escaping, opening the possibility for an attacker to break out of `<script>` tags and execute XSS attacks.
**Learning:** `JSON.stringify()` does not escape characters like `<` or `/`, making it unsafe to inject directly into HTML (even inside `<script>` blocks).
**Prevention:** When injecting JSON into HTML using `dangerouslySetInnerHTML`, always escape HTML characters (e.g., `JSON.stringify(data).replace(/</g, '\\u003c')`) to prevent XSS payloads from breaking out of the context.
