"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Plus, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type BlockedWord = { id: string; word: string; created_at: string };

export default function ModerationPage() {
  const [words, setWords] = useState<BlockedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWord, setNewWord] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/blocked-words");
      const data = await res.json();
      setWords(Array.isArray(data) ? data : []);
    } catch {
      setWords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/blocked-words");
        const data = await res.json();
        if (!cancelled) {
          setWords(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) {
          setWords([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const word = newWord.trim();
    if (!word) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/blocked-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word }),
      });
      const data = await res.json();
      if (res.ok) {
        setWords((prev) => [...prev, data].sort((a, b) => a.word.localeCompare(b.word)));
        setNewWord("");
        toast.success(`"${word}" დაემატა ბლოკ-სიაში.`);
      } else if (data.error === "duplicate") {
        toast.error("ეს სიტყვა უკვე არსებობს.");
      } else {
        toast.error("შეცდომა — სცადე თავიდან.");
      }
    } catch {
      toast.error("შეცდომა — სცადე თავიდან.");
    }
    setAdding(false);
  };

  const handleDelete = async (id: string, word: string) => {
    setDeletingId(id);
    try {
      const res = await fetch("/api/admin/blocked-words", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setWords((prev) => prev.filter((w) => w.id !== id));
        toast.success(`"${word}" წაიშალა.`);
      } else {
        toast.error("შეცდომა — სცადე თავიდან.");
      }
    } catch {
      toast.error("შეცდომა — სცადე თავიდან.");
    }
    setDeletingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            ჩატის მოდერაცია
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            სიტყვები რომლებიც ჩატში ავტომატურად დაიბლოკება
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Add word */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <form onSubmit={handleAdd} className="flex gap-2">
            <Input
              placeholder="ახალი სიტყვა ან ფრაგმენტი (მაგ. ბოზ, პიდარ)"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              className="flex-1"
              disabled={adding}
            />
            <Button type="submit" disabled={adding || !newWord.trim()}>
              {adding
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <><Plus className="mr-1 h-4 w-4" /> დამატება</>}
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            ფრაგმენტი ნიშნავს, რომ ნებისმიერი სიტყვა რომელიც ამ ფრაგმენტს შეიცავს, დაიბლოკება.
          </p>
        </CardContent>
      </Card>

      {/* Word list */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> იტვირთება...
            </div>
          ) : words.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              ბლოკ-სია ცარიელია
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {words.map((w) => (
                <div key={w.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="border-red-500/40 text-red-400 font-mono">
                      {w.word}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(w.created_at).toLocaleDateString("ka-GE")}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-red-400"
                    disabled={deletingId === w.id}
                    onClick={() => handleDelete(w.id, w.word)}
                  >
                    {deletingId === w.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        სულ {words.length} სიტყვა ბლოკ-სიაში — ყოველი ჩატის შეტყობინება ამ სიას შეიდარება.
      </p>
    </div>
  );
}
