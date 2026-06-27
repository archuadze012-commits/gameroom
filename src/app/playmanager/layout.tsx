import { redirect } from 'next/navigation';
import { PlayManagerTopNav } from '@/components/playmanager/playmanager-top-nav';
import { getSession } from '@/lib/auth';

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
