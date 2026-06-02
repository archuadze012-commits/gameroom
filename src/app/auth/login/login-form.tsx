"use client";

import { useSearchParams } from "next/navigation";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const error = params.get("error");

  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          {error}
        </div>
      )}
      {!supabaseConfigured && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300">
          ⚠ Supabase env ცვლადები არ არის დაყენებული. დააკოპირე{" "}
          <code className="font-mono">.env.local.example</code> →{" "}
          <code className="font-mono">.env.local</code> და შეავსე.
        </div>
      )}
      <GoogleSignInButton className="w-full min-h-[72px] sm:min-h-[78px]" nextPath={next} />
    </div>
  );
}
