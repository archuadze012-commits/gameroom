import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Shield, UsersRound, CalendarDays, Award } from 'lucide-react';
import { redirect } from 'next/navigation';
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type TeamRow = {
  id: string;
  name: string;
  division_id: number;
  user_id: string;
  created_at: string;
};

type LooseQuery = {
  select: (columns: string, options?: { count?: 'exact'; head?: boolean }) => LooseQuery;
  eq: (column: string, value: unknown) => LooseQuery;
  single: <T = unknown>() => Promise<{ data: T | null; error?: unknown }>;
  maybeSingle: <T = unknown>() => Promise<{ data: T | null; error?: unknown }>;
};

type PlayManagerLooseDb = {
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null } }>;
  };
  from: (table: string) => LooseQuery;
};

export default async function PlayManagerManagerPage(
  props: { params: Promise<{ id: string }> },
) {
  const { id: managerId } = await props.params;
  const db = (await createSupabaseServerClient()) as unknown as PlayManagerLooseDb;

  const { data: userData } = await db.auth.getUser();
  if (!userData.user) {
    redirect(`/auth/login?next=/playmanager/managers/${managerId}`);
  }

  const { data: profile } = await db
    .from('profiles')
    .select('id,display_name,username,avatar_url')
    .eq('id', managerId)
    .maybeSingle<ProfileRow>();

  if (!profile) {
    return <ManagerEmptyState />;
  }

  const { data: team } = await db
    .from('pm_teams')
    .select('id,name,division_id,user_id,created_at')
    .eq('user_id', managerId)
    .maybeSingle<TeamRow>();

  let squadCount = 0;
  if (team) {
    const { count } = await (db
      .from('pm_squads')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', team.id) as unknown as Promise<{ count: number | null }>);
    squadCount = count ?? 0;
  }

  const isMe = managerId === userData.user.id;

  return (
    <PlayManagerLightShell>
      <section className="relative overflow-hidden rounded-xl bg-[#020806]/90 p-4 shadow-[0_28px_100px_rgba(0,0,0,0.45)] sm:p-6">
        <div className="pointer-events-none absolute inset-0 opacity-80">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.12),transparent_40%),radial-gradient(circle_at_88%_18%,rgba(56,189,248,0.08),transparent_30%),linear-gradient(135deg,rgba(2,18,10,0.98),rgba(0,0,0,0.98)_64%)]" />
        </div>

        <div className="relative z-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/playmanager/search?type=managers"
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-black/44 px-4 text-sm font-black text-white/70 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              ძებნაში დაბრუნება
            </Link>
            {isMe && (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-400">
                ჩემი პროფილი
              </span>
            )}
          </div>

          <div className="mx-auto max-w-4xl">
            <div className="rounded-[32px] border border-emerald-300/14 bg-black/40 p-6 shadow-[inset_0_0_55px_rgba(16,185,129,0.04)] sm:p-8">
              <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
                <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[28px] border-2 border-emerald-300/20 bg-white/5 shadow-2xl">
                  {profile.avatar_url ? (
                    <Image src={profile.avatar_url} alt={profile.display_name ?? profile.username ?? 'Manager'} fill sizes="112px" className="object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-4xl font-black text-white/50">
                      {(profile.display_name ?? profile.username ?? 'M').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-200/60">
                    მენეჯერი
                  </p>
                  <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                    {profile.display_name ?? profile.username ?? 'უცნობი მენეჯერი'}
                  </h1>
                  <p className="mt-2 text-sm font-bold text-white/50">
                    @{profile.username ?? 'manager'}
                  </p>
                  
                  <div className="mt-6 flex flex-wrap justify-center gap-3 sm:justify-start">
                    <Link
                      href={`/profile/${profile.username}`}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-black text-white transition hover:bg-white/10"
                    >
                      <UsersRound className="mr-2 h-4 w-4 opacity-50" />
                      სოციალური პროფილი
                    </Link>
                  </div>
                </div>
              </div>

              {team ? (
                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-emerald-300/10 bg-emerald-950/20 p-4">
                    <div className="mb-2 flex items-center gap-2 text-emerald-200/70">
                      <Shield className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase tracking-[0.16em]">გუნდი</span>
                    </div>
                    <p className="truncate text-lg font-black text-white">{team.name}</p>
                    <p className="mt-1 text-xs font-bold text-emerald-200/50">დივიზიონი {team.division_id}</p>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-black/40 p-4">
                    <div className="mb-2 flex items-center gap-2 text-white/40">
                      <Award className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase tracking-[0.16em]">რეიტინგი</span>
                    </div>
                    <p className="text-lg font-black text-white">0</p>
                    <p className="mt-1 text-xs font-bold text-white/30">სარეიტინგო ქულა</p>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-black/40 p-4">
                    <div className="mb-2 flex items-center gap-2 text-white/40">
                      <UsersRound className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase tracking-[0.16em]">შემადგენლობა</span>
                    </div>
                    <p className="text-lg font-black text-white">{squadCount}</p>
                    <p className="mt-1 text-xs font-bold text-white/30">ფეხბურთელი</p>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-black/40 p-4">
                    <div className="mb-2 flex items-center gap-2 text-white/40">
                      <CalendarDays className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase tracking-[0.16em]">დაარსება</span>
                    </div>
                    <p className="text-lg font-black text-white">
                      {new Date(team.created_at).toLocaleDateString('ka-GE', { year: 'numeric', month: 'short' })}
                    </p>
                    <p className="mt-1 text-xs font-bold text-white/30">რეგისტრაცია</p>
                  </div>
                </div>
              ) : (
                <div className="mt-8 rounded-2xl border border-dashed border-white/10 bg-black/20 px-6 py-10 text-center">
                  <Shield className="mx-auto h-10 w-10 text-white/20" />
                  <p className="mt-4 text-sm font-bold text-white/50">ამ მენეჯერს ჯერ არ შეუქმნია გუნდი.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </PlayManagerLightShell>
  );
}

function ManagerEmptyState() {
  return (
    <PlayManagerLightShell>
      <section className="mx-auto max-w-[900px] rounded-xl bg-[#020806]/90 p-6 text-center shadow-[0_28px_100px_rgba(0,0,0,0.45)]">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200/60">
          მენეჯერის პროფილი
        </p>
        <h1 className="mt-3 text-3xl font-black text-white">მენეჯერი ვერ მოიძებნა</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm font-bold leading-7 text-white/50">
          ეს მენეჯერი ბაზაში არ არსებობს.
        </p>
        <Link
          href="/playmanager/search?type=managers"
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-2xl border border-emerald-300/18 bg-emerald-300/10 px-4 text-sm font-black text-emerald-100"
        >
          <ArrowLeft className="h-4 w-4" />
          ძებნაში დაბრუნება
        </Link>
      </section>
    </PlayManagerLightShell>
  );
}
