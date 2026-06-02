"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { FollowButton } from "@/components/follow-button";

type FriendUser = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

type ListType = "following" | "followers";

type Props = {
  username: string;
  currentUserId: string | null;
};

export function ProfileFriendsTab({ username, currentUserId }: Props) {
  const [activeList, setActiveList] = useState<ListType>("following");
  const requestKey = `${username}:${activeList}`;
  const [friendsState, setFriendsState] = useState<{ key: string; users: FriendUser[] | null }>({
    key: "",
    users: null,
  });
  const loading = friendsState.key !== requestKey || friendsState.users === null;
  const users: FriendUser[] = loading ? [] : friendsState.users ?? [];

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/profile/${encodeURIComponent(username)}/friends?type=${activeList}`)
      .then((r) => r.json())
      .then((data: FriendUser[]) => {
        if (!cancelled) setFriendsState({ key: requestKey, users: Array.isArray(data) ? data : [] });
      })
      .catch(() => {
        if (!cancelled) setFriendsState({ key: requestKey, users: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [username, activeList, requestKey]);

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        {(["following", "followers"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveList(t)}
            className={`rounded-md px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
              activeList === t
                ? "bg-[var(--gr-cyan-glow)]/15 text-[var(--gr-cyan-glow)] ring-1 ring-[var(--gr-cyan-glow)]/30"
                : "text-[var(--gr-text-mute)] hover:text-[var(--gr-text-hi)]"
            }`}
          >
            {t === "following" ? "მიყვება" : "მიყვებიან"}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[62px] animate-pulse rounded-lg bg-[var(--gr-bg-2)]"
            />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Users className="h-10 w-10 text-[var(--gr-text-mute)]" />
          <p className="text-sm text-[var(--gr-text-mute)]">
            {activeList === "following" ? "არავის მიყვება" : "მიმდევარი არ ჰყავს"}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {users.map((user) => {
            const isSelf = user.id === currentUserId;
            const displayName = user.display_name ?? user.username;
            return (
              <li
                key={user.id}
                className="flex items-center gap-3 rounded-lg bg-[var(--gr-bg-2)] px-4 py-3 ring-1 ring-[var(--gr-border)]"
              >
                <Link href={`/profile/${user.username}`} className="shrink-0">
                  <UserAvatar
                    username={user.username}
                    displayName={displayName}
                    avatarUrl={user.avatar_url}
                    size="md"
                  />
                </Link>
                <Link
                  href={`/profile/${user.username}`}
                  className="min-w-0 flex-1 hover:opacity-80"
                >
                  <p className="truncate text-sm font-semibold text-[var(--gr-text-hi)]">
                    {displayName}
                  </p>
                  <p className="truncate text-xs text-[var(--gr-text-mute)]">
                    @{user.username}
                  </p>
                </Link>
                {!isSelf && currentUserId && (
                  <FollowButton username={user.username} initialFollowing={false} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
