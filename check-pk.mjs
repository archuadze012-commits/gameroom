import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_DIRECT_URL, { max: 1 });
sql`
  SELECT a.attname
  FROM   pg_index i
  JOIN   pg_attribute a ON a.attrelid = i.indrelid
                       AND a.attnum = ANY(i.indkey)
  WHERE  i.indrelid = 'games'::regclass
  AND    i.indisprimary;
`.then(console.log).finally(()=>sql.end());
