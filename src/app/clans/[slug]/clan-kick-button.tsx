"use client";

import { useTransition } from "react";
import { UserMinus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { kickClanMemberAction } from "./manage-actions";

export function ClanKickButton({
  memberId,
  clanSlug,
}: {
  memberId: string;
  clanSlug: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleKick = () => {
    if (!confirm("დარწმუნებული ხარ, რომ გინდა ამ წევრის გაგდება?")) return;
    
    startTransition(async () => {
      const res = await kickClanMemberAction(memberId, clanSlug);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      onClick={handleKick}
      disabled={isPending}
      title="კლანიდან გაგდება"
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
    </Button>
  );
}
