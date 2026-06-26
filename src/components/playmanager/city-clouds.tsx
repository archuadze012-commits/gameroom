'use client';

import { useEffect, useRef, useState } from 'react';

// Drifting cloud layer over the iso city. Positions are in IMAGE pixels (same
// space as the building sprites) so clouds pan/zoom with the map. Movement runs
// in a single rAF loop that mutates element styles directly — no React re-render
// per frame.

const IMG_W = 3168;
const IMG_H = 1344;

type Cloud = {
  src: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;       // display width in image px
  opacity: number;
  roam: boolean;   // true → wander whole map; false → hug the edges
  retargetIn: number; // seconds until next random direction change
};

// Edge band thickness (image px). Non-roaming clouds stay within this margin.
const EDGE = 360;
// Speed range in image px per second (very slow).
const SPEED = { min: 4, max: 9 };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const randVel = () => {
  const ang = rand(0, Math.PI * 2);
  const sp = rand(SPEED.min, SPEED.max);
  return { vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp };
};

// Velocity for an edge cloud: slides ALONG its nearest edge (random sign) with a
// gentle OUTWARD bias — never a component pointing toward the centre.
const edgeVel = (x: number, y: number) => {
  const dl = x, dr = IMG_W - x, dt = y, db = IMG_H - y;
  const m = Math.min(dl, dr, dt, db);
  const sp = rand(SPEED.min, SPEED.max);
  const tang = Math.random() < 0.5 ? -1 : 1;
  const out = rand(0, 0.25); // slight push toward the border, 0..25% of speed
  if (m === dl) return { vx: -out * sp, vy: tang * sp }; // left  → drift vertically
  if (m === dr) return { vx: out * sp, vy: tang * sp };  // right → drift vertically
  if (m === dt) return { vx: tang * sp, vy: -out * sp };  // top   → drift horizontally
  return { vx: tang * sp, vy: out * sp };                 // bottom→ drift horizontally
};

// Is (x,y) within the edge margin (i.e. NOT in the central inner rect)?
const inEdgeBand = (x: number, y: number) =>
  x < EDGE || x > IMG_W - EDGE || y < EDGE || y > IMG_H - EDGE;

const roamPos = () => ({ x: rand(IMG_W * 0.2, IMG_W * 0.8), y: rand(IMG_H * 0.25, IMG_H * 0.75) });
const edgePos = () => {
  const side = Math.floor(rand(0, 4));
  if (side === 0) return { x: rand(0, IMG_W), y: rand(0, EDGE) };
  if (side === 1) return { x: rand(0, IMG_W), y: rand(IMG_H - EDGE, IMG_H) };
  if (side === 2) return { x: rand(0, EDGE), y: rand(0, IMG_H) };
  return { x: rand(IMG_W - EDGE, IMG_W), y: rand(0, IMG_H) };
};

const makeOne = (src: string, w: number, opacity: number, roam: boolean): Cloud => {
  const pos = roam ? roamPos() : edgePos();
  return {
    src,
    ...pos,
    ...(roam ? randVel() : edgeVel(pos.x, pos.y)),
    w,
    opacity,
    roam,
    retargetIn: rand(8, 18),
  };
};

// cloud3 files roam the whole map; every other file only wanders the edges.
const DEFS = [
  { src: '/playmanager/city/clouds/cloud3.webp', w: 1150, op: 0.5,  roam: true },
  { src: '/playmanager/city/clouds/cloud1.webp', w: 980,  op: 0.46, roam: false },
  { src: '/playmanager/city/clouds/cloud2.webp', w: 1040, op: 0.44, roam: false },
  { src: '/playmanager/city/clouds/cloud4.webp', w: 1000, op: 0.4,  roam: false },
];

function makeClouds(): Cloud[] {
  const out: Cloud[] = [];
  // first pass — originals
  DEFS.forEach((d) => out.push(makeOne(d.src, d.w, d.op, d.roam)));
  // second pass — duplicates; boost opacity except for the cloud3 roamer
  DEFS.forEach((d) => {
    const op = d.roam ? d.op : Math.min(0.72, d.op + 0.2);
    out.push(makeOne(d.src, d.w * rand(0.85, 1.15), op, d.roam));
  });
  return out;
}

export function CityClouds({ scaleX, scaleY }: { scaleX: number; scaleY: number }) {
  const elRefs = useRef<(HTMLImageElement | null)[]>([]);
  // Built on the client only — Math.random() in makeClouds would otherwise
  // mismatch SSR vs client and break hydration.
  const cloudsRef = useRef<Cloud[]>([]);
  const [ready, setReady] = useState(false);
  const scaleRef = useRef({ scaleX, scaleY });
  scaleRef.current = { scaleX, scaleY };

  useEffect(() => {
    cloudsRef.current = makeClouds();
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    let prev = performance.now();
    let lastSx = -1;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000); // clamp big gaps
      prev = now;
      const { scaleX: sx, scaleY: sy } = scaleRef.current;
      const scaleChanged = sx !== lastSx;
      lastSx = sx;

      cloudsRef.current.forEach((c, i) => {
        c.x += c.vx * dt;
        c.y += c.vy * dt;

        // occasional gentle direction change (edge clouds stay edge-bound)
        c.retargetIn -= dt;
        if (c.retargetIn <= 0) {
          const v = c.roam ? randVel() : edgeVel(c.x, c.y);
          // ease toward new heading rather than snapping
          c.vx = c.vx * 0.4 + v.vx * 0.6;
          c.vy = c.vy * 0.4 + v.vy * 0.6;
          c.retargetIn = rand(8, 18);
        }

        const halfW = c.w / 2;
        const halfH = (c.w * (941 / 1672)) / 2;

        if (c.roam) {
          // bounce within the full image bounds
          if (c.x < halfW) { c.x = halfW; c.vx = Math.abs(c.vx); }
          if (c.x > IMG_W - halfW) { c.x = IMG_W - halfW; c.vx = -Math.abs(c.vx); }
          if (c.y < halfH) { c.y = halfH; c.vy = Math.abs(c.vy); }
          if (c.y > IMG_H - halfH) { c.y = IMG_H - halfH; c.vy = -Math.abs(c.vy); }
        } else {
          // confine to the edge band — reflect if drifting into the centre
          if (!inEdgeBand(c.x, c.y)) {
            // push back toward nearest edge and reverse the dominant component
            const dl = c.x, dr = IMG_W - c.x, dtp = c.y, db = IMG_H - c.y;
            const m = Math.min(dl, dr, dtp, db);
            if (m === dl) c.vx = -Math.abs(c.vx);
            else if (m === dr) c.vx = Math.abs(c.vx);
            else if (m === dtp) c.vy = -Math.abs(c.vy);
            else c.vy = Math.abs(c.vy);
          }
          // keep inside image bounds too
          if (c.x < halfW) { c.x = halfW; c.vx = Math.abs(c.vx); }
          if (c.x > IMG_W - halfW) { c.x = IMG_W - halfW; c.vx = -Math.abs(c.vx); }
          if (c.y < halfH) { c.y = halfH; c.vy = Math.abs(c.vy); }
          if (c.y > IMG_H - halfH) { c.y = IMG_H - halfH; c.vy = -Math.abs(c.vy); }
        }

        const el = elRefs.current[i];
        if (el) {
          // position via GPU transform only — no layout/paint per frame
          el.style.transform = `translate3d(${(c.x - halfW) * sx}px, ${(c.y - halfH) * sy}px, 0)`;
          if (scaleChanged) el.style.width = `${c.w * sx}px`;
        }
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  if (!ready) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {cloudsRef.current.map((c, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          ref={(el) => { elRefs.current[i] = el; }}
          src={c.src}
          alt=""
          draggable={false}
          className="absolute left-0 top-0"
          style={{
            width: c.w * scaleX,
            opacity: c.opacity,
            mixBlendMode: 'screen',
            willChange: 'transform',
            transform: 'translate3d(0,0,0)',
            contain: 'layout paint',
          }}
        />
      ))}
    </div>
  );
}
