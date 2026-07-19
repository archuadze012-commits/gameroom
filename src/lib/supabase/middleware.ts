import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getRequestOriginFromHeaders, getSiteOrigin } from "@/lib/url";

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const protectedPathPrefixes = [
    "/admin",
    "/feed",
    "/messages",
    "/settings",
    "/articles/new",
    "/clans/new",
    "/lfg/new",
    "/rooms/new",
    "/free-pc-games/voice-test",
  ];

  const protectedApiPrefixes = [
    "/api/admin",
    "/api/conversations",
    "/api/notifications",
    "/api/profile",
    "/api/push",
  ];

  // Cron routes authenticate via a CRON_SECRET bearer header at the route
  // handler itself (Vercel Cron requests carry no Supabase session cookie).
  const isCronRoute = path.startsWith("/api/admin/cron/");

  const requiresSession =
    !isCronRoute &&
    (protectedPathPrefixes.some((p) => path === p || path.startsWith(`${p}/`)) ||
      protectedApiPrefixes.some((p) => path === p || path.startsWith(`${p}/`)));

  if (!requiresSession) {
    return NextResponse.next({ request });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // If Supabase isn't configured, auth can't work anyway — don't hard-lock the
  // route here; the page/route-level guards still apply. Otherwise, validate
  // the session for real (a present-but-forged cookie must not pass).
  if (url && anon) {
    const cookieStore = await cookies();
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        // Read-only gate — token refresh is handled by server components.
        setAll() {},
      },
    });
    // getClaims() verifies the JWT locally via the project's cached JWKS
    // (this project uses asymmetric ES256 signing keys) — no per-request
    // round trip to Supabase, unlike getUser(). If a token ever surfaces
    // signed with the legacy symmetric secret, the SDK transparently falls
    // back to a getUser()-equivalent network check, so this is not a security
    // downgrade either way — see @supabase/auth-js GoTrueClient.getClaims().
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

    if (claimsError || !claimsData) {
      const loginUrl = new URL(
        "/auth/login",
        getSiteOrigin() ?? getRequestOriginFromHeaders(request.headers, request.nextUrl.origin)
      );
      loginUrl.searchParams.set("next", path);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next({ request });
}
