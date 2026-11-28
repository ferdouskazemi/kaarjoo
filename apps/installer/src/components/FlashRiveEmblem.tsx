import { motion } from 'motion/react';
import { MOTION_EASE, MOTION_SETTLE_SPRING } from '../styles/motion';

export type EmblemPhase = 'welcome' | 'installing' | 'complete' | 'error';

interface FlashRiveEmblemProps {
  phase: EmblemPhase;
  progress: number;
}

const RING_RADIUS = 56;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function FlashRiveEmblem({ phase, progress }: FlashRiveEmblemProps) {
  const clamped = Math.max(0, Math.min(100, progress));
  const dashOffset = RING_CIRCUMFERENCE * (1 - clamped / 100);

  const glowColor =
    phase === 'complete'
      ? 'rgba(63, 196, 143, 0.22)'
      : phase === 'error'
        ? 'rgba(242, 107, 94, 0.22)'
        : 'rgba(91, 147, 255, 0.20)';

  const ringStroke =
    phase === 'complete'
      ? '#3FC48F'
      : phase === 'error'
        ? '#F26B5E'
        : '#5B93FF';

  return (
    <div className="relative flex h-36 w-36 items-center justify-center select-none">
      {/* Ambient GPU radial bloom */}
      <motion.div
        className="absolute inset-0 rounded-full blur-2xl"
        animate={{
          backgroundColor: glowColor,
          scale: phase === 'installing' ? [0.95, 1.08, 0.95] : 1,
        }}
        transition={
          phase === 'installing'
            ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.45, ease: MOTION_EASE }
        }
      />

      {/* Outer orbital dashed telemetry ring (flash-rive continuous orbit) */}
      <motion.svg
        viewBox="0 0 144 144"
        className="absolute inset-0 h-full w-full"
        animate={{ rotate: phase === 'complete' ? 0 : 360 }}
        transition={{
          duration: phase === 'installing' ? 6 : 18,
          repeat: phase === 'complete' ? 0 : Infinity,
          ease: 'linear',
        }}
      >
        <circle
          cx="72"
          cy="72"
          r="66"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
          strokeDasharray="4 6"
        />
        {phase !== 'complete' && (
          <>
            <circle cx="72" cy="6" r="2.5" fill="#5B93FF" />
            <circle cx="138" cy="72" r="2" fill="#3FC48F" opacity="0.85" />
          </>
        )}
      </motion.svg>

      {/* Progress / settle ring */}
      <svg viewBox="0 0 144 144" className="relative h-full w-full -rotate-90">
        <circle
          cx="72"
          cy="72"
          r={RING_RADIUS}
          fill="rgba(21, 25, 30, 0.92)"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="4"
        />
        <motion.circle
          cx="72"
          cy="72"
          r={RING_RADIUS}
          fill="none"
          stroke={ringStroke}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          animate={{
            strokeDashoffset: phase === 'complete' ? 0 : phase === 'welcome' ? RING_CIRCUMFERENCE * 0.72 : dashOffset,
          }}
          transition={{ duration: 0.45, ease: MOTION_EASE }}
        />
      </svg>

      {/* Center vector morph stage */}
      <motion.div
        className="absolute flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-[#15191E] shadow-lg"
        animate={{
          scale: phase === 'complete' ? [0.92, 1.06, 1] : 1,
        }}
        transition={MOTION_SETTLE_SPRING}
      >
        {phase === 'complete' ? (
          <svg viewBox="0 0 36 36" className="h-9 w-9">
            <motion.path
              d="M9 18.5L15.2 24.5L27 12"
              fill="none"
              stroke="#3FC48F"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.45, ease: MOTION_EASE }}
            />
          </svg>
        ) : phase === 'error' ? (
          <svg viewBox="0 0 36 36" className="h-9 w-9">
            <motion.path
              d="M12 12L24 24M24 12L12 24"
              fill="none"
              stroke="#F26B5E"
              strokeWidth="3.2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, ease: MOTION_EASE }}
            />
          </svg>
        ) : (
          <svg viewBox="0 0 36 36" className="h-9 w-9">
            {/* Kaarjoo geometric monogram */}
            <motion.path
              d="M10 8V28M10 18L24 8M15 15L26 28"
              fill="none"
              stroke="#5B93FF"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0.2, opacity: 0.6 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.7, ease: MOTION_EASE }}
            />
            <motion.circle
              cx="26"
              cy="8"
              r="2.4"
              fill="#3FC48F"
              animate={{ scale: [1, 1.35, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </svg>
        )}
      </motion.div>
    </div>
  );
}
