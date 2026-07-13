"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Share2, Link2 } from "lucide-react";

// Client surface for the invite link: builds the absolute URL from the current
// origin (so it's always correct per host), with copy + native-share actions.
// The shared link is the public gamer card (/g/username) — it renders a rich
// OG preview and its own "join" CTA carries the referral code. Falls back to
// the plain capture route (/i/CODE) if the username isn't available yet.
export function InviteLinkCard({
  code,
  username,
  serverOrigin,
}: {
  code: string;
  username: string;
  serverOrigin: string;
}) {
  const [origin, setOrigin] = useState(serverOrigin);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Only update if it differs from the server-provided origin
    if (typeof window !== "undefined" && window.location.origin !== serverOrigin) {
      const timer = setTimeout(() => setOrigin(window.location.origin), 0);
      return () => clearTimeout(timer);
    }
  }, [serverOrigin]);

  const link = username ? `${origin}/g/${username}` : `${origin}/i/${code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const share = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: "PlayGame.ge",
          text: "შემომიერთდი PlayGame-ზე — ქართველი გეიმერების სოციალური ქსელი 🎮",
          url: link,
        });
        return;
      } catch {}
    }
    copy();
  };

  return (
    <div className="pubg-loadout-link block" data-variant="royale">
      <div className="pubg-loadout-card relative overflow-hidden p-5 sm:p-6">
        <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
        <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-pink-500/80 shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
        <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-12 w-12 opacity-25 z-[5]" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.14em] text-pink-400 drop-shadow-[0_0_6px_rgba(236,72,153,0.4)]">
            <Link2 className="h-4 w-4" /> შენი მოსაწვევი ბმული
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-3">
            <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-white/85">{link}</span>
            <button
              type="button"
              onClick={copy}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-black uppercase tracking-wider transition-all duration-300 ${
                copied
                  ? "bg-[var(--gr-lime)]/15 text-[var(--gr-lime)] border border-[var(--gr-lime)]/30"
                  : "bg-pink-500 hover:bg-pink-400 text-white shadow-[0_0_10px_rgba(236,72,153,0.4)]"
              }`}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "დაკოპირდა" : "კოპირება"}
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={share}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-pink-500/30 bg-pink-500/10 px-4 py-2.5 text-[13px] font-black uppercase tracking-wider text-pink-400 transition-all hover:bg-pink-500/20"
            >
              <Share2 className="h-4 w-4" /> გაზიარება
            </button>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-center">
              <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-white/40">კოდი</span>
              <span className="font-mono text-[14px] font-black tracking-widest text-white">{code}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
