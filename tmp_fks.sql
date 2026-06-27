select conrelid::regclass as table_name, conname as fk_name, pg_get_constraintdef(oid) as definition
from pg_constraint
where contype='f'
and connamespace = 'public'::regnamespace
and conname in (
'mafia_action_logs_target_user_id_fkey',
'mafia_battle_logs_winner_id_fkey',
'mafia_feed_events_target_user_id_fkey',
'pm_cup_instances_template_id_fkey',
'pm_cup_matches_team1_id_fkey',
'pm_cup_matches_team2_id_fkey',
'pm_cup_matches_winner_id_fkey',
'pm_cup_participants_team_id_fkey',
'pm_pack_openings_pack_id_fkey',
'pm_pack_openings_team_id_fkey',
'pm_player_position_unlocks_player_id_fkey',
'pm_teams_division_id_fkey',
'shop_products_created_by_fkey',
'user_challenge_progress_challenge_id_fkey'
)
order by 1,2;