import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteOrigin, getRequestOriginFromHeaders } from "@/lib/url";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const origin = getSiteOrigin() ?? getRequestOriginFromHeaders(request.headers, requestUrl.origin);
  const next = requestUrl.searchParams.get("next") ?? "/";

  // 🛡️ Sentinel: Prevent Open Redirect by explicitly rejecting protocol-relative URLs
  const isValidNext = next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\");
  const callbackUrl = `${origin}/auth/callback${
    isValidNext ? `?next=${encodeURIComponent(next)}` : ""
  }`;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl,
    },
  });

  if (error || !data?.url) {
    const message = error?.message ?? "Google OAuth ვერ დაიწყო";
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(message)}&next=${encodeURIComponent(
        next
      )}`
    );
  }

  const response = NextResponse.redirect(data.url);
  response.cookies.set("gr_oauth_origin", origin, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 10,
  });
  return response;
}
