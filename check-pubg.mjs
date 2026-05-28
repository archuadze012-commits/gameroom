import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_DIRECT_URL, { max: 1 });
async function run() {
  try {
    const posts = await sql`SELECT id, title, game_slug, created_at FROM public.lfg_posts`;
    console.log('Posts:', posts.map(p => ({ title: p.title, game_slug: p.game_slug, date: p.created_at })));
  } catch(e) {
    console.error(e)
  } finally {
    sql.end()
  }
}
run();
