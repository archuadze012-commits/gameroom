import { redirect } from 'next/navigation';

export default function PlayManagerAnnouncementsPage() {
  redirect('/playmanager/media?module=announcements');
}
