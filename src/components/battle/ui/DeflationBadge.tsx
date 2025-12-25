/**
 * DeflationBadge.tsx
 *
 * 에테르 감쇄 표시 배지 컴포넌트
 */

import { FC } from 'react';
import { DEFLATION_COLORS } from './constants/colors';

interface Deflation {
  multiplier: number;
}

interface DeflationBadgeProps {
  deflation: Deflation | null;
  isActive: boolean;
  position?: 'left' | 'right';
}

/**
 * 에테르 감쇄율을 표시하는 배지 컴포넌트
 */
export const DeflationBadge: FC<DeflationBadgeProps> = ({ deflation, isActive, position = 'left' }) => {
  if (!deflation) return null;

  const percentage = Math.round((1 - deflation.multiplier) * 100);

  const positionStyle = position === 'right'
    ? { right: 'calc(50% + 120px)' }
    : { left: 'calc(50% + 120px)' };

  return (
    <div style={{
      position: 'absolute',
      ...positionStyle,
      fontSize: isActive ? '1.1rem' : '0.9rem',
      fontWeight: 'bold',
      color: DEFLATION_COLORS.text,
      background: DEFLATION_COLORS.background,
      border: `1.5px solid ${DEFLATION_COLORS.border}`,
      borderRadius: '6px',
      padding: '4px 10px',
      letterSpacing: '0.05em',
      boxShadow: DEFLATION_COLORS.shadow,
      transition: 'font-size 0.3s ease, transform 0.3s ease',
      transform: isActive ? 'scale(1.2)' : 'scale(1)',
      textShadow: isActive ? DEFLATION_COLORS.glowActive : 'none'
    }}>
      -{percentage}%
    </div>
  );
};
