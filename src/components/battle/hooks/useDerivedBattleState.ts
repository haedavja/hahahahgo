/**
 * @file useDerivedBattleState.ts
 * @description 파생 전투 상태 훅
 *
 * ## 주요 기능
 * - 적 유닛 관련 파생 상태
 * - 타겟 유닛 계산
 * - 카드 제출 수 제한 계산
 * - 선택된 카드 총 에너지/속도 계산
 */

import { useMemo } from 'react';
import { hasEnemyUnits } from '../utils/battleUtils';
import { getAllTokens } from '../../../lib/tokenUtils';
import { applyAgility } from '../../../lib/agilityUtils';
import type { TokenState } from '../../../types/core';

interface EnemyUnit {
  unitId: number;
  hp: number;
  [key: string]: unknown;
}

interface SelectedCard {
  actionCost: number;
  speedCost: number;
  [key: string]: unknown;
}

interface PlayerState {
  tokens?: TokenState;
  [key: string]: unknown;
}

interface EnemyState {
  units?: EnemyUnit[];
  [key: string]: unknown;
}

interface NextTurnEffects {
  extraCardPlay?: number;
  [key: string]: unknown;
}

interface UseDerivedBattleStateParams {
  enemy: EnemyState | null;
  player: PlayerState;
  selectedTargetUnit: number;
  baseMaxSubmitCards: number;
  nextTurnEffects: NextTurnEffects | null;
  battleSelected: SelectedCard[];
  effectiveAgility: number;
}

interface DerivedBattleState {
  enemyUnits: EnemyUnit[];
  hasMultipleUnits: boolean;
  targetUnit: EnemyUnit | null;
  effectiveMaxSubmitCards: number;
  totalEnergy: number;
  totalSpeed: number;
}

/**
 * 파생 전투 상태 훅
 */
export function useDerivedBattleState(params: UseDerivedBattleStateParams): DerivedBattleState {
  const { enemy, player, selectedTargetUnit, baseMaxSubmitCards, nextTurnEffects, battleSelected, effectiveAgility } = params;

  // 적 유닛 관련 상태
  const enemyUnits = enemy?.units || [];
  const hasMultipleUnits = hasEnemyUnits(enemyUnits);

  // 현재 타겟 유닛 (살아있는 유닛 중 선택)
  const targetUnit = useMemo(() => {
    if (!enemyUnits || enemyUnits.length === 0) return null;
    const alive = enemyUnits.filter(u => u.hp > 0);
    if (alive.length === 0) return null;
    // 선택된 유닛이 살아있으면 그대로, 아니면 첫 번째 살아있는 유닛
    const selected = alive.find(u => u.unitId === selectedTargetUnit);
    return selected || alive[0];
  }, [enemyUnits, selectedTargetUnit]);

  // 정신집중 토큰에서 추가 카드 사용 수 계산
  const effectiveMaxSubmitCards = useMemo(() => {
    const playerTokensForCardPlay = player?.tokens ? getAllTokens({ tokens: player.tokens }) : [];
    const focusTokenForCardPlay = playerTokensForCardPlay.find(t => t.effect?.type === 'FOCUS');
    const focusExtraCardPlayBonus = focusTokenForCardPlay ? 2 * ((focusTokenForCardPlay.stacks as number) || 1) : 0;

    // 동적 최대 카드 제출 수 (상징 효과 + nextTurnEffects.extraCardPlay + 정신집중 토큰)
    return baseMaxSubmitCards + (nextTurnEffects?.extraCardPlay || 0) + focusExtraCardPlayBonus;
  }, [player?.tokens, baseMaxSubmitCards, nextTurnEffects?.extraCardPlay]);

  // 선택된 카드 총 에너지
  const totalEnergy = useMemo(
    () => battleSelected.reduce((s, c) => s + c.actionCost, 0),
    [battleSelected]
  );

  // 선택된 카드 총 속도 (민첩성 적용)
  const totalSpeed = useMemo(
    () => battleSelected.reduce((s, c) => s + applyAgility(c.speedCost, Number(effectiveAgility)), 0),
    [battleSelected, effectiveAgility]
  );

  return {
    enemyUnits,
    hasMultipleUnits,
    targetUnit,
    effectiveMaxSubmitCards,
    totalEnergy,
    totalSpeed
  };
}
