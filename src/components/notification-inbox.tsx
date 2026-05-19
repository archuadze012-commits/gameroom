"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { loadAndClearInvites } from "@/components/invite-button";

export function NotificationInbox() {
  useEffect(() => {
    try {
      const raw = localStorage.getItem("gameroom_profile");
      const profile = raw ? JSON.parse(raw) : {};
      const username: string = profile.username ?? "";
      if (!username) return;

      const invites = loadAndClearInvites(username);

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
        }, i * 800);
      });
    } catch {}
  }, []);

  return null;
}
