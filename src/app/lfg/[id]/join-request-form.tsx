"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function JoinRequestForm({ postId }: { postId: string }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: hook up Supabase server action — insert into lfg_responses
    await new Promise((r) => setTimeout(r, 500));
    toast.success("მოთხოვნა გაიგზავნა (demo).");
    setMessage("");
    setLoading(false);
    void postId;
  };

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
