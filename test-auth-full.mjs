import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const email = `test${Date.now()}@example.com`;
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: 'password123'
  });
  
  if (authError) {
    console.error("SignUp Error:", authError);
    return;
  }
  console.log("Logged in as:", authData.user?.id);
  
  const { data: posts, error: postsError } = await supabase
    .from("lfg_posts")
    .select("id, game_slug, title, description, rank, region, slots_total, voice_required, created_at, profiles!lfg_posts_author_id_fkey(username, display_name, avatar_url)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(2);
    
  console.log("Auth Fetch Posts:", JSON.stringify(posts, null, 2));
  console.log("Auth Fetch Error:", postsError);
}
run();
