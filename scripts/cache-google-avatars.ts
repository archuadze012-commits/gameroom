import { createClient } from "@supabase/supabase-js";
import { cacheGoogleAvatar } from "../src/lib/avatar-storage";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, avatar_url")
    .like("avatar_url", "https://lh3.googleusercontent.com/%");

  if (error) throw error;

  let migrated = 0;
  let unavailable = 0;

  for (const profile of profiles ?? []) {
    const cachedUrl = await cacheGoogleAvatar(supabase, profile.id, profile.avatar_url);
    if (!cachedUrl) {
      unavailable += 1;
      continue;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: cachedUrl, updated_at: new Date().toISOString() })
      .eq("id", profile.id);
    if (updateError) throw updateError;
    migrated += 1;
  }

  console.log(JSON.stringify({ scanned: profiles?.length ?? 0, migrated, unavailable }));
}

void main();
