-- Enforce blocks + dm_privacy at the DATABASE boundary, not just in the app.
--
-- The `authenticated` role holds a direct INSERT grant on conversations /
-- conversation_messages and the RLS insert policies check only participancy, so
-- a browser-issued supabase-js insert (or any code path that isn't POST
-- /api/conversations, e.g. the LFG matchmaker) could create a thread or inject a
-- message across a block or a 'nobody' dm_privacy setting. These BEFORE INSERT
-- triggers make the DB the single, unbypassable choke point. SECURITY DEFINER so
-- they can read user_blocks / profiles / follows past those tables' own RLS.

-- ── Block guard on every message insert ──────────────────────────────────────
create or replace function public.enforce_dm_block_on_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_other uuid;
begin
  select case when c.user_a = new.sender_id then c.user_b else c.user_a end
    into v_other
  from public.conversations c
  where c.id = new.conversation_id;

  if v_other is not null and exists (
    select 1 from public.user_blocks
    where (blocker_id = new.sender_id and blocked_id = v_other)
       or (blocker_id = v_other and blocked_id = new.sender_id)
  ) then
    raise exception 'blocked' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_dm_block_message on public.conversation_messages;
create trigger trg_enforce_dm_block_message
  before insert on public.conversation_messages
  for each row execute function public.enforce_dm_block_on_message();

-- ── Block + dm_privacy guard on every new conversation ───────────────────────
create or replace function public.enforce_dm_privacy_on_conversation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_initiator uuid := auth.uid();
  v_recipient uuid;
  v_pref text;
begin
  -- Symmetric block check (independent of who inserts).
  if exists (
    select 1 from public.user_blocks
    where (blocker_id = new.user_a and blocked_id = new.user_b)
       or (blocker_id = new.user_b and blocked_id = new.user_a)
  ) then
    raise exception 'blocked' using errcode = 'check_violation';
  end if;

  -- dm_privacy of the recipient (the participant that isn't the initiator).
  -- Skipped when there is no session user (service-role inserts) — blocks above
  -- still apply in that case.
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
$$;

drop trigger if exists trg_enforce_dm_privacy_conversation on public.conversations;
create trigger trg_enforce_dm_privacy_conversation
  before insert on public.conversations
  for each row execute function public.enforce_dm_privacy_on_conversation();
