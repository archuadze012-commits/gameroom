"use client";

import { useEffect, useState } from "react";

export function ProfileDisplayName({ fallback, userId }: { fallback: string; userId?: string }) {
  const [name, setName] = useState(fallback);

  useEffect(() => {
    if (!userId) return;
    try {
      const raw = localStorage.getItem(`gameroom_profile_${userId}`);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.displayName) setName(saved.displayName);
      }
    } catch {}
  }, [userId]);

  return <>{name}</>;
}
