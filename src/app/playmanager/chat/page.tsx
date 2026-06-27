import { redirect } from 'next/navigation';

export default function PlayManagerChatPage() {
  redirect('/playmanager/media?module=global_chat');
}
