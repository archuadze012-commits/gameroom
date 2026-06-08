## 2023-10-27 - Predictable CSRF Tokens
**Vulnerability:** CSRF tokens (`state` parameter) were generated using `Math.random().toString(36)`.
**Learning:** `Math.random()` produces predictable sequences, making it theoretically possible to guess CSRF tokens and bypass protections during OAuth flows.
**Prevention:** Always use cryptographically secure random number generators (e.g., `crypto.randomUUID()` or `crypto.getRandomValues()`) for generating any security-sensitive tokens, keys, or IDs.

## 2023-10-27 - Gitleaks Action Token Requirement
**Vulnerability:** Gitleaks GitHub Action fails if `GITHUB_TOKEN` is not provided, preventing secret scanning on pull requests.
**Learning:** Recent updates to `gitleaks-action` mandate the inclusion of `GITHUB_TOKEN` to function correctly.
**Prevention:** Always ensure `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` is set in the `env` for `gitleaks-action` steps in GitHub workflows.
