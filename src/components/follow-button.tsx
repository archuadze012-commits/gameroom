"use client";

import { useState } from "react";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  username: string;
  initialFollowing: boolean;
  onCountChange?: (delta: number) => void;
};

export function FollowButton({ username, initialFollowing, onCountChange }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const wasFollowing = following;
    // optimistic
    setFollowing(!wasFollowing);
    onCountChange?.(wasFollowing ? -1 : 1);

    try {
      const res = await fetch(`/api/follows/${username}`, {
        method: wasFollowing ? "DELETE" : "POST",
      });
      if (!res.ok) throw new Error();
    } catch {
      // revert
      setFollowing(wasFollowing);
      onCountChange?.(wasFollowing ? 1 : -1);
      toast.error("შეცდომა — სცადე თავიდან");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={following ? "outline" : "default"}
      onClick={toggle}
      disabled={loading}
      className={following ? "border-primary/40 text-primary hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40" : ""}
    >
      {loading ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : following ? (
        <UserCheck className="mr-1.5 h-4 w-4" />
      ) : (
        <UserPlus className="mr-1.5 h-4 w-4" />
      )}
      {following ? "გამოწერილია" : "გამოწერა"}
    </Button>
  );
}
