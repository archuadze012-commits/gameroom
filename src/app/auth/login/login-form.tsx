"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Mail, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const next = params.get("next") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<null | "email" | "password" | "google" | "discord">(null);

  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseConfigured) { toast.error("Supabase არ არის კონფიგურირებული."); return; }
    setLoading("password");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = next;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "შეცდომა, სცადე ხელახლა.");
    } finally {
      setLoading(null);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseConfigured) {
      toast.error("Supabase ჯერ არ არის კონფიგურირებული. დაამატე .env.local ფაილი.");
      return;
    }
    setLoading("email");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
      toast.success("ბმული გამოგზავნილია ფოსტაზე — გაიხსენი ფოსტა.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "შეცდომა, სცადე ხელახლა.");
    } finally {
      setLoading(null);
    }
  };

  const handleOAuth = async (provider: "google" | "discord") => {
    if (!supabaseConfigured) {
      toast.error("Supabase ჯერ არ არის კონფიგურირებული.");
      return;
    }
    setLoading(provider);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "შეცდომა, სცადე ხელახლა.");
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {!supabaseConfigured && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300">
          ⚠ Supabase env ცვლადები არ არის დაყენებული. დააკოპირე{" "}
          <code className="font-mono">.env.local.example</code> →{" "}
          <code className="font-mono">.env.local</code> და შეავსე.
        </div>
      )}

      <div className="grid gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleOAuth("google")}
          disabled={!!loading}
        >
          {loading === "google" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon className="mr-2 h-4 w-4" />
          )}
          Google-ით შესვლა
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => handleOAuth("discord")}
          disabled={!!loading}
        >
          {loading === "discord" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <DiscordIcon className="mr-2 h-4 w-4" />
          )}
          Discord-ით შესვლა
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">ან</span>
        <Separator className="flex-1" />
      </div>

      <form onSubmit={handlePassword} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email-pw">ელფოსტა</Label>
          <Input
            id="email-pw"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">პაროლი</Label>
          <Input
            id="password"
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={!!loading}>
          {loading === "password" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
          შესვლა პაროლით
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">ან magic link-ით</span>
        <Separator className="flex-1" />
      </div>

      <form onSubmit={handleMagicLink} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email">ელფოსტა</Label>
          <Input
            id="email"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline" className="w-full" disabled={!!loading}>
          {loading === "email" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Mail className="mr-2 h-4 w-4" />
          )}
          ბმულის გამოგზავნა
        </Button>
      </form>
    </div>
  );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.2-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.8 0 19.5-8.7 19.5-19.5 0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5c-7.6 0-14.2 4.3-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 43.5c5 0 9.6-1.9 13.1-5.1l-6.1-5c-2 1.4-4.4 2.2-7 2.2-5.3 0-9.7-3.4-11.3-8.1l-6.5 5c3.4 6.4 10.1 11 17.8 11z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.3l6.1 5c-.4.4 6.6-4.8 6.6-14.3 0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function DiscordIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a14.69 14.69 0 0 0-.642 1.327 18.27 18.27 0 0 0-5.487 0A14.62 14.62 0 0 0 9.787 3.2 19.79 19.79 0 0 0 6.025 4.37C2.62 9.43 1.7 14.38 2.16 19.27a19.96 19.96 0 0 0 5.97 3.03c.48-.66.91-1.36 1.28-2.1a13 13 0 0 1-2.02-.98c.17-.13.34-.25.5-.39 3.88 1.79 8.07 1.79 11.9 0 .16.14.33.26.5.39-.65.4-1.32.72-2.02.98.37.74.8 1.44 1.28 2.1a19.93 19.93 0 0 0 5.98-3.03c.55-5.66-.95-10.57-3.96-14.9zM8.02 16.33c-1.18 0-2.16-1.1-2.16-2.45 0-1.35.95-2.45 2.16-2.45 1.22 0 2.18 1.1 2.16 2.45 0 1.35-.95 2.45-2.16 2.45zm7.96 0c-1.18 0-2.16-1.1-2.16-2.45 0-1.35.95-2.45 2.16-2.45 1.22 0 2.18 1.1 2.16 2.45 0 1.35-.94 2.45-2.16 2.45z" />
    </svg>
  );
}
