import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_DIRECT_URL, { max: 1 });
sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'games'`.then(console.log).finally(()=>sql.end());
