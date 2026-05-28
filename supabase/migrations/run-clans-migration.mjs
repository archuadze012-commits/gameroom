import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_DIRECT_URL, { max: 1 });

async function run() {
  try {
    console.log("Applying Migration: Phase 3 - Clans System...");
    await sql`
      -- Create Enums
      DO $$ BEGIN
        CREATE TYPE clan_role AS ENUM ('leader', 'officer', 'member');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE clan_status AS ENUM ('open', 'invite_only', 'closed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE clan_request_status AS ENUM ('pending', 'accepted', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      -- Create Clans Table
      CREATE TABLE IF NOT EXISTS public.clans (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(100) NOT NULL UNIQUE,
        slug varchar(120) NOT NULL UNIQUE,
        tag varchar(10) NOT NULL UNIQUE,
        description text,
        avatar_url text,
        banner_url text,
        status clan_status NOT NULL DEFAULT 'open',
        xp integer NOT NULL DEFAULT 0,
        level integer NOT NULL DEFAULT 1,
        created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      -- Create Clan Members Table
      CREATE TABLE IF NOT EXISTS public.clan_members (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        clan_id uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        role clan_role NOT NULL DEFAULT 'member',
        joined_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(clan_id, user_id)
      );

      -- Create Clan Join Requests Table
      CREATE TABLE IF NOT EXISTS public.clan_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        clan_id uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        message text,
        status clan_request_status NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(clan_id, user_id)
      );

      -- Enable RLS
      ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.clan_members ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.clan_requests ENABLE ROW LEVEL SECURITY;

      -- Policies for Clans
      DROP POLICY IF EXISTS "clans_read_all" ON public.clans;
      CREATE POLICY "clans_read_all" ON public.clans FOR SELECT USING (true);

      DROP POLICY IF EXISTS "clans_insert_auth" ON public.clans;
      CREATE POLICY "clans_insert_auth" ON public.clans FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

      DROP POLICY IF EXISTS "clans_update_leader" ON public.clans;
      CREATE POLICY "clans_update_leader" ON public.clans FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.clan_members WHERE clan_id = id AND user_id = auth.uid() AND role IN ('leader', 'officer'))
      );

      DROP POLICY IF EXISTS "clans_delete_leader" ON public.clans;
      CREATE POLICY "clans_delete_leader" ON public.clans FOR DELETE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.clan_members WHERE clan_id = id AND user_id = auth.uid() AND role = 'leader')
      );

      -- Policies for Clan Members
      DROP POLICY IF EXISTS "clan_members_read_all" ON public.clan_members;
      CREATE POLICY "clan_members_read_all" ON public.clan_members FOR SELECT USING (true);

      DROP POLICY IF EXISTS "clan_members_insert" ON public.clan_members;
      -- We will likely use a security definer function to handle joining, but we can allow leaders to add directly
      CREATE POLICY "clan_members_insert" ON public.clan_members FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM public.clan_members cm WHERE cm.clan_id = clan_id AND cm.user_id = auth.uid() AND cm.role IN ('leader', 'officer'))
      );

      DROP POLICY IF EXISTS "clan_members_update" ON public.clan_members;
      CREATE POLICY "clan_members_update" ON public.clan_members FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.clan_members cm WHERE cm.clan_id = clan_id AND cm.user_id = auth.uid() AND cm.role = 'leader')
      );

      DROP POLICY IF EXISTS "clan_members_delete" ON public.clan_members;
      CREATE POLICY "clan_members_delete" ON public.clan_members FOR DELETE TO authenticated USING (
        user_id = auth.uid() OR -- can leave
        EXISTS (SELECT 1 FROM public.clan_members cm WHERE cm.clan_id = clan_id AND cm.user_id = auth.uid() AND cm.role IN ('leader', 'officer')) -- leader/officer can kick
      );

      -- Policies for Clan Requests
      DROP POLICY IF EXISTS "clan_requests_read" ON public.clan_requests;
      CREATE POLICY "clan_requests_read" ON public.clan_requests FOR SELECT TO authenticated USING (
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.clan_members cm WHERE cm.clan_id = clan_id AND cm.user_id = auth.uid() AND cm.role IN ('leader', 'officer'))
      );

      DROP POLICY IF EXISTS "clan_requests_insert" ON public.clan_requests;
      CREATE POLICY "clan_requests_insert" ON public.clan_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

      DROP POLICY IF EXISTS "clan_requests_delete" ON public.clan_requests;
      CREATE POLICY "clan_requests_delete" ON public.clan_requests FOR DELETE TO authenticated USING (user_id = auth.uid());

    `;
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await sql.end();
  }
}
run();
