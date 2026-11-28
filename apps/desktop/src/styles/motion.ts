/**
 * Flash-Rive inspired motion primitives & GPU-friendly presets for Kaarjoo v3.
 * All transitions respect <MotionConfig reducedMotion="user"> in AppShell.
 */

export const MOTION_EASE = [0.2, 0.8, 0.2, 1] as const;

export const MOTION_DURATION = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
} as const;

export const MOTION_SPRING = {
  type: 'spring' as const,
  stiffness: 340,
  damping: 28,
  mass: 0.9,
};

export const cardEnterVariants = {
  initial: { opacity: 0, y: 10, scale: 0.985 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: MOTION_DURATION.base, ease: MOTION_EASE },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.985,
    transition: { duration: MOTION_DURATION.fast, ease: MOTION_EASE },
  },
};

export const focusSwipeVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? 48 : -48,
    scale: 0.96,
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    rotate: 0,
    transition: MOTION_SPRING,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? 180 : -180,
    rotate: direction >= 0 ? 5 : -5,
    scale: 0.94,
    transition: { duration: MOTION_DURATION.base, ease: MOTION_EASE },
  }),
};

export const drawerVariants = {
  initial: { opacity: 0, y: 18, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: MOTION_DURATION.slow, ease: MOTION_EASE },
  },
  exit: {
    opacity: 0,
    y: 16,
    scale: 0.97,
    transition: { duration: MOTION_DURATION.fast, ease: MOTION_EASE },
  },
};

export const pillVariants = {
  initial: { opacity: 0, y: 16, scale: 0.9 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: MOTION_SPRING,
  },
  exit: {
    opacity: 0,
    y: 12,
    scale: 0.92,
    transition: { duration: MOTION_DURATION.fast, ease: MOTION_EASE },
  },
};

export function staggerDelay(index: number, maxItems = 6): number {
  return Math.min(index, maxItems) * 0.03;
}
