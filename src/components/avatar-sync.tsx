"use client";

import { useEffect } from "react";

export function AvatarSync({ username, avatarUrl }: { username: string; avatarUrl: string }) {
  useEffect(() => {
    if (!avatarUrl || avatarUrl === "/default-avatar.svg") return;
    try {
      const raw = localStorage.getItem("gameroom_avatars");
      const map = raw ? JSON.parse(raw) : {};
      if (map[username] === avatarUrl) return;
      map[username] = avatarUrl;
      localStorage.setItem("gameroom_avatars", JSON.stringify(map));
      window.dispatchEvent(new StorageEvent("storage", { key: "gameroom_avatars" }));
    } catch {}
  }, [username, avatarUrl]);

  return null;
}
