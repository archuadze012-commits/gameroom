## 2025-02-23 - Insecure Pseudo-Random Number Generation for OAuth CSRF State Token
**Vulnerability:** The TikTok OAuth initialization flow used `Math.random().toString(36).substring(2, 15)` to generate the CSRF `state` parameter. `Math.random()` is not cryptographically secure and could be predicted, allowing attackers to potentially bypass CSRF protections.
**Learning:** Security-sensitive tokens and state variables must always rely on cryptographically secure pseudorandom number generators (CSPRNG), regardless of whether they seem temporary or low-risk.
**Prevention:** Use built-in cryptographic functions such as `crypto.randomUUID()` (available in Node 24.x) or `randomBytes` from the `node:crypto` module to generate secure, unguessable strings for tokens.
