"use client";

import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  targetType: "message" | "post" | "profile";
  targetId: string;
  className?: string;
  iconSize?: string;
};

export function ReportButton({ targetType, targetId, className, iconSize = "h-3.5 w-3.5" }: Props) {
  const [sending, setSending] = useState(false);

  const handleReport = async () => {
    const reason = prompt("რატომ ფიქრობ, რომ ეს კონტენტი არღვევს წესებს?");
    if (!reason || !reason.trim()) return;

    setSending(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason: reason.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Report გაიგზავნა — ვნახავთ რა მოხდა.");
    } catch {
      toast.error("შეცდომა");
    } finally {
      setSending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleReport}
      disabled={sending}
      className={`text-muted-foreground/60 transition-colors hover:text-rose-400 ${className ?? ""}`}
      title="Report"
    >
      {sending ? <Loader2 className={`${iconSize} animate-spin`} /> : <Flag className={iconSize} />}
    </button>
  );
}
