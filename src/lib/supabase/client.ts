import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/^﻿/, "").trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").replace(/^﻿/, "").trim();
  return createBrowserClient(url, key);
}
