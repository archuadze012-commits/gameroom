import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getRequestOriginFromHeaders } from "@/lib/url";

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Allowlist of public routes
  const publicPaths = [
    "/auth/login",
    "/auth/signup",
    "/auth/callback",
    "/auth/confirm",
    "/api/auth/callback",
    "/api/auth/confirm",
  ];

  // The landing page is allowed for guests (we just made it attractive for them)
  const isHome = path === "/";
  const isPublic = publicPaths.some((p) => path === p) || path.startsWith("/api/auth");

  if (isHome || isPublic) {
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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL(
        "/auth/login",
        getRequestOriginFromHeaders(request.headers, request.nextUrl.origin)
      );
      loginUrl.searchParams.set("next", path);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next({ request });
}
