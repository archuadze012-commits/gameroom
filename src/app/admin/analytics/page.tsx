"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Users, ShieldCheck, Ban, Flag, Loader2 } from "lucide-react";

type Analytics = {
  totals: { users: number; banned: number; verified: number; openReports: number };
  activity: { dau: number; wau: number; mau: number; posts7d: number; messages7d: number };
  signups7d: Record<string, number>;
  topChannels: { id: string; count: number }[];
  topGames: { slug: string; count: number }[];
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> ანალიტიკა იტვირთება...
      </div>
    );
  if (!data) return <p className="text-muted-foreground">მონაცემები ვერ ჩაიტვირთა.</p>;

  const maxSignup = Math.max(1, ...Object.values(data.signups7d));

  return (
    <div className="space-y-6">
      <h2 className="flex items-center gap-2 text-2xl font-bold">
        <BarChart3 className="h-5 w-5 text-primary" /> Analytics
      </h2>

      {/* totals */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={<Users />} label="სულ მომხმარებლები" value={data.totals.users} />
        <Stat icon={<ShieldCheck />} label="Verified" value={data.totals.verified} color="text-emerald-400" />
        <Stat icon={<Ban />} label="დაბანებული" value={data.totals.banned} color="text-rose-400" />
        <Stat icon={<Flag />} label="ღია reports" value={data.totals.openReports} color="text-amber-400" />
      </div>

      {/* activity */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">აქტივობა</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="DAU" value={data.activity.dau} />
            <Stat label="WAU" value={data.activity.wau} />
            <Stat label="MAU" value={data.activity.mau} />
            <Stat label="პოსტები (7d)" value={data.activity.posts7d} />
            <Stat label="მესიჯები (7d)" value={data.activity.messages7d} />
          </div>
        </CardContent>
      </Card>

      {/* signups chart */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground">რეგისტრაცია (ბოლო 7 დღე)</h3>
          <div className="flex h-48 items-end gap-2">
            {Object.entries(data.signups7d).map(([day, count]) => (
              <div key={day} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-bold tabular-nums">{count}</span>
                <div
                  className="w-full rounded-t bg-primary/40"
                  style={{ height: `${(count / maxSignup) * 100}%`, minHeight: "4px" }}
                />
                <span className="text-[10px] text-muted-foreground">{day.slice(5)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Top არხები (7d)</h3>
            <div className="space-y-1.5">
              {data.topChannels.length === 0 && (
                <p className="text-xs text-muted-foreground">მონაცემები არ არის</p>
              )}
              {data.topChannels.map((c) => (
                <div key={c.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">#{c.id}</span>
                  <span className="font-bold tabular-nums">{c.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Top თამაშები (favorites)</h3>
            <div className="space-y-1.5">
              {data.topGames.length === 0 && (
                <p className="text-xs text-muted-foreground">მონაცემები არ არის</p>
              )}
              {data.topGames.map((g) => (
                <div key={g.slug} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{g.slug}</span>
                  <span className="font-bold tabular-nums">{g.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
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
  value: number;
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
