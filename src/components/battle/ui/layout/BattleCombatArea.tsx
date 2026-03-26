/**
 * @file BattleCombatArea.tsx
 * @description 전투 화면의 메인 전투 영역 (플레이어/적 정보)
 *
 * BattleApp.tsx에서 분리된 전투 영역 렌더링 로직
 */

import React, { memo } from 'react';
import { PlayerHpBar } from '../PlayerHpBar';
import { PlayerEtherBox } from '../PlayerEtherBox';
import { EnemyHpBar } from '../EnemyHpBar';
import { EnemyEtherBox } from '../EnemyEtherBox';
import { EnemyUnitsDisplay } from '../EnemyUnitsDisplay';
import { CentralPhaseDisplay } from '../CentralPhaseDisplay';
import { EtherComparisonBar } from '../EtherComparisonBar';
import { COMBO_MULTIPLIERS } from '../../utils/etherCalculations';
import type { TokenEntity, EnemyUnitState, Card, HandAction } from '../../../../types';
import type { BattleActions } from '../../hooks/useBattleState';

export interface BattleCombatAreaProps {
  // 배틀 상태
  battle: {
    phase: string;
    player: TokenEntity & { hp: number; block?: number };
    enemy: TokenEntity & { hp: number; block?: number };
    perUnitPreviewDamage?: Record<number, number>;
    distributionMode?: boolean;
    damageDistribution?: Record<number, number>;
    totalDistributableDamage?: number;
  };

  // 플레이어 정보
  player: TokenEntity & {
    hp: number;
    block?: number;
    maxEnergy?: number;
    strength?: number;
  };
  playerHit: boolean;
  playerBlockAnim: boolean;
  playerOverdriveFlash: boolean;
  effectiveAgility: number;
  dulledLevel: number;
  insightLevel: number;

  // 플레이어 에테르
  currentCombo: unknown;
  currentDeflation: number;
  etherCalcPhase: string | null;
  turnEtherAccumulated: number;
  etherPulse: boolean;
  finalComboMultiplier: number;
  displayEtherMultiplier: number;
  multiplierPulse: boolean;

  // 적 정보
  enemy: TokenEntity & {
    hp: number;
    block?: number;
    def?: boolean;
    name?: string;
    units?: EnemyUnitState[];
    etherCapacity?: number;
    grace?: unknown;
  };
  enemyHit: boolean;
  enemyBlockAnim: boolean;
  enemyOverdriveFlash: boolean;
  soulShatter: boolean;
  previewDamage: number;

  // 적 에테르
  enemyCombo: unknown;
  insightReveal: number;
  enemyCurrentDeflation: number;
  enemyEtherCalcPhase: string | null;
  enemyTurnEtherAccumulated: number;
  enemyEtherValue: number;
  enemyTransferPulse: boolean;
  enemySoulScale: number;
  groupedEnemyMembers: unknown[];

  // 다중 유닛
  hasMultipleUnits: boolean;
  enemyUnits: EnemyUnitState[];
  selectedTargetUnit: number;

  // 에테르 비교
  etherFinalValue: number | null;
  enemyEtherFinalValue: number | null;
  netFinalEther: number | null;

  // 중앙 페이즈
  totalSpeed: number;
  MAX_SPEED: number;
  effectiveMaxSubmitCards: number;
  redrawHand: () => void;
  canRedraw: boolean;
  startResolve: () => void;
  playSound: (sound: string) => void;
  willOverdrive: boolean;
  etherSlots: (pts: number) => number;
  beginResolveFromRespond: () => void;
  rewindToSelect: () => void;
  rewindUsed: boolean;
  respondSnapshot: unknown;
  autoProgress: boolean;
  finishTurn: () => void;

  // 액션
  actions: BattleActions & {
    setSelectedTargetUnit: (unitId: number) => void;
    updateDamageDistribution: (unitId: number, amount: number) => void;
  };
  onConfirmDistribution: () => void;
  onCancelDistribution: () => void;

  // 유틸리티
  formatCompactValue: (value: number) => string;
}

/**
 * 전투 메인 영역 컴포넌트
 */
export const BattleCombatArea = memo(function BattleCombatArea({
  battle,
  player,
  playerHit,
  playerBlockAnim,
  playerOverdriveFlash,
  effectiveAgility,
  dulledLevel,
  insightLevel,
  currentCombo,
  currentDeflation,
  etherCalcPhase,
  turnEtherAccumulated,
  etherPulse,
  finalComboMultiplier,
  displayEtherMultiplier,
  multiplierPulse,
  enemy,
  enemyHit,
  enemyBlockAnim,
  enemyOverdriveFlash,
  soulShatter,
  previewDamage,
  enemyCombo,
  insightReveal,
  enemyCurrentDeflation,
  enemyEtherCalcPhase,
  enemyTurnEtherAccumulated,
  enemyEtherValue,
  enemyTransferPulse,
  enemySoulScale,
  groupedEnemyMembers,
  hasMultipleUnits,
  enemyUnits,
  selectedTargetUnit,
  etherFinalValue,
  enemyEtherFinalValue,
  netFinalEther,
  totalSpeed,
  MAX_SPEED,
  effectiveMaxSubmitCards,
  redrawHand,
  canRedraw,
  startResolve,
  playSound,
  willOverdrive,
  etherSlots,
  beginResolveFromRespond,
  rewindToSelect,
  rewindUsed,
  respondSnapshot,
  autoProgress,
  finishTurn,
  actions,
  onConfirmDistribution,
  onCancelDistribution,
  formatCompactValue,
}: BattleCombatAreaProps) {
  return (
    <div>
      {/* 플레이어/적 정보 + 중앙 정보 통합 레이아웃 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', marginBottom: '50px', gap: '120px', position: 'relative', marginTop: '40px', paddingRight: '40px' }}>
        <EtherComparisonBar
          battle={battle}
          etherFinalValue={(etherFinalValue ?? null) as number}
          enemyEtherFinalValue={(enemyEtherFinalValue ?? null) as number}
          netFinalEther={(netFinalEther ?? null) as number}
          position="top"
        />

        {/* 왼쪽: 플레이어 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', minWidth: '360px', position: 'relative', justifyContent: 'flex-end', paddingTop: '200px' }}>
          <PlayerEtherBox
            currentCombo={currentCombo}
            battle={battle}
            currentDeflation={currentDeflation}
            etherCalcPhase={(etherCalcPhase ?? null) as string}
            turnEtherAccumulated={turnEtherAccumulated}
            etherPulse={etherPulse}
            finalComboMultiplier={finalComboMultiplier}
            etherMultiplier={displayEtherMultiplier}
            multiplierPulse={multiplierPulse}
          />
          <PlayerHpBar
            player={player}
            playerHit={playerHit}
            playerBlockAnim={playerBlockAnim}
            playerOverdriveFlash={playerOverdriveFlash}
            effectiveAgility={effectiveAgility}
            dulledLevel={dulledLevel}
            insightLevel={insightLevel}
          />
        </div>

        <CentralPhaseDisplay
          battle={battle}
          totalSpeed={totalSpeed}
          MAX_SPEED={MAX_SPEED}
          MAX_SUBMIT_CARDS={effectiveMaxSubmitCards}
          redrawHand={redrawHand}
          canRedraw={canRedraw}
          startResolve={startResolve}
          playSound={playSound}
          actions={actions}
          willOverdrive={willOverdrive}
          etherSlots={etherSlots}
          player={player}
          beginResolveFromRespond={beginResolveFromRespond}
          rewindToSelect={rewindToSelect}
          rewindUsed={rewindUsed}
          respondSnapshot={respondSnapshot}
          autoProgress={autoProgress}
          etherFinalValue={etherFinalValue}
          enemy={enemy}
          finishTurn={finishTurn}
        />

        <EtherComparisonBar
          battle={battle}
          etherFinalValue={(etherFinalValue ?? null) as number}
          enemyEtherFinalValue={(enemyEtherFinalValue ?? null) as number}
          netFinalEther={(netFinalEther ?? null) as number}
          position="bottom"
        />

        {/* 오른쪽: 적 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', minWidth: '360px', position: 'relative', justifyContent: 'center', paddingTop: '120px' }}>
          {soulShatter && (
            <div className="soul-shatter-banner">
              <div className="soul-shatter-text">영혼파괴!</div>
            </div>
          )}
          <EnemyEtherBox
            enemyCombo={enemyCombo}
            battle={battle}
            insightReveal={insightReveal}
            enemyCurrentDeflation={enemyCurrentDeflation}
            enemyEtherCalcPhase={(enemyEtherCalcPhase ?? null) as string}
            enemyTurnEtherAccumulated={enemyTurnEtherAccumulated}
            COMBO_MULTIPLIERS={COMBO_MULTIPLIERS}
          />
          {/* 다중 유닛: EnemyUnitsDisplay, 단일 적: EnemyHpBar */}
          {hasMultipleUnits ? (
            <EnemyUnitsDisplay
              units={enemyUnits}
              selectedTargetUnit={selectedTargetUnit}
              onSelectUnit={(unitId) => actions.setSelectedTargetUnit(unitId)}
              previewDamage={previewDamage}
              perUnitPreviewDamage={battle.perUnitPreviewDamage}
              dulledLevel={dulledLevel}
              phase={battle.phase}
              enemyHit={enemyHit}
              enemyBlockAnim={enemyBlockAnim}
              soulShatter={soulShatter}
              enemyEtherValue={Number(enemyEtherValue)}
              enemyEtherCapacity={(enemy as { etherCapacity?: number })?.etherCapacity ?? 300}
              enemyTransferPulse={enemyTransferPulse}
              formatCompactValue={formatCompactValue}
              enemyBlock={(enemy as { block?: number })?.block || 0}
              enemyDef={(enemy as { def?: boolean })?.def || false}
              distributionMode={battle.distributionMode}
              damageDistribution={battle.damageDistribution}
              totalDistributableDamage={battle.totalDistributableDamage}
              onUpdateDistribution={(unitId, isTargeted) => actions.updateDamageDistribution(unitId, isTargeted ? 1 : 0)}
              onConfirmDistribution={onConfirmDistribution}
              onCancelDistribution={onCancelDistribution}
              enemy={enemy}
            />
          ) : (
            <EnemyHpBar
              battle={battle}
              previewDamage={previewDamage}
              dulledLevel={dulledLevel}
              enemy={enemy}
              enemyHit={enemyHit}
              enemyBlockAnim={enemyBlockAnim}
              soulShatter={soulShatter}
              groupedEnemyMembers={groupedEnemyMembers}
              enemyOverdriveFlash={enemyOverdriveFlash}
              enemyEtherValue={enemyEtherValue}
              enemyTransferPulse={enemyTransferPulse}
              enemySoulScale={enemySoulScale}
              formatCompactValue={formatCompactValue}
              frozenOrder={battle.frozenOrder}
              graceState={enemy?.grace}
            />
          )}
        </div>
      </div>
    </div>
  );
});
