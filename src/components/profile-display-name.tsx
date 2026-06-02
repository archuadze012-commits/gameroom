"use client";

import { useState } from "react";

function getInitialName(fallback: string, userId?: string) {
  if (!userId || typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(`gameroom_profile_${userId}`);
    if (!raw) return fallback;
    const saved = JSON.parse(raw) as { displayName?: string };
    return saved.displayName || fallback;
  } catch {
    return fallback;
  }
}

export function ProfileDisplayName({ fallback, userId }: { fallback: string; userId?: string }) {
  const [name] = useState(() => getInitialName(fallback, userId));

  return <>{name}</>;
}
