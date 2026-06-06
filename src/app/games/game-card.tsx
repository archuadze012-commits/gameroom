export function GameCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="pubg-loadout-link group relative block w-full h-full" data-variant="royale">
      <div className="pubg-loadout-card relative w-full h-full !p-0 overflow-hidden rounded-none">
        
        {/* Content goes first (z-1) */}
        <div className="relative z-[1] h-full w-full">
          {children}
        </div>

        {/* Decorators overlay the content (z-10) */}
        <span aria-hidden className="pubg-loadout-field absolute inset-0 z-[10] pointer-events-none mix-blend-overlay opacity-50" />
        <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] sm:w-[5px] z-[10] pointer-events-none" />
        <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-16 w-16 opacity-30 z-[10] pointer-events-none" />
        <span aria-hidden className="pubg-loadout-sweep absolute inset-y-0 left-0 w-1/3 z-[10] pointer-events-none" />
      </div>
    </div>
  );
}
