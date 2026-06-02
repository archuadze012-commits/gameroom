"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Megaphone, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

type Announcement = {
  id: string;
  title: string;
  body: string;
  severity: string;
  created_at: string;
};

export default function AnnouncementsPage() {
  const [list, setList] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState<"info" | "warning" | "critical">("info");
  const [sending, setSending] = useState(false);

  const load = async (showLoading = false) => {
    if (showLoading) {
      setList([]);
    }
    const res = await fetch("/api/announcements");
    const data = await res.json();
    setList(data.announcements ?? []);
  };

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/announcements");
      const data = await res.json();
      setList(data.announcements ?? []);
    })();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, severity }),
      });
      if (!res.ok) throw new Error();
      toast.success("გაიგზავნა!");
      setTitle("");
      setBody("");
      await load();
    } catch {
      toast.error("შეცდომა");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="flex items-center gap-2 text-2xl font-bold">
        <Megaphone className="h-5 w-5 text-primary" /> Announcements
      </h2>

      <Card>
        <CardContent className="space-y-4 p-4">
          <form onSubmit={handleSend} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="title">სათაური</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="body">ტექსტი</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                maxLength={2000}
                required
              />
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-sm">სიმძიმე:</Label>
              <div className="flex gap-1">
                {(["info", "warning", "critical"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeverity(s)}
                    className={`rounded-md px-3 py-1 text-xs font-medium ${
                      severity === s
                        ? s === "critical"
                          ? "bg-rose-500/20 text-rose-400"
                          : s === "warning"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={sending || !title.trim() || !body.trim()}>
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              გაგზავნა ყველას
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">აქტიური</h3>
        {list.length === 0 && (
          <p className="text-sm text-muted-foreground">აქტიური announcement-ი არ არის.</p>
        )}
        {list.map((a) => (
          <Card key={a.id}>
            <CardContent className="space-y-1 p-4">
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    a.severity === "critical"
                      ? "bg-rose-500/20 text-rose-400"
                      : a.severity === "warning"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-primary/15 text-primary"
                  }
                >
                  {a.severity}
                </Badge>
                <span className="font-semibold">{a.title}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleString("ka-GE")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
