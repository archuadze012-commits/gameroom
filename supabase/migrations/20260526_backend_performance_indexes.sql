-- Low-risk lookup indexes for hot Supabase/RLS paths.
-- Apply during a backend release window; these are ordinary indexes so the
-- migration runner can execute them inside its default transaction.

create index if not exists idx_user_inventory_user_id
  on public.user_inventory (user_id);

create index if not exists idx_user_inventory_item_id
  on public.user_inventory (item_id);

create index if not exists idx_user_inventory_box_id
  on public.user_inventory (box_id);

create index if not exists idx_post_likes_post_id
  on public.post_likes (post_id);

create index if not exists idx_post_likes_user_id
  on public.post_likes (user_id);

create index if not exists idx_post_comments_post_created
  on public.post_comments (post_id, created_at);

create index if not exists idx_post_comments_author_id
  on public.post_comments (author_id);

create index if not exists idx_conversation_messages_conversation_created
  on public.conversation_messages (conversation_id, created_at);

create index if not exists idx_conversation_messages_sender_id
  on public.conversation_messages (sender_id);

create index if not exists idx_room_chat_messages_room_created
  on public.room_chat_messages (room_id, created_at);

create index if not exists idx_room_chat_messages_user_id
  on public.room_chat_messages (user_id);

create index if not exists idx_game_rooms_host_id
  on public.game_rooms (host_id);

create index if not exists idx_game_rooms_game_status_created
  on public.game_rooms (game_slug, status, created_at desc);

create index if not exists idx_lfg_posts_game_status_created
  on public.lfg_posts (game_slug, mode, created_at desc);

create index if not exists idx_lfg_posts_author_id
  on public.lfg_posts (author_id);
