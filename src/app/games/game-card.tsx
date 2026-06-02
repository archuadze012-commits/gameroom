"use client";

export function GameCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="group relative block w-full rounded-[20px] p-[1.5px] bg-gradient-to-br from-[#00d0ff] via-[#6366f1] to-[#f43f5e] transition-all duration-500 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:-translate-y-1">
      <div className="relative h-full w-full overflow-hidden rounded-[18px] bg-[#0a0714]">
        {children}
      </div>
    </div>
  );
}
