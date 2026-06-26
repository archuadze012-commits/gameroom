'use client';

import { useEffect, useRef } from 'react';

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

// Is (x,y) within the edge margin (i.e. NOT in the central inner rect)?
const inEdgeBand = (x: number, y: number) =>
  x < EDGE || x > IMG_W - EDGE || y < EDGE || y > IMG_H - EDGE;

function makeClouds(): Cloud[] {
  return [
    // roamer — clouds3 goes anywhere
    { src: '/playmanager/city/clouds/cloud3.webp', x: IMG_W * 0.5, y: IMG_H * 0.45, ...randVel(), w: 1150, opacity: 0.5, roam: true, retargetIn: rand(8, 16) },
    // edge wanderers
    { src: '/playmanager/city/clouds/cloud1.webp', x: IMG_W * 0.18, y: IMG_H * 0.12, ...randVel(), w: 980,  opacity: 0.46, roam: false, retargetIn: rand(8, 16) },
    { src: '/playmanager/city/clouds/cloud2.webp', x: IMG_W * 0.82, y: IMG_H * 0.86, ...randVel(), w: 1040, opacity: 0.44, roam: false, retargetIn: rand(8, 16) },
    { src: '/playmanager/city/clouds/cloud4.webp', x: IMG_W * 0.88, y: IMG_H * 0.2,  ...randVel(), w: 1000, opacity: 0.4,  roam: false, retargetIn: rand(8, 16) },
  ];
}

export function CityClouds({ scaleX, scaleY }: { scaleX: number; scaleY: number }) {
  const elRefs = useRef<(HTMLImageElement | null)[]>([]);
  const cloudsRef = useRef<Cloud[]>(makeClouds());
  const scaleRef = useRef({ scaleX, scaleY });
  scaleRef.current = { scaleX, scaleY };

  useEffect(() => {
    let raf = 0;
    let prev = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000); // clamp big gaps
      prev = now;
      const { scaleX: sx, scaleY: sy } = scaleRef.current;

      cloudsRef.current.forEach((c, i) => {
        c.x += c.vx * dt;
        c.y += c.vy * dt;

        // occasional gentle direction change
        c.retargetIn -= dt;
        if (c.retargetIn <= 0) {
          const v = randVel();
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
          el.style.left = `${(c.x - halfW) * sx}px`;
          el.style.top = `${(c.y - halfH) * sy}px`;
          el.style.width = `${c.w * sx}px`;
        }
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

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
          className="absolute"
          style={{ opacity: c.opacity, mixBlendMode: 'screen', willChange: 'left, top' }}
        />
      ))}
    </div>
  );
}
