alter table public.linked_accounts enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;

revoke all on table public.linked_accounts from anon;
revoke all on table public.conversations from anon;
revoke all on table public.conversation_messages from anon;

revoke all on table public.linked_accounts from authenticated;
grant select, insert, update, delete on table public.linked_accounts to authenticated;

revoke all on table public.conversations from authenticated;
grant select, insert, delete on table public.conversations to authenticated;
grant update (last_message_at) on table public.conversations to authenticated;

revoke all on table public.conversation_messages from authenticated;
grant select, insert on table public.conversation_messages to authenticated;
grant update (read_at, deleted_at) on table public.conversation_messages to authenticated;

drop policy if exists "linked_accounts_select_own" on public.linked_accounts;
create policy "linked_accounts_select_own"
on public.linked_accounts
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "conv_select_participant" on public.conversations;
drop policy if exists "conv_insert_own" on public.conversations;

drop policy if exists "conversation_select_participant" on public.conversations;
create policy "conversation_select_participant"
on public.conversations
for select
to authenticated
using (
  (select auth.uid()) = user_a
  or (select auth.uid()) = user_b
);

drop policy if exists "conversation_insert_participant" on public.conversations;
create policy "conversation_insert_participant"
on public.conversations
for insert
to authenticated
with check (
  user_a <> user_b
  and (
    (select auth.uid()) = user_a
    or (select auth.uid()) = user_b
  )
);

drop policy if exists "conversation_update_participant" on public.conversations;
create policy "conversation_update_participant"
on public.conversations
for update
to authenticated
using (
  (select auth.uid()) = user_a
  or (select auth.uid()) = user_b
)
with check (
  (select auth.uid()) = user_a
  or (select auth.uid()) = user_b
);

drop policy if exists "conversation_delete_participant" on public.conversations;
create policy "conversation_delete_participant"
on public.conversations
for delete
to authenticated
using (
  (select auth.uid()) = user_a
  or (select auth.uid()) = user_b
);

drop policy if exists "convm_select_participant" on public.conversation_messages;
drop policy if exists "convm_insert_own" on public.conversation_messages;

drop policy if exists "conversation_messages_select_participant" on public.conversation_messages;
create policy "conversation_messages_select_participant"
on public.conversation_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (
        (select auth.uid()) = c.user_a
        or (select auth.uid()) = c.user_b
      )
  )
);

drop policy if exists "conversation_messages_insert_sender_participant" on public.conversation_messages;
create policy "conversation_messages_insert_sender_participant"
on public.conversation_messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (
        (select auth.uid()) = c.user_a
        or (select auth.uid()) = c.user_b
      )
  )
);

drop policy if exists "conversation_messages_update_participant" on public.conversation_messages;
create policy "conversation_messages_update_participant"
on public.conversation_messages
for update
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (
        (select auth.uid()) = c.user_a
        or (select auth.uid()) = c.user_b
      )
  )
)
with check (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (
        (select auth.uid()) = c.user_a
        or (select auth.uid()) = c.user_b
      )
  )
);
