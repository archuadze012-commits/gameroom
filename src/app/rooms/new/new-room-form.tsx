"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, AlertCircle } from "lucide-react";
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

      if (active && active.length > 0 && active[0].expires_at) {
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
        // game_rooms.expires_at is NOT NULL — TDM rooms expire in 1h, others in 24h.
        expires_at: isTDM
          ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
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
      className="grid gap-5 rounded-[24px] border border-white/5 bg-black/40 p-5 sm:p-7 backdrop-blur-md shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
    >
      {mode !== "tdm" && (
        <label className="grid gap-2">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-400">
            რუმის ID *
          </span>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={12}
            required
            placeholder="მაგ. ABC123XYZ4"
            className="h-12 rounded-[14px] border border-cyan-500/30 bg-cyan-500/5 px-4 font-mono text-[15px] font-bold tracking-wider text-cyan-400 placeholder:text-cyan-400/30 outline-none transition-all focus:border-cyan-400 focus:bg-cyan-500/10 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)]"
          />
          <span className="text-[11px] font-medium text-white/40">
            ჩაწერე თამაშში შექმნილი რუმის ID
          </span>
        </label>
      )}

      {mode !== "tdm" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
              რუკა
            </span>
            <select
              value={map}
              onChange={(e) => setMap(e.target.value)}
              className="h-11 rounded-[12px] border border-white/10 bg-white/5 px-3 text-[13px] font-medium text-white outline-none transition-all focus:border-violet-500/50 focus:bg-violet-500/10"
            >
              {MAPS.map((m) => (
                <option key={m} value={m} className="bg-[#0a0714]">{m}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
              პერსპექტივა
            </span>
            <select
              value={perspective}
              onChange={(e) => setPerspective(e.target.value)}
              className="h-11 rounded-[12px] border border-white/10 bg-white/5 px-3 text-[13px] font-medium text-white outline-none transition-all focus:border-violet-500/50 focus:bg-violet-500/10"
            >
              {PERSPECTIVES.map((p) => (
                <option key={p} value={p} className="bg-[#0a0714]">{p}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
              მაქს. მოთამაშე
            </span>
            <input
              type="number"
              min={2}
              max={100}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Math.max(2, Math.min(100, Number(e.target.value) || 2)))}
              className="h-11 rounded-[12px] border border-white/10 bg-white/5 px-3 text-[13px] font-medium text-white outline-none transition-all focus:border-violet-500/50 focus:bg-violet-500/10"
            />
          </label>
        </div>
      )}

      <label className="grid gap-2">
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-pink-400">
          სად იქნება LIVE? *
        </span>
        <input
          type="text"
          value={streamChannel}
          onChange={(e) => setStreamChannel(e.target.value)}
          maxLength={120}
          required
          placeholder="დაწერე არხის სახელი ან ჩააგდე ლინკი"
          className="h-12 rounded-[14px] border border-pink-500/30 bg-pink-500/5 px-4 text-[14px] font-medium text-white placeholder:text-pink-400/30 outline-none transition-all focus:border-pink-400 focus:bg-pink-500/10 focus:shadow-[0_0_15px_rgba(236,72,153,0.2)]"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-violet-500/50 bg-[linear-gradient(135deg,#6366f1,#a855f7)] px-6 font-display text-[13px] font-black uppercase tracking-[0.18em] text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] active:scale-100 disabled:opacity-50 disabled:hover:scale-100"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        რუმის შექმნა
      </button>

      <div className="mt-2 flex items-start gap-3 rounded-[12px] border border-amber-500/30 bg-amber-500/10 p-3.5">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <p className="text-[12px] font-medium leading-relaxed text-amber-400/90">
          {mode === "tdm"
            ? "განაცხადი ავტომატურად დაიხურება 1 საათის შემდეგ, თუ თვითონ არ დახურავ."
            : "რუმი ავტომატურად წაიშლება 30 წუთის შემდეგ, თუ თვითონ არ დახურავ."}
        </p>
      </div>
    </form>
  );
}
