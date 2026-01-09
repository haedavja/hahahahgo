/**
 * @file postActionProcessing.ts
 * @description 카드 실행 후 상태 업데이트 처리
 */

import { addToken } from '../../../lib/tokenUtils';
import { COMBAT_AUDIO } from '../../../core/effects';
import type { TokenEntity } from '../../../types';
import { hasTrait, hasEnemyUnits } from './battleUtils';
import { distributeUnitDamage, type EnemyUnit } from './unitDamageDistribution';
import type { Card, HandAction } from '../../../types';

interface ProcessCriticalTokenParams {
  actionResult: { isCritical?: boolean; criticalHits?: number };
  actor: 'player' | 'enemy';
  playerState: TokenEntity & { tokens?: unknown };
  battleRef: React.MutableRefObject<{ player?: unknown } | null>;
  addLog: (msg: string) => void;
  actions: { setPlayer: (player: unknown) => void };
}

/**
 * 치명타 발생 시 기교 토큰 부여 (플레이어만)
 */
export function processCriticalToken({
  actionResult,
  actor,
  playerState,
  battleRef,
  addLog,
  actions,
}: ProcessCriticalTokenParams): TokenEntity {
  if (!actionResult.isCritical || actor !== 'player') {
    return playerState;
  }

  let P = { ...playerState };
  const critCount = ('criticalHits' in actionResult && typeof actionResult.criticalHits === 'number')
    ? actionResult.criticalHits
    : 1;

  const finesseResult = addToken(P as TokenEntity, 'finesse', critCount);
  P.tokens = finesseResult.tokens;
  addLog(`✨ 치명타! 기교 +${critCount} 획득`);

  if (battleRef.current) {
    battleRef.current = { ...battleRef.current, player: P };
  }
  actions.setPlayer({ ...P });

  return P;
}

interface ProcessGrowingDefenseParams {
  action: HandAction;
  playerState: { block?: number; def?: boolean };
  growingDefenseRef: React.MutableRefObject<{ activatedSp: number; totalDefenseApplied?: number } | null>;
  addLog: (msg: string) => void;
}

/**
 * 방어자세 성장 방어력 적용
 */
export function processGrowingDefense({
  action,
  playerState,
  growingDefenseRef,
  addLog,
}: ProcessGrowingDefenseParams): { block: number; def: boolean } {
  let P = { ...playerState };

  if (!growingDefenseRef.current) {
    return { block: P.block ?? 0, def: P.def ?? false };
  }

  const currentSp = action.sp || 0;
  const { activatedSp, totalDefenseApplied = 0 } = growingDefenseRef.current;
  const totalDefenseNeeded = Math.max(0, currentSp - activatedSp);
  const defenseDelta = totalDefenseNeeded - totalDefenseApplied;

  if (defenseDelta > 0) {
    const prevBlock = P.block || 0;
    P.block = prevBlock + defenseDelta;
    P.def = true;
    addLog(`🛡️ 방어자세: +${defenseDelta} 방어력 (총 ${totalDefenseNeeded})`);
    growingDefenseRef.current.totalDefenseApplied = totalDefenseNeeded;
  }

  return { block: P.block ?? 0, def: P.def ?? false };
}

interface ProcessMultiUnitDamageParams {
  action: HandAction;
  actionResult: { dealt?: number };
  enemyState: {
    hp: number;
    units?: EnemyUnit[];
  };
  pathosNextCardEffects?: { aoe?: boolean };
  selectedTargetUnit: number;
  addLog: (msg: string) => void;
}

/**
 * 다중 유닛 데미지 분배 처리
 */
export function processMultiUnitDamage({
  action,
  actionResult,
  enemyState,
  pathosNextCardEffects,
  selectedTargetUnit,
  addLog,
}: ProcessMultiUnitDamageParams): { hp: number; units?: EnemyUnit[] } {
  const enemyUnits = enemyState.units || [];
  const hasUnits = hasEnemyUnits(enemyUnits);

  if (!hasUnits || action.actor !== 'player' || action.card?.type !== 'attack') {
    return enemyState;
  }

  // 파토스 aoe 효과 확인
  const isPathosAoe = pathosNextCardEffects?.aoe === true;
  const cardWithAoe = isPathosAoe
    ? { ...(action.card as Card & { isAoe?: boolean }), isAoe: true }
    : action.card;

  if (isPathosAoe) {
    addLog('💥 파토스: 전체 공격!');
  }

  const damageDistributionResult = distributeUnitDamage({
    card: cardWithAoe as Card & { __targetUnitId?: number; __targetUnitIds?: number[]; isAoe?: boolean; damage?: number },
    enemyUnits: enemyUnits as EnemyUnit[],
    damageDealt: actionResult.dealt || 0,
    selectedTargetUnit,
  });

  if (damageDistributionResult) {
    damageDistributionResult.logs.forEach(log => addLog(log));
    return {
      hp: damageDistributionResult.newTotalHp,
      units: damageDistributionResult.updatedUnits as EnemyUnit[],
    };
  }

  return enemyState;
}

interface CheckBattleEndParams {
  playerHp: number;
  enemyHp: number;
  newQIndex: number;
  queue: HandAction[];
  queueLength: number;
  turnEtherAccumulated: number;
  playSound: (freq: number, dur: number) => void;
  actions: {
    setPostCombatOptions: (options: { type: string }) => void;
    setPhase: (phase: string) => void;
    setEtherCalcPhase: (phase: string) => void;
    setTurnEtherAccumulated: (value: number) => void;
    setResolvedPlayerCards: (value: number) => void;
  };
}

/**
 * 전투 종료 조건 체크 및 처리
 */
export function checkBattleEnd({
  playerHp,
  enemyHp,
  newQIndex,
  queue,
  queueLength,
  turnEtherAccumulated,
  playSound,
  actions,
}: CheckBattleEndParams): { ended: boolean; result?: 'victory' | 'defeat' } {
  if (playerHp <= 0) {
    actions.setPostCombatOptions({ type: 'defeat' });
    actions.setPhase('post');
    return { ended: true, result: 'defeat' };
  }

  if (enemyHp <= 0) {
    // 적 사망 처리
    if (turnEtherAccumulated > 0) {
      actions.setEtherCalcPhase('win_calc');
      playSound(COMBAT_AUDIO.BLOCK.tone, COMBAT_AUDIO.BLOCK.duration);
    }

    const resolvedCount = queue.slice(0, newQIndex).filter(q => q.actor === 'player').length;
    actions.setResolvedPlayerCards(resolvedCount);

    // 더 이상 큐에 카드가 없으면 바로 승리 처리
    if (newQIndex >= queueLength) {
      actions.setPostCombatOptions({ type: 'victory' });
      actions.setPhase('post');
    }

    return { ended: true, result: 'victory' };
  }

  return { ended: false };
}
