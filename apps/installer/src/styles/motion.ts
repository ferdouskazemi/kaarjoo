import type { Variants, Transition } from 'motion/react';

/**
 * flash-rive inspired GPU-composited motion presets.
 * Only animates transform, opacity, and SVG pathLength for 60fps+ smoothness.
 */
export const MOTION_EASE = [0.22, 1, 0.36, 1] as const;

export const MOTION_SPRING: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 30,
  mass: 0.85,
};

export const MOTION_SETTLE_SPRING: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 24,
  mass: 0.9,
};

export const stageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 14,
    scale: 0.985,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.34,
      ease: MOTION_EASE,
      staggerChildren: 0.055,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.985,
    transition: {
      duration: 0.2,
      ease: MOTION_EASE,
    },
  },
};

export const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: MOTION_EASE,
    },
  },
};
