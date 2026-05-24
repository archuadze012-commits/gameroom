"use client";

import {
  type CSSProperties,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

const LOBBY_GYRO = false;
const SPARKLE_COUNT = 8;

type Sparkle = {
  id: number;
  x: number;
  y: number;
  delay: number;
  scale: number;
};

export type LobbyCharacterHandle = {
  triggerEquipFlash: () => void;
};

export type LobbyCharacterProps = {
  src: string;
  alt?: string;
  parallaxIntensity?: number;
};

export const LobbyCharacter = forwardRef<LobbyCharacterHandle, LobbyCharacterProps>(
  function LobbyCharacter({ src, alt = "", parallaxIntensity = 10 }, ref) {
    const rootRef = useRef<HTMLDivElement>(null);
    const frameRef = useRef<number | null>(null);
    const currentRef = useRef({ x: 0, y: 0 });
    const targetRef = useRef({ x: 0, y: 0 });
    const [isInspecting, setIsInspecting] = useState(false);
    const [flashKey, setFlashKey] = useState(0);
    const [flashActive, setFlashActive] = useState(false);
    const [sparkles, setSparkles] = useState<Sparkle[]>([]);

    const triggerEquipFlash = useCallback(() => {
      const nextSparkles = Array.from({ length: SPARKLE_COUNT }, (_, index) => {
        const angle = (Math.PI * 2 * index) / SPARKLE_COUNT + Math.random() * 0.28;
        const distance = 34 + Math.random() * 42;

        return {
          id: index,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - 18,
          delay: Math.random() * 80,
          scale: 0.75 + Math.random() * 0.55,
        };
      });

      setFlashKey((key) => key + 1);
      setSparkles(nextSparkles);
      setFlashActive(true);

      window.setTimeout(() => setFlashActive(false), 640);
      window.setTimeout(() => setSparkles([]), 900);
    }, []);

    useImperativeHandle(ref, () => ({ triggerEquipFlash }), [triggerEquipFlash]);

    useEffect(() => {
      const root = rootRef.current;
      if (!root) {
        return undefined;
      }

      const stage = root.closest<HTMLElement>("[data-lobby-stage]") ?? root.parentElement;
      if (!stage) {
        return undefined;
      }

      const pointerMedia = window.matchMedia("(hover: hover) and (pointer: fine)");
      const intensity = Math.min(Math.abs(parallaxIntensity), 10);

      const paint = () => {
        const current = currentRef.current;
        const target = targetRef.current;

        current.x += (target.x - current.x) * 0.08;
        current.y += (target.y - current.y) * 0.08;

        root.style.setProperty("--lobby-char-x", `${current.x.toFixed(2)}px`);
        root.style.setProperty("--lobby-char-y", `${current.y.toFixed(2)}px`);

        if (Math.abs(target.x - current.x) > 0.02 || Math.abs(target.y - current.y) > 0.02) {
          frameRef.current = window.requestAnimationFrame(paint);
          return;
        }

        frameRef.current = null;
      };

      const requestPaint = () => {
        if (frameRef.current === null) {
          frameRef.current = window.requestAnimationFrame(paint);
        }
      };

      const handlePointerMove = (event: PointerEvent) => {
        if (!pointerMedia.matches) {
          return;
        }

        const rect = stage.getBoundingClientRect();
        const centerX = (event.clientX - rect.left) / rect.width - 0.5;
        const centerY = (event.clientY - rect.top) / rect.height - 0.5;

        targetRef.current = {
          x: Math.max(-intensity, Math.min(intensity, centerX * intensity * 2)),
          y: Math.max(-intensity / 2, Math.min(intensity / 2, centerY * intensity)),
        };
        requestPaint();
      };

      const handlePointerLeave = () => {
        targetRef.current = { x: 0, y: 0 };
        requestPaint();
      };

      stage.addEventListener("pointermove", handlePointerMove);
      stage.addEventListener("pointerleave", handlePointerLeave);

      return () => {
        stage.removeEventListener("pointermove", handlePointerMove);
        stage.removeEventListener("pointerleave", handlePointerLeave);

        if (frameRef.current !== null) {
          window.cancelAnimationFrame(frameRef.current);
        }
      };
    }, [parallaxIntensity]);

    useEffect(() => {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (reducedMotion.matches) {
        return undefined;
      }

      let gestureTimer: number | undefined;
      let resetTimer: number | undefined;

      const scheduleGesture = () => {
        gestureTimer = window.setTimeout(
          () => {
            setIsInspecting(true);
            resetTimer = window.setTimeout(() => setIsInspecting(false), 1200);
            scheduleGesture();
          },
          8000 + Math.random() * 6000,
        );
      };

      scheduleGesture();

      return () => {
        window.clearTimeout(gestureTimer);
        window.clearTimeout(resetTimer);
      };
    }, []);

    return (
      <div
        ref={rootRef}
        className={[
          "lobby-character",
          isInspecting ? "lobby-char-inspect" : "",
          flashActive ? "lobby-char-equip-pulse" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        data-lobby-gyro-ready={LOBBY_GYRO ? "true" : "false"}
      >
        <div className="lobby-character-motion motion-safe:lobby-char-breathe">
          <img
            src={src}
            alt={alt}
            aria-hidden={alt ? undefined : true}
            className="lobby-character-image"
            draggable={false}
          />

          {flashActive ? <span key={`flash-${flashKey}`} className="lobby-char-flash" /> : null}

          {sparkles.map((sparkle) => (
            <span
              key={`${flashKey}-${sparkle.id}`}
              className="lobby-char-sparkle"
              style={
                {
                  "--spark-x": `${sparkle.x.toFixed(1)}px`,
                  "--spark-y": `${sparkle.y.toFixed(1)}px`,
                  "--spark-scale": sparkle.scale.toFixed(2),
                  animationDelay: `${sparkle.delay.toFixed(0)}ms`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>
    );
  },
);
