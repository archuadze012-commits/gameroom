"use client";

import { useTransition } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { processClanRequestAction } from "./manage-actions";

export function ClanRequestActions({
  requestId,
  clanSlug,
}: {
  requestId: string;
  clanSlug: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleAction = (action: "accept" | "reject") => {
    startTransition(async () => {
      const res = await processClanRequestAction(requestId, action, clanSlug);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="default"
        className="h-8 w-8 p-0 bg-green-500 hover:bg-green-600 text-white"
        onClick={() => handleAction("accept")}
        disabled={isPending}
        title="დადასტურება"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        className="h-8 w-8 p-0"
        onClick={() => handleAction("reject")}
        disabled={isPending}
        title="უარყოფა"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
      </Button>
    </div>
  );
}
