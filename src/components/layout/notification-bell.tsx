"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { loadAndClearInvites, type GameInvite } from "@/components/invite-button";
import { INVITE_TOAST_DURATION_MS } from "@/lib/constants";
import { playInviteSound } from "@/lib/sounds";
import { useUnreadAnnouncements } from "./use-nav-data";

export function NotificationBell() {
  const [pending, setPending] = useState<GameInvite[]>([]);
  // Announcements come from the shared nav poller (one request serves the
  // bell, the mobile nav and the webview nav). Locally dismissed ids bridge
  // the gap until the poller refetches and sees the server-side read marks.
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const unreadAnnouncements = useUnreadAnnouncements().filter((a) => !dismissedIds.has(a.id));
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

    checkInvites();
    const id = setInterval(checkInvites, 2000);
    return () => {
      clearInterval(id);
    };
  }, []);

  const totalCount = pending.length + unreadAnnouncements.length;

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
