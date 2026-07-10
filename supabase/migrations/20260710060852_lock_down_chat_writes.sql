-- All chat writes must pass through server Route Handlers so rate limits,
-- mute checks, bans, and moderation cannot be bypassed with the public client.
revoke insert on table public.chat_messages from anon, authenticated;
grant insert on table public.chat_messages to service_role;

drop policy if exists "cm_insert_own" on public.chat_messages;
drop policy if exists "cm_insert_service" on public.chat_messages;
create policy "cm_insert_service"
on public.chat_messages
for insert
to service_role
with check (true);

create index if not exists chat_messages_channel_created_idx
on public.chat_messages (channel_id, created_at desc);
