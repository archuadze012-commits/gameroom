"use client";

import { useEffect, useRef, useCallback, useState } from "react";

/**
 * Cloudflare Turnstile CAPTCHA widget (invisible-to-managed).
 *
 * Renders the Turnstile challenge inline and calls `onVerify` with the
 * response token.  The token is also written to a hidden `<input>` with
 * `name="cf-turnstile-response"` so it is included in `<form>` submissions
 * automatically.
 *
 * @see https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
 */

interface TurnstileProps {
  /** Called when the user passes the challenge. */
  onVerify?: (token: string) => void;
  /** Called if the challenge expires (the token is no longer valid). */
  onExpire?: () => void;
  /** Widget size: "normal" | "compact" (default: "normal"). */
  size?: "normal" | "compact";
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

const SCRIPT_ID = "cf-turnstile-script";

function ensureScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.turnstile) {
      resolve();
      return;
    }

    if (document.getElementById(SCRIPT_ID)) {
      // Script is loading — wait for the callback.
      const prev = window.onTurnstileLoad;
      window.onTurnstileLoad = () => {
        prev?.();
        resolve();
      };
      return;
    }

    window.onTurnstileLoad = () => resolve();

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });
}

export function Turnstile({ onVerify, onExpire, size = "normal" }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState("");

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  const handleVerify = useCallback(
    (t: string) => {
      setToken(t);
      onVerify?.(t);
    },
    [onVerify]
  );

  const handleExpire = useCallback(() => {
    setToken("");
    onExpire?.();
  }, [onExpire]);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let cancelled = false;

    ensureScript().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile) return;

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "dark",
        size,
        callback: handleVerify,
        "expired-callback": handleExpire,
      });
    });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* widget might already be gone */
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, size, handleVerify, handleExpire]);

  // If Turnstile is not configured, render nothing (dev mode).
  if (!siteKey) return null;

  return (
    <>
      <div ref={containerRef} className="flex justify-center" />
      <input type="hidden" name="cf-turnstile-response" value={token} />
    </>
  );
}
