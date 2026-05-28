import fs from 'fs';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_DIRECT_URL, { max: 1 });

async function run() {
  try {
    const migration = fs.readFileSync('supabase/migrations/20260526_phase1_milestone1_infrastructure.sql', 'utf8');
    await sql.unsafe(migration);
    console.log("Migration executed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await sql.end();
  }
}

run();
