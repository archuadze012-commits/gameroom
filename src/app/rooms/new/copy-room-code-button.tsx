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
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 text-[10.5px] font-black uppercase tracking-[0.14em] text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)] transition-all hover:border-cyan-500/50 hover:bg-cyan-500/20 hover:scale-105"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "დაკოპირდა" : "კოპირება"}
    </button>
  );
}
