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
    { id: "lfg", label: "LFG", icon: <Search className="h-3.5 w-3.5" /> },
    { id: "friends", label: "მეგობრები", icon: <Users className="h-3.5 w-3.5" /> },
  ];

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto border-b border-[#1e2a44]">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-[#9fb3d1] hover:text-foreground"
              }`}
            >
              {t.icon}
              {t.label}
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
