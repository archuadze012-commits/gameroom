"use client";

import { useState, type ReactNode } from "react";
import { Gamepad2, Rss, Search, Users } from "lucide-react";

type Tab = "games" | "posts" | "lfg" | "friends";

export function ProfileTabs({
  games,
  posts,
  lfg,
  friends,
}: {
  games: ReactNode;
  posts: ReactNode;
  lfg: ReactNode;
  friends: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("games");

  const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: "games", label: "თამაშები", icon: <Gamepad2 className="h-3.5 w-3.5" /> },
    { id: "posts", label: "პოსტები", icon: <Rss className="h-3.5 w-3.5" /> },
    { id: "lfg", label: "ლოკალი", icon: <Search className="h-3.5 w-3.5" /> },
    { id: "friends", label: "მეგობრები", icon: <Users className="h-3.5 w-3.5" /> },
  ];

  return (
    <div>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-[var(--gr-border)]">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`relative flex shrink-0 items-center gap-1.5 rounded-md px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gr-magenta)] ${
                active ? "text-[var(--gr-text-hi)]" : "text-[var(--gr-text-mute)] hover:text-[var(--gr-cyan-glow)]"
              }`}
            >
              {t.icon}
              {t.label}
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-x-2 -bottom-px h-[2px] bg-[linear-gradient(90deg,var(--gr-cyan-glow),var(--gr-magenta))] shadow-[0_0_10px_rgba(34,211,238,0.22),0_0_16px_rgba(192,38,211,0.3)]"
                />
              )}
            </button>
          );
        })}
      </div>
      <div className="pt-4">
        {tab === "games" && games}
        {tab === "posts" && posts}
        {tab === "lfg" && lfg}
        {tab === "friends" && friends}
      </div>
    </div>
  );
}
