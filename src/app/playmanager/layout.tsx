import { redirect } from 'next/navigation';
import { PlayManagerTopNav } from '@/components/playmanager/playmanager-top-nav';
import { getSession } from '@/lib/auth';
// PlayManager-only styles — bundled into this route segment's CSS so the
// ~22KB of .pm-* rules load ONLY under /playmanager, not on every page.
import './playmanager.css';

export const metadata = { title: 'PlayManager' };

export default async function PlayManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  const isDevBypass = process.env.NODE_ENV === 'development';
  if (!user && !isDevBypass) redirect('/auth/login?next=/playmanager');

  return (
    <div className="text-white pm-playmanager-root">
      <PlayManagerTopNav />
      <div className="pm-playmanager-pad">{children}</div>
    </div>
  );
}
