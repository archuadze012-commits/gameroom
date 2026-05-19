"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { loadAndClearInvites, type GameInvite } from "@/components/invite-button";
import { playInviteSound } from "@/lib/sounds";

export function NotificationBell() {
  const [pending, setPending] = useState<GameInvite[]>([]);
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
    return () => clearInterval(id);
  }, []);

  const handleClick = () => {
    if (pending.length === 0) return;

    try {
      const raw = localStorage.getItem("gameroom_profile");
      const profile = raw ? JSON.parse(raw) : {};
      const username: string = profile.username ?? "";
      const invites = loadAndClearInvites(username);
      setPending([]);

      invites.forEach((invite, i) => {
        setTimeout(() => {
          toast(`${invite.fromDisplay}-ს ${invite.gameName}-ს თამაში წყურია. რას იზამ?`, {
            duration: 15000,
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
      {pending.length > 0 && (
        <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
          {pending.length}
        </span>
      )}
    </Button>
  );
}
