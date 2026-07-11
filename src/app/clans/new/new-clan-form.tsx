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

type GameOption = { slug: string; nameKa: string };

export function NewClanForm({
  games,
  defaultGame,
}: {
  games: GameOption[];
  defaultGame?: string;
}) {
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
        <Label htmlFor="gameSlug">თამაში</Label>
        <select
          id="gameSlug"
          name="gameSlug"
          required
          defaultValue={defaultGame && games.some((g) => g.slug === defaultGame) ? defaultGame : ""}
          disabled={isPending}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="" disabled>
            აირჩიე თამაში
          </option>
          {games.map((g) => (
            <option key={g.slug} value={g.slug}>
              {g.nameKa}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-muted-foreground">კლანი ამ თამაშს მიება — ვერ შეიცვლება მოგვიანებით.</p>
        {state.errors?.gameSlug && (
          <p className="text-xs text-destructive">{state.errors.gameSlug[0]}</p>
        )}
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
