## 2026-10-20 - [XSS via JSON.stringify in dangerouslySetInnerHTML]
**Vulnerability:** XSS vulnerabilities can occur when inserting JSON (such as JSON-LD for SEO) into the DOM using React's `dangerouslySetInnerHTML` with just `JSON.stringify()`.
**Learning:** `JSON.stringify()` does not escape HTML characters such as `<` and `/`. This means if a user controls any of the strings within the JSON, they could potentially close the `<script>` tag and execute arbitrary scripts, leading to XSS.
**Prevention:** Always sanitize the serialized JSON string by replacing `<` with its unicode equivalent `\u003c` before injecting it via `dangerouslySetInnerHTML`. E.g. `JSON.stringify(data).replace(/</g, '\\u003c')`.
