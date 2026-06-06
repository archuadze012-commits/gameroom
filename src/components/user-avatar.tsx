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
    window.addEventListener("gameroom_avatars_updated", read);
    const bc = new BroadcastChannel("gameroom_avatars");
    bc.onmessage = read;
    
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("gameroom_avatars_updated", read);
      bc.close();
    };
  }, [username, avatarUrl]);

  const px = size === "sm" ? 32 : size === "lg" ? 56 : 40;

  return (
    <div
      className={`border border-border rounded-full overflow-hidden bg-primary/15 flex items-center justify-center shrink-0 ${className ?? ""}`}
      style={{ width: px, height: px }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={displayName ?? username}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <span className="text-primary font-semibold text-sm">{initials}</span>
      )}
    </div>
  );
}
