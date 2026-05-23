"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function CloseRoomButton({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const close = async () => {
    if (loading) return;
    if (!confirm("რუმის დახურვა გსურს? ვადის ბოლომდე ვერ შექმნი ახალს.")) return;

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      // Mark as closed (rather than delete) so the cooldown is still enforced
      // until pg_cron cleans up at expires_at.
      const { error } = await supabase
        .from("game_rooms")
        .update({ status: "closed" })
        .eq("id", roomId);
      if (error) throw error;
      toast.success("რუმი დაიხურა");
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("ვერ დაიხურა, სცადე თავიდან.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={close}
      disabled={loading}
      className="inline-flex items-center gap-1.5 bg-red-500/10 px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-red-300 ring-1 ring-red-500/30 transition-colors hover:bg-red-500/20 hover:text-red-200 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
      რუმის დახურვა
    </button>
  );
}
