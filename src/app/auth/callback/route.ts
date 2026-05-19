import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const redirectTo = next.startsWith("/") ? `${origin}${next}` : origin;

  if (code) {
    const cookieStore = await cookies();

    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/^﻿/, "").trim();
    const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").replace(/^﻿/, "").trim();

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    });

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const hasProfile = !!data.user?.user_metadata?.username;
      return NextResponse.redirect(hasProfile ? redirectTo : `${origin}/settings`);
    }

    console.error("[auth/callback] exchangeCodeForSession error:", error);
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(`${origin}/auth/login?error=no_code`);
}
