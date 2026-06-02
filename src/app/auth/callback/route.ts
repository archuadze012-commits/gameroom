import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCanonicalOrigin, getRequestOriginFromHeaders, getSiteOrigin } from "@/lib/url";
import { signupRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const { searchParams, origin: requestOrigin } = new URL(request.url);
  const cookieStore = await cookies();
  const savedOrigin = cookieStore.get("gr_oauth_origin")?.value;
  const origin =
    getSiteOrigin() ??
    (savedOrigin ? getCanonicalOrigin(savedOrigin) : getRequestOriginFromHeaders(request.headers, requestOrigin));
  const code = searchParams.get("code");
  const authError = searchParams.get("error_description") ?? searchParams.get("error");
  const next = searchParams.get("next") ?? "/";
  const redirectTo = next.startsWith("/") ? `${origin}${next}` : origin;

  const redirectWithCleanup = (url: string) => {
    const response = NextResponse.redirect(url);
    response.cookies.delete("gr_oauth_origin");
    return response;
  };

  if (!code && authError) {
    return redirectWithCleanup(
      `${origin}/auth/login?error=${encodeURIComponent(authError)}`
    );
  }

  if (code) {
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
      const admin = createSupabaseAdminClient();
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
          // ── IP Rate Limit: max 2 new signups per IP per day ────────
          const clientIp =
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            request.headers.get("x-real-ip") ??
            "unknown";
          const allowed = signupRateLimit(clientIp);
          if (!allowed) {
            console.warn(
              `[auth/callback] signup rate-limited for IP ${clientIp}`
            );
            return redirectWithCleanup(
              `${origin}/auth/login?error=${encodeURIComponent(
                "დღეში მაქსიმუმ 2 ახალი ანგარიშის რეგისტრაცია შესაძლებელია ერთი IP მისამართიდან. სცადე ხვალ."
              )}`
            );
          }
          // ────────────────────────────────────────────────────────────

          await admin.from("profiles").insert({
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
          await admin.from("profiles").update({
            avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
            email: user.email ?? null,
            updated_at: new Date().toISOString(),
          }).eq("id", user.id);
        }
      } catch (e) {
        console.error("[auth/callback] profile upsert:", e);
      }

      return redirectWithCleanup(hasProfile ? redirectTo : `${origin}/settings`);
    }

    console.error("[auth/callback] exchangeCodeForSession error:", error);
    return redirectWithCleanup(
      `${origin}/auth/login?error=${encodeURIComponent(error.message)}`
    );
  }

  return redirectWithCleanup(`${origin}/auth/login?error=no_code`);
}
