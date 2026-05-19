"use client";

import { useState } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FollowButton({ username }: { username: string }) {
  const [following, setFollowing] = useState(false);

  return (
    <Button
      variant={following ? "outline" : "default"}
      onClick={() => setFollowing((f) => !f)}
      className={following ? "border-primary/40 text-primary hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40" : ""}
    >
      {following ? (
        <>
          <UserCheck className="mr-1.5 h-4 w-4" />
          გამოწერილია
        </>
      ) : (
        <>
          <UserPlus className="mr-1.5 h-4 w-4" />
          გამოწერა
        </>
      )}
    </Button>
  );
}
