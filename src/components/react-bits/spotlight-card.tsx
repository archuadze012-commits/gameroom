'use client';

import { useRef, useState, type PropsWithChildren } from 'react';

type SpotlightCardProps = PropsWithChildren<{
  className?: string;
  spotlightColor?: string;
  fillHeight?: boolean;
}>;

export function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(80, 255, 170, 0.16)',
  fillHeight = true,
}: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  return (
    <div
      ref={divRef}
      onMouseMove={(event) => {
        if (!divRef.current || isFocused) return;
        const rect = divRef.current.getBoundingClientRect();
        setPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top });
      }}
      onFocus={() => {
        setIsFocused(true);
        setOpacity(0.7);
      }}
      onBlur={() => {
        setIsFocused(false);
        setOpacity(0);
      }}
      onMouseEnter={() => setOpacity(0.7)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden ${fillHeight ? 'h-full' : 'h-auto'} ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          opacity,
          background: `radial-gradient(circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 72%)`,
        }}
      />
      <div className={`relative ${fillHeight ? 'h-full' : 'h-auto'}`}>{children}</div>
    </div>
  );
}
