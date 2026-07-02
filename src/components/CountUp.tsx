import { useInView } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';

interface CountUpProps {
  to: number;
  from?: number;
  direction?: 'up' | 'down';
  delay?: number;
  duration?: number;
  className?: string;
  startWhen?: boolean;
  separator?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

export default function CountUp({
  to,
  from = 0,
  direction = 'up',
  delay = 0,
  duration = 2,
  className = '',
  startWhen = true,
  separator = '',
  onStart,
  onEnd
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const isInView = useInView(ref, { once: true, margin: '0px' });

  const getDecimalPlaces = (num: number): number => {
    const str = num.toString();
    if (str.includes('.')) {
      const decimals = str.split('.')[1];
      if (parseInt(decimals) !== 0) {
        return decimals.length;
      }
    }
    return 0;
  };

  const maxDecimals = Math.max(getDecimalPlaces(from), getDecimalPlaces(to));

  const formatValue = useCallback(
    (latest: number) => {
      const hasDecimals = maxDecimals > 0;

      const options: Intl.NumberFormatOptions = {
        useGrouping: !!separator,
        minimumFractionDigits: hasDecimals ? maxDecimals : 0,
        maximumFractionDigits: hasDecimals ? maxDecimals : 0
      };

      const formattedNumber = Intl.NumberFormat('en-US', options).format(latest);

      return separator ? formattedNumber.replace(/,/g, separator) : formattedNumber;
    },
    [maxDecimals, separator]
  );

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = formatValue(direction === 'down' ? to : from);
    }
  }, [from, to, direction, formatValue]);

  useEffect(() => {
    if (isInView && startWhen) {
      if (typeof onStart === 'function') {
        onStart();
      }

      const startValue = direction === 'down' ? to : from;
      const endValue = direction === 'down' ? from : to;
      const totalMs = Math.max(0, duration * 1000);

      const renderValue = (value: number) => {
        if (ref.current) {
          ref.current.textContent = formatValue(value);
        }
      };

      const animateFrame = (startTime: number) => {
        const step = (now: number) => {
          const elapsed = now - startTime;
          const progress = totalMs === 0 ? 1 : Math.min(1, elapsed / totalMs);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = startValue + (endValue - startValue) * eased;
          renderValue(progress >= 1 ? endValue : current);

          if (progress < 1) {
            frameRef.current = window.requestAnimationFrame(step);
            return;
          }

          frameRef.current = null;
          if (typeof onEnd === 'function') {
            onEnd();
          }
        };

        frameRef.current = window.requestAnimationFrame(step);
      };

      timeoutRef.current = window.setTimeout(() => {
        animateFrame(performance.now());
      }, delay * 1000);

      return () => {
        if (timeoutRef.current != null) {
          window.clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (frameRef.current != null) {
          window.cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
      };
    }
  }, [isInView, startWhen, direction, from, to, delay, onStart, onEnd, duration, formatValue]);

  return <span className={className} ref={ref} />;
}
