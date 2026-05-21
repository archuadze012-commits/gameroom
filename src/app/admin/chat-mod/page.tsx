"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldAlert, VolumeX, Volume2, History, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Mute = {
  id: string;
  user_id: string;
  channel_id: string | null;
  reason: string | null;
  expires_at: string | null;
  created_at: string;
  profiles: { username: string; display_name: string | null } | null;
};

type Msg = {
  id: string;
  channel_id: string;
  body: string;
  created_at: string;
  deleted_at: string | null;
};

export default function ChatModPage() {
  const [mutes, setMutes] = useState<Mute[]>([]);
  const [loadingMutes, setLoadingMutes] = useState(true);
  const [userId, setUserId] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [searching, setSearching] = useState(false);

  const loadMutes = async () => {
    setLoadingMutes(true);
    try {
      const res = await fetch("/api/admin/mutes");
      const data = await res.json();
      setMutes(Array.isArray(data) ? data : []);
    } finally {
      setLoadingMutes(false);
    }
  };

  useEffect(() => {
    loadMutes();
  }, []);

  const lookupUser = async () => {
    if (!userId.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/user-messages/${userId.trim()}`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } finally {
      setSearching(false);
    }
  };

  const deleteMessage = async (id: string) => {
    const res = await fetch(`/api/admin/messages/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("წაშლილია");
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, deleted_at: new Date().toISOString() } : m)));
    } else {
      toast.error("შეცდომა");
    }
  };

  const unmute = async (id: string) => {
    const res = await fetch(`/api/admin/mutes?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Unmuted");
      setMutes((prev) => prev.filter((m) => m.id !== id));
    } else {
      toast.error("შეცდომა");
    }
  };

  const muteUser = async (minutes: number | null) => {
    if (!userId.trim()) return toast.error("user ID required");
    const res = await fetch("/api/admin/mutes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: userId.trim(), minutes, reason: "manual mute" }),
    });
    if (res.ok) {
      toast.success(`Muted ${minutes ? minutes + " min" : "permanently"}`);
      loadMutes();
    } else {
      toast.error("შეცდომა");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="flex items-center gap-2 text-2xl font-bold">
        <ShieldAlert className="h-5 w-5 text-primary" /> Chat Moderation
      </h2>

      {/* User lookup */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">იუზერის მესიჯების ისტორია</h3>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="user ID (UUID)"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            <Button onClick={lookupUser} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "ძებნა"}
            </Button>
            <Button variant="outline" onClick={() => muteUser(60)}>
              <VolumeX className="mr-1 h-3.5 w-3.5" /> Mute 1h
            </Button>
            <Button variant="outline" onClick={() => muteUser(null)}>
              <VolumeX className="mr-1 h-3.5 w-3.5" /> Mute permanently
            </Button>
          </div>
          {messages.length > 0 && (
            <div className="max-h-96 space-y-2 overflow-y-auto rounded-md border border-border/60 p-2">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-center gap-2 rounded p-2 text-xs ${
                    m.deleted_at ? "opacity-50" : ""
                  }`}
                >
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {m.channel_id}
                  </Badge>
                  <span className="flex-1 truncate">{m.body}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {new Date(m.created_at).toLocaleString("ka-GE")}
                  </span>
                  {!m.deleted_at && (
                    <Button size="sm" variant="ghost" onClick={() => deleteMessage(m.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {m.deleted_at && (
                    <Badge className="bg-rose-500/20 text-rose-400">deleted</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active mutes */}
      <Card>
        <CardContent className="space-y-2 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <VolumeX className="h-4 w-4 text-primary" /> აქტიური mute-ები
          </h3>
          {loadingMutes && <Loader2 className="mx-auto h-4 w-4 animate-spin" />}
          {!loadingMutes && mutes.length === 0 && (
            <p className="text-xs text-muted-foreground">Mute-ები არ არის.</p>
          )}
          {mutes.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded border border-border/60 p-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{m.profiles?.username ?? m.user_id.slice(0, 8)}</span>
                {m.channel_id ? (
                  <Badge variant="outline" className="text-[10px]">#{m.channel_id}</Badge>
                ) : (
                  <Badge className="bg-rose-500/20 text-[10px] text-rose-400">global</Badge>
                )}
                {m.expires_at && (
                  <span className="text-xs text-muted-foreground">
                    expires {new Date(m.expires_at).toLocaleString("ka-GE")}
                  </span>
                )}
                {m.reason && <span className="text-xs text-muted-foreground italic">{m.reason}</span>}
              </div>
              <Button size="sm" variant="outline" onClick={() => unmute(m.id)}>
                <Volume2 className="mr-1 h-3 w-3" /> Unmute
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
