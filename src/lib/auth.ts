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

// Emails that always get admin access (bootstrap). Other admins can be promoted in DB via role column.
const ADMIN_EMAILS = ["archuadze012@gmail.com"];

export const getIsAdmin = cache(async () => {
  const user = await getSession();
  if (!user) return false;
  if (user.email && ADMIN_EMAILS.includes(user.email)) return true;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return data?.role === "admin";
});
