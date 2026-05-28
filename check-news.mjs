import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_DIRECT_URL, { max: 1 });

async function run() {
  try {
    const news = await sql`SELECT count(*), status FROM public.news_articles GROUP BY status`;
    const tournaments = await sql`SELECT count(*), status FROM public.tournaments GROUP BY status`;
    console.log("News Articles:", news);
    console.log("Tournaments:", tournaments);
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}
run();
