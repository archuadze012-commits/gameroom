"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Renders nothing (just a space-reserving placeholder) until the wrapper
// scrolls near the viewport, then swaps in `children`. This defers the child
// island's hydration — and any work it does on mount, e.g. a fetch — off the
// initial page load, where a screenful of eager client islands otherwise piles
// long tasks onto the main thread and inflates INP. `minHeight` reserves the
// child's eventual height so the swap-in causes no layout shift (CLS).
export function DeferMount({
  children,
  minHeight,
  rootMargin = "300px",
}: {
  children: ReactNode;
  minHeight: number | string;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // No IntersectionObserver (very old browsers / SSR-less test envs): don't
    // strand the content — mount it on the next frame.
    if (typeof IntersectionObserver === "undefined") {
      const id = requestAnimationFrame(() => setShow(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} style={show ? undefined : { minHeight }}>
      {show ? children : null}
    </div>
  );
}
