/**
 * PlayerEtherBox.tsx
 *
 * 플레이어 에테르 계산 표시 컴포넌트
 */

import { FC } from 'react';
import { DeflationBadge } from './DeflationBadge';
import type { ComboInfo as CurrentCombo, UIDeflation as Deflation, PhaseBattle as Battle } from '../../../types';

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

export const PlayerEtherBox: FC<PlayerEtherBoxProps> = ({
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
  if (!currentCombo || !(battle.phase === 'select' || battle.phase === 'respond' || battle.phase === 'resolve')) {
    return null;
  }

  return (
    <div
      className="player-ether-box"
      style={{
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
      }}
    >
      <div className="combo-display" style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: '1.92rem',
          fontWeight: 'bold',
          color: '#fbbf24',
          marginBottom: '2px',
          height: '2.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          <span>{currentCombo.name}</span>
          <DeflationBadge
            deflation={currentDeflation}
            isActive={etherCalcPhase === 'deflation'}
            position="left"
          />
        </div>
        <div style={{
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
        }}>
          + {turnEtherAccumulated.toString().split('').join(' ')} P T
        </div>
        <div style={{
          fontSize: etherCalcPhase === 'multiply' ? '1.6rem' : '1.32rem',
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
          transition: 'font-size 0.3s ease, transform 0.3s ease',
          transform: (etherCalcPhase === 'multiply' || multiplierPulse) ? 'scale(1.3)' : 'scale(1)',
          textShadow: (etherCalcPhase === 'multiply' || multiplierPulse) ? '0 0 20px #fbbf24' : 'none'
        }}>
          <span>× {displayMultiplier.toFixed(2).split('').join(' ')}</span>
        </div>
      </div>
    </div>
  );
};
