import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "../login/login-form";
import { Eyebrow } from "@/components/ui/eyebrow";
import { DisplayHeading } from "@/components/ui/display-heading";

export const metadata = { title: "რეგისტრაცია" };

const cutMd = "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)";
const cardBorder = "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(192,38,211,0.5))";

export default function SignupPage() {
  return (
    <article
      className="relative isolate"
      style={{ background: cardBorder, padding: 1, clipPath: cutMd }}
    >
      <div className="relative bg-[var(--gr-bg-1)] p-7" style={{ clipPath: cutMd }}>
        <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[var(--gr-grad-card)]" />
        <header className="mb-6">
          <Eyebrow tone="amber">ახალი ანგარიში</Eyebrow>
          <DisplayHeading as="h1" size="md" className="mt-2">დარეგისტრირდი</DisplayHeading>
          <p className="mt-2 text-[13px] text-[var(--gr-text-mute)]">
            შექმენი ანგარიში 30 წამში — magic link ან Google.
          </p>
        </header>

        <div className="space-y-6">
          <Suspense fallback={<div className="space-y-3"><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /></div>}>
            <LoginForm />
          </Suspense>
          <p className="text-center text-[12.5px] text-[var(--gr-text-mute)]">
            უკვე გაქვს ანგარიში?{" "}
            <Link href="/auth/login" className="font-semibold text-[var(--gr-violet-hi)] hover:text-[var(--gr-violet)] hover:underline">
              შესვლა
            </Link>
          </p>
        </div>
      </div>
    </article>
  );
}
