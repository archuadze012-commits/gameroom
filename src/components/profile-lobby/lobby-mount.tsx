"use client";

import dynamic from "next/dynamic";

/**
 * Client-only mount point for the WebGL LobbyScene.
 * Server components cannot use `dynamic({ ssr: false })` in Next 16, so this
 * thin wrapper isolates that into a "use client" boundary.
 */
const LobbyScene = dynamic(() => import("./lobby-scene"), {
  ssr: false,
  loading: () => null,
});

export function LobbyMount() {
  return <LobbyScene />;
}
