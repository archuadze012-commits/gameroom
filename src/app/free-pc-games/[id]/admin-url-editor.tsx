"use client";

import { useState, useEffect } from "react";
import { Pencil, Check, X, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STORAGE_KEY = "gameroom_cracked_urls";

function readStoredUrl(gameId: string) {
  if (typeof window === "undefined") return "";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return "";
    const overrides = JSON.parse(stored) as Record<string, string>;
    return overrides[gameId] ?? "";
  } catch {
    return "";
  }
}

export function AdminUrlEditor({ gameId }: { gameId: string }) {
  const [currentUrl, setCurrentUrl] = useState("");
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    function read() {
      setCurrentUrl(readStoredUrl(gameId));
    }
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, [gameId]);

  function save() {
    const trimmed = input.trim();
    if (!trimmed) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const overrides = (stored ? JSON.parse(stored) : {}) as Record<string, string>;
      overrides[gameId] = trimmed;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
      setCurrentUrl(trimmed);
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    } catch {}
    setEditing(false);
    setInput("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function openEdit() {
    setInput(currentUrl);
    setEditing(true);
    setSaved(false);
  }

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400">
          <ShieldAlert className="h-3.5 w-3.5" /> Admin · Download URL
        </p>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <Check className="h-3.5 w-3.5" /> შენახულია
          </span>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            placeholder="https://..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="h-8 text-sm flex-1"
          />
          <Button size="sm" className="h-8 shrink-0" onClick={save} disabled={!input.trim()}>
            შენახვა
          </Button>
          <Button size="sm" variant="ghost" className="h-8 px-2 shrink-0" onClick={() => setEditing(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground flex-1 truncate font-mono">
            {currentUrl || "— URL არ არის დამატებული"}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-xs shrink-0 border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
            onClick={openEdit}
          >
            <Pencil className="h-3 w-3" />
            {currentUrl ? "შეცვლა" : "დამატება"}
          </Button>
        </div>
      )}
    </div>
  );
}
