import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Returns null instead of throwing when the admin env vars are absent. Static
// pages (ISR) that read public data through the admin client call this so a
// build environment WITHOUT the service-role key (e.g. a Vercel Preview build,
// where Production-scoped vars aren't injected) can still prerender — they fall
// back to empty/mock data at build and get real data when ISR revalidates at
// runtime, where the key is present. API routes should keep using the throwing
// createSupabaseAdminClient() below.
export function createSupabaseAdminClientOrNull() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createSupabaseAdminClient() {
  const client = createSupabaseAdminClientOrNull();
  if (!client) {
    throw new Error("Missing Supabase admin environment variables");
  }
  return client;
}
