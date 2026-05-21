"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type AuditRow = {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  profiles: { username: string; display_name: string | null } | null;
};

export default function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/audit?limit=200");
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <ScrollText className="h-5 w-5 text-primary" /> Audit Log
        </h2>
        <Button onClick={load} variant="outline" size="sm">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading && (
            <div className="flex items-center justify-center p-12 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> იტვირთება...
            </div>
          )}
          {!loading && rows.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              ჯერჯერობით action-ები არ ფიქსირდება.
            </p>
          )}
          {!loading && rows.length > 0 && (
            <div className="divide-y divide-border/60">
              {rows.map((r) => (
                <div key={r.id} className="grid grid-cols-[160px_140px_1fr] gap-4 p-4 text-sm">
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("ka-GE")}
                  </span>
                  <span className="font-medium">
                    {r.profiles?.display_name ?? r.profiles?.username ?? "—"}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs">{r.action}</Badge>
                    {r.target_type && (
                      <span className="text-xs text-muted-foreground">
                        {r.target_type}: {r.target_id?.slice(0, 12)}
                      </span>
                    )}
                    {r.metadata && (
                      <code className="rounded bg-secondary/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {JSON.stringify(r.metadata)}
                      </code>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
