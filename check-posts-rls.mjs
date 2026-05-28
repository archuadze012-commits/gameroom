import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_DIRECT_URL);

async function run() {
  try {
    const res = await sql`SELECT tablename, policyname, roles, cmd, qual FROM pg_policies WHERE tablename = 'posts'`;
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('DB Error:', err.message);
  } finally {
    await sql.end();
  }
}
run();
