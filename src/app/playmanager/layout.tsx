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
    <div className="text-white pm-playmanager-root">
      <div className="pm-rotate-prompt" role="alert" aria-live="polite">
        <div className="pm-rotate-prompt__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2.5" />
            <path d="M9 18h6" />
            <path d="M2.5 10.5 4.8 8.2M4.8 8.2l2.3 2.3M4.8 8.2A8 8 0 0 1 19.5 13" />
          </svg>
        </div>
        <p className="pm-rotate-prompt__title">გადააბრუნე ტელეფონი</p>
        <p className="pm-rotate-prompt__text">
          PlayManager საუკეთესოდ ჰორიზონტალურ (landscape) რეჟიმში მუშაობს. გთხოვთ
          გადააბრუნოთ მოწყობილობა.
        </p>
      </div>
      <div className="pm-playmanager-pad">{children}</div>
    </div>
  );
}
