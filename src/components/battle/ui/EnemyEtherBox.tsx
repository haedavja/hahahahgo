/**
 * EnemyEtherBox.tsx
 *
 * 적 에테르 계산 표시 컴포넌트
 * 최적화: React.memo + 스타일 상수 추출
 */

import { FC, memo, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { DeflationBadge } from './DeflationBadge';
import type { ComboInfo as EnemyCombo, InsightReveal, UIDeflation as Deflation, PhaseBattle as Battle } from '../../../types';

// =====================
// 스타일 상수
// =====================

const CONTAINER_STYLE: CSSProperties = {
  position: 'fixed',
  top: '330px',
  right: '510px',
  padding: '0',
  borderRadius: '12px',
  background: 'transparent',
  border: 'none',
  boxShadow: 'none',
  minHeight: '140px',
  pointerEvents: 'none',
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

interface EnemyEtherBoxProps {
  enemyCombo: EnemyCombo | null;
  battle: Battle;
  insightReveal: InsightReveal | null;
  enemyCurrentDeflation: Deflation | null;
  enemyEtherCalcPhase: string;
  enemyTurnEtherAccumulated: number;
  COMBO_MULTIPLIERS: Record<string, number>;
  /** 보스 여부 (false면 etherPerTurn 고정값 사용) */
  isBoss?: boolean;
  /** 일반 몬스터의 고정 에테르값 */
  etherPerTurn?: number;
}

export const EnemyEtherBox: FC<EnemyEtherBoxProps> = memo(({
  enemyCombo,
  battle,
  insightReveal,
  enemyCurrentDeflation,
  enemyEtherCalcPhase,
  enemyTurnEtherAccumulated,
  COMBO_MULTIPLIERS,
  isBoss,
  etherPerTurn
}) => {
  // 일반 몬스터는 콤보 대신 etherPerTurn 고정값 사용 → 콤보 표시 숨김
  const isRegularMonster = isBoss === false && etherPerTurn !== undefined;
  // 에테르 PT 스타일 (동적)
  const etherPtStyle = useMemo((): CSSProperties => ({
    fontSize: enemyEtherCalcPhase === 'sum' ? '2rem' : '1.5rem',
    color: '#fbbf24',
    fontWeight: 'bold',
    letterSpacing: '0.2em',
    marginBottom: '2px',
    transition: 'font-size 0.3s ease, transform 0.3s ease',
    transform: enemyEtherCalcPhase === 'sum' ? 'scale(1.3)' : 'scale(1)',
    textShadow: enemyEtherCalcPhase === 'sum' ? '0 0 20px #fbbf24' : 'none',
    visibility: (battle.phase === 'resolve' || enemyTurnEtherAccumulated > 0) ? 'visible' : 'hidden',
    height: '1.8rem'
  }), [enemyEtherCalcPhase, battle.phase, enemyTurnEtherAccumulated]);

  // 배율 스타일 (동적)
  const multiplierStyle = useMemo((): CSSProperties => ({
    ...MULTIPLIER_BASE,
    fontSize: enemyEtherCalcPhase === 'multiply' ? '1.6rem' : '1.32rem',
    transform: enemyEtherCalcPhase === 'multiply' ? 'scale(1.3)' : 'scale(1)',
    textShadow: enemyEtherCalcPhase === 'multiply' ? '0 0 20px #fbbf24' : 'none'
  }), [enemyEtherCalcPhase]);

  // select/respond/resolve 단계에서만 표시
  if (!(battle.phase === 'select' || battle.phase === 'respond' || battle.phase === 'resolve')) {
    return null;
  }

  // select 단계에서 insightReveal 없으면 숨김
  if (battle.phase === 'select' && (insightReveal?.level || 0) === 0) {
    return null;
  }

  // 콤보가 없고 에테르도 없으면 표시 안함
  if (!enemyCombo && enemyTurnEtherAccumulated <= 0) {
    return null;
  }

  return (
    <div className="enemy-ether-box" style={CONTAINER_STYLE} data-testid="enemy-ether-box">
      <div className="combo-display" data-testid="enemy-combo-display">
        {/* 콤보 이름 (콤보가 있고 일반 몬스터가 아닐 때만 표시) */}
        {enemyCombo && !isRegularMonster && (
          <div style={COMBO_NAME_BASE}>
            <span>{enemyCombo.name}</span>
            <DeflationBadge
              deflation={enemyCurrentDeflation}
              isActive={enemyEtherCalcPhase === 'deflation'}
              position="right"
            />
          </div>
        )}
        {/* 에테르 PT 표시 */}
        <div style={etherPtStyle}>
          + {enemyTurnEtherAccumulated.toString().split('').join(' ')} P T
        </div>
        {/* 배율 표시 (콤보가 있고 일반 몬스터가 아닐 때만) */}
        {enemyCombo && !isRegularMonster && (
          <div style={multiplierStyle}>
            <span>× {(COMBO_MULTIPLIERS[enemyCombo.name] || 1).toFixed(2).split('').join(' ')}</span>
          </div>
        )}
      </div>
    </div>
  );
});
