alter table public.pm_players
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists card_display_name text,
  add column if not exists nationality_code text,
  add column if not exists primary_position text,
  add column if not exists card_image_url text,
  add column if not exists card_sil_width double precision,
  add column if not exists card_sil_height double precision,
  add column if not exists card_sil_x double precision,
  add column if not exists card_sil_y double precision,
  add column if not exists card_sil_opacity double precision,
  add column if not exists card_content_y double precision,
  add column if not exists card_name_size double precision,
  add column if not exists card_stats_scale double precision;

update public.pm_players
set
  first_name = coalesce(first_name, split_part(display_name, ' ', 1)),
  last_name = coalesce(
    last_name,
    nullif(
      btrim(
        regexp_replace(display_name, '^\S+\s*', '')
      ),
      ''
    )
  ),
  card_display_name = coalesce(
    card_display_name,
    nullif(
      btrim(
        regexp_replace(display_name, '^\S+\s*', '')
      ),
      ''
    )
  )
where first_name is null
   or last_name is null
   or card_display_name is null;

update public.pm_players
set nationality_code = coalesce(nationality_code, 'ge')
where nationality_code is null;
