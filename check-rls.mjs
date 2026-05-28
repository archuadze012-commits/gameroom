import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_DIRECT_URL, { max: 1 });
async function run() {
  try {
    const p = await sql`SELECT policyname, permissive, roles, cmd, qual FROM pg_policies WHERE tablename = 'lfg_posts'`;
    console.log('LFG Posts Policies:', p);
    const p2 = await sql`SELECT policyname, permissive, roles, cmd, qual FROM pg_policies WHERE tablename = 'profiles'`;
    console.log('Profiles Policies:', p2);
  } catch(e) {
    console.error(e)
  } finally {
    sql.end()
  }
}
run();
