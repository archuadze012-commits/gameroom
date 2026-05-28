import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_DIRECT_URL);

async function run() {
  try {
    console.log("Dropping recursive policy...");
    await sql`DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles`;
    console.log("Policy dropped successfully.");
  } catch (err) {
    console.error('DB Error:', err.message);
  } finally {
    await sql.end();
  }
}
run();
