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

// Emails that have admin access. Replace with a real DB role check when DB is live.
const ADMIN_EMAILS = ["archuadze012@gmail.com"];

export const getIsAdmin = cache(async () => {
  const user = await getSession();
  if (!user?.email) return false;
  return ADMIN_EMAILS.includes(user.email);
});
