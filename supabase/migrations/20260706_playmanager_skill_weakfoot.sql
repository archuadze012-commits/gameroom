-- PlayManager: EA-style Skill Moves (1–5) + Weak Foot (1–5) stars — collectible
-- flair on player identity. skill_moves derives from dribbling + role; weak_foot
-- is a stable per-player value (hash of id) biased toward the middle.
alter table public.pm_players
  add column if not exists skill_moves smallint not null default 3,
  add column if not exists weak_foot smallint not null default 3;

alter table public.pm_players drop constraint if exists pm_players_skill_moves_check;
alter table public.pm_players add constraint pm_players_skill_moves_check check (skill_moves between 1 and 5);
alter table public.pm_players drop constraint if exists pm_players_weak_foot_check;
alter table public.pm_players add constraint pm_players_weak_foot_check check (weak_foot between 1 and 5);

update public.pm_players p
set
  skill_moves = greatest(1, least(5,
    case
      when coalesce((p.card_stats->>'DRI')::int, p.ovr_current) >= 90 then 5
      when coalesce((p.card_stats->>'DRI')::int, p.ovr_current) >= 84 then 4
      when coalesce((p.card_stats->>'DRI')::int, p.ovr_current) >= 74 then 3
      when coalesce((p.card_stats->>'DRI')::int, p.ovr_current) >= 62 then 2
      else 1
    end
    + case when upper(coalesce(p.primary_position,'CM')) in ('LW','RW','CAM','ST','CF') then 1 else 0 end
    - case when upper(coalesce(p.primary_position,'CM')) in ('GK','CB') then 1 else 0 end
  )),
  weak_foot = greatest(1, least(5,
    2 + (abs(hashtext(p.id::text)) % 100)
        / case when (abs(hashtext(p.id::text)) % 100) >= 90 then 30
               when (abs(hashtext(p.id::text)) % 100) >= 55 then 40
               else 50 end
  ))
where p.ovr_current is not null;
