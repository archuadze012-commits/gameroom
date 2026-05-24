"use client";

import { useEffect, useState } from "react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { DisplayHeading } from "@/components/ui/display-heading";
import { ClanFinderBoard } from "@/components/clans/clan-finder-board";
import { MyClanConsole } from "@/components/clans/my-clan-console";
import { type MyClanState, readClanFromStorage, writeClanToStorage } from "@/components/clans/clan-store";

export function ClansHub() {
  const [clan, setClan] = useState<MyClanState | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setClan(readClanFromStorage());
      setLoaded(true);
    }, 0);

    const syncClan = () => setClan(readClanFromStorage());
    window.addEventListener("storage", syncClan);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", syncClan);
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    writeClanToStorage(clan);
  }, [clan, loaded]);

  return (
    <>
      <MyClanConsole clan={clan} setClan={setClan} />

      <section id="clan-finder">
        <div className="mb-5">
          <Eyebrow tone="violet">CLAN FINDER</Eyebrow>
          <DisplayHeading as="h2" size="md" className="mt-2">
            რეალური კლანები
          </DisplayHeading>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ClanFinderBoard clan={clan} />
        </div>
      </section>
    </>
  );
}
