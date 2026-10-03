## 2025-02-27 - Insecure JSON-LD Injection and CSRF State Generation
**Vulnerability:** Found `Math.random()` used for TikTok OAuth CSRF state generation and `JSON.stringify()` used inside `dangerouslySetInnerHTML` for JSON-LD without escaping `<`.
**Learning:** `Math.random()` is not cryptographically secure and can be predicted, breaking CSRF protection. `JSON.stringify()` alone inside `dangerouslySetInnerHTML` can allow XSS if an attacker controls input containing `</script><script>alert(1)</script>`.
**Prevention:** Use `crypto.randomUUID()` or `node:crypto`'s `randomBytes` for secure CSRF state generation. Always escape HTML characters (e.g., `<` to `\u003c`) when injecting JSON into the DOM via `dangerouslySetInnerHTML`.
