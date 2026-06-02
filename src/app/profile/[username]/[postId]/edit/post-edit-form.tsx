"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GamerCard } from "@/components/ui/gamer-card";

type Props = {
  postId: string;
  username: string;
  initialContent: string;
  mediaUrls: string[] | null;
};

export function PostEditForm({ postId, username, initialContent, mediaUrls }: Props) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error();
      toast.success("პოსტი განახლდა");
      router.replace(`/profile/${username}/${postId}`);
      router.refresh();
    } catch {
      toast.error("პოსტის განახლება ვერ მოხერხდა");
    } finally {
      setSaving(false);
    }
  }

  return (
    <GamerCard color="rgba(196,30,58,0.78)" clipSize={18}>
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--gr-text-mute)]">
            პოსტის ტექსტი
          </p>
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={2000}
            className="min-h-[220px] resize-y border-[var(--gr-border)] bg-[var(--gr-bg-2)] text-[15px] text-[var(--gr-text)]"
          />
          <p className="mt-2 text-[11px] text-[var(--gr-text-dim)]">{content.length}/2000</p>
        </div>

        {mediaUrls && mediaUrls.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--gr-text-mute)]">
              არსებული მედია
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {mediaUrls.map((url) => (
                <div key={url} className="overflow-hidden ring-1 ring-[var(--gr-border)] [clip-path:polygon(0_0,calc(100%_-_10px)_0,100%_10px,100%_100%,0_100%)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-28 w-full object-cover" />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[var(--gr-text-dim)]">მედია ამ ვერსიაში უცვლელი დარჩება.</p>
          </div>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving}>
            გაუქმება
          </Button>
          <Button type="submit" disabled={!content.trim() || saving} className="bg-[rgba(196,30,58,0.9)] text-white hover:bg-[rgba(196,30,58,1)]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            შენახვა
          </Button>
        </div>
      </form>
    </GamerCard>
  );
}
