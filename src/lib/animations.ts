/**
 * Configuration des animations Framer Motion
 * Animations réutilisables et optimisées pour les performances
 */

import { Variants } from 'framer-motion';

/**
 * Animation de fade in/out
 */
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

/**
 * Animation de slide depuis la gauche (sidebar)
 */
export const slideFromLeftVariants: Variants = {
  hidden: { x: '-100%' },
  visible: { x: 0 },
  exit: { x: '-100%' }
};

/**
 * Animation de slide depuis la droite
 */
export const slideFromRightVariants: Variants = {
  hidden: { x: '100%' },
  visible: { x: 0 },
  exit: { x: '100%' }
};

/**
 * Animation de slide depuis le bas (modals)
 */
export const slideFromBottomVariants: Variants = {
  hidden: { y: '100%', opacity: 0 },
  visible: { y: 0, opacity: 1 },
  exit: { y: '100%', opacity: 0 }
};

/**
 * Animation de scale (zoom)
 */
export const scaleVariants: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { scale: 1, opacity: 1 },
  exit: { scale: 0.8, opacity: 0 }
};

/**
 * Transitions optimisées
 */
export const transitions = {
  // Transition rapide pour les interactions
  fast: {
    duration: 0.15,
    ease: 'easeOut' as const
  },
  
  // Transition normale
  default: {
    duration: 0.2,
    ease: 'easeInOut' as const
  },
  
  // Transition avec spring (plus naturelle)
  spring: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30
  },
  
  // Transition douce pour les modals
  smooth: {
    duration: 0.3,
    ease: [0.4, 0, 0.2, 1] as const // cubic-bezier
  }
};

/**
 * Animation de liste (stagger children)
 */
export const listVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

export const listItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

/**
 * Configuration pour réduire le motion sur les appareils qui le demandent
 */
export const reducedMotionConfig = {
  initial: false,
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.01 }
};

/**
 * Hook pour détecter si l'utilisateur préfère un motion réduit
 */
export const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};
