"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAdminTable } from "@/lib/use-admin-table";

type Row = {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
};

type Slot = {
  key: string;
  label: string;
  fields: Array<{
    id: string;
    label: string;
    kind: "text" | "textarea" | "url";
    placeholder?: string;
  }>;
  defaults: Record<string, string>;
};

const SLOTS: Slot[] = [
  {
    key: "home.guest.hero",
    label: "Home (Guest) — Hero",
    fields: [
      { id: "headline", label: "Headline", kind: "textarea", placeholder: "ყველაფერი, რის გამოც თამაშები გიყვარს" },
      { id: "logoUrl", label: "Logo URL", kind: "url", placeholder: "/logo.png ან https://..." },
    ],
    defaults: { headline: "ყველაფერი, რის გამოც თამაშები გიყვარს", logoUrl: "/logo.png" },
  },
  {
    key: "auth.login.heading",
    label: "Auth — Login Heading",
    fields: [
      { id: "pre", label: "Prefix", kind: "text", placeholder: "SIGN IN TO" },
      { id: "game", label: "GAME", kind: "text", placeholder: "GAME" },
      { id: "room", label: "room", kind: "text", placeholder: "room" },
      { id: "domain", label: ".com.ge", kind: "text", placeholder: ".com.ge" },
    ],
    defaults: { pre: "SIGN IN TO", game: "GAME", room: "room", domain: ".com.ge" },
  },
];

function pickString(obj: Record<string, unknown> | null | undefined, key: string, fallback: string) {
  const v = obj?.[key];
  return typeof v === "string" ? v : fallback;
}

function buildDraftState(
  byKey: Map<string, Row>,
  previous: Record<string, Record<string, string>> = {},
) {
  const next: Record<string, Record<string, string>> = {};
  for (const slot of SLOTS) {
    const row = byKey.get(slot.key);
    const value = row?.value ?? {};
    next[slot.key] = {};
    for (const f of slot.fields) {
      next[slot.key][f.id] = previous[slot.key]?.[f.id] ?? pickString(value, f.id, slot.defaults[f.id] ?? "");
    }
  }
  return next;
}

export default function AdminContentPage() {
  const { rows, setRows, loading } = useAdminTable<Row>({ endpoint: "/api/admin/content" });
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const byKey = useMemo(() => {
    const m = new Map<string, Row>();
    for (const r of rows) m.set(r.key, r);
    return m;
  }, [rows]);

  const [draft, setDraft] = useState<Record<string, Record<string, string>>>(() => buildDraftState(new Map()));

  useEffect(() => {
    queueMicrotask(() => {
      setDraft((prev) => buildDraftState(byKey, prev));
    });
  }, [byKey]);

  async function save(slot: Slot) {
    setSavingKey(slot.key);
    try {
      const value: Record<string, unknown> = {};
      for (const f of slot.fields) {
        value[f.id] = (draft?.[slot.key]?.[f.id] ?? "").trim();
      }

      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: slot.key, value }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || "შეცდომა");
      }
      const updated: Row = await res.json();
      setRows((prev) => {
        const filtered = prev.filter((r) => r.key !== updated.key);
        return [...filtered, updated].sort((a, b) => a.key.localeCompare(b.key));
      });
      toast.success("შენახულია");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "შეცდომა");
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-6 text-sm text-muted-foreground">იტვირთება...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Site Content</h1>
        <p className="text-xs text-muted-foreground">ტექსტები და ფოტო ლინკები, რომლებიც საიტზე ჩანს.</p>
      </div>

      {SLOTS.map((slot) => {
        const d = draft?.[slot.key] ?? {};
        return (
          <Card key={slot.key} className="border-border/60">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold">{slot.label}</div>
                  <div className="text-xs text-muted-foreground">{slot.key}</div>
                </div>
                <Button
                  onClick={() => save(slot)}
                  disabled={savingKey === slot.key}
                  className="shrink-0"
                >
                  {savingKey === slot.key ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ინახება
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> შენახვა
                    </>
                  )}
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {slot.fields.map((f) => {
                  const val = d[f.id] ?? "";
                  const common = {
                    value: val,
                    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setDraft((prev) => ({
                        ...prev,
                        [slot.key]: { ...(prev[slot.key] ?? {}), [f.id]: e.target.value },
                      })),
                  };

                  return (
                    <div key={f.id} className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">{f.label}</label>
                      {f.kind === "textarea" ? (
                        <Textarea
                          {...common}
                          placeholder={f.placeholder}
                          className="min-h-[84px] resize-none"
                        />
                      ) : (
                        <Input {...common} placeholder={f.placeholder} />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

