-- Follow-up for already-applied top3_auth_boundary_hardening migration.
-- The first pass revoked column-level UPDATE on sensitive profile fields, but
-- table-level UPDATE grants still allowed authenticated sessions to modify
-- protected columns. Lock the table grant down and re-grant only safe fields.

revoke update on table public.profiles from anon, authenticated;
grant update (
  username,
  display_name,
  avatar_url,
  bio,
  region,
  voice_chat,
  available_hours,
  banner_url,
  favorite_game_slugs,
  main_game_slug,
  youtube_handle,
  tiktok_handle,
  tiktok_followers,
  in_game_name,
  emoji,
  updated_at,
  game_id
) on table public.profiles to authenticated;
