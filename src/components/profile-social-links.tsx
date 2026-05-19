"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const STORAGE_KEY = "gameroom_profile";

const YoutubeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
  </svg>
);

type Props = {
  defaultYtHandle: string;
  defaultTtHandle: string;
  ytSubscribers: string;
  ttFollowers: string;
  isOwner: boolean;
  userId?: string;
};

export function ProfileSocialLinks({
  defaultYtHandle,
  defaultTtHandle,
  ytSubscribers,
  ttFollowers,
  isOwner,
  userId,
}: Props) {
  const [ytHandle, setYtHandle] = useState(defaultYtHandle);
  const [ttHandle, setTtHandle] = useState(defaultTtHandle);
  const [ttFollowersLocal, setTtFollowersLocal] = useState(ttFollowers);

  useEffect(() => {
    if (!isOwner || !userId) return;
    try {
      const raw = localStorage.getItem(`gameroom_profile_${userId}`);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.youtubeHandle) setYtHandle(saved.youtubeHandle);
        if (saved.tiktokHandle) setTtHandle(saved.tiktokHandle);
        if (saved.tiktokFollowers) setTtFollowersLocal(saved.tiktokFollowers);
      }
    } catch {}
  }, [isOwner, userId]);

  if (!ytHandle && !ttHandle) return null;

  const ytUrl = `https://youtube.com/@${ytHandle.replace(/^@/, "")}`;
  const ttUrl = `https://tiktok.com/@${ttHandle.replace(/^@/, "")}`;
  const ytDisplay = `@${ytHandle.replace(/^@/, "")}`;
  const ttDisplay = `@${ttHandle.replace(/^@/, "")}`;

  return (
    <div>
      <Separator className="mb-4" />
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        სოციალური არხები
      </h2>
    <div className="grid gap-3 sm:grid-cols-2">
      <a href={ytUrl} target="_blank" rel="noopener noreferrer" className="group">
        <Card className="border-border/60 transition-colors hover:border-red-500/60 hover:bg-red-500/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-500/15 text-red-500">
              <YoutubeIcon />
            </div>
            <div className="min-w-0 flex-1 flex items-center justify-between gap-4">
              <div>
                <p className="font-bold uppercase tracking-widest">YouTube</p>
                <p className="text-sm text-muted-foreground">{ytDisplay}</p>
              </div>
              <p className="shrink-0 text-2xl font-extrabold uppercase tracking-wider text-red-400">
                {ytSubscribers} <span className="text-sm font-semibold text-muted-foreground">SUBSCRIBERS</span>
              </p>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </CardContent>
        </Card>
      </a>
      <a href={ttUrl} target="_blank" rel="noopener noreferrer" className="group">
        <Card className="border-border/60 transition-colors hover:border-pink-500/60 hover:bg-pink-500/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pink-500/15 text-pink-500">
              <TikTokIcon />
            </div>
            <div className="min-w-0 flex-1 flex items-center justify-between gap-4">
              <div>
                <p className="font-bold uppercase tracking-widest">TikTok</p>
                <p className="text-sm text-muted-foreground">{ttDisplay}</p>
              </div>
              <p className="shrink-0 text-2xl font-extrabold uppercase tracking-wider text-pink-400">
                {ttFollowersLocal} <span className="text-sm font-semibold text-muted-foreground">FOLLOWERS</span>
              </p>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </CardContent>
        </Card>
      </a>
    </div>
    </div>
  );
}
