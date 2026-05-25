"use client";

import { useEffect, useRef } from "react";

type Props = {
  className?: string;
};

export function LobbyCanvas({ className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let destroyed = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      const PIXI = await import("pixi.js");
      const { Application, Container, Graphics } = PIXI;

      if (destroyed) return;

      const app = new Application();
      await app.init({
        resizeTo: host,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        preference: "webgl",
      });

      if (destroyed) {
        app.destroy(true, { children: true });
        return;
      }

      host.appendChild(app.canvas);
      app.canvas.style.display = "block";
      app.canvas.style.width = "100%";
      app.canvas.style.height = "100%";
      app.canvas.style.position = "absolute";
      app.canvas.style.inset = "0";
      app.canvas.style.pointerEvents = "none";

      const layer = new Container();
      app.stage.addChild(layer);

      {
        // Ambient sparkles — denser on left/right edges, faster speed
        const sparkleColors = [0xa78bfa, 0x22d3ee, 0xf5a524, 0xff4d6d];

        type Sparkle = {
          gfx: InstanceType<typeof Graphics>;
          vx: number;
          vy: number;
          life: number;
          maxLife: number;
          alpha: number;
          zone: "left" | "right" | "center";
        };

        const sparkles: Sparkle[] = [];

        const resetSparkle = (s: Sparkle, randomizeLife = false) => {
          const w = app.screen.width;
          if (s.zone === "left") {
            s.gfx.x = w * (Math.random() * 0.22);
          } else if (s.zone === "right") {
            s.gfx.x = w * (0.78 + Math.random() * 0.22);
          } else {
            s.gfx.x = w * (0.22 + Math.random() * 0.56);
          }
          s.gfx.y = app.screen.height * (0.2 + Math.random() * 0.65);
          // edges move faster and drift inward slightly
          const edgeSpeed = s.zone !== "center" ? 1.8 : 1.0;
          s.vx = (Math.random() - 0.5) * 0.28 * edgeSpeed + (s.zone === "left" ? 0.04 : s.zone === "right" ? -0.04 : 0);
          s.vy = (-0.14 - Math.random() * 0.26) * edgeSpeed;
          s.maxLife = 2.2 + Math.random() * 2.8;
          s.life = randomizeLife ? Math.random() * s.maxLife : 0;
          s.alpha = s.zone !== "center" ? 0.18 + Math.random() * 0.28 : 0.08 + Math.random() * 0.18;
        };

        // 14 edge sparkles per side, 10 center = 38 total
        const zones: Array<"left" | "right" | "center"> = [
          ...Array(14).fill("left"),
          ...Array(14).fill("right"),
          ...Array(10).fill("center"),
        ];

        for (let i = 0; i < zones.length; i++) {
          const zone = zones[i];
          const gfx = new Graphics();
          const sz = zone !== "center" ? 0.9 + Math.random() * 2.0 : 0.7 + Math.random() * 1.5;
          gfx.circle(0, 0, sz).fill({ color: sparkleColors[i % sparkleColors.length], alpha: 1 });
          gfx.blendMode = "add";
          const s: Sparkle = { gfx, vx: 0, vy: 0, life: 0, maxLife: 1, alpha: 0.18, zone };
          resetSparkle(s, true);
          sparkles.push(s);
          layer.addChild(gfx);
        }

        app.ticker.add(() => {
          for (const s of sparkles) {
            s.gfx.x += s.vx;
            s.gfx.y += s.vy;
            s.life += 0.016;
            const phase = s.life / s.maxLife;
            s.gfx.alpha = Math.max(0, Math.sin(phase * Math.PI) * s.alpha);
            s.gfx.scale.set(0.85 + Math.sin(phase * Math.PI) * 0.3);
            if (s.life >= s.maxLife || s.gfx.y < -8) {
              resetSparkle(s);
            }
          }
        });
      }

      cleanup = () => {
        app.ticker.stop();
        try { app.destroy(true, { children: true }); } catch {}
      };
    })();

    return () => {
      destroyed = true;
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={`absolute inset-0 pointer-events-none ${className ?? ""}`}
      style={{ overflow: "hidden" }}
    />
  );
}
