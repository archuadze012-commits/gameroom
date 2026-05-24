"use client";

import { useState, useTransition } from "react";
import { Coins, ShieldCheck } from "lucide-react";
import { adminGrantCurrency } from "@/lib/wallet/actions";

type Props = {
  targetUserId: string;
  targetUsername: string;
};

const CURRENCIES = [
  { value: "nc" as const, label: "Noob Coin", color: "text-[#C8D4DC]" },
  { value: "pro" as const, label: "Pro Coin", color: "text-[var(--gr-amber)]" },
];

const QUICK_AMOUNTS = [10, 50, 100, 500];

export function AdminGrantCoins({ targetUserId, targetUsername }: Props) {
  const [currency, setCurrency] = useState<"nc" | "pro">("nc");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseInt(amount, 10);
    if (!parsed || parsed <= 0) {
      setFeedback({ type: "error", msg: "შეიყვანე დადებითი რიცხვი" });
      return;
    }

    startTransition(async () => {
      const result = await adminGrantCurrency(targetUserId, currency, parsed, note, targetUsername);
      if (result.success) {
        setFeedback({ type: "success", msg: `+${result.amount} ${result.currency.toUpperCase()} დარიცხულია` });
        setAmount("");
        setNote("");
      } else {
        const msgs: Record<string, string> = {
          unauthorized: "არ გაქვს ადმინის უფლება",
          invalid_amount: "არასწორი რაოდენობა",
          unknown: "შეცდომა — სცადე თავიდან",
        };
        setFeedback({ type: "error", msg: msgs[result.error] ?? "შეცდომა" });
      }
      setTimeout(() => setFeedback(null), 3500);
    });
  }

  return (
    <section className="mt-6 border border-dashed border-[color-mix(in_srgb,var(--gr-amber)_35%,transparent)] bg-[color-mix(in_srgb,var(--gr-amber)_4%,transparent)] p-4 [clip-path:polygon(0_0,calc(100%-14px)_0,100%_14px,100%_100%,0_100%)]">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[var(--gr-amber)]" />
        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--gr-amber)]">
          ადმინი — ქოინების დარიცხვა
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Currency selector */}
        <div className="flex gap-2">
          {CURRENCIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCurrency(c.value)}
              className={`flex h-8 items-center gap-1.5 px-3 text-[10px] font-black uppercase tracking-[0.12em] ring-1 transition [clip-path:polygon(0_0,calc(100%-7px)_0,100%_7px,100%_100%,0_100%)] ${
                currency === c.value
                  ? "bg-[color-mix(in_srgb,var(--gr-amber)_18%,transparent)] text-[var(--gr-amber)] ring-[color-mix(in_srgb,var(--gr-amber)_50%,transparent)]"
                  : "bg-[var(--gr-bg-2)] text-[var(--gr-text-dim)] ring-[var(--gr-border)] hover:text-[var(--gr-text)]"
              }`}
            >
              <Coins className={`h-3 w-3 ${currency === c.value ? "text-[var(--gr-amber)]" : c.color}`} />
              {c.label}
            </button>
          ))}
        </div>

        {/* Quick amounts */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_AMOUNTS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount(String(q))}
              className="h-6 px-2.5 text-[10px] font-bold tabular-nums ring-1 ring-[var(--gr-border)] bg-[var(--gr-bg-2)] text-[var(--gr-text-dim)] hover:text-[var(--gr-text)] hover:ring-[var(--gr-border-hi)] transition"
            >
              +{q}
            </button>
          ))}
        </div>

        {/* Amount input */}
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="რაოდენობა"
            className="h-8 w-28 bg-[var(--gr-bg-2)] px-2.5 text-[12px] font-bold tabular-nums text-[var(--gr-text)] ring-1 ring-[var(--gr-border)] placeholder:text-[var(--gr-text-dim)] focus:outline-none focus:ring-[var(--gr-border-hi)]"
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="შენიშვნა (სურვილისამებრ)"
            className="h-8 flex-1 bg-[var(--gr-bg-2)] px-2.5 text-[12px] text-[var(--gr-text)] ring-1 ring-[var(--gr-border)] placeholder:text-[var(--gr-text-dim)] focus:outline-none focus:ring-[var(--gr-border-hi)]"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending || !amount}
            className="h-8 px-4 text-[10px] font-black uppercase tracking-[0.16em] text-black transition [clip-path:polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,0_100%)] disabled:opacity-40"
            style={{ background: "linear-gradient(180deg,#f5c842 0%,#e6a800 55%,#c87f00 100%)" }}
          >
            {isPending ? "მიმდინარეობს..." : "დარიცხვა"}
          </button>
          {feedback && (
            <span className={`text-[11px] font-bold ${feedback.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
              {feedback.msg}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
