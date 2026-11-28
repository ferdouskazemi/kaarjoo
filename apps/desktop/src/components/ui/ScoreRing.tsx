import React from 'react';
import { cn } from './cn.js';

export interface ScoreRingProps {
  score: number;
  size?: number;
  className?: string;
}

export const ScoreRing: React.FC<ScoreRingProps> = ({ score, size = 44, className }) => {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;

  const toneClass =
    clamped >= 75 ? 'text-success' : clamped >= 50 ? 'text-warning' : 'text-danger';

  return (
    <div
      className={cn('relative inline-flex items-center justify-center shrink-0', className)}
      style={{ width: size, height: size }}
      aria-label={`Match score ${clamped}%`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-surface-3"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className={toneClass}
        />
      </svg>
      <span className="absolute text-xs font-semibold tabular-nums text-text">{clamped}</span>
    </div>
  );
};
