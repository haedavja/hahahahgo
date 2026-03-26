/**
 * @file cardExecutionContext.ts
 * @description 카드 실행 컨텍스트 생성 유틸리티
 */

import { BASE_PLAYER_ENERGY } from '../battleData';
import type { BattleContext } from '../../../types/combat';
import type { Card, HandAction } from '../../../types';

interface BuildContextParams {
  action: HandAction;
  queue: HandAction[];
  qIndex: number;
  turnNumber: number;
  playerState: {
    energy?: number;
    maxEnergy?: number;
  };
  enemyState: {
    energy?: number;
    maxEnergy?: number;
    units?: Array<{ unitId: number; name?: string }>;
    name?: string;
  };
  allCards: Card[];
  currentHand: Card[];
  nextTurnEffects: Record<string, unknown>;
  pathosTurnEffects?: Record<string, unknown>;
  pathosNextCardEffects?: {
    guaranteeCrit?: boolean;
    setSpeed?: number;
    aoe?: boolean;
  };
}

/**
 * 카드 실행에 필요한 battleContext 생성
 */
export function buildBattleContext({
  action,
  queue,
  qIndex,
  turnNumber,
  playerState,
  enemyState,
  allCards,
  currentHand,
  nextTurnEffects,
  pathosTurnEffects,
  pathosNextCardEffects,
}: BuildContextParams): BattleContext {
  const a = action;
  const P = playerState;
  const E = enemyState;

  // 진행 단계 최종 남은 행동력 계산
  const allPlayerCards = queue.filter(q => q.actor === 'player');
  const totalEnergyUsed = allPlayerCards.reduce((sum, q) => sum + (q.card?.actionCost || 0), 0);
  const playerEnergyBudget = P.energy || P.maxEnergy || BASE_PLAYER_ENERGY;
  const calculatedRemainingEnergy = Math.max(0, playerEnergyBudget - totalEnergyUsed);

  // 적 남은 에너지 계산
  const allEnemyCards = queue.filter(q => q.actor === 'enemy');
  const enemyTotalEnergyUsed = allEnemyCards.reduce((sum, q) => sum + (q.card?.actionCost || 0), 0);
  const enemyEnergyBudget = E.energy || E.maxEnergy || BASE_PLAYER_ENERGY;
  const calculatedEnemyRemainingEnergy = Math.max(0, enemyEnergyBudget - enemyTotalEnergyUsed);

  // 적 카드의 소스 유닛 이름 가져오기
  const currentUnitsForContext = E.units || [];
  const sourceUnit = a.actor === 'enemy' && a.card.__sourceUnitId !== undefined
    ? currentUnitsForContext.find(u => u.unitId === a.card.__sourceUnitId)
    : null;
  const baseName = E.name || '몬스터';
  const unitIndex = sourceUnit ? sourceUnit.unitId + 1 : 1;
  const enemyDisplayName = `${baseName} x${unitIndex}`;

  // 현재 nextTurnEffects에서 fencingDamageBonus 가져오기
  const fencingDamageBonus = (nextTurnEffects as { fencingDamageBonus?: number }).fencingDamageBonus || 0;

  return {
    currentSp: a.sp || 0,
    currentTurn: turnNumber,
    queue,
    currentQIndex: qIndex,
    remainingEnergy: calculatedRemainingEnergy,
    enemyRemainingEnergy: calculatedEnemyRemainingEnergy,
    allCards,
    hand: currentHand,
    enemyDisplayName,
    fencingDamageBonus,
    pathosTurnEffects: pathosTurnEffects as BattleContext['pathosTurnEffects'],
    pathosNextCardEffects: pathosNextCardEffects as BattleContext['pathosNextCardEffects'],
    guaranteedCrit: pathosNextCardEffects?.guaranteeCrit,
  };
}
