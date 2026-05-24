"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { ReportButton } from "@/components/report-button";

export function PostDetailActions({
  postId,
  initialLikes,
  initialLiked,
}: {
  postId: string;
  initialLikes: number;
  initialLiked: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialLikes);

  async function toggle() {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setCount((c) => c + (wasLiked ? -1 : 1));
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      if (!res.ok) throw new Error();
    } catch {
      setLiked(wasLiked);
      setCount((c) => c + (wasLiked ? 1 : -1));
    }
  }

  return (
    <div className="flex items-center justify-between">
      <button
        onClick={toggle}
        className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? "text-red-400" : "text-muted-foreground hover:text-red-400"}`}
      >
        <Heart className={`h-4 w-4 ${liked ? "fill-red-400" : ""}`} />
        {count}
      </button>
      <ReportButton targetType="post" targetId={postId} />
    </div>
  );
}
