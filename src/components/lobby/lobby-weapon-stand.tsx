"use client";

type WeaponItem = {
  id: string;
  name: string;
  tier: string;
  image_url: string | null;
};

type Props = {
  weapons?: WeaponItem[];
};

const SHELF_COUNT = 4;

const TIER_GLOW: Record<string, string> = {
  common: "rgba(148,163,184,0.35)",
  rare: "rgba(34,211,238,0.45)",
  epic: "rgba(139,92,246,0.55)",
  legendary: "rgba(245,158,11,0.6)",
};

function Rivet({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block shrink-0 rounded-full ${className}`}
      style={{
        width: "clamp(4px, 0.5vw, 6px)",
        height: "clamp(4px, 0.5vw, 6px)",
        background: "radial-gradient(circle at 35% 35%, #6b6b6b 0%, #2a2a2a 60%, #1a1a1a 100%)",
        boxShadow: "inset 0 1px 1px rgba(255,255,255,0.15), 0 1px 2px rgba(0,0,0,0.6)",
      }}
    />
  );
}

function MetalRail() {
  return (
    <div
      aria-hidden
      className="relative flex items-center"
      style={{ height: "clamp(3px, 0.4vw, 5px)" }}
    >
      {/* main rail body */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #4a4a4a 0%, #2d2d2d 35%, #1f1f1f 65%, #3a3a3a 100%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.5)",
        }}
      />
      {/* top edge highlight */}
      <span
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.1) 30%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.1) 70%, transparent 95%)" }}
      />
    </div>
  );
}

function WeaponHooks() {
  return (
    <div aria-hidden className="absolute bottom-0 left-0 right-0 flex justify-around px-[15%]">
      {[0, 1].map((i) => (
        <div
          key={i}
          style={{
            width: "clamp(3px, 0.4vw, 5px)",
            height: "clamp(8px, 1.2vw, 14px)",
            background: "linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 50%, #1f1f1f 100%)",
            borderRadius: "0 0 1px 1px",
            boxShadow: "inset 1px 0 0 rgba(255,255,255,0.06), 1px 1px 2px rgba(0,0,0,0.4)",
            transform: "translateY(100%)",
          }}
        />
      ))}
    </div>
  );
}

export function LobbyWeaponStand({ weapons = [] }: Props) {
  const shelves: (WeaponItem | null)[] = Array.from(
    { length: SHELF_COUNT },
    (_, i) => weapons[i] ?? null,
  );

  return (
    <div className="lobby-weapon-stand absolute right-[2.5%] top-[55%] z-[3] -translate-y-1/2">
      <div
        className="relative flex w-[clamp(130px,18vw,240px)] flex-col"
        style={{
          filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.7))",
          transform: "perspective(270px) rotateY(-21deg)",
          transformOrigin: "95% center",
        }}
      >
        {/* === OUTER FRAME — welded steel rectangle === */}
        <div
          className="relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 50%, #222 100%)",
            border: "2px solid #3a3a3a",
            borderRadius: "2px",
            clipPath: "polygon(0 0, calc(100% - 36px) 3%, 100% calc(3% + 36px), 100% 100%, 0 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.6)",
          }}
        >
          {/* brushed-metal texture overlay */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "repeating-linear-gradient(90deg, transparent 0 1px, rgba(255,255,255,0.5) 1px 2px)",
              backgroundSize: "3px 100%",
            }}
          />

          {/* top plate with label */}
          <div
            className="relative flex items-center justify-between px-2 pb-1.5 pt-4"
            style={{
              background: "linear-gradient(180deg, #333 0%, #252525 100%)",
              borderBottom: "1px solid #3a3a3a",
            }}
          >
            <Rivet />
            <span
              className="text-[7px] font-bold uppercase tracking-[0.22em]"
              style={{
                color: "#8a8a7a",
                textShadow: "0 1px 0 rgba(0,0,0,0.8)",
                letterSpacing: "0.22em",
              }}
            >
              ARSENAL
            </span>
            <Rivet />
          </div>

          {/* shelves */}
          {shelves.map((weapon, i) => (
            <div key={weapon?.id ?? `empty-${i}`} className="relative">
              {/* rail at top of each shelf */}
              <div className="relative">
                <MetalRail />
                <WeaponHooks />
              </div>

              {/* weapon display area */}
              <div
                className="relative flex items-center justify-center overflow-visible"
                style={{
                  height: "clamp(36px, 5vw, 54px)",
                  background: weapon
                    ? `radial-gradient(ellipse at 50% 80%, ${TIER_GLOW[weapon.tier] ?? TIER_GLOW.common} 0%, transparent 70%)`
                    : "transparent",
                }}
              >
                {/* dark recessed back panel */}
                <div
                  aria-hidden
                  className="absolute inset-x-[6%] inset-y-[8%]"
                  style={{
                    background: "linear-gradient(180deg, #0d0d0d 0%, #141414 50%, #0f0f0f 100%)",
                    boxShadow: "inset 0 2px 6px rgba(0,0,0,0.6), inset 0 -1px 3px rgba(0,0,0,0.3)",
                    borderRadius: "1px",
                  }}
                />

                {weapon?.image_url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={weapon.image_url}
                      alt={weapon.name}
                      draggable={false}
                      className="relative z-[1] h-[310%] w-auto max-w-none object-contain"
                      style={{
                        filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.7)) drop-shadow(0 0 6px ${TIER_GLOW[weapon.tier] ?? TIER_GLOW.common})`,
                      }}
                    />
                  </>
                ) : (
                  /* empty slot — silhouette hooks */
                  <div className="relative z-[1] flex items-center gap-[clamp(6px,1vw,10px)] opacity-15">
                    <span className="h-[1px] w-[clamp(8px,1.5vw,14px)] bg-white/40" />
                    <span className="h-[2px] w-[clamp(16px,3vw,28px)] bg-white/25" style={{ borderRadius: "1px" }} />
                    <span className="h-[1px] w-[clamp(8px,1.5vw,14px)] bg-white/40" />
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* bottom rail */}
          <MetalRail />

          {/* bottom plate with rivets */}
          <div
            className="flex items-center justify-between px-2 py-1"
            style={{
              background: "linear-gradient(180deg, #282828 0%, #1e1e1e 100%)",
              borderTop: "1px solid #333",
            }}
          >
            <Rivet />
            <div className="flex gap-[clamp(4px,0.6vw,8px)]">
              <Rivet />
              <Rivet />
            </div>
            <Rivet />
          </div>
        </div>

        {/* floor shadow beneath the stand */}
        <div
          aria-hidden
          className="absolute left-[-45%] w-[170%]"
          style={{
            top: "100%",
            height: "clamp(70px, 10vw, 130px)",
            background: "radial-gradient(ellipse at 50% 0%, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.35) 35%, transparent 70%)",
            clipPath: "polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)",
            filter: "blur(8px)",
          }}
        />
      </div>
    </div>
  );
}
