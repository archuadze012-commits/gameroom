import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[var(--gr-bg-0)] px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />
      {/* light leaks */}
      <span aria-hidden className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-[var(--gr-violet)]/25 blur-[120px]" />
      <span aria-hidden className="pointer-events-none absolute -bottom-32 -left-10 h-72 w-72 rounded-full bg-[var(--gr-magenta)]/20 blur-[120px]" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Gameroom" width={40} height={40} className="rounded-lg" />
            <span className="font-display text-[22px] font-extrabold uppercase tracking-tight text-[var(--gr-text)]">
              Game<span className="text-[var(--gr-violet)]">room</span>
            </span>
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
