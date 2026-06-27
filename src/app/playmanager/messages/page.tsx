import { redirect } from 'next/navigation';

export default function PlayManagerMessagesPage() {
  redirect('/playmanager/media?module=direct_messages');
}
