drop policy if exists "ull_select_all" on public.user_lobby_loadouts;
drop policy if exists "ull_insert_own" on public.user_lobby_loadouts;
drop policy if exists "ull_update_own" on public.user_lobby_loadouts;
drop policy if exists "ull_delete_own" on public.user_lobby_loadouts;

drop policy if exists "conv_select_participant" on public.conversations;
drop policy if exists "conv_insert_own" on public.conversations;

drop policy if exists "convm_select_participant" on public.conversation_messages;
drop policy if exists "convm_insert_own" on public.conversation_messages;
