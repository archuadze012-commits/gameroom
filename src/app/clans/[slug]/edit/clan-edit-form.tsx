"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { updateClanAction, type ClanActionState } from "../../actions";
import { ClanImageUpload } from "./clan-image-upload";

const STATUS_OPTIONS = [
  { value: "open", label: "ღია — ნებისმიერს შეუძლია მყისიერი გაწევრიანება" },
  { value: "invite_only", label: "მოწვევით — მოთხოვნას ლიდერი ამტკიცებს" },
  { value: "closed", label: "დახურული — მიღება შეჩერებულია" },
];

export function ClanEditForm({
  slug,
  tag,
  description,
  status,
  avatarUrl,
  bannerUrl,
  recruiting,
  recruitNote,
}: {
  slug: string;
  tag: string;
  description: string;
  status: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  recruiting: boolean;
  recruitNote: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateClanAction, { success: false } as ClanActionState);

  useEffect(() => {
    if (!state.message) return;
    if (state.success) {
      toast.success(state.message);
      router.push(`/clans/${state.clanSlug ?? slug}`);
      router.refresh();
    } else {
      toast.error(state.message);
    }
  }, [state, router, slug]);

  return (
    <form action={formAction} className="mt-8 max-w-xl space-y-6">
      <input type="hidden" name="slug" value={slug} />

      {/* Images upload immediately (independent of the form submit). */}
      <div className="space-y-3">
        <Label>ბანერი</Label>
        <ClanImageUpload slug={slug} kind="banner" tag={tag} initialUrl={bannerUrl} />
        <div className="flex items-center gap-3 pt-1">
          <ClanImageUpload slug={slug} kind="avatar" tag={tag} initialUrl={avatarUrl} />
          <div className="text-[12px] text-muted-foreground">
            <p className="font-bold text-white/80">ავატარი</p>
            <p>დააჭირე სურათს ასატვირთად. ავტომატურად ინახება.</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">აღწერა</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={description}
          placeholder="მოკლედ მოყევი კლანის შესახებ, მიზნები და მოთხოვნები..."
          disabled={isPending}
        />
        {state.errors?.description && <p className="text-xs text-destructive">{state.errors.description[0]}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">გაწევრიანების პოლიტიკა</Label>
        <select
          id="status"
          name="status"
          defaultValue={status}
          disabled={isPending}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {state.errors?.status && <p className="text-xs text-destructive">{state.errors.status[0]}</p>}
      </div>

      <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <label className="flex items-center gap-2.5 text-[13px] font-bold text-white/90">
          <input
            type="checkbox"
            name="recruiting"
            defaultChecked={recruiting}
            disabled={isPending}
            className="h-4 w-4 accent-[var(--gr-lime)]"
          />
          რექრუტინგი — გამოაჩინე „ეძებს წევრებს&quot; ბეჯი კლანების სიაში
        </label>
        <input
          name="recruitNote"
          defaultValue={recruitNote}
          maxLength={200}
          placeholder="მოკლე მესიჯი (მაგ: ვეძებთ IGL-ს, 2.0+ KD)"
          disabled={isPending}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white outline-none focus:border-[var(--gr-lime)]/50"
        />
      </div>

      <div className="flex justify-end gap-3 border-t border-border/40 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isPending}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2.5 text-[12px] font-black uppercase tracking-wider text-white/60 transition-colors hover:text-white disabled:opacity-50"
        >
          გაუქმება
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 rounded-xl bg-[var(--gr-violet-hi)] px-6 py-2.5 text-[12px] font-black uppercase tracking-wider text-white transition-all hover:brightness-110 disabled:opacity-60"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          შენახვა
        </button>
      </div>
    </form>
  );
}
