"use client";

import { useState } from "react";
import { Loader2, Ticket, Check } from "lucide-react";
import { toast } from "sonner";

export function ReferralRedeemSection() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clean.length < 4) {
      toast.error("კოდი არასწორია.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/referral/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: clean }),
      });
      if (res.ok) {
        setDone(true);
        toast.success("მომწვევი დაფიქსირდა ✅ — გააქტიურდი და ორივემ მიიღებთ NC-ს.");
        return;
      }
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      const msg =
        err.error === "already_referred" ? "მომწვევი უკვე მითითებულია."
        : err.error === "self_referral" ? "საკუთარ კოდს ვერ გამოიყენებ."
        : err.error === "code_not_found" || err.error === "invalid_code" ? "ასეთი კოდი ვერ მოიძებნა."
        : err.error === "window_closed" ? "პრომოკოდის მითითების ვადა ამოიწურა."
        : err.error === "rate_limited" ? "ძალიან ხშირად ცდილობ — მოიცადე წამით."
        : "ვერ მოხერხდა — სცადე თავიდან.";
      toast.error(msg);
    } catch {
      toast.error("ქსელის შეცდომა — სცადე თავიდან.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex items-center gap-2.5 border border-[var(--gr-lime)]/25 bg-[var(--gr-lime)]/[0.06] px-4 py-3 text-[13px] font-medium text-[var(--gr-lime)] [clip-path:polygon(0_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%)]">
        <Check className="h-4 w-4 shrink-0" />
        მომწვევი დაფიქსირდა. გააქტიურდი პლატფორმაზე — ორივემ მიიღებთ NC-ს.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-[12.5px] leading-relaxed text-white/55">
        თუ მეგობარმა მოგიწვია — ჩაწერე მისი პრომოკოდი. როცა გააქტიურდები, შენ +500 NC მიიღებ, ის კი +1000 NC-ს.
      </p>
      <div className="flex items-stretch gap-2">
        <div className="relative flex-1 max-w-xs">
          <Ticket className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="მაგ. AB2CD9XY"
            maxLength={12}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="block h-11 w-full border-b-2 border-white/10 bg-black/40 pl-9 pr-4 font-mono text-[15px] font-bold uppercase tracking-[0.2em] text-white transition-all placeholder:font-sans placeholder:tracking-normal placeholder:text-white/25 focus:border-[var(--gr-violet-hi)] focus:bg-black/60 focus:outline-none hover:bg-black/50 [clip-path:polygon(0_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%)]"
          />
        </div>
        <button
          type="submit"
          disabled={loading || clean.length < 4}
          className="group relative inline-flex items-center justify-center gap-2 overflow-hidden bg-[var(--gr-violet-hi)] px-6 font-display text-[13px] font-bold uppercase tracking-widest text-white transition-all hover:brightness-110 [clip-path:polygon(0_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%)] shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          გამოყენება
        </button>
      </div>
    </form>
  );
}
