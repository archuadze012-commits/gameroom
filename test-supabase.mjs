import postgres from 'postgres';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Login as one of the users
  const { data: users, error: err1 } = await supabase.auth.signInWithPassword({
    email: 'test@example.com', // wait I don't know a user's email
    password: 'password'
  });
  
  // let's fetch without login first
  console.log("Anon Fetch:");
  const { data: anonData, error: anonError } = await supabase
    .from("lfg_posts")
    .select("id, title")
    .limit(2);
  console.log(anonData, anonError);

}
run();
