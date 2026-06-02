"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Challenge = {
  id: string;
  title: string;
  description: string | null;
  challenge_type: string;
  xp_reward: number;
  target_count: number;
  active_date: string;
  is_active: boolean;
};

const BLANK = {
  title: "",
  description: "",
  xp_reward: 50,
  active_date: new Date().toISOString().slice(0, 10),
};

export default function AdminChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [form, setForm] = useState(BLANK);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/challenges")
      .then((r) => r.json())
      .then((d: Challenge[]) => { if (Array.isArray(d)) setChallenges(d); })
      .catch(() => toast.error("ჩატვირთვის შეცდომა"));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("სათაური სავალდებულოა"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, challenge_type: "manual" }),
      });
      if (!res.ok) { const j = (await res.json()) as { error?: string }; toast.error(j.error ?? "შეცდომა"); return; }
      const created = (await res.json()) as Challenge;
      setChallenges((prev) => [created, ...prev]);
      setForm(BLANK);
      toast.success("Challenge დამატებულია!");
    } catch {
      toast.error("შეცდომა");
    } finally {
      setSubmitting(false);
    }
  }

  async function del(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/challenges/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("წაშლის შეცდომა"); return; }
      setChallenges((prev) => prev.filter((c) => c.id !== id));
      toast.success("წაიშალა");
    } catch {
      toast.error("შეცდომა");
    } finally {
      setDeletingId(null);
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCount = challenges.filter((c) => c.active_date === todayStr && c.is_active).length;

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-6 w-6 text-[var(--gr-magenta)]" />
        <h1 className="text-xl font-bold">Daily Challenges</h1>
        {todayCount > 0 && (
          <span className="rounded-full bg-[color-mix(in_srgb,var(--gr-cyan-glow)_15%,transparent)] px-2.5 py-0.5 text-xs font-semibold text-[var(--gr-cyan-glow)] ring-1 ring-[color-mix(in_srgb,var(--gr-cyan-glow)_30%,transparent)]">
            დღეს: {todayCount}
          </span>
        )}
      </div>

      {/* Create form */}
      <Card>
        <CardContent className="pt-5">
          <p className="mb-4 text-sm font-semibold text-[var(--gr-text-mute)] uppercase tracking-wider">ახალი Challenge</p>
          <form onSubmit={(e) => void submit(e)} className="space-y-3">
            <Input
              placeholder="სათაური *"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <Textarea
              placeholder="აღწერა (სურვილისამებრ)"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-[var(--gr-text-mute)]">XP Reward</label>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={form.xp_reward}
                  onChange={(e) => setForm((f) => ({ ...f, xp_reward: Number(e.target.value) }))}
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-[var(--gr-text-mute)]">თარიღი</label>
                <Input
                  type="date"
                  value={form.active_date}
                  onChange={(e) => setForm((f) => ({ ...f, active_date: e.target.value }))}
                />
              </div>
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              დამატება
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-2">
        {challenges.length === 0 && (
          <p className="py-6 text-center text-sm text-[var(--gr-text-mute)]">Challenge-ები არ არის.</p>
        )}
        {challenges.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-4 rounded-lg bg-[var(--gr-bg-2)] px-4 py-3 ring-1 ring-[var(--gr-border)]"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--gr-text-hi)]">{c.title}</p>
              {c.description && (
                <p className="truncate text-xs text-[var(--gr-text-mute)]">{c.description}</p>
              )}
              <p className="mt-0.5 text-[10px] text-[var(--gr-text-mute)]">
                {c.active_date} · +{c.xp_reward} XP
                {c.active_date === todayStr && (
                  <span className="ml-2 font-semibold text-[var(--gr-cyan-glow)]">• დღეს</span>
                )}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void del(c.id)}
              disabled={deletingId === c.id}
              className="shrink-0 text-[var(--gr-text-mute)] hover:text-destructive"
            >
              {deletingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
