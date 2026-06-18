'use client';

import { useEffect, useState } from 'react';

type CupMatchCountdownProps = {
  startTime: string;
};

export function CupMatchCountdown({ startTime }: CupMatchCountdownProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const startMs = new Date(startTime).getTime();
  const diffMs = startMs - nowMs;

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  if (Number.isNaN(startMs)) {
    return <span>დრო უცნობია</span>;
  }

  if (diffMs <= 0) {
    return <span>მატჩი იწყება</span>;
  }

  const totalSeconds = Math.ceil(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <span>
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
}
