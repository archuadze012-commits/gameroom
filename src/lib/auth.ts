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
