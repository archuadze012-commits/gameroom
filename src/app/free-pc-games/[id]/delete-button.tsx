"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AdminDeleteButton({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/cracked-games/${encodeURIComponent(gameId)}`, { method: "DELETE" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || "შეცდომა");
      }
      toast.success("თამაში წაიშალა");
      router.push("/free-pc-games");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "შეცდომა");
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex h-9 items-center gap-1.5 rounded-md border border-red-500/50 bg-red-500/15 px-3 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/25 disabled:opacity-60"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          დადასტურება
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:text-foreground"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-red-500/30 bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20"
      title="თამაშის წაშლა"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
