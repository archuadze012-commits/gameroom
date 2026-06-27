"use client";

import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft, ChevronRight,
  Sparkles, Users, Gamepad2, Trophy, Gift, Tv, ShoppingBag, LogIn,
} from "lucide-react";
import Link from "next/link";

const GODERDZI = "/characters/goderdzi.png";
const LEO = "/characters/gameroom-vanguard-guide.webp";
const LEO_MOBILE = "/characters/gameroom-vanguard-guide-mobile.png";

const GODERDZI_SENTENCES = [
  "გაუმარჯოს, მე გოდერძი ვარ. ფლეიგეიმის სიმბოლო და რამე.",
  
  "გაიარე აბა ერთი ავტორიზაცია.",
  "ან თუ არ იცი ეს რა საიტია და სად მოხვდი, გირჩევ, ლეოს დავუძახოთ.",
];

type Step = {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  eyebrow: string;
  title: string;
  body: string;
  href?: string;
  hrefLabel?: string;
};

const STEPS: Step[] = [
  {
    key: "welcome",
    icon: Sparkles,
    accent: "#00E6FF",
    eyebrow: "",
    title: "",
    body: "კაი გამარჯობა შენი! მე ვარ ლეო — ვეცდები აგიხსნა, რას ნახავ PLAYGAME-ზე. მზად ხარ?",
  },
  {
    key: "free",
    icon: Gift,
    accent: "#8b5cf6",
    eyebrow: "უფასო თამაშები",
    title: "PC თამაშები უფასოდ",
    body: "PlayGame-დან თითქმის ყველა PC თამაშის გადმოწერა უფასოდ შეგიძლია, თუ ორიგინალის ფული გენანება. თამაშები დადებამდე იტესტება, რათა ადგილი არ ქონდეს რაიმე მამაძაღლობას.",
    href: "/free-pc-games",
    hrefLabel: "სანახავად, გაიარე ავტორიზაცია",
  },
  {
    key: "lfg",
    icon: Users,
    accent: "#ec4899",
    eyebrow: "ლოკალი",
    title: "იპოვე მეტოქე ან თიმმეითი",
    body: "გჭირდება თანაგუნდელი ან მოწინააღმდეგე? დაპოსტე ლოკალში და წამებში იპოვი მოთამაშეებს.",
    href: "/lfg",
    hrefLabel: "ლოკალის ნახვა",
  },
  {
    key: "streams",
    icon: Tv,
    accent: "#f97316",
    eyebrow: "სტრიმები",
    title: "YouTube სტრიმები",
    body: "როცა PLAYGAME-ის იუზერები YouTube-ზე გასტრიმავენ, მათი LIVE-ები საიტზე ავტომატურად გაჩნდება.ეს ხელს შეუწყობს იუთუბზე ქართული სტრიმინგ კულტურის განვითარებას.",
    href: "/streams",
    hrefLabel: "სტრიმების ნახვა",
  },
  {
    key: "shop",
    icon: ShoppingBag,
    accent: "#a855f7",
    eyebrow: "შოპი",
    title: "შოპი",
    body: "შეიძინე სკინები, პერსონაჟები და სხვა ძერსკობები, რომლითაც შენს პროფილს და ვირტუალურ ლობიებს გაალამაზებ. საყიდლად დაგჭირდება ვირტუალური ვალუტა - ბოტქოინი, რომელსაც ტურნირებში, გათამაშებებში და სხვა აქტივობებში მონაწილეობისას აიღებ.",
    href: "/shop",
    hrefLabel: "შოპში შესვლა",
  },
  {
    key: "games",
    icon: Gamepad2,
    accent: "#00E6FF",
    eyebrow: "თამაშები & ლობი",
    title: "ვირტუალური ლობი",
    body: "მოაწყე ვირტუალური ლობი შენს ფავორიტ თამაშებში. თუ იაქტიურებ, შენს ლობის საკუთარი პერსონაჟით და სასურველი დიზაინის ზმანებით დაამშვენებ. მერე დადექი და იფლექსავე 24/7-ზე.",
    href: "/games",
    hrefLabel: "თამაშების ნახვა",
  },
  {
    key: "tournaments",
    icon: Trophy,
    accent: "#fbbf24",
    eyebrow: "ტურნირები",
    title: "კომპეტიტივი",
    body: "მიიღე მონაწილეობა ჩემპიონატებში, \"პრაკებში\", გათამაშებებში, რუმებში და სხვ. თითოეულ მათგანში ნაჩვენები შედეგები შენს პროფილზე აისახება და დაგეხმარება სტატუსის ამაღლებაში. რაც უფრო აქტიური და პრო ხარ, მით უკეთეს სტატუსს აღწევ.",
    href: "/tournaments",
    hrefLabel: "ტურნირების ნახვა",
  },
  {
    key: "join",
    icon: LogIn,
    accent: "#00E6FF",
    eyebrow: "შემოგვიერთდი",
    title: "გაიარე ავტორიზაცია",
    body: "შეუერთდი ქართველი გეიმერების საზოგადოებას ერთი კლიკით.",
    href: "/auth/login",
    hrefLabel: "შესვლა Google-ით",
  },
];

type Props = {
  headline: string;
  logoUrl: string;
};

export function HomeGuestHero({ headline, logoUrl }: Props) {
  const [view, setView] = useState<"goderdzi" | "leo">("goderdzi");

  return view === "goderdzi" ? (
    <GoderdziIntro
      logoUrl={logoUrl}
      headline={headline}
      onCallLeo={() => setView("leo")}
    />
  ) : (
    <LeoGuide onBack={() => setView("goderdzi")} />
  );
}

/* ──────────────────────────────────────────────────────────
   Static audio maps — files live in /public/audio/
   ────────────────────────────────────────────────────────── */
const GODERDZI_AUDIO_SRC = "/audio/goderdzi speech.mp3";

const LEO_AUDIO: Record<string, string> = {
  "welcome-0": "/audio/leo-welcome-0.mp3",
  "free-0":    "/audio/leo-free-0.mp3",
  "free-1":    "/audio/leo-free-1.mp3",
  "lfg-0":     "/audio/leo-lfg-0.mp3",
  "streams-0": "/audio/leo-streams-0.mp3",
  "streams-1": "/audio/leo-streams-1.mp3",
  "shop-0":    "/audio/leo-shop-0.mp3",
  "shop-1":    "/audio/leo-shop-1.mp3",
  "games-0":   "/audio/leo-games-0.mp3",
  "games-1":   "/audio/leo-games-1.mp3",
  "games-2":   "/audio/leo-games-2.mp3",
  "tournaments-0": "/audio/leo-tournaments-0.mp3",
  "tournaments-1": "/audio/leo-tournaments-1.mp3",
  "tournaments-2": "/audio/leo-tournaments-2.mp3",
  "join-0":    "/audio/leo-join-0.mp3",
};

// Unlock autoplay after first user interaction
let audioUnlocked = false;
const unlockCallbacks: (() => void)[] = [];

function onAudioUnlock(cb: () => void) {
  if (audioUnlocked) { cb(); return; }
  unlockCallbacks.push(cb);
}

if (typeof window !== "undefined") {
  const unlock = () => {
    if (audioUnlocked) return;
    audioUnlocked = true;
    unlockCallbacks.forEach((cb) => cb());
    unlockCallbacks.length = 0;
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
  window.addEventListener("scroll", unlock, { once: true, capture: true });
}

function useStaticAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingRef = useRef<string | null>(null);

  const play = (src: string) => {
    audioRef.current?.pause();
    const doPlay = () => {
      const audio = new Audio(src);
      audioRef.current = audio;
      audio.play().catch(() => {});
    };
    if (audioUnlocked) {
      doPlay();
    } else {
      pendingRef.current = src;
      onAudioUnlock(() => {
        if (pendingRef.current === src) doPlay();
      });
    }
  };

  const stop = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    pendingRef.current = null;
  };

  return { play, stop };
}

/* ──────────────────────────────────────────────────────────
   STATE 1 — Goderdzi greets the guest
   ────────────────────────────────────────────────────────── */
function GoderdziIntro({
  onCallLeo,
}: {
  logoUrl: string;
  headline: string;
  onCallLeo: () => void;
}) {
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [fading, setFading] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { play, stop } = useStaticAudio();

  useEffect(() => {
    const sentence = GODERDZI_SENTENCES[sentenceIdx];
    setDisplayed("");
    setFading(false);
    let tid: ReturnType<typeof setTimeout>;

    const startTyping = () => {
      setDisplayed(sentence);
      if (sentenceIdx === 0) play(GODERDZI_AUDIO_SRC);
      const isLast = sentenceIdx === GODERDZI_SENTENCES.length - 1;
      const delay = isLast ? 9000 : sentenceIdx === 1 ? 2000 : 3200;
      tid = setTimeout(() => {
        setFading(true);
        tid = setTimeout(() => {
          if (isLast) { setHidden(true); return; }
          setSentenceIdx((s) => s + 1);
        }, 1500);
      }, delay);
    };

    if (sentenceIdx === 0) {
      onAudioUnlock(startTyping);
    } else {
      startTyping();
    }

    return () => { clearTimeout(tid); };
  }, [sentenceIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="relative z-10 mx-auto flex w-full h-full max-w-lg flex-col items-center px-1 pb-0 lg:max-w-2xl overflow-hidden">

      {/* Comic speech bubble — horizontal oval with tail */}
      <div className={`absolute top-31 left-[calc(50%-100px)] -translate-x-1/2 transition-opacity duration-500 ${hidden ? "opacity-0 pointer-events-none" : fading ? "opacity-0" : "opacity-100"}`}
        style={{ filter: "drop-shadow(0 0 22px rgba(0,230,255,0.3)) drop-shadow(0 2px 12px rgba(0,0,0,0.7))" }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 340 115"
          className="w-[min(86vw,340px)]"
          style={{ overflow: "visible" }}
        >
          <defs>
            <linearGradient id="bubble-border" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00E6FF" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="bubble-fill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0d0b1a" stopOpacity="0.97" />
              <stop offset="100%" stopColor="#08060f" stopOpacity="0.97" />
            </linearGradient>
            <linearGradient id="bubble-shine" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00E6FF" stopOpacity="0.12" />
              <stop offset="60%" stopColor="#00E6FF" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Border ellipse */}
          <ellipse cx="163" cy="50" rx="163" ry="50" fill="url(#bubble-border)" />
          {/* Inner fill ellipse */}
          <ellipse cx="163" cy="50" rx="160" ry="47" fill="url(#bubble-fill)" />
          {/* Shine overlay */}
          <ellipse cx="163" cy="32" rx="120" ry="22" fill="url(#bubble-shine)" />
          {/* Tail — pointing bottom-right toward Goderdzi */}
          <path d="M220 93 L265 118 L238 84 Z" fill="url(#bubble-border)" />
          <path d="M221 91 L258 115 L239 83 Z" fill="url(#bubble-fill)" />
        </svg>
        {/* Text inside bubble */}
        <div className="absolute inset-0 flex items-center justify-center px-10 text-center" style={{ paddingBottom: "10px" }}>
          <p className="text-[13px] font-semibold leading-snug text-white/90 lg:text-[15px]" style={{ maxWidth: "260px" }}>
            {!audioUnlocked && displayed === "" && sentenceIdx === 0
              ? <span className="font-display uppercase tracking-[0.12em] text-white" style={{ textShadow: "0 0 8px rgba(255,30,30,0.9), 0 0 20px rgba(255,30,30,0.6), 0 0 40px rgba(255,30,30,0.3)" }}>შემეხები და გაიგებ ვინ ვარ!</span>
              : <>{displayed}{!fading && <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-[#00E6FF] align-middle" />}</>
            }
          </p>
        </div>
      </div>

      {/* Goderdzi STAGE — character + anchored buttons share ONE coordinate frame.
          The stage box has Goderdzi's aspect ratio, so % positions stay glued to
          him at every resolution (no width/height decoupling). */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
        style={{ width: "min(70vw, calc(70dvh * 352 / 448))", aspectRatio: "352 / 448" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={GODERDZI}
          alt="გოდერძი"
          className="h-full w-full object-contain object-bottom"
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          width={352}
          height={448}
          style={{ filter: "drop-shadow(0 0 18px rgba(0,230,255,0.3)) drop-shadow(0 0 30px rgba(236,72,153,0.2))" }}
        />
        {/* Neon ground line */}
        <span aria-hidden className="absolute bottom-0 left-1/2 h-[5px] w-[110%] -translate-x-1/2" style={{ background: "linear-gradient(to right, transparent, rgba(0,230,255,1), rgba(139,92,246,0.9), transparent)", boxShadow: "0 0 20px 8px rgba(0,230,255,0.8), 0 0 40px 12px rgba(0,230,255,0.4)", clipPath: "ellipse(50% 50% at 50% 50%)" }} />

        {/* Google button — anchored to Goderdzi's lower-left (stage-relative) */}
        <a
          href="/auth/google"
          aria-label="Google-ით შესვლა"
          onClick={() => stop()}
          className={`absolute left-[6%] top-[38%] flex flex-col items-center gap-2 transition-all duration-500 ${sentenceIdx >= 1 ? "opacity-100 pointer-events-auto animate-vanguard-float" : "opacity-0 pointer-events-none scale-75"}`}
        >
          <div className="relative">
            {/* pulse ring */}
            <span className={`absolute inset-0 rounded-full ${sentenceIdx >= 1 ? "animate-ring-pulse" : ""}`}
              style={{ background: "radial-gradient(circle, rgba(0,230,255,0.4) 0%, transparent 70%)", border: "1px solid rgba(0,230,255,0.5)" }} />
            {/* outer glow border */}
            <div className="relative rounded-full p-[1.5px]" style={{
              background: "linear-gradient(135deg, rgba(0,230,255,0.8), rgba(139,92,246,0.6))",
              boxShadow: "0 0 16px rgba(0,230,255,0.35), 0 0 32px rgba(0,230,255,0.15)",
            }}>
              <div className="grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full" style={{ background: "rgba(8,6,15,0.95)" }}>
                <svg viewBox="0 0 24 24" className="h-8 w-8">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.34v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.12z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
            </div>
          </div>
          <span className="font-display text-[10px] uppercase tracking-widest" style={{ color: "rgba(0,230,255,0.8)", textShadow: "0 0 8px rgba(0,230,255,0.4)" }}>Google</span>
        </a>

        {/* Leo button — anchored to Goderdzi's upper-right (stage-relative) */}
        <button
          type="button"
          onClick={() => { stop(); onCallLeo(); }}
          aria-label="ლეო"
          className={`absolute right-[-7%] top-[27%] flex flex-col items-center gap-2 transition-all duration-500 ${sentenceIdx >= 2 ? "opacity-100 pointer-events-auto animate-vanguard-float-b" : "opacity-0 pointer-events-none scale-75"}`}
        >
          <div className="relative">
            {/* pulse ring */}
            <span className={`absolute inset-0 rounded-full ${sentenceIdx >= 2 ? "animate-ring-pulse" : ""}`}
              style={{ background: "radial-gradient(circle, rgba(251,191,36,0.35) 0%, transparent 70%)", border: "1px solid rgba(251,191,36,0.5)" }} />
            {/* outer glow border */}
            <div className="relative rounded-full p-[1.5px]" style={{
              background: "linear-gradient(135deg, rgba(251,191,36,0.9), rgba(168,85,247,0.6))",
              boxShadow: "0 0 16px rgba(251,191,36,0.35), 0 0 32px rgba(251,191,36,0.15)",
            }}>
              <div className="h-[4.5rem] w-[4.5rem] overflow-hidden rounded-full" style={{ background: "rgba(8,6,15,0.95)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={LEO} alt="" className="h-full w-full object-cover" decoding="async" loading="lazy"
                  style={{ objectPosition: "50% 0%", transform: "scale(2.1)", transformOrigin: "50% 0%" }} />
              </div>
            </div>
          </div>
          <span className="font-display text-[10px] uppercase tracking-widest" style={{ color: "rgba(251,191,36,0.9)", textShadow: "0 0 8px rgba(251,191,36,0.4)" }}>ლეო</span>
        </button>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────
   STATE 2 — Leo arrives, runs the guide slider
   ────────────────────────────────────────────────────────── */
function splitSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
}

function LeoGuide({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(0);
  const [sentIdx, setSentIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [bubbleFading, setBubbleFading] = useState(false);
  const [stepFading, setStepFading] = useState(false);
  const { play, stop } = useStaticAudio();
  const s = STEPS[step];
  const total = STEPS.length;
  const sentences = splitSentences(s.body);

  useEffect(() => {
    setSentIdx(0);
    setDisplayed("");
    setBubbleFading(false);
  }, [step]);

  useEffect(() => {
    const sentence = sentences[sentIdx] ?? "";
    play(LEO_AUDIO[`${s.key}-${sentIdx}`] ?? "");
    setDisplayed("");
    setBubbleFading(false);
    let i = 0;
    let tid: ReturnType<typeof setTimeout>;
    const tick = () => {
      i++;
      setDisplayed(sentence.slice(0, i));
      if (i >= sentence.length) {
        const isLast = sentIdx === sentences.length - 1;
        if (!isLast) {
          tid = setTimeout(() => {
            setBubbleFading(true);
            tid = setTimeout(() => setSentIdx((n) => n + 1), 500);
          }, 500);
        }
        return;
      }
      tid = setTimeout(tick, 40);
    };
    tid = setTimeout(tick, 40);
    return () => { clearTimeout(tid); stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentIdx, step]);

  const goTo = (i: number) => {
    setStepFading(true);
    setTimeout(() => { setStep(i); setStepFading(false); }, 300);
  };
  const next = () => { if (step < total - 1) goTo(step + 1); };
  const back = () => { if (step > 0) goTo(step - 1); };
  const isLast = step === total - 1;
  const currentSentence = sentences[sentIdx] ?? "";
  const typing = displayed.length < currentSentence.length;

  const gCut = "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)";

  return (
    <section className="relative z-10 mx-auto w-full h-full max-w-lg overflow-hidden lg:max-w-2xl">

      {/* Google sign-in — angular gaming button, docked under the top nav */}
      <a
        href="/auth/google"
        aria-label="Google-ით შესვლა"
        className="group absolute top-2 left-1/2 z-30 block w-[min(88vw,320px)] -translate-x-1/2 transition-transform duration-300 hover:scale-[1.02]"
      >
        <div style={{
          background: "linear-gradient(135deg, #00E6FF, #8b5cf6 60%, #ec4899)",
          padding: 1.5,
          clipPath: gCut,
          boxShadow: "0 0 20px rgba(0,230,255,0.3), 0 0 40px rgba(139,92,246,0.15)",
        }}>
          <div className="relative flex items-center justify-center gap-3 overflow-hidden px-6 py-3.5"
            style={{ background: "rgba(8,6,15,0.96)", clipPath: gCut }}>
            {/* sweeping laser on hover */}
            <span aria-hidden className="absolute left-0 top-0 h-[2px] w-full -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <span className="grid h-7 w-7 place-items-center rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.4)]">
              <svg viewBox="0 0 24 24" className="h-4 w-4">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.34v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.12z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </span>
            <span className="font-display text-[14px] font-bold uppercase tracking-[0.12em] text-white drop-shadow-[0_0_8px_rgba(0,230,255,0.4)]">
              Google-ით შესვლა
            </span>
            {/* corner tab */}
            <span aria-hidden className="absolute bottom-0 right-0 h-2 w-2" style={{ background: "rgba(0,230,255,0.5)", clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }} />
          </div>
        </div>
      </a>

      {/* Leo STAGE — character + speech bubble share ONE clamped frame, so the
          bubble stays glued above his head and the whole composition scales
          identically at every resolution (same trick as the Goderdzi stage). */}
      <div
        className="absolute bottom-0 left-1/2 z-0 -translate-x-1/2"
        style={{ width: "min(70vw, calc(72dvh * 1086 / 1448))", aspectRatio: "1086 / 1448" }}
      >
        {/* Comic speech bubble — glued just above Leo's head */}
        <div className={`absolute bottom-[97%] left-[calc(50%-100px)] z-20 -translate-x-1/2 transition-opacity duration-300 ${stepFading || bubbleFading ? "opacity-0" : "opacity-100"}`}
          style={{ filter: "drop-shadow(0 0 22px rgba(0,230,255,0.3)) drop-shadow(0 2px 12px rgba(0,0,0,0.7))" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 115" className="w-[min(86vw,340px)]" style={{ overflow: "visible" }}>
            <defs>
              <linearGradient id="leo-bubble-border" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00E6FF" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.7" />
              </linearGradient>
              <linearGradient id="leo-bubble-fill" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0d0b1a" stopOpacity="0.97" />
                <stop offset="100%" stopColor="#08060f" stopOpacity="0.97" />
              </linearGradient>
              <linearGradient id="leo-bubble-shine" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00E6FF" stopOpacity="0.12" />
                <stop offset="60%" stopColor="#00E6FF" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Border ellipse */}
            <ellipse cx="163" cy="50" rx="163" ry="50" fill="url(#leo-bubble-border)" />
            {/* Inner fill ellipse */}
            <ellipse cx="163" cy="50" rx="160" ry="47" fill="url(#leo-bubble-fill)" />
            {/* Shine overlay */}
            <ellipse cx="163" cy="32" rx="120" ry="22" fill="url(#leo-bubble-shine)" />
            {/* Tail — pointing bottom-right */}
            <path d="M220 93 L265 118 L238 84 Z" fill="url(#leo-bubble-border)" />
            <path d="M221 91 L258 115 L239 83 Z" fill="url(#leo-bubble-fill)" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center px-10 text-center" style={{ paddingBottom: "10px" }}>
            <p className="text-[13px] font-semibold leading-snug text-white/90 lg:text-[15px]" style={{ maxWidth: "260px" }}>
              {displayed}
              {typing && !bubbleFading && (
                <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-[#00E6FF] align-middle" />
              )}
            </p>
          </div>
        </div>

        {/* Leo image — fills the stage box */}
        <div className={`absolute inset-0 transition-opacity duration-300 ${stepFading ? "opacity-0" : "opacity-100"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LEO}
            srcSet={`${LEO_MOBILE} 320w, ${LEO} 640w`}
            sizes="(max-width: 639px) 70vw, 50vw"
            alt="ლეო"
            className="h-full w-full object-contain object-bottom"
            decoding="async"
            loading="lazy"
            style={{ filter: `drop-shadow(0 0 16px ${s.accent}88) drop-shadow(0 4px 16px rgba(0,0,0,0.55))` }}
          />
          {/* Neon ground line */}
          <span aria-hidden className="absolute bottom-0 left-1/2 h-[5px] w-[110%] -translate-x-1/2" style={{ background: "linear-gradient(to right, transparent, rgba(0,230,255,1), rgba(139,92,246,0.9), transparent)", boxShadow: "0 0 20px 8px rgba(0,230,255,0.8), 0 0 40px 12px rgba(0,230,255,0.4)", clipPath: "ellipse(50% 50% at 50% 50%)" }} />
        </div>
      </div>

      {/* Bottom control bar — title + step nav, over a dark gradient */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-3 bg-gradient-to-t from-[#08060f] via-[#08060f]/85 to-transparent px-4 pb-4 pt-12">

        {/* Title */}
        {s.href ? (
          <Link
            href={s.href}
            className={`font-display text-[20px] font-black uppercase leading-tight text-center lg:text-[28px] transition-opacity hover:opacity-80 ${stepFading ? "opacity-0" : "opacity-100"}`}
            style={{ color: s.accent, textShadow: `0 0 18px ${s.accent}66` }}
          >
            {s.title}
          </Link>
        ) : (
          <h2 className={`font-display text-[20px] font-black uppercase leading-tight text-white text-center lg:text-[28px] ${stepFading ? "opacity-0" : "opacity-100"}`}>
            {s.title}
          </h2>
        )}

        {/* Nav */}
        <div className="flex w-full max-w-md items-center justify-between gap-3">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white/60 backdrop-blur-sm transition-all hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> უკან
          </button>

          <div className="flex items-center gap-1.5">
            {STEPS.map((st, i) => (
              <button
                key={st.key}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`ნაბიჯი ${i + 1}`}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === step ? 20 : 5,
                  background: i === step ? s.accent : "rgba(255,255,255,0.2)",
                  boxShadow: i === step ? `0 0 6px ${s.accent}` : "none",
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={next}
            disabled={isLast}
            className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-wider text-[#08060F] transition-transform hover:scale-105 disabled:pointer-events-none disabled:opacity-40"
            style={{ background: s.accent, boxShadow: `0 0 16px ${s.accent}66` }}
          >
            შემდეგი <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
