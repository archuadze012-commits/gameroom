import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const protectedPrefixes = ["/settings", "/lfg/new", "/admin"];
  const requiresAuth = protectedPrefixes.some((p) => path.startsWith(p));

  if (!requiresAuth) {
    return NextResponse.next({ request });
  }

  // Optimistic check: look for the Supabase session cookie using the
  // next/headers cookies() API (same source server components use).
  const cookieStore = await cookies();
  const hasSession = cookieStore.getAll().some(
    (c) =>
      c.name.includes("-auth-token") &&
      !c.name.includes("code-verifier") &&
      c.value.length > 10
  );

  if (!hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({ request });
}
