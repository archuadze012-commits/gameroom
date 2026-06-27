import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Singleton: one GoTrueClient per browser context. Creating a fresh client on
// every call spawns multiple GoTrueClients that race to refresh the same token,
// causing "Invalid Refresh Token: Already Used" errors.
let browserClient: SupabaseClient<Database> | undefined;

export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/^﻿/, "").trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").replace(/^﻿/, "").trim();
  browserClient = createBrowserClient<Database>(url, key);
  return browserClient;
}
