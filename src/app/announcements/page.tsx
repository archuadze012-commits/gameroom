"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, Users, UserCheck, MessageSquare, Trophy, Gamepad2, Info, AlertTriangle, AlertOctagon, CheckCheck, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type NotificationType =
  | "lfg_response"
  | "lfg_accepted"
  | "forum_reply"
  | "news_comment"
  | "tournament_checkin"
  | "tournament_match"
  | "system";

type Severity = "info" | "warning" | "critical";

interface UserNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  severity: Severity;
  created_at: string;
}

type Tab = "all" | "lfg" | "forum" | "system";

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "ახლახანს";
  if (diff < 3600) return `${Math.floor(diff / 60)} წუთის წინ`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} საათის წინ`;
  return `${Math.floor(diff / 86400)} დღის წინ`;
}

const NOTIF_META: Record<NotificationType, { label: string; icon: React.ElementType; color: string }> = {
  lfg_response: { label: "LFG", icon: Users, color: "text-blue-400" },
  lfg_accepted: { label: "LFG", icon: UserCheck, color: "text-green-400" },
  forum_reply: { label: "ფორუმი", icon: MessageSquare, color: "text-purple-400" },
  news_comment: { label: "სიახლე", icon: MessageSquare, color: "text-purple-400" },
  tournament_checkin: { label: "ჩემპიონატი", icon: Trophy, color: "text-amber-400" },
  tournament_match: { label: "ჩემპიონატი", icon: Gamepad2, color: "text-amber-400" },
  system: { label: "სისტემა", icon: Bell, color: "text-muted-foreground" },
};

const SEVERITY_META: Record<Severity, { icon: React.ElementType; color: string; label: string }> = {
  info: { icon: Info, color: "text-blue-400", label: "ინფო" },
  warning: { icon: AlertTriangle, color: "text-amber-400", label: "გაფრთხილება" },
  critical: { icon: AlertOctagon, color: "text-red-400", label: "მნიშვნელოვანი" },
};

const TAB_LABELS: Record<Tab, string> = {
  all: "ყველა",
  lfg: "LFG",
  forum: "ფორუმი",
  system: "სისტემური",
};

export default function AnnouncementsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [nRes, aRes] = await Promise.all([
        fetch("/api/notifications"),
        fetch("/api/announcements"),
      ]);
      const nData = await nRes.json();
      const aData = await aRes.json();
      setNotifications(nData.notifications ?? []);
      setAnnouncements(aData.announcements ?? []);
      setReadAnnouncementIds(new Set(aData.readIds ?? []));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      for (const a of announcements) {
        if (!readAnnouncementIds.has(a.id)) {
          await fetch(`/api/announcements/${a.id}/read`, { method: "POST" });
        }
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
      setReadAnnouncementIds(new Set(announcements.map((a) => a.id)));
    } finally {
      setMarkingAll(false);
    }
  };

  const markNotifRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  };

  const markAnnouncementRead = async (id: string) => {
    if (readAnnouncementIds.has(id)) return;
    await fetch(`/api/announcements/${id}/read`, { method: "POST" });
    setReadAnnouncementIds((prev) => new Set([...prev, id]));
  };

  const isLfgType = (t: NotificationType) => t === "lfg_response" || t === "lfg_accepted";
  const isForumType = (t: NotificationType) => t === "forum_reply" || t === "news_comment";

  const filteredNotifs = notifications.filter((n) => {
    if (tab === "all") return true;
    if (tab === "lfg") return isLfgType(n.type);
    if (tab === "forum") return isForumType(n.type);
    if (tab === "system") return n.type === "tournament_checkin" || n.type === "tournament_match" || n.type === "system";
    return true;
  });

  const filteredAnnouncements = (tab === "all" || tab === "system") ? announcements : [];

  const unreadCount =
    notifications.filter((n) => !n.read_at).length +
    announcements.filter((a) => !readAnnouncementIds.has(a.id)).length;

  type FeedItem =
    | { kind: "notif"; data: UserNotification }
    | { kind: "announcement"; data: Announcement };

  const feed: FeedItem[] = [
    ...filteredNotifs.map((n) => ({ kind: "notif" as const, data: n })),
    ...filteredAnnouncements.map((a) => ({ kind: "announcement" as const, data: a })),
  ].sort((a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime());

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">უწყებები</h1>
          {unreadCount > 0 && (
            <Badge className="rounded-full px-2 py-0.5 text-xs">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={markAllRead}
            disabled={markingAll}
          >
            {markingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
            ყველა წაღებულად
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-muted/40 p-1">
        {(["all", "lfg", "forum", "system"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
              tab === t
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : feed.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center text-muted-foreground">
            <Bell className="h-8 w-8 opacity-30" />
            <p className="text-sm">შეტყობინება არ გაქვს</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {feed.map((item) => {
            if (item.kind === "notif") {
              const n = item.data;
              const meta = NOTIF_META[n.type];
              const Icon = meta.icon;
              const unread = !n.read_at;
              const el = (
                <Card
                  key={n.id}
                  className={`cursor-pointer border-border/60 transition-colors hover:border-primary/30 ${unread ? "bg-primary/5" : ""}`}
                  onClick={() => markNotifRead(n.id)}
                >
                  <CardContent className="flex gap-3 p-4">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted ${meta.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug ${unread ? "font-semibold" : "font-medium"}`}>
                          {n.title}
                        </p>
                        {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                      </div>
                      {n.body && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                      <p className="mt-1.5 text-[11px] text-muted-foreground/70">{timeAgo(n.created_at)}</p>
                    </div>
                  </CardContent>
                </Card>
              );
              return n.link ? (
                <a key={n.id} href={n.link} onClick={() => markNotifRead(n.id)}>
                  {el}
                </a>
              ) : el;
            }

            const a = item.data;
            const sev = SEVERITY_META[a.severity as Severity] ?? SEVERITY_META.info;
            const Icon = sev.icon;
            const unread = !readAnnouncementIds.has(a.id);
            return (
              <Card
                key={a.id}
                className={`cursor-default border-border/60 transition-colors ${unread ? "bg-primary/5" : ""}`}
                onClick={() => markAnnouncementRead(a.id)}
              >
                <CardContent className="flex gap-3 p-4">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted ${sev.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${unread ? "font-semibold" : "font-medium"}`}>
                        {a.title}
                      </p>
                      {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{a.body}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <p className="text-[11px] text-muted-foreground/70">{timeAgo(a.created_at)}</p>
                      <Badge variant="outline" className="h-4 px-1.5 text-[10px]">{sev.label}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
