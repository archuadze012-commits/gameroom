"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getPushSubscribed, isPushSupported, subscribeToPush, unsubscribeFromPush } from "@/lib/push-subscribe";

const subscribeToPushSupport = () => () => {};

export function getPushSupportServerSnapshot() {
  return false;
}

export function getPushSupportSnapshot() {
  return isPushSupported();
}

export function PushBell({ className }: { className?: string }) {
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const supported = useSyncExternalStore(
    subscribeToPushSupport,
    getPushSupportSnapshot,
    getPushSupportServerSnapshot,
  );

  useEffect(() => {
    if (!supported) return;
    (async () => setSubscribed(await getPushSubscribed()))();
  }, [supported]);

  const enable = async () => {
    setBusy(true);
    try {
      const result = await subscribeToPush();
      if (result === "ok") {
        setSubscribed(true);
        toast.success("Push notifications ჩაირთო ✅");
      } else if (result === "denied") {
        toast.error("Notification permission გათიშულია ბრაუზერში.");
      } else if (result === "no-vapid") {
        toast.error("VAPID key არ არის set");
      } else if (result !== "unsupported") {
        toast.error("ვერ ჩაირთო");
      }
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const ok = await unsubscribeFromPush();
      setSubscribed(false);
      toast[ok ? "success" : "error"](ok ? "Push გათიშულია" : "შეცდომა");
    } finally {
      setBusy(false);
    }
  };

  if (!supported) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={subscribed ? disable : enable}
      disabled={busy}
      title={subscribed ? "Push: ON — დააჭირე გასათიშად" : "Push: OFF — დააჭირე ჩასართავად"}
      className={`relative ${className ?? ""}`}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : subscribed ? (
        <Bell className="h-4 w-4 text-primary" />
      ) : (
        <BellOff className="h-4 w-4 text-muted-foreground" />
      )}
      {!busy && (
        <span
          className={`pointer-events-none absolute right-1 top-1 h-2 w-2 rounded-full ring-2 ring-background ${
            subscribed ? "bg-emerald-400" : "bg-muted-foreground/60"
          }`}
          aria-label={subscribed ? "ON" : "OFF"}
        />
      )}
    </Button>
  );
}
