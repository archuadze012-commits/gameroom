"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquareWarning, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

type QueueItem = {
  id: string;
  content_type: string;
  content_id: string;
  content_snapshot: string;
  ai_score: number | null;
  ai_reason: string | null;
  status: string;
  created_at: string;
  profiles: { username: string; display_name: string | null } | null;
};

export default function ModerationQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/moderation-queue?status=pending");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const decide = async (id: string, action: "approve" | "reject") => {
    const res = await fetch("/api/admin/moderation-queue", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (res.ok) {
      toast.success(action === "approve" ? "Approved" : "Rejected");
      setItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      toast.error("შეცდომა");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-2xl font-bold">
        <MessageSquareWarning className="h-5 w-5 text-primary" /> Moderation Queue
      </h2>

      <Card>
        <CardContent className="p-0">
          {loading && (
            <div className="flex items-center justify-center p-12 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> იტვირთება...
            </div>
          )}
          {!loading && items.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Queue is empty — AI hasn&apos;t flagged anything borderline.
            </p>
          )}
          {!loading &&
            items.map((item) => (
              <div key={item.id} className="space-y-2 border-b border-border/60 p-4 last:border-0">
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline">{item.content_type}</Badge>
                  {item.ai_score !== null && (
                    <Badge className="bg-amber-500/20 text-amber-300">
                      AI score: {item.ai_score.toFixed(2)}
                    </Badge>
                  )}
                  <span className="text-muted-foreground">
                    by {item.profiles?.username ?? "—"} ·{" "}
                    {new Date(item.created_at).toLocaleString("ka-GE")}
                  </span>
                </div>
                <p className="rounded bg-secondary/30 p-2 text-sm whitespace-pre-wrap">
                  {item.content_snapshot}
                </p>
                {item.ai_reason && (
                  <p className="text-xs text-muted-foreground italic">AI: {item.ai_reason}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={() => decide(item.id, "approve")}>
                    <Check className="mr-1 h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decide(item.id, "reject")}>
                    <X className="mr-1 h-3.5 w-3.5" /> Reject &amp; delete
                  </Button>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
