'use client';

import { useEffect, useRef, useState } from 'react';

// Canvas eraser/restore editor for a single building sprite.
// - Erase: clears pixels to transparent (brush).
// - Restore: paints original pixels back (brush).
// - Undo: per-stroke snapshot stack.
// - Save: writes the edited image back to its file via the API.

type Mode = 'erase' | 'restore';

export function SpriteImageEditor({
  src,
  label,
  onClose,
  onSaved,
}: {
  src: string;
  label: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const origRef = useRef<HTMLCanvasElement | null>(null); // pristine copy
  const undoRef = useRef<ImageData[]>([]);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const [mode, setMode] = useState<Mode>('erase');
  const [brush, setBrush] = useState(40);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [canUndo, setCanUndo] = useState(false);

  // Load image into both the editable canvas and a pristine offscreen copy.
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const maxSide = 1200;
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);

      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);

      const orig = document.createElement('canvas');
      orig.width = w;
      orig.height = h;
      orig.getContext('2d')!.drawImage(img, 0, 0, w, h);
      origRef.current = orig;

      setDims({ w, h });
      setLoaded(true);
    };
    img.src = `${src}?t=${src.length}`; // cache-buster keyed on src
  }, [src]);

  const toCanvasCoords = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const pushUndo = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    undoRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (undoRef.current.length > 25) undoRef.current.shift();
    setCanUndo(true);
  };

  const stamp = (x: number, y: number) => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, brush, 0, Math.PI * 2);
    ctx.clip();
    if (mode === 'erase') {
      ctx.clearRect(x - brush, y - brush, brush * 2, brush * 2);
    } else if (origRef.current) {
      ctx.clearRect(x - brush, y - brush, brush * 2, brush * 2);
      ctx.drawImage(origRef.current, 0, 0);
    }
    ctx.restore();
  };

  const strokeTo = (x: number, y: number) => {
    const l = last.current;
    if (!l) {
      stamp(x, y);
    } else {
      // interpolate for smooth strokes
      const dist = Math.hypot(x - l.x, y - l.y);
      const steps = Math.max(1, Math.floor(dist / (brush / 3)));
      for (let i = 1; i <= steps; i++) {
        stamp(l.x + ((x - l.x) * i) / steps, l.y + ((y - l.y) * i) / steps);
      }
    }
    last.current = { x, y };
  };

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    pushUndo();
    drawing.current = true;
    const { x, y } = toCanvasCoords(e);
    last.current = null;
    strokeTo(x, y);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const { x, y } = toCanvasCoords(e);
    strokeTo(x, y);
  };
  const onUp = () => {
    drawing.current = false;
    last.current = null;
  };

  const undo = () => {
    const prev = undoRef.current.pop();
    if (!prev) return;
    canvasRef.current!.getContext('2d')!.putImageData(prev, 0, 0);
    setCanUndo(undoRef.current.length > 0);
  };

  const reset = () => {
    if (!origRef.current) return;
    pushUndo();
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.clearRect(0, 0, dims.w, dims.h);
    ctx.drawImage(origRef.current, 0, 0);
  };

  const save = async () => {
    setSaving(true);
    try {
      const fmt = src.toLowerCase().includes('.webp') ? 'image/webp' : 'image/png';
      const dataUrl = canvasRef.current!.toDataURL(fmt, 0.95);
      const res = await fetch('/api/playmanager/building-image', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ src, dataUrl }),
      });
      if (res.ok) {
        onSaved();
        onClose();
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
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-black/85 p-4 backdrop-blur-md"
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="flex w-full max-w-3xl items-center justify-between">
        <span className="text-sm font-black text-emerald-300">გამოსახულების რედაქტორი · {label}</span>
        <button
          onClick={onClose}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold text-white/70 hover:bg-white/10"
        >
          ✕ დახურვა
        </button>
      </div>

      {/* checkerboard so transparency is visible */}
      <div
        className="relative max-h-[62vh] overflow-hidden rounded-xl border border-white/10"
        style={{
          backgroundImage:
            'linear-gradient(45deg,#222 25%,transparent 25%),linear-gradient(-45deg,#222 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#222 75%),linear-gradient(-45deg,transparent 75%,#222 75%)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0,0 10px,10px -10px,-10px 0',
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          className="block max-h-[62vh] w-auto touch-none"
          style={{ cursor: 'crosshair', opacity: loaded ? 1 : 0 }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/70 p-3 text-xs text-white">
        <div className="flex gap-1">
          <button
            onClick={() => setMode('erase')}
            className={`rounded-lg border px-3 py-1.5 font-black ${mode === 'erase' ? 'border-rose-400/60 bg-rose-400/20 text-rose-200' : 'border-white/10 text-white/60'}`}
          >
            🩹 წაშლა
          </button>
          <button
            onClick={() => setMode('restore')}
            className={`rounded-lg border px-3 py-1.5 font-black ${mode === 'restore' ? 'border-emerald-400/60 bg-emerald-400/20 text-emerald-200' : 'border-white/10 text-white/60'}`}
          >
            ↩ აღდგენა
          </button>
        </div>

        <label className="flex items-center gap-2">
          <span className="text-white/60">ფუნჯი</span>
          <input type="range" min={5} max={140} value={brush} onChange={(e) => setBrush(Number(e.target.value))} className="accent-emerald-400" />
          <span className="w-8 text-right font-mono">{brush}</span>
        </label>

        <button onClick={undo} disabled={!canUndo} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-bold text-white/70 hover:bg-white/10 disabled:opacity-40">
          ↶ Undo
        </button>
        <button onClick={reset} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-bold text-white/70 hover:bg-white/10">
          ⟲ ორიგინალი
        </button>
        <button onClick={save} disabled={saving || !loaded} className="rounded-lg border border-emerald-400/40 bg-emerald-400/20 px-4 py-1.5 font-black text-emerald-200 hover:bg-emerald-400/30 disabled:opacity-50">
          {saving ? 'ვინახავ…' : '💾 შენახვა'}
        </button>
      </div>
    </div>
  );
}
