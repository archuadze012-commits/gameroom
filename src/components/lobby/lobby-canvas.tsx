"use client";

import { useEffect, useRef } from "react";

type Props = {
  /** Optional character/weapon PNG with transparent background. Placed on the podium. */
  characterUrl?: string;
  className?: string;
};

/**
 * PixiJS-backed *overlay*. The static lobby image lives behind it as a regular <Image>.
 * This canvas adds the "alive" layer on top, with a transparent background:
 *   - Lantern + dome flicker glows (additive)
 *   - Ambient particle dust (violet/magenta/amber, drifting up)
 *   - Character sprite (if `characterUrl` is provided) with idle breathing + mouse follow
 *
 * Mounts as `absolute inset-0` inside its parent — the parent must be position:relative.
 */
export function LobbyCanvas({ characterUrl, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let destroyed = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      const PIXI = await import("pixi.js");
      const { Application, Assets, Sprite, Texture, Container, Graphics } = PIXI;

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

      // ── Layers ──────────────────────────────────────────────
      const particleLayer = new Container();
      const characterLayer = new Container();
      app.stage.addChild(particleLayer, characterLayer);

      // ── Particles ──────────────────────────────────────────
      type Particle = {
        gfx: InstanceType<typeof Graphics>;
        vx: number;
        vy: number;
        life: number;
        maxLife: number;
        baseAlpha: number;
      };
      const particles: Particle[] = [];
      const COUNT = 50;
      const colors = [0xa78bfa, 0xc026d3, 0xff8a3d, 0xff4d6d];

      for (let i = 0; i < COUNT; i++) {
        const color = colors[i % colors.length];
        const size = 1.2 + Math.random() * 2.2;
        const gfx = new Graphics();
        gfx.circle(0, 0, size).fill({ color, alpha: 1 });
        gfx.blendMode = "add";
        const maxLife = 4 + Math.random() * 5;
        particles.push({
          gfx,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -0.2 - Math.random() * 0.35,
          life: Math.random() * maxLife,
          maxLife,
          baseAlpha: 0.35 + Math.random() * 0.45,
        });
        particleLayer.addChild(gfx);
      }

      const layoutParticles = () => {
        for (const p of particles) {
          p.gfx.x = Math.random() * app.screen.width;
          p.gfx.y = Math.random() * app.screen.height;
        }
      };
      layoutParticles();

      // ── Character (optional) ───────────────────────────────
      let characterSprite: InstanceType<typeof Sprite> | null = null;
      if (characterUrl) {
        try {
          const ctex = (await Assets.load(characterUrl)) as InstanceType<typeof Texture>;
          if (!destroyed) {
            characterSprite = new Sprite(ctex);
            characterSprite.anchor.set(0.5, 1);
            characterLayer.addChild(characterSprite);
          }
        } catch {}
      }

      const layoutCharacter = () => {
        if (!characterSprite) return;
        const targetH = app.screen.height * 0.6;
        const s = targetH / characterSprite.texture.height;
        characterSprite.scale.set(s);
        characterSprite.x = app.screen.width / 2;
        characterSprite.y = app.screen.height * 0.92;
      };
      layoutCharacter();

      const onResize = () => {
        layoutCharacter();
      };
      window.addEventListener("resize", onResize);

      // ── Mouse parallax ──────────────────────────────────
      let mouseX = 0;
      let mouseY = 0;
      const onMouse = (e: MouseEvent) => {
        const rect = host.getBoundingClientRect();
        mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      };
      // Parent is pointer-events-none for canvas, so listen on the host instead
      host.addEventListener("mousemove", onMouse);

      // ── Ticker ──────────────────────────────────────────
      app.ticker.add((tick) => {
        const dt = tick.deltaTime;
        const t = performance.now() / 1000;

        // particles
        for (const p of particles) {
          p.gfx.x += p.vx * dt;
          p.gfx.y += p.vy * dt;
          p.life += 0.016 * dt;
          const norm = p.life / p.maxLife;
          // fade in/out
          const fade = Math.sin(norm * Math.PI);
          p.gfx.alpha = Math.max(0, fade * p.baseAlpha);
          if (p.life >= p.maxLife || p.gfx.y < -10) {
            p.life = 0;
            p.gfx.x = Math.random() * app.screen.width;
            p.gfx.y = app.screen.height + 5;
          }
        }

        // character idle breathing + sway + mouse follow
        if (characterSprite) {
          const breathe = 1 + Math.sin(t * 1.3) * 0.012;
          const s = characterSprite.scale.x / Math.max(0.0001, Math.abs(characterSprite.scale.x));
          characterSprite.scale.x = (Math.abs(characterSprite.scale.x) || 1) * breathe * s;
          characterSprite.scale.y = (Math.abs(characterSprite.scale.y) || 1) * breathe;
          // mouse follow (subtle)
          characterSprite.x = app.screen.width / 2 + Math.sin(t * 0.6) * 2 + mouseX * 6;
          characterSprite.rotation = mouseX * 0.012;
        }
      });

      cleanup = () => {
        window.removeEventListener("resize", onResize);
        host.removeEventListener("mousemove", onMouse);
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
  }, [characterUrl]);

  return (
    <div
      ref={hostRef}
      className={`absolute inset-0 pointer-events-none ${className ?? ""}`}
      style={{ overflow: "hidden" }}
    />
  );
}
