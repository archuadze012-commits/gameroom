"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { playInviteSound } from "@/lib/sounds";
import { useUnreadAnnouncements } from "./use-nav-data";

type PersonalNotification = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
};

export function NotificationBell() {
  const router = useRouter();
  const [personal, setPersonal] = useState<PersonalNotification[]>([]);
  // Announcements come from the shared nav poller (one request serves the
  // bell, the mobile nav and the webview nav). Locally dismissed ids bridge
  // the gap until the poller refetches and sees the server-side read marks.
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const unreadAnnouncements = useUnreadAnnouncements().filter((a) => !dismissedIds.has(a.id));
  const prevCountRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const loadPersonal = async () => {
      try {
        const response = await fetch("/api/notifications?unread=1", { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const data = await response.json();
        const unread = (Array.isArray(data.notifications) ? data.notifications : []).filter(
          (item: PersonalNotification) => !item.read_at,
        ) as PersonalNotification[];
        if (unread.length > prevCountRef.current) {
          playInviteSound();
        }
        prevCountRef.current = unread.length;
        setPersonal(unread);
      } catch {}
    };

    void loadPersonal();
    const id = window.setInterval(loadPersonal, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const totalCount = personal.length + unreadAnnouncements.length;

  const handleClick = async () => {
    if (totalCount === 0) return;

    // Show each announcement and mark it read. Fire the POSTs in parallel and
    // only locally dismiss the ids the server actually accepted — a swallowed
    // failure used to hide the announcement client-side while it stayed unread
    // server-side, so it re-toasted and re-counted on every later page load.
    const acked = await Promise.all(
      unreadAnnouncements.map(async (ann) => {
        const variantFn =
          ann.severity === "critical"
            ? toast.error
            : ann.severity === "warning"
            ? toast.warning
            : toast.info;
        variantFn(ann.title, { description: ann.body, duration: 12000 });
        try {
          const res = await fetch(`/api/announcements/${ann.id}/read`, { method: "POST" });
          return res.ok ? ann.id : null;
        } catch {
          return null;
        }
      })
    );
    const ackedIds = acked.filter((id): id is string => id !== null);
    if (ackedIds.length) {
      setDismissedIds((prev) => {
        const next = new Set(prev);
        ackedIds.forEach((id) => next.add(id));
        return next;
      });
    }

    const personalAcked = await Promise.all(
      personal.map(async (item, index) => {
        window.setTimeout(() => {
          toast(item.title, {
            description: item.body ?? undefined,
            duration: 12_000,
            action: item.link
              ? { label: "გახსნა", onClick: () => router.push(item.link!) }
              : undefined,
          });
        }, index * 350);
        try {
          const response = await fetch(`/api/notifications/${item.id}`, { method: "PATCH" });
          return response.ok ? item.id : null;
        } catch {
          return null;
        }
      }),
    );
    const personalAckedIds = new Set(personalAcked.filter((id): id is string => id !== null));
    if (personalAckedIds.size > 0) {
      setPersonal((current) => current.filter((item) => !personalAckedIds.has(item.id)));
      prevCountRef.current = Math.max(0, personal.length - personalAckedIds.size);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="შეტყობინებები"
      className="relative"
      onClick={handleClick}
    >
      <Bell className="h-4 w-4" />
      {totalCount > 0 && (
        <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
          {totalCount}
        </span>
      )}
    </Button>
  );
}
