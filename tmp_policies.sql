select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname='public'
and tablename in (
'daily_challenges','featured_content','forum_categories','games','lfg_posts','linked_accounts','profiles','pm_match_history','pm_academy_prospects','pm_facilities'
)
order by tablename, policyname;