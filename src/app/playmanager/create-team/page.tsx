import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { hasTeam } from '@/lib/playmanager/team';
import { CreateTeamForm } from './create-team-form';

export default async function CreateTeamPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?next=/playmanager');
  }

  if (await hasTeam(user.id)) {
    redirect('/playmanager');
  }

  return <CreateTeamForm />;
}
