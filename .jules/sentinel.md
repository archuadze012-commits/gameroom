## 2024-06-25 - XSS Vulnerability in JSON-LD Injection
**Vulnerability:** XSS vulnerability exists when injecting JSON-LD data into a `<script>` tag using `dangerouslySetInnerHTML` with only `JSON.stringify()`.
**Learning:** `JSON.stringify()` does not escape the `<` character, meaning an attacker could inject an arbitrary closing `</script>` tag and execute malicious script afterwards inside the stringified JSON.
**Prevention:** Always escape `<` characters in the stringified JSON output (e.g., `.replace(/</g, '\\u003c')`) before injecting it via `dangerouslySetInnerHTML`.