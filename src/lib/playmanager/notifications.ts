import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// PlayManager notifications — derived from the existing pm_event_feed. "Unread"
// means the event is newer than the team's notifications_seen_at timestamp
// (see migration 20260711b). No separate notifications table.

export type NotificationCategory = 'match' | 'medical' | 'finance' | 'academy' | 'media' | 'board' | 'system';

export type PlayManagerNotification = {
  id: number;
  category: NotificationCategory;
  accent: 'green' | 'red' | 'gold';
  title: string;
  detail: string | null;
  weekNo: number;
  dayNo: number;
  createdAt: string;
  unread: boolean;
};

export type NotificationsResult = {
  items: PlayManagerNotification[];
  unreadCount: number;
};

type EventRow = {
  id: number;
  category: NotificationCategory;
  accent: 'green' | 'red' | 'gold';
  title: string;
  detail: string | null;
  week_no: number;
  day_no: number;
  created_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

export async function getPlayManagerNotifications(teamId: string, limit = 40): Promise<NotificationsResult> {
  const admin = createSupabaseAdminClient() as Loose;

  const [{ data: teamRow }, { data: eventRows }] = await Promise.all([
    admin.from('pm_teams').select('notifications_seen_at').eq('id', teamId).maybeSingle(),
    admin
      .from('pm_event_feed')
      .select('id,category,accent,title,detail,week_no,day_no,created_at')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  const seenAt = teamRow?.notifications_seen_at ? new Date(teamRow.notifications_seen_at).getTime() : 0;
  const items: PlayManagerNotification[] = ((eventRows ?? []) as EventRow[]).map((row) => ({
    id: row.id,
    category: row.category,
    accent: row.accent,
    title: row.title,
    detail: row.detail,
    weekNo: row.week_no,
    dayNo: row.day_no,
    createdAt: row.created_at,
    unread: new Date(row.created_at).getTime() > seenAt,
  }));

  return { items, unreadCount: items.filter((n) => n.unread).length };
}

// Lightweight unread count for the nav badge — avoids fetching full rows.
export async function getPlayManagerUnreadCount(teamId: string): Promise<number> {
  const admin = createSupabaseAdminClient() as Loose;

  const { data: teamRow } = await admin
    .from('pm_teams')
    .select('notifications_seen_at')
    .eq('id', teamId)
    .maybeSingle();

  const seenAt = teamRow?.notifications_seen_at ?? new Date(0).toISOString();
  const { count } = await admin
    .from('pm_event_feed')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .gt('created_at', seenAt);

  return count ?? 0;
}

export async function markPlayManagerNotificationsSeen(teamId: string): Promise<void> {
  const admin = createSupabaseAdminClient() as Loose;
  await admin.rpc('pm_mark_notifications_seen', { p_team_id: teamId });
}
