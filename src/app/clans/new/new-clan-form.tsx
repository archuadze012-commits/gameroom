"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createClanAction, type ClanActionState } from "../actions";

export function NewClanForm() {
  const router = useRouter();
  const initialState: ClanActionState = { success: false };
  const [state, formAction, isPending] = useActionState(createClanAction, initialState);

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast.success(state.message);
        router.push(`/clans/${state.clanSlug}`);
        router.refresh();
      } else {
        toast.error(state.message);
      }
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-6 mt-8 max-w-xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">კლანის სახელი</Label>
          <Input id="name" name="name" required placeholder="მაგ: Georgian Elite" disabled={isPending} />
          {state.errors?.name && (
            <p className="text-xs text-destructive">{state.errors.name[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="tag">ტეგი (Tag)</Label>
          <Input id="tag" name="tag" required placeholder="მაგ: GEO" maxLength={10} className="uppercase" disabled={isPending} />
          {state.errors?.tag && (
            <p className="text-xs text-destructive">{state.errors.tag[0]}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">აღწერა</Label>
        <Textarea 
          id="description" 
          name="description" 
          rows={4} 
          placeholder="მოკლედ მოყევი კლანის შესახებ, მიზნები და მოთხოვნები..." 
          disabled={isPending} 
        />
        {state.errors?.description && (
          <p className="text-xs text-destructive">{state.errors.description[0]}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
          გაუქმება
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          შექმნა
        </Button>
      </div>
    </form>
  );
}
