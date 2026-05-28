import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // wait we don't have this
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Let's just create a new user to test authenticated fetch!
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
    .select("id, title")
    .limit(2);
    
  console.log("Auth Fetch Posts:", posts);
  console.log("Auth Fetch Error:", postsError);
}
run();
