'use client';

import { memo, useId, useMemo } from 'react';
import { derivePlayerStats } from '@/lib/playmanager/player-card-stats';
import { cn } from '@/lib/utils';

const CARD_PATH =
  'M120 398 C94 380 46 387 22 357 C10 341 10 76 10 76 C44 72 82 38 103 34 C107 49 116 55 126 55 C136 55 145 49 149 34 C156 49 166 55 176 55 C185 55 194 49 199 34 C220 38 257 72 292 76 C292 76 292 341 280 357 C256 387 207 380 180 398 C156 414 143 417 120 398 Z';

// ── Tier palette ──────────────────────────────────────────────────────────────
type Tier = 'gold' | 'silver' | 'bronze';

function tierFromOvr(ovr: number): Tier {
  if (ovr >= 82) return 'gold';
  if (ovr >= 72) return 'silver';
  return 'bronze';
}

function tierFromTalent(talent: number): Tier {
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
  gold: {
    outer:    '#FF3EA5',
    inner:    '#00D4C8',
    ovrColor: '#FFE066',
    bg: 'linear-gradient(148deg,#3B0A22 0%,#60102E 28%,#540C26 50%,#093232 72%,#0A4242 100%)',
    splash: 'linear-gradient(140deg,transparent 28%,rgba(0,196,184,.10) 42%,rgba(0,220,208,.30) 56%,rgba(0,196,184,.12) 66%,transparent 78%)',
    hexFill:  '#c90057',
    glow: 'drop-shadow(0 0 22px rgba(255,40,120,.9)) drop-shadow(0 0 7px rgba(0,218,205,.55))',
    svgBodyStops: ['#c90057', '#18d8bd', '#c90057', '#9a003f'],
    svgStrokeStops: ['#ff5aa9', '#ffffff', '#26ffe0', '#ff197a'],
    svgGlowStops: ['#42ffdc', '#15d7bd', '#b9004e'],
    svgAccent1: '#a8004e',
    svgAccent2: '#2ff3d4',
    svgLine1: '#21ffe1',
    svgLine2: '#20ffe0',
    svgBorderInner: '#ff2f91',
    svgBorderOuter: '#19ffd9',
    nameGlow: 'radial-gradient(ellipse at center, rgba(198,0,84,.92), rgba(198,0,84,.45) 48%, transparent 76%)',
  },
  silver: {
    outer:    '#8BBFC8',
    inner:    '#4A8FA0',
    ovrColor: '#C8E0E8',
    bg: 'linear-gradient(148deg,#0D1E25 0%,#162D38 40%,#0D2530 60%,#081820 100%)',
    splash: 'linear-gradient(140deg,transparent 28%,rgba(80,160,200,.10) 42%,rgba(100,180,220,.25) 56%,rgba(80,160,200,.10) 66%,transparent 78%)',
    hexFill:  '#162D38',
    glow: 'drop-shadow(0 0 18px rgba(100,190,220,.75)) drop-shadow(0 0 6px rgba(70,150,180,.4))',
    svgBodyStops: ['#162D38', '#4A8FA0', '#162D38', '#081820'],
    svgStrokeStops: ['#8BBFC8', '#ffffff', '#5b8a96', '#3b6a76'],
    svgGlowStops: ['#C8E0E8', '#8BBFC8', '#162D38'],
    svgAccent1: '#0D1E25',
    svgAccent2: '#4A8FA0',
    svgLine1: '#C8E0E8',
    svgLine2: '#8BBFC8',
    svgBorderInner: '#4A8FA0',
    svgBorderOuter: '#C8E0E8',
    nameGlow: 'radial-gradient(ellipse at center, rgba(22,45,56,.92), rgba(22,45,56,.45) 48%, transparent 76%)',
  },
  bronze: {
    outer:    '#C88840',
    inner:    '#8A5520',
    ovrColor: '#E8C070',
    bg: 'linear-gradient(148deg,#1E1005 0%,#2E1A08 40%,#261508 60%,#120A02 100%)',
    splash: 'linear-gradient(140deg,transparent 28%,rgba(200,140,40,.10) 42%,rgba(220,160,60,.22) 56%,rgba(200,140,40,.10) 66%,transparent 78%)',
    hexFill:  '#2E1A08',
    glow: 'drop-shadow(0 0 16px rgba(200,135,50,.75)) drop-shadow(0 0 5px rgba(140,85,25,.4))',
    svgBodyStops: ['#2E1A08', '#8A5520', '#2E1A08', '#120A02'],
    svgStrokeStops: ['#C88840', '#ffffff', '#a16624', '#8A5520'],
    svgGlowStops: ['#E8C070', '#C88840', '#2E1A08'],
    svgAccent1: '#1E1005',
    svgAccent2: '#8A5520',
    svgLine1: '#E8C070',
    svgLine2: '#C88840',
    svgBorderInner: '#8A5520',
    svgBorderOuter: '#E8C070',
    nameGlow: 'radial-gradient(ellipse at center, rgba(46,26,8,.92), rgba(46,26,8,.45) 48%, transparent 76%)',
  },
};

function getSecondaryPositions(mainPosition: string): [string, string] {
  const pos = (mainPosition || '').toUpperCase();
  switch (pos) {
    // PUBG Mobile positions
    case 'IGL': return ['SUP', 'FRG'];
    case 'SUP': return ['IGL', 'FRG'];
    case 'ATT': return ['FRG', 'SNI'];
    case 'FRG': return ['ATT', 'SUP'];
    case 'SNI': return ['ATT', 'SUP'];
    // Football positions
    case 'ST': return ['CF', 'LW'];
    case 'CF': return ['ST', 'CAM'];
    case 'LW': return ['RW', 'LM'];
    case 'RW': return ['LW', 'RM'];
    case 'LM': return ['LW', 'CM'];
    case 'RM': return ['RW', 'CM'];
    case 'CAM': return ['CM', 'AM'];
    case 'AM': return ['CAM', 'CM'];
    case 'CM': return ['CDM', 'CAM'];
    case 'CDM': return ['CM', 'CB'];
    case 'CB': return ['RB', 'LB'];
    case 'LB': return ['LWB', 'CB'];
    case 'RB': return ['RWB', 'CB'];
    case 'GK': return ['--', '--'];
    default: return ['--', '--'];
  }
}

function isGeorgianName(name: string): boolean {
  const lower = (name || '').toLowerCase().trim();
  const suffixes = [
    'shvili', 'dze', 'ia', 'ua', 'ava', 'uri', 'eli', 'aia',
    'შვილი', 'ძე', 'ია', 'უა', 'ავა', 'ური', 'ელი'
  ];
  return suffixes.some(suffix => lower.endsWith(suffix));
}

function getPlayerNationality(name: string, id: string): { code: string; name: string } {
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

export interface FutCardEditorConfig {
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

// ── Component ─────────────────────────────────────────────────────────────────
function PlayerFutCardImpl({
  name,
  position,
  ovr,
  availability,
  talent,
  className,
  editorConfig,
}: {
  name: string;
  position: string;
  ovr: number;
  role?: 'starter' | 'bench' | 'reserve';
  availability?: 'ready' | 'injured';
  talent?: number;
  className?: string;
  editorConfig?: FutCardEditorConfig;
}) {
  const rawId = useId().replace(/:/g, '');
  const clipId = `pm-fut-clip-${rawId}`;
  const stats = useMemo(() => derivePlayerStats(position, ovr), [position, ovr]);
  const t = talent !== undefined ? tierFromTalent(talent) : tierFromOvr(ovr);
  const p = PALETTE[t];

  const displayName = useMemo(() => getDisplaySurname(name), [name]);
  const nat = useMemo(() => getPlayerNationality(name, rawId), [name, rawId]);
  const [secPos1, secPos2] = useMemo(() => getSecondaryPositions(position), [position]);
  const layout = { ...DEFAULT_FUT_CARD_EDITOR_CONFIG, ...editorConfig };

  const filter = availability === 'injured'
    ? 'drop-shadow(0 0 16px rgba(220,40,40,.85)) grayscale(.35)'
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
          <path d="M0 0 H302 V417 H0 Z" fill={`url(#${clipId}-glow)`} />
          <path d="M0 0 H302 V417 H0 Z" fill={`url(#${clipId}-marks)`} opacity="0.22" />
          <path d="M38 139 L80 118 M42 153 L91 127 M46 167 L102 136" stroke="rgba(0,0,0,.22)" strokeWidth="4" />
          <path d="M214 56 L194 118 M229 64 L208 129 M244 73 L223 139" stroke="rgba(255,255,255,.12)" strokeWidth="5" />
          <path d="M18 78 C52 73 84 43 103 38 C111 61 141 64 149 38 C157 60 188 61 199 38 C219 43 250 72 284 78" fill="none" stroke={p.svgLine1} strokeWidth="2.4" />
          <path d="M18 78 C52 73 84 43 103 38 C111 61 141 64 149 38 C157 60 188 61 199 38 C219 43 250 72 284 78" fill="none" stroke="#ffffff" strokeWidth="1.1" opacity="0.82" />
          <path d="M120 398 C94 380 46 387 22 357" fill="none" stroke={p.svgLine2} strokeWidth="2.2" />
          <path d="M180 398 C207 380 256 387 280 357" fill="none" stroke={p.svgLine2} strokeWidth="2.2" />
        </g>
        <path d={CARD_PATH} fill="none" stroke="#ffffff" strokeWidth="2.2" opacity="0.9" />
        <path d={CARD_PATH} fill="none" stroke={p.svgBorderInner} strokeWidth="7" opacity="0.9" />
        <path d={CARD_PATH} fill="none" stroke={p.svgBorderOuter} strokeWidth="2.6" opacity="0.9" />
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
                  color: 'white',
                  textShadow: '0 2px 14px rgba(0,0,0,.8)',
                  lineHeight: 1,
                  marginTop: 26,
                }}
              >
                {ovr}
              </p>
              <p
                style={{
                  fontSize: 24,
                  fontFamily: 'var(--font-orbitron), monospace',
                  fontWeight: 900,
                  color: 'white',
                  textShadow: '0 2px 14px rgba(0,0,0,.8)',
                  lineHeight: 1,
                  marginTop: 6,
                }}
              >
                {position}
              </p>
              {ovr >= 78 && (
                <p style={{ fontSize: 18, fontFamily: 'var(--font-orbitron)', color: 'white', marginTop: -1, lineHeight: 1 }}>
                  {ovr >= 85 ? '++' : '+'}
                </p>
              )}
            </div>

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
          </div>

          <div 
            className="relative flex flex-1 items-center justify-center"
            style={{ marginTop: layout.contentY }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/playmanager/fut_soccer_silhouette_cutout.webp"
              alt="Player Silhouette"
              className="object-contain" 
              style={{ 
                width: layout.silWidth, 
                height: layout.silHeight, 
                opacity: layout.silOpacity,
                transform: `translate(${layout.silX}px, ${layout.silY}px)`,
                WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%), linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
                WebkitMaskComposite: 'source-in',
                maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%), linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
                maskComposite: 'intersect',
              }}
            />
          </div>

          <div className="relative text-center" style={{ marginBottom: 8 }}>
            <div className="absolute -inset-x-5 -top-5 h-16 blur-sm" style={{ background: p.nameGlow }} />
            {availability === 'injured' && (
              <p style={{ fontSize: 8, fontFamily: 'var(--font-orbitron)', color: '#FF6060', letterSpacing: '.15em', marginBottom: 3 }}>
                ◆ INJURED
              </p>
            )}
            <p
              className="relative"
              style={{
                fontSize: layout.nameSize,
                fontFamily: 'var(--font-orbitron), monospace',
                fontWeight: 900,
                color: 'white',
                letterSpacing: '0.04em',
                textShadow: '0 2px 10px rgba(0,0,0,.9), 0 0 18px rgba(255,30,110,.22)',
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
            {stats.map(({ label, value }) => (
              <div key={label} className="text-center">
                <p style={{ fontSize: 11, fontFamily: 'var(--font-orbitron)', fontWeight: 700, color: 'white', lineHeight: 1, letterSpacing: '.02em' }}>
                  {label}
                </p>
                <p style={{ fontSize: 18, fontFamily: 'var(--font-orbitron)', fontWeight: 900, color: 'white', lineHeight: 1.1, textShadow: '0 1px 6px rgba(0,0,0,.7)' }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3.5 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://flagcdn.com/w40/${nat.code}.png`}
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
