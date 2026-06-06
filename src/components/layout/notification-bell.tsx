"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { loadAndClearInvites, type GameInvite } from "@/components/invite-button";
import { INVITE_TOAST_DURATION_MS, NAV_BADGE_POLL_INTERVAL_MS } from "@/lib/constants";
import { playInviteSound } from "@/lib/sounds";

type Announcement = {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  created_at: string;
};

export function NotificationBell() {
  const [pending, setPending] = useState<GameInvite[]>([]);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState<Announcement[]>([]);
  const prevCountRef = useRef(0);

  useEffect(() => {
    const checkInvites = () => {
      try {
        const raw = localStorage.getItem("gameroom_profile");
        const profile = raw ? JSON.parse(raw) : {};
        const username: string = profile.username ?? "";
        if (!username) return;

        const key = `gameroom_invites_${username}`;
        const invites: GameInvite[] = JSON.parse(localStorage.getItem(key) ?? "[]");

        if (invites.length > prevCountRef.current) {
          playInviteSound();
        }
        prevCountRef.current = invites.length;
        setPending(invites);
      } catch {}
    };

    const checkAnnouncements = async () => {
      try {
        const res = await fetch("/api/announcements");
        const data: { announcements: Announcement[]; readIds: string[] } = await res.json();
        const readSet = new Set(data.readIds ?? []);
        const unread = (data.announcements ?? []).filter((a) => !readSet.has(a.id));
        setUnreadAnnouncements(unread);
      } catch {}
    };

    checkInvites();
    checkAnnouncements();
    const id = setInterval(checkInvites, 2000);
    const idAnn = setInterval(checkAnnouncements, NAV_BADGE_POLL_INTERVAL_MS);
    return () => {
      clearInterval(id);
      clearInterval(idAnn);
    };
  }, []);

  const totalCount = pending.length + unreadAnnouncements.length;

  const handleClick = async () => {
    if (totalCount === 0) return;

    // Show announcements
    for (const ann of unreadAnnouncements) {
      const variantFn =
        ann.severity === "critical"
          ? toast.error
          : ann.severity === "warning"
          ? toast.warning
          : toast.info;
      variantFn(ann.title, { description: ann.body, duration: 12000 });
      try {
        await fetch(`/api/announcements/${ann.id}/read`, { method: "POST" });
      } catch {}
    }
    setUnreadAnnouncements([]);

    // Show invites
    try {
      const raw = localStorage.getItem("gameroom_profile");
      const profile = raw ? JSON.parse(raw) : {};
      const username: string = profile.username ?? "";
      const invites = loadAndClearInvites(username);
      setPending([]);

      invites.forEach((invite, i) => {
        setTimeout(() => {
          toast(`${invite.fromDisplay}-ს ${invite.gameName}-ს თამაში წყურია. რას იზამ?`, {
            duration: INVITE_TOAST_DURATION_MS,
            action: {
              label: "ვიყომარებ",
              onClick: () =>
                toast.success("წავედით 😎", {
                  description: `${invite.gameName}-ში ${invite.fromDisplay} გელოდება.`,
                }),
            },
            cancel: {
              label: "მეზარება",
              onClick: () =>
                toast("გასაგებია 😒", {
                  description: `${invite.fromDisplay} მაგარ უარზეა, იხტიბარს არ იტეხავს.`,
                }),
            },
          });
        }, i * 600);
      });
    } catch {}
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
