/**
 * EtherComparisonBar.tsx
 *
 * 에테르 비교 표시 컴포넌트 (resolve 단계에서 표시)
 * 최적화: React.memo + 스타일 상수 추출
 */

import { FC, memo, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { EtherComparisonBattle as Battle } from '../../../types';

// =====================
// 스타일 상수
// =====================

const PLAYER_BOX_STYLE: CSSProperties = {
  padding: '10px 20px',
  borderRadius: '12px',
  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(56, 189, 248, 0.14))',
  border: '2px solid rgba(125, 211, 252, 0.9)',
  color: '#e0f2fe',
  fontWeight: 900,
  letterSpacing: '0.14em',
  fontSize: '1.25rem',
  minWidth: '190px',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  boxShadow: '0 0 16px rgba(125, 211, 252, 0.35)'
};

const SEPARATOR_LEFT_STYLE: CSSProperties = {
  width: '96px',
  height: '2px',
  background: 'linear-gradient(90deg, rgba(125,211,252,0.0), rgba(125,211,252,0.8))',
  boxShadow: '0 0 10px rgba(125,211,252,0.35)'
};

const DELTA_BOX_STYLE: CSSProperties = {
  padding: '12px 22px',
  borderRadius: '12px',
  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(16, 185, 129, 0.25))',
  border: '2px solid rgba(125, 211, 252, 0.7)',
  color: '#e0f2fe',
  fontWeight: 900,
  fontSize: '1.3rem',
  letterSpacing: '0.14em',
  whiteSpace: 'nowrap',
  minWidth: '130px',
  textAlign: 'center'
};

const SEPARATOR_RIGHT_STYLE: CSSProperties = {
  width: '96px',
  height: '2px',
  background: 'linear-gradient(90deg, rgba(125,211,252,0.8), rgba(125,211,252,0.0))',
  boxShadow: '0 0 10px rgba(125,211,252,0.35)'
};

const ENEMY_BOX_STYLE: CSSProperties = {
  padding: '10px 20px',
  borderRadius: '12px',
  background: 'linear-gradient(135deg, rgba(248, 113, 113, 0.22), rgba(244, 63, 94, 0.14))',
  border: '2px solid rgba(248, 113, 113, 0.9)',
  color: '#ffe4e6',
  fontWeight: 900,
  letterSpacing: '0.14em',
  fontSize: '1.25rem',
  minWidth: '190px',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  boxShadow: '0 0 16px rgba(248, 113, 113, 0.35)'
};

interface EtherComparisonBarProps {
  battle: Battle;
  etherFinalValue: number | null;
  enemyEtherFinalValue: number | null;
  netFinalEther: number;
  position?: 'top' | 'bottom';
}

export const EtherComparisonBar: FC<EtherComparisonBarProps> = memo(({
  battle,
  etherFinalValue,
  enemyEtherFinalValue,
  netFinalEther,
  position = 'top'
}) => {
  // 컨테이너 스타일 메모이제이션
  const containerStyle = useMemo((): CSSProperties => {
    const topValue = position === 'top' ? '750px' : '620px';
    const leftValue = position === 'top' ? 'calc(50% - 50px)' : 'calc(50% - 180px)';
    return {
      position: position === 'top' ? 'absolute' : 'fixed',
      top: topValue,
      left: leftValue,
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: '32px',
      padding: '12px 36px',
      background: 'rgba(8, 15, 30, 0.35)',
      borderRadius: '18px',
      border: '1.5px solid rgba(148, 163, 184, 0.35)',
      boxShadow: '0 10px 28px rgba(0,0,0,0.35), inset 0 0 12px rgba(94, 234, 212, 0.1)',
      pointerEvents: position === 'bottom' ? 'none' : 'auto',
      zIndex: position === 'bottom' ? 3600 : 'auto'
    };
  }, [position]);

  if (battle.phase !== 'resolve' || etherFinalValue === null || enemyEtherFinalValue === null) {
    return null;
  }

  return (
    <div style={containerStyle}>
      <div style={PLAYER_BOX_STYLE}>
        {etherFinalValue.toLocaleString()} P T
      </div>
      <div style={SEPARATOR_LEFT_STYLE} />
      <div style={DELTA_BOX_STYLE}>
        Δ {netFinalEther.toLocaleString()} P T
      </div>
      <div style={SEPARATOR_RIGHT_STYLE} />
      <div style={ENEMY_BOX_STYLE}>
        {enemyEtherFinalValue.toLocaleString()} P T
      </div>
    </div>
  );
});
