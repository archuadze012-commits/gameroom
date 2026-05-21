"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function JoinRequestForm({ postId }: { postId: string }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/lfg/${postId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (res.status === 409) {
        toast.info("უკვე გაგზავნილია მოთხოვნა ამ პოსტზე.");
        return;
      }
      if (res.status === 401) {
        toast.error("შესასვლელად გაიარე ავტორიზაცია.");
        return;
      }
      if (!res.ok) throw new Error();
      toast.success("მოთხოვნა გაიგზავნა! ავტორს ეცნობება.");
      setMessage("");
      setSent(true);
    } catch {
      toast.error("შეცდომა — სცადე თავიდან.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-center text-sm text-emerald-400">
        ✓ მოთხოვნა გაიგზავნა! ავტორი დაგიკავშირდება.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="გავიგო, რომ მე-ვარ. რანკი: ..."
        rows={3}
        required
      />
      <Button type="submit" size="sm" className="w-full" disabled={loading}>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Send className="mr-2 h-4 w-4" />
        )}
        გავგზავნოთ
      </Button>
    </form>
  );
}
