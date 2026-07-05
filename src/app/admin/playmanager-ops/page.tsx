"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Coins, Wallet, ShoppingCart, Users, RotateCcw, AlertTriangle, Loader2 } from "lucide-react";

type Transaction = { id: number; amount: number; reason: string; createdAt: string; teamName: string };
type TransferPair = { teamA: string; teamB: string; count: number; totalGel: number };
type StuckFixture = { kind: "cup" | "league"; id: string; round: number; status: string; since: string | null; label: string };

type OpsData = {
  economy: {
    teamCount: number;
    walletSupply: number;
    activeListings: number;
    freeAgentPool: number;
    pendingRepack: number;
  };
  transactions: Transaction[];
  transferPairs: TransferPair[];
  stuckFixtures: StuckFixture[];
  generatedAt: string;
};

function fmtGel(n: number): string {
  return Math.round(n).toLocaleString("en-US").replace(/,/g, " ") + " ₾";
}

export default function PlayManagerOpsPage() {
  const [data, setData] = useState<OpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/admin/playmanager-ops")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> PlayManager ops იტვირთება...
      </div>
    );
  if (error || !data) return <p className="text-muted-foreground">მონაცემები ვერ ჩაიტვირთა.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Coins className="h-5 w-5 text-primary" /> PlayManager Ops
        </h2>
        <span className="text-xs text-muted-foreground">
          განახლდა: {new Date(data.generatedAt).toLocaleTimeString("ka-GE")}
        </span>
      </div>

      {/* economy totals */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat icon={<Wallet />} label="Wallet supply" value={fmtGel(data.economy.walletSupply)} />
        <Stat icon={<Users />} label="გუნდები" value={String(data.economy.teamCount)} />
        <Stat icon={<ShoppingCart />} label="აქტიური განცხადება" value={String(data.economy.activeListings)} />
        <Stat icon={<Users />} label="Free-agent pool" value={String(data.economy.freeAgentPool)} />
        <Stat
          icon={<RotateCcw />}
          label="Pending repack"
          value={String(data.economy.pendingRepack)}
          color={data.economy.pendingRepack > 0 ? "text-amber-400" : undefined}
        />
      </div>

      {/* stuck fixtures — the actionable-looking one, surfaced first */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-400" /> Stuck fixtures
          </h3>
          {data.stuckFixtures.length === 0 ? (
            <p className="text-xs text-muted-foreground">არაფერია გაჭედილი.</p>
          ) : (
            <div className="space-y-1.5">
              {data.stuckFixtures.map((f) => (
                <div key={`${f.kind}-${f.id}`} className="flex items-center justify-between rounded-md bg-secondary/40 px-3 py-1.5 text-sm">
                  <span className="text-muted-foreground">
                    [{f.kind === "cup" ? "თასი" : "ლიგა"}] R{f.round} · {f.label}
                  </span>
                  <span className="font-mono text-xs text-amber-300">
                    {f.status} · {f.since ? new Date(f.since).toLocaleString("ka-GE") : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* transfer pairs — repeated trades between the same two teams */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            გუნდების წყვილები · მიღებული შეთავაზებები (30 დღე)
          </h3>
          {data.transferPairs.length === 0 ? (
            <p className="text-xs text-muted-foreground">არცერთი გარიგება ბოლო 30 დღეში.</p>
          ) : (
            <div className="space-y-1.5">
              {data.transferPairs.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{p.teamA} ↔ {p.teamB}</span>
                  <span className={`font-bold tabular-nums ${p.count >= 2 ? "text-amber-400" : ""}`}>
                    {p.count}× · {fmtGel(p.totalGel)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* recent transactions ledger */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">ბოლო ტრანზაქციები</h3>
          {data.transactions.length === 0 ? (
            <p className="text-xs text-muted-foreground">ტრანზაქციები არ არის.</p>
          ) : (
            <div className="max-h-96 space-y-1 overflow-y-auto">
              {data.transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {t.teamName} · {t.reason}
                  </span>
                  <span className={`ml-2 shrink-0 font-bold tabular-nums ${t.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {t.amount >= 0 ? "+" : ""}{fmtGel(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  color,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-3 text-center">
        {icon && <div className={`flex justify-center ${color ?? "text-primary"}`}>{icon}</div>}
        <div className="text-xl font-bold tabular-nums">{value}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
