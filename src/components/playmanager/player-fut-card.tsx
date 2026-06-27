'use client';

import { memo, useId, useMemo } from 'react';
import { getSecondaryPositionsPair, normalizePlayManagerPosition } from '@/lib/playmanager/secondary-positions';
import { derivePlayerStats, type PlayerCardStatsInput } from '@/lib/playmanager/player-card-stats';
import { cn } from '@/lib/utils';

const CARD_PATH =
  'M120 398 C94 380 46 387 22 357 C10 341 10 76 10 76 C44 72 82 38 103 34 C107 49 116 55 126 55 C136 55 145 49 149 34 C156 49 166 55 176 55 C185 55 194 49 199 34 C220 38 257 72 292 76 C292 76 292 341 280 357 C256 387 207 380 180 398 C156 414 143 417 120 398 Z';

const PROXIED_CARD_IMAGE_HOSTS = new Set([
  'cdn.sofifa.net',
  'img.uefa.com',
  'sportrenders.com',
  'i.namu.wiki',
  'cdn.t3pedia.org',
  'www.mancity.com',
  'img.a.transfermarkt.technology',
  'rpmzlkjqyncusbptzics.supabase.co',
]);

function getOptimizedCardImageSrc(src: string | null | undefined) {
  const raw = src?.trim();
  if (!raw) return '/playmanager/fut_soccer_silhouette_cutout.webp';
  if (/^https?:\/\//i.test(raw)) {
    try {
      const host = new URL(raw).hostname;
      if (PROXIED_CARD_IMAGE_HOSTS.has(host)) {
        return `/api/playmanager/card-image?src=${encodeURIComponent(raw)}`;
      }
    } catch {
      return raw;
    }
  }
  return raw;
}

// ── Tier palette ──────────────────────────────────────────────────────────────
// Two premium tiers sit above gold: `black` (legend, talent 12 — black + gold-bright)
// and `red` (rising_star, talent 11 — bold red). They map to the top talent classes
// (see talent.ts); everything below keeps the classic gold/silver/bronze metals.
type Tier = 'black' | 'red' | 'gold' | 'silver' | 'bronze';

function tierFromOvr(ovr: number): Tier {
  if (ovr >= 82) return 'gold';
  if (ovr >= 72) return 'silver';
  return 'bronze';
}

function tierFromTalent(talent: number): Tier {
  if (talent >= 12) return 'black';
  if (talent === 11) return 'red';
  if (talent >= 8) return 'gold';
  if (talent >= 4) return 'silver';
  return 'bronze';
}

const PALETTE: Record<Tier, {
  outer: string; inner: string; ovrColor: string;
  bg: string; splash: string; hexFill: string; glow: string;
  svgBodyStops: [string, string, string, string];
  svgStrokeStops: [string, string, string, string];
  svgGlowStops: [string, string, string];
  svgAccent1: string;
  svgAccent2: string;
  svgLine1: string;
  svgLine2: string;
  svgBorderInner: string;
  svgBorderOuter: string;
  nameGlow: string;
}> = {
  // Legend — obsidian black base with gold-bright filigree (TOTY-style).
  black: {
    outer:    '#FDE047',
    inner:    '#161616',
    ovrColor: '#FDE047',
    bg: 'linear-gradient(150deg,#000 0%,#0b0b0b 50%,#000 100%)',
    splash: 'linear-gradient(140deg,transparent 34%,rgba(253,224,71,.08) 46%,rgba(253,224,71,.2) 58%,rgba(253,224,71,.08) 68%,transparent 82%)',
    hexFill:  '#111111',
    glow: 'drop-shadow(0 10px 22px rgba(0,0,0,.55)) drop-shadow(0 0 11px rgba(253,224,71,.32))',
    svgBodyStops: ['#0c0c0c', '#241f10', '#141414', '#000000'],
    svgStrokeStops: ['#FDE047', '#FFF8D0', '#C9A227', '#6F5210'],
    svgGlowStops: ['#FDE047', '#7E631A', '#000000'],
    svgAccent1: '#0a0a0a',
    svgAccent2: '#2a2410',
    svgLine1: '#FDE047',
    svgLine2: '#C9A227',
    svgBorderInner: '#9A7B1C',
    svgBorderOuter: '#FDE047',
    nameGlow: 'radial-gradient(ellipse at center, rgba(253,224,71,.24), rgba(253,224,71,.06) 48%, transparent 76%)',
  },
  // Rising star — bold crimson base with bright rose accents.
  red: {
    outer:    '#FF5A5A',
    inner:    '#7A1414',
    ovrColor: '#FFD2D2',
    bg: 'linear-gradient(150deg,#180505 0%,#2e0c0c 50%,#120404 100%)',
    splash: 'linear-gradient(140deg,transparent 34%,rgba(255,90,90,.08) 46%,rgba(255,90,90,.2) 58%,rgba(255,90,90,.08) 68%,transparent 82%)',
    hexFill:  '#3A0D0D',
    glow: 'drop-shadow(0 9px 20px rgba(0,0,0,.42)) drop-shadow(0 0 10px rgba(255,70,70,.32))',
    svgBodyStops: ['#2e0c0c', '#9E2626', '#4A1212', '#160505'],
    svgStrokeStops: ['#FF8A8A', '#FFE0E0', '#D43A3A', '#7A1414'],
    svgGlowStops: ['#FFB0B0', '#E24B4A', '#2e0c0c'],
    svgAccent1: '#200808',
    svgAccent2: '#A32D2D',
    svgLine1: '#FFD2D2',
    svgLine2: '#FF5A5A',
    svgBorderInner: '#A32D2D',
    svgBorderOuter: '#FFD2D2',
    nameGlow: 'radial-gradient(ellipse at center, rgba(228,75,74,.3), rgba(228,75,74,.1) 48%, transparent 76%)',
  },
  gold: {
    outer:    '#D4AF37',
    inner:    '#F6E7A1',
    ovrColor: '#FFE066',
    bg: 'linear-gradient(150deg,#16110a 0%,#2a1d0c 28%,#3b2910 54%,#20150a 78%,#0f0b06 100%)',
    splash: 'linear-gradient(140deg,transparent 34%,rgba(246,231,161,.07) 46%,rgba(212,175,55,.16) 58%,rgba(246,231,161,.08) 68%,transparent 82%)',
    hexFill:  '#8B6B1F',
    glow: 'drop-shadow(0 8px 18px rgba(0,0,0,.35)) drop-shadow(0 0 8px rgba(212,175,55,.24))',
    svgBodyStops: ['#3A280D', '#A67C24', '#5A3D12', '#1A1208'],
    svgStrokeStops: ['#F6E7A1', '#FFF8D6', '#D4AF37', '#8B6B1F'],
    svgGlowStops: ['#FFF1B8', '#D4AF37', '#3A280D'],
    svgAccent1: '#2A1B0B',
    svgAccent2: '#B88A2A',
    svgLine1: '#F6E7A1',
    svgLine2: '#D4AF37',
    svgBorderInner: '#C89B2C',
    svgBorderOuter: '#F6E7A1',
    nameGlow: 'radial-gradient(ellipse at center, rgba(212,175,55,.28), rgba(212,175,55,.08) 48%, transparent 76%)',
  },
  silver: {
    outer:    '#8BBFC8',
    inner:    '#4A8FA0',
    ovrColor: '#C8E0E8',
    bg: 'linear-gradient(150deg,#101a22 0%,#172731 42%,#10222b 68%,#09141a 100%)',
    splash: 'linear-gradient(140deg,transparent 30%,rgba(80,160,200,.07) 44%,rgba(100,180,220,.16) 58%,rgba(80,160,200,.07) 68%,transparent 80%)',
    hexFill:  '#162D38',
    glow: 'drop-shadow(0 8px 18px rgba(0,0,0,.35)) drop-shadow(0 0 7px rgba(100,190,220,.22))',
    svgBodyStops: ['#162D38', '#4A8FA0', '#162D38', '#081820'],
    svgStrokeStops: ['#8BBFC8', '#ffffff', '#5b8a96', '#3b6a76'],
    svgGlowStops: ['#C8E0E8', '#8BBFC8', '#162D38'],
    svgAccent1: '#0D1E25',
    svgAccent2: '#4A8FA0',
    svgLine1: '#C8E0E8',
    svgLine2: '#8BBFC8',
    svgBorderInner: '#4A8FA0',
    svgBorderOuter: '#C8E0E8',
    nameGlow: 'radial-gradient(ellipse at center, rgba(22,45,56,.38), rgba(22,45,56,.12) 48%, transparent 76%)',
  },
  bronze: {
    outer:    '#C88840',
    inner:    '#8A5520',
    ovrColor: '#E8C070',
    bg: 'linear-gradient(150deg,#1d130b 0%,#2b1b10 42%,#24160d 68%,#130a05 100%)',
    splash: 'linear-gradient(140deg,transparent 30%,rgba(200,140,40,.07) 44%,rgba(220,160,60,.16) 58%,rgba(200,140,40,.07) 68%,transparent 80%)',
    hexFill:  '#2E1A08',
    glow: 'drop-shadow(0 8px 18px rgba(0,0,0,.35)) drop-shadow(0 0 7px rgba(200,135,50,.2))',
    svgBodyStops: ['#2E1A08', '#8A5520', '#2E1A08', '#120A02'],
    svgStrokeStops: ['#C88840', '#ffffff', '#a16624', '#8A5520'],
    svgGlowStops: ['#E8C070', '#C88840', '#2E1A08'],
    svgAccent1: '#1E1005',
    svgAccent2: '#8A5520',
    svgLine1: '#E8C070',
    svgLine2: '#C88840',
    svgBorderInner: '#8A5520',
    svgBorderOuter: '#E8C070',
    nameGlow: 'radial-gradient(ellipse at center, rgba(46,26,8,.34), rgba(46,26,8,.1) 48%, transparent 76%)',
  },
};

function isGeorgianName(name: string): boolean {
  const lower = (name || '').toLowerCase().trim();
  const suffixes = [
    'shvili', 'dze', 'ia', 'ua', 'ava', 'uri', 'eli', 'aia',
    'შვილი', 'ძე', 'ია', 'უა', 'ავა', 'ური', 'ელი'
  ];
  return suffixes.some(suffix => lower.endsWith(suffix));
}

function getPlayerNationality(name: string, id: string, overrideCode?: string | null): { code: string; name: string; flagSrc?: string } {
  const codeOverride = overrideCode?.trim().toLowerCase();
  if (codeOverride && /^[a-z]{2}$/.test(codeOverride)) {
    if (codeOverride === 'en') {
      return {
        code: 'en',
        name: 'England',
        flagSrc: '/playmanager/flags/england.svg',
      };
    }
    if (codeOverride === 'ho') {
      return {
        code: 'nl',
        name: 'Netherlands',
      };
    }
    return { code: codeOverride, name: codeOverride.toUpperCase() };
  }
  if (isGeorgianName(name)) {
    return { code: 'ge', name: 'Georgia' };
  }
  
  let hash = 0;
  const str = id || name || '';
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash);
  const countries = [
    { code: 'br', name: 'Brazil' },
    { code: 'ar', name: 'Argentina' },
    { code: 'de', name: 'Germany' },
    { code: 'fr', name: 'France' },
    { code: 'es', name: 'Spain' },
    { code: 'gb', name: 'United Kingdom' },
    { code: 'pt', name: 'Portugal' },
    { code: 'it', name: 'Italy' },
    { code: 'nl', name: 'Netherlands' },
    { code: 'hr', name: 'Croatia' },
  ];
  return countries[index % countries.length] || { code: 'ge', name: 'Georgia' };
}

const LATIN_TO_GEORGIAN: Record<string, string> = {
  sh: 'შ',
  ch: 'ჩ',
  ts: 'ც',
  dz: 'ძ',
  gh: 'ღ',
  kh: 'ხ',
  j: 'ჯ',
  zh: 'ჟ',
  ph: 'ფ',
  th: 'თ',
  qu: 'კვ',
  a: 'ა',
  b: 'ბ',
  c: 'კ',
  d: 'დ',
  e: 'ე',
  f: 'ფ',
  g: 'გ',
  h: 'ჰ',
  i: 'ი',
  k: 'კ',
  l: 'ლ',
  m: 'მ',
  n: 'ნ',
  o: 'ო',
  p: 'პ',
  q: 'ქ',
  r: 'რ',
  s: 'ს',
  t: 'ტ',
  u: 'უ',
  v: 'ვ',
  w: 'ვ',
  x: 'ქს',
  y: 'ი',
  z: 'ზ',
};

function transliterateLatinToGeorgian(value: string) {
  const normalized = value
    .trim()
    // Common German surname spellings: Müller / Mueller / Muller-style ASCII forms.
    .replace(/ue/gi, 'iu')
    .replace(/oe/gi, 'io')
    .replace(/ae/gi, 'ae')
    .replace(/ü/gi, 'iu')
    .replace(/ö/gi, 'io')
    .replace(/ä/gi, 'ae')
    .replace(/ß/gi, 'ss')
    .replace(/u(?=([bcdfghjklmnpqrstvwxyz])\1er$)/gi, 'iu')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  let out = '';
  for (let i = 0; i < normalized.length; i += 1) {
    const two = normalized.slice(i, i + 2);
    const three = normalized.slice(i, i + 3);

    if (three === 'sch') {
      out += 'შ';
      i += 2;
      continue;
    }

    if (LATIN_TO_GEORGIAN[two]) {
      out += LATIN_TO_GEORGIAN[two];
      i += 1;
      continue;
    }

    const ch = normalized[i]!;
    if (LATIN_TO_GEORGIAN[ch]) {
      out += LATIN_TO_GEORGIAN[ch];
      continue;
    }

    if (ch === '-' || ch === '\'' || ch === '’') {
      out += ch;
      continue;
    }

    if (/\s/.test(ch)) {
      out += ' ';
    }
  }

  return out
    .replace(/([აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ])\1+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function getDisplaySurname(name: string) {
  const raw = name.trim().split(/\s+/).filter(Boolean).at(-1) ?? name.trim();
  if (!/[a-z]/i.test(raw)) {
    return raw;
  }
  const transliterated = transliterateLatinToGeorgian(raw);
  if (!transliterated) {
    return raw;
  }

  const endsWithConsonant = /[bcdfghjklmnpqrstvwxyz]$/i.test(raw);
  const alreadyEndsInVowel = /[აეიოუი]$/.test(transliterated);
  return endsWithConsonant && !alreadyEndsInVowel ? `${transliterated}ი` : transliterated;
}

interface FutCardEditorConfig {
  silWidth?: number;
  silHeight?: number;
  silX?: number;
  silY?: number;
  silOpacity?: number;
  contentY?: number;
  nameSize?: number;
  statsScale?: number;
}

export const DEFAULT_FUT_CARD_EDITOR_CONFIG: Required<FutCardEditorConfig> = {
  silWidth: 254,
  silHeight: 179,
  silX: 1,
  silY: 9,
  silOpacity: 1,
  contentY: -91,
  nameSize: 21,
  statsScale: 1,
};

type PositionStatus = 'natural' | 'secondary' | 'tertiary' | 'out-of-position';

function getPositionStatusStyles(positionStatus: PositionStatus) {
  if (positionStatus === 'natural') {
    return {
      color: '#FFFFFF',
      textShadow: '0 0 8px rgba(255,255,255,0.24), 0 2px 8px rgba(0,0,0,.7)',
    };
  }

  if (positionStatus === 'secondary') {
    return {
      color: '#FFE066',
      textShadow: '0 0 8px rgba(255,224,102,0.4), 0 2px 8px rgba(0,0,0,.7)',
    };
  }

  if (positionStatus === 'tertiary') {
    return {
      color: '#FF9F43',
      textShadow: '0 0 8px rgba(255,159,67,0.4), 0 2px 8px rgba(0,0,0,.7)',
    };
  }

  return {
    color: '#FF3E3E',
    textShadow: '0 0 8px rgba(255,62,62,0.4), 0 2px 8px rgba(0,0,0,.7)',
  };
}

function getPositionStatusOvrPenalty(positionStatus: PositionStatus) {
  if (positionStatus === 'secondary') return 1;
  if (positionStatus === 'tertiary') return 2;
  if (positionStatus === 'out-of-position') return 9;
  return 0;
}

// ── Component ─────────────────────────────────────────────────────────────────
function PlayerFutCardImpl({
  name,
  position,
  ovr,
  availability,
  talent,
  imageUrl,
  labelOverride,
  nationalityCode,
  stats,
  className,
  editorConfig,
  isOutOfPosition = false,
  positionStatus,
  showSecondaryPositions = false,
  secondaryPositions,
}: {
  name: string;
  position: string;
  ovr: number;
  role?: 'starter' | 'bench' | 'reserve';
  availability?: 'ready' | 'injured';
  talent?: number;
  imageUrl?: string | null;
  labelOverride?: string | null;
  nationalityCode?: string | null;
  stats?: PlayerCardStatsInput;
  className?: string;
  editorConfig?: FutCardEditorConfig;
  isOutOfPosition?: boolean;
  positionStatus?: PositionStatus;
  showSecondaryPositions?: boolean;
  secondaryPositions?: string[];
}) {
  const rawId = useId().replace(/:/g, '');
  const clipId = `pm-fut-clip-${rawId}`;
  const displayPosition = useMemo(() => normalizePlayManagerPosition(position), [position]);
  const resolvedPositionStatus = positionStatus ?? (isOutOfPosition ? 'out-of-position' : 'natural');
  const effectiveOvr = Math.max(1, ovr - getPositionStatusOvrPenalty(resolvedPositionStatus));

  const resolvedStats = useMemo(() => derivePlayerStats(displayPosition, effectiveOvr, stats), [displayPosition, effectiveOvr, stats]);
  const t = talent !== undefined ? tierFromTalent(talent) : tierFromOvr(effectiveOvr);
  const p = PALETTE[t];

  const displayName = useMemo(() => {
    const override = labelOverride?.trim();
    return override || getDisplaySurname(name);
  }, [labelOverride, name]);
  const nat = useMemo(() => getPlayerNationality(name, rawId, nationalityCode), [name, rawId, nationalityCode]);
  const resolvedSecondaryPositions = useMemo(() => {
    if (secondaryPositions && secondaryPositions.length > 0) {
      return secondaryPositions
        .map((item) => normalizePlayManagerPosition(item))
        .filter((item, index, source) => item !== displayPosition && source.indexOf(item) === index)
        .slice(0, 2);
    }
    return [];
  }, [displayPosition, secondaryPositions]);
  const [secPos1, secPos2] = useMemo(
    () => (resolvedSecondaryPositions.length > 0
      ? [resolvedSecondaryPositions[0] ?? '--', resolvedSecondaryPositions[1] ?? '--']
      : getSecondaryPositionsPair(displayPosition)),
    [displayPosition, resolvedSecondaryPositions],
  );
  const shouldShowSecondaryPositions = showSecondaryPositions || resolvedSecondaryPositions.length > 0;
  const layout = { ...DEFAULT_FUT_CARD_EDITOR_CONFIG, ...editorConfig };
  const positionStyles = getPositionStatusStyles(resolvedPositionStatus);

  const filter = availability === 'injured'
    ? 'drop-shadow(0 8px 16px rgba(0,0,0,.4)) drop-shadow(0 0 8px rgba(220,40,40,.32)) grayscale(.35)'
    : p.glow;

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: 250, height: 345, filter }}
    >
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 302 417" aria-hidden="true">
        <defs>
          <clipPath id={clipId}>
            <path d={CARD_PATH} />
          </clipPath>
          <linearGradient id={`${clipId}-body`} x1="24" y1="34" x2="284" y2="395" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={p.svgBodyStops[0]} />
            <stop offset="0.48" stopColor={p.svgBodyStops[1]} />
            <stop offset="0.76" stopColor={p.svgBodyStops[2]} />
            <stop offset="1" stopColor={p.svgBodyStops[3]} />
          </linearGradient>
          <linearGradient id={`${clipId}-stroke`} x1="0" y1="0" x2="302" y2="417" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={p.svgStrokeStops[0]} />
            <stop offset="0.5" stopColor={p.svgStrokeStops[1]} />
            <stop offset="0.64" stopColor={p.svgStrokeStops[2]} />
            <stop offset="1" stopColor={p.svgStrokeStops[3]} />
          </linearGradient>
          <radialGradient id={`${clipId}-glow`} cx="60%" cy="35%" r="58%">
            <stop offset="0" stopColor={p.svgGlowStops[0]} stopOpacity="0.92" />
            <stop offset="0.44" stopColor={p.svgGlowStops[1]} stopOpacity="0.52" />
            <stop offset="1" stopColor={p.svgGlowStops[2]} stopOpacity="0" />
          </radialGradient>
          <pattern id={`${clipId}-marks`} width="18" height="18" patternUnits="userSpaceOnUse">
            <path d="M5 5L9 9M9 5L5 9" stroke="rgba(0,0,0,.22)" strokeWidth="1.1" />
          </pattern>
        </defs>
        <path d={CARD_PATH} fill={p.outer} />
        <path d={CARD_PATH} transform="translate(0 0)" fill={`url(#${clipId}-stroke)`} opacity="0.95" />
        <path d={CARD_PATH} transform="translate(0 0) scale(.972 .972) translate(4.3 4.9)" fill={`url(#${clipId}-body)`} />
        <g clipPath={`url(#${clipId})`}>
          <path d="M-5 70 C82 55 104 14 126 54 C139 77 165 74 176 54 C197 15 220 56 307 70 L307 423 L-5 423 Z" fill={`url(#${clipId}-body)`} />
          <path d="M35 81 L142 196 L42 267 L-15 144 Z" fill={p.svgAccent1} opacity="0.68" />
          <path d="M132 67 L303 111 L303 196 L174 166 Z" fill={p.svgAccent2} opacity="0.72" />
          <path d="M0 0 H302 V417 H0 Z" fill={`url(#${clipId}-glow)`} opacity="0.62" />
          <path d="M0 0 H302 V417 H0 Z" fill={`url(#${clipId}-marks)`} opacity="0.1" />
          <path d="M38 139 L80 118 M42 153 L91 127 M46 167 L102 136" stroke="rgba(0,0,0,.22)" strokeWidth="4" />
          <path d="M214 56 L194 118 M229 64 L208 129 M244 73 L223 139" stroke="rgba(255,255,255,.12)" strokeWidth="5" />
          <path d="M18 78 C52 73 84 43 103 38 C111 61 141 64 149 38 C157 60 188 61 199 38 C219 43 250 72 284 78" fill="none" stroke={p.svgLine1} strokeWidth="2.4" />
          <path d="M18 78 C52 73 84 43 103 38 C111 61 141 64 149 38 C157 60 188 61 199 38 C219 43 250 72 284 78" fill="none" stroke="#ffffff" strokeWidth="1.1" opacity="0.82" />
          <path d="M120 398 C94 380 46 387 22 357" fill="none" stroke={p.svgLine2} strokeWidth="2.2" />
          <path d="M180 398 C207 380 256 387 280 357" fill="none" stroke={p.svgLine2} strokeWidth="2.2" />
        </g>
        <path d={CARD_PATH} fill="none" stroke="#ffffff" strokeWidth="1.4" opacity="0.7" />
        <path d={CARD_PATH} fill="none" stroke={p.svgBorderInner} strokeWidth="4.5" opacity="0.72" />
        <path d={CARD_PATH} fill="none" stroke={p.svgBorderOuter} strokeWidth="1.8" opacity="0.78" />
      </svg>

      <div
        className="absolute overflow-hidden"
        style={{ inset: 0, clipPath: `url(#${clipId})` }}
      >
        <div className="relative z-10 flex h-full flex-col px-7 pb-7 pt-11">

          <div className="flex items-start justify-between">
            <div>
              <p
                className="leading-none"
                style={{
                  fontSize: 30,
                  fontFamily: 'var(--font-orbitron), monospace',
                  fontWeight: 900,
                  color: positionStyles.color,
                  textShadow: positionStyles.textShadow,
                  lineHeight: 1,
                  marginTop: 26,
                }}
              >
                {effectiveOvr}
              </p>
              <p
                style={{
                  fontSize: 24,
                  fontFamily: 'var(--font-orbitron), monospace',
                  fontWeight: 900,
                  color: positionStyles.color,
                  textShadow: positionStyles.textShadow,
                  lineHeight: 1,
                  marginTop: 6,
                }}
              >
                {displayPosition}
              </p>
              {effectiveOvr >= 78 && (
                <p style={{ fontSize: 18, fontFamily: 'var(--font-orbitron)', color: 'white', marginTop: -1, lineHeight: 1 }}>
                  {effectiveOvr >= 85 ? '++' : '+'}
                </p>
              )}
            </div>

            {shouldShowSecondaryPositions ? (
              <div className="relative translate-x-6 translate-y-9" style={{ width: 54, height: 64 }}>
                <svg width="54" height="64" viewBox="0 0 54 64" className="absolute inset-0">
                  <polygon
                    points="27,2 51,15 51,49 27,62 3,49 3,15"
                    fill={p.hexFill}
                    stroke="white"
                    strokeWidth="2.2"
                  />
                  <path d="M5 32H49" stroke="white" strokeWidth="2" opacity="0.9" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                  <span style={{ fontSize: 14, fontFamily: 'var(--font-orbitron)', fontWeight: 900, color: 'white', letterSpacing: '.04em' }}>
                    {secPos1}
                  </span>
                  <span style={{ fontSize: 14, fontFamily: 'var(--font-orbitron)', fontWeight: 900, color: 'white', letterSpacing: '.04em' }}>
                    {secPos2}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div 
            className="relative flex flex-1 items-center justify-center"
            style={{ marginTop: layout.contentY }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getOptimizedCardImageSrc(imageUrl)}
              alt={displayName}
              className="object-contain" 
              style={{ 
                width: layout.silWidth, 
                height: layout.silHeight, 
                opacity: layout.silOpacity,
                transform: `translate(${layout.silX}px, ${layout.silY}px)`,
                WebkitMaskImage: imageUrl?.trim()
                  ? 'linear-gradient(to bottom, black 78%, transparent 100%)'
                  : 'linear-gradient(to bottom, black 70%, transparent 100%), linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
                WebkitMaskComposite: imageUrl?.trim() ? undefined : 'source-in',
                maskImage: imageUrl?.trim()
                  ? 'linear-gradient(to bottom, black 78%, transparent 100%)'
                  : 'linear-gradient(to bottom, black 70%, transparent 100%), linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
                maskComposite: imageUrl?.trim() ? undefined : 'intersect',
              }}
            />
          </div>

          <div className="relative text-center" style={{ marginBottom: 8 }}>
            <div className="absolute inset-x-2 -top-1 h-10 blur-md" style={{ background: p.nameGlow }} />
            {availability === 'injured' && (
              <p style={{ fontSize: 8, fontFamily: 'var(--font-orbitron)', color: '#FF6060', letterSpacing: '.15em', marginBottom: 3 }}>
                ◆ INJURED
              </p>
            )}
            <p
              className="relative"
              style={{
                fontSize: layout.nameSize,
                fontFamily: 'var(--font-alk-sanet), var(--font-orbitron), sans-serif',
                fontWeight: 900,
                color: 'white',
                letterSpacing: '0.04em',
                textShadow: '0 2px 8px rgba(0,0,0,.78)',
                lineHeight: 1.1,
              }}
            >
              {displayName}
            </p>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(6,1fr)', 
            gap: '2px',
            transform: `scale(${layout.statsScale})`,
            transformOrigin: 'top center'
          }}>
            {resolvedStats.map(({ label, value }) => (
              <div key={label} className="text-center">
                <p style={{ fontSize: 11, fontFamily: 'var(--font-orbitron)', fontWeight: 700, color: 'white', lineHeight: 1, letterSpacing: '.02em' }}>
                  {label}
                </p>
                <p style={{ fontSize: 18, fontFamily: 'var(--font-orbitron)', fontWeight: 900, color: 'white', lineHeight: 1.1, textShadow: '0 1px 4px rgba(0,0,0,.6)' }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3.5 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={nat.flagSrc ?? `https://flagcdn.com/w40/${nat.code}.png`}
              alt={nat.name}
              loading="lazy"
              decoding="async"
              className="w-7 h-4.5 rounded object-cover shadow-[0_1px_4px_rgba(0,0,0,0.55)] border border-white/10"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Memoized: the lineup renders 20–30 cards at once and selection state lives on
// the wrapping <button>, not on card props — so memo eliminates re-rendering
// every card on each click.
export const PlayerFutCard = memo(PlayerFutCardImpl);
