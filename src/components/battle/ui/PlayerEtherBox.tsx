/**
 * PlayerEtherBox.tsx
 *
 * 플레이어 에테르 계산 표시 컴포넌트
 * 최적화: React.memo + 스타일 상수 추출
 */

import { FC, memo, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { DeflationBadge } from './DeflationBadge';
import type { ComboInfo as CurrentCombo, UIDeflation as Deflation, PhaseBattle as Battle } from '../../../types';

// =====================
// 스타일 상수
// =====================

const CONTAINER_STYLE: CSSProperties = {
  position: 'absolute',
  top: '70px',
  left: '40px',
  padding: '0',
  borderRadius: '12px',
  background: 'transparent',
  border: 'none',
  boxShadow: 'none',
  minHeight: '140px',
  pointerEvents: 'none'
};

const COMBO_DISPLAY_STYLE: CSSProperties = {
  textAlign: 'center'
};

const COMBO_NAME_BASE: CSSProperties = {
  fontSize: '1.92rem',
  fontWeight: 'bold',
  color: '#fbbf24',
  marginBottom: '2px',
  height: '2.5rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative'
};

const MULTIPLIER_BASE: CSSProperties = {
  color: '#fbbf24',
  fontWeight: 'bold',
  letterSpacing: '0.15em',
  minWidth: '400px',
  height: '2rem',
  marginTop: '8px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '12px',
  transition: 'font-size 0.3s ease, transform 0.3s ease'
};

interface PlayerEtherBoxProps {
  currentCombo: CurrentCombo | null;
  battle: Battle;
  currentDeflation: Deflation | null;
  etherCalcPhase: string;
  turnEtherAccumulated: number;
  etherPulse: boolean;
  finalComboMultiplier: number;
  etherMultiplier?: number;
  multiplierPulse: boolean;
}

export const PlayerEtherBox: FC<PlayerEtherBoxProps> = memo(({
  currentCombo,
  battle,
  currentDeflation,
  etherCalcPhase,
  turnEtherAccumulated,
  etherPulse,
  finalComboMultiplier,
  etherMultiplier = 1,
  multiplierPulse
}) => {
  // multiply 단계 이후에만 에테르 증폭 배율 적용
  const isAfterMultiply = etherCalcPhase === 'multiply' || etherCalcPhase === 'deflation' || etherCalcPhase === 'result';
  const displayMultiplier = isAfterMultiply
    ? finalComboMultiplier * etherMultiplier
    : finalComboMultiplier;

  // 에테르 PT 스타일 (동적)
  const etherPtStyle = useMemo((): CSSProperties => ({
    fontSize: etherPulse ? '1.8rem' : (etherCalcPhase === 'sum' ? '2rem' : '1.5rem'),
    color: '#fbbf24',
    fontWeight: 'bold',
    letterSpacing: '0.2em',
    marginBottom: '2px',
    transition: 'font-size 0.3s ease, transform 0.3s ease',
    transform: etherPulse ? 'scale(1.2)' : (etherCalcPhase === 'sum' ? 'scale(1.3)' : 'scale(1)'),
    textShadow: etherCalcPhase === 'sum' ? '0 0 20px #fbbf24' : 'none',
    visibility: battle.phase === 'resolve' ? 'visible' : 'hidden',
    height: '1.8rem'
  }), [etherPulse, etherCalcPhase, battle.phase]);

  // 배율 스타일 (동적)
  const multiplierStyle = useMemo((): CSSProperties => ({
    ...MULTIPLIER_BASE,
    fontSize: etherCalcPhase === 'multiply' ? '1.6rem' : '1.32rem',
    transform: (etherCalcPhase === 'multiply' || multiplierPulse) ? 'scale(1.3)' : 'scale(1)',
    textShadow: (etherCalcPhase === 'multiply' || multiplierPulse) ? '0 0 20px #fbbf24' : 'none'
  }), [etherCalcPhase, multiplierPulse]);

  if (!currentCombo || !(battle.phase === 'select' || battle.phase === 'respond' || battle.phase === 'resolve')) {
    return null;
  }

  return (
    <div className="player-ether-box" style={CONTAINER_STYLE}>
      <div className="combo-display" style={COMBO_DISPLAY_STYLE}>
        <div style={COMBO_NAME_BASE}>
          <span>{currentCombo.name}</span>
          <DeflationBadge
            deflation={currentDeflation}
            isActive={etherCalcPhase === 'deflation'}
            position="left"
          />
        </div>
        <div style={etherPtStyle}>
          + {turnEtherAccumulated.toString().split('').join(' ')} P T
        </div>
        <div style={multiplierStyle}>
          <span>× {displayMultiplier.toFixed(2).split('').join(' ')}</span>
        </div>
      </div>
    </div>
  );
});
