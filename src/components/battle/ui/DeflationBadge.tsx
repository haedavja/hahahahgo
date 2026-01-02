/**
 * DeflationBadge.tsx
 *
 * 에테르 감쇄 표시 배지 컴포넌트
 * 최적화: React.memo + useMemo
 */

import { FC, memo, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { DEFLATION_COLORS } from './constants/colors';
import type { UIDeflation as Deflation } from '../../../types';

// =====================
// 스타일 상수
// =====================

const BASE_STYLE: CSSProperties = {
  position: 'absolute',
  fontWeight: 'bold',
  color: DEFLATION_COLORS.text,
  background: DEFLATION_COLORS.background,
  border: `1.5px solid ${DEFLATION_COLORS.border}`,
  borderRadius: '6px',
  padding: '4px 10px',
  letterSpacing: '0.05em',
  boxShadow: DEFLATION_COLORS.shadow,
  transition: 'font-size 0.3s ease, transform 0.3s ease'
};

interface DeflationBadgeProps {
  deflation: Deflation | null;
  isActive: boolean;
  position?: 'left' | 'right';
}

/**
 * 에테르 감쇄율을 표시하는 배지 컴포넌트
 */
export const DeflationBadge: FC<DeflationBadgeProps> = memo(({ deflation, isActive, position = 'left' }) => {
  // 동적 스타일 메모이제이션
  const badgeStyle = useMemo((): CSSProperties => ({
    ...BASE_STYLE,
    ...(position === 'right' ? { right: 'calc(50% + 120px)' } : { left: 'calc(50% + 120px)' }),
    fontSize: isActive ? '1.1rem' : '0.9rem',
    transform: isActive ? 'scale(1.2)' : 'scale(1)',
    textShadow: isActive ? DEFLATION_COLORS.glowActive : 'none'
  }), [isActive, position]);

  // 퍼센트 계산 메모이제이션
  const percentage = useMemo(() =>
    deflation ? Math.round((1 - deflation.multiplier) * 100) : 0,
    [deflation?.multiplier]
  );

  if (!deflation) return null;

  return (
    <div style={badgeStyle}>
      -{percentage}%
    </div>
  );
});
