import type { ReactNode } from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';

export interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-7',
};

export function GlassCard({
  children,
  className = '',
  hoverable = true,
  padding = 'md',
  ...rest
}: GlassCardProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hoverable && !prefersReduced ? { y: -5 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={`glass-card ${paddingMap[padding]} ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
