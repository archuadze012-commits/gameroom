import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_DIRECT_URL, { max: 1 });

async function run() {
  try {
    await sql`DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles`;
    await sql`
      CREATE POLICY "profiles_admin_update" ON public.profiles FOR UPDATE TO authenticated 
      USING (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'::public.user_role));
    `;
    await sql`
      CREATE POLICY "profiles_admin_delete" ON public.profiles FOR DELETE TO authenticated 
      USING (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'::public.user_role));
    `;
    console.log("Fixed policies!");
  } catch(e) {
    console.error(e)
  } finally {
    sql.end()
  }
}
run();
