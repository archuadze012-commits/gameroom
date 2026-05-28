"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { verifyTurnstileToken } from "@/lib/turnstile";

export async function signInWithPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "/");
  const next = nextRaw.startsWith("/") ? nextRaw : "/";

  // ── Turnstile CAPTCHA verification ──────────────────────────────────
  const turnstileToken = String(formData.get("cf-turnstile-response") ?? "");
  const hdrs = await headers();
  const clientIp = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

  const captchaValid = await verifyTurnstileToken(turnstileToken, clientIp);
  if (!captchaValid) {
    redirect(
      `/auth/login?error=${encodeURIComponent("CAPTCHA ვერიფიკაცია ვერ მოხერხდა. სცადე ხელახლა.")}&next=${encodeURIComponent(next)}`
    );
  }
  // ────────────────────────────────────────────────────────────────────

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/^﻿/, "").trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").replace(/^﻿/, "").trim();
  const cookieStore = await cookies();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {}
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}

