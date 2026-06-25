'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const IMG = '/playmanager/iso/environment.webp';
const IMG_W = 3168;
const IMG_H = 1344;
const RATIO = IMG_W / IMG_H;
const LAYOUT_URL = '/playmanager/city/layout.json';

type Tone = 'green' | 'red' | 'gold';

type Hotspot = {
  key: string;
  label: string;
  href: string;
  tone: Tone;
  x: number;
  y: number;
  rx: number;
  ry: number;
};

type BuildingSprite = {
  key: string;
  src: string;
  imgX: number;
  imgY: number;
  w: number;
  h: number;
};

const SPRITES: BuildingSprite[] = [
  { key: 'training', src: '/playmanager/city/buildings/training.webp', imgX: 500,  imgY: 620, w: 780, h: 600 },
  { key: 'medical',  src: '/playmanager/city/buildings/medical.webp',  imgX: 2060, imgY: 310, w: 780, h: 700 },
];

const HOTSPOTS: Hotspot[] = [
  { key: 'arena',     label: 'არენა',      href: '/playmanager/arena?module=matchday', tone: 'gold',  x: 1584, y: 612,  rx: 430, ry: 212 },
  { key: 'league',    label: 'ლიგა',       href: '/playmanager/league',     tone: 'green', x: 1647, y: 178,  rx: 205, ry: 100 },
  { key: 'academy',   label: 'აკადემია',   href: '/playmanager/academy',    tone: 'green', x: 1045, y: 270,  rx: 195, ry: 95  },
  { key: 'market',    label: 'მარკეტი',    href: '/playmanager/market',     tone: 'green', x: 2186, y: 258,  rx: 195, ry: 95  },
  { key: 'media',     label: 'მედია',      href: '/playmanager/media',      tone: 'red',   x: 572,  y: 540,  rx: 180, ry: 88  },
  { key: 'medical',   label: 'მედცენტრი',  href: '/playmanager/medical',    tone: 'green', x: 2629, y: 566,  rx: 180, ry: 88  },
  { key: 'training',  label: 'საწვრთნელი', href: '/playmanager/training',   tone: 'green', x: 888,  y: 876,  rx: 188, ry: 92  },
  { key: 'finance',   label: 'ფინანსები',  href: '/playmanager/finance',    tone: 'gold',  x: 2281, y: 862,  rx: 188, ry: 92  },
  { key: 'residence', label: 'გუნდი',      href: '/playmanager/residence',  tone: 'green', x: 1616, y: 890,  rx: 195, ry: 94  },
];

const TONE: Record<Tone, string> = {
  green: '52,211,153',
  red: '248,113,113',
  gold: '253,224,71',
};

const diamond = (h: Hotspot) =>
  `${h.x},${h.y - h.ry} ${h.x + h.rx},${h.y} ${h.x},${h.y + h.ry} ${h.x - h.rx},${h.y}`;

// Merge saved layout (by key) onto the code defaults so new buildings still appear.
function mergeSprites(saved: Partial<BuildingSprite>[]): BuildingSprite[] {
  return SPRITES.map((base) => {
    const ov = saved.find((s) => s.key === base.key);
    return ov ? { ...base, ...ov, src: base.src } : base;
  });
}
function mergeHotspots(saved: Partial<Hotspot>[]): Hotspot[] {
  return HOTSPOTS.map((base) => {
    const ov = saved.find((s) => s.key === base.key);
    return ov ? { ...base, ...ov, href: base.href, label: base.label, tone: base.tone } : base;
  });
}

// ── Admin Editor (dev-only) ───────────────────────────────────────────────────

function AdminEditor({
  hotspots,
  sprites,
  selected,
  onSelect,
  onHotspots,
  onSprites,
  onSave,
  saving,
  savedAt,
}: {
  hotspots: Hotspot[];
  sprites: BuildingSprite[];
  selected: string | null;
  onSelect: (key: string | null) => void;
  onHotspots: (hs: Hotspot[]) => void;
  onSprites: (ss: BuildingSprite[]) => void;
  onSave: () => void;
  saving: boolean;
  savedAt: number | null;
}) {
  const [tab, setTab] = useState<'sprites' | 'hotspots'>('sprites');

  const updateH = (key: string, field: keyof Hotspot, value: number) => {
    onHotspots(hotspots.map((h) => (h.key === key ? { ...h, [field]: value } : h)));
  };
  const updateS = (key: string, field: keyof BuildingSprite, value: number) => {
    onSprites(sprites.map((s) => (s.key === key ? { ...s, [field]: value } : s)));
  };
  const nudgeS = (key: string, dx: number, dy: number) => {
    onSprites(sprites.map((s) => (s.key === key ? { ...s, imgX: s.imgX + dx, imgY: s.imgY + dy } : s)));
  };

  return (
    <div
      className="pointer-events-auto absolute right-3 top-3 z-50 flex w-80 flex-col gap-2 rounded-2xl border border-emerald-400/30 bg-black/90 p-3 text-xs text-white shadow-2xl backdrop-blur-xl"
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <span className="font-black text-emerald-300 uppercase tracking-widest">Admin Editor</span>
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-lg border border-emerald-400/40 bg-emerald-400/20 px-2 py-1 text-[10px] font-black text-emerald-200 hover:bg-emerald-400/30 disabled:opacity-50"
        >
          {saving ? 'ვინახავ…' : savedAt ? '✓ შენახულია' : '💾 შენახვა'}
        </button>
      </div>

      <p className="text-[10px] leading-tight text-white/45">
        გადაათრიე შენობა პირდაპირ რუკაზე, ან გამოიყენე სლაიდერები. შენახვა წერს{' '}
        <code className="text-emerald-300/80">layout.json</code>-ში.
      </p>

      <div className="flex gap-1">
        {(['sprites', 'hotspots'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg border py-1 text-[10px] font-bold uppercase ${
              tab === t
                ? 'border-emerald-400/50 bg-emerald-400/20 text-emerald-300'
                : 'border-white/10 text-white/50 hover:text-white/80'
            }`}
          >
            {t === 'sprites' ? 'შენობები' : 'ბაქნები'}
          </button>
        ))}
      </div>

      <div className="flex max-h-[64vh] flex-col gap-3 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {tab === 'sprites'
          ? sprites.map((s) => {
              const active = selected === s.key;
              return (
                <div
                  key={s.key}
                  className={`rounded-xl border p-2 ${active ? 'border-emerald-400/60 bg-emerald-400/10' : 'border-white/10 bg-white/5'}`}
                >
                  <button
                    onClick={() => onSelect(active ? null : s.key)}
                    className="mb-1 flex w-full items-center justify-between font-black text-emerald-200"
                  >
                    <span>{s.key}</span>
                    <span className="text-[9px] font-bold text-white/40">{active ? 'არჩეული' : 'მონიშვნა'}</span>
                  </button>

                  <div className="mb-2 flex items-center justify-center gap-1">
                    <button onClick={() => nudgeS(s.key, 0, -10)} className="rounded bg-white/10 px-2 py-0.5 hover:bg-white/20">↑</button>
                    <button onClick={() => nudgeS(s.key, -10, 0)} className="rounded bg-white/10 px-2 py-0.5 hover:bg-white/20">←</button>
                    <button onClick={() => nudgeS(s.key, 10, 0)} className="rounded bg-white/10 px-2 py-0.5 hover:bg-white/20">→</button>
                    <button onClick={() => nudgeS(s.key, 0, 10)} className="rounded bg-white/10 px-2 py-0.5 hover:bg-white/20">↓</button>
                  </div>

                  {(['imgX', 'imgY', 'w', 'h'] as const).map((f) => (
                    <label key={f} className="flex items-center justify-between gap-2 py-0.5">
                      <span className="w-8 font-mono text-white/60">{f}</span>
                      <input
                        type="range"
                        min={f === 'imgX' ? -500 : f === 'imgY' ? -500 : 50}
                        max={f === 'imgX' || f === 'w' ? IMG_W : IMG_H}
                        value={s[f]}
                        onChange={(e) => updateS(s.key, f, Number(e.target.value))}
                        className="flex-1 accent-emerald-400"
                      />
                      <input
                        type="number"
                        value={s[f]}
                        onChange={(e) => updateS(s.key, f, Number(e.target.value))}
                        className="w-16 rounded bg-white/10 px-1 py-0.5 text-right font-mono"
                      />
                    </label>
                  ))}
                </div>
              );
            })
          : hotspots.map((h) => (
              <div key={h.key} className="rounded-xl border border-white/10 bg-white/5 p-2">
                <div className="mb-1 font-black text-emerald-200">{h.key}</div>
                {(['x', 'y', 'rx', 'ry'] as const).map((f) => (
                  <label key={f} className="flex items-center justify-between gap-2 py-0.5">
                    <span className="w-6 font-mono text-white/60">{f}</span>
                    <input
                      type="range"
                      min={0}
                      max={f === 'x' ? IMG_W : f === 'rx' ? 600 : f === 'y' ? IMG_H : 300}
                      value={h[f]}
                      onChange={(e) => updateH(h.key, f, Number(e.target.value))}
                      className="flex-1 accent-emerald-400"
                    />
                    <input
                      type="number"
                      value={h[f]}
                      onChange={(e) => updateH(h.key, f, Number(e.target.value))}
                      className="w-16 rounded bg-white/10 px-1 py-0.5 text-right font-mono"
                    />
                  </label>
                ))}
              </div>
            ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const IS_DEV = process.env.NODE_ENV === 'development';

export function PlayManagerIsoCity() {
  const router = useRouter();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [baseW, setBaseW] = useState(IMG_W);
  const [hovered, setHovered] = useState<string | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [hotspots, setHotspots] = useState(HOTSPOTS);
  const [sprites, setSprites] = useState(SPRITES);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const drag = useRef({ active: false, moved: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  // active sprite drag: which sprite + pointer origin + sprite origin (image px)
  const spriteDrag = useRef<{ key: string; startX: number; startY: number; ox: number; oy: number } | null>(null);

  // Load any saved layout on mount (applies to the live map for everyone).
  useEffect(() => {
    fetch(LAYOUT_URL, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        if (Array.isArray(data.sprites)) setSprites(mergeSprites(data.sprites));
        if (Array.isArray(data.hotspots)) setHotspots(mergeHotspots(data.hotspots));
      })
      .catch(() => {});
  }, []);

  const fit = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const w = Math.max(vw, vh * RATIO);
    const h = w / RATIO;
    setBaseW(w);
    setTransform({ x: (vw - w) / 2, y: (vh - h) / 2, scale: 1 });
  }, []);

  useEffect(() => {
    fit();
    const onResize = () => fit();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [fit]);

  const baseH = baseW / RATIO;
  const scaleX = baseW / IMG_W;
  const scaleY = baseH / IMG_H;
  // px-on-screen → image-px factor (accounts for pan-zoom scale + fit scale)
  const screenToImgX = 1 / (scaleX * transform.scale);
  const screenToImgY = 1 / (scaleY * transform.scale);

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      originX: transform.x,
      originY: transform.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    // sprite dragging takes priority
    if (spriteDrag.current) {
      const sd = spriteDrag.current;
      const dx = (e.clientX - sd.startX) * screenToImgX;
      const dy = (e.clientY - sd.startY) * screenToImgY;
      setSprites((arr) =>
        arr.map((s) => (s.key === sd.key ? { ...s, imgX: Math.round(sd.ox + dx), imgY: Math.round(sd.oy + dy) } : s)),
      );
      return;
    }
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true;
    setTransform((t) => ({ ...t, x: drag.current.originX + dx, y: drag.current.originY + dy }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    spriteDrag.current = null;
    drag.current.active = false;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  const startSpriteDrag = (e: React.PointerEvent, s: BuildingSprite) => {
    if (!adminOpen) return;
    e.stopPropagation();
    setSelected(s.key);
    spriteDrag.current = { key: s.key, startX: e.clientX, startY: e.clientY, ox: s.imgX, oy: s.imgY };
    (viewportRef.current as HTMLElement)?.setPointerCapture(e.pointerId);
  };

  const onWheel = (e: React.WheelEvent) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setTransform((t) => {
      const next = Math.min(3, Math.max(0.6, t.scale - e.deltaY * 0.0012));
      const k = next / t.scale;
      return { scale: next, x: mx - (mx - t.x) * k, y: my - (my - t.y) * k };
    });
  };

  const go = (h: Hotspot) => {
    if (adminOpen || drag.current.moved) return;
    router.push(h.href);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/playmanager/city-layout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sprites, hotspots }),
      });
      if (res.ok) {
        setSavedAt(Date.now());
        setTimeout(() => setSavedAt(null), 2000);
      } else {
        alert('შენახვა ვერ მოხერხდა');
      }
    } catch {
      alert('შენახვა ვერ მოხერხდა');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={viewportRef}
      className="relative h-full w-full overflow-hidden bg-[#050b08] touch-none select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
      style={{ cursor: drag.current.active ? 'grabbing' : 'grab' }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left will-change-transform"
        style={{
          width: baseW,
          height: baseH,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={IMG}
          alt="football city"
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />

        {sprites.map((s) => {
          const active = adminOpen && selected === s.key;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={s.key}
              src={s.src}
              alt={s.key}
              draggable={false}
              onPointerDown={(e) => startSpriteDrag(e, s)}
              className="absolute"
              style={{
                left: s.imgX * scaleX,
                top: s.imgY * scaleY,
                width: s.w * scaleX,
                height: s.h * scaleY,
                objectFit: 'contain',
                objectPosition: 'bottom center',
                pointerEvents: adminOpen ? 'auto' : 'none',
                cursor: adminOpen ? 'move' : 'default',
                outline: active ? '3px dashed rgba(52,211,153,0.9)' : 'none',
                outlineOffset: '4px',
              }}
            />
          );
        })}

        <svg
          viewBox={`0 0 ${IMG_W} ${IMG_H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          style={{ pointerEvents: adminOpen ? 'none' : 'auto' }}
        >
          {hotspots.map((h) => {
            const on = hovered === h.key;
            const rgb = TONE[h.tone];
            return (
              <g
                key={h.key}
                className="cursor-pointer"
                onPointerEnter={() => setHovered(h.key)}
                onPointerLeave={() => setHovered((cur) => (cur === h.key ? null : cur))}
                onClick={() => go(h)}
              >
                <polygon
                  points={diamond(h)}
                  fill={on ? `rgba(${rgb},0.18)` : 'rgba(255,255,255,0.012)'}
                  stroke={`rgba(${rgb},${on ? 0.95 : 0.34})`}
                  strokeWidth={on ? 6 : 3}
                  style={on ? { filter: `drop-shadow(0 0 18px rgba(${rgb},0.6))` } : undefined}
                />
                {on ? (
                  <g>
                    <rect
                      x={h.x - h.label.length * 17 - 16}
                      y={h.y - h.ry - 80}
                      width={h.label.length * 34 + 32}
                      height={58}
                      rx={12}
                      fill="rgba(2,8,5,0.86)"
                      stroke={`rgba(${rgb},0.6)`}
                      strokeWidth={2}
                    />
                    <text
                      x={h.x}
                      y={h.y - h.ry - 44}
                      textAnchor="middle"
                      fontSize={36}
                      fontWeight={800}
                      fill={`rgb(${rgb})`}
                    >
                      {h.label}
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}

          {/* Admin overlay: hotspot centre dots (non-interactive) */}
          {adminOpen
            ? hotspots.map((h) => (
                <circle
                  key={`dot-${h.key}`}
                  cx={h.x}
                  cy={h.y}
                  r={14}
                  fill={`rgba(${TONE[h.tone]},0.7)`}
                  stroke="white"
                  strokeWidth={3}
                />
              ))
            : null}
        </svg>
      </div>

      <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-emerald-300/24 bg-black/46 px-3 py-2 text-[10px] font-black text-emerald-100 backdrop-blur-xl sm:left-6 sm:top-6 sm:text-[11px]">
        {adminOpen ? 'რედაქტირება · გადაათრიე შენობა' : 'გადაათრიე / zoom · დააწექი ბაქანს'}
      </div>

      {IS_DEV && (
        <>
          <button
            onClick={() => {
              setAdminOpen((o) => !o);
              setSelected(null);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="pointer-events-auto absolute bottom-4 right-4 z-50 rounded-xl border border-emerald-400/40 bg-black/80 px-3 py-2 text-[10px] font-black uppercase text-emerald-300 backdrop-blur-xl hover:bg-emerald-400/20"
          >
            {adminOpen ? '✕ დახურვა' : '⚙ Admin'}
          </button>

          {adminOpen && (
            <AdminEditor
              hotspots={hotspots}
              sprites={sprites}
              selected={selected}
              onSelect={setSelected}
              onHotspots={setHotspots}
              onSprites={setSprites}
              onSave={save}
              saving={saving}
              savedAt={savedAt}
            />
          )}
        </>
      )}
    </div>
  );
}
