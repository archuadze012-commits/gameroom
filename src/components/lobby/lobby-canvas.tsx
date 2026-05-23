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

      const sparkleLayer = new Container();
      app.stage.addChild(sparkleLayer);

      type Sparkle = {
        gfx: InstanceType<typeof Graphics>;
        vx: number;
        vy: number;
        life: number;
        maxLife: number;
        alpha: number;
      };

      const sparkles: Sparkle[] = [];
      const colors = [0xa78bfa, 0x22d3ee, 0xf5a524, 0xff4d6d];
      const resetSparkle = (sparkle: Sparkle, randomizeLife = false) => {
        sparkle.gfx.x = Math.random() * app.screen.width;
        sparkle.gfx.y = app.screen.height * (0.2 + Math.random() * 0.62);
        sparkle.vx = (Math.random() - 0.5) * 0.14;
        sparkle.vy = -0.07 - Math.random() * 0.14;
        sparkle.maxLife = 3.5 + Math.random() * 3.5;
        sparkle.life = randomizeLife ? Math.random() * sparkle.maxLife : 0;
        sparkle.alpha = 0.1 + Math.random() * 0.22;
      };

      for (let i = 0; i < 18; i++) {
        const gfx = new Graphics();
        const size = 0.8 + Math.random() * 1.7;
        gfx.circle(0, 0, size).fill({ color: colors[i % colors.length], alpha: 1 });
        gfx.blendMode = "add";
        const sparkle: Sparkle = { gfx, vx: 0, vy: 0, life: 0, maxLife: 1, alpha: 0.18 };
        resetSparkle(sparkle, true);
        sparkles.push(sparkle);
        sparkleLayer.addChild(gfx);
      }

      app.ticker.add(() => {
        for (const sparkle of sparkles) {
          sparkle.gfx.x += sparkle.vx;
          sparkle.gfx.y += sparkle.vy;
          sparkle.life += 0.016;
          const phase = sparkle.life / sparkle.maxLife;
          sparkle.gfx.alpha = Math.max(0, Math.sin(phase * Math.PI) * sparkle.alpha);
          sparkle.gfx.scale.set(0.85 + Math.sin(phase * Math.PI) * 0.3);
          if (sparkle.life >= sparkle.maxLife || sparkle.gfx.y < -8) {
            resetSparkle(sparkle);
          }
        }
      });

      cleanup = () => {
        app.ticker.stop();
        try {
          app.destroy(true, { children: true });
        } catch {}
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
