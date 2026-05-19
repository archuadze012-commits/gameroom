"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Props = {
  username: string;
  displayName?: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeMap = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
};

export function UserAvatar({ username, displayName, avatarUrl, size = "md", className }: Props) {
  const [src, setSrc] = useState(avatarUrl ?? null);
  const initials = (displayName ?? username).slice(0, 1).toUpperCase();

  useEffect(() => {
    function read() {
      try {
        if (avatarUrl) { setSrc(avatarUrl); return; }
        const raw = localStorage.getItem("gameroom_avatars");
        if (!raw) return;
        const map = JSON.parse(raw) as Record<string, string>;
        if (map[username]) setSrc(map[username]);
      } catch {}
    }
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, [username, avatarUrl]);

  return (
    <Avatar className={`${sizeMap[size]} border border-border ${className ?? ""}`}>
      {src && <AvatarImage src={src} alt={displayName ?? username} />}
      <AvatarFallback className="bg-primary/15 text-primary font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
