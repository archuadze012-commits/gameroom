"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { PmCard, PmCardHead } from "@/components/playmanager/pm-cards";
import { savePlayManagerPrivacy } from "@/app/playmanager/actions/privacy-actions";

type Privacy = { hideSquad: boolean; hideWallet: boolean; hideTransfers: boolean };

const TOGGLES: { key: keyof Privacy; label: string; hint: string }[] = [
  { key: "hideSquad", label: "შემადგენლობის დამალვა", hint: "სხვა მენეჯერები ვერ ნახავენ შენს მოთამაშეებს, საშ. OVR-ს და გუნდის ღირებულებას" },
  { key: "hideWallet", label: "ბალანსის დამალვა", hint: "შენი ბიუჯეტი Head-to-Head შედარებაში აღარ გამოჩნდება" },
  { key: "hideTransfers", label: "ტრანსფერების დამალვა", hint: "შენი ყიდვა/გაყიდვის ისტორია მოწინააღმდეგისთვის დაიმალება" },
];

export function TeamPrivacySettings({ initial }: { initial: Privacy }) {
  const [state, setState] = useState<Privacy>(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const save = (next: Privacy) => {
    setState(next);
    startTransition(async () => {
      const result = await savePlayManagerPrivacy(next);
      if (!result.success) {
        toast.error(result.message ?? "შენახვა ვერ მოხერხდა");
        setState(state); // revert optimistic value
        return;
      }
      toast.success(result.message ?? "შენახულია");
      router.refresh();
    });
  };

  return (
    <PmCard>
      <PmCardHead
        icon={EyeOff}
        title="პრივატულობა"
        subtitle="რას ხედავენ სხვა მენეჯერები შენს პროფილზე"
        right={pending ? <Loader2 className="h-4 w-4 animate-spin text-white/50" /> : undefined}
      />
      <div className="space-y-2">
        {TOGGLES.map((t) => {
          const on = state[t.key];
          return (
            <button
              key={t.key}
              type="button"
              disabled={pending}
              onClick={() => save({ ...state, [t.key]: !on })}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/24 px-3 py-2.5 text-left transition hover:bg-black/40 disabled:opacity-60"
            >
              <div className="min-w-0">
                <p className="text-sm font-black text-white">{t.label}</p>
                <p className="mt-0.5 text-xs font-bold text-white/40">{t.hint}</p>
              </div>
              <span
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11px] font-black ${
                  on
                    ? "border-emerald-300/26 bg-emerald-300/10 text-emerald-200"
                    : "border-white/10 bg-white/[0.04] text-white/45"
                }`}
              >
                {on ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {on ? "დამალული" : "ღია"}
              </span>
            </button>
          );
        })}
      </div>
    </PmCard>
  );
}
