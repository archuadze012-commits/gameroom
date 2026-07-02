'use client';

import { useEffect, useRef, type HTMLAttributes, type PropsWithChildren } from 'react';
import './glow-card.css';

type GlowColor = 'blue' | 'purple' | 'green' | 'red' | 'orange';

const glowColorMap: Record<GlowColor, { base: number; spread: number }> = {
  blue: { base: 205, spread: 28 },
  purple: { base: 276, spread: 18 },
  green: { base: 150, spread: 20 },
  red: { base: 8, spread: 18 },
  orange: { base: 38, spread: 18 },
};

type GlowCardProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & {
    glowColor?: GlowColor;
    radius?: number;
  }
>;

export function GlowCard({
  children,
  className = '',
  glowColor = 'orange',
  radius = 20,
  ...props
}: GlowCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const { base, spread } = glowColorMap[glowColor];
    node.style.setProperty('--base', `${base}`);
    node.style.setProperty('--spread', `${spread}`);
    node.style.setProperty('--radius', `${radius}px`);

    const updatePointer = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      const x = `${event.clientX - rect.left}px`;
      const y = `${event.clientY - rect.top}px`;
      node.style.setProperty('--x', x);
      node.style.setProperty('--y', y);
    };

    const resetPointer = () => {
      node.style.setProperty('--x', '50%');
      node.style.setProperty('--y', '50%');
    };

    node.addEventListener('pointermove', updatePointer);
    node.addEventListener('pointerleave', resetPointer);
    resetPointer();

    return () => {
      node.removeEventListener('pointermove', updatePointer);
      node.removeEventListener('pointerleave', resetPointer);
    };
  }, [glowColor, radius]);

  return (
    <div ref={ref} className={`rb-glow-card ${className}`.trim()} {...props}>
      <div className="rb-glow-inner">{children}</div>
    </div>
  );
}
