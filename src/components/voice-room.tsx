"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  AudioConference,
  ControlBar,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2, ShieldAlert } from "lucide-react";

export function VoiceRoom({ room, onDisconnect }: { room: string; onDisconnect?: () => void }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(`/api/voice/token?room=${room}`);
        const data = await resp.json();
        if (!resp.ok) {
          setError(data.error || "Token generation failed");
          return;
        }
        setToken(data.token);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Token generation failed");
      }
    })();
  }, [room]);

  if (error) {
    return (
      <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
        <ShieldAlert className="h-10 w-10 text-red-500 mx-auto mb-2" />
        <p className="text-sm font-bold text-red-500">ბექენდის შეცდომა:</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-secondary/20 rounded-xl border border-border/60">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted-foreground">ვუკავშირდებით სერვერს...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/20 overflow-hidden bg-background/50 backdrop-blur-md" style={{ height: '350px' }}>
      <LiveKitRoom
        video={false}
        audio={true}
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        connect={true}
        onDisconnected={onDisconnect}
        onError={(err) => setError(`კავშირის შეცდომა: ${err.message}`)}
        data-lk-theme="default"
      >
        <AudioConference />
        <div className="p-4 border-t border-border/40">
           <ControlBar variation="minimal" controls={{ camera: false, screenShare: false, chat: false }} />
        </div>
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
