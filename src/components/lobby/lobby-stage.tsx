"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { LobbyCanvas } from "@/components/lobby/lobby-canvas";
import { LobbyCharacter, type LobbyCharacterHandle } from "@/components/lobby/lobby-character";
import { LobbyHud } from "@/components/lobby/lobby-hud";
import { LobbyInventory, type LobbyLoadout } from "@/components/lobby/lobby-inventory";
import { LobbyStageLight } from "@/components/lobby/lobby-stage-light";
import { StartWidget } from "@/components/lobby/start-widget";
import type { LobbyHudData } from "@/types/lobby";

type Props = {
  gameName: string;
  imageUrl: string;
  hudData?: LobbyHudData | null;
};

const DEFAULT_LOADOUT: LobbyLoadout = {
  character: "soldier",
  weapon: "m416",
  clothing: "tactical",
};

const CHARACTER_URL = "/characters/gameroom-vanguard.png";

export function LobbyStage({ gameName, imageUrl, hudData = null }: Props) {
  return (
    <div data-lobby-stage className="absolute inset-0 overflow-hidden">
      <Image
        src={imageUrl}
        alt={`${gameName} lobby`}
        fill
        priority
        quality={75}
        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 92vw, 1152px"
        className="object-cover object-center"
      />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_62%,transparent_0_28%,rgba(8,6,15,0.1)_48%,rgba(8,6,15,0.45)_100%)]" />
      <LobbyStageLight />
      <LiveHud data={hudData} />
      <StartWidget />
      <LobbyLoadoutLayer characterUrl={CHARACTER_URL} />
    </div>
  );
}

function LobbyLoadoutLayer({ characterUrl }: { characterUrl: string }) {
  const [loadout, setLoadout] = useState<LobbyLoadout>(DEFAULT_LOADOUT);
  const characterRef = useRef<LobbyCharacterHandle>(null);

  const handleLoadoutChange = (nextLoadout: LobbyLoadout) => {
    setLoadout(nextLoadout);
    characterRef.current?.triggerEquipFlash();
  };

  return (
    <>
      <LobbyCanvas />
      {/* leg contact shadow — SVG path shaped like standing legs */}
      <svg
        aria-hidden
        className="lobby-contact-shadow"
        viewBox="0 0 100 90"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="leg-shadow-blur" x="-40%" y="-20%" width="180%" height="140%">
            <feGaussianBlur stdDeviation="6.5" />
          </filter>
        </defs>
        {/* left leg */}
        <path
          d="M 34,5 C 30,5 22,18 8,68 L 6,78 C 12,83 24,84 29,80 L 31,55 Z"
          fill="black"
          opacity="0.70"
          filter="url(#leg-shadow-blur)"
        />
        {/* right leg (mirror) */}
        <path
          d="M 55,5 C 59,5 67,18 81,68 L 83,78 C 77,83 65,84 60,80 L 58,55 Z"
          fill="black"
          opacity="0.70"
          filter="url(#leg-shadow-blur)"
        />
        {/* center shadow between legs */}
        <path
          d="M 35,55 C 35,65 39,75 45,87 C 51,75 55,65 55,55 C 52,52 38,52 35,55 Z"
          fill="black"
          opacity="0.65"
          filter="url(#leg-shadow-blur)"
        />
      </svg>
      <LobbyCharacter
        ref={characterRef}
        src={characterUrl}
        alt=""
      />
      <LobbyInventory initialLoadout={loadout} onLoadoutChange={handleLoadoutChange} />
    </>
  );
}

function LiveHud({ data }: { data: LobbyHudData | null }) {
  return <LobbyHud data={data} />;
}
