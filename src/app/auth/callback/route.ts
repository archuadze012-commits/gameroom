import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCanonicalOrigin, getRequestOriginFromHeaders, getSiteOrigin } from "@/lib/url";
import { signupRateLimit } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import { cacheGoogleAvatar } from "@/lib/avatar-storage";

const logger = createLogger("auth/callback");

function isUploadedAvatarUrl(value: string | null | undefined) {
  try {
    const url = new URL(value ?? "");
    return url.hostname.endsWith(".supabase.co") && url.pathname.includes("/storage/v1/object/public/avatars/");
  } catch {
    return false;
  }
}

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
  const redirectTo = next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? `${origin}${next}` : origin;

  const redirectWithCleanup = (url: string) => {
    const response = NextResponse.redirect(url);
    response.cookies.delete("gr_oauth_origin");
    response.cookies.delete("gr_ref");
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
      const providerAvatarUrl = user.user_metadata?.avatar_url as string | undefined;
      const emailPrefix = (user.email?.split("@")[0] ?? "user")
        .replace(/[^a-zA-Z0-9_]/g, "")
        .slice(0, 26);
      const fallbackUsername = `${emailPrefix}_${user.id.slice(0, 6)}`;

      let hasProfile = !!savedUsername;
      try {
        const { data: existing } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (!existing) {
          // ── IP Rate Limit: max 2 new signups per IP per day ────────
          const clientIp =
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            request.headers.get("x-real-ip") ??
            "unknown";
          const allowed = await signupRateLimit(clientIp);
          if (!allowed) {
            logger.warn("signup rate-limited", { ip: clientIp });
            return redirectWithCleanup(
              `${origin}/auth/login?error=${encodeURIComponent(
                "დღეში მაქსიმუმ 2 ახალი ანგარიშის რეგისტრაცია შესაძლებელია ერთი IP მისამართიდან. სცადე ხვალ."
              )}`
            );
          }
          // ────────────────────────────────────────────────────────────

          const cachedAvatarUrl = await cacheGoogleAvatar(admin, user.id, providerAvatarUrl);
          await admin.from("profiles").insert({
            id: user.id,
            username: savedUsername ?? fallbackUsername,
            display_name:
              (user.user_metadata?.full_name as string | undefined) ??
              (user.user_metadata?.name as string | undefined) ??
              emailPrefix,
            avatar_url: cachedAvatarUrl ?? providerAvatarUrl ?? null,
            email: user.email ?? null,
          });

          // ── Referral attribution ─────────────────────────────────────
          // If this signup arrived via an invite link (/i/CODE set a gr_ref
          // cookie), record a pending referral. The reward is granted later,
          // once the referred user qualifies (see process_referral_qualification).
          const refCode = cookieStore.get("gr_ref")?.value?.trim().toUpperCase();
          if (refCode && refCode.length >= 4) {
            try {
              const { data: referrer } = await admin
                .from("profiles")
                .select("id")
                .eq("referral_code", refCode)
                .maybeSingle();
              if (referrer && referrer.id !== user.id) {
                await admin.from("referrals").insert({
                  referrer_id: referrer.id,
                  referred_id: user.id,
                  code_used: refCode,
                  status: "pending",
                });
              }
            } catch (e) {
              logger.warn("referral attribution failed", { userId: user.id, error: e });
            }
          }
          // ──────────────────────────────────────────────────────────────
        } else {
          hasProfile = true;
          const profileUpdate: {
            email: string | null;
            updated_at: string;
            avatar_url?: string;
          } = {
            email: user.email ?? null,
            updated_at: new Date().toISOString(),
          };

          // Provider-hosted URLs can expire; never replace a user-uploaded avatar on login.
          if (
            !isUploadedAvatarUrl(existing.avatar_url) &&
            typeof providerAvatarUrl === "string" &&
            providerAvatarUrl.trim()
          ) {
            profileUpdate.avatar_url =
              (await cacheGoogleAvatar(admin, user.id, providerAvatarUrl)) ?? providerAvatarUrl;
          }

          await admin.from("profiles").update(profileUpdate).eq("id", user.id);
        }
      } catch (e) {
        logger.error("profile upsert failed", { userId: user.id, error: e });
      }

      return redirectWithCleanup(hasProfile ? redirectTo : `${origin}/settings`);
    }

    logger.error("exchangeCodeForSession failed", { error });
    return redirectWithCleanup(
      `${origin}/auth/login?error=${encodeURIComponent(error.message)}`
    );
  }

  return redirectWithCleanup(`${origin}/auth/login?error=no_code`);
}
