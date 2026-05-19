import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/^﻿/, "").trim();
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.replace(/^﻿/, "").trim();

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const path = request.nextUrl.pathname;
  const protectedPrefixes = ["/settings", "/lfg/new", "/admin"];
  const requiresAuth = protectedPrefixes.some((p) => path.startsWith(p));

  // Check session cookie directly — avoids supabase-js parsing issues in edge runtime
  const hasSessionCookie = request.cookies.getAll().some(
    (c) => c.name.includes("-auth-token") && c.value.length > 10
  );

  if (requiresAuth && !hasSessionCookie) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
