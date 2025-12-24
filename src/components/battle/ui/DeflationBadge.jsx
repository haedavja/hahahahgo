/**
 * DeflationBadge.jsx
 *
 * 에테르 감쇄 표시 배지 컴포넌트
 */

import { DEFLATION_COLORS } from './constants/colors';

/**
 * 에테르 감쇄율을 표시하는 배지 컴포넌트
 * @param {Object} props
 * @param {Object} props.deflation - 감쇄 정보 객체 { multiplier: number }
 * @param {boolean} props.isActive - 감쇄 단계 활성화 여부
 * @param {string} props.position - 배치 위치 ('left' | 'right')
 */
export function DeflationBadge({ deflation, isActive, position = 'left' }) {
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
}
