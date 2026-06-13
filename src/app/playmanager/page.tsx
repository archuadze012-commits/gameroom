import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTeam, getSquadCount } from '@/lib/playmanager/team';

export const dynamic = 'force-dynamic';

export default async function PlayManagerDashboard() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/playmanager');

  const team = await getTeam(user.id);
  if (!team) redirect('/playmanager/create-team');

  const squadCount = await getSquadCount(team.id);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{team.name}</h1>
        <p className="text-white/40 text-sm mt-1">დივიზიონი {team.division_id}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="PM₾ ბალანსი" value={team.balance.toLocaleString()} />
        <StatCard label="მოთამაშეები" value={String(squadCount)} />
        <StatCard label="შემდეგი მატჩი" value="—" />
        <StatCard label="ლიგაში ადგილი" value="—" />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <p className="text-white/50 text-sm">
          გუნდი შექმნილია ✓ — მომდევნო ეტაპზე შეძლებ პაკებს, ტრანსფერებს და მატჩებს.
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-1">
      <p className="text-xs text-white/40 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-green-400">{value}</p>
    </div>
  );
}
