"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pin, Star, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

type PinnedItem = {
  id: string;
  content_type: string;
  content_id: string;
  created_at: string;
};
type FeaturedItem = {
  id: string;
  feature_type: string;
  target_id: string;
  position: number;
};

export default function PinsPage() {
  const [pins, setPins] = useState<PinnedItem[]>([]);
  const [featured, setFeatured] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // form
  const [pinType, setPinType] = useState<"post" | "news">("post");
  const [pinId, setPinId] = useState("");
  const [featType, setFeatType] = useState<"tournament" | "profile" | "game">("tournament");
  const [featId, setFeatId] = useState("");

  const load = async () => {
    setLoading(true);
    const [pinsRes, featRes] = await Promise.all([
      fetch("/api/admin/pins").then((r) => r.json()),
      fetch("/api/admin/featured").then((r) => r.json()),
    ]);
    setPins(Array.isArray(pinsRes) ? pinsRes : []);
    setFeatured(Array.isArray(featRes) ? featRes : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addPin = async () => {
    if (!pinId.trim()) return;
    const res = await fetch("/api/admin/pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: pinType, contentId: pinId.trim() }),
    });
    if (res.ok) {
      toast.success("დაიპინა");
      setPinId("");
      load();
    } else toast.error("შეცდომა");
  };

  const removePin = async (id: string) => {
    const res = await fetch(`/api/admin/pins?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("ამოშლილია");
      load();
    } else toast.error("შეცდომა");
  };

  const addFeat = async () => {
    if (!featId.trim()) return;
    const res = await fetch("/api/admin/featured", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featureType: featType, targetId: featId.trim() }),
    });
    if (res.ok) {
      toast.success("Featured");
      setFeatId("");
      load();
    } else toast.error("შეცდომა");
  };

  const removeFeat = async (id: string) => {
    const res = await fetch(`/api/admin/featured?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("ამოშლილია");
      load();
    } else toast.error("შეცდომა");
  };

  if (loading)
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <h2 className="flex items-center gap-2 text-2xl font-bold">
        <Pin className="h-5 w-5 text-primary" /> Pins &amp; Featured
      </h2>

      {/* Pins */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Pin className="h-4 w-4" /> Pinned posts &amp; news
          </h3>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label className="text-xs">ტიპი</Label>
              <select
                value={pinType}
                onChange={(e) => setPinType(e.target.value as "post" | "news")}
                className="block h-10 rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value="post">post</option>
                <option value="news">news</option>
              </select>
            </div>
            <div className="flex-1">
              <Label className="text-xs">ID / slug</Label>
              <Input value={pinId} onChange={(e) => setPinId(e.target.value)} />
            </div>
            <Button onClick={addPin}>Pin</Button>
          </div>
          {pins.length === 0 ? (
            <p className="text-xs text-muted-foreground">No pins.</p>
          ) : (
            <div className="space-y-1">
              {pins.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded border border-border/60 p-2 text-sm">
                  <Badge variant="outline">{p.content_type}</Badge>
                  <code className="flex-1 truncate text-xs">{p.content_id}</code>
                  <Button size="sm" variant="ghost" onClick={() => removePin(p.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Featured */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Star className="h-4 w-4" /> Featured (homepage / search)
          </h3>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label className="text-xs">ტიპი</Label>
              <select
                value={featType}
                onChange={(e) => setFeatType(e.target.value as "tournament" | "profile" | "game")}
                className="block h-10 rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value="tournament">tournament</option>
                <option value="profile">profile</option>
                <option value="game">game</option>
              </select>
            </div>
            <div className="flex-1">
              <Label className="text-xs">ID / slug / username</Label>
              <Input value={featId} onChange={(e) => setFeatId(e.target.value)} />
            </div>
            <Button onClick={addFeat}>Feature</Button>
          </div>
          {featured.length === 0 ? (
            <p className="text-xs text-muted-foreground">No featured.</p>
          ) : (
            <div className="space-y-1">
              {featured.map((f) => (
                <div key={f.id} className="flex items-center gap-2 rounded border border-border/60 p-2 text-sm">
                  <Badge variant="outline">{f.feature_type}</Badge>
                  <code className="flex-1 truncate text-xs">{f.target_id}</code>
                  <Button size="sm" variant="ghost" onClick={() => removeFeat(f.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
