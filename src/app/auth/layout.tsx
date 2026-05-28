import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[var(--gr-bg-0)] px-4 py-8 sm:px-6 lg:px-8">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />
      <span aria-hidden className="pointer-events-none absolute left-[-12%] top-[8%] h-[28rem] w-[28rem] rounded-full bg-cyan-400/10 blur-[140px]" />
      <span aria-hidden className="pointer-events-none absolute right-[-10%] top-[14%] h-[34rem] w-[34rem] rounded-full bg-[var(--gr-violet)]/18 blur-[150px]" />
      <span aria-hidden className="pointer-events-none absolute bottom-[-10%] left-[18%] h-[22rem] w-[22rem] rounded-full bg-fuchsia-500/10 blur-[120px]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl flex-col items-center justify-center gap-8">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="Gameroom" width={46} height={46} className="rounded-lg" />
          <span className="font-display text-[28px] font-extrabold uppercase tracking-tight text-[var(--gr-text)] sm:text-[32px]">
            Game<span className="text-cyan-300">room</span>
          </span>
        </Link>

        <div className="flex w-full items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}
