"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "gameroom_profile";

export function ProfileDisplayName({ fallback }: { fallback: string }) {
  const [name, setName] = useState(fallback);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.displayName) setName(saved.displayName);
      }
    } catch {}
  }, []);

  return <>{name}</>;
}
