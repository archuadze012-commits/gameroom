"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Coins, Loader2, Check, Sparkles, Lock, HandCoins, Palette } from "lucide-react";
import { toast } from "sonner";
import { accentDef } from "@/lib/clan/cosmetics";
import { donateClanNcAction, buyClanCosmeticAction, equipClanCosmeticAction } from "./treasury-actions";

export type CatalogItem = { key: string; name: string; type: "accent" | "emblem"; cost: number; value: string };
export type LedgerItem = { id: string; delta: number; kind: string; memo: string | null; created_at: string; who: string | null };

const QUICK = [500, 1000, 5000];

function ago(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d <= 0) return "დღეს";
  if (d === 1) return "გუშინ";
  return `${d}დ`;
}

export function ClanTreasury({
  clanSlug,
  canManage,
  treasury,
  walletNc,
  catalog,
  owned,
  equipped,
  ledger,
}: {
  clanSlug: string;
  canManage: boolean;
  treasury: number;
  walletNc: number | null;
  catalog: CatalogItem[];
  owned: string[];
  equipped: { accent: string | null; emblem: string | null };
  ledger: LedgerItem[];
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [amount, setAmount] = useState("");
  const ownedSet = new Set(owned);
  const catByKey = new Map(catalog.map((c) => [c.key, c]));

  const donate = (amt: number) => {
    if (amt <= 0) return;
    start(async () => {
      const res = await donateClanNcAction(clanSlug, amt);
      if (res.success) {
        toast.success(res.message ?? "შემოწირულია");
        setAmount("");
        router.refresh();
      } else toast.error(res.message ?? "ვერ მოხერხდა");
    });
  };

  const buy = (key: string) => {
    start(async () => {
      const res = await buyClanCosmeticAction(clanSlug, key);
      if (res.success) {
        toast.success(res.message ?? "შეძენილია");
        router.refresh();
      } else toast.error(res.message ?? "ვერ მოხერხდა");
    });
  };

  const equip = (type: "accent" | "emblem", key: string | null) => {
    start(async () => {
      const res = await equipClanCosmeticAction(clanSlug, type, key);
      if (res.success) {
        toast.success(res.message ?? "განახლდა");
        router.refresh();
      } else toast.error(res.message ?? "ვერ მოხერხდა");
    });
  };

  const accents = catalog.filter((c) => c.type === "accent");
  const emblems = catalog.filter((c) => c.type === "emblem");

  return (
    <div className="space-y-5">
      {/* Balance */}
      <div className="pubg-loadout-link block" data-variant="royale">
        <div className="pubg-loadout-card relative overflow-hidden p-5">
          <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
          <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-amber-500/80" />
          <div className="relative z-10 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-400">
              <Coins className="h-6 w-6" />
            </span>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-white/40">კლანის ხაზინა</div>
              <div className="text-[30px] font-black leading-none tabular-nums text-white">
                {treasury.toLocaleString()} <span className="text-[14px] text-amber-400/80">NC</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Donate */}
      <div className="pubg-loadout-link block" data-variant="strike">
        <div className="pubg-loadout-card relative overflow-hidden p-5">
          <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
          <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-[var(--gr-lime)]/70" />
          <div className="relative z-10">
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.12em] text-white">
                <HandCoins className="h-4 w-4 text-[var(--gr-lime)]" /> შემოწირულობა
              </div>
              {walletNc != null && <span className="text-[11px] font-bold text-white/40">შენი: {walletNc.toLocaleString()} NC</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={isPending}
                  onClick={() => donate(q)}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] font-black tabular-nums text-white/80 transition-colors hover:border-[var(--gr-lime)]/40 hover:text-[var(--gr-lime)] disabled:opacity-50"
                >
                  {q.toLocaleString()}
                </button>
              ))}
              <div className="flex flex-1 items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="თანხა"
                  disabled={isPending}
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[13px] tabular-nums text-white outline-none focus:border-[var(--gr-lime)]/50 disabled:opacity-50"
                />
                <button
                  type="button"
                  disabled={isPending || !amount || parseInt(amount, 10) <= 0}
                  onClick={() => donate(parseInt(amount, 10))}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--gr-lime)]/90 px-3.5 py-1.5 text-[12px] font-black uppercase tracking-wider text-[#0a1a05] transition-all hover:brightness-110 disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Coins className="h-3.5 w-3.5" />}
                  შეწირვა
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cosmetics shop */}
      <div className="pubg-loadout-link block" data-variant="royale">
        <div className="pubg-loadout-card relative overflow-hidden p-5">
          <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
          <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-[var(--gr-violet-hi)]/70" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.12em] text-white">
              <Sparkles className="h-4 w-4 text-[var(--gr-violet-hi)]" /> კოსმეტიკა
            </div>
            {!canManage && <p className="text-[11.5px] text-white/40">შეძენა/აღჭურვა შეუძლია მხოლოდ ლიდერს/ოფიცერს.</p>}

            {/* Accents */}
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                <Palette className="h-3.5 w-3.5" /> აქცენტის ფერი
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {accents.map((c) => {
                  const def = accentDef(c.value);
                  const isOwned = ownedSet.has(c.key);
                  const isEquipped = equipped.accent === c.value;
                  return (
                    <CosmeticTile
                      key={c.key}
                      name={c.name}
                      cost={c.cost}
                      owned={isOwned}
                      equipped={isEquipped}
                      canManage={canManage}
                      canAfford={treasury >= c.cost}
                      pending={isPending}
                      onBuy={() => buy(c.key)}
                      onEquip={() => equip("accent", isEquipped ? null : c.key)}
                      preview={
                        <span
                          className="h-8 w-8 rounded-lg"
                          style={{ background: `linear-gradient(135deg, ${def?.hex ?? "#888"}, ${def?.hex2 ?? "#555"})` }}
                        />
                      }
                    />
                  );
                })}
              </div>
            </div>

            {/* Emblems */}
            <div>
              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/40">ემბლემა</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {emblems.map((c) => {
                  const isOwned = ownedSet.has(c.key);
                  const isEquipped = equipped.emblem === c.value;
                  return (
                    <CosmeticTile
                      key={c.key}
                      name={c.name}
                      cost={c.cost}
                      owned={isOwned}
                      equipped={isEquipped}
                      canManage={canManage}
                      canAfford={treasury >= c.cost}
                      pending={isPending}
                      onBuy={() => buy(c.key)}
                      onEquip={() => equip("emblem", isEquipped ? null : c.key)}
                      preview={<span className="text-[26px] leading-none">{c.value}</span>}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ledger */}
      {ledger.length > 0 && (
        <div className="pubg-loadout-link block" data-variant="strike">
          <div className="pubg-loadout-card relative overflow-hidden p-5">
            <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
            <div className="relative z-10">
              <div className="mb-3 text-[11px] font-black uppercase tracking-[0.14em] text-white/40">ისტორია</div>
              <ul className="space-y-2">
                {ledger.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 text-[12.5px]">
                    <span className="min-w-0 truncate text-white/60">
                      {l.kind === "donation"
                        ? `${l.who ?? "წევრმა"} შემოწირა`
                        : `შეძენა — ${l.memo && catByKey.get(l.memo)?.name ? catByKey.get(l.memo)!.name : "კოსმეტიკა"}`}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className={`font-black tabular-nums ${l.delta >= 0 ? "text-[var(--gr-lime)]" : "text-white/50"}`}>
                        {l.delta >= 0 ? "+" : ""}{l.delta.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-white/25">{ago(l.created_at)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CosmeticTile({
  name,
  cost,
  owned,
  equipped,
  canManage,
  canAfford,
  pending,
  onBuy,
  onEquip,
  preview,
}: {
  name: string;
  cost: number;
  owned: boolean;
  equipped: boolean;
  canManage: boolean;
  canAfford: boolean;
  pending: boolean;
  onBuy: () => void;
  onEquip: () => void;
  preview: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border p-3 ${equipped ? "border-[var(--gr-violet-hi)]/50 bg-[var(--gr-violet)]/[0.1]" : "border-white/[0.07] bg-white/[0.02]"}`}>
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center">{preview}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-black text-white">{name}</div>
          {!owned && <div className="text-[10px] font-bold tabular-nums text-amber-400/80">{cost.toLocaleString()} NC</div>}
        </div>
      </div>
      {canManage && (
        <div className="mt-2.5">
          {!owned ? (
            <button
              type="button"
              disabled={pending || !canAfford}
              onClick={onBuy}
              className="flex w-full items-center justify-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-40"
            >
              {!canAfford ? <Lock className="h-3 w-3" /> : <Coins className="h-3 w-3" />} ყიდვა
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={onEquip}
              className={`flex w-full items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50 ${
                equipped
                  ? "border-[var(--gr-violet-hi)]/50 bg-[var(--gr-violet)]/15 text-[var(--gr-violet-hi)]"
                  : "border-white/12 bg-white/[0.03] text-white/70 hover:text-white"
              }`}
            >
              {equipped ? <><Check className="h-3 w-3" /> აღჭურვილი</> : "აღჭურვა"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
