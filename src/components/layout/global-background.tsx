"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LightningWebGL, type LightningBoltState } from "@/components/layout/lightning-webgl";

type WeatherState = "clear" | "clouds" | "rain" | "storm" | "snow";

function generateBolt(x1: number, y1: number, x2: number, y2: number, depth: number, jitter = 0.4): { x: number; y: number }[] {
  if (depth <= 0) return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len;
  const ny = dx / len;
  const offset = (Math.random() - 0.5) * len * jitter;
  const mx = midX + nx * offset;
  const my = midY + ny * offset;
  const left = generateBolt(x1, y1, mx, my, depth - 1, jitter);
  const right = generateBolt(mx, my, x2, y2, depth - 1, jitter);
  return [...left, ...right.slice(1)];
}

interface Branch {
  points: { x: number; y: number }[];
  startFrac: number;
}

interface Bolt {
  points: { x: number; y: number }[];
  branches: Branch[];
  drawProgress: number;
  phase: "drawing" | "strobing";
  strobeTimer: number;
  strobeCount: number;
  maxStrobes: number;
  color: string;
  alpha: number;
  width: number;
  totalLen: number;
  segLens: number[];
  multiStrikeDelay: number; // frames before companion bolt spawns
  hue: number;     // HSV hue for the WebGL plasma visual
  xOffset: number; // horizontal position in shader space
  startTime?: number; // time when bolt animation started
}

export function GlobalBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lightningRef = useRef<LightningBoltState[]>([]);
  // Weather is hardcoded to "storm" (dynamic weather removed per user request),
  // so both the ref and the render state are simply initialised to it — no
  // mount effect needed.
  const weatherRef = useRef<WeatherState>("storm");
  const [weatherState] = useState<WeatherState>("storm");

  // The lobby renders a full-screen opaque scene on top of this background, so
  // the storm/lightning canvas is invisible there — yet on mobile *landscape*
  // it keeps animating (portrait pauses it), stacking a wasted full-screen
  // canvas + WebGL pass on top of the heavy 1920×1080 lobby render. On low-memory
  // phones that exhausts GPU memory → the tab crashes → the browser auto-reloads
  // → it crashes again (infinite reload). Skip the animated background entirely
  // on lobby routes; a static dark backdrop is all that could ever show.
  const pathname = usePathname();
  const isLobby = pathname?.endsWith("/lobby") ?? false;
  const isPlayManager = pathname?.startsWith("/playmanager") ?? false;

  useEffect(() => {
    if (isLobby) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Decorative ambient: freeze entirely for users who prefer reduced motion
    // (a11y + perf), and never animate while the tab is backgrounded. NB: this
    // now honours the real prefers-reduced-motion media query, not just portrait
    // orientation (it previously only paused in portrait, so reduced-motion
    // desktop users still paid the full 60fps canvas cost).
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const isPortrait = window.matchMedia("(orientation: portrait)").matches;
    let prefersReduced = isPortrait || reducedMotion.matches;

    // Cap the ambient loop at ~30fps. rAF fires at the display rate (usually
    // 60/120Hz); a slow storm backdrop looks identical at 30fps but halves (or
    // more) the per-second main-thread + GPU work that was competing with
    // navigation/hydration on every page.
    const FRAME_INTERVAL_MS = 1000 / 30;
    let lastFrameAt = 0;

    let animId = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;
    const bolts: Bolt[] = [];
    let cooldown = 600; // ~10s before first strike

    // screen flash
    let flashAlpha = 0;
    let flashColor = "255,255,255";

    // cloud glow
    let glowAlpha = 0;
    let glowX = 0;
    let glowY = 0;
    let glowColor = "255,255,255";
    let glowRadius = 0;

    // thunder ripple
    let rippleActive = false;
    let rippleProgress = 0;

    // pending companion bolts for double/triple strike
    const pendingStrikes: { delay: number; color: string }[] = [];

    // aurora blobs
    interface AuroraBlob {
      x: number; y: number;
      radius: number;
      color: string;
      speedX: number; speedY: number;
      phase: number; phaseSpeed: number;
      sprite: HTMLCanvasElement; // pre-baked radial gradient, drawn each frame
    }
    const auroraBlobs: AuroraBlob[] = [];
    let auroraInited = false;

    // Bake the radial-gradient blob once into an offscreen sprite so the hot loop
    // does a cheap drawImage instead of allocating a gradient every frame.
    // Per-frame opacity is applied via globalAlpha; radius via the dest size.
    function makeBlobSprite(color: string): HTMLCanvasElement {
      const s = 256;
      const spr = document.createElement("canvas");
      spr.width = s;
      spr.height = s;
      const sctx = spr.getContext("2d");
      if (sctx) {
        const grd = sctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        grd.addColorStop(0, `rgba(${color},1)`);
        grd.addColorStop(0.5, `rgba(${color},0.4)`);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        sctx.fillStyle = grd;
        sctx.fillRect(0, 0, s, s);
      }
      return spr;
    }

    // rain drops
    interface RainDrop {
      x: number; y: number;
      z: number; // depth (1 = near, 5 = far)
    }
    const rainDrops: RainDrop[] = [];
    let rainInited = false;

    // global frame counter
    let frameCount = 0;

    // procedural storm clouds
    let cloudCanvas: HTMLCanvasElement | null = null;
    let cloudOffset = 0;

    function generateClouds(cw: number, ch: number) {
      const c = document.createElement("canvas");
      c.width = cw;
      c.height = ch;
      const cctx = c.getContext("2d");
      if (!cctx) return c;
      
      cctx.filter = 'blur(60px)';
      const halfW = cw / 2;
      for (let i = 0; i < 120; i++) {
        const cx = Math.random() * halfW;
        const cy = Math.random() * (ch * 0.7) - ch * 0.1; // mostly top/middle
        const cr = 150 + Math.random() * 350;
        cctx.fillStyle = `rgba(160, 180, 255, ${0.05 + Math.random() * 0.12})`;
        
        cctx.beginPath();
        cctx.arc(cx, cy, cr, 0, Math.PI * 2);
        cctx.fill();
        
        // draw duplicate shifted by half-width for seamless looping
        cctx.beginPath();
        cctx.arc(cx + halfW, cy, cr, 0, Math.PI * 2);
        cctx.fill();
      }
      return c;
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = w + "px";
      canvas!.style.height = h + "px";
      
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      prefersReduced = isPortrait || reducedMotion.matches;
      if (prefersReduced) {
        if (animId) {
          cancelAnimationFrame(animId);
          animId = 0;
        }
        const cctx = canvas?.getContext("2d");
        if (cctx) cctx.clearRect(0, 0, canvas!.width, canvas!.height);
      } else {
        if (!animId) {
          animId = requestAnimationFrame(draw);
        }
      }
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!cloudCanvas && w > 0) {
        cloudCanvas = generateClouds(Math.max(w * 2, 2500), Math.max(h, 1000));
      }
    }

    function makeBoltGeometry(forceColor?: string) {
      const pattern = Math.floor(Math.random() * 4);
      let x1: number, y1: number, x2: number, y2: number;

      if (pattern === 0) {
        x1 = w * (0.1 + Math.random() * 0.8); y1 = -50;
        x2 = w * (0.1 + Math.random() * 0.8); y2 = h + 50;
      } else if (pattern === 1) {
        x1 = -50; y1 = h * (0.1 + Math.random() * 0.8);
        x2 = w + 50; y2 = h * (0.1 + Math.random() * 0.8);
      } else if (pattern === 2) {
        x1 = w * Math.random() * 0.3; y1 = -50;
        x2 = w * (0.7 + Math.random() * 0.3); y2 = h + 50;
      } else {
        x1 = w * (0.7 + Math.random() * 0.3); y1 = -50;
        x2 = w * Math.random() * 0.3; y2 = h + 50;
      }

      const points = generateBolt(x1, y1, x2, y2, 8, 0.45);

      const segLens: number[] = [];
      let totalLen = 0;
      for (let i = 1; i < points.length; i++) {
        const dx = points[i].x - points[i - 1].x;
        const dy = points[i].y - points[i - 1].y;
        const l = Math.sqrt(dx * dx + dy * dy);
        segLens.push(l);
        totalLen += l;
      }

      const branches: Branch[] = [];
      const branchCount = 6 + Math.floor(Math.random() * 6);
      for (let b = 0; b < branchCount; b++) {
        const startIdx = 2 + Math.floor(Math.random() * Math.max(points.length - 4, 1));
        if (startIdx >= points.length) continue;
        const sp = points[startIdx];
        const mainAngle = Math.atan2(y2 - y1, x2 - x1);
        const side = Math.random() < 0.5 ? -1 : 1;
        const brAngle = mainAngle + side * (0.4 + Math.random() * 1.0);
        const brLen = 150 + Math.random() * 250;
        const bx2 = sp.x + Math.cos(brAngle) * brLen;
        const by2 = sp.y + Math.sin(brAngle) * brLen;
        const branchPts = generateBolt(sp.x, sp.y, bx2, by2, 5, 0.35);

        let cumLen = 0;
        for (let s = 0; s < startIdx && s < segLens.length; s++) cumLen += segLens[s];
        const startFrac = totalLen > 0 ? cumLen / totalLen : 0;
        branches.push({ points: branchPts, startFrac });
      }

      const isCyan = forceColor ? forceColor === "cyan" : Math.random() < 0.3;
      const color = isCyan ? "0,200,230" : "255,30,50";
      const hue = isCyan ? 190 : 350; // plasma-bolt hue for the WebGL visual

      // trigger screen flash
      flashAlpha = 0.12;
      flashColor = isCyan ? "100,180,230" : "200,140,180";

      // trigger cloud glow around bolt midpoint
      const mid = points[Math.floor(points.length / 2)];
      glowAlpha = 0.25;
      glowX = mid.x;
      glowY = mid.y;
      glowColor = color;
      glowRadius = 250 + Math.random() * 200;

      // horizontal position for the WebGL plasma bolt (shader space, 0 = center)
      const aspect = h > 0 ? w / h : 1;
      const xOffset = -aspect * ((2 * mid.x) / Math.max(w, 1) - 1);

      // trigger thunder ripple (delayed feel)
      rippleActive = true;
      rippleProgress = 0;

      return {
        points, branches, drawProgress: 0, phase: "drawing" as const,
        strobeTimer: 0, strobeCount: 0,
        maxStrobes: 3,
        color, alpha: 0.2 + Math.random() * 0.15,
        width: 1.2 + Math.random() * 0.8,
        totalLen, segLens, multiStrikeDelay: 0,
        hue, xOffset,
      };
    }

    function spawnBolt() {
      const b = makeBoltGeometry();
      bolts.push(b);

      // double/triple strike chance (40%)
      if (Math.random() < 0.4) {
        const extraCount = Math.random() < 0.5 ? 1 : 2;
        for (let i = 0; i < extraCount; i++) {
          pendingStrikes.push({
            delay: 5 + Math.floor(Math.random() * 12), // 5-16 frames later
            color: b.color.includes("200") ? "cyan" : "red",
          });
        }
      }

    }

    function draw() {
      if (prefersReduced) return; // Completely abort if reduced motion is active
      // Throttle to ~30fps: if we're early, re-schedule without doing any work.
      const nowTs = performance.now();
      if (nowTs - lastFrameAt < FRAME_INTERVAL_MS) {
        animId = requestAnimationFrame(draw);
        return;
      }
      lastFrameAt = nowTs;
      const c = ctx!;
      c.clearRect(0, 0, w, h);
      frameCount++;
      const weather = weatherRef.current;

      // Wave canvas handles clear weather — skip this canvas entirely.
      if (weather === "clear") {
        animId = requestAnimationFrame(draw);
        return;
      }

      // === INIT AURORA BLOBS (once after first resize) ===
      if (!auroraInited && w > 0) {
        auroraInited = true;
        const colors = [
          "120,40,180",  // deep purple
          "180,30,100",  // magenta-red
          "80,20,160",   // violet
          "200,20,60",   // red aura
          "60,10,120",   // dark purple
        ];
        const blobCount = w < 768 ? 2 : 5; // Reduce aurora blobs on mobile
        for (let i = 0; i < blobCount; i++) {
          const color = colors[i % colors.length];
          auroraBlobs.push({
            x: Math.random() * w,
            y: Math.random() * h,
            radius: 200 + Math.random() * 300,
            color,
            speedX: (Math.random() - 0.5) * 0.04,
            speedY: (Math.random() - 0.5) * 0.0267,
            phase: Math.random() * Math.PI * 2,
            phaseSpeed: 0.0004 + Math.random() * 0.00053,
            sprite: makeBlobSprite(color),
          });
        }
      }

      // === AURORA DRIFT ===
      for (const blob of auroraBlobs) {
        blob.x += blob.speedX;
        blob.y += blob.speedY;
        blob.phase += blob.phaseSpeed;

        // wrap around edges with margin
        if (blob.x < -blob.radius) blob.x = w + blob.radius;
        if (blob.x > w + blob.radius) blob.x = -blob.radius;
        if (blob.y < -blob.radius) blob.y = h + blob.radius;
        if (blob.y > h + blob.radius) blob.y = -blob.radius;

        const breathe = 0.5 + Math.sin(blob.phase) * 0.5; // 0..1
        const alpha = 0.025 + breathe * 0.025; // 0.025..0.05
        const r = blob.radius * (0.9 + breathe * 0.2);

        c.globalAlpha = alpha;
        c.drawImage(blob.sprite, blob.x - r, blob.y - r, r * 2, r * 2);
        c.globalAlpha = 1;
      }

      const showAmbientEffects = true; // prefersReduced already completely aborts if portrait

      // === STORM CLOUDS (Illuminated by lightning or visible in cloudy weather) ===
      if (cloudCanvas && showAmbientEffects) {
        cloudOffset += 0.4; // pan clouds right
        const halfW = cloudCanvas.width / 2;
        if (cloudOffset >= halfW) cloudOffset = 0;
        
        let cloudIllumination = 0.05;
        if (weather === "storm") {
          cloudIllumination = 0.02 + (flashAlpha * 3.5) + (glowAlpha * 1.5);
        } else if (weather === "clouds" || weather === "rain" || weather === "snow") {
          cloudIllumination = 0.15; // static visibility
        }

        c.globalAlpha = Math.min(cloudIllumination, 0.85);
        
        c.drawImage(
          cloudCanvas, 
          cloudOffset, 0, halfW, cloudCanvas.height, 
          0, 0, w, h
        );
        
        c.globalAlpha = 1.0;
      }


      // === CLOUD GLOW (ambient illumination behind bolt) ===
      if (glowAlpha > 0.005) {
        const grd = c.createRadialGradient(glowX, glowY, 0, glowX, glowY, glowRadius);
        grd.addColorStop(0, `rgba(${glowColor},${glowAlpha * 0.6})`);
        grd.addColorStop(0.4, `rgba(${glowColor},${glowAlpha * 0.2})`);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = grd;
        c.beginPath();
        c.arc(glowX, glowY, glowRadius, 0, Math.PI * 2);
        c.fill();
        glowAlpha *= 0.96;
      }

      // === THUNDER RIPPLE === (disabled per user request)
      if (rippleActive) {
        rippleProgress += 0.012;
        if (rippleProgress >= 1) {
          rippleActive = false;
        }
      }

      // === PENDING COMPANION STRIKES (double/triple) ===
      for (let i = pendingStrikes.length - 1; i >= 0; i--) {
        pendingStrikes[i].delay--;
        if (pendingStrikes[i].delay <= 0) {
          const ps = pendingStrikes.splice(i, 1)[0];
          const companion = makeBoltGeometry(ps.color);
          bolts.push(companion);
        }
      }

      // === NO ACTIVE BOLTS: COOLDOWN ===
      if (weather === "storm" && bolts.length === 0 && pendingStrikes.length === 0) {
        cooldown--;
        if (cooldown <= 0) {
          spawnBolt();
          cooldown = 1500 + Math.floor(Math.random() * 300); // ~25-30s between strikes
        }
      }

      // === UPDATE BOLTS → feed the WebGL plasma visual ===
      // Behaviour (timing, strobing, double/triple strikes) stays here; the actual
      // bolt is now drawn by the WebGL shader via lightningRef.
      const now = Date.now();
      const lightningFrame: LightningBoltState[] = [];
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        if (!b.startTime) {
          b.startTime = now;
        }
        const elapsed = now - b.startTime;

        if (elapsed >= 1000) {
          bolts.splice(i, 1);
          continue;
        }

        let intensity: number;
        if (elapsed < 250) {
          b.phase = "drawing";
          b.drawProgress = elapsed / 250;
          intensity = b.drawProgress;
        } else {
          b.phase = "strobing";
          const strobeElapsed = elapsed - 250;
          const posInCycle = strobeElapsed % 250;
          intensity = posInCycle < 150 ? 1 : 0.14;
        }

        lightningFrame.push({ offset: b.xOffset, hue: b.hue, intensity });
      }
      lightningRef.current = lightningFrame;


      // === SCREEN FLASH (full-screen illumination on strike) ===
      if (flashAlpha > 0.003) {
        c.fillStyle = `rgba(${flashColor},${flashAlpha})`;
        c.fillRect(0, 0, w, h);
        flashAlpha *= 0.85; // fast fade
      }

      // === PRECIPITATION (Rain or Snow) ===
      if (!rainInited && w > 0) {
        rainInited = true;
        const dropCount = w < 768 ? 40 : 150; // Reduce drops heavily on mobile to save battery
        for (let i = 0; i < dropCount; i++) {
          rainDrops.push({
            x: Math.random() * w,
            y: Math.random() * h,
            z: 1 + Math.random() * 4 // depth: 1 to 5
          });
        }
      }

      if ((weather === "storm" || weather === "rain" || weather === "snow") && showAmbientEffects) {
        c.lineCap = "round";
        const isSnow = weather === "snow";
        const wind = isSnow ? -0.5 : -1.5;
        
        let currentRainAlpha = 0;
        if (weather === "storm") {
           const baseRainAlpha = 0.02;
           const rainIllumination = baseRainAlpha + (flashAlpha * 3.5) + (glowAlpha * 1.5);
           currentRainAlpha = Math.min(rainIllumination, 0.7);
        } else {
           currentRainAlpha = isSnow ? 0.4 : 0.15; // static visibility
        }

        if (currentRainAlpha > 0.005) {
          for (const drop of rainDrops) {
            const speed = (isSnow ? 3 : 25) / drop.z;
            const length = isSnow ? Math.max(2, 4 / drop.z) : (40 / drop.z);
            const thickness = isSnow ? Math.max(1.5, 4 / drop.z) : Math.max(0.6, 2.5 / drop.z);
            const dropAlpha = currentRainAlpha / drop.z;
            const dx = wind / drop.z + (isSnow ? Math.sin(frameCount * 0.02 + drop.y * 0.01) * 0.5 : 0);

            drop.y += speed;
            drop.x += dx;

            if (drop.y > h + length) {
              drop.y = -length;
              drop.x = Math.random() * w;
            }
            if (drop.x < -length) drop.x = w + length;

            const ratio = isSnow ? 1 : length / Math.max(speed, 1);
            
            c.beginPath();
            c.moveTo(drop.x, drop.y);
            c.lineTo(drop.x - dx * ratio, drop.y - length);
            c.strokeStyle = `rgba(${isSnow ? "255, 255, 255" : "180, 200, 255"}, ${dropAlpha})`;
            c.lineWidth = thickness;
            c.stroke();
          }
        }
      }

      animId = !prefersReduced ? requestAnimationFrame(draw) : 0;
    }

    const onVisibility = () => {
      if (!prefersReduced && !animId) {
        animId = requestAnimationFrame(draw);
      }
    };

    let started = false;
    const start = () => {
      started = true;
      resize();
      animId = requestAnimationFrame(draw); // render at least one frame
      window.addEventListener("resize", resize);
      document.addEventListener("visibilitychange", onVisibility);
    };

    // Defer the heavy init — the one-off cloud bake (120 blurred arcs) plus the
    // canvas sizing and the first animation frame — until the browser is idle,
    // so this decorative backdrop never competes with hydration/navigation on
    // first paint. Falls back to a short timeout where requestIdleCallback is
    // unavailable.
    let cancelStart: () => void;
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(start, { timeout: 2000 });
      cancelStart = () => window.cancelIdleCallback?.(id);
    } else {
      const id = window.setTimeout(start, 200);
      cancelStart = () => clearTimeout(id);
    }

    return () => {
      cancelStart();
      if (started) {
        cancelAnimationFrame(animId);
        window.removeEventListener("resize", resize);
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
  }, [isLobby]);

  // Lobby: static dark backdrop only — no canvas, no WebGL, no animation.
  if (isLobby) {
    return <div className="fixed inset-0 z-[-100] bg-[var(--gr-bg-0)] pointer-events-none" />;
  }

  if (isPlayManager) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[-100] overflow-hidden bg-[var(--gr-bg-0)] select-none pointer-events-none">
      <canvas ref={canvasRef} className="absolute inset-0 z-[1]" />
      <LightningWebGL boltsRef={lightningRef} active={weatherState === "storm"} />
      <div className="absolute inset-0 z-[2] bg-[linear-gradient(135deg,rgba(0,230,255,0.15)_0%,transparent_35%,transparent_65%,rgba(255,30,50,0.15)_100%)] pointer-events-none" />
    </div>
  );
}
