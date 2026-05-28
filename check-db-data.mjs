import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_DIRECT_URL, { max: 1 });

async function run() {
  try {
    const profiles = await sql`SELECT count(*) FROM public.profiles`;
    const users = await sql`SELECT count(*) FROM auth.users`;
    const lfg_posts = await sql`SELECT count(*) FROM public.lfg_posts`;
    const games = await sql`SELECT count(*) FROM public.games`;

    console.log("Profiles:", profiles[0].count);
    console.log("Auth Users:", users[0].count);
    console.log("LFG Posts:", lfg_posts[0].count);
    console.log("Games:", games[0].count);
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}
run();
