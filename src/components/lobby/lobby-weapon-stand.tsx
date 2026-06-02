"use client";

import Image from "next/image";

type WeaponItem = {
  id: string;
  name: string;
  tier: string;
  image_url: string | null;
};

type Props = {
  weapons?: WeaponItem[];
};

type WeaponHook = {
  top: string;
  left: string;
  width: string;
  height: string;
  rotate: string;
};

const STAND_IMAGE_URL = "/lobby-assets/royal-weapon-stand.png";
const STAND_IMAGE_WIDTH = 1122;
const STAND_IMAGE_HEIGHT = 1402;
const SHELF_COUNT = 4;

const WEAPON_HOOKS: WeaponHook[] = [
  { top: "27.4%", left: "23.4%", width: "57.8%", height: "8.2%", rotate: "-0.8deg" },
  { top: "46.2%", left: "23.0%", width: "58.5%", height: "8.2%", rotate: "0deg" },
  { top: "58.1%", left: "22.7%", width: "59%", height: "8.2%", rotate: "1.5deg" },
  { top: "73.4%", left: "22.5%", width: "59.5%", height: "8.2%", rotate: "2.2deg" },
];

const TIER_GLOW: Record<string, string> = {
  common: "rgba(148,163,184,0.36)",
  rare: "rgba(34,211,238,0.5)",
  epic: "rgba(139,92,246,0.58)",
  legendary: "rgba(245,158,11,0.68)",
};

function WeaponHookLayer({ weapon, hook, index }: { weapon: WeaponItem | null; hook: WeaponHook; index: number }) {
  const glow = TIER_GLOW[weapon?.tier ?? "common"] ?? TIER_GLOW.common;
  const isIcefireM416 =
    Boolean(weapon?.image_url) &&
    ((weapon?.name ?? "").toLowerCase().includes("icefire") ||
      (weapon?.image_url ?? "").toLowerCase().includes("m416-caucasus-icefire") ||
      (weapon?.image_url ?? "").toLowerCase().includes("icefire"));
  const isGlacierM416 =
    Boolean(weapon?.image_url) &&
    !isIcefireM416 &&
    ((weapon?.name ?? "").toLowerCase().includes("glacier") ||
      (weapon?.image_url ?? "").toLowerCase().includes("m416-glacier"));
  const hookRotate = Number.parseFloat(hook.rotate);
  const m416Rotate = `${Number.isFinite(hookRotate) ? hookRotate - 3 : -3}deg`;
  const icefireRotate = `${Number.isFinite(hookRotate) ? hookRotate - 3 : -3}deg`;

  return (
    <div
      aria-hidden
      data-weapon-hook={index + 1}
      className="pointer-events-none absolute"
      style={{
        top: hook.top,
        left: hook.left,
        width: hook.width,
        height: hook.height,
        zIndex: isIcefireM416 ? 9998 : isGlacierM416 ? 50 : 10,
      }}
    >
      <span className="absolute inset-0 opacity-0" />
      {weapon?.image_url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
            src={weapon.image_url}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-contain"
            style={{
              width: isIcefireM416 ? "calc(100% - 20px)" : undefined,
              height: isIcefireM416 ? "calc(100% - 20px)" : undefined,
              margin: isIcefireM416 ? "auto" : undefined,
              filter: `drop-shadow(0 3px 5px rgba(0,0,0,0.72)) drop-shadow(0 0 8px ${glow}) ${isGlacierM416 ? "drop-shadow(0 0 22px rgba(0,0,0,0.42)) drop-shadow(0 0 34px rgba(0,0,0,0.22))" : "drop-shadow(0 0 14px rgba(0,0,0,0.28))"}`,
              transform: `${isGlacierM416 ? "translate(-10px, -30px)" : isIcefireM416 ? "translate(0px, 10px)" : "translate(0px, 0px)"} rotate(${isGlacierM416 ? m416Rotate : isIcefireM416 ? icefireRotate : hook.rotate}) scaleX(${isGlacierM416 ? 1.02 : isIcefireM416 ? 1.12 : 1.18}) ${isGlacierM416 ? "scale(5)" : isIcefireM416 ? "scale(1.4)" : ""}`,
              transformOrigin: "center center",
              zIndex: isIcefireM416 ? 9999 : isGlacierM416 ? 51 : 11,
            }}
          />
        </>
      ) : null}
    </div>
  );
}

export function LobbyWeaponStand({ weapons = [] }: Props) {
  const shelves: (WeaponItem | null)[] = Array.from(
    { length: SHELF_COUNT },
    (_, index) => weapons[index] ?? null,
  );

  return (
    <div
      className="lobby-weapon-stand pointer-events-none absolute z-[999] origin-right"
      style={{
        top: "calc(59% - 50px)",
        right: "calc(2.5% - 50px)",
        width: "360px",
        aspectRatio: `${STAND_IMAGE_WIDTH} / ${STAND_IMAGE_HEIGHT}`,
        transform: "translateY(-50%) scale(1.05)",
      }}
    >
      <div className="relative h-full w-full">
        <Image
          src={STAND_IMAGE_URL}
          alt=""
          aria-hidden
          fill
          sizes="(max-width: 640px) 32vw, (max-width: 1280px) 24vw, 360px"
          className="select-none object-contain"
          priority
          quality={90}
          draggable={false}
          style={{
            filter: "drop-shadow(0 16px 18px rgba(0,0,0,0.62)) drop-shadow(0 0 16px rgba(245,158,11,0.14))",
          }}
        />

        {WEAPON_HOOKS.map((hook, index) => (
          <WeaponHookLayer
            key={`weapon-hook-${index}`}
            weapon={shelves[index]}
            hook={hook}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
