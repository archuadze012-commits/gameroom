import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_DIRECT_URL, { max: 1 });
async function run() {
  try {
    const games = await sql`SELECT id, slug, name_ka, active FROM public.games`;
    console.log('Games:', games);
  } catch(e) {
    console.error(e)
  } finally {
    sql.end()
  }
}
run();
