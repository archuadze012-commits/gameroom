"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DownloadButton({ gameId, fallbackUrl }: { gameId: string; fallbackUrl: string }) {
  const [url, setUrl] = useState(fallbackUrl);

  useEffect(() => {
    function read() {
      try {
        const stored = localStorage.getItem("gameroom_cracked_urls");
        if (stored) {
          const overrides = JSON.parse(stored) as Record<string, string>;
          if (overrides[gameId]) setUrl(overrides[gameId]);
        }
      } catch {}
    }
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, [gameId]);

  const isReady = url && url !== "#";

  if (!isReady) {
    return (
      <Button size="lg" className="shrink-0 gap-2" disabled>
        <Download className="h-4 w-4" /> URL არ არის
      </Button>
    );
  }

  return (
    <Button asChild size="lg" className="shrink-0 gap-2">
      <a href={url} target="_blank" rel="noopener noreferrer">
        <Download className="h-4 w-4" /> გადმოწერა
      </a>
    </Button>
  );
}
