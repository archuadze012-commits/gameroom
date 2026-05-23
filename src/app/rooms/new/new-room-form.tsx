"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  gameSlug: string;
  hostId: string;
  mode: string;
};

const MAPS = ["Erangel", "Sanhok", "Miramar", "Vikendi", "Livik"];
const PERSPECTIVES = ["TPP", "FPP"];

// Auto-generate a unique code (for modes without manual ID entry)
function generateRoomCode(prefix = ""): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const len = 12 - prefix.length;
  let out = prefix;
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function NewRoomForm({ gameSlug, hostId, mode }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [map, setMap] = useState(MAPS[1]);
  const [perspective, setPerspective] = useState(PERSPECTIVES[0]);
  const [maxPlayers, setMaxPlayers] = useState(100);
  const [streamChannel, setStreamChannel] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isTDM = mode === "tdm";
    const trimmedCode = isTDM ? generateRoomCode("TDM") : roomCode.trim().toUpperCase();
    if (!isTDM && !trimmedCode) {
      toast.error("რუმის ID შეიყვანე.");
      return;
    }
    if (!streamChannel.trim()) {
      toast.error("მიუთითე სად იქნება LIVE.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();

      // Cooldown check — user can't create another room in the same mode
      // until their previous one expires (whether still open or already closed).
      const { data: active } = await supabase
        .from("game_rooms")
        .select("expires_at")
        .eq("host_id", hostId)
        .eq("mode", mode)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1);

      if (active && active.length > 0) {
        const remainingMs = new Date(active[0].expires_at).getTime() - Date.now();
        const remainingMin = Math.max(1, Math.ceil(remainingMs / 60000));
        toast.error(`ჯერ ვერ ქმნი ახალს — დარჩა ${remainingMin} წთ.`);
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("game_rooms").insert({
        room_code: trimmedCode,
        game_slug: gameSlug,
        mode,
        host_id: hostId,
        title: trimmedCode,
        map: isTDM ? null : map,
        perspective: isTDM ? "TPP" : perspective,
        max_players: isTDM ? 8 : maxPlayers,
        current_players: 1,
        is_private: false,
        password: null,
        notes: streamChannel.trim() || null,
        status: "open",
        expires_at: isTDM
          ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
          : undefined,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("ეს ID უკვე გამოყენებულია — სხვა ID სცადე.");
        } else {
          throw error;
        }
        return;
      }

      toast.success(`რუმი შეიქმნა — ID: ${trimmedCode}`);
      setRoomCode("");
      setStreamChannel("");
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("ვერ შეიქმნა, სცადე თავიდან.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 bg-[var(--gr-bg-1)] p-4 ring-1 ring-[var(--gr-border)] sm:p-5"
      style={{ clipPath: "polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%)" }}
    >
      {mode !== "tdm" && (
        <label className="grid gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gr-amber)]">
            რუმის ID *
          </span>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={12}
            required
            placeholder="მაგ. ABC123XYZ4"
            className="bg-[var(--gr-bg-2)] px-3 py-2 font-mono text-[14px] font-bold tracking-wider text-[var(--gr-amber)] outline-none ring-1 ring-[var(--gr-amber)]/30 focus:ring-[var(--gr-amber)]"
          />
          <span className="text-[10px] text-[var(--gr-text-dim)]">
            ჩაწერე თამაშში შექმნილი რუმის ID
          </span>
        </label>
      )}

      {mode !== "tdm" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gr-text-dim)]">
              რუკა
            </span>
            <select
              value={map}
              onChange={(e) => setMap(e.target.value)}
              className="bg-[var(--gr-bg-2)] px-3 py-2 text-[13px] text-white outline-none ring-1 ring-[var(--gr-border)] focus:ring-[var(--gr-violet-hi)]"
            >
              {MAPS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gr-text-dim)]">
              პერსპექტივა
            </span>
            <select
              value={perspective}
              onChange={(e) => setPerspective(e.target.value)}
              className="bg-[var(--gr-bg-2)] px-3 py-2 text-[13px] text-white outline-none ring-1 ring-[var(--gr-border)] focus:ring-[var(--gr-violet-hi)]"
            >
              {PERSPECTIVES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gr-text-dim)]">
              მაქს. მოთამაშე
            </span>
            <input
              type="number"
              min={2}
              max={100}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Math.max(2, Math.min(100, Number(e.target.value) || 2)))}
              className="bg-[var(--gr-bg-2)] px-3 py-2 text-[13px] text-white outline-none ring-1 ring-[var(--gr-border)] focus:ring-[var(--gr-violet-hi)]"
            />
          </label>
        </div>
      )}

      <label className="grid gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gr-amber)]">
          სად იქნება LIVE? *
        </span>
        <input
          type="text"
          value={streamChannel}
          onChange={(e) => setStreamChannel(e.target.value)}
          maxLength={120}
          required
          placeholder="დაწერე არხის სახელი ან ჩააგდე ლინკი"
          className="bg-[var(--gr-bg-2)] px-3 py-2 text-[13px] text-white outline-none ring-1 ring-[var(--gr-border)] focus:ring-[var(--gr-violet-hi)]"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="mt-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--gr-violet)] to-[var(--gr-magenta)] px-4 py-2.5 font-display text-[13px] font-bold uppercase tracking-[0.16em] text-white transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
        style={{ clipPath: "polygon(0 0, 100% 0, calc(100% - 8px) 100%, 8px 100%)" }}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        რუმის შექმნა
      </button>

      <div className="flex items-start gap-2 bg-[var(--gr-amber)]/10 px-3 py-2.5 ring-1 ring-[var(--gr-amber)]/30">
        <span aria-hidden className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--gr-amber)] shadow-[0_0_8px_rgba(245,165,36,0.8)]" />
        <p className="text-[12px] font-semibold leading-snug text-[var(--gr-amber)]">
          {mode === "tdm"
            ? "განაცხადი ავტომატურად დაიხურება 1 საათის შემდეგ, თუ თვითონ არ დახურავ."
            : "რუმი ავტომატურად წაიშლება 30 წუთის შემდეგ, თუ თვითონ არ დახურავ."}
        </p>
      </div>
    </form>
  );
}
