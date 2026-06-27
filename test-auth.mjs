import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // wait we don't have this
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const email = "archuadze012@gmail.com";
  
  console.log("Checking profile for email:", email);
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, email")
    .eq("email", email)
    .maybeSingle();

  if (profileError) {
    console.error("Profile Query Error:", profileError);
  } else {
    console.log("Profile found:", profile);
  }

  console.log("Attempting sign in for:", email);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password: 'password123' // default password placeholder to test auth endpoint reachability
  });
  
  if (authError) {
    console.error("SignIn Error:", authError);
    return;
  }
  console.log("Logged in as user ID:", authData.user?.id);
  
  const { data: posts, error: postsError } = await supabase
    .from("lfg_posts")
    .select("id, title")
    .limit(2);
    
  console.log("Auth Fetch Posts:", posts);
  console.log("Auth Fetch Error:", postsError);
}
run();
