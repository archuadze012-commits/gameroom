/**
 * Server-side Cloudflare Turnstile token verification.
 *
 * Call `verifyTurnstileToken(token, ip)` from a Server Action or Route Handler
 * to validate the CAPTCHA response that the client submitted.
 *
 * Requires the `TURNSTILE_SECRET_KEY` environment variable (server-only).
 *
 * @see https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
}

/**
 * Verify a Turnstile response token against Cloudflare's API.
 *
 * @param token  The `cf-turnstile-response` value from the client form.
 * @param ip     The client IP address (optional but recommended).
 * @returns `true` if the token is valid, `false` otherwise.
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  ip?: string | null
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // If Turnstile is not configured, skip verification (dev mode).
  if (!secret) {
    console.warn(
      "[turnstile] TURNSTILE_SECRET_KEY not set — skipping verification."
    );
    return true;
  }

  if (!token) return false;

  try {
    const body: Record<string, string> = {
      secret,
      response: token,
    };
    if (ip) body.remoteip = ip;

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body).toString(),
    });

    if (!res.ok) {
      console.error("[turnstile] API responded with status", res.status);
      return false;
    }

    const data = (await res.json()) as TurnstileVerifyResponse;

    if (!data.success) {
      console.warn("[turnstile] Verification failed:", data["error-codes"]);
    }

    return data.success;
  } catch (err) {
    console.error("[turnstile] Verification error:", err);
    return false;
  }
}
