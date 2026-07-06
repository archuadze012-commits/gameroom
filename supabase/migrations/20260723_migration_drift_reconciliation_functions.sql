-- Migration-drift reconciliation, part 2: function bodies, SECURITY DEFINER
-- flags, and EXECUTE grants.
--
-- A full live-vs-migration-replay diff found that 81 functions in the public
-- schema had a live definition (body text, SECURITY DEFINER flag, and/or the
-- set of client roles able to EXECUTE them) that diverged from what a
-- from-scratch replay of supabase/migrations/*.sql produces. These functions
-- were edited directly against the live database (dashboard / ad-hoc SQL)
-- without a corresponding migration ever being committed.
--
-- Each block below is the live function's own `pg_get_functiondef()` output,
-- pasted verbatim, followed by a revoke-then-grant sequence that reproduces
-- live's exact EXECUTE grant set for anon/authenticated/service_role. Because
-- this is live's own current state being written back via `create or replace
-- function` + explicit revoke/grant, applying this migration to the
-- already-current live database is a pure no-op.
--
-- public.is_admin() is included below: there is exactly one is_admin() in
-- `public` (a SECURITY DEFINER function that checks profiles.role = 'admin'),
-- distinct from `private.is_admin()` which prior migrations already handle
-- correctly. The migrations-only stub for public.is_admin() returns a
-- hardcoded `false` and is not SECURITY DEFINER — a genuine and
-- security-relevant drift, reconciled here.

-- admin_grant_currency(p_id uuid, p_text text, p_int integer, p_text2 text)
CREATE OR REPLACE FUNCTION public.admin_grant_currency(p_id uuid, p_text text, p_int integer, p_text2 text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$ BEGIN END; $function$;

revoke all on function public.admin_grant_currency(p_id uuid, p_text text, p_int integer, p_text2 text) from public, anon, authenticated, service_role;
grant execute on function public.admin_grant_currency(p_id uuid, p_text text, p_int integer, p_text2 text) to authenticated;
grant execute on function public.admin_grant_currency(p_id uuid, p_text text, p_int integer, p_text2 text) to service_role;

-- admin_grant_currency_as(p_admin_id uuid, p_user_id uuid, p_currency text, p_amount integer, p_note text)
CREATE OR REPLACE FUNCTION public.admin_grant_currency_as(p_admin_id uuid, p_user_id uuid, p_currency text, p_amount integer, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_admin_role text;
begin
  select role::text into v_admin_role
  from public.profiles
  where id = p_admin_id;

  if v_admin_role != 'admin' then
    return jsonb_build_object('success', false, 'error', 'unauthorized');
  end if;

  if p_currency not in ('nc', 'pro') then
    return jsonb_build_object('success', false, 'error', 'invalid_currency');
  end if;

  if p_amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_amount');
  end if;

  insert into public.wallets (user_id, updated_at)
    values (p_user_id, now())
  on conflict (user_id) do update set
    nc_balance = case when p_currency = 'nc' then wallets.nc_balance + p_amount else wallets.nc_balance end,
    pro_balance = case when p_currency = 'pro' then wallets.pro_balance + p_amount else wallets.pro_balance end,
    updated_at = now();

  insert into public.wallet_transactions (user_id, currency, amount, type, note, granted_by)
    values (p_user_id, p_currency, p_amount, 'admin_grant', p_note, p_admin_id);

  return jsonb_build_object('success', true, 'amount', p_amount, 'currency', p_currency);
end;
$function$;

revoke all on function public.admin_grant_currency_as(p_admin_id uuid, p_user_id uuid, p_currency text, p_amount integer, p_note text) from public, anon, authenticated, service_role;
grant execute on function public.admin_grant_currency_as(p_admin_id uuid, p_user_id uuid, p_currency text, p_amount integer, p_note text) to service_role;

-- award_xp(p_user_id uuid, p_amount integer)
CREATE OR REPLACE FUNCTION public.award_xp(p_user_id uuid, p_amount integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_new_xp integer;
  v_new_level integer;
begin
  if p_user_id is null or p_amount is null or p_amount <= 0 then
    raise exception 'invalid award_xp arguments';
  end if;

  update public.profiles
  set xp = coalesce(xp, 0) + p_amount,
      last_xp_at = now()
  where id = p_user_id
  returning xp into v_new_xp;

  if v_new_xp is null then
    raise exception 'profile not found';
  end if;

  v_new_level := greatest(1, floor(sqrt(v_new_xp::numeric / 100.0))::int + 1);

  update public.profiles
  set level = v_new_level
  where id = p_user_id;

  return v_new_xp;
end;
$function$;

revoke all on function public.award_xp(p_user_id uuid, p_amount integer) from public, anon, authenticated, service_role;
grant execute on function public.award_xp(p_user_id uuid, p_amount integer) to service_role;

-- award_xp_capped(p_user_id uuid, p_amount integer, p_source_type text, p_daily_cap integer)
CREATE OR REPLACE FUNCTION public.award_xp_capped(p_user_id uuid, p_amount integer, p_source_type text, p_daily_cap integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_today integer;
begin
  if p_user_id is null or p_amount is null or p_amount <= 0
     or p_source_type is null or p_daily_cap is null or p_daily_cap <= 0 then
    raise exception 'invalid award_xp_capped arguments';
  end if;

  select count(*) into v_today
  from public.xp_events
  where user_id = p_user_id
    and source_type = p_source_type
    and created_at >= date_trunc('day', now());

  if v_today >= p_daily_cap then
    return false;
  end if;

  insert into public.xp_events (user_id, source_type, source_id, amount)
  values (p_user_id, p_source_type, gen_random_uuid()::text, p_amount);

  perform public.award_xp(p_user_id, p_amount);
  return true;
end;
$function$;

revoke all on function public.award_xp_capped(p_user_id uuid, p_amount integer, p_source_type text, p_daily_cap integer) from public, anon, authenticated, service_role;
grant execute on function public.award_xp_capped(p_user_id uuid, p_amount integer, p_source_type text, p_daily_cap integer) to service_role;

-- award_xp_once(p_user_id uuid, p_amount integer, p_source_type text, p_source_id text)
CREATE OR REPLACE FUNCTION public.award_xp_once(p_user_id uuid, p_amount integer, p_source_type text, p_source_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_rows integer;
begin
  if p_user_id is null or p_amount is null or p_amount <= 0
     or p_source_type is null or p_source_id is null then
    raise exception 'invalid award_xp_once arguments';
  end if;

  insert into public.xp_events (user_id, source_type, source_id, amount)
  values (p_user_id, p_source_type, p_source_id, p_amount)
  on conflict (source_type, source_id) do nothing;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return false;
  end if;

  perform public.award_xp(p_user_id, p_amount);
  return true;
end;
$function$;

revoke all on function public.award_xp_once(p_user_id uuid, p_amount integer, p_source_type text, p_source_id text) from public, anon, authenticated, service_role;
grant execute on function public.award_xp_once(p_user_id uuid, p_amount integer, p_source_type text, p_source_id text) to service_role;

-- claim_daily_bonus()
CREATE OR REPLACE FUNCTION public.claim_daily_bonus()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$ BEGIN END; $function$;

revoke all on function public.claim_daily_bonus() from public, anon, authenticated, service_role;
grant execute on function public.claim_daily_bonus() to authenticated;
grant execute on function public.claim_daily_bonus() to service_role;

-- claim_daily_bonus_as(p_user_id uuid)
CREATE OR REPLACE FUNCTION public.claim_daily_bonus_as(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_last date;
  v_today date := current_date;
  v_reward integer := 10;
begin
  if p_user_id is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select last_login_award_at
  into v_last
  from public.profiles
  where id = p_user_id
  for update;

  if v_last is not null and v_last >= v_today then
    return jsonb_build_object(
      'success', false,
      'error', 'already_claimed',
      'next_claim', (v_today + interval '1 day')::date
    );
  end if;

  insert into public.wallets (user_id, nc_balance, updated_at)
    values (p_user_id, v_reward, now())
  on conflict (user_id) do update
    set nc_balance = wallets.nc_balance + v_reward,
        updated_at = now();

  insert into public.wallet_transactions (user_id, currency, amount, type, note)
    values (p_user_id, 'nc', v_reward, 'daily_bonus', 'ყოველდღიური ბონუსი');

  update public.profiles
  set last_login_award_at = v_today
  where id = p_user_id;

  return jsonb_build_object('success', true, 'amount', v_reward, 'currency', 'nc');
end;
$function$;

revoke all on function public.claim_daily_bonus_as(p_user_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.claim_daily_bonus_as(p_user_id uuid) to service_role;

-- create_wallet_for_new_user()
CREATE OR REPLACE FUNCTION public.create_wallet_for_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$ BEGIN RETURN NEW; END; $function$;

revoke all on function public.create_wallet_for_new_user() from public, anon, authenticated, service_role;
grant execute on function public.create_wallet_for_new_user() to service_role;

-- enforce_dm_privacy_on_conversation()
CREATE OR REPLACE FUNCTION public.enforce_dm_privacy_on_conversation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_initiator uuid := auth.uid();
  v_recipient uuid;
  v_pref text;
begin
  if exists (
    select 1 from public.user_blocks
    where (blocker_id = new.user_a and blocked_id = new.user_b)
       or (blocker_id = new.user_b and blocked_id = new.user_a)
  ) then
    raise exception 'blocked' using errcode = 'check_violation';
  end if;

  if v_initiator is not null then
    v_recipient := case when new.user_a = v_initiator then new.user_b else new.user_a end;
    select dm_privacy into v_pref from public.profiles where id = v_recipient;
    if v_pref = 'nobody' then
      raise exception 'dm_not_allowed' using errcode = 'check_violation';
    elsif v_pref = 'followers' and not exists (
      select 1 from public.follows where follower_id = v_initiator and following_id = v_recipient
    ) then
      raise exception 'dm_not_allowed' using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function public.enforce_dm_privacy_on_conversation() from public, anon, authenticated, service_role;
grant execute on function public.enforce_dm_privacy_on_conversation() to service_role;

-- equip_item(p_id uuid)
CREATE OR REPLACE FUNCTION public.equip_item(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$ BEGIN END; $function$;

revoke all on function public.equip_item(p_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.equip_item(p_id uuid) to authenticated;
grant execute on function public.equip_item(p_id uuid) to service_role;

-- equip_item_as(p_user_id uuid, p_item_id uuid)
CREATE OR REPLACE FUNCTION public.equip_item_as(p_user_id uuid, p_item_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_item record;
  v_owns boolean;
begin
  if p_user_id is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select *
  into v_item
  from public.shop_items
  where id = p_item_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'item_not_found');
  end if;

  select exists (
    select 1
    from public.user_purchases
    where user_id = p_user_id
      and item_id = p_item_id
  ) into v_owns;

  if not v_owns then
    return jsonb_build_object('success', false, 'error', 'not_owned');
  end if;

  insert into public.user_equipped (user_id, category, item_id)
    values (p_user_id, v_item.category, p_item_id)
  on conflict (user_id, category)
    do update set item_id = p_item_id, equipped_at = now();

  return jsonb_build_object('success', true, 'category', v_item.category);
end;
$function$;

revoke all on function public.equip_item_as(p_user_id uuid, p_item_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.equip_item_as(p_user_id uuid, p_item_id uuid) to service_role;

-- expire_old_lfg_posts()
CREATE OR REPLACE FUNCTION public.expire_old_lfg_posts()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$ BEGIN END; $function$;

revoke all on function public.expire_old_lfg_posts() from public, anon, authenticated, service_role;
grant execute on function public.expire_old_lfg_posts() to service_role;

-- handle_new_user()
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_base text;
  v_username text;
  v_suffix int := 0;
begin
  v_base := lower(
    regexp_replace(
      split_part(coalesce(new.email, ''), '@', 1),
      '[^a-z0-9_]', '', 'g'
    )
  );
  if length(v_base) < 3 then
    v_base := 'user_' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;
  v_base := substr(v_base, 1, 24);

  v_username := v_base;
  loop
    exit when not exists (
      select 1 from public.profiles where lower(username) = lower(v_username)
    );
    v_suffix := v_suffix + 1;
    v_username := v_base || v_suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name, role, created_at, updated_at)
  values (
    new.id,
    v_username,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    'user',
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;

revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;
grant execute on function public.handle_new_user() to service_role;

-- is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
        SELECT EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        );
      $function$;

revoke all on function public.is_admin() from public, anon, authenticated, service_role;
grant execute on function public.is_admin() to service_role;

-- lfg_response_to_comment()
CREATE OR REPLACE FUNCTION public.lfg_response_to_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$ BEGIN RETURN NEW; END; $function$;

revoke all on function public.lfg_response_to_comment() from public, anon, authenticated, service_role;
grant execute on function public.lfg_response_to_comment() to service_role;

-- notify_lfg_response()
CREATE OR REPLACE FUNCTION public.notify_lfg_response()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$ BEGIN RETURN NEW; END; $function$;

revoke all on function public.notify_lfg_response() from public, anon, authenticated, service_role;
grant execute on function public.notify_lfg_response() to service_role;

-- open_box(p_id uuid)
CREATE OR REPLACE FUNCTION public.open_box(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$ BEGIN END; $function$;

revoke all on function public.open_box(p_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.open_box(p_id uuid) to service_role;

-- open_box_as(p_user_id uuid, p_box_id uuid)
CREATE OR REPLACE FUNCTION public.open_box_as(p_user_id uuid, p_box_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_box public.event_boxes%rowtype;
  v_nc_balance integer;
  v_pro_balance integer;
  v_total_weight integer;
  v_roll integer;
  v_cumulative integer := 0;
  v_item public.box_items%rowtype;
begin
  if p_user_id is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select *
  into v_box
  from public.event_boxes
  where id = p_box_id
    and is_active = true;

  if not found then
    return jsonb_build_object('success', false, 'error', 'box_not_found');
  end if;

  select nc_balance, pro_balance
  into v_nc_balance, v_pro_balance
  from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'insufficient_funds');
  end if;

  if v_box.cost_currency = 'nc' then
    if coalesce(v_nc_balance, 0) < v_box.cost_amount then
      return jsonb_build_object('success', false, 'error', 'insufficient_funds');
    end if;

    update public.wallets
    set nc_balance = nc_balance - v_box.cost_amount,
        updated_at = now()
    where user_id = p_user_id;
  else
    if coalesce(v_pro_balance, 0) < v_box.cost_amount then
      return jsonb_build_object('success', false, 'error', 'insufficient_funds');
    end if;

    update public.wallets
    set pro_balance = pro_balance - v_box.cost_amount,
        updated_at = now()
    where user_id = p_user_id;
  end if;

  insert into public.wallet_transactions (user_id, currency, amount, type, note)
    values (p_user_id, v_box.cost_currency, -v_box.cost_amount, 'spend', 'ყუთი: ' || v_box.name);

  select coalesce(sum(weight), 0)
  into v_total_weight
  from public.box_items
  where box_id = p_box_id;

  if v_total_weight = 0 then
    return jsonb_build_object('success', false, 'error', 'no_items');
  end if;

  v_roll := floor(random() * v_total_weight)::integer + 1;

  for v_item in
    select *
    from public.box_items
    where box_id = p_box_id
    order by id
  loop
    v_cumulative := v_cumulative + v_item.weight;
    if v_roll <= v_cumulative then
      exit;
    end if;
  end loop;

  insert into public.user_inventory (user_id, item_id, box_id)
    values (p_user_id, v_item.id, p_box_id);

  return jsonb_build_object(
    'success', true,
    'item', jsonb_build_object(
      'id', v_item.id,
      'name', v_item.item_name,
      'tier', v_item.tier,
      'item_type', v_item.item_type,
      'image_url', v_item.image_url
    )
  );
end;
$function$;

revoke all on function public.open_box_as(p_user_id uuid, p_box_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.open_box_as(p_user_id uuid, p_box_id uuid) to service_role;

-- open_box_bundle_as(p_user_id uuid, p_box_id uuid, p_paid_opens integer, p_total_opens integer)
CREATE OR REPLACE FUNCTION public.open_box_bundle_as(p_user_id uuid, p_box_id uuid, p_paid_opens integer DEFAULT 10, p_total_opens integer DEFAULT 12)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_box public.event_boxes%rowtype;
  v_nc_balance integer;
  v_pro_balance integer;
  v_total_weight integer;
  v_total_cost integer;
  v_roll integer;
  v_cumulative integer;
  v_item public.box_items%rowtype;
  v_items jsonb := '[]'::jsonb;
  v_index integer;
  v_bonus_count integer := greatest(p_total_opens - p_paid_opens, 0);
  v_item_found boolean;
begin
  if p_user_id is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_paid_opens < 1 or p_total_opens < p_paid_opens or p_total_opens > 50 then
    return jsonb_build_object('success', false, 'error', 'unknown');
  end if;

  select *
  into v_box
  from public.event_boxes
  where id = p_box_id
    and is_active = true;

  if not found then
    return jsonb_build_object('success', false, 'error', 'box_not_found');
  end if;

  select coalesce(sum(weight), 0)
  into v_total_weight
  from public.box_items
  where box_id = p_box_id;

  if v_total_weight <= 0 then
    return jsonb_build_object('success', false, 'error', 'unknown');
  end if;

  select nc_balance, pro_balance
  into v_nc_balance, v_pro_balance
  from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'insufficient_funds');
  end if;

  v_total_cost := v_box.cost_amount * p_paid_opens;

  if v_box.cost_currency = 'nc' then
    if coalesce(v_nc_balance, 0) < v_total_cost then
      return jsonb_build_object('success', false, 'error', 'insufficient_funds');
    end if;

    update public.wallets
    set nc_balance = nc_balance - v_total_cost,
        updated_at = now()
    where user_id = p_user_id;
  else
    if coalesce(v_pro_balance, 0) < v_total_cost then
      return jsonb_build_object('success', false, 'error', 'insufficient_funds');
    end if;

    update public.wallets
    set pro_balance = pro_balance - v_total_cost,
        updated_at = now()
    where user_id = p_user_id;
  end if;

  insert into public.wallet_transactions (user_id, currency, amount, type, note)
  values (
    p_user_id,
    v_box.cost_currency,
    -v_total_cost,
    'spend',
    format('ყუთი x%s (+%s ბონუსი): %s', p_paid_opens, v_bonus_count, v_box.name)
  );

  for v_index in 1..p_total_opens loop
    v_roll := floor(random() * v_total_weight)::integer + 1;
    v_cumulative := 0;
    v_item_found := false;

    for v_item in
      select *
      from public.box_items
      where box_id = p_box_id
      order by id
    loop
      v_cumulative := v_cumulative + v_item.weight;
      if v_roll <= v_cumulative then
        v_item_found := true;
        exit;
      end if;
    end loop;

    if not v_item_found then
      raise exception 'open_box_bundle item selection failed for box %', p_box_id;
    end if;

    insert into public.user_inventory (user_id, item_id, box_id)
    values (p_user_id, v_item.id, p_box_id);

    v_items := v_items || jsonb_build_array(
      jsonb_build_object(
        'id', v_item.id,
        'name', v_item.item_name,
        'tier', v_item.tier,
        'item_type', v_item.item_type,
        'image_url', v_item.image_url
      )
    );
  end loop;

  return jsonb_build_object(
    'success', true,
    'items', v_items,
    'paidOpens', p_paid_opens,
    'totalOpens', p_total_opens,
    'bonusAwarded', v_bonus_count
  );
end;
$function$;

revoke all on function public.open_box_bundle_as(p_user_id uuid, p_box_id uuid, p_paid_opens integer, p_total_opens integer) from public, anon, authenticated, service_role;
grant execute on function public.open_box_bundle_as(p_user_id uuid, p_box_id uuid, p_paid_opens integer, p_total_opens integer) to service_role;

-- pm_advance_time(p_team_id uuid, p_days integer)
CREATE OR REPLACE FUNCTION public.pm_advance_time(p_team_id uuid, p_days integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_calendar public.pm_calendar%rowtype;
  v_days integer := greatest(1, coalesce(p_days, 1));
  v_total integer;
  v_prev_total integer;
  v_prev_week integer;
  v_new_week integer;
  v_doctor_recovery_pct integer := 0;
  v_physio_recovery_pct integer := 0;
  v_psychologist_morale_pct integer := 0;
  v_fatigue_recovery integer := 0;
  v_morale_recovery integer := 0;
begin
  perform public.pm_ensure_calendar(p_team_id);
  perform public.pm_ensure_finance_state(p_team_id);

  select
    coalesce(sum(case when role_key = 'doctor' then level * 8 else 0 end), 0)::integer,
    coalesce(sum(case when role_key = 'physiotherapist' then level * 7 else 0 end), 0)::integer,
    coalesce(sum(case when role_key = 'psychologist' then level * 6 else 0 end), 0)::integer
  into v_doctor_recovery_pct, v_physio_recovery_pct, v_psychologist_morale_pct
  from public.pm_staff
  where team_id = p_team_id;

  v_fatigue_recovery := greatest(2, (v_days * 3) + floor((v_physio_recovery_pct * v_days)::numeric / 14.0)::integer);
  v_morale_recovery := greatest(0, floor((v_psychologist_morale_pct * v_days)::numeric / 12.0)::integer);

  update public.pm_players p
  set
    injury_matches = greatest(0, p.injury_matches - v_days - recovery.extra_days),
    status = case
      when greatest(0, p.injury_matches - v_days - recovery.extra_days) = 0 then 'active'
      else 'injured'
    end,
    morale = least(100, p.morale + least(8, v_days * 2) + v_morale_recovery)
  from public.pm_squads s
  cross join lateral (
    select case
      when v_doctor_recovery_pct > 0
       and random() < least(0.85, (v_doctor_recovery_pct::numeric / 100.0) * greatest(1, v_days))
      then 1
      else 0
    end as extra_days
  ) recovery
  where s.player_id = p.id
    and s.team_id = p_team_id
    and p.injury_matches > 0;

  update public.pm_players p
  set
    fatigue = greatest(0, p.fatigue - v_fatigue_recovery),
    morale = least(100, p.morale + v_morale_recovery)
  from public.pm_squads s
  where s.player_id = p.id
    and s.team_id = p_team_id;

  select * into v_calendar
  from public.pm_calendar
  where team_id = p_team_id
  for update;

  v_prev_week := v_calendar.week_no;
  v_prev_total := v_calendar.total_days;
  v_total := v_calendar.total_days + v_days;
  v_new_week := (((v_total - 1) / 7) + 1);

  update public.pm_calendar
  set
    total_days = v_total,
    week_no = v_new_week,
    day_no = (((v_total - 1) % 7) + 1),
    updated_at = now()
  where team_id = p_team_id
  returning * into v_calendar;

  update public.pm_players p
  set age_started_total_days = v_prev_total
  from public.pm_squads s
  where s.player_id = p.id
    and s.team_id = p_team_id
    and p.age_started_total_days is null;

  with aging as (
    select
      p.id,
      p.age,
      p.talent,
      p.ovr_base,
      p.ovr_current,
      upper(coalesce(nullif(p.primary_position, ''), s.position, 'CM')) as position_key,
      32 + public.pm_player_talent_class_age_offset(p.talent) as decay_t1,
      36 + public.pm_player_talent_class_age_offset(p.talent) as decay_t2,
      greatest(
        0,
        floor(greatest(0, v_total - coalesce(p.age_started_total_days, v_prev_total))::numeric / 84.0)::integer
        - floor(greatest(0, v_prev_total - coalesce(p.age_started_total_days, v_prev_total))::numeric / 84.0)::integer
      ) as years_gained,
      coalesce(
        p.base_card_stats,
        p.card_stats,
        public.pm_player_seed_card_stats(
          upper(coalesce(nullif(p.primary_position, ''), s.position, 'CM')),
          p.ovr_base::smallint
        )
      ) as current_base_stats,
      coalesce(
        p.card_stats,
        p.base_card_stats,
        public.pm_player_seed_card_stats(
          upper(coalesce(nullif(p.primary_position, ''), s.position, 'CM')),
          p.ovr_current::smallint
        )
      ) as current_card_stats
    from public.pm_players p
    join public.pm_squads s
      on s.player_id = p.id
    where s.team_id = p_team_id
  ),
  prepared as (
    select
      a.id,
      a.position_key,
      a.age,
      least(50, a.age + a.years_gained) as next_age,
      greatest(
        1,
        a.talent
        - case when a.age < a.decay_t1 and least(50, a.age + a.years_gained) >= a.decay_t1 then 1 else 0 end
        - case when a.age < a.decay_t2 and least(50, a.age + a.years_gained) >= a.decay_t2 then 1 else 0 end
      ) as next_talent,
      case
        when a.age < a.decay_t1 and least(50, a.age + a.years_gained) >= a.decay_t1 and a.age < a.decay_t2 and least(50, a.age + a.years_gained) >= a.decay_t2 then
          public.pm_apply_age_threshold_decay(
            a.position_key,
            public.pm_apply_age_threshold_decay(a.position_key, a.current_base_stats, 32),
            36
          )
        when a.age < a.decay_t1 and least(50, a.age + a.years_gained) >= a.decay_t1 then
          public.pm_apply_age_threshold_decay(a.position_key, a.current_base_stats, 32)
        when a.age < a.decay_t2 and least(50, a.age + a.years_gained) >= a.decay_t2 then
          public.pm_apply_age_threshold_decay(a.position_key, a.current_base_stats, 36)
        else a.current_base_stats
      end as next_base_stats,
      case
        when a.age < a.decay_t1 and least(50, a.age + a.years_gained) >= a.decay_t1 and a.age < a.decay_t2 and least(50, a.age + a.years_gained) >= a.decay_t2 then
          public.pm_apply_age_threshold_decay(
            a.position_key,
            public.pm_apply_age_threshold_decay(a.position_key, a.current_card_stats, 32),
            36
          )
        when a.age < a.decay_t1 and least(50, a.age + a.years_gained) >= a.decay_t1 then
          public.pm_apply_age_threshold_decay(a.position_key, a.current_card_stats, 32)
        when a.age < a.decay_t2 and least(50, a.age + a.years_gained) >= a.decay_t2 then
          public.pm_apply_age_threshold_decay(a.position_key, a.current_card_stats, 36)
        else a.current_card_stats
      end as next_card_stats
    from aging a
    where a.years_gained > 0
  ),
  scored as (
    select
      p.id,
      p.next_age,
      p.next_talent,
      p.position_key,
      p.next_base_stats,
      p.next_card_stats,
      public.pm_player_overall_from_stats(
        p.position_key,
        p.next_base_stats,
        40
      ) as next_ovr_base,
      public.pm_player_overall_from_stats(
        p.position_key,
        p.next_card_stats,
        public.pm_player_overall_from_stats(
          p.position_key,
          p.next_base_stats,
          40
        )
      ) as next_ovr_current
    from prepared p
  )
  update public.pm_players player
  set
    age = scored.next_age,
    talent = scored.next_talent,
    base_card_stats = scored.next_base_stats,
    card_stats = scored.next_card_stats,
    ovr_base = scored.next_ovr_base,
    ovr_current = scored.next_ovr_current,
    base_transfer_value_gel = public.pm_player_base_transfer_value_gel(scored.next_ovr_base),
    current_transfer_value_gel = public.pm_player_current_transfer_value_gel(
      scored.next_ovr_base,
      scored.next_ovr_current
    )
  from scored
  where player.id = scored.id;

  if v_new_week > v_prev_week then
    while v_prev_week < v_new_week loop
      v_prev_week := v_prev_week + 1;
      perform public.pm_apply_weekly_finance(p_team_id, v_prev_week);
    end loop;
  end if;

  return jsonb_build_object(
    'weekNo', v_calendar.week_no,
    'dayNo', v_calendar.day_no,
    'totalDays', v_calendar.total_days
  );
end;
$function$;

revoke all on function public.pm_advance_time(p_team_id uuid, p_days integer) from public, anon, authenticated, service_role;
grant execute on function public.pm_advance_time(p_team_id uuid, p_days integer) to service_role;

-- pm_apply_squad_morale_drain(p_team_id uuid, p_days integer)
CREATE OR REPLACE FUNCTION public.pm_apply_squad_morale_drain(p_team_id uuid, p_days integer DEFAULT 1)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_days integer := greatest(1, coalesce(p_days, 1));
begin
  update public.pm_players p
  set morale = least(100, greatest(0, p.morale - (
    case
      when coalesce(s.shirt_number, 99) <= 11 then 0          -- starters: playing -> content
      when coalesce(s.shirt_number, 99) <= 15 then v_days     -- bench:    -1 / day
      else v_days * 2                                         -- reserves: -2 / day
    end
  )))
  from public.pm_squads s
  where s.player_id = p.id
    and s.team_id = p_team_id;
end;
$function$;

revoke all on function public.pm_apply_squad_morale_drain(p_team_id uuid, p_days integer) from public, anon, authenticated, service_role;
grant execute on function public.pm_apply_squad_morale_drain(p_team_id uuid, p_days integer) to service_role;

-- pm_apply_weekly_finance(p_team_id uuid, p_week_no integer)
CREATE OR REPLACE FUNCTION public.pm_apply_weekly_finance(p_team_id uuid, p_week_no integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_state public.pm_finance_state%rowtype;
  v_wages bigint := 0;
  v_balance bigint := 0;
  v_paid_wages bigint := 0;
  v_wage_shortfall bigint := 0;
begin
  perform public.pm_ensure_finance_state(p_team_id);

  select * into v_state from public.pm_finance_state where team_id = p_team_id for update;

  if v_state.last_settled_week >= p_week_no then
    return jsonb_build_object('weekNo', p_week_no, 'wages', 0, 'sponsor', 0);
  end if;

  v_wages := public.pm_calculate_weekly_wages(p_team_id);

  if v_state.sponsor_weekly_amount > 0 then
    perform public.pm_credit(p_team_id, v_state.sponsor_weekly_amount, 'weekly_sponsor');
  end if;

  select balance into v_balance from public.pm_wallets where team_id = p_team_id for update;

  v_paid_wages := least(v_wages, greatest(0, coalesce(v_balance, 0)));
  v_wage_shortfall := greatest(0, v_wages - v_paid_wages);

  if v_paid_wages > 0 then
    perform public.pm_debit(p_team_id, v_paid_wages, 'weekly_wages');
  end if;

  if v_wage_shortfall > 0 then
    update public.pm_players p
    set morale = greatest(0, p.morale - 6)
    from public.pm_squads s
    where s.player_id = p.id and s.team_id = p_team_id;
  end if;

  update public.pm_finance_state
  set last_settled_week = p_week_no, updated_at = now()
  where team_id = p_team_id;

  perform public.pm_log_event(
    p_team_id,
    'finance',
    format('კვირეული ფინანსური ციკლი · Week %s', p_week_no),
    format(
      'Sponsor +%s ₾ · Wages -%s ₾%s',
      v_state.sponsor_weekly_amount,
      v_paid_wages,
      case when v_wage_shortfall > 0 then format(' · Shortfall %s ₾', v_wage_shortfall) else '' end
    ),
    case when v_wage_shortfall > 0 then 'red' when v_state.sponsor_weekly_amount >= v_wages then 'green' else 'gold' end
  );

  return jsonb_build_object(
    'weekNo', p_week_no,
    'wages', v_wages,
    'paidWages', v_paid_wages,
    'wageShortfall', v_wage_shortfall,
    'sponsor', v_state.sponsor_weekly_amount
  );
end;
$function$;

revoke all on function public.pm_apply_weekly_finance(p_team_id uuid, p_week_no integer) from public, anon, authenticated, service_role;
grant execute on function public.pm_apply_weekly_finance(p_team_id uuid, p_week_no integer) to service_role;

-- pm_buy_market_player(p_team_id uuid, p_player jsonb)
CREATE OR REPLACE FUNCTION public.pm_buy_market_player(p_team_id uuid, p_player jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_player_id uuid;
  v_owner_id uuid;
  v_price bigint;
  v_position text;
  v_age smallint;
  v_current_total_days integer := 1;
begin
  v_price := coalesce((p_player->>'current_transfer_value_gel')::bigint, 0);
  v_position := coalesce(p_player->>'position', 'CM');
  v_age := greatest(15, least(50, coalesce((p_player->>'age')::smallint, 18)));

  if v_price <= 0 then raise exception 'invalid_price'; end if;
  if v_position not in ('GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST') then
    raise exception 'invalid_position';
  end if;

  perform public.pm_ensure_calendar(p_team_id);

  select total_days
  into v_current_total_days
  from public.pm_calendar
  where team_id = p_team_id;

  insert into public.pm_players (
    normalized_name, display_name, is_real, talent, ea_fc_ovr, ovr_source,
    ovr_base, ovr_current, age, base_transfer_value_gel, current_transfer_value_gel
  ) values (
    p_player->>'normalized_name',
    p_player->>'display_name',
    coalesce((p_player->>'is_real')::boolean, true),
    coalesce((p_player->>'talent')::smallint, 8),
    nullif(p_player->>'ea_fc_ovr', '')::smallint,
    coalesce(p_player->>'ovr_source', 'ea_fc'),
    (p_player->>'ovr_base')::smallint,
    (p_player->>'ovr_base')::smallint,
    v_age,
    v_price,
    v_price
  )
  on conflict (normalized_name) where is_real = true do update
    set display_name = excluded.display_name
  returning id, owner_id into v_player_id, v_owner_id;

  if v_owner_id = p_team_id then
    raise exception 'player_owned';
  end if;

  if v_owner_id is not null and v_owner_id != p_team_id then
    raise exception 'player_unavailable';
  end if;

  perform public.pm_debit(p_team_id, v_price, 'transfer_buy:' || (p_player->>'normalized_name'));

  update public.pm_players
  set
    owner_id = p_team_id,
    age_started_total_days = v_current_total_days,
    career_end_age = coalesce(career_end_age, public.pm_player_career_end_age(coalesce(talent, 8)::smallint)),
    card_stats = coalesce(base_card_stats, card_stats),
    ovr_current = public.pm_player_overall_from_stats(
      upper(coalesce(nullif(primary_position, ''), v_position, 'CM')),
      coalesce(base_card_stats, card_stats),
      ovr_base
    )
  where id = v_player_id;

  insert into public.pm_squads (team_id, player_id, position)
  values (p_team_id, v_player_id, v_position)
  on conflict (player_id) do nothing;

  return jsonb_build_object('playerId', v_player_id, 'cost', v_price);
end;
$function$;

revoke all on function public.pm_buy_market_player(p_team_id uuid, p_player jsonb) from public, anon, authenticated, service_role;
grant execute on function public.pm_buy_market_player(p_team_id uuid, p_player jsonb) to service_role;

-- pm_buy_xp_pack(p_team_id uuid, p_pack text)
CREATE OR REPLACE FUNCTION public.pm_buy_xp_pack(p_team_id uuid, p_pack text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_owner_id uuid;
  v_price    bigint;
  v_xp       integer;
  v_new_xp   integer;
begin
  case p_pack
    when 'starter' then v_price := 35000;  v_xp := 300;
    when 'prep'    then v_price := 90000;  v_xp := 850;
    when 'elite'   then v_price := 175000; v_xp := 1800;
    else raise exception 'invalid_pack';
  end case;

  select user_id into v_owner_id from public.pm_teams where id = p_team_id;
  if v_owner_id is null then
    raise exception 'team_missing';
  end if;

  perform public.pm_debit(p_team_id, v_price, 'xp_pack:' || p_pack);
  v_new_xp := public.award_xp(v_owner_id, v_xp);

  return jsonb_build_object('xp', v_xp, 'price', v_price, 'newXp', v_new_xp);
end;
$function$;

revoke all on function public.pm_buy_xp_pack(p_team_id uuid, p_pack text) from public, anon, authenticated, service_role;
grant execute on function public.pm_buy_xp_pack(p_team_id uuid, p_pack text) to service_role;

-- pm_confirm_ovr_upgrade(p_team_id uuid, p_player_id uuid, p_fodder_ids uuid[])
CREATE OR REPLACE FUNCTION public.pm_confirm_ovr_upgrade(p_team_id uuid, p_player_id uuid, p_fodder_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_player public.pm_players%rowtype;
  v_pos text;
  v_pending jsonb;
  v_new_ovr smallint;
  v_old_ovr smallint;
  v_cost integer;
  v_consumed uuid[];
  v_deleted integer;
begin
  select p.* into v_player
  from public.pm_players p
  join public.pm_squads s on s.player_id = p.id
  where p.id = p_player_id and s.team_id = p_team_id
  for update;
  if v_player.id is null then
    raise exception 'player_not_found';
  end if;

  v_pos := upper(coalesce(nullif(v_player.primary_position, ''),
    (select s.position from public.pm_squads s where s.player_id = p_player_id and s.team_id = p_team_id limit 1), 'CM'));

  v_pending := v_player.pending_card_stats;
  if v_pending is null then
    raise exception 'no_pending_development';
  end if;

  v_old_ovr := v_player.ovr_current;
  v_new_ovr := public.pm_player_overall_from_stats(v_pos, v_pending, v_old_ovr);
  v_new_ovr := least(
    v_new_ovr,
    (v_player.ovr_base + public.pm_player_ovr_growth_cap(coalesce(v_player.talent, 1)::smallint))::smallint
  );
  if v_new_ovr <= v_old_ovr then
    raise exception 'no_upgrade_available';
  end if;

  v_cost := public.pm_ovr_upgrade_total_cost(v_old_ovr, v_new_ovr);

  select array_agg(id) into v_consumed from (
    select p.id
    from public.pm_squads s
    join public.pm_players p on p.id = s.player_id
    where s.team_id = p_team_id
      and p.id = any(p_fodder_ids)
      and p.id <> p_player_id
      and coalesce(p.talent, 1) between 1 and 3
    limit v_cost
    for update skip locked
  ) picked;

  if v_consumed is null or array_length(v_consumed, 1) < v_cost then
    raise exception 'insufficient_fodder: need %, got %', v_cost, coalesce(array_length(v_consumed,1), 0);
  end if;

  delete from public.pm_squads where team_id = p_team_id and player_id = any(v_consumed);
  get diagnostics v_deleted = row_count;
  if v_deleted < v_cost then
    raise exception 'fodder_conflict';
  end if;

  update public.pm_players set owner_id = null, status = 'retired' where id = any(v_consumed);

  update public.pm_players
  set card_stats = v_pending,
      pending_card_stats = null,
      ovr_current = v_new_ovr,
      current_transfer_value_gel = public.pm_player_current_transfer_value_gel(ovr_base, v_new_ovr)
  where id = p_player_id;

  return jsonb_build_object(
    'playerId', p_player_id,
    'oldOvr', v_old_ovr,
    'newOvr', v_new_ovr,
    'fodderConsumed', v_cost
  );
end;
$function$;

revoke all on function public.pm_confirm_ovr_upgrade(p_team_id uuid, p_player_id uuid, p_fodder_ids uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.pm_confirm_ovr_upgrade(p_team_id uuid, p_player_id uuid, p_fodder_ids uuid[]) to service_role;

-- pm_create_team(p_user_id uuid, p_team_name text, p_players jsonb)
CREATE OR REPLACE FUNCTION public.pm_create_team(p_user_id uuid, p_team_name text, p_players jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_team_id     uuid;
  v_player      jsonb;
  v_player_id   uuid;
  v_pack_id     int;
  v_player_ids  uuid[] := '{}';
  v_is_real     boolean;
  v_ea_fc_ovr   smallint;
  v_ovr_base    smallint;
  v_ovr_current smallint;
  v_expected    int;
begin
  if auth.uid() != p_user_id then raise exception 'forbidden'; end if;
  if exists (select 1 from pm_teams where user_id = p_user_id) then
    raise exception 'team_exists';
  end if;

  v_expected := coalesce(jsonb_array_length(p_players), 0);

  insert into pm_teams (user_id, name) values (p_user_id, p_team_name)
    returning id into v_team_id;

  insert into pm_wallets (team_id, balance) values (v_team_id, 1000000);
  insert into pm_transactions (team_id, amount, reason)
    values (v_team_id, 1000000, 'სტარტერ ბონუსი');

  for v_player in select * from jsonb_array_elements(p_players) loop
    v_is_real := coalesce((v_player->>'is_real')::boolean, false);
    v_ea_fc_ovr := nullif(v_player->>'ea_fc_ovr', '')::smallint;
    v_ovr_base := coalesce(v_ea_fc_ovr, (v_player->>'ovr_base')::smallint);
    v_ovr_current := coalesce((v_player->>'ovr_current')::smallint, v_ovr_base);

    insert into pm_players (
      normalized_name, display_name, is_real, talent,
      ea_fc_ovr, ovr_source, ovr_base, ovr_current, age, owner_id
    ) values (
      v_player->>'normalized_name',
      v_player->>'display_name',
      v_is_real,
      (v_player->>'talent')::smallint,
      case when v_is_real then v_ovr_base else null end,
      case when v_is_real then 'ea_fc' else 'generated' end,
      v_ovr_base,
      v_ovr_current,
      (v_player->>'age')::smallint,
      v_team_id
    )
    returning id into v_player_id;

    insert into pm_squads (team_id, player_id, position)
      values (v_team_id, v_player_id, v_player->>'position')
      on conflict do nothing;
    v_player_ids := v_player_ids || v_player_id;
  end loop;

  if coalesce(array_length(v_player_ids, 1), 0) <> v_expected then
    raise exception 'squad_incomplete';
  end if;

  select id into v_pack_id from pm_packs where cost_pm = 0 limit 1;
  insert into pm_pack_openings (team_id, pack_id, players_received)
    values (v_team_id, v_pack_id, v_player_ids);

  return v_team_id;
end;
$function$;

revoke all on function public.pm_create_team(p_user_id uuid, p_team_name text, p_players jsonb) from public, anon, authenticated, service_role;
grant execute on function public.pm_create_team(p_user_id uuid, p_team_name text, p_players jsonb) to service_role;

-- pm_debit(p_team_id uuid, p_amount bigint, p_reason text)
CREATE OR REPLACE FUNCTION public.pm_debit(p_team_id uuid, p_amount bigint, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_balance bigint;
begin
  if p_amount <= 0 then raise exception 'amount must be positive'; end if;
  select balance into v_balance from pm_wallets where team_id = p_team_id for update;
  if v_balance is null or v_balance < p_amount then raise exception 'insufficient_funds'; end if;
  update pm_wallets set balance = balance - p_amount where team_id = p_team_id;
  insert into pm_transactions (team_id, amount, reason) values (p_team_id, -p_amount, p_reason);
end;
$function$;

revoke all on function public.pm_debit(p_team_id uuid, p_amount bigint, p_reason text) from public, anon, authenticated, service_role;
grant execute on function public.pm_debit(p_team_id uuid, p_amount bigint, p_reason text) to service_role;

-- pm_draft_squad(p_team_id uuid, p_min_ovr smallint, p_max_ovr smallint)
CREATE OR REPLACE FUNCTION public.pm_draft_squad(p_team_id uuid, p_min_ovr smallint DEFAULT 55, p_max_ovr smallint DEFAULT 64)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_targets jsonb := '{"GK":2,"CB":3,"LB":1,"RB":1,"CDM":1,"CM":3,"LW":1,"RW":1,"ST":2}';
  v_pos     text;
  v_need    int;
  v_have    int;
  v_pid     uuid;
  v_drafted int := 0;
begin
  for v_pos, v_need in select key, value::int from jsonb_each_text(v_targets) loop
    select count(*) into v_have
      from pm_squads s
      where s.team_id = p_team_id and s.position = v_pos;

    while v_have < v_need loop
      select id into v_pid
        from pm_players
        where is_real = true
          and owner_id is null
          and status = 'active'
          and primary_position = v_pos
          and ovr_base between p_min_ovr and p_max_ovr
        order by random()
        limit 1
        for update skip locked;

      exit when v_pid is null;

      update pm_players set owner_id = p_team_id, age = 18 where id = v_pid;
      insert into pm_squads (team_id, player_id, position)
        values (p_team_id, v_pid, v_pos)
        on conflict do nothing;

      v_have := v_have + 1;
      v_drafted := v_drafted + 1;
    end loop;
  end loop;

  return v_drafted;
end;
$function$;

revoke all on function public.pm_draft_squad(p_team_id uuid, p_min_ovr smallint, p_max_ovr smallint) from public, anon, authenticated, service_role;
grant execute on function public.pm_draft_squad(p_team_id uuid, p_min_ovr smallint, p_max_ovr smallint) to service_role;

-- pm_ensure_academy_prospects(p_team_id uuid, p_prospects jsonb)
CREATE OR REPLACE FUNCTION public.pm_ensure_academy_prospects(p_team_id uuid, p_prospects jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_existing_count integer;
  v_prospect jsonb;
begin
  select count(*) into v_existing_count
  from public.pm_academy_prospects
  where team_id = p_team_id and status = 'active';

  if v_existing_count >= 3 then
    return;
  end if;

  for v_prospect in
    select * from jsonb_array_elements(p_prospects)
  loop
    exit when v_existing_count >= 3;

    insert into public.pm_academy_prospects (
      team_id, normalized_name, display_name, position, age, talent, ovr_base, potential_ovr, signing_cost
    )
    values (
      p_team_id,
      v_prospect->>'normalized_name',
      v_prospect->>'display_name',
      v_prospect->>'position',
      (v_prospect->>'age')::smallint,
      (v_prospect->>'talent')::smallint,
      (v_prospect->>'ovr_base')::smallint,
      coalesce((v_prospect->>'potential_ovr')::smallint, least(99, (v_prospect->>'ovr_base')::smallint + 18)),
      coalesce((v_prospect->>'signing_cost')::bigint, 120000)
    )
    on conflict do nothing;

    v_existing_count := v_existing_count + 1;
  end loop;
end;
$function$;

revoke all on function public.pm_ensure_academy_prospects(p_team_id uuid, p_prospects jsonb) from public, anon, authenticated, service_role;
grant execute on function public.pm_ensure_academy_prospects(p_team_id uuid, p_prospects jsonb) to service_role;

-- pm_ensure_academy_youth(p_team_id uuid)
CREATE OR REPLACE FUNCTION public.pm_ensure_academy_youth(p_team_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_existing integer;
  v_level smallint := 1;
  v_scout smallint := 0;
  v_target integer;
  v_cap integer;
  v_need integer;
begin
  select coalesce(level, 1) into v_level
  from public.pm_facilities
  where team_id = p_team_id and sprite_key = 'academy';
  v_level := coalesce(v_level, 1);

  select coalesce(max(level), 0) into v_scout
  from public.pm_staff
  where team_id = p_team_id and role_key = 'youth_scout';
  v_scout := coalesce(v_scout, 0);

  v_target := 2 + v_level;
  v_cap := least(8, 4 + v_scout);

  select count(*) into v_existing
  from public.pm_academy_prospects
  where team_id = p_team_id and status = 'active';

  v_need := v_target - v_existing;
  if v_need <= 0 then
    return;
  end if;

  insert into public.pm_academy_prospects (
    team_id, player_id, normalized_name, display_name, position,
    age, talent, ovr_base, potential_ovr, signing_cost, status
  )
  select
    p_team_id,
    p.id,
    p.normalized_name,
    p.display_name,
    upper(coalesce(nullif(p.primary_position, ''), 'CM')),
    15,
    p.talent,
    p.ovr_base,
    least(99, p.ovr_base + public.pm_player_ovr_growth_cap(p.talent)),
    (200000 + p.talent * 35000
      + greatest(0, least(99, p.ovr_base + public.pm_player_ovr_growth_cap(p.talent)) - 60) * 12000)::bigint,
    'active'
  from public.pm_players p
  where p.owner_id is null
    and p.status = 'active'
    and p.is_real
    and coalesce(p.pending_repack, false) = false
    and coalesce(p.real_age, 99) <= 19
    and p.talent between 4 and v_cap
    and not exists (
      select 1 from public.pm_academy_prospects ap
      where ap.player_id = p.id and ap.status = 'active'
    )
  order by random()
  limit v_need;
end;
$function$;

revoke all on function public.pm_ensure_academy_youth(p_team_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.pm_ensure_academy_youth(p_team_id uuid) to service_role;

-- pm_ensure_facilities(p_team_id uuid)
CREATE OR REPLACE FUNCTION public.pm_ensure_facilities(p_team_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  insert into public.pm_facilities (team_id, sprite_key, level, progress, status)
  values
    (p_team_id, 'arena',     2, 68, 'active'),
    (p_team_id, 'market',    1, 34, 'attention'),
    (p_team_id, 'academy',   1, 72, 'upgradeable'),
    (p_team_id, 'training',  2, 58, 'active'),
    (p_team_id, 'finance',   1, 46, 'attention'),
    (p_team_id, 'league',    1, 80, 'active'),
    (p_team_id, 'media',     1, 18, 'locked'),
    (p_team_id, 'medical',   1, 0,  'active'),
    (p_team_id, 'residence', 1, 0,  'active')
  on conflict (team_id, sprite_key) do nothing;
end;
$function$;

revoke all on function public.pm_ensure_facilities(p_team_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.pm_ensure_facilities(p_team_id uuid) to service_role;

-- pm_ensure_season_rows(p_team_id uuid)
CREATE OR REPLACE FUNCTION public.pm_ensure_season_rows(p_team_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_rows integer;
begin
  perform public.pm_ensure_season_state(p_team_id);

  select count(*) into v_rows from public.pm_season_rows where team_id = p_team_id;

  if v_rows = 0 then
    perform public.pm_reset_season_rows(
      p_team_id,
      coalesce((select season_no from public.pm_season_state where team_id = p_team_id), 1)
    );
  end if;
end;
$function$;

revoke all on function public.pm_ensure_season_rows(p_team_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.pm_ensure_season_rows(p_team_id uuid) to service_role;

-- pm_facility_upgrade_cost(p_sprite_key text, p_level smallint)
CREATE OR REPLACE FUNCTION public.pm_facility_upgrade_cost(p_sprite_key text, p_level smallint)
 RETURNS bigint
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_base bigint;
begin
  v_base := case p_sprite_key
    when 'arena' then 620000
    when 'market' then 420000
    when 'academy' then 800000
    when 'training' then 510000
    when 'finance' then 300000
    when 'league' then 260000
    when 'media' then 220000
    else 300000
  end;
  return round(v_base * power(1.42, greatest(1, p_level)::numeric - 1))::bigint;
end;
$function$;

revoke all on function public.pm_facility_upgrade_cost(p_sprite_key text, p_level smallint) from public, anon, authenticated, service_role;
grant execute on function public.pm_facility_upgrade_cost(p_sprite_key text, p_level smallint) to service_role;

-- pm_finalize_season(p_team_id uuid)
CREATE OR REPLACE FUNCTION public.pm_finalize_season(p_team_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_rank smallint;
  v_points smallint;
  v_reward bigint := 0;
  v_outcome text := 'stayed';
  v_current_division integer;
  v_next_division integer;
  v_completed boolean;
begin
  perform public.pm_ensure_season_state(p_team_id);

  select is_completed into v_completed from public.pm_season_state where team_id = p_team_id;

  if coalesce(v_completed, false) then
    return (
      select jsonb_build_object('completed', true, 'rank', last_finish, 'reward', last_reward, 'outcome', last_outcome)
      from public.pm_season_state where team_id = p_team_id
    );
  end if;

  with ranked as (
    select
      club_name,
      points,
      row_number() over (
        order by points desc, (goals_for - goals_against) desc, goals_for desc, club_name asc
      ) as rank_no
    from public.pm_season_rows
    where team_id = p_team_id
  )
  select rank_no, points into v_rank, v_points
  from ranked
  where club_name = (select name from public.pm_teams where id = p_team_id);

  select division_id into v_current_division from public.pm_teams where id = p_team_id for update;

  v_reward := case v_rank when 1 then 650000 when 2 then 420000 when 3 then 180000 else 90000 end;

  v_next_division := v_current_division;
  if v_rank = 1 and v_current_division > 1 then
    v_next_division := v_current_division - 1;
    v_outcome := 'promoted';
  elsif v_rank = 4 and v_current_division < 3 then
    v_next_division := v_current_division + 1;
    v_outcome := 'relegated';
  end if;

  if v_reward > 0 then
    perform public.pm_credit(p_team_id, v_reward, 'season_reward');
  end if;

  update public.pm_teams set division_id = v_next_division where id = p_team_id;

  update public.pm_season_state
  set is_completed = true, last_finish = v_rank, last_reward = v_reward, last_outcome = v_outcome, updated_at = now()
  where team_id = p_team_id;

  return jsonb_build_object(
    'completed', true, 'rank', v_rank, 'points', v_points, 'reward', v_reward, 'outcome', v_outcome, 'division', v_next_division
  );
end;
$function$;

revoke all on function public.pm_finalize_season(p_team_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.pm_finalize_season(p_team_id uuid) to service_role;

-- pm_grant_match_development(p_team_id uuid)
CREATE OR REPLACE FUNCTION public.pm_grant_match_development(p_team_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  r record;
  v_pos text;
  v_deadline smallint;
  v_coach_level smallint;
  v_age_mult numeric;
  v_cap smallint;
  v_headroom numeric;
  v_budget integer;
  v_focus text[];
  v_pending jsonb;
  v_label text;
  v_val integer;
  v_cost integer;
  v_raised boolean;
  v_tac smallint;
  v_tac_cap smallint;
begin
  for r in
    select p.id, coalesce(p.age,18) as age, p.ovr_base, p.ovr_current, p.talent,
           coalesce(p.tac, 60) as tac,
           upper(coalesce(s.position, p.primary_position, 'CM')) as pos,
           coalesce(p.pending_card_stats, p.card_stats,
                    public.pm_player_seed_card_stats(upper(coalesce(s.position,p.primary_position,'CM')), p.ovr_base)) as stats,
           coalesce(p.xp, 0) as xp
    from public.pm_squads s
    join public.pm_players p on p.id = s.player_id
    where s.team_id = p_team_id and coalesce(s.shirt_number, 99) <= 11
  loop
    v_pos := r.pos;
    select coalesce(max(level),0) into v_coach_level
    from public.pm_staff
    where team_id = p_team_id and role_key = (case
      when v_pos = 'GK' then 'gk_coach'
      when v_pos in ('CB','LB','RB') then 'defence_coach'
      when v_pos in ('CDM','CM','CAM','AM','LM','RM') then 'midfield_coach'
      else 'attack_coach' end);

    v_deadline := case v_coach_level when 5 then 25 when 4 then 27 when 3 then 28 when 2 then 29 when 1 then 30 else 31 end;
    v_age_mult := greatest(0, least(1, (v_deadline - r.age)::numeric / nullif(v_deadline - 18, 0)));
    v_cap := r.ovr_base + public.pm_player_ovr_growth_cap(r.talent);
    v_headroom := greatest(0.1, least(1, (v_cap - r.ovr_current + 4)::numeric / 12));

    v_tac := r.tac;
    v_tac_cap := least(99, 60 + v_coach_level * 6);
    if v_age_mult >= 0.6 and v_coach_level >= 1 and v_tac < v_tac_cap then
      v_tac := v_tac + 1;
    end if;

    v_budget := r.xp + round(120 * v_age_mult * (1 + v_coach_level * 0.08) * v_headroom);

    v_focus := public.pm_player_training_focus(v_pos);
    v_pending := r.stats;
    if jsonb_typeof(v_pending) is distinct from 'object' then
      v_pending := public.pm_player_seed_card_stats(v_pos, coalesce(r.ovr_base, r.ovr_current, 60)::smallint);
    end if;
    if jsonb_typeof(v_pending) is distinct from 'object' then
      update public.pm_players set tac = v_tac where id = r.id;
      continue;
    end if;

    if v_budget > 0 then
      loop
        v_raised := false;
        foreach v_label in array v_focus loop
          v_val := coalesce((v_pending->>v_label)::int, 40);
          if v_val < 99 then
            v_cost := 50 + v_val * 3;
            if v_budget >= v_cost then
              v_budget := v_budget - v_cost;
              v_pending := jsonb_set(v_pending, array[v_label], to_jsonb(v_val + 1), true);
              v_raised := true;
            end if;
          end if;
        end loop;
        exit when not v_raised;
      end loop;
    end if;

    update public.pm_players
    set xp = v_budget, pending_card_stats = v_pending, tac = v_tac
    where id = r.id;
  end loop;
end;
$function$;

revoke all on function public.pm_grant_match_development(p_team_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.pm_grant_match_development(p_team_id uuid) to service_role;

-- pm_hire_staff(p_team_id uuid, p_role_key text)
CREATE OR REPLACE FUNCTION public.pm_hire_staff(p_team_id uuid, p_role_key text)
 RETURNS TABLE(role_key text, level smallint)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_cost integer;
begin
  if p_role_key not in (
    'head_coach', 'gk_coach', 'defence_coach', 'midfield_coach', 'attack_coach',
    'scout', 'youth_scout', 'doctor', 'physiotherapist', 'psychologist',
    'finance_manager', 'set_piece_coach'
  ) then
    raise exception 'invalid_staff_role';
  end if;

  if exists (
    select 1 from public.pm_staff s
    where s.team_id = p_team_id and s.role_key = p_role_key
  ) then
    raise exception 'staff_already_hired';
  end if;

  v_cost := public.pm_staff_hire_cost(p_role_key);
  if v_cost <= 0 then
    raise exception 'invalid_staff_role';
  end if;

  perform public.pm_debit(p_team_id, v_cost, 'staff_hire:' || p_role_key);

  insert into public.pm_staff (team_id, role_key, level)
  values (p_team_id, p_role_key, 1);

  return query
  select s.role_key, s.level
  from public.pm_staff s
  where s.team_id = p_team_id and s.role_key = p_role_key;
end;
$function$;

revoke all on function public.pm_hire_staff(p_team_id uuid, p_role_key text) from public, anon, authenticated, service_role;
grant execute on function public.pm_hire_staff(p_team_id uuid, p_role_key text) to service_role;

-- pm_match_player_events(p_team_id uuid, p_home_goals integer, p_result text)
CREATE OR REPLACE FUNCTION public.pm_match_player_events(p_team_id uuid, p_home_goals integer, p_result text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_result jsonb;
begin
  with xi as (
    select
      p.id,
      p.display_name as name,
      upper(coalesce(s.position, p.primary_position, 'CM')) as pos,
      coalesce(p.ovr_current, 60)::numeric as ovr,
      coalesce((p.behavioral->>'consistency')::numeric, 60) as consistency,
      (case upper(coalesce(s.position, p.primary_position, 'CM'))
        when 'ST' then 1.00 when 'CF' then 1.00
        when 'LW' then 0.70 when 'RW' then 0.70
        when 'CAM' then 0.65
        when 'LM' then 0.50 when 'RM' then 0.50
        when 'CM' then 0.45
        when 'CDM' then 0.25
        when 'LB' then 0.20 when 'RB' then 0.20 when 'LWB' then 0.20 when 'RWB' then 0.20
        when 'CB' then 0.15
        when 'GK' then 0.02
        else 0.40
      end + 0.05) as weight
    from public.pm_squads s
    join public.pm_players p on p.id = s.player_id
    where s.team_id = p_team_id
      and coalesce(s.shirt_number, 99) <= 11
      and coalesce(p.status, 'active') = 'active'
      and coalesce(p.injury_matches, 0) = 0
  ),
  avg_ovr as (select coalesce(avg(ovr), 70) as a from xi),
  goals as materialized (
    select picked.id, picked.name
    from generate_series(1, greatest(0, coalesce(p_home_goals, 0))) gs(n)
    cross join lateral (
      select id, name from xi order by -ln(random()) / weight limit 1
    ) picked
  ),
  goal_counts as (
    select id, name, count(*)::int as c from goals group by id, name
  ),
  rated as (
    select
      x.id, x.name, x.pos,
      round(greatest(5.0, least(10.0,
        6.4
        + coalesce(gc.c, 0) * 0.9
        + case p_result when 'W' then 0.5 when 'L' then -0.3 else 0 end
        + (x.ovr - (select a from avg_ovr)) * 0.04
        + (random() - 0.5) * 0.6 * (1 - x.consistency / 100.0 * 0.6)
      ))::numeric, 1) as rating
    from xi x
    left join goal_counts gc on gc.id = x.id
  )
  select jsonb_build_object(
    'goalscorers', (
      select coalesce(jsonb_agg(jsonb_build_object('playerId', id, 'name', name, 'goals', c) order by c desc, name), '[]'::jsonb)
      from goal_counts
    ),
    'ratings', (
      select coalesce(jsonb_agg(jsonb_build_object('playerId', id, 'name', name, 'position', pos, 'rating', rating) order by rating desc, name), '[]'::jsonb)
      from rated
    )
  )
  into v_result;

  -- Form feed: standout/poor individual displays nudge that player's morale.
  update public.pm_players p
  set morale = least(100, greatest(0, p.morale
    + case
        when (r->>'rating')::numeric >= 8.0 then 2
        when (r->>'rating')::numeric <= 6.0 then -2
        else 0
      end))
  from jsonb_array_elements(coalesce(v_result->'ratings', '[]'::jsonb)) r
  where p.id = (r->>'playerId')::uuid;

  return v_result;
end;
$function$;

revoke all on function public.pm_match_player_events(p_team_id uuid, p_home_goals integer, p_result text) from public, anon, authenticated, service_role;
grant execute on function public.pm_match_player_events(p_team_id uuid, p_home_goals integer, p_result text) to service_role;

-- pm_negotiate_sponsor(p_team_id uuid)
CREATE OR REPLACE FUNCTION public.pm_negotiate_sponsor(p_team_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_state public.pm_finance_state%rowtype;
  v_division integer := 1;
  v_roll numeric;
  v_tier text;
  v_amount bigint;
begin
  perform public.pm_ensure_finance_state(p_team_id);

  select division_id into v_division from public.pm_teams where id = p_team_id;

  v_roll := random();
  if v_division = 1 and v_roll > 0.58 then
    v_tier := 'global';
    v_amount := 220000 + floor(random() * 30000)::bigint;
  elsif v_division <= 2 and v_roll > 0.26 then
    v_tier := 'regional';
    v_amount := 145000 + floor(random() * 20000)::bigint;
  else
    v_tier := 'local';
    v_amount := 85000 + floor(random() * 15000)::bigint;
  end if;

  update public.pm_finance_state
  set sponsor_tier = v_tier, sponsor_weekly_amount = v_amount, updated_at = now()
  where team_id = p_team_id
  returning * into v_state;

  return jsonb_build_object('sponsorTier', v_state.sponsor_tier, 'sponsorWeeklyAmount', v_state.sponsor_weekly_amount);
end;
$function$;

revoke all on function public.pm_negotiate_sponsor(p_team_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.pm_negotiate_sponsor(p_team_id uuid) to service_role;

-- pm_players_sync_card_stats()
CREATE OR REPLACE FUNCTION public.pm_players_sync_card_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_position text := upper(coalesce(nullif(new.primary_position, ''), 'CM'));
  v_should_seed_base boolean := false;
  v_should_seed_current boolean := false;
  v_lock_real_ea_ovr boolean :=
    coalesce(new.is_real, false)
    and lower(coalesce(new.ovr_source, '')) = 'ea_fc'
    and new.ea_fc_ovr is not null;
begin
  if tg_op = 'INSERT' then
    v_should_seed_base := new.base_card_stats is null or new.base_card_stats = '{}'::jsonb;
    v_should_seed_current := new.card_stats is null or new.card_stats = '{}'::jsonb;
  else
    v_should_seed_base :=
      new.base_card_stats is null
      or new.base_card_stats = '{}'::jsonb
      or (
        new.ovr_base is distinct from old.ovr_base
        and coalesce(new.base_card_stats, '{}'::jsonb) = coalesce(old.base_card_stats, '{}'::jsonb)
      )
      or (
        new.primary_position is distinct from old.primary_position
        and coalesce(new.base_card_stats, '{}'::jsonb) = coalesce(old.base_card_stats, '{}'::jsonb)
      );

    v_should_seed_current :=
      new.card_stats is null
      or new.card_stats = '{}'::jsonb
      or (
        new.ovr_current is distinct from old.ovr_current
        and coalesce(new.card_stats, '{}'::jsonb) = coalesce(old.card_stats, '{}'::jsonb)
      )
      or (
        new.owner_id is distinct from old.owner_id
        and coalesce(new.card_stats, '{}'::jsonb) = coalesce(old.card_stats, '{}'::jsonb)
      );
  end if;

  if v_should_seed_base then
    new.base_card_stats := public.pm_player_seed_card_stats(
      v_position,
      coalesce(
        case when v_lock_real_ea_ovr then new.ea_fc_ovr end,
        new.ovr_base,
        new.ovr_current,
        40
      )::smallint
    );
  end if;

  if v_lock_real_ea_ovr then
    new.ovr_base := greatest(
      35,
      least(99, coalesce(new.ovr_base, new.ea_fc_ovr, new.ovr_current, 40))
    )::smallint;
  else
    new.ovr_base := public.pm_player_overall_from_stats(
      v_position,
      new.base_card_stats,
      coalesce(new.ovr_base, new.ovr_current, 40)::smallint
    );
  end if;

  if new.owner_id is null then
    new.card_stats := new.base_card_stats;
  elsif v_should_seed_current then
    new.card_stats := coalesce(
      new.base_card_stats,
      public.pm_player_seed_card_stats(
        v_position,
        coalesce(
          case when v_lock_real_ea_ovr then new.ea_fc_ovr end,
          new.ovr_current,
          new.ovr_base,
          40
        )::smallint
      )
    );
  end if;

  if v_lock_real_ea_ovr then
    new.ovr_current := greatest(
      35,
      least(99, coalesce(new.ovr_current, new.ovr_base, new.ea_fc_ovr, 40))
    )::smallint;
  else
    new.ovr_current := public.pm_player_overall_from_stats(
      v_position,
      new.card_stats,
      new.ovr_base
    );
  end if;

  -- tac is now a trained attribute (grows via the XP development pipeline); only
  -- seed it from the formula when unset, so trained values are never overwritten.
  if new.tac is null then
    new.tac := public.pm_player_compute_tac(
      new.ovr_current, new.primary_position, new.normalized_name, new.card_stats
    );
  end if;

  return new;
end;
$function$;

revoke all on function public.pm_players_sync_card_stats() from public, anon, authenticated, service_role;
grant execute on function public.pm_players_sync_card_stats() to service_role;

-- pm_process_career_ends(p_team_id uuid, p_days integer)
CREATE OR REPLACE FUNCTION public.pm_process_career_ends(p_team_id uuid, p_days integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_rec record;
  v_notified integer := 0;
  v_released integer := 0;
begin
  -- 1) Notify players who just entered their final season (age = end-1).
  for v_rec in
    select p.id, p.display_name
    from public.pm_players p
    join public.pm_squads s on s.player_id = p.id
    where s.team_id = p_team_id
      and not coalesce(p.career_notified, false)
      and p.age >= p.career_end_age - 1
      and p.age < p.career_end_age
  loop
    perform public.pm_log_event(
      p_team_id, 'board',
      v_rec.display_name || ' კარიერას ასრულებს',
      'ბოლო სეზონია — გააგრძელე (½ ფასი) ან დაემშვიდობე (⅓ კომპენსაცია)',
      'gold'
    );
    update public.pm_players set career_notified = true where id = v_rec.id;
    v_notified := v_notified + 1;
  end loop;

  -- 2) Auto-resolve players past career-end with no decision made.
  for v_rec in
    select p.id, p.display_name, p.talent
    from public.pm_players p
    join public.pm_squads s on s.player_id = p.id
    where s.team_id = p_team_id
      and p.age >= p.career_end_age
  loop
    if v_rec.talent >= 12 then
      update public.pm_players set owner_id = null, pending_repack = true, available_via_career = false, career_notified = false where id = v_rec.id;
      perform public.pm_log_event(p_team_id, 'board', v_rec.display_name || ' დაასრულა კარიერა', 'ლეგენდა — ადმინს გადაეცა pack-ისთვის', 'red');
    elsif v_rec.talent in (10, 11) then
      update public.pm_players set owner_id = null, available_via_career = true, pending_repack = false, career_notified = false where id = v_rec.id;
      perform public.pm_log_event(p_team_id, 'board', v_rec.display_name || ' დატოვა კლუბი', 'თავისუფალი აგენტი (კარიერის დასასრული)', 'red');
    else
      update public.pm_players set owner_id = null, status = 'retired', career_notified = false where id = v_rec.id;
      perform public.pm_log_event(p_team_id, 'board', v_rec.display_name || ' დაასრულა კარიერა', 'პენსიაზე გავიდა', 'red');
    end if;
    delete from public.pm_squads where team_id = p_team_id and player_id = v_rec.id;
    v_released := v_released + 1;
  end loop;

  return jsonb_build_object('notified', v_notified, 'released', v_released);
end;
$function$;

revoke all on function public.pm_process_career_ends(p_team_id uuid, p_days integer) from public, anon, authenticated, service_role;
grant execute on function public.pm_process_career_ends(p_team_id uuid, p_days integer) to service_role;

-- pm_reset_season_rows(p_team_id uuid, p_season_no integer)
CREATE OR REPLACE FUNCTION public.pm_reset_season_rows(p_team_id uuid, p_season_no integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_team_name text;
begin
  select name into v_team_name from public.pm_teams where id = p_team_id;
  if v_team_name is null then
    raise exception 'team_not_found';
  end if;

  delete from public.pm_match_history where team_id = p_team_id;
  delete from public.pm_season_rows where team_id = p_team_id;

  update public.pm_players p
  set last_train_match = -1
  from public.pm_squads s
  where s.player_id = p.id and s.team_id = p_team_id;

  insert into public.pm_season_rows (
    team_id, club_name, played, won, drawn, lost, goals_for, goals_against, points, form_percent, row_order
  ) values
    (p_team_id, v_team_name, 0, 0, 0, 0, 0, 0, 0, 100, 1),
    (p_team_id, 'North London', 0, 0, 0, 0, 0, 0, 0, 92, 2),
    (p_team_id, 'Royal Madrid', 0, 0, 0, 0, 0, 0, 0, 88, 3),
    (p_team_id, 'Milano Black', 0, 0, 0, 0, 0, 0, 0, 81, 4);

  update public.pm_season_state
  set
    season_no = p_season_no,
    is_completed = false,
    updated_at = now()
  where team_id = p_team_id;
end;
$function$;

revoke all on function public.pm_reset_season_rows(p_team_id uuid, p_season_no integer) from public, anon, authenticated, service_role;
grant execute on function public.pm_reset_season_rows(p_team_id uuid, p_season_no integer) to service_role;

-- pm_respond_transfer_offer(p_team_id uuid, p_offer_id uuid, p_action text, p_counter_amount bigint)
CREATE OR REPLACE FUNCTION public.pm_respond_transfer_offer(p_team_id uuid, p_offer_id uuid, p_action text, p_counter_amount bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_offer public.pm_transfer_offers%rowtype;
  v_other uuid;
  v_result jsonb;
begin
  if p_action not in ('accept', 'reject', 'counter') then raise exception 'invalid_action'; end if;

  select * into v_offer from public.pm_transfer_offers where id = p_offer_id for update;
  if v_offer.id is null or v_offer.status <> 'pending' then raise exception 'offer_unavailable'; end if;
  if v_offer.awaiting_team_id is null or v_offer.awaiting_team_id <> p_team_id then raise exception 'not_your_turn'; end if;

  if p_action = 'reject' then
    update public.pm_transfer_offers
      set status = 'rejected', awaiting_team_id = null, updated_at = now()
      where id = p_offer_id;
    return jsonb_build_object('action', 'reject', 'offerId', p_offer_id);
  end if;

  if p_action = 'counter' then
    if p_counter_amount is null or p_counter_amount <= 0 then raise exception 'invalid_price'; end if;
    if p_counter_amount < public.pm_transfer_floor(v_offer.player_id) then raise exception 'price_below_floor'; end if;
    v_other := case when p_team_id = v_offer.from_team_id then v_offer.to_team_id else v_offer.from_team_id end;
    update public.pm_transfer_offers
      set amount_gel = p_counter_amount, awaiting_team_id = v_other, updated_at = now()
      where id = p_offer_id;
    return jsonb_build_object('action', 'counter', 'offerId', p_offer_id, 'amount', p_counter_amount, 'awaiting', v_other);
  end if;

  if v_offer.listing_id is null then raise exception 'listing_unavailable'; end if;
  v_result := public.pm_settle_transfer(v_offer.listing_id, v_offer.from_team_id, v_offer.amount_gel, 'negotiation');
  update public.pm_transfer_offers
    set status = 'accepted', awaiting_team_id = null, updated_at = now()
    where id = p_offer_id;
  return jsonb_build_object('action', 'accept', 'offerId', p_offer_id) || v_result;
end;
$function$;

revoke all on function public.pm_respond_transfer_offer(p_team_id uuid, p_offer_id uuid, p_action text, p_counter_amount bigint) from public, anon, authenticated, service_role;
grant execute on function public.pm_respond_transfer_offer(p_team_id uuid, p_offer_id uuid, p_action text, p_counter_amount bigint) to service_role;

-- pm_run_city_action(p_team_id uuid, p_sprite_key text, p_action text)
CREATE OR REPLACE FUNCTION public.pm_run_city_action(p_team_id uuid, p_sprite_key text, p_action text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_facility   public.pm_facilities%rowtype;
  v_gain       smallint := 0;
  v_reward     bigint   := 0;
  v_cost       bigint   := 0;
  v_new_status text;
  v_cur_week   smallint := 0;
  v_cur_day    smallint := 0;
begin
  if p_sprite_key not in ('arena','market','academy','training','finance','league','media') then
    raise exception 'invalid_facility';
  end if;

  perform public.pm_ensure_facilities(p_team_id);

  select week_no, day_no
    into v_cur_week, v_cur_day
    from public.pm_calendar
   where team_id = p_team_id;

  select * into v_facility
    from public.pm_facilities
   where team_id = p_team_id and sprite_key = p_sprite_key
     for update;

  if v_facility.status = 'locked' and p_action != 'facility_upgrade' then
    raise exception 'facility_locked';
  end if;

  if p_action = 'facility_upgrade' then
    v_cost := public.pm_facility_upgrade_cost(p_sprite_key, v_facility.level);
    perform public.pm_debit(p_team_id, v_cost, 'facility_upgrade:' || p_sprite_key);

    update public.pm_facilities
       set level      = least(10, level + 1),
           progress   = 0,
           status     = 'active',
           updated_at = now()
     where team_id = p_team_id and sprite_key = p_sprite_key
    returning * into v_facility;

  else
    if v_facility.last_action_week = v_cur_week
       and v_facility.last_action_day = v_cur_day then
      raise exception 'already_done_today';
    end if;

    v_gain := case p_action
      when 'arena_matchday'    then 18
      when 'market_scout'      then 14
      when 'academy_sign'      then 16
      when 'training_session'  then 12
      when 'finance_sponsor'   then 20
      when 'league_sim'        then 15
      when 'media_campaign'    then 22
      else 0
    end;

    v_reward := case p_action
      when 'finance_sponsor'  then 120000 + v_facility.level * 80000
      when 'media_campaign'   then 35000  + v_facility.level * 15000
      else 0
    end;

    v_new_status := case
      when least(100, v_facility.progress + v_gain) >= 100 then 'completed'
      when least(100, v_facility.progress + v_gain) >= 70  then 'upgradeable'
      else 'active'
    end;

    if v_reward > 0 then
      perform public.pm_credit(p_team_id, v_reward, p_action);
    end if;

    update public.pm_facilities
       set progress          = least(100, progress + v_gain),
           status            = v_new_status,
           last_action_week  = v_cur_week,
           last_action_day   = v_cur_day,
           updated_at        = now()
     where team_id = p_team_id and sprite_key = p_sprite_key
    returning * into v_facility;
  end if;

  return jsonb_build_object(
    'spriteKey', v_facility.sprite_key,
    'level',     v_facility.level,
    'progress',  v_facility.progress,
    'status',    v_facility.status,
    'reward',    v_reward,
    'cost',      v_cost
  );
end;
$function$;

revoke all on function public.pm_run_city_action(p_team_id uuid, p_sprite_key text, p_action text) from public, anon, authenticated, service_role;
grant execute on function public.pm_run_city_action(p_team_id uuid, p_sprite_key text, p_action text) to service_role;

-- pm_run_city_action_full(p_team_id uuid, p_sprite_key text, p_action text, p_user_id uuid, p_action_reward_bonus_pct numeric, p_season_reward_bonus_pct numeric, p_xp_base integer, p_training_xp_pct numeric, p_training_affected boolean, p_advance_days integer)
CREATE OR REPLACE FUNCTION public.pm_run_city_action_full(p_team_id uuid, p_sprite_key text, p_action text, p_user_id uuid, p_action_reward_bonus_pct numeric, p_season_reward_bonus_pct numeric, p_xp_base integer, p_training_xp_pct numeric, p_training_affected boolean, p_advance_days integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_action                jsonb;
  v_reward                bigint;
  v_season                jsonb := null;
  v_season_summary        jsonb;
  v_extra_credit          bigint := 0;
  v_xp                    integer := 0;
  v_calendar              jsonb;
  v_matchday_income_bonus bigint := 0;
begin
  v_action := public.pm_run_city_action(p_team_id, p_sprite_key, p_action);
  v_reward := coalesce((v_action->>'reward')::bigint, 0);

  if p_action = 'league_sim' then
    v_season := public.pm_simulate_league_round(p_team_id);
    v_season_summary := v_season -> 'seasonSummary';

    v_matchday_income_bonus := floor(
      coalesce((v_season->>'income')::numeric, 0) * coalesce(p_action_reward_bonus_pct, 0) / 100
    )::bigint;
    v_extra_credit := v_extra_credit + v_matchday_income_bonus;

    if v_season_summary is not null and v_season_summary <> 'null'::jsonb then
      v_extra_credit := v_extra_credit
        + floor(coalesce((v_season_summary->>'reward')::numeric, 0)
                * coalesce(p_season_reward_bonus_pct, 0) / 100)::bigint;
    end if;
  else
    v_extra_credit := v_extra_credit
      + floor(v_reward * coalesce(p_action_reward_bonus_pct, 0) / 100)::bigint;
  end if;

  if coalesce(p_xp_base, 0) > 0 then
    if coalesce(p_training_affected, false) and coalesce(p_training_xp_pct, 0) > 0 then
      v_xp := p_xp_base + round(p_xp_base * p_training_xp_pct / 100)::integer;
    else
      v_xp := p_xp_base;
    end if;
  end if;

  if v_xp > 0 then
    perform public.award_xp(p_user_id, v_xp);
  end if;
  if v_extra_credit > 0 then
    perform public.pm_credit(p_team_id, v_extra_credit, 'city_bonus:' || p_action);
  end if;

  v_calendar := public.pm_advance_time(p_team_id, greatest(1, coalesce(p_advance_days, 1)));

  return jsonb_build_object(
    'action', v_action,
    'season', v_season,
    'extraCredit', v_extra_credit,
    'xp', v_xp,
    'calendar', v_calendar
  );
end;
$function$;

revoke all on function public.pm_run_city_action_full(p_team_id uuid, p_sprite_key text, p_action text, p_user_id uuid, p_action_reward_bonus_pct numeric, p_season_reward_bonus_pct numeric, p_xp_base integer, p_training_xp_pct numeric, p_training_affected boolean, p_advance_days integer) from public, anon, authenticated, service_role;
grant execute on function public.pm_run_city_action_full(p_team_id uuid, p_sprite_key text, p_action text, p_user_id uuid, p_action_reward_bonus_pct numeric, p_season_reward_bonus_pct numeric, p_xp_base integer, p_training_xp_pct numeric, p_training_affected boolean, p_advance_days integer) to service_role;

-- pm_save_lineup_order(p_team_id uuid, p_lineup jsonb)
CREATE OR REPLACE FUNCTION public.pm_save_lineup_order(p_team_id uuid, p_lineup jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_player_id uuid;
  v_order smallint := 1;
begin
  if jsonb_typeof(p_lineup) <> 'array' then
    raise exception 'invalid_lineup';
  end if;

  if jsonb_array_length(p_lineup) = 0 then
    raise exception 'invalid_lineup';
  end if;

  if (
    select count(*)
    from (
      select distinct value::uuid as player_id
      from jsonb_array_elements_text(p_lineup)
    ) dedup
  ) <> jsonb_array_length(p_lineup) then
    raise exception 'duplicate_player';
  end if;

  for v_player_id in
    select value::uuid
    from jsonb_array_elements_text(p_lineup)
  loop
    update public.pm_squads
    set shirt_number = v_order
    where team_id = p_team_id and player_id = v_player_id;

    if not found then
      raise exception 'player_not_found';
    end if;

    v_order := v_order + 1;
  end loop;

  update public.pm_squads
  set shirt_number = v_order + id::smallint
  where team_id = p_team_id
    and player_id not in (
      select value::uuid
      from jsonb_array_elements_text(p_lineup)
    );

  return jsonb_build_object('saved', true, 'lineupSize', jsonb_array_length(p_lineup));
end;
$function$;

revoke all on function public.pm_save_lineup_order(p_team_id uuid, p_lineup jsonb) from public, anon, authenticated, service_role;
grant execute on function public.pm_save_lineup_order(p_team_id uuid, p_lineup jsonb) to service_role;

-- pm_save_match_settings(p_team_id uuid, p_tactical_style text, p_defensive_line text, p_tempo text, p_focus_side text)
CREATE OR REPLACE FUNCTION public.pm_save_match_settings(p_team_id uuid, p_tactical_style text, p_defensive_line text, p_tempo text, p_focus_side text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_settings public.pm_match_settings%rowtype;
begin
  perform public.pm_ensure_match_settings(p_team_id);

  update public.pm_match_settings
  set tactical_style = p_tactical_style, defensive_line = p_defensive_line, tempo = p_tempo, focus_side = p_focus_side, updated_at = now()
  where team_id = p_team_id
  returning * into v_settings;

  return jsonb_build_object(
    'tacticalStyle', v_settings.tactical_style,
    'defensiveLine', v_settings.defensive_line,
    'tempo', v_settings.tempo,
    'focusSide', v_settings.focus_side
  );
end;
$function$;

revoke all on function public.pm_save_match_settings(p_team_id uuid, p_tactical_style text, p_defensive_line text, p_tempo text, p_focus_side text) from public, anon, authenticated, service_role;
grant execute on function public.pm_save_match_settings(p_team_id uuid, p_tactical_style text, p_defensive_line text, p_tempo text, p_focus_side text) to service_role;

-- pm_save_ticket_price(p_team_id uuid, p_ticket_price integer)
CREATE OR REPLACE FUNCTION public.pm_save_ticket_price(p_team_id uuid, p_ticket_price integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_state public.pm_finance_state%rowtype;
begin
  if p_ticket_price < 10 or p_ticket_price > 80 then
    raise exception 'invalid_ticket_price';
  end if;

  perform public.pm_ensure_finance_state(p_team_id);

  update public.pm_finance_state
  set ticket_price = p_ticket_price, updated_at = now()
  where team_id = p_team_id
  returning * into v_state;

  return jsonb_build_object(
    'ticketPrice', v_state.ticket_price,
    'sponsorTier', v_state.sponsor_tier,
    'sponsorWeeklyAmount', v_state.sponsor_weekly_amount
  );
end;
$function$;

revoke all on function public.pm_save_ticket_price(p_team_id uuid, p_ticket_price integer) from public, anon, authenticated, service_role;
grant execute on function public.pm_save_ticket_price(p_team_id uuid, p_ticket_price integer) to service_role;

-- pm_sell_player(p_team_id uuid, p_player_id uuid)
CREATE OR REPLACE FUNCTION public.pm_sell_player(p_team_id uuid, p_player_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_player public.pm_players%rowtype;
  v_value bigint;
  v_sale bigint;
begin
  select * into v_player
  from public.pm_players
  where id = p_player_id and owner_id = p_team_id
  for update;

  if v_player.id is null then
    raise exception 'player_not_found';
  end if;

  v_value := v_player.current_transfer_value_gel;
  v_sale := greatest(0, floor(v_value * 0.85)::bigint);

  update public.pm_players
  set
    owner_id = null,
    age_started_total_days = case when is_real then null else age_started_total_days end,
    card_stats = coalesce(base_card_stats, card_stats),
    ovr_current = public.pm_player_overall_from_stats(
      upper(coalesce(nullif(primary_position, ''), 'CM')),
      coalesce(base_card_stats, card_stats),
      ovr_base
    )
  where id = p_player_id;

  delete from public.pm_squads
  where player_id = p_player_id and team_id = p_team_id;

  if v_sale > 0 then
    perform public.pm_credit(p_team_id, v_sale, 'transfer_sell:' || v_player.normalized_name);
  end if;

  return jsonb_build_object('playerId', v_player.id, 'amount', v_sale);
end;
$function$;

revoke all on function public.pm_sell_player(p_team_id uuid, p_player_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.pm_sell_player(p_team_id uuid, p_player_id uuid) to service_role;

-- pm_set_team_privacy(p_team_id uuid, p_hide_squad boolean, p_hide_wallet boolean, p_hide_transfers boolean, p_user_id uuid)
CREATE OR REPLACE FUNCTION public.pm_set_team_privacy(p_team_id uuid, p_hide_squad boolean, p_hide_wallet boolean, p_hide_transfers boolean, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_row public.pm_team_privacy%rowtype;
begin
  if not exists (
    select 1 from public.pm_teams where id = p_team_id and user_id = p_user_id
  ) then
    raise exception 'not_owner';
  end if;

  insert into public.pm_team_privacy (team_id, hide_squad, hide_wallet, hide_transfers)
  values (p_team_id, p_hide_squad, p_hide_wallet, p_hide_transfers)
  on conflict (team_id) do update set
    hide_squad = excluded.hide_squad,
    hide_wallet = excluded.hide_wallet,
    hide_transfers = excluded.hide_transfers,
    updated_at = now()
  returning * into v_row;

  return jsonb_build_object(
    'hideSquad', v_row.hide_squad,
    'hideWallet', v_row.hide_wallet,
    'hideTransfers', v_row.hide_transfers
  );
end;
$function$;

revoke all on function public.pm_set_team_privacy(p_team_id uuid, p_hide_squad boolean, p_hide_wallet boolean, p_hide_transfers boolean, p_user_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.pm_set_team_privacy(p_team_id uuid, p_hide_squad boolean, p_hide_wallet boolean, p_hide_transfers boolean, p_user_id uuid) to service_role;

-- pm_settle_transfer(p_listing_id uuid, p_buyer_team_id uuid, p_price bigint, p_via text)
CREATE OR REPLACE FUNCTION public.pm_settle_transfer(p_listing_id uuid, p_buyer_team_id uuid, p_price bigint, p_via text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_listing public.pm_transfer_listings%rowtype;
  v_player  public.pm_players%rowtype;
  v_pos     text;
  v_season  integer;
  v_pair    integer;
begin
  select * into v_listing from public.pm_transfer_listings where id = p_listing_id for update;
  if v_listing.id is null or v_listing.status <> 'active' then raise exception 'listing_unavailable'; end if;
  if v_listing.seller_team_id = p_buyer_team_id then raise exception 'own_listing'; end if;

  select * into v_player from public.pm_players where id = v_listing.player_id for update;
  if v_player.id is null or v_player.owner_id <> v_listing.seller_team_id then
    update public.pm_transfer_listings set status = 'cancelled' where id = p_listing_id;
    raise exception 'listing_unavailable';
  end if;

  if p_price < public.pm_transfer_floor(v_player.id) then raise exception 'price_below_floor'; end if;
  select season_no into v_season from public.pm_season_state where team_id = v_listing.seller_team_id;
  v_season := coalesce(v_season, 1);
  v_pair := public.pm_pair_transfers_this_season(v_listing.seller_team_id, p_buyer_team_id, v_season);
  if v_pair >= 2 then raise exception 'pair_transfer_cap'; end if;

  select position into v_pos
  from public.pm_squads
  where player_id = v_player.id and team_id = v_listing.seller_team_id
  limit 1;
  v_pos := coalesce(v_pos, nullif(v_player.primary_position, ''), 'CM');
  if v_pos not in ('GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST') then v_pos := 'CM'; end if;

  perform public.pm_debit(p_buyer_team_id, p_price, 'transfer_in:' || v_player.normalized_name);
  perform public.pm_credit(v_listing.seller_team_id, p_price, 'transfer_out:' || v_player.normalized_name);

  delete from public.pm_squads where player_id = v_player.id;
  update public.pm_players set owner_id = p_buyer_team_id where id = v_player.id;
  insert into public.pm_squads (team_id, player_id, position)
    values (p_buyer_team_id, v_player.id, v_pos)
    on conflict (player_id) do nothing;

  update public.pm_transfer_listings set status = 'sold', sold_at = now() where id = p_listing_id;

  update public.pm_transfer_offers
    set status = 'rejected', awaiting_team_id = null, updated_at = now()
    where player_id = v_player.id and status = 'pending';

  insert into public.pm_transfer_ledger (player_id, seller_team_id, buyer_team_id, price, season_no, via)
    values (v_player.id, v_listing.seller_team_id, p_buyer_team_id, p_price, v_season, p_via);

  return jsonb_build_object(
    'playerId', v_player.id,
    'playerName', v_player.normalized_name,
    'price', p_price,
    'sellerTeamId', v_listing.seller_team_id,
    'buyerTeamId', p_buyer_team_id
  );
end;
$function$;

revoke all on function public.pm_settle_transfer(p_listing_id uuid, p_buyer_team_id uuid, p_price bigint, p_via text) from public, anon, authenticated, service_role;
grant execute on function public.pm_settle_transfer(p_listing_id uuid, p_buyer_team_id uuid, p_price bigint, p_via text) to service_role;

-- pm_sign_academy_player(p_team_id uuid, p_player jsonb, p_cost bigint)
CREATE OR REPLACE FUNCTION public.pm_sign_academy_player(p_team_id uuid, p_player jsonb, p_cost bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_player_id uuid;
  v_position text;
begin
  if p_cost < 0 then raise exception 'invalid_price'; end if;
  v_position := coalesce(p_player->>'position', 'CM');
  if v_position not in ('GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST') then
    raise exception 'invalid_position';
  end if;

  if p_cost > 0 then
    perform public.pm_debit(p_team_id, p_cost, 'academy_signing');
  end if;

  insert into public.pm_players (
    normalized_name, display_name, talent, ovr_base, ovr_current, age, owner_id
  ) values (
    p_player->>'normalized_name',
    p_player->>'display_name',
    (p_player->>'talent')::smallint,
    (p_player->>'ovr_base')::smallint,
    (p_player->>'ovr_base')::smallint,
    (p_player->>'age')::smallint,
    p_team_id
  )
  returning id into v_player_id;

  insert into public.pm_squads (team_id, player_id, position)
  values (p_team_id, v_player_id, v_position)
  on conflict (player_id) do nothing;

  return jsonb_build_object('playerId', v_player_id, 'cost', p_cost);
end;
$function$;

revoke all on function public.pm_sign_academy_player(p_team_id uuid, p_player jsonb, p_cost bigint) from public, anon, authenticated, service_role;
grant execute on function public.pm_sign_academy_player(p_team_id uuid, p_player jsonb, p_cost bigint) to service_role;

-- pm_sign_academy_prospect(p_team_id uuid, p_prospect_id uuid)
CREATE OR REPLACE FUNCTION public.pm_sign_academy_prospect(p_team_id uuid, p_prospect_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_prospect public.pm_academy_prospects%rowtype;
  v_player_id uuid;
  v_updated integer;
begin
  select * into v_prospect
  from public.pm_academy_prospects
  where id = p_prospect_id and team_id = p_team_id and status = 'active'
  for update;

  if v_prospect.id is null then
    raise exception 'player_not_found';
  end if;

  if v_prospect.signing_cost > 0 then
    perform public.pm_debit(p_team_id, v_prospect.signing_cost, 'academy_signing');
  end if;

  if v_prospect.player_id is not null then
    update public.pm_players
    set owner_id = p_team_id, age = 15, status = 'active'
    where id = v_prospect.player_id and owner_id is null;
    get diagnostics v_updated = row_count;
    if v_updated = 0 then
      raise exception 'player_unavailable';
    end if;
    v_player_id := v_prospect.player_id;
  else
    insert into public.pm_players (
      normalized_name, display_name, talent, ovr_base, ovr_current, age, owner_id
    ) values (
      v_prospect.normalized_name,
      v_prospect.display_name,
      v_prospect.talent,
      v_prospect.ovr_base,
      v_prospect.ovr_base,
      v_prospect.age,
      p_team_id
    )
    returning id into v_player_id;
  end if;

  insert into public.pm_squads (team_id, player_id, position)
  values (p_team_id, v_player_id, v_prospect.position)
  on conflict (player_id) do nothing;

  update public.pm_academy_prospects set status = 'signed' where id = p_prospect_id;

  return jsonb_build_object('playerId', v_player_id, 'cost', v_prospect.signing_cost, 'position', v_prospect.position);
end;
$function$;

revoke all on function public.pm_sign_academy_prospect(p_team_id uuid, p_prospect_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.pm_sign_academy_prospect(p_team_id uuid, p_prospect_id uuid) to service_role;

-- pm_staff_hire_cost(p_role_key text)
CREATE OR REPLACE FUNCTION public.pm_staff_hire_cost(p_role_key text)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select case p_role_key
    when 'head_coach' then 140000
    when 'gk_coach' then 95000
    when 'defence_coach' then 100000
    when 'midfield_coach' then 104000
    when 'attack_coach' then 108000
    when 'scout' then 88000
    when 'youth_scout' then 92000
    when 'doctor' then 120000
    when 'physiotherapist' then 98000
    when 'psychologist' then 90000
    when 'finance_manager' then 110000
    when 'set_piece_coach' then 96000
    else 0
  end;
$function$;

revoke all on function public.pm_staff_hire_cost(p_role_key text) from public, anon, authenticated, service_role;
grant execute on function public.pm_staff_hire_cost(p_role_key text) to service_role;

-- pm_swap_squad_players(p_team_id uuid, p_active_id bigint, p_unassigned_id bigint)
CREATE OR REPLACE FUNCTION public.pm_swap_squad_players(p_team_id uuid, p_active_id bigint, p_unassigned_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_active_player uuid;
  v_unassigned_player uuid;
begin
  if p_active_id = p_unassigned_id then
    raise exception 'invalid_swap';
  end if;

  select player_id into v_active_player
  from public.pm_squads
  where id = p_active_id and team_id = p_team_id;
  if not found then
    raise exception 'player_not_found';
  end if;

  select player_id into v_unassigned_player
  from public.pm_squads
  where id = p_unassigned_id and team_id = p_team_id;
  if not found then
    raise exception 'player_not_found';
  end if;

  set constraints pm_squads_player_uniq deferred;

  update public.pm_squads set player_id = v_unassigned_player
  where id = p_active_id and team_id = p_team_id;

  update public.pm_squads set player_id = v_active_player
  where id = p_unassigned_id and team_id = p_team_id;

  return jsonb_build_object(
    'swapped', true,
    'activeSlot', p_active_id,
    'unassignedSlot', p_unassigned_id
  );
end;
$function$;

revoke all on function public.pm_swap_squad_players(p_team_id uuid, p_active_id bigint, p_unassigned_id bigint) from public, anon, authenticated, service_role;
grant execute on function public.pm_swap_squad_players(p_team_id uuid, p_active_id bigint, p_unassigned_id bigint) to service_role;

-- pm_sync_player_transfer_values()
CREATE OR REPLACE FUNCTION public.pm_sync_player_transfer_values()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if new.is_real then
    new.ea_fc_ovr := coalesce(new.ea_fc_ovr, new.ovr_base);
    new.ovr_source := 'ea_fc';
    new.ovr_base := new.ea_fc_ovr;
    if new.ovr_current is null or new.ovr_current < new.ovr_base then
      new.ovr_current := new.ovr_base;
    end if;
  else
    new.ea_fc_ovr := null;
    new.ovr_source := 'generated';
  end if;

  new.base_transfer_value_gel := public.pm_player_base_transfer_value_gel(new.ovr_base);
  new.current_transfer_value_gel :=
    public.pm_player_current_transfer_value_gel(new.ovr_base, new.ovr_current);

  return new;
end;
$function$;

revoke all on function public.pm_sync_player_transfer_values() from public, anon, authenticated, service_role;
grant execute on function public.pm_sync_player_transfer_values() to service_role;

-- pm_team_match_profile(p_team_id uuid)
CREATE OR REPLACE FUNCTION public.pm_team_match_profile(p_team_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with recursive settings as (
    select
      coalesce(ms.tactical_style, 'balanced') as tactical_style,
      coalesce(ms.defensive_line, 'mid') as defensive_line,
      coalesce(ms.tempo, 'balanced') as tempo,
      coalesce(ms.focus_side, 'center') as focus_side
    from (select p_team_id as team_id) seed
    left join public.pm_match_settings ms on ms.team_id = seed.team_id
  ),
  skill as (
    select 1 + (coalesce(avg(coalesce(p.skill_moves, 3)), 3) - 3) * 0.015 as mult
    from public.pm_squads s
    join public.pm_players p on p.id = s.player_id
    where s.team_id = p_team_id and coalesce(s.shirt_number, 99) <= 11
  ),
  weak_foot as (
    select 1 + (coalesce(avg(coalesce(p.weak_foot, 3)), 3) - 3) * 0.008 as mult
    from public.pm_squads s
    join public.pm_players p on p.id = s.player_id
    where s.team_id = p_team_id and coalesce(s.shirt_number, 99) <= 11
  ),
  squad as (
    select
      coalesce(s.shirt_number, 99) as shirt,
      upper(coalesce(s.position, p.primary_position, 'CM')) as slot,
      coalesce(p.primary_position, s.position, 'CM') as natural_pos,
      p.id,
      p.display_name,
      coalesce(p.traits, '{}'::text[]) as traits,
      coalesce(p.ovr_current, 60)::numeric as ovr,
      coalesce(p.tac, 60)::numeric as tac,
      coalesce(p.fatigue, 0)::numeric as fatigue,
      coalesce(p.morale, 70)::numeric as morale,
      coalesce(p.injury_matches, 0) as injury_matches,
      coalesce(p.status, 'active') as status,
      (coalesce(p.injury_matches, 0) > 0 or coalesce(p.status, 'active') = 'injured') as unavailable,
      coalesce(p.card_stats, public.pm_player_seed_card_stats(upper(coalesce(s.position, p.primary_position, 'CM')), coalesce(p.ovr_current, 60)::smallint)) as stats,
      coalesce(p.behavioral, '{}'::jsonb) as behavioral
    from public.pm_squads s
    join public.pm_players p on p.id = s.player_id
    where s.team_id = p_team_id
  ),
  nominal_xi as (
    select * from squad where shirt <= 11
  ),
  assistant as (
    select coalesce(max(level), 0)::int as lvl
    from public.pm_staff
    where team_id = p_team_id and role_key = 'head_coach'
  ),
  gaps as (
    select *, row_number() over (order by ovr asc, id) as gap_rn
    from nominal_xi
    where unavailable
  ),
  bench_pool as (
    select *, row_number() over (order by ovr desc, id) as rn
    from squad
    where shirt > 11 and not unavailable
  ),
  assign as (
    select
      g.gap_rn, g.slot, g.display_name as out_name,
      pick.id as in_id, pick.display_name as in_name, pick.natural_pos as in_natural,
      pick.traits as in_traits, pick.ovr as in_ovr, pick.tac as in_tac,
      pick.fatigue as in_fatigue, pick.morale as in_morale, pick.stats as in_stats,
      pick.behavioral as in_behavioral,
      array[pick.id] as used
    from gaps g
    cross join lateral (
      select b.*
      from bench_pool b
      order by
        (case when g.gap_rn <= (select lvl from assistant)
              then public.pm_position_fit(b.natural_pos, g.slot) else 0 end) desc,
        b.ovr desc, b.id
      limit 1
    ) pick
    where g.gap_rn = 1
    union all
    select
      g.gap_rn, g.slot, g.display_name,
      pick.id, pick.display_name, pick.natural_pos, pick.traits, pick.ovr,
      pick.tac, pick.fatigue, pick.morale, pick.stats,
      pick.behavioral,
      a.used || pick.id
    from assign a
    join gaps g on g.gap_rn = a.gap_rn + 1
    cross join lateral (
      select b.*
      from bench_pool b
      where b.id <> all(a.used)
      order by
        (case when g.gap_rn <= (select lvl from assistant)
              then public.pm_position_fit(b.natural_pos, g.slot) else 0 end) desc,
        b.ovr desc, b.id
      limit 1
    ) pick
  ),
  used_ids as (
    select coalesce(array_agg(in_id), '{}'::uuid[]) as ids from assign
  ),
  rotation as (
    select
      tired.slot, tired.id as out_id, tired.display_name as out_name,
      fresh.display_name as in_name, fresh.natural_pos as in_natural, fresh.traits as in_traits,
      fresh.ovr as in_ovr, fresh.tac as in_tac, fresh.fatigue as in_fatigue,
      fresh.morale as in_morale, fresh.stats as in_stats, fresh.behavioral as in_behavioral
    from (
      select n.* from nominal_xi n
      where not n.unavailable and n.fatigue >= 80 and (select lvl from assistant) >= 5
      order by n.fatigue desc, n.id
      limit 1
    ) tired
    cross join lateral (
      select b.* from bench_pool b, used_ids u
      where b.id <> all(u.ids)
      order by public.pm_position_fit(b.natural_pos, tired.slot) desc,
               (b.ovr - least(24, b.fatigue * 0.28)) desc, b.id
      limit 1
    ) fresh
    where (fresh.ovr - least(24, fresh.fatigue * 0.28)) > (tired.ovr - least(24, tired.fatigue * 0.28))
  ),
  subs as (
    select slot, out_name, in_name, in_natural, in_traits, in_ovr, in_tac, in_fatigue, in_morale, in_stats, in_behavioral from assign
    union all
    select slot, out_name, in_name, in_natural, in_traits, in_ovr, in_tac, in_fatigue, in_morale, in_stats, in_behavioral from rotation
  ),
  effective as (
    select n.slot, n.natural_pos, n.traits, n.ovr, n.tac, n.fatigue, n.morale, n.injury_matches, n.status, n.stats, n.behavioral
    from nominal_xi n
    where not n.unavailable and n.id not in (select out_id from rotation)
    union all
    select slot, in_natural, in_traits, in_ovr, in_tac, in_fatigue, in_morale, 0, 'active', in_stats, in_behavioral
    from subs
    union all
    select g.slot, g.natural_pos, g.traits, g.ovr, g.tac, g.fatigue, g.morale, g.injury_matches, g.status, g.stats, g.behavioral
    from gaps g
    where g.gap_rn not in (select gap_rn from assign)
  ),
  starters as (
    select
      slot as pos,
      traits,
      behavioral,
      public.pm_position_fit(natural_pos, slot) as pos_fit,
      ovr,
      tac,
      fatigue,
      morale,
      injury_matches,
      status,
      stats
    from effective
  ),
  rated as (
    select
      pos,
      tac,
      pos_fit,
      greatest(20, least(105, ovr - least(24, fatigue * 0.28) + greatest(-5, least(6, (morale - 70) * 0.12)) - case when injury_matches > 0 or status = 'injured' then 18 else 0 end) * pos_fit) as eff_ovr,
      greatest(20, least(105, coalesce((stats->>'PAC')::numeric, ovr) - least(24, fatigue * 0.28) + greatest(-5, least(6, (morale - 70) * 0.12)) - case when injury_matches > 0 or status = 'injured' then 18 else 0 end) * pos_fit) as pac,
      greatest(20, least(105, coalesce((stats->>'SHO')::numeric, ovr) - least(24, fatigue * 0.28) + greatest(-5, least(6, (morale - 70) * 0.12)) - case when injury_matches > 0 or status = 'injured' then 18 else 0 end) * pos_fit) as sho,
      greatest(20, least(105, coalesce((stats->>'PAS')::numeric, ovr) - least(24, fatigue * 0.28) + greatest(-5, least(6, (morale - 70) * 0.12)) - case when injury_matches > 0 or status = 'injured' then 18 else 0 end) * pos_fit) as pas,
      greatest(20, least(105, coalesce((stats->>'DRI')::numeric, ovr) - least(24, fatigue * 0.28) + greatest(-5, least(6, (morale - 70) * 0.12)) - case when injury_matches > 0 or status = 'injured' then 18 else 0 end) * pos_fit) as dri,
      greatest(20, least(105, coalesce((stats->>'DEF')::numeric, ovr) - least(24, fatigue * 0.28) + greatest(-5, least(6, (morale - 70) * 0.12)) - case when injury_matches > 0 or status = 'injured' then 18 else 0 end) * pos_fit) as def,
      greatest(20, least(105, coalesce((stats->>'PHY')::numeric, ovr) - least(24, fatigue * 0.28) + greatest(-5, least(6, (morale - 70) * 0.12)) - case when injury_matches > 0 or status = 'injured' then 18 else 0 end) * pos_fit) as phy,
      greatest(20, least(105, (
        coalesce((stats->>'DIV')::numeric, ovr)
        + coalesce((stats->>'HAN')::numeric, ovr)
        + coalesce((stats->>'REF')::numeric, ovr)
        + coalesce((stats->>'POS')::numeric, ovr)
      ) / 4 - least(24, fatigue * 0.28) + greatest(-5, least(6, (morale - 70) * 0.12)) - case when injury_matches > 0 or status = 'injured' then 18 else 0 end) * pos_fit) as gk
    from starters
  ),
  lanes as (
    select
      pos,
      eff_ovr,
      case
        when pos in ('ST','CF') then sho * 0.42 + pac * 0.18 + dri * 0.24 + phy * 0.16
        else sho * 0.22 + pac * 0.22 + dri * 0.28 + pas * 0.28
      end as attack,
      case
        when pos in ('LW','RW','LM','RM','LB','RB') then pac * 0.36 + dri * 0.3 + pas * 0.18 + def * 0.16
        else pac * 0.2 + dri * 0.25 + pas * 0.25 + sho * 0.3
      end as wing,
      case
        when pos in ('ST','CF','CAM','CM','CDM') then sho * 0.26 + pas * 0.25 + dri * 0.25 + phy * 0.24
        else sho * 0.18 + pas * 0.24 + dri * 0.22 + phy * 0.18 + def * 0.18
      end as central,
      case
        when pos in ('CDM','CM','CAM','LM','RM') then pas * 0.34 + dri * 0.24 + def * 0.2 + phy * 0.14 + pac * 0.08
        else pas * 0.25 + dri * 0.2 + def * 0.25 + phy * 0.2 + pac * 0.1
      end as midfield,
      case
        when pos in ('CB','LB','RB','CDM') then def * 0.42 + phy * 0.24 + pac * 0.18 + pas * 0.08 + dri * 0.08
        else def * 0.34 + phy * 0.24 + pac * 0.18 + pas * 0.12 + dri * 0.12
      end as defense,
      case when pos = 'GK' then gk else null end as keeper
    from rated
  ),
  trait_bonus as (
    select
      least(7, coalesce(sum(case when 'poacher' = any(traits) then 2.5 else 0 end), 0)
             + coalesce(sum(case when 'magician' = any(traits) then 1.0 else 0 end), 0)) as attack_b,
      least(6, coalesce(sum(case when 'speedster' = any(traits) then 2.0 else 0 end), 0)
             + coalesce(sum(case when 'magician' = any(traits) then 1.0 else 0 end), 0)) as wing_b,
      least(6, coalesce(sum(case when 'playmaker' = any(traits) then 2.0 else 0 end), 0)
             + coalesce(sum(case when 'magician' = any(traits) then 1.5 else 0 end), 0)) as central_b,
      least(6, coalesce(sum(case when 'playmaker' = any(traits) then 2.0 else 0 end), 0)
             + coalesce(sum(case when 'engine' = any(traits) then 1.5 else 0 end), 0)
             + coalesce(sum(case when 'rock' = any(traits) then 0.5 else 0 end), 0)) as midfield_b,
      least(7, coalesce(sum(case when 'wall' = any(traits) then 2.5 else 0 end), 0)
             + coalesce(sum(case when 'rock' = any(traits) then 1.5 else 0 end), 0)) as defense_b,
      least(5, coalesce(sum(case when 'leader' = any(traits) then 2.0 else 0 end), 0)
             + coalesce(sum(case when 'engine' = any(traits) then 0.5 else 0 end), 0)) as readiness_b
    from starters
  ),
  behavioral_bonus as (
    select
      greatest(-5, least(5, (coalesce(avg((behavioral->>'composure')::numeric), 60) - 60) * 0.10)) as composure_b,
      greatest(-5, least(5, (coalesce(avg((behavioral->>'vision')::numeric), 60) - 60) * 0.10)) as vision_b,
      greatest(-5, least(5, (coalesce(avg((behavioral->>'positioning')::numeric), 60) - 60) * 0.10)) as positioning_b,
      greatest(-5, least(5, (coalesce(avg((behavioral->>'aggression')::numeric), 60) - 60) * 0.10)) as aggression_mid_b,
      greatest(-2, least(2, (coalesce(avg((behavioral->>'aggression')::numeric), 60) - 60) * 0.03)) as aggression_def_pen,
      greatest(-4, least(4, (coalesce(avg((behavioral->>'stamina')::numeric), 60) - 60) * 0.08)) as stamina_b
    from starters
  ),
  raw_profile as (
    select
      coalesce(avg(attack) filter (where pos in ('ST','CF','LW','RW','CAM','LM','RM')), avg(attack), 60) as attack,
      coalesce(avg(wing), 60) as wing,
      coalesce(avg(central), 60) as central,
      coalesce(avg(midfield) filter (where pos in ('CDM','CM','CAM','LM','RM')), avg(midfield), 60) as midfield,
      coalesce(avg(defense) filter (where pos in ('CB','LB','RB','CDM')), avg(defense), 60) as defense,
      coalesce(avg(keeper), avg(eff_ovr), 60) as keeper,
      greatest(35, least(100, coalesce(avg(eff_ovr), 60))) as readiness
    from lanes
  ),
  stat_avg as (
    select
      coalesce(avg(tac) filter (where pos <> 'GK'), avg(tac), 60) as tac,
      coalesce(avg(pac) filter (where pos <> 'GK'), avg(pac), 60) as pac,
      coalesce(avg(sho) filter (where pos <> 'GK'), avg(sho), 60) as sho,
      coalesce(avg(pas) filter (where pos <> 'GK'), avg(pas), 60) as pas,
      coalesce(avg(dri) filter (where pos <> 'GK'), avg(dri), 60) as dri,
      coalesce(avg(def) filter (where pos <> 'GK'), avg(def), 60) as def,
      coalesce(avg(phy) filter (where pos <> 'GK'), avg(phy), 60) as phy,
      coalesce(avg(pac) filter (where pos in ('CB','LB','RB','LWB','RWB','CDM')), avg(pac) filter (where pos <> 'GK'), 60) as def_pac,
      coalesce(avg(pos_fit), 1.0) as position_fit
    from rated
  ),
  adjusted as (
    select
      raw_profile.attack + trait_bonus.attack_b + behavioral_bonus.composure_b
        + case when settings.tactical_style = 'pressing' then 3 when settings.tactical_style = 'counter' then 2 else 0 end
        + case when settings.defensive_line = 'high' then 2 when settings.defensive_line = 'low' then -2 else 0 end
        + case when settings.tempo = 'direct' then 3 when settings.tempo = 'controlled' then -1 else 0 end as attack,
      raw_profile.wing + trait_bonus.wing_b
        + case when settings.tactical_style = 'counter' then 5 else 0 end
        + case when settings.tempo = 'direct' then 2 else 0 end
        + case when settings.focus_side in ('left','right') then 3 else 0 end as wing,
      raw_profile.central + trait_bonus.central_b + behavioral_bonus.vision_b
        + case when settings.tactical_style = 'possession' then 2 else 0 end
        + case when settings.focus_side = 'center' then 3 else 0 end as central,
      raw_profile.midfield + trait_bonus.midfield_b + behavioral_bonus.aggression_mid_b
        + case when settings.tactical_style = 'pressing' then 4 when settings.tactical_style = 'possession' then 5 when settings.tactical_style = 'counter' then -2 else 0 end
        + case when settings.defensive_line = 'high' then 2 else 0 end
        + case when settings.tempo = 'controlled' then 3 when settings.tempo = 'direct' then -2 else 0 end as midfield,
      raw_profile.defense + trait_bonus.defense_b + behavioral_bonus.positioning_b - behavioral_bonus.aggression_def_pen
        + case when settings.tactical_style = 'pressing' then -2 when settings.tactical_style = 'possession' then 1 else 0 end
        + case when settings.defensive_line = 'high' then -4 when settings.defensive_line = 'low' then 5 else 0 end
        + case when settings.tempo = 'controlled' then 2 else 0 end as defense,
      raw_profile.keeper,
      greatest(35, least(100, raw_profile.readiness + trait_bonus.readiness_b + behavioral_bonus.stamina_b)) as readiness,
      case
        when settings.tactical_style = 'pressing' then 3
        when settings.tactical_style in ('possession','counter') then 2
        else 0
      end as tactical_fit
    from raw_profile, settings, trait_bonus, behavioral_bonus
  )
  select jsonb_build_object(
    'attack', round(attack * (select mult from skill) * (select mult from weak_foot), 2),
    'wing', round(wing * (select mult from skill), 2),
    'central', round(central * (select mult from skill), 2),
    'midfield', round(midfield, 2),
    'defense', round(defense, 2),
    'keeper', round(keeper, 2),
    'readiness', round(readiness, 2),
    'tacticalFit', tactical_fit,
    'positionFit', round(stat_avg.position_fit, 3),
    'autoSubs', (
      select coalesce(
        jsonb_agg(jsonb_build_object('out', out_name, 'in', in_name, 'slot', slot)),
        '[]'::jsonb
      )
      from subs
    ),
    'traits', (
      select coalesce(
        jsonb_agg(jsonb_build_object('key', tr, 'count', cnt) order by cnt desc, tr),
        '[]'::jsonb
      )
      from (
        select t.tr, count(*) as cnt
        from starters s, unnest(s.traits) t(tr)
        group by t.tr
      ) z
    ),
    'stats', jsonb_build_object(
      'tac', round(stat_avg.tac, 1),
      'pac', round(stat_avg.pac, 2),
      'sho', round(stat_avg.sho, 2),
      'pas', round(stat_avg.pas, 2),
      'dri', round(stat_avg.dri, 2),
      'def', round(stat_avg.def, 2),
      'phy', round(stat_avg.phy, 2),
      'defPac', round(stat_avg.def_pac, 2)
    )
  )
  from adjusted, stat_avg;
$function$;

revoke all on function public.pm_team_match_profile(p_team_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.pm_team_match_profile(p_team_id uuid) to service_role;

-- pm_toggle_market_shortlist(p_team_id uuid, p_player_key text)
CREATE OR REPLACE FUNCTION public.pm_toggle_market_shortlist(p_team_id uuid, p_player_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_exists boolean;
begin
  select exists(
    select 1
    from public.pm_market_shortlist
    where team_id = p_team_id and player_key = p_player_key
  ) into v_exists;

  if v_exists then
    delete from public.pm_market_shortlist
    where team_id = p_team_id and player_key = p_player_key;
    return jsonb_build_object('shortlisted', false, 'playerKey', p_player_key);
  end if;

  insert into public.pm_market_shortlist (team_id, player_key)
  values (p_team_id, p_player_key)
  on conflict do nothing;

  return jsonb_build_object('shortlisted', true, 'playerKey', p_player_key);
end;
$function$;

revoke all on function public.pm_toggle_market_shortlist(p_team_id uuid, p_player_key text) from public, anon, authenticated, service_role;
grant execute on function public.pm_toggle_market_shortlist(p_team_id uuid, p_player_key text) to service_role;

-- pm_train_player(p_team_id uuid, p_player_id uuid)
CREATE OR REPLACE FUNCTION public.pm_train_player(p_team_id uuid, p_player_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_player public.pm_players%rowtype;
  v_squad_position text;
  v_position text;
  v_staff_training_pct integer := 0;
  v_session_xp_grant integer;
  v_old_ovr smallint;
  v_pending_ovr smallint;
  v_new_ovr smallint;
  v_cap_ovr smallint;
  v_focus text[];
  v_label text;
  v_current_value integer;
  v_stat_gain integer := 0;
  v_candidate jsonb;
  v_candidate_ovr smallint;
  v_pending jsonb;
  v_improved_stats text[] := '{}';
  v_budget integer;
  v_cost integer;
  v_raised boolean;
  v_matches_played integer;
begin
  select p.*
  into v_player
  from public.pm_players p
  join public.pm_squads s on s.player_id = p.id
  where p.id = p_player_id and s.team_id = p_team_id
  for update;

  if v_player.id is null then
    raise exception 'player_not_found';
  end if;

  select s.position
  into v_squad_position
  from public.pm_squads s
  where s.player_id = p_player_id and s.team_id = p_team_id
  order by s.id asc
  limit 1;

  if v_player.status != 'active' or coalesce(v_player.injury_matches, 0) > 0 then
    raise exception 'player_unavailable';
  end if;

  v_matches_played := public.pm_team_match_count(p_team_id);

  if coalesce(v_player.last_train_match, -1) = v_matches_played then
    raise exception 'already_trained_this_match';
  end if;

  v_position := upper(coalesce(nullif(v_player.primary_position, ''), v_squad_position, 'CM'));

  select coalesce(sum(
    case
      when s.role_key = 'gk_coach' and v_position = 'GK' then s.level * 6
      when s.role_key = 'defence_coach' and v_position in ('CB', 'LB', 'RB') then s.level * 5
      when s.role_key = 'midfield_coach' and v_position in ('CDM', 'CM', 'CAM', 'AM', 'LM', 'RM') then s.level * 5
      when s.role_key = 'attack_coach' and v_position in ('LW', 'RW', 'ST', 'CF') then s.level * 5
      else 0
    end
  ), 0)::integer
  into v_staff_training_pct
  from public.pm_staff s
  where s.team_id = p_team_id;

  v_session_xp_grant := 25 + round(least(30, v_staff_training_pct)::numeric / 5.0);

  v_old_ovr := v_player.ovr_current;
  v_cap_ovr := v_player.ovr_base + public.pm_player_ovr_growth_cap(v_player.talent);

  v_pending := coalesce(
    v_player.pending_card_stats,
    v_player.card_stats,
    v_player.base_card_stats,
    public.pm_player_seed_card_stats(v_position, v_player.ovr_base)
  );
  if jsonb_typeof(v_pending) = 'string' then
    begin
      v_pending := (v_pending #>> '{}')::jsonb;
    exception when others then
      v_pending := public.pm_player_seed_card_stats(v_position, coalesce(v_player.ovr_base, v_player.ovr_current, 60)::smallint);
    end;
  end if;
  if jsonb_typeof(v_pending) is distinct from 'object' then
    v_pending := public.pm_player_seed_card_stats(v_position, coalesce(v_player.ovr_base, v_player.ovr_current, 60)::smallint);
  end if;

  v_pending_ovr := public.pm_player_overall_from_stats(v_position, v_pending, v_old_ovr);
  if v_pending_ovr >= v_cap_ovr then
    raise exception 'player_maxed';
  end if;

  v_budget := coalesce(v_player.xp, 0) + v_session_xp_grant;
  v_focus := public.pm_player_training_focus(v_position);

  loop
    v_raised := false;
    foreach v_label in array v_focus loop
      v_current_value := coalesce((v_pending ->> v_label)::integer, 35);
      if v_current_value >= 99 then
        continue;
      end if;

      v_candidate := jsonb_set(v_pending, array[v_label], to_jsonb(v_current_value + 1), true);
      v_candidate_ovr := public.pm_player_overall_from_stats(v_position, v_candidate, v_old_ovr);
      if v_candidate_ovr > v_cap_ovr then
        continue;
      end if;

      v_cost := 50 + v_current_value * 3;
      if v_budget >= v_cost then
        v_budget := v_budget - v_cost;
        v_pending := v_candidate;
        v_stat_gain := v_stat_gain + 1;
        v_improved_stats := array_append(v_improved_stats, v_label);
        v_raised := true;
      end if;
    end loop;
    exit when not v_raised;
  end loop;

  v_new_ovr := public.pm_player_overall_from_stats(v_position, v_pending, v_old_ovr);

  update public.pm_players
  set
    pending_card_stats = v_pending,
    xp = v_budget,
    last_train_match = v_matches_played,
    fatigue = least(100, fatigue + 8),
    morale = least(100, morale + 3)
  where id = p_player_id;

  return jsonb_build_object(
    'playerId', p_player_id,
    'ovrCurrent', v_old_ovr,
    'pendingOvr', v_new_ovr,
    'upgradable', v_new_ovr > v_old_ovr,
    'statGain', v_stat_gain,
    'improvedStats', v_improved_stats,
    'xpGranted', v_session_xp_grant,
    'xpBanked', v_budget,
    'staffTrainingBonusPct', v_staff_training_pct,
    'matchesPlayed', v_matches_played
  );
end;
$function$;

revoke all on function public.pm_train_player(p_team_id uuid, p_player_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.pm_train_player(p_team_id uuid, p_player_id uuid) to service_role;

-- purchase_shop_item(p_id uuid)
CREATE OR REPLACE FUNCTION public.purchase_shop_item(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$ BEGIN END; $function$;

revoke all on function public.purchase_shop_item(p_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.purchase_shop_item(p_id uuid) to authenticated;
grant execute on function public.purchase_shop_item(p_id uuid) to service_role;

-- purchase_shop_item_as(p_user_id uuid, p_item_id uuid)
CREATE OR REPLACE FUNCTION public.purchase_shop_item_as(p_user_id uuid, p_item_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_item record;
  v_nc_balance integer;
  v_pro_balance integer;
  v_exists boolean;
begin
  if p_user_id is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select *
  into v_item
  from public.shop_items
  where id = p_item_id
    and is_active = true;

  if not found then
    return jsonb_build_object('success', false, 'error', 'item_not_found');
  end if;

  select exists (
    select 1
    from public.user_purchases
    where user_id = p_user_id
      and item_id = p_item_id
  ) into v_exists;

  if v_exists then
    return jsonb_build_object('success', false, 'error', 'already_owned');
  end if;

  select nc_balance, pro_balance
  into v_nc_balance, v_pro_balance
  from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'insufficient_funds');
  end if;

  if v_item.cost_currency = 'nc' then
    if coalesce(v_nc_balance, 0) < v_item.cost_amount then
      return jsonb_build_object('success', false, 'error', 'insufficient_funds');
    end if;

    update public.wallets
    set nc_balance = nc_balance - v_item.cost_amount,
        updated_at = now()
    where user_id = p_user_id;
  else
    if coalesce(v_pro_balance, 0) < v_item.cost_amount then
      return jsonb_build_object('success', false, 'error', 'insufficient_funds');
    end if;

    update public.wallets
    set pro_balance = pro_balance - v_item.cost_amount,
        updated_at = now()
    where user_id = p_user_id;
  end if;

  insert into public.wallet_transactions (user_id, currency, amount, type, note)
    values (p_user_id, v_item.cost_currency, -v_item.cost_amount, 'spend', 'შოპი: ' || v_item.name);

  insert into public.user_purchases (user_id, item_id)
    values (p_user_id, p_item_id);

  return jsonb_build_object('success', true, 'item_name', v_item.name);
end;
$function$;

revoke all on function public.purchase_shop_item_as(p_user_id uuid, p_item_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.purchase_shop_item_as(p_user_id uuid, p_item_id uuid) to service_role;

-- rls_auto_enable()
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ BEGIN END; $function$;

revoke all on function public.rls_auto_enable() from public, anon, authenticated, service_role;
grant execute on function public.rls_auto_enable() to service_role;

-- toggle_post_like(p_post_id uuid, p_user_id uuid)
CREATE OR REPLACE FUNCTION public.toggle_post_like(p_post_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_actor_id uuid := auth.uid();
  already_liked boolean;
begin
  if v_actor_id is null or p_user_id is distinct from v_actor_id then
    raise exception 'unauthorized';
  end if;

  select exists (
    select 1 from public.post_likes where post_id = p_post_id and user_id = v_actor_id
  ) into already_liked;

  if already_liked then
    delete from public.post_likes where post_id = p_post_id and user_id = v_actor_id;
    update public.posts set likes_count = greatest(0, likes_count - 1) where id = p_post_id;
    return false;
  end if;

  insert into public.post_likes(post_id, user_id) values (p_post_id, v_actor_id);
  update public.posts set likes_count = likes_count + 1 where id = p_post_id;
  return true;
end;
$function$;

revoke all on function public.toggle_post_like(p_post_id uuid, p_user_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.toggle_post_like(p_post_id uuid, p_user_id uuid) to service_role;

-- toggle_post_like_as(p_user_id uuid, p_post_id uuid)
CREATE OR REPLACE FUNCTION public.toggle_post_like_as(p_user_id uuid, p_post_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  already_liked boolean;
begin
  if p_user_id is null then
    raise exception 'unauthorized';
  end if;

  select exists (
    select 1
    from public.post_likes
    where post_id = p_post_id
      and user_id = p_user_id
  ) into already_liked;

  if already_liked then
    delete from public.post_likes
    where post_id = p_post_id
      and user_id = p_user_id;

    update public.posts
    set likes_count = greatest(0, likes_count - 1)
    where id = p_post_id;

    return false;
  end if;

  insert into public.post_likes (post_id, user_id)
    values (p_post_id, p_user_id);

  update public.posts
  set likes_count = likes_count + 1
  where id = p_post_id;

  return true;
end;
$function$;

revoke all on function public.toggle_post_like_as(p_user_id uuid, p_post_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.toggle_post_like_as(p_user_id uuid, p_post_id uuid) to service_role;

-- unequip_category(p_cat text)
CREATE OR REPLACE FUNCTION public.unequip_category(p_cat text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$ BEGIN END; $function$;

revoke all on function public.unequip_category(p_cat text) from public, anon, authenticated, service_role;
grant execute on function public.unequip_category(p_cat text) to authenticated;
grant execute on function public.unequip_category(p_cat text) to service_role;

-- unequip_category_as(p_user_id uuid, p_category text)
CREATE OR REPLACE FUNCTION public.unequip_category_as(p_user_id uuid, p_category text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if p_user_id is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  delete from public.user_equipped
  where user_id = p_user_id
    and category = p_category;

  return jsonb_build_object('success', true);
end;
$function$;

revoke all on function public.unequip_category_as(p_user_id uuid, p_category text) from public, anon, authenticated, service_role;
grant execute on function public.unequip_category_as(p_user_id uuid, p_category text) to service_role;

-- update_last_seen_at()
CREATE OR REPLACE FUNCTION public.update_last_seen_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$ BEGIN RETURN NEW; END; $function$;

revoke all on function public.update_last_seen_at() from public, anon, authenticated, service_role;
grant execute on function public.update_last_seen_at() to anon;
grant execute on function public.update_last_seen_at() to authenticated;
grant execute on function public.update_last_seen_at() to service_role;

-- pm_apply_age_threshold_decay(p_position text, p_stats jsonb, p_threshold integer)
CREATE OR REPLACE FUNCTION public.pm_apply_age_threshold_decay(p_position text, p_stats jsonb, p_threshold integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  v_position text := upper(coalesce(nullif(trim(p_position), ''), 'CM'));
  v_stats jsonb := coalesce(p_stats, '{}'::jsonb);
begin
  if p_threshold = 32 then
    case
      when v_position in ('ST', 'CF', 'LW', 'RW', 'RM', 'LM', 'CAM', 'AM') then
        v_stats := public.pm_apply_stat_drop(v_stats, 'PAC', 4);
        v_stats := public.pm_apply_stat_drop(v_stats, 'DRI', 3);
        v_stats := public.pm_apply_stat_drop(v_stats, 'PHY', 2);
      when v_position in ('CM', 'CDM') then
        v_stats := public.pm_apply_stat_drop(v_stats, 'PAC', 3);
        v_stats := public.pm_apply_stat_drop(v_stats, 'DRI', 2);
        v_stats := public.pm_apply_stat_drop(v_stats, 'PHY', 2);
      when v_position in ('CB', 'LB', 'RB') then
        v_stats := public.pm_apply_stat_drop(v_stats, 'PAC', 3);
        v_stats := public.pm_apply_stat_drop(v_stats, 'PHY', 2);
        v_stats := public.pm_apply_stat_drop(v_stats, 'DEF', 1);
      when v_position = 'GK' then
        v_stats := public.pm_apply_stat_drop(v_stats, 'SPD', 2);
        v_stats := public.pm_apply_stat_drop(v_stats, 'REF', 2);
    end case;
  elsif p_threshold = 36 then
    case
      when v_position in ('ST', 'CF', 'LW', 'RW', 'RM', 'LM', 'CAM', 'AM') then
        v_stats := public.pm_apply_stat_drop(v_stats, 'PAC', 5);
        v_stats := public.pm_apply_stat_drop(v_stats, 'DRI', 4);
        v_stats := public.pm_apply_stat_drop(v_stats, 'PHY', 3);
        v_stats := public.pm_apply_stat_drop(v_stats, 'SHO', 2);
      when v_position in ('CM', 'CDM') then
        v_stats := public.pm_apply_stat_drop(v_stats, 'PAC', 4);
        v_stats := public.pm_apply_stat_drop(v_stats, 'DRI', 3);
        v_stats := public.pm_apply_stat_drop(v_stats, 'PHY', 3);
        v_stats := public.pm_apply_stat_drop(v_stats, 'PAS', 2);
      when v_position in ('CB', 'LB', 'RB') then
        v_stats := public.pm_apply_stat_drop(v_stats, 'PAC', 4);
        v_stats := public.pm_apply_stat_drop(v_stats, 'PHY', 3);
        v_stats := public.pm_apply_stat_drop(v_stats, 'DEF', 2);
      when v_position = 'GK' then
        v_stats := public.pm_apply_stat_drop(v_stats, 'SPD', 3);
        v_stats := public.pm_apply_stat_drop(v_stats, 'REF', 3);
        v_stats := public.pm_apply_stat_drop(v_stats, 'POS', 2);
    end case;
  end if;

  return v_stats;
end;
$function$;

revoke all on function public.pm_apply_age_threshold_decay(p_position text, p_stats jsonb, p_threshold integer) from public, anon, authenticated, service_role;
grant execute on function public.pm_apply_age_threshold_decay(p_position text, p_stats jsonb, p_threshold integer) to anon;
grant execute on function public.pm_apply_age_threshold_decay(p_position text, p_stats jsonb, p_threshold integer) to authenticated;
grant execute on function public.pm_apply_age_threshold_decay(p_position text, p_stats jsonb, p_threshold integer) to service_role;

-- pm_apply_stat_drop(p_stats jsonb, p_label text, p_drop integer)
CREATE OR REPLACE FUNCTION public.pm_apply_stat_drop(p_stats jsonb, p_label text, p_drop integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  v_stats jsonb := coalesce(p_stats, '{}'::jsonb);
  v_current integer := coalesce((v_stats ->> p_label)::integer, 35);
begin
  if coalesce(p_drop, 0) <= 0 then
    return v_stats;
  end if;

  return jsonb_set(
    v_stats,
    array[p_label],
    to_jsonb(greatest(35, v_current - p_drop)),
    true
  );
end;
$function$;

revoke all on function public.pm_apply_stat_drop(p_stats jsonb, p_label text, p_drop integer) from public, anon, authenticated, service_role;
grant execute on function public.pm_apply_stat_drop(p_stats jsonb, p_label text, p_drop integer) to anon;
grant execute on function public.pm_apply_stat_drop(p_stats jsonb, p_label text, p_drop integer) to authenticated;
grant execute on function public.pm_apply_stat_drop(p_stats jsonb, p_label text, p_drop integer) to service_role;

-- pm_cancel_transfer_offer(p_team_id uuid, p_offer_id uuid)
CREATE OR REPLACE FUNCTION public.pm_cancel_transfer_offer(p_team_id uuid, p_offer_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_offer public.pm_transfer_offers%rowtype;
begin
  select * into v_offer from public.pm_transfer_offers where id = p_offer_id for update;
  if v_offer.id is null or v_offer.status <> 'pending' then raise exception 'offer_unavailable'; end if;
  if p_team_id <> v_offer.from_team_id and p_team_id <> v_offer.to_team_id then raise exception 'not_participant'; end if;

  update public.pm_transfer_offers
    set status = 'cancelled', awaiting_team_id = null, updated_at = now()
    where id = p_offer_id;
end;
$function$;

revoke all on function public.pm_cancel_transfer_offer(p_team_id uuid, p_offer_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.pm_cancel_transfer_offer(p_team_id uuid, p_offer_id uuid) to service_role;

-- pm_log_event(p_team_id uuid, p_category text, p_title text, p_detail text, p_accent text, p_href text)
CREATE OR REPLACE FUNCTION public.pm_log_event(p_team_id uuid, p_category text, p_title text, p_detail text DEFAULT NULL::text, p_accent text DEFAULT 'green'::text, p_href text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_calendar public.pm_calendar%rowtype;
begin
  perform public.pm_ensure_calendar(p_team_id);

  select * into v_calendar
  from public.pm_calendar
  where team_id = p_team_id;

  insert into public.pm_event_feed (
    team_id, category, accent, title, detail, href, week_no, day_no
  ) values (
    p_team_id,
    coalesce(p_category, 'system'),
    coalesce(p_accent, 'green'),
    p_title,
    p_detail,
    p_href,
    coalesce(v_calendar.week_no, 1),
    coalesce(v_calendar.day_no, 1)
  );
end;
$function$;

revoke all on function public.pm_log_event(p_team_id uuid, p_category text, p_title text, p_detail text, p_accent text, p_href text) from public, anon, authenticated, service_role;
grant execute on function public.pm_log_event(p_team_id uuid, p_category text, p_title text, p_detail text, p_accent text, p_href text) to service_role;

-- pm_make_transfer_offer(p_from_team_id uuid, p_listing_id uuid, p_amount bigint)
CREATE OR REPLACE FUNCTION public.pm_make_transfer_offer(p_from_team_id uuid, p_listing_id uuid, p_amount bigint)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_listing public.pm_transfer_listings%rowtype;
  v_id uuid;
begin
  if p_amount <= 0 then raise exception 'invalid_price'; end if;

  select * into v_listing from public.pm_transfer_listings where id = p_listing_id;
  if v_listing.id is null or v_listing.status <> 'active' then raise exception 'listing_unavailable'; end if;
  if v_listing.seller_team_id = p_from_team_id then raise exception 'own_listing'; end if;
  if p_amount < public.pm_transfer_floor(v_listing.player_id) then raise exception 'price_below_floor'; end if;

  if exists (select 1 from public.pm_transfer_offers
             where player_id = v_listing.player_id and from_team_id = p_from_team_id and status = 'pending') then
    raise exception 'offer_exists';
  end if;

  insert into public.pm_transfer_offers
    (player_id, from_team_id, to_team_id, offer_type, amount_gel, status, listing_id, awaiting_team_id)
    values
    (v_listing.player_id, p_from_team_id, v_listing.seller_team_id, 'transfer', p_amount, 'pending', p_listing_id, v_listing.seller_team_id)
    returning id into v_id;
  return v_id;
end;
$function$;

revoke all on function public.pm_make_transfer_offer(p_from_team_id uuid, p_listing_id uuid, p_amount bigint) from public, anon, authenticated, service_role;
grant execute on function public.pm_make_transfer_offer(p_from_team_id uuid, p_listing_id uuid, p_amount bigint) to service_role;

-- pm_ovr_upgrade_cost(p_from_ovr integer)
CREATE OR REPLACE FUNCTION public.pm_ovr_upgrade_cost(p_from_ovr integer)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  with n as (select greatest(1, p_from_ovr - 49) as v)
  select case
    when (select v from n) <= 19 then
      (array[1,2,4,6,8,12,16,20,24,30,35,40,45,50,60,70,80,90,100])[(select v from n)]
    else least(120, 100 + ((select v from n) - 19) * 20)
  end;
$function$;

revoke all on function public.pm_ovr_upgrade_cost(p_from_ovr integer) from public, anon, authenticated, service_role;
grant execute on function public.pm_ovr_upgrade_cost(p_from_ovr integer) to anon;
grant execute on function public.pm_ovr_upgrade_cost(p_from_ovr integer) to authenticated;
grant execute on function public.pm_ovr_upgrade_cost(p_from_ovr integer) to service_role;

-- pm_ovr_upgrade_total_cost(p_from_ovr integer, p_to_ovr integer)
CREATE OR REPLACE FUNCTION public.pm_ovr_upgrade_total_cost(p_from_ovr integer, p_to_ovr integer)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select coalesce(sum(public.pm_ovr_upgrade_cost(y)), 0)::integer
  from generate_series(p_from_ovr, greatest(p_from_ovr, p_to_ovr - 1)) y
  where p_to_ovr > p_from_ovr;
$function$;

revoke all on function public.pm_ovr_upgrade_total_cost(p_from_ovr integer, p_to_ovr integer) from public, anon, authenticated, service_role;
grant execute on function public.pm_ovr_upgrade_total_cost(p_from_ovr integer, p_to_ovr integer) to anon;
grant execute on function public.pm_ovr_upgrade_total_cost(p_from_ovr integer, p_to_ovr integer) to authenticated;
grant execute on function public.pm_ovr_upgrade_total_cost(p_from_ovr integer, p_to_ovr integer) to service_role;

-- pm_pair_transfers_this_season(p_a uuid, p_b uuid, p_season_no integer)
CREATE OR REPLACE FUNCTION public.pm_pair_transfers_this_season(p_a uuid, p_b uuid, p_season_no integer)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select count(*)::integer
  from public.pm_transfer_ledger
  where season_no = p_season_no
    and ((seller_team_id = p_a and buyer_team_id = p_b)
      or (seller_team_id = p_b and buyer_team_id = p_a));
$function$;

revoke all on function public.pm_pair_transfers_this_season(p_a uuid, p_b uuid, p_season_no integer) from public, anon, authenticated, service_role;
grant execute on function public.pm_pair_transfers_this_season(p_a uuid, p_b uuid, p_season_no integer) to service_role;

-- pm_player_base_transfer_value_gel(p_ovr smallint)
CREATE OR REPLACE FUNCTION public.pm_player_base_transfer_value_gel(p_ovr smallint)
 RETURNS bigint
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select greatest(
    100000,
    least(
      100000000,
      round(
        (
          100000
          + (100000000 - 100000)
            * power(
                ((least(greatest(p_ovr::int, 40), 91) - 40)::numeric / (91 - 40)),
                5
              )
        ) / 50000
      )::bigint * 50000
    )
  );
$function$;

revoke all on function public.pm_player_base_transfer_value_gel(p_ovr smallint) from public, anon, authenticated, service_role;
grant execute on function public.pm_player_base_transfer_value_gel(p_ovr smallint) to service_role;

-- pm_player_career_end_age(p_talent smallint)
CREATE OR REPLACE FUNCTION public.pm_player_career_end_age(p_talent smallint)
 RETURNS smallint
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case
    when p_talent >= 12 then 42   -- legend
    when p_talent in (10, 11) then 40  -- world_class / rising_star
    when p_talent between 7 and 9 then 38  -- elite
    when p_talent between 4 and 6 then 35  -- star
    else 32  -- pro
  end::smallint;
$function$;

revoke all on function public.pm_player_career_end_age(p_talent smallint) from public, anon, authenticated, service_role;
grant execute on function public.pm_player_career_end_age(p_talent smallint) to anon;
grant execute on function public.pm_player_career_end_age(p_talent smallint) to authenticated;
grant execute on function public.pm_player_career_end_age(p_talent smallint) to service_role;

-- pm_player_compute_tac(p_ovr smallint, p_position text, p_normalized_name text, p_card_stats jsonb)
CREATE OR REPLACE FUNCTION public.pm_player_compute_tac(p_ovr smallint, p_position text, p_normalized_name text, p_card_stats jsonb)
 RETURNS smallint
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select greatest(45, least(99, round(
    case
      when coalesce(p_card_stats, '{}'::jsonb) ? 'PAC' then
        0.62 * coalesce(p_ovr, 60)
        + 18
        + 1.2 * (coalesce(p_ovr, 60) - (
            ( coalesce((p_card_stats->>'PAC')::numeric, p_ovr)
            + coalesce((p_card_stats->>'SHO')::numeric, p_ovr)
            + coalesce((p_card_stats->>'PAS')::numeric, p_ovr)
            + coalesce((p_card_stats->>'DRI')::numeric, p_ovr)
            + coalesce((p_card_stats->>'DEF')::numeric, p_ovr)
            + coalesce((p_card_stats->>'PHY')::numeric, p_ovr) ) / 6.0
          ))
        + case upper(coalesce(nullif(p_position, ''), 'CM'))
            when 'CB' then 3 when 'LCB' then 3 when 'RCB' then 3 when 'CDM' then 3
            when 'CM' then 2 when 'LCM' then 2 when 'RCM' then 2 when 'CAM' then 2 when 'AM' then 2
            when 'LB' then 1 when 'RB' then 1 when 'LWB' then 1 when 'RWB' then 1
            when 'LW' then -1 when 'RW' then -1 when 'LM' then -1 when 'RM' then -1
            when 'ST' then -2 when 'CF' then -2
            else 0
          end
        + ((abs(hashtext(coalesce(p_normalized_name, ''))) % 7) - 3)
      else
        0.66 * coalesce(p_ovr, 60) + 20 + ((abs(hashtext(coalesce(p_normalized_name, ''))) % 7) - 3)
    end
  )))::smallint;
$function$;

revoke all on function public.pm_player_compute_tac(p_ovr smallint, p_position text, p_normalized_name text, p_card_stats jsonb) from public, anon, authenticated, service_role;
grant execute on function public.pm_player_compute_tac(p_ovr smallint, p_position text, p_normalized_name text, p_card_stats jsonb) to anon;
grant execute on function public.pm_player_compute_tac(p_ovr smallint, p_position text, p_normalized_name text, p_card_stats jsonb) to authenticated;
grant execute on function public.pm_player_compute_tac(p_ovr smallint, p_position text, p_normalized_name text, p_card_stats jsonb) to service_role;

-- pm_player_current_transfer_value_gel(p_ovr_base smallint, p_ovr_current smallint)
CREATE OR REPLACE FUNCTION public.pm_player_current_transfer_value_gel(p_ovr_base smallint, p_ovr_current smallint)
 RETURNS bigint
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select least(
    150000000,
    public.pm_player_base_transfer_value_gel(p_ovr_base)
      + least(greatest(p_ovr_current::int - p_ovr_base::int, 0), 25) * 2000000
  );
$function$;

revoke all on function public.pm_player_current_transfer_value_gel(p_ovr_base smallint, p_ovr_current smallint) from public, anon, authenticated, service_role;
grant execute on function public.pm_player_current_transfer_value_gel(p_ovr_base smallint, p_ovr_current smallint) to service_role;

-- pm_player_ovr_growth_cap(p_talent smallint)
CREATE OR REPLACE FUNCTION public.pm_player_ovr_growth_cap(p_talent smallint)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case
    when p_talent >= 12 then 34
    when p_talent = 11 then 30
    when p_talent = 10 then 25
    when p_talent = 9 then 20
    when p_talent = 8 then 15
    else (p_talent * 2) + 1
  end;
$function$;

revoke all on function public.pm_player_ovr_growth_cap(p_talent smallint) from public, anon, authenticated, service_role;
grant execute on function public.pm_player_ovr_growth_cap(p_talent smallint) to anon;
grant execute on function public.pm_player_ovr_growth_cap(p_talent smallint) to authenticated;
grant execute on function public.pm_player_ovr_growth_cap(p_talent smallint) to service_role;

-- pm_staff_max_level_for_division(p_division_id integer)
CREATE OR REPLACE FUNCTION public.pm_staff_max_level_for_division(p_division_id integer)
 RETURNS smallint
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select greatest(1, least(5, 6 - greatest(1, least(5, coalesce(p_division_id, 5)))))::smallint;
$function$;

revoke all on function public.pm_staff_max_level_for_division(p_division_id integer) from public, anon, authenticated, service_role;
grant execute on function public.pm_staff_max_level_for_division(p_division_id integer) to authenticated;
grant execute on function public.pm_staff_max_level_for_division(p_division_id integer) to service_role;

-- pm_staff_upgrade_cost(p_role_key text, p_current_level smallint)
CREATE OR REPLACE FUNCTION public.pm_staff_upgrade_cost(p_role_key text, p_current_level smallint)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select round(public.pm_staff_hire_cost(p_role_key) * power(1.72::numeric, greatest(1, p_current_level)::numeric - 1))::integer;
$function$;

revoke all on function public.pm_staff_upgrade_cost(p_role_key text, p_current_level smallint) from public, anon, authenticated, service_role;
grant execute on function public.pm_staff_upgrade_cost(p_role_key text, p_current_level smallint) to authenticated;
grant execute on function public.pm_staff_upgrade_cost(p_role_key text, p_current_level smallint) to service_role;

-- pm_team_match_count(p_team_id uuid)
CREATE OR REPLACE FUNCTION public.pm_team_match_count(p_team_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select (
    (select count(*) from public.pm_match_history where team_id = p_team_id)
    + (select count(*) from public.pm_cup_matches
         where status = 'completed' and (team1_id = p_team_id or team2_id = p_team_id))
  )::integer;
$function$;

revoke all on function public.pm_team_match_count(p_team_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.pm_team_match_count(p_team_id uuid) to service_role;

-- pm_transfer_floor(p_player_id uuid)
CREATE OR REPLACE FUNCTION public.pm_transfer_floor(p_player_id uuid)
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select greatest(1, coalesce((select current_transfer_value_gel from public.pm_players where id = p_player_id), 0) / 2)::bigint;
$function$;

revoke all on function public.pm_transfer_floor(p_player_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.pm_transfer_floor(p_player_id uuid) to service_role;

-- set_shop_products_updated_at()
CREATE OR REPLACE FUNCTION public.set_shop_products_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

revoke all on function public.set_shop_products_updated_at() from public, anon, authenticated, service_role;
grant execute on function public.set_shop_products_updated_at() to anon;
grant execute on function public.set_shop_products_updated_at() to authenticated;
grant execute on function public.set_shop_products_updated_at() to service_role;

-- enforce_dm_block_on_message() — grant-only reconciliation. The trigger
-- function body already matches live (defined in 20260716); only the EXECUTE
-- grant to service_role had drifted (immaterial for a trigger fn, which fires
-- via the trigger mechanism regardless of EXECUTE, but matched here so a
-- from-scratch rebuild's ACLs are byte-identical to production).
grant execute on function public.enforce_dm_block_on_message() to service_role;
