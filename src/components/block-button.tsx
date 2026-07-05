"use client";

import { useState } from "react";
import { Ban, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Props = {
  targetUserId: string;
  // Whether the caller is already blocking this user (initial state).
  initialBlocked?: boolean;
  className?: string;
};

// Block / unblock a user. A block prevents new DMs and message sends in either
// direction (enforced server-side by the DM/message gates).
export function BlockButton({ targetUserId, initialBlocked = false, className }: Props) {
  const [blocked, setBlocked] = useState(initialBlocked);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const toggle = async () => {
    if (busy) return;
    if (!blocked && !confirm("დაბლოკო ეს მენეჯერი? ვეღარ მოგწერთ და თქვენც ვერ მისწერთ.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/blocks", {
        method: blocked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUserId }),
      });
      if (!res.ok) throw new Error();
      const next = !blocked;
      setBlocked(next);
      toast.success(next ? "დაბლოკილია" : "ბლოკი მოხსნილია");
      router.refresh();
    } catch {
      toast.error("შეცდომა");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-colors ${
        blocked ? "text-rose-400 hover:text-rose-300" : "text-muted-foreground/70 hover:text-rose-400"
      } ${className ?? ""}`}
      title={blocked ? "ბლოკის მოხსნა" : "დაბლოკვა"}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
      {blocked ? "ბლოკის მოხსნა" : "დაბლოკვა"}
    </button>
  );
}
