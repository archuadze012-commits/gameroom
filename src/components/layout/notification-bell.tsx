"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ExternalLink, Info } from "lucide-react";
import { playInviteSound } from "@/lib/sounds";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavAnnouncements } from "./use-nav-data";

type PersonalNotification = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "ახლახანს";
  if (diff < 3600) return `${Math.floor(diff / 60)} წუთის წინ`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} საათის წინ`;
  return `${Math.floor(diff / 86400)} დღის წინ`;
}

export function NotificationBell() {
  const router = useRouter();
  const [personal, setPersonal] = useState<PersonalNotification[]>([]);
  const { announcements, readIds } = useNavAnnouncements();
  const [locallyReadAnnouncementIds, setLocallyReadAnnouncementIds] = useState<Set<string>>(new Set());
  const prevCountRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const loadPersonal = async () => {
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const data = await response.json();
        const notifications = (Array.isArray(data.notifications) ? data.notifications : []) as PersonalNotification[];
        const unread = notifications.filter((item) => !item.read_at);
        if (unread.length > prevCountRef.current) {
          playInviteSound();
        }
        prevCountRef.current = unread.length;
        setPersonal(notifications);
      } catch {}
    };

    void loadPersonal();
    const id = window.setInterval(loadPersonal, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const readAnnouncementIds = new Set([...readIds, ...locallyReadAnnouncementIds]);
  const unreadAnnouncementCount = announcements.filter((announcement) => !readAnnouncementIds.has(announcement.id)).length;
  const unreadPersonalCount = personal.filter((notification) => !notification.read_at).length;
  const totalCount = unreadPersonalCount + unreadAnnouncementCount;

  const openNotification = async (notification: PersonalNotification) => {
    if (!notification.read_at) {
      const response = await fetch(`/api/notifications/${notification.id}`, { method: "PATCH" });
      if (response.ok) {
        setPersonal((current) => current.map((item) => (
          item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item
        )));
        prevCountRef.current = Math.max(0, prevCountRef.current - 1);
      }
    }
    if (notification.link) router.push(notification.link);
  };

  const markAnnouncementRead = async (id: string) => {
    if (readAnnouncementIds.has(id)) return;
    const response = await fetch(`/api/announcements/${id}/read`, { method: "POST" });
    if (response.ok) {
      setLocallyReadAnnouncementIds((current) => new Set([...current, id]));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="შეტყობინებები"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-white/75 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/70"
      >
          <Bell className="h-4 w-4" />
          {totalCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {totalCount > 99 ? "99+" : totalCount}
            </span>
          )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="pubg-loadout-card w-[380px] overflow-hidden !rounded-xl !p-0 border border-white/5 bg-[rgba(8,6,15,0.97)] text-white shadow-2xl backdrop-blur-xl"
      >
        <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
        <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-[#ec4899] shadow-[0_0_10px_rgba(236,72,153,0.8)]" />
        <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-12 w-12 opacity-25 z-[5]" />

        <div className="relative z-10 flex flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-pink-400" />
              <span className="text-sm font-bold">უწყებები</span>
              {totalCount > 0 && <span className="rounded-full bg-pink-500/15 px-1.5 py-0.5 text-[10px] font-bold text-pink-300">{totalCount}</span>}
            </div>
            <button onClick={() => router.push("/announcements")} className="text-[11px] font-semibold text-cyan-300 transition-colors hover:text-cyan-100">
              ყველას ნახვა
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto p-2">
            {[...personal, ...announcements]
              .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
              .slice(0, 8)
              .map((item) => {
                const isPersonal = "read_at" in item;
                const unread = isPersonal ? !item.read_at : !readAnnouncementIds.has(item.id);
                return (
                  <button
                    key={`${isPersonal ? "notification" : "announcement"}-${item.id}`}
                    onClick={() => isPersonal ? void openNotification(item) : void markAnnouncementRead(item.id)}
                    className={`relative flex w-full gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-white/[0.06] ${unread ? "bg-pink-500/[0.06]" : ""}`}
                  >
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${unread ? "bg-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.85)]" : "bg-white/15"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className={`line-clamp-1 text-[13px] ${unread ? "font-semibold text-white" : "font-medium text-white/75"}`}>{item.title}</span>
                        <span className="shrink-0 text-[10px] text-white/40">{timeAgo(item.created_at)}</span>
                      </span>
                      {item.body && <span className="mt-1 block line-clamp-2 text-[12px] leading-relaxed text-white/55">{item.body}</span>}
                    </span>
                    {isPersonal && item.link ? <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-white/35" /> : null}
                  </button>
                );
              })}
            {personal.length + announcements.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-white/50">
                <Info className="h-5 w-5 text-cyan-300/75" />
                <span className="text-sm">უწყება ჯერ არ გაქვს</span>
              </div>
            )}
          </div>

          <button
            onClick={() => router.push("/announcements")}
            className="flex w-full items-center justify-center gap-2 border-t border-white/10 px-4 py-3 text-[11px] font-bold text-cyan-300 transition-colors hover:bg-cyan-400/[0.08] hover:text-cyan-100"
          >
            ყველა უწყების გახსნა <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
