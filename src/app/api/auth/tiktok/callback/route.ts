import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { cookies } from "next/headers";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:tiktok-callback");

export async function GET(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.redirect(new URL("/auth/login", request.url));

  const clientKey = getServerEnv("TIKTOK_CLIENT_KEY");
  const clientSecret = getServerEnv("TIKTOK_CLIENT_SECRET");
  if (!clientKey || !clientSecret) {
    logger.error("TikTok client key or secret not configured");
    return NextResponse.redirect(new URL("/settings?tiktok=error&reason=config", request.url));
  }

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");

  // Validate CSRF state
  const cookieStore = await cookies();
  const savedState = cookieStore.get("tiktok_oauth_state")?.value;
  cookieStore.delete("tiktok_oauth_state");

  if (!code || !state || state !== savedState) {
    logger.warn("CSRF state validation failed or code missing", { code: !!code, state, savedState });
    return NextResponse.redirect(new URL("/settings?tiktok=error&reason=csrf", request.url));
  }

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/auth/tiktok/callback`;

  try {
    // Exchange Auth Code for Access Token
    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      logger.error("failed to exchange TikTok authorization code", { status: tokenRes.status, errorText });
      return NextResponse.redirect(new URL("/settings?tiktok=error&reason=token_exchange", request.url));
    }

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      logger.error("TikTok OAuth error response", { error: tokenData.error, desc: tokenData.error_description });
      return NextResponse.redirect(new URL("/settings?tiktok=error&reason=oauth_error", request.url));
    }

    // Fetch User Info
    const userInfoRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
      },
    });

    let tiktokProfile: Record<string, unknown> = {
      openId: tokenData.open_id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + (tokenData.expires_in ?? 0) * 1000,
    };

    let displayName = "TikTok User";

    if (userInfoRes.ok) {
      const userInfoData = await userInfoRes.json();
      const tiktokUser = userInfoData.data?.user;
      if (tiktokUser) {
        tiktokProfile = {
          ...tiktokProfile,
          openId: tiktokUser.open_id ?? tokenData.open_id,
          unionId: tiktokUser.union_id,
          displayName: tiktokUser.display_name,
          username: tiktokUser.username,
          avatarUrl: tiktokUser.avatar_url,
        };
        displayName = tiktokUser.display_name ?? tiktokUser.username ?? displayName;
      }
    } else {
      const errTxt = await userInfoRes.text();
      logger.warn("failed to fetch TikTok profile details, fallback to credentials only", { status: userInfoRes.status, errTxt });
    }

    // Save to DB in linked_accounts
    const supabase = await createSupabaseServerClient();
    const { error: upsertError } = await supabase
      .from("linked_accounts")
      .upsert(
        {
          user_id: user.id,
          provider: "tiktok",
          external_id: (tiktokProfile.openId as string) ?? tokenData.open_id,
          external_name: displayName.slice(0, 256),
          metadata: tiktokProfile as never,
        },
        { onConflict: "user_id,provider" }
      );

    if (upsertError) {
      logger.error("failed to save linked TikTok account to DB", { error: upsertError.message });
      return NextResponse.redirect(new URL("/settings?tiktok=error&reason=db", request.url));
    }

    return NextResponse.redirect(new URL("/settings?tiktok=ok", request.url));
  } catch (e) {
    logger.error("uncaught error during TikTok OAuth callback processing", { error: e });
    return NextResponse.redirect(new URL("/settings?tiktok=error", request.url));
  }
}
