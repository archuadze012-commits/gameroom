"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function CopyRoomCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("რუმის ID დაკოპირდა");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("ვერ დაკოპირდა");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 bg-[var(--gr-bg-2)] px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--gr-text-mute)] ring-1 ring-[var(--gr-border)] transition-colors hover:bg-[var(--gr-amber)]/10 hover:text-[var(--gr-amber)] hover:ring-[var(--gr-amber)]/40"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "დაკოპირდა" : "კოპირება"}
    </button>
  );
}
