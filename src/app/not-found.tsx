import { Ghost, Home, Users } from "lucide-react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { DisplayHeading } from "@/components/ui/display-heading";
import { GradientText } from "@/components/ui/gradient-text";
import { ChevronButton } from "@/components/ui/chevron-button";

const cutMd = "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)";

export default function NotFound() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />
      <span aria-hidden className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-[var(--gr-violet)]/25 blur-[120px]" />
      <span aria-hidden className="pointer-events-none absolute -bottom-32 -left-10 h-72 w-72 rounded-full bg-[var(--gr-magenta)]/20 blur-[120px]" />

      <div className="container relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
        <div
          className="grid h-16 w-16 place-items-center bg-[var(--gr-violet)]/15 text-[var(--gr-violet-hi)] ring-1 ring-[var(--gr-violet)]/40"
          style={{ clipPath: cutMd }}
        >
          <Ghost className="h-7 w-7" />
        </div>

        <Eyebrow tone="amber" className="mt-6 justify-center inline-flex">შეცდომა</Eyebrow>

        <div className="mt-3 font-display text-[88px] font-extrabold leading-none tracking-[-0.04em] sm:text-[120px]">
          <GradientText tone="violet">404</GradientText>
        </div>

        <DisplayHeading as="h1" size="md" className="mt-3 !text-[22px] sm:!text-[26px]">
          გვერდი ვერ მოიძებნა
        </DisplayHeading>
        <p className="mt-3 max-w-md text-balance text-[14px] leading-relaxed text-[var(--gr-text-mute)]">
          მისამართი არასწორია ან გვერდი წაშლილია. დაბრუნდი მთავარზე ან გადახედე ლოკალს.
        </p>

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ChevronButton href="/" variant="violet" size="md">
            <Home className="h-4 w-4" /> მთავარი
          </ChevronButton>
          <ChevronButton href="/lfg" variant="ghost" size="md">
            <Users className="h-4 w-4" /> ლოკალი
          </ChevronButton>
        </div>
      </div>
    </div>
  );
}
