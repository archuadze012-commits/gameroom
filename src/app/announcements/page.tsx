"use client";

import { useEffect, useState } from "react";
import { Bell, Users, UserCheck, MessageSquare, Trophy, Gamepad2, Info, AlertTriangle, AlertOctagon, CheckCheck, Loader2, type LucideIcon } from "lucide-react";
import { PushBell } from "@/components/push-bell";
import { DisplayHeading } from "@/components/ui/display-heading";
import { Pill } from "@/components/ui/pill";
import { EmptyState } from "@/components/ui/empty-state";

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

const NOTIF_META: Record<NotificationType, { label: string; icon: LucideIcon; tone: "cyan" | "online" | "violet" | "amber" | "neutral" | "magenta" }> = {
  lfg_response:       { label: "ლოკალი",      icon: Users,         tone: "magenta" },
  lfg_accepted:       { label: "ლოკალი",      icon: UserCheck,     tone: "online" },
  forum_reply:        { label: "ფორუმი",      icon: MessageSquare, tone: "violet" },
  news_comment:       { label: "სიახლე",      icon: MessageSquare, tone: "violet" },
  tournament_checkin: { label: "ჩემპიონატი",  icon: Trophy,        tone: "amber" },
  tournament_match:   { label: "ჩემპიონატი",  icon: Gamepad2,      tone: "amber" },
  system:             { label: "სისტემა",     icon: Bell,          tone: "neutral" },
};

const SEVERITY_META: Record<Severity, { icon: LucideIcon; tone: "cyan" | "amber" | "live"; label: string }> = {
  info:     { icon: Info,          tone: "cyan",  label: "ინფო" },
  warning:  { icon: AlertTriangle, tone: "amber", label: "გაფრთხილება" },
  critical: { icon: AlertOctagon,  tone: "live",  label: "მნიშვნელოვანი" },
};

const TAB_LABELS: Record<Tab, string> = {
  all: "ყველა",
  lfg: "ლოკალი",
  forum: "ფორუმი",
  system: "სისტემური",
};

const neonText = { color: "#ffffff", textShadow: "0 0 8px rgba(236,72,153,0.9), 0 0 18px rgba(236,72,153,0.55), 0 0 32px rgba(236,72,153,0.3)" } as const;
const neonMute = { color: "rgba(255,255,255,0.7)", textShadow: "0 0 6px rgba(236,72,153,0.7), 0 0 14px rgba(236,72,153,0.4)" } as const;
const neonDim  = { color: "rgba(255,255,255,0.5)", textShadow: "0 0 5px rgba(236,72,153,0.55)" } as const;

const cutSm = "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)";

export default function AnnouncementsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [nRes, aRes] = await Promise.all([
          fetch("/api/notifications"),
          fetch("/api/announcements"),
        ]);
        const nData = await nRes.json();
        const aData = await aRes.json();
        if (cancelled) return;
        setNotifications(nData.notifications ?? []);
        setAnnouncements(aData.announcements ?? []);
        setReadAnnouncementIds(new Set(aData.readIds ?? []));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      <div className="container relative mx-auto max-w-3xl px-4 py-10 lg:py-14">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <DisplayHeading as="h1" size="lg" className="mt-1 flex items-center gap-3" style={neonText}>
              უწყებები
              {unreadCount > 0 && <Pill tone="accent">{unreadCount > 99 ? "99+" : unreadCount}</Pill>}
            </DisplayHeading>
          </div>
          <div className="flex items-center gap-2">
            <PushBell />
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={markingAll}
                className="flex items-center gap-1.5 border bg-[var(--gr-bg-1)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors"
                style={{ clipPath: cutSm, borderColor: "rgba(236,72,153,0.35)", ...neonMute }}
              >
                {markingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                ყველა წაღებულად
              </button>
            )}
          </div>
        </header>

        {/* Tabs */}
        <div className="mb-5 flex gap-1" style={{ borderBottom: "1px solid rgba(236,72,153,0.2)" }}>
          {(["all", "lfg", "forum", "system"] as Tab[]).map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="relative px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors"
                style={active ? neonText : neonMute}
              >
                {TAB_LABELS[t]}
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-2 -bottom-px h-[2px]"
                    style={{ background: "rgba(236,72,153,1)", boxShadow: "0 0 10px rgba(236,72,153,0.8)" }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "rgba(236,72,153,0.8)" }} />
          </div>
        ) : feed.length === 0 ? (
          <EmptyState
            tone="violet"
            illustration={<Bell className="h-8 w-8" style={{ color: "#ffffff", filter: "drop-shadow(0 0 6px rgba(236,72,153,1))" }} />}
            title="შეტყობინება არ გაქვს"
            description="როცა ლოკალში მოგწერენ ან ფორუმში გიპასუხებენ, აქ გამოჩნდება."
          />
        ) : (
          <div className="space-y-2">
            {feed.map((item) => {
              if (item.kind === "notif") {
                const n = item.data;
                const meta = NOTIF_META[n.type];
                const Icon = meta.icon;
                const unread = !n.read_at;
                const card = (
                  <div
                    className="relative isolate transition-all duration-300"
                    style={{
                      background: unread ? "rgba(236,72,153,0.5)" : "rgba(255,255,255,0.12)",
                      padding: 1,
                      clipPath: cutSm,
                    }}
                  >
                    <article
                      className="relative cursor-pointer bg-[var(--gr-bg-1)] p-4 overflow-hidden"
                      style={{ clipPath: cutSm }}
                    >
                      <div className="absolute inset-0 bg-gr-magenta opacity-0 transition-opacity group-hover:opacity-[0.04] z-[5] pointer-events-none" />
                      <div className="absolute inset-0 bg-gradient-to-br from-gr-magenta/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-[5] pointer-events-none" />
                      <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] group-hover:transition-transform group-hover:duration-700 z-[5] pointer-events-none" />
                      {unread && (
                        <span aria-hidden className="absolute left-0 top-0 h-full w-[3px] z-[6]" style={{ background: "rgba(236,72,153,1)", boxShadow: "0 0 10px rgba(236,72,153,0.8)" }} />
                      )}
                      <div className="relative z-10 flex gap-3">
                        <div
                          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md"
                          style={{ background: "rgba(236,72,153,0.1)", border: "1px solid rgba(236,72,153,0.3)" }}
                        >
                          <Icon className="h-4 w-4" style={{ color: "#ffffff", filter: "drop-shadow(0 0 5px rgba(236,72,153,0.9))" }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-[13.5px] leading-snug ${unread ? "font-semibold" : "font-medium"}`} style={neonText}>
                              {n.title}
                            </p>
                            <Pill tone={meta.tone}>{meta.label}</Pill>
                          </div>
                          {n.body && <p className="mt-1 text-[12px] line-clamp-2" style={neonMute}>{n.body}</p>}
                          <p className="mt-1.5 text-[10.5px] uppercase tracking-[0.12em]" style={neonDim}>{timeAgo(n.created_at)}</p>
                        </div>
                      </div>
                    </article>
                  </div>
                );
                return n.link ? (
                  <a key={n.id} href={n.link} onClick={() => markNotifRead(n.id)} className="group block transition-transform hover:-translate-y-0.5 duration-300">
                    {card}
                  </a>
                ) : (
                  <div key={n.id} onClick={() => markNotifRead(n.id)} className="group block transition-transform hover:-translate-y-0.5 duration-300">
                    {card}
                  </div>
                );
              }

              const a = item.data;
              const sev = SEVERITY_META[a.severity as Severity] ?? SEVERITY_META.info;
              const Icon = sev.icon;
              const unread = !readAnnouncementIds.has(a.id);
              return (
                <div
                  key={a.id}
                  onClick={() => markAnnouncementRead(a.id)}
                  className="group block transition-transform hover:-translate-y-0.5 duration-300"
                >
                  <div
                    className="relative isolate transition-all duration-300"
                    style={{
                      background: unread ? "rgba(236,72,153,0.5)" : "rgba(255,255,255,0.12)",
                      padding: 1,
                      clipPath: cutSm,
                    }}
                  >
                    <article
                      className="relative cursor-pointer bg-[var(--gr-bg-1)] p-4 overflow-hidden"
                      style={{ clipPath: cutSm }}
                    >
                      <div className="absolute inset-0 bg-gr-magenta opacity-0 transition-opacity group-hover:opacity-[0.04] z-[5] pointer-events-none" />
                      <div className="absolute inset-0 bg-gradient-to-br from-gr-magenta/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-[5] pointer-events-none" />
                      <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] group-hover:transition-transform group-hover:duration-700 z-[5] pointer-events-none" />
                      {unread && (
                        <span aria-hidden className="absolute left-0 top-0 h-full w-[3px] z-[6]" style={{ background: "rgba(236,72,153,1)", boxShadow: "0 0 10px rgba(236,72,153,0.8)" }} />
                      )}
                      <div className="relative z-10 flex gap-3">
                        <div
                          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md"
                          style={{ background: "rgba(236,72,153,0.1)", border: "1px solid rgba(236,72,153,0.3)" }}
                        >
                          <Icon className="h-4 w-4" style={{ color: "#ffffff", filter: "drop-shadow(0 0 5px rgba(236,72,153,0.9))" }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-[13.5px] leading-snug ${unread ? "font-semibold" : "font-medium"}`} style={neonText}>
                              {a.title}
                            </p>
                            <Pill tone={sev.tone}>{sev.label}</Pill>
                          </div>
                          <p className="mt-1 text-[12px] line-clamp-2" style={neonMute}>{a.body}</p>
                          <p className="mt-1.5 text-[10.5px] uppercase tracking-[0.12em]" style={neonDim}>{timeAgo(a.created_at)}</p>
                        </div>
                      </div>
                    </article>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
