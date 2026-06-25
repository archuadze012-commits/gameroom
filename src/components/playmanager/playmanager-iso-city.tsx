'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SpriteImageEditor } from '@/components/playmanager/sprite-image-editor';

const IMG = '/playmanager/iso/environment.webp';
const IMG_W = 3168;
const IMG_H = 1344;
const RATIO = IMG_W / IMG_H;
const LAYOUT_URL = '/playmanager/city/layout.json';

// Zoom limits: 1 = exactly cover (no empty space), MAX kept modest so close-up
// detail loss isn't obvious.
const MIN_SCALE = 1;
const MAX_SCALE = 1.7;

type Tone = 'green' | 'red' | 'gold';

// A building sprite IS the clickable plot — clicking it routes to its page.
type BuildingSprite = {
  key: string;
  src: string;
  label: string;
  href: string;
  tone: Tone;
  imgX: number;
  imgY: number;
  w: number;
  h: number;
  rot: number; // degrees, clockwise
  sy: number;  // vertical scale (1 = none, <1 squashes vertically)
};

const SPRITES: BuildingSprite[] = [
  { key: 'arena',       src: '/playmanager/city/buildings/arena.webp',       label: 'არენა',           href: '/playmanager/arena?module=matchday', tone: 'gold',  imgX: 1054, imgY: 150, w: 1060, h: 900, rot: 0, sy: 1 },
  { key: 'training',    src: '/playmanager/city/buildings/training.webp',    label: 'საწვრთნელი',      href: '/playmanager/training',  tone: 'green', imgX: 500,  imgY: 620, w: 780, h: 600, rot: 0, sy: 1 },
  { key: 'medical',     src: '/playmanager/city/buildings/medical.webp',     label: 'მედცენტრი',       href: '/playmanager/medical',   tone: 'green', imgX: 2060, imgY: 310, w: 780, h: 700, rot: 0, sy: 1 },
  { key: 'trophy_hall', src: '/playmanager/city/buildings/trophy_hall.webp', label: 'თასების დარბაზი', href: '/playmanager/museum',    tone: 'gold',  imgX: 1300, imgY: 650, w: 720, h: 620, rot: 0, sy: 1 },
  { key: 'academy',     src: '/playmanager/city/buildings/academy.webp',     label: 'აკადემია',        href: '/playmanager/academy',   tone: 'green', imgX: 760,  imgY: 120, w: 820, h: 740, rot: 0, sy: 1 },
];

const TONE: Record<Tone, string> = {
  green: '52,211,153',
  red: '248,113,113',
  gold: '253,224,71',
};

// Merge saved layout (by key) onto the code defaults so new buildings still appear
// and labels/hrefs stay authoritative in code.
function mergeSprites(saved: Partial<BuildingSprite>[]): BuildingSprite[] {
  return SPRITES.map((base) => {
    const ov = saved.find((s) => s.key === base.key);
    if (!ov) return base;
    return {
      ...base,
      imgX: ov.imgX ?? base.imgX,
      imgY: ov.imgY ?? base.imgY,
      w: ov.w ?? base.w,
      h: ov.h ?? base.h,
      rot: ov.rot ?? base.rot,
      sy: ov.sy ?? base.sy,
    };
  });
}

// ── Admin Editor (dev-only) ───────────────────────────────────────────────────

function AdminEditor({
  sprites,
  selected,
  onSelect,
  onSprites,
  onSave,
  onEdit,
  saving,
  savedAt,
}: {
  sprites: BuildingSprite[];
  selected: string | null;
  onSelect: (key: string | null) => void;
  onSprites: (ss: BuildingSprite[]) => void;
  onSave: () => void;
  onEdit: (key: string) => void;
  saving: boolean;
  savedAt: number | null;
}) {
  const updateS = (key: string, field: keyof BuildingSprite, value: number) => {
    if (!Number.isFinite(value)) return;
    onSprites(sprites.map((s) => (s.key === key ? { ...s, [field]: value } : s)));
  };
  const nudgeS = (key: string, dx: number, dy: number) => {
    onSprites(sprites.map((s) => (s.key === key ? { ...s, imgX: s.imgX + dx, imgY: s.imgY + dy } : s)));
  };
  const rotateS = (key: string, delta: number) => {
    onSprites(sprites.map((s) => (s.key === key ? { ...s, rot: ((s.rot + delta) % 360 + 360) % 360 } : s)));
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

      <div className="flex max-h-[72vh] flex-col gap-3 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {sprites.map((s) => {
          const active = selected === s.key;
          return (
            <div
              key={s.key}
              className={`rounded-xl border p-2 ${active ? 'border-emerald-400/60 bg-emerald-400/10' : 'border-white/10 bg-white/5'}`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <button
                  onClick={() => onSelect(active ? null : s.key)}
                  className="flex flex-1 items-center justify-between font-black text-emerald-200"
                >
                  <span>{s.label}</span>
                  <span className="text-[9px] font-bold text-white/40">{active ? 'არჩეული' : 'მონიშვნა'}</span>
                </button>
                <button
                  onClick={() => onEdit(s.key)}
                  title="გამოსახულების რედაქტირება (erase/restore)"
                  className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[11px] hover:bg-white/15"
                >
                  ✎
                </button>
              </div>

              <div className="mb-2 flex items-center justify-center gap-1">
                <button onClick={() => nudgeS(s.key, 0, -10)} className="rounded bg-white/10 px-2 py-0.5 hover:bg-white/20">↑</button>
                <button onClick={() => nudgeS(s.key, -10, 0)} className="rounded bg-white/10 px-2 py-0.5 hover:bg-white/20">←</button>
                <button onClick={() => nudgeS(s.key, 10, 0)} className="rounded bg-white/10 px-2 py-0.5 hover:bg-white/20">→</button>
                <button onClick={() => nudgeS(s.key, 0, 10)} className="rounded bg-white/10 px-2 py-0.5 hover:bg-white/20">↓</button>
              </div>

              <div className="mb-2 flex items-center justify-center gap-1">
                <button onClick={() => rotateS(s.key, -15)} className="rounded bg-white/10 px-2 py-0.5 hover:bg-white/20" title="−15°">↺ 15°</button>
                <button onClick={() => rotateS(s.key, -1)} className="rounded bg-white/10 px-2 py-0.5 hover:bg-white/20" title="−1°">↺ 1°</button>
                <button onClick={() => updateS(s.key, 'rot', 0)} className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] hover:bg-white/20" title="reset">{Math.round(s.rot)}°</button>
                <button onClick={() => rotateS(s.key, 1)} className="rounded bg-white/10 px-2 py-0.5 hover:bg-white/20" title="+1°">↻ 1°</button>
                <button onClick={() => rotateS(s.key, 15)} className="rounded bg-white/10 px-2 py-0.5 hover:bg-white/20" title="+15°">↻ 15°</button>
              </div>

              <label className="mb-1 flex items-center justify-between gap-2 py-0.5">
                <span className="w-8 font-mono text-white/60">rot</span>
                <input type="range" min={0} max={359} value={s.rot} onChange={(e) => updateS(s.key, 'rot', Number(e.target.value))} className="flex-1 accent-emerald-400" />
                <input type="number" value={s.rot} onChange={(e) => updateS(s.key, 'rot', Number(e.target.value))} className="w-16 rounded bg-white/10 px-1 py-0.5 text-right font-mono" />
              </label>

              <label className="mb-1 flex items-center justify-between gap-2 py-0.5" title="ვერტიკალური შევიწროება">
                <span className="w-8 font-mono text-white/60">↕ sy</span>
                <input type="range" min={0.2} max={1.5} step={0.01} value={s.sy} onChange={(e) => updateS(s.key, 'sy', Number(e.target.value))} className="flex-1 accent-emerald-400" />
                <input type="number" step={0.01} value={s.sy} onChange={(e) => updateS(s.key, 'sy', Number(e.target.value))} className="w-16 rounded bg-white/10 px-1 py-0.5 text-right font-mono" />
              </label>

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
                  <input type="number" value={s[f]} onChange={(e) => updateS(s.key, f, Number(e.target.value))} className="w-16 rounded bg-white/10 px-1 py-0.5 text-right font-mono" />
                </label>
              ))}
            </div>
          );
        })}
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
  const [sprites, setSprites] = useState(SPRITES);
  const [selected, setSelected] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [imgVersion, setImgVersion] = useState(0); // bump to force-reload edited images
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const drag = useRef({ active: false, moved: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const spriteDrag = useRef<{ key: string; startX: number; startY: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    fetch(LAYOUT_URL, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.sprites)) setSprites(mergeSprites(data.sprites));
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

  // Zoom is baked into element size (not a GPU transform: scale) so images stay
  // crisp while panning/zooming — scaling a promoted layer's texture blurs it.
  const effW = baseW * transform.scale;
  const effH = effW / RATIO;
  const scaleX = effW / IMG_W;
  const scaleY = effH / IMG_H;
  const screenToImgX = 1 / scaleX;
  const screenToImgY = 1 / scaleY;

  // Keep the map covering the viewport — never let edges reveal empty space.
  const clampPan = (x: number, y: number, scale: number) => {
    const vp = viewportRef.current;
    if (!vp) return { x, y };
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const w = baseW * scale;
    const h = w / RATIO;
    const cx = w <= vw ? (vw - w) / 2 : Math.max(vw - w, Math.min(0, x));
    const cy = h <= vh ? (vh - h) / 2 : Math.max(vh - h, Math.min(0, y));
    return { x: cx, y: cy };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      originX: transform.x,
      originY: transform.y,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
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
    setTransform((t) => {
      const p = clampPan(drag.current.originX + dx, drag.current.originY + dy, t.scale);
      return { ...t, x: p.x, y: p.y };
    });
  };

  const onPointerUp = () => {
    spriteDrag.current = null;
    drag.current.active = false;
  };

  const startSpriteDrag = (e: React.PointerEvent, s: BuildingSprite) => {
    if (!adminOpen) return; // outside admin, let the click navigate / map pan
    e.stopPropagation();
    setSelected(s.key);
    spriteDrag.current = { key: s.key, startX: e.clientX, startY: e.clientY, ox: s.imgX, oy: s.imgY };
    (viewportRef.current as HTMLElement)?.setPointerCapture(e.pointerId);
  };

  const onSpriteClick = (s: BuildingSprite) => {
    if (adminOpen || drag.current.moved) return;
    router.push(s.href);
  };

  const onWheel = (e: React.WheelEvent) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setTransform((t) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale - e.deltaY * 0.0012));
      const k = next / t.scale;
      const p = clampPan(mx - (mx - t.x) * k, my - (my - t.y) * k, next);
      return { scale: next, x: p.x, y: p.y };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/playmanager/city-layout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sprites }),
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
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: effW,
          height: effH,
          transform: `translate(${Math.round(transform.x)}px, ${Math.round(transform.y)}px)`,
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
          const on = hovered === s.key;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={s.key}
              src={imgVersion ? `${s.src}?v=${imgVersion}` : s.src}
              alt={s.label}
              draggable={false}
              onPointerDown={(e) => startSpriteDrag(e, s)}
              onPointerEnter={() => setHovered(s.key)}
              onPointerLeave={() => setHovered((cur) => (cur === s.key ? null : cur))}
              onClick={() => onSpriteClick(s)}
              className="absolute transition-[filter] duration-150"
              style={{
                left: s.imgX * scaleX,
                top: s.imgY * scaleY,
                width: s.w * scaleX,
                height: s.h * scaleY,
                objectFit: 'contain',
                objectPosition: 'bottom center',
                transform: `rotate(${s.rot}deg) scaleY(${s.sy})`,
                transformOrigin: 'center bottom',
                pointerEvents: 'auto',
                cursor: adminOpen ? 'move' : 'pointer',
                outline: active ? '3px dashed rgba(52,211,153,0.9)' : 'none',
                outlineOffset: '4px',
                filter: on && !adminOpen ? `drop-shadow(0 0 26px rgba(${TONE[s.tone]},0.85))` : 'none',
              }}
            />
          );
        })}

        {/* Hover labels (non-admin) */}
        {!adminOpen &&
          sprites.map((s) => {
            if (hovered !== s.key) return null;
            const cx = (s.imgX + s.w / 2) * scaleX;
            // sit just above the building's top edge (a small gap), not far overhead
            const topY = s.imgY * scaleY + s.h * scaleY * 0.14;
            return (
              <div
                key={`lbl-${s.key}`}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl border px-3 py-1.5 text-[15px] font-black backdrop-blur-md"
                style={{
                  left: cx,
                  top: topY,
                  color: `rgb(${TONE[s.tone]})`,
                  borderColor: `rgba(${TONE[s.tone]},0.55)`,
                  background: 'rgba(2,8,5,0.86)',
                }}
              >
                {s.label}
              </div>
            );
          })}
      </div>

      <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-emerald-300/24 bg-black/46 px-3 py-2 text-[10px] font-black text-emerald-100 backdrop-blur-xl sm:left-6 sm:top-6 sm:text-[11px]">
        {adminOpen ? 'რედაქტირება · გადაათრიე შენობა' : 'გადაათრიე / zoom · დააწექი შენობას'}
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
              sprites={sprites}
              selected={selected}
              onSelect={setSelected}
              onSprites={setSprites}
              onSave={save}
              onEdit={setEditingKey}
              saving={saving}
              savedAt={savedAt}
            />
          )}

          {editingKey && (() => {
            const s = sprites.find((sp) => sp.key === editingKey);
            if (!s) return null;
            return (
              <SpriteImageEditor
                src={s.src}
                label={s.label}
                onClose={() => setEditingKey(null)}
                onSaved={() => setImgVersion((v) => v + 1)}
              />
            );
          })()}
        </>
      )}
    </div>
  );
}
