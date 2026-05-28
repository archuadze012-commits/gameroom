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
  
  const { data: posts1 } = await supabase
    .from("lfg_posts")
    .select("id, title")
    .limit(2);
  console.log("No join:", posts1);
  
  const { data: posts2, error } = await supabase
    .from("lfg_posts")
    .select("id, title, profiles!lfg_posts_author_id_fkey(username)")
    .limit(2);
  console.log("With join:", posts2, error);
}
run();
