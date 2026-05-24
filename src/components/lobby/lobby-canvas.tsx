"use client";

import { useEffect, useRef } from "react";

type Props = {
  className?: string;
  effect?: string | null;
  color?: string | null;
};

export function LobbyCanvas({ className, effect, color }: Props) {
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

      if (effect === "fire") {
        // Fire particles — rise from character feet (center-bottom)
        const fireColors = [0xff2200, 0xff5500, 0xff8800, 0xffaa00, 0xffdd00];

        type Particle = {
          gfx: InstanceType<typeof Graphics>;
          vx: number;
          vy: number;
          life: number;
          maxLife: number;
          baseAlpha: number;
          size: number;
        };

        const particles: Particle[] = [];

        const resetParticle = (p: Particle, randomizeLife = false) => {
          const cx = app.screen.width * 0.5;
          // spread from character feet area (~bottom 30% of canvas)
          p.gfx.x = cx + (Math.random() - 0.5) * app.screen.width * 0.22;
          p.gfx.y = app.screen.height * (0.72 + Math.random() * 0.18);
          p.vx = (Math.random() - 0.5) * 0.6;
          p.vy = -(0.6 + Math.random() * 1.1);
          p.maxLife = 1.8 + Math.random() * 2.2;
          p.life = randomizeLife ? Math.random() * p.maxLife : 0;
          p.baseAlpha = 0.55 + Math.random() * 0.35;
        };

        for (let i = 0; i < 38; i++) {
          const colorHex = fireColors[Math.floor(Math.random() * fireColors.length)];
          const size = 2.5 + Math.random() * 5;
          const gfx = new Graphics();
          gfx.circle(0, 0, size).fill({ color: colorHex, alpha: 1 });
          gfx.blendMode = "add";
          const p: Particle = { gfx, vx: 0, vy: 0, life: 0, maxLife: 1, baseAlpha: 0.7, size };
          resetParticle(p, true);
          particles.push(p);
          layer.addChild(gfx);
        }

        app.ticker.add(() => {
          for (const p of particles) {
            p.life += 0.016;
            p.gfx.x += p.vx;
            p.gfx.y += p.vy;
            // flicker: sine wave alpha
            const phase = p.life / p.maxLife;
            const flicker = 0.8 + Math.sin(p.life * 18) * 0.2;
            p.gfx.alpha = Math.max(0, Math.sin(phase * Math.PI) * p.baseAlpha * flicker);
            // shrink as it rises
            p.gfx.scale.set(Math.max(0.1, 1 - phase * 0.7));
            // slight horizontal drift (heat shimmer)
            p.vx += (Math.random() - 0.5) * 0.04;
            if (p.life >= p.maxLife || p.gfx.y < app.screen.height * 0.1) {
              resetParticle(p);
            }
          }
        });

      } else {
        // Default ambient sparkles
        const sparkleColors = [0xa78bfa, 0x22d3ee, 0xf5a524, 0xff4d6d];

        type Sparkle = {
          gfx: InstanceType<typeof Graphics>;
          vx: number;
          vy: number;
          life: number;
          maxLife: number;
          alpha: number;
        };

        const sparkles: Sparkle[] = [];

        const resetSparkle = (s: Sparkle, randomizeLife = false) => {
          s.gfx.x = Math.random() * app.screen.width;
          s.gfx.y = app.screen.height * (0.2 + Math.random() * 0.62);
          s.vx = (Math.random() - 0.5) * 0.14;
          s.vy = -0.07 - Math.random() * 0.14;
          s.maxLife = 3.5 + Math.random() * 3.5;
          s.life = randomizeLife ? Math.random() * s.maxLife : 0;
          s.alpha = 0.1 + Math.random() * 0.22;
        };

        for (let i = 0; i < 18; i++) {
          const gfx = new Graphics();
          const size = 0.8 + Math.random() * 1.7;
          gfx.circle(0, 0, size).fill({ color: sparkleColors[i % sparkleColors.length], alpha: 1 });
          gfx.blendMode = "add";
          const s: Sparkle = { gfx, vx: 0, vy: 0, life: 0, maxLife: 1, alpha: 0.18 };
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
  }, [effect, color]);

  return (
    <div
      ref={hostRef}
      className={`absolute inset-0 pointer-events-none ${className ?? ""}`}
      style={{ overflow: "hidden" }}
    />
  );
}
