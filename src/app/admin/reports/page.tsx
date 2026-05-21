"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flag, Loader2, RefreshCw, Check, X } from "lucide-react";
import { toast } from "sonner";

type Report = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: string;
  created_at: string;
  profiles: { username: string; display_name: string | null } | null;
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"open" | "actioned" | "dismissed">("open");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?status=${tab}`);
      const data = await res.json();
      setReports(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tab]);

  const resolve = async (id: string, action: "dismiss" | "action") => {
    const res = await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId: id, action }),
    });
    if (res.ok) {
      toast.success(action === "dismiss" ? "Dismissed" : "Actioned");
      setReports((prev) => prev.filter((r) => r.id !== id));
    } else {
      toast.error("შეცდომა");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Flag className="h-5 w-5 text-primary" /> Reports
        </h2>
        <Button onClick={load} variant="outline" size="sm">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <div className="flex gap-1 rounded-lg border border-border/60 bg-secondary/20 p-1 w-fit">
        {(["open", "actioned", "dismissed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading && (
            <div className="flex items-center justify-center p-12 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> იტვირთება...
            </div>
          )}
          {!loading && reports.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">No reports.</p>
          )}
          {!loading &&
            reports.map((r) => (
              <div key={r.id} className="space-y-2 border-b border-border/60 p-4 last:border-0">
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline">{r.target_type}</Badge>
                  <code className="text-muted-foreground">{r.target_id}</code>
                  <span className="text-muted-foreground">
                    by {r.profiles?.username ?? "—"} ·{" "}
                    {new Date(r.created_at).toLocaleString("ka-GE")}
                  </span>
                </div>
                <p className="text-sm">{r.reason}</p>
                {tab === "open" && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={() => resolve(r.id, "action")} className="bg-rose-600 hover:bg-rose-700">
                      <Check className="mr-1 h-3.5 w-3.5" /> Take action
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => resolve(r.id, "dismiss")}>
                      <X className="mr-1 h-3.5 w-3.5" /> Dismiss
                    </Button>
                  </div>
                )}
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
