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
      const user = data.user;
      const savedUsername = user.user_metadata?.username as string | undefined;
      const emailPrefix = (user.email?.split("@")[0] ?? "user")
        .replace(/[^a-zA-Z0-9_]/g, "")
        .slice(0, 26);
      const fallbackUsername = `${emailPrefix}_${user.id.slice(0, 6)}`;

      let hasProfile = !!savedUsername;
      try {
        const { data: existing } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle();

        if (!existing) {
          await supabase.from("profiles").insert({
            id: user.id,
            username: savedUsername ?? fallbackUsername,
            display_name:
              (user.user_metadata?.full_name as string | undefined) ??
              (user.user_metadata?.name as string | undefined) ??
              emailPrefix,
            avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
            email: user.email ?? null,
          });
        } else {
          hasProfile = true;
          await supabase.from("profiles").update({
            avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
            email: user.email ?? null,
            updated_at: new Date().toISOString(),
          }).eq("id", user.id);
        }
      } catch (e) {
        console.error("[auth/callback] profile upsert:", e);
      }

      return NextResponse.redirect(hasProfile ? redirectTo : `${origin}/settings`);
    }

    console.error("[auth/callback] exchangeCodeForSession error:", error);
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(`${origin}/auth/login?error=no_code`);
}
