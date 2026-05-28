import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_DIRECT_URL);

async function run() {
  try {
    const follows = await sql`SELECT count(*) FROM follows`;
    const favs = await sql`SELECT id, username, favorite_game_slugs FROM profiles`;
    console.log('Follows count:', follows[0].count);
    console.log('Favorite games:', JSON.stringify(favs, null, 2));
  } catch (err) {
    console.error('DB Error:', err.message);
  } finally {
    await sql.end();
  }
}
run();
