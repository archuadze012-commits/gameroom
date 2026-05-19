import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const protectedPrefixes = ["/settings", "/lfg/new", "/admin"];
  const requiresAuth = protectedPrefixes.some((p) => path.startsWith(p));

  if (!requiresAuth) {
    return NextResponse.next({ request });
  }

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/^﻿/, "").trim();
  const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").replace(/^﻿/, "").trim();

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  const cookieStore = await cookies();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // ignore — proxy can't always write via next/headers
          }
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Only block when we're certain the user is unauthenticated.
  // If getUser returns a network/unexpected error, pass through to avoid false logouts.
  if (!user && !error) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
