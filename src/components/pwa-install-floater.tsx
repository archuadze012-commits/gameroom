"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MonitorDown, Pin, X, Rocket, Lock, Star, MoreVertical } from "lucide-react";

type Stage = "install" | "fallback" | "pin" | null;
type OS = "windows" | "macos" | "linux" | "other";
type Locale = "ka" | "en";

type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt: () => Promise<void>;
};

type FloaterOptions = {
  delay?: number;
  locale?: Locale;
  cooldownDays?: number;
  forceStage?: Stage;
  onInstall?: () => void;
  onDismiss?: (stage: Exclude<Stage, null>) => void;
  onPinAcknowledged?: () => void;
};

declare global {
  interface Window {
    PWAInstallFloater?: {
      show: (stage?: Exclude<Stage, null>) => void;
      hide: () => void;
      reset: () => void;
    };
  }
}

const STORAGE_KEY = (s: Exclude<Stage, null>) => `gameroom-pwa-dismissed-${s}`;
const STORAGE_PIN_SHOWN = "gameroom-pwa-pin-shown";

const i18n = {
  ka: {
    installTitle: "დააყენე Gameroom დესკტოპზე",
    installBody: "სწრაფი წვდომა ერთი კლიკით — გაუშვი ცალკე ფანჯარაში, ბრაუზერის გარეშე.",
    installCta: "დააყენე ახლა",
    later: "მოგვიანებით",
    fallbackTitle: "დააყენე Gameroom როგორც აპლიკაცია",
    fallbackBody: "გახსენი საიტი Google Chrome-ში და დააჭირე ამ ღილაკს მისამართის ველში:",
    fallbackHint: 'თუ ღილაკი არ ჩანს → მენიუ (⋮) → "Install Gameroom..."',
    fallbackCta: "გასაგებია",
    pinTitleWin: "მიამაგრე Taskbar-ზე",
    pinTitleMac: "შეინახე Dock-ში",
    pinTitleLinux: "მიამაგრე Launcher-ზე",
    pinBodyWin: 'მარჯვენა ღილაკი Taskbar-ში Gameroom-ის იკონაზე → "Pin to taskbar".',
    pinBodyMac: 'მარჯვენა ღილაკი Dock-ში იკონაზე → Options → "Keep in Dock".',
    pinBodyLinux: "მიამაგრე აპის იკონა შენი დესკტოპის გამშვებზე.",
    pinCta: "გასაგებია 👍",
    close: "დახურვა",
    address: "gameroom.com.ge",
  },
  en: {
    installTitle: "Install Gameroom on desktop",
    installBody: "One-click access — runs in its own window, no browser tab.",
    installCta: "Install now",
    later: "Later",
    fallbackTitle: "Install Gameroom as an app",
    fallbackBody: "Open the site in Google Chrome and tap this button in the address bar:",
    fallbackHint: 'If you don\'t see it → menu (⋮) → "Install Gameroom..."',
    fallbackCta: "Got it",
    pinTitleWin: "Pin it to your Taskbar",
    pinTitleMac: "Keep it in your Dock",
    pinTitleLinux: "Pin it to your launcher",
    pinBodyWin: 'Right-click the Gameroom icon in the Taskbar → "Pin to taskbar".',
    pinBodyMac: 'Right-click the icon in the Dock → Options → "Keep in Dock".',
    pinBodyLinux: "Pin the app icon to your desktop launcher.",
    pinCta: "Got it 👍",
    close: "Close",
    address: "gameroom.com.ge",
  },
} as const;

function detectOS(): OS {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "macos";
  if (ua.includes("linux") || ua.includes("x11")) return "linux";
  return "other";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isWebView(): boolean {
  if (typeof navigator === "undefined") return false;
  return /(; wv\)|Electron|CEF|WebView|FBAN|FBAV|Instagram|Line\/|MicroMessenger)/i.test(
    navigator.userAgent
  );
}

function supportsNativePrompt(): boolean {
  if (typeof window === "undefined") return false;
  // Chrome/Edge expose BeforeInstallPromptEvent; Safari/Firefox don't.
  return "BeforeInstallPromptEvent" in window || /Chrome|Edg/.test(navigator.userAgent);
}

function withinCooldown(key: string, days: number): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    const ageDays = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    return ageDays < days;
  } catch {
    return false;
  }
}

export function PWAInstallFloater({
  delay = 5000,
  locale = "ka",
  cooldownDays = 7,
  forceStage = null,
  onInstall,
  onDismiss,
  onPinAcknowledged,
}: FloaterOptions = {}) {
  const [stage, setStage] = useState<Stage>(null);
  const [mounted, setMounted] = useState(false);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const os = useRef<OS>("other");
  const t = i18n[locale];

  // Decide initial stage + register listeners
  useEffect(() => {
    os.current = detectOS();

    if (forceStage) {
      setStage(forceStage);
      return;
    }

    // Already installed → show pin once on first standalone launch
    if (isStandalone()) {
      try {
        if (!localStorage.getItem(STORAGE_PIN_SHOWN) &&
            !withinCooldown(STORAGE_KEY("pin"), cooldownDays)) {
          const id = window.setTimeout(() => setStage("pin"), Math.min(delay, 1500));
          return () => window.clearTimeout(id);
        }
      } catch {}
      return;
    }

    // WebView / Safari / Firefox → fallback visual after delay
    if (isWebView() || !supportsNativePrompt()) {
      if (!withinCooldown(STORAGE_KEY("fallback"), cooldownDays)) {
        const id = window.setTimeout(() => setStage("fallback"), delay);
        return () => window.clearTimeout(id);
      }
      return;
    }

    // Chromium: wait for beforeinstallprompt, fall back to visual guide if it never fires
    if (
      withinCooldown(STORAGE_KEY("install"), cooldownDays) &&
      withinCooldown(STORAGE_KEY("fallback"), cooldownDays)
    ) return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      window.setTimeout(() => setStage((cur) => cur ?? "install"), delay);
    };
    const onInstalled = () => {
      deferredRef.current = null;
      onInstall?.();
      setStage("pin");
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);

    // Fallback after grace period if Chrome never fires beforeinstallprompt
    // (engagement criteria not met, already installed elsewhere, etc.)
    const fallbackTimer = window.setTimeout(() => {
      if (deferredRef.current) return;
      if (withinCooldown(STORAGE_KEY("fallback"), cooldownDays)) return;
      setStage((cur) => cur ?? "fallback");
    }, delay + 2000);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
      window.clearTimeout(fallbackTimer);
    };
  }, [delay, cooldownDays, forceStage, onInstall]);

  // Slide-up + fade animation flag
  useEffect(() => {
    if (stage) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      requestAnimationFrame(() => setMounted(true));
    } else {
      setMounted(false);
    }
  }, [stage]);

  const dismiss = useCallback((s: Exclude<Stage, null>) => {
    try {
      if (s === "pin") localStorage.setItem(STORAGE_PIN_SHOWN, "1");
      localStorage.setItem(STORAGE_KEY(s), String(Date.now()));
    } catch {}
    onDismiss?.(s);
    if (s === "pin") onPinAcknowledged?.();
    setMounted(false);
    window.setTimeout(() => {
      setStage(null);
      previouslyFocused.current?.focus?.();
    }, 280);
  }, [onDismiss, onPinAcknowledged]);

  // ESC + focus trap
  useEffect(() => {
    if (!stage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { dismiss(stage); return; }
      if (e.key === "Tab" && dialogRef.current) {
        const fs = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])'
        );
        if (!fs.length) return;
        const first = fs[0], last = fs[fs.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    const id = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLButtonElement>("[data-close]")?.focus();
    }, 60);
    return () => { window.removeEventListener("keydown", onKey); window.clearTimeout(id); };
  }, [stage, dismiss]);

  // Expose public API on window
  useEffect(() => {
    window.PWAInstallFloater = {
      show: (s = "install") => setStage(s),
      hide: () => setStage(null),
      reset: () => {
        try {
          (["install", "fallback", "pin"] as const).forEach((s) => localStorage.removeItem(STORAGE_KEY(s)));
          localStorage.removeItem(STORAGE_PIN_SHOWN);
        } catch {}
      },
    };
    return () => { delete window.PWAInstallFloater; };
  }, []);

  const handleInstall = async () => {
    const prompt = deferredRef.current;
    if (!prompt) return;
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      deferredRef.current = null;
      if (outcome === "accepted") {
        onInstall?.();
        setMounted(false);
        // appinstalled will transition to pin
      } else {
        dismiss("install");
      }
    } catch {
      dismiss("install");
    }
  };

  if (!stage) return null;

  const pinTitle =
    os.current === "macos" ? t.pinTitleMac :
    os.current === "linux" ? t.pinTitleLinux : t.pinTitleWin;
  const pinBody =
    os.current === "macos" ? t.pinBodyMac :
    os.current === "linux" ? t.pinBodyLinux : t.pinBodyWin;

  const title = stage === "install" ? t.installTitle : stage === "fallback" ? t.fallbackTitle : pinTitle;
  const body = stage === "install" ? t.installBody : stage === "fallback" ? t.fallbackBody : pinBody;

  const isPin = stage === "pin";
  const positionClasses = isPin
    ? "bottom-20 xl:bottom-6 left-1/2 -translate-x-1/2 sm:w-[380px] w-[calc(100vw-32px)]"
    : "top-20 right-4 sm:right-6 left-4 sm:left-auto sm:w-[380px]";
  const enterTransform = isPin
    ? (mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0")
    : (mounted ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0");

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="false"
      aria-live="polite"
      aria-labelledby="pwaif-title"
      aria-describedby="pwaif-body"
      data-mounted={mounted}
      data-stage={stage}
      className={[
        "fixed z-[60] pwaif-root",
        positionClasses,
        "rounded-[18px] border p-4",
        "bg-[rgba(15,18,28,0.85)] border-white/[0.08]",
        "shadow-[0_24px_70px_-12px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04)_inset]",
        "backdrop-blur-[22px] backdrop-saturate-[180%]",
        "transition-all duration-[420ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
        enterTransform,
        "text-[#E6E8EE]",
      ].join(" ")}
      style={{ fontFamily: "var(--font-inter), var(--font-noto-georgian), system-ui, sans-serif" }}
    >
      <button
        data-close
        onClick={() => dismiss(stage)}
        aria-label={t.close}
        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md text-[#9099AD] transition-colors hover:bg-white/[0.08] hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div
            className="grid h-11 w-11 place-items-center rounded-xl text-white"
            style={{ background: "linear-gradient(135deg, #4F8CFF 0%, #6E5BFF 100%)" }}
          >
            {stage === "pin"
              ? <Pin className="h-5 w-5 pwaif-wiggle" />
              : <MonitorDown className="h-5 w-5" />}
          </div>
          {stage !== "pin" && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-sky-400 ring-2 ring-[rgba(15,18,28,0.85)] pwaif-pulse" />
          )}
        </div>

        <div className="min-w-0 flex-1 pr-6">
          <h3 id="pwaif-title" className="text-[16px] font-semibold leading-tight text-white">
            {title}
          </h3>
          <p id="pwaif-body" className="mt-1 text-[13px] leading-snug text-[#9099AD]">
            {body}
          </p>
        </div>
      </div>

      {stage === "fallback" && (
        <>
          <div className="mt-3 select-none">
            <div className="flex items-center gap-2 rounded-[10px] bg-[#1F2330] px-2.5 py-1.5">
              <Lock className="h-3 w-3 text-emerald-400/80 shrink-0" />
              <span className="truncate text-[12px] text-[#C9CEDB] font-mono">{t.address}</span>
              <div className="ml-auto flex items-center gap-1.5 shrink-0">
                <span
                  className="pwaif-pill flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-white"
                  style={{ background: "linear-gradient(135deg, #4F8CFF 0%, #6E5BFF 100%)" }}
                >
                  <MonitorDown className="h-3 w-3" />
                  Install
                </span>
                <Star className="h-3.5 w-3.5 text-[#9099AD]" />
                <MoreVertical className="h-3.5 w-3.5 text-[#9099AD]" />
              </div>
            </div>
          </div>
          <p className="mt-2 text-[11.5px] leading-snug text-[#9099AD]">{t.fallbackHint}</p>
        </>
      )}

      {stage === "pin" && (
        <div className="mt-3 overflow-hidden rounded-lg border border-white/[0.06] bg-black/30 p-3">
          <div className="pwaif-taskbar">
            <div className="pwaif-tile" />
            <div className="pwaif-tile" />
            <div className="pwaif-tile pwaif-tile-app">
              <span className="pwaif-pin-badge" aria-hidden="true">
                <Pin className="h-2.5 w-2.5" />
              </span>
            </div>
            <div className="pwaif-tile" />
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-end gap-2">
        {stage === "install" && (
          <button
            onClick={() => dismiss("install")}
            className="rounded-lg px-3 py-1.5 text-[13px] text-[#9099AD] transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            {t.later}
          </button>
        )}
        <button
          data-primary
          onClick={
            stage === "install" ? handleInstall :
            stage === "fallback" ? () => dismiss("fallback") :
            () => dismiss("pin")
          }
          className="group flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-white shadow-[0_4px_12px_-2px_rgba(79,140,255,0.5)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #4F8CFF 0%, #6E5BFF 100%)" }}
        >
          {stage === "install" && <Rocket className="h-3.5 w-3.5" />}
          {stage === "install" ? t.installCta : stage === "fallback" ? t.fallbackCta : t.pinCta}
        </button>
      </div>

      <style jsx>{`
        @keyframes pwaif-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.6; }
        }
        @keyframes pwaif-wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-8deg); }
          75% { transform: rotate(8deg); }
        }
        @keyframes pwaif-pin-snap {
          0%, 20% { transform: translateX(-50%) translateY(-22px) scale(0.6); opacity: 0; }
          40% { transform: translateX(-50%) translateY(-22px) scale(1); opacity: 1; }
          55% { transform: translateX(-50%) translateY(-2px) scale(1); opacity: 1; }
          90%, 100% { transform: translateX(-50%) translateY(-2px) scale(1); opacity: 1; }
        }
        @keyframes pwaif-tile-highlight {
          0%, 39% { box-shadow: none; }
          55%, 90% { box-shadow: 0 0 0 2px rgba(79, 140, 255, 0.6); }
          100% { box-shadow: none; }
        }
        @keyframes pwaif-pill-bounce {
          0%, 80%, 100% { transform: translateY(0); }
          85% { transform: translateY(-3px); }
          90% { transform: translateY(0); }
          95% { transform: translateY(-1.5px); }
        }
        :global(.pwaif-pulse) { animation: pwaif-pulse 2s ease-in-out infinite; }
        :global(.pwaif-wiggle) { animation: pwaif-wiggle 1.8s ease-in-out infinite; transform-origin: 50% 80%; }
        :global(.pwaif-pill) { animation: pwaif-pill-bounce 3s ease-in-out infinite; }
        :global(.pwaif-taskbar) {
          display: flex; gap: 8px; align-items: end;
          height: 36px; padding: 4px 6px;
          background: rgba(255,255,255,0.04);
          border-radius: 6px;
        }
        :global(.pwaif-tile) {
          width: 22px; height: 22px;
          background: rgba(255,255,255,0.08);
          border-radius: 4px;
        }
        :global(.pwaif-tile-app) {
          position: relative;
          background: linear-gradient(135deg, #4F8CFF 0%, #6E5BFF 100%);
          animation: pwaif-tile-highlight 4s ease-in-out infinite;
        }
        :global(.pwaif-pin-badge) {
          position: absolute; left: 50%; top: -2px;
          display: grid; place-items: center;
          width: 14px; height: 14px; border-radius: 999px;
          background: #fff; color: #4F8CFF;
          animation: pwaif-pin-snap 4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.pwaif-pulse),
          :global(.pwaif-wiggle),
          :global(.pwaif-pill),
          :global(.pwaif-tile-app),
          :global(.pwaif-pin-badge) { animation: none !important; }
        }
        @media (prefers-color-scheme: light) {
          .pwaif-root {
            background: rgba(248,250,255,0.85) !important;
            color: #0F1220 !important;
            border-color: rgba(0,0,0,0.06) !important;
          }
        }
      `}</style>
    </div>
  );
}
