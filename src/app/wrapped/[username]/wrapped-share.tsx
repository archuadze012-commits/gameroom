"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

export function WrappedShare({ path, label }: { path: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const url =
      typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    const shareData = {
      title: "PlayGame Wrapped",
      text: "ნახე ჩემი სეზონური Wrapped PlayGame-ზე 🎮",
      url,
    };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // user cancelled the native sheet — fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — no-op, link is visible in the address bar anyway
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--gr-violet),var(--gr-magenta))] px-6 py-4 font-display text-[15px] font-black uppercase tracking-wider text-white shadow-[0_0_28px_rgba(139,92,246,0.4)] transition-all hover:brightness-110"
    >
      {copied ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
      {copied ? "ბმული დაკოპირდა" : label}
    </button>
  );
}
