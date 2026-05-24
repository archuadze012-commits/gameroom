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
              className={`relative flex shrink-0 items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gr-violet-hi)] rounded-md ${
                active ? "text-[var(--gr-text)]" : "text-[var(--gr-text-mute)] hover:text-[var(--gr-text)]"
              }`}
            >
              {t.icon}
              {t.label}
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-x-2 -bottom-px h-[2px] bg-[var(--gr-violet)] shadow-[0_0_10px_rgba(139,92,246,0.6)]"
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
