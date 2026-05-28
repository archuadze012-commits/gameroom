"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserPlus, Loader2, Clock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { requestJoinClanAction } from "../actions";

export function ClanJoinButton({
  clanId,
  status,
  userStatus,
  isAuthenticated,
}: {
  clanId: string;
  status: string;
  userStatus: string;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!isAuthenticated) {
    return (
      <Button className="w-full" onClick={() => router.push("/auth/login")}>
        შედი გასაწევრიანებლად
      </Button>
    );
  }

  if (userStatus === "member") {
    return (
      <Button variant="secondary" className="w-full cursor-default" disabled>
        <ShieldCheck className="mr-2 h-4 w-4" /> კლანის წევრი ხარ
      </Button>
    );
  }

  if (userStatus === "pending") {
    return (
      <Button variant="outline" className="w-full cursor-default" disabled>
        <Clock className="mr-2 h-4 w-4" /> მოთხოვნა გაგზავნილია
      </Button>
    );
  }

  if (status === "closed") {
    return (
      <Button variant="outline" className="w-full cursor-default" disabled>
        მიღება დახურულია
      </Button>
    );
  }

  const handleJoin = () => {
    startTransition(async () => {
      const res = await requestJoinClanAction(clanId);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <Button 
      className="w-full" 
      onClick={handleJoin} 
      disabled={isPending}
    >
      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
      {status === "open" ? "გაწევრიანება" : "მოთხოვნის გაგზავნა"}
    </Button>
  );
}
