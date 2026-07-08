import { cache } from "react";
import { createSupabaseServerClient } from "./supabase/server";

function isMissingRefreshTokenError(error: unknown) {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "refresh_token_not_found"
  );
}

export const getSession = cache(async () => {
  try {
    const supabase = await createSupabaseServerClient();
    // getClaims() verifies the JWT locally via the project's cached JWKS
    // (this project uses asymmetric ES256 signing keys) — no per-request
    // round trip to Supabase, unlike getUser(). If a token ever surfaces
    // signed with the legacy symmetric secret, the SDK transparently falls
    // back to a getUser()-equivalent network check, so this is not a security
    // downgrade either way — see @supabase/auth-js GoTrueClient.getClaims(),
    // and src/lib/supabase/middleware.ts which already relies on this.
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data) return null;
    const { claims } = data;
    return {
      id: claims.sub,
      email: claims.email,
      phone: claims.phone,
      is_anonymous: claims.is_anonymous,
      user_metadata: claims.user_metadata,
      app_metadata: claims.app_metadata,
    };
  } catch (error) {
    if (isMissingRefreshTokenError(error)) {
      return null;
    }
    throw error;
  }
});

export type SessionUser = Awaited<ReturnType<typeof getSession>>;

// Bootstrap allowlist so the owner can never be locked out. Primary source of
// truth is profiles.role. Env override allows promoting extra emails per env.
const ADMIN_EMAILS = [
  "archuadze012@gmail.com",
  ...(process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean),
];

// Compute admin status from an already-fetched profile row, so pages that
// select the profile anyway (feed, home) don't pay getIsAdmin()'s extra
// round trip to the same table.
export function isAdminFromProfile(
  profile: { role?: string | null; banned?: boolean | null } | null,
  email?: string | null
) {
  // A banned user is never an admin, regardless of role/email.
  if (profile?.banned) return false;
  if (profile?.role === "admin") return true;

  // Fallback for the bootstrap owner.
  return !!email && ADMIN_EMAILS.includes(email);
}

export const getIsAdmin = cache(async () => {
  const user = await getSession();
  if (!user) return false;

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, banned")
    .eq("id", user.id)
    .maybeSingle();

  return isAdminFromProfile(profile, user.email);
});
