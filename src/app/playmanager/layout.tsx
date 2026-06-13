import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata = { title: 'PlayManager' };

export default async function PlayManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/playmanager');

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 px-6 py-3 flex items-center gap-3">
        <span className="text-lg font-bold text-green-400">⚽ PlayManager</span>
        <span className="text-white/20">|</span>
        <nav className="flex gap-4 text-sm text-white/60">
          <a href="/playmanager" className="hover:text-white transition">დაშბორდი</a>
          <a href="/playmanager/squad" className="hover:text-white transition">შემადგენლობა</a>
          <a href="/playmanager/transfers" className="hover:text-white transition">ტრანსფერები</a>
          <a href="/playmanager/league" className="hover:text-white transition">ლიგა</a>
        </nav>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
