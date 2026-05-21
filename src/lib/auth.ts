import { cache } from "react";
import { createSupabaseServerClient } from "./supabase/server";

export const getSession = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
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

export const getIsAdmin = cache(async () => {
  const user = await getSession();
  if (!user) return false;

  // A banned user is never an admin, regardless of role/email.
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, banned")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.banned) return false;
  if (profile?.role === "admin") return true;

  // Fallback for the bootstrap owner.
  return !!user.email && ADMIN_EMAILS.includes(user.email);
});
