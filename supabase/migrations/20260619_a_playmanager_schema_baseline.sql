-- PlayManager schema baseline: capture objects that exist in the live DB but had
-- no CREATE in the migration history, so a clean `supabase db reset` / fresh CI
-- reproduces the full schema. These 8 tables and 6 functions (found by diffing
-- every live pm_ object against the migration history) were created out of band
-- (SQL editor / uncommitted scripts) and drifted from the migrations.
--
-- Generated from the live DB (pg introspection); fully idempotent — create table
-- if not exists / guarded constraints / create or replace function — so it is a
-- no-op on the existing production DB and only does real work on a clean reset.
--
-- Dated 20260619_a so it runs BEFORE 20260619_performance_followup (which adds
-- indexes on the cup tables) and the base-stats migration (which reads pm_staff in
-- a function body). Its only table dependency is pm_teams (created in 20260613);
-- the four functions are plpgsql, so their helper deps resolve at call time and
-- need not exist when the function is created.

create table if not exists public.pm_cup_templates (
  id text not null,
  name text not null,
  entry_fee bigint default 0 not null,
  prize_pool bigint not null,
  max_teams integer default 8 not null,
  schedule_type text not null
);
create table if not exists public.pm_cup_instances (
  id uuid default gen_random_uuid() not null,
  template_id text,
  status text default 'registration'::text not null,
  created_at timestamp with time zone default now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone
);
create table if not exists public.pm_cup_participants (
  cup_instance_id uuid not null,
  team_id uuid not null,
  registered_at timestamp with time zone default now()
);
create table if not exists public.pm_cup_matches (
  id uuid default gen_random_uuid() not null,
  cup_instance_id uuid,
  round integer not null,
  position integer not null,
  team1_id uuid,
  team2_id uuid,
  winner_id uuid,
  score1 integer,
  score2 integer,
  status text default 'pending'::text not null,
  start_time timestamp with time zone,
  claimed_at timestamp with time zone
);
create table if not exists public.pm_staff (
  team_id uuid not null,
  role_key text not null,
  level smallint default 1 not null,
  hired_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create table if not exists public.pm_engagement (
  team_id uuid not null,
  streak smallint default 0 not null,
  last_claim_day integer default '-1'::integer not null,
  updated_at timestamp with time zone default now() not null
);
create table if not exists public.pm_free_agent_cycles (
  team_id uuid not null,
  scout_level smallint default 1 not null,
  offer_player_ids uuid[] default '{}'::uuid[] not null,
  generated_at timestamp with time zone default now() not null,
  refresh_at timestamp with time zone default (now() + '24:00:00'::interval) not null,
  updated_at timestamp with time zone default now() not null
);

do $$ begin if not exists (select 1 from pg_constraint where conname='pm_cup_templates_schedule_type_check' and conrelid='public.pm_cup_templates'::regclass) then alter table public.pm_cup_templates add constraint pm_cup_templates_schedule_type_check CHECK ((schedule_type = ANY (ARRAY['auto_fill'::text, 'daily_scheduled'::text]))); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='pm_cup_templates_pkey' and conrelid='public.pm_cup_templates'::regclass) then alter table public.pm_cup_templates add constraint pm_cup_templates_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='pm_cup_instances_status_check' and conrelid='public.pm_cup_instances'::regclass) then alter table public.pm_cup_instances add constraint pm_cup_instances_status_check CHECK ((status = ANY (ARRAY['registration'::text, 'in_progress'::text, 'completed'::text]))); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='pm_cup_instances_template_id_fkey' and conrelid='public.pm_cup_instances'::regclass) then alter table public.pm_cup_instances add constraint pm_cup_instances_template_id_fkey FOREIGN KEY (template_id) REFERENCES pm_cup_templates(id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='pm_cup_instances_pkey' and conrelid='public.pm_cup_instances'::regclass) then alter table public.pm_cup_instances add constraint pm_cup_instances_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='pm_cup_participants_cup_instance_id_fkey' and conrelid='public.pm_cup_participants'::regclass) then alter table public.pm_cup_participants add constraint pm_cup_participants_cup_instance_id_fkey FOREIGN KEY (cup_instance_id) REFERENCES pm_cup_instances(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='pm_cup_participants_team_id_fkey' and conrelid='public.pm_cup_participants'::regclass) then alter table public.pm_cup_participants add constraint pm_cup_participants_team_id_fkey FOREIGN KEY (team_id) REFERENCES pm_teams(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='pm_cup_participants_pkey' and conrelid='public.pm_cup_participants'::regclass) then alter table public.pm_cup_participants add constraint pm_cup_participants_pkey PRIMARY KEY (cup_instance_id, team_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='pm_cup_matches_status_check' and conrelid='public.pm_cup_matches'::regclass) then alter table public.pm_cup_matches add constraint pm_cup_matches_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'ready'::text, 'processing'::text, 'completed'::text]))); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='pm_cup_matches_cup_instance_id_fkey' and conrelid='public.pm_cup_matches'::regclass) then alter table public.pm_cup_matches add constraint pm_cup_matches_cup_instance_id_fkey FOREIGN KEY (cup_instance_id) REFERENCES pm_cup_instances(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='pm_cup_matches_team1_id_fkey' and conrelid='public.pm_cup_matches'::regclass) then alter table public.pm_cup_matches add constraint pm_cup_matches_team1_id_fkey FOREIGN KEY (team1_id) REFERENCES pm_teams(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='pm_cup_matches_team2_id_fkey' and conrelid='public.pm_cup_matches'::regclass) then alter table public.pm_cup_matches add constraint pm_cup_matches_team2_id_fkey FOREIGN KEY (team2_id) REFERENCES pm_teams(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='pm_cup_matches_winner_id_fkey' and conrelid='public.pm_cup_matches'::regclass) then alter table public.pm_cup_matches add constraint pm_cup_matches_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES pm_teams(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='pm_cup_matches_pkey' and conrelid='public.pm_cup_matches'::regclass) then alter table public.pm_cup_matches add constraint pm_cup_matches_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='pm_cup_matches_cup_instance_id_round_position_key' and conrelid='public.pm_cup_matches'::regclass) then alter table public.pm_cup_matches add constraint pm_cup_matches_cup_instance_id_round_position_key UNIQUE (cup_instance_id, round, "position"); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='pm_staff_level_check' and conrelid='public.pm_staff'::regclass) then alter table public.pm_staff add constraint pm_staff_level_check CHECK (((level >= 1) AND (level <= 5))); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='pm_staff_team_id_fkey' and conrelid='public.pm_staff'::regclass) then alter table public.pm_staff add constraint pm_staff_team_id_fkey FOREIGN KEY (team_id) REFERENCES pm_teams(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='pm_staff_pkey' and conrelid='public.pm_staff'::regclass) then alter table public.pm_staff add constraint pm_staff_pkey PRIMARY KEY (team_id, role_key); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='pm_engagement_team_id_fkey' and conrelid='public.pm_engagement'::regclass) then alter table public.pm_engagement add constraint pm_engagement_team_id_fkey FOREIGN KEY (team_id) REFERENCES pm_teams(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='pm_engagement_pkey' and conrelid='public.pm_engagement'::regclass) then alter table public.pm_engagement add constraint pm_engagement_pkey PRIMARY KEY (team_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='pm_free_agent_cycles_scout_level_check' and conrelid='public.pm_free_agent_cycles'::regclass) then alter table public.pm_free_agent_cycles add constraint pm_free_agent_cycles_scout_level_check CHECK (((scout_level >= 1) AND (scout_level <= 5))); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='pm_free_agent_cycles_team_id_fkey' and conrelid='public.pm_free_agent_cycles'::regclass) then alter table public.pm_free_agent_cycles add constraint pm_free_agent_cycles_team_id_fkey FOREIGN KEY (team_id) REFERENCES pm_teams(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='pm_free_agent_cycles_pkey' and conrelid='public.pm_free_agent_cycles'::regclass) then alter table public.pm_free_agent_cycles add constraint pm_free_agent_cycles_pkey PRIMARY KEY (team_id); end if; end $$;

create unique index if not exists pm_cup_templates_pkey ON public.pm_cup_templates USING btree (id);
create unique index if not exists pm_cup_instances_pkey ON public.pm_cup_instances USING btree (id);
create index if not exists pm_cup_instances_template_id_idx ON public.pm_cup_instances USING btree (template_id);
create unique index if not exists pm_cup_participants_pkey ON public.pm_cup_participants USING btree (cup_instance_id, team_id);
create index if not exists pm_cup_participants_team_id_idx ON public.pm_cup_participants USING btree (team_id);
create unique index if not exists pm_cup_matches_pkey ON public.pm_cup_matches USING btree (id);
create unique index if not exists pm_cup_matches_cup_instance_id_round_position_key ON public.pm_cup_matches USING btree (cup_instance_id, round, "position");
create index if not exists pm_cup_matches_team1_id_idx ON public.pm_cup_matches USING btree (team1_id);
create index if not exists pm_cup_matches_team2_id_idx ON public.pm_cup_matches USING btree (team2_id);
create index if not exists pm_cup_matches_winner_id_idx ON public.pm_cup_matches USING btree (winner_id);
create unique index if not exists pm_staff_pkey ON public.pm_staff USING btree (team_id, role_key);
create index if not exists pm_staff_team_idx ON public.pm_staff USING btree (team_id);
create unique index if not exists pm_engagement_pkey ON public.pm_engagement USING btree (team_id);
create unique index if not exists pm_free_agent_cycles_pkey ON public.pm_free_agent_cycles USING btree (team_id);

alter table public.pm_cup_templates enable row level security;
drop policy if exists pm_cup_templates_select on public.pm_cup_templates;
create policy pm_cup_templates_select on public.pm_cup_templates for select to authenticated using (true);
alter table public.pm_cup_instances enable row level security;
drop policy if exists pm_cup_instances_select on public.pm_cup_instances;
create policy pm_cup_instances_select on public.pm_cup_instances for select to authenticated using (true);
alter table public.pm_cup_participants enable row level security;
drop policy if exists pm_cup_participants_select on public.pm_cup_participants;
create policy pm_cup_participants_select on public.pm_cup_participants for select to authenticated using (true);
alter table public.pm_cup_matches enable row level security;
drop policy if exists pm_cup_matches_select on public.pm_cup_matches;
create policy pm_cup_matches_select on public.pm_cup_matches for select to authenticated using (true);
alter table public.pm_staff enable row level security;
drop policy if exists pm_staff_owner_select on public.pm_staff;
create policy pm_staff_owner_select on public.pm_staff for select to authenticated using ((EXISTS ( SELECT 1
   FROM pm_teams t
  WHERE ((t.id = pm_staff.team_id) AND (t.user_id = ( SELECT auth.uid() AS uid))))));
alter table public.pm_engagement enable row level security;
drop policy if exists pm_engagement_owner_select on public.pm_engagement;
create policy pm_engagement_owner_select on public.pm_engagement for select to public using ((team_id IN ( SELECT pm_teams.id
   FROM pm_teams
  WHERE (pm_teams.user_id = auth.uid()))));
alter table public.pm_free_agent_cycles enable row level security;
drop policy if exists pm_free_agent_cycles_no_client_access on public.pm_free_agent_cycles;
create policy pm_free_agent_cycles_no_client_access on public.pm_free_agent_cycles for all to public using (false) with check (false);

CREATE OR REPLACE FUNCTION public.pm_join_cup(p_team_id uuid, p_cup_instance_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_instance record;
  v_template record;
  v_participant_count int;
  v_wallet record;
begin
  -- 1. Get cup instance
  select * into v_instance from pm_cup_instances where id = p_cup_instance_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'cup_not_found');
  end if;

  if v_instance.status != 'registration' then
    return jsonb_build_object('success', false, 'error', 'registration_closed');
  end if;

  -- 2. Get cup template
  select * into v_template from pm_cup_templates where id = v_instance.template_id;

  -- 3. Check if already registered
  if exists (select 1 from pm_cup_participants where cup_instance_id = p_cup_instance_id and team_id = p_team_id) then
    return jsonb_build_object('success', false, 'error', 'already_registered');
  end if;

  -- 4. Check max teams
  select count(*) into v_participant_count from pm_cup_participants where cup_instance_id = p_cup_instance_id;
  if v_participant_count >= v_template.max_teams then
    return jsonb_build_object('success', false, 'error', 'cup_full');
  end if;

  -- 5. Pay entry fee
  if v_template.entry_fee > 0 then
    select * into v_wallet from pm_wallets where team_id = p_team_id;
    if not found or v_wallet.balance < v_template.entry_fee then
      return jsonb_build_object('success', false, 'error', 'insufficient_funds');
    end if;

    update pm_wallets set balance = balance - v_template.entry_fee where team_id = p_team_id;
    insert into pm_transactions (team_id, amount, reason)
    values (p_team_id, -v_template.entry_fee, 'Entry fee for ' || v_template.name);
  end if;

  -- 6. Register team
  insert into pm_cup_participants (cup_instance_id, team_id) values (p_cup_instance_id, p_team_id);
  v_participant_count := v_participant_count + 1;

  -- 7. Check if it should start automatically
  if v_participant_count = v_template.max_teams and v_template.schedule_type = 'auto_fill' then
    -- Start cup
    update pm_cup_instances 
    set status = 'in_progress', started_at = now() 
    where id = p_cup_instance_id;
    
    -- Spawn new instance so others can register
    insert into pm_cup_instances (template_id, status) values (v_template.id, 'registration');

    return jsonb_build_object('success', true, 'cup_started', true);
  end if;

  return jsonb_build_object('success', true, 'cup_started', false);
end;
$function$;
grant execute on function public.pm_join_cup to service_role;
CREATE OR REPLACE FUNCTION public.pm_upgrade_staff(p_team_id uuid, p_role_key text)
 RETURNS TABLE(role_key text, level smallint)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_staff public.pm_staff%rowtype;
  v_division integer;
  v_max_level smallint;
  v_cost integer;
begin
  select *
  into v_staff
  from public.pm_staff
  where team_id = p_team_id
    and role_key = p_role_key
  for update;

  if not found then
    raise exception 'staff_not_found';
  end if;

  select division_id
  into v_division
  from public.pm_teams
  where id = p_team_id;

  v_max_level := public.pm_staff_max_level_for_division(v_division);

  if v_staff.level >= v_max_level then
    raise exception 'division_level_lock';
  end if;

  if v_staff.level >= 5 then
    raise exception 'staff_max_level';
  end if;

  v_cost := public.pm_staff_upgrade_cost(p_role_key, v_staff.level);
  perform public.pm_debit(p_team_id, v_cost, 'staff_upgrade:' || p_role_key || ':lvl' || (v_staff.level + 1));

  update public.pm_staff
  set
    level = v_staff.level + 1,
    updated_at = timezone('utc', now())
  where team_id = p_team_id
    and role_key = p_role_key;

  return query
  select s.role_key, s.level
  from public.pm_staff s
  where s.team_id = p_team_id and s.role_key = p_role_key;
end;
$function$;
grant execute on function public.pm_upgrade_staff to service_role;
CREATE OR REPLACE FUNCTION public.pm_claim_daily_reward(p_team_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_day integer;
  v_row public.pm_engagement%rowtype;
  v_new_streak smallint;
  v_reward bigint;
begin
  perform public.pm_ensure_calendar(p_team_id);
  select total_days into v_day from public.pm_calendar where team_id = p_team_id;
  v_day := coalesce(v_day, 0);

  insert into public.pm_engagement (team_id) values (p_team_id)
  on conflict (team_id) do nothing;

  select * into v_row from public.pm_engagement where team_id = p_team_id for update;

  if v_row.last_claim_day = v_day then
    raise exception 'already_claimed';
  end if;

  v_new_streak := case when v_row.last_claim_day = v_day - 1 then least(7, v_row.streak + 1) else 1 end;
  v_reward := 15000 + v_new_streak * 7000;  -- streak 1 → 22k … 7 → 64k

  perform public.pm_credit(p_team_id, v_reward, 'daily_reward');

  update public.pm_engagement
  set streak = v_new_streak, last_claim_day = v_day, updated_at = now()
  where team_id = p_team_id;

  return jsonb_build_object('streak', v_new_streak, 'reward', v_reward, 'day', v_day);
end;
$function$;
grant execute on function public.pm_claim_daily_reward to service_role;
CREATE OR REPLACE FUNCTION public.pm_develop_academy_prospects(p_team_id uuid, p_days integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_academy_level smallint := 1;
  v_days integer := greatest(1, coalesce(p_days, 1));
  v_grown integer := 0;
  v_maxed integer := 0;
begin
  select coalesce(level, 1) into v_academy_level
  from public.pm_facilities
  where team_id = p_team_id and sprite_key = 'academy';
  v_academy_level := coalesce(v_academy_level, 1);

  -- Each active, below-potential prospect has a per-advance chance to gain +1
  -- (or +2 for the most talented at a strong academy) OVR. Higher academy level
  -- and higher talent ⇒ faster maturation.
  update public.pm_academy_prospects p
  set ovr_base = least(
        p.potential_ovr,
        p.ovr_base + case
          when p.talent >= 8 and v_academy_level >= 3 and random() < 0.35 then 2
          else 1
        end
      )
  where p.team_id = p_team_id
    and p.status = 'active'
    and p.ovr_base < p.potential_ovr
    and random() < least(0.9,
      (v_days::numeric / 10.0) * (0.5 + v_academy_level * 0.2 + p.talent * 0.06)
    );
  get diagnostics v_grown = row_count;

  select count(*) into v_maxed
  from public.pm_academy_prospects
  where team_id = p_team_id and status = 'active' and ovr_base >= potential_ovr;

  return jsonb_build_object(
    'academyLevel', v_academy_level,
    'developed', v_grown,
    'readyToPromote', v_maxed
  );
end;
$function$;
grant execute on function public.pm_develop_academy_prospects to service_role;

-- ── Additional drifted objects (comprehensive check) ──
create table if not exists public.pm_player_real_age_stage (
  normalized_name text not null,
  real_age smallint not null
);
do $$ begin if not exists (select 1 from pg_constraint where conname='pm_player_real_age_stage_pkey' and conrelid='public.pm_player_real_age_stage'::regclass) then alter table public.pm_player_real_age_stage add constraint pm_player_real_age_stage_pkey PRIMARY KEY (normalized_name); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='pm_player_real_age_stage_real_age_check' and conrelid='public.pm_player_real_age_stage'::regclass) then alter table public.pm_player_real_age_stage add constraint pm_player_real_age_stage_real_age_check CHECK (((real_age >= 15) AND (real_age <= 60))); end if; end $$;
create UNIQUE index if not exists pm_player_real_age_stage_pkey ON public.pm_player_real_age_stage USING btree (normalized_name);
CREATE OR REPLACE FUNCTION public.pm_staff_max_level_for_division(p_division_id integer)
 RETURNS smallint
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select greatest(1, least(5, 6 - greatest(1, least(5, coalesce(p_division_id, 5)))))::smallint;
$function$;
grant execute on function public.pm_staff_max_level_for_division to authenticated, service_role;
CREATE OR REPLACE FUNCTION public.pm_staff_upgrade_cost(p_role_key text, p_current_level smallint)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select round(public.pm_staff_hire_cost(p_role_key) * power(1.72::numeric, greatest(1, p_current_level)::numeric - 1))::integer;
$function$;
grant execute on function public.pm_staff_upgrade_cost to authenticated, service_role;
