/**
 * @file useRenderComputations.ts
 * @description 렌더링 전 계산 훅
 *
 * ## 주요 기능
 * - 에테르 값 계산
 * - 오버드라이브 가시성 계산
 * - 에너지 계산
 * - 통찰 레벨 계산
 */

import { useMemo, useCallback } from 'react';
import { applyAgility } from '../../../lib/agilityUtils';
import { getTokenStacks } from '../../../lib/tokenUtils';
import { shouldEnemyOverdrive } from '../utils/enemyAI';
import { calculateEtherSlots } from '../../../lib/etherUtils';
import { BASE_PLAYER_ENERGY } from '../battleData';
import type { Card } from '../../../types/core';
import type { BattlePhase } from '../reducer/battleReducerActions';

interface PlayerState {
  etherPts?: number;
  energy?: number;
  maxSpeed?: number;
  maxEnergy?: number;
  tokens?: unknown[];
  [key: string]: unknown;
}

interface EnemyState {
  etherPts?: number;
  etherCapacity?: number;
  etherOverdriveActive?: boolean;
  [key: string]: unknown;
}

interface EnemyPlan {
  actions?: unknown[];
  mode?: unknown;
}

interface InsightReveal {
  level?: number;
  visible?: boolean;
}

interface UseRenderComputationsParams {
  player: PlayerState;
  enemy: EnemyState | null;
  enemyPlan: EnemyPlan;
  battle: {
    phase: BattlePhase;
    selected: Card[];
  };
  totalSpeed: number;
  totalEnergy: number;
  effectiveMaxSubmitCards: number;
  effectiveAgility: number;
  insightReveal: InsightReveal | null;
  etherFinalValue: number | null;
  enemyEtherFinalValue: number | null;
  netEtherDelta: number | null;
  turnNumber: number;
}

interface RenderComputations {
  handDisabled: (c: Card) => boolean;
  playerEtherValue: number;
  playerEtherSlots: number;
  enemyEtherValue: number;
  playerEnergyBudget: number;
  remainingEnergy: number;
  insightLevelSelect: number;
  insightVisible: boolean | undefined;
  enemyWillOverdrivePlan: boolean;
  canRevealOverdrive: boolean;
  enemyOverdriveVisible: boolean;
  enemyOverdriveLabel: string;
  netFinalEther: number | null;
  enemyCapacity: number;
  enemySoulScale: number;
}

/**
 * 렌더링 전 계산 훅
 */
export function useRenderComputations(params: UseRenderComputationsParams): RenderComputations {
  const {
    player,
    enemy,
    enemyPlan,
    battle,
    totalSpeed,
    totalEnergy,
    effectiveMaxSubmitCards,
    effectiveAgility,
    insightReveal,
    etherFinalValue,
    enemyEtherFinalValue,
    netEtherDelta,
    turnNumber
  } = params;

  // 카드 비활성화 체크 함수
  const handDisabled = useCallback((c: Card): boolean => {
    // 기본 체크: 최대 선택 수, 속도 한계, 행동력 부족
    if (battle.selected.length >= effectiveMaxSubmitCards ||
        totalSpeed + applyAgility(c.speedCost, Number(effectiveAgility)) > Number(player.maxSpeed) ||
        totalEnergy + c.actionCost > Number(player.maxEnergy)) {
      return true;
    }

    // 필요 토큰 체크 (기교 등)
    if (c.requiredTokens && Array.isArray(c.requiredTokens)) {
      for (const req of c.requiredTokens) {
        const currentStacks = getTokenStacks(player, req.id);
        if (currentStacks < (req.stacks || 1)) {
          return true;  // 토큰 부족
        }
      }
    }

    return false;
  }, [battle.selected.length, effectiveMaxSubmitCards, totalSpeed, effectiveAgility, player, totalEnergy]);

  // 에테르 관련 계산
  const playerEtherValue = Number(player?.etherPts) || 0;
  const playerEtherSlots = calculateEtherSlots(playerEtherValue);
  const enemyEtherValue = Number(enemy?.etherPts) || 0;

  // 에너지 계산
  const playerEnergyBudget = (player as { energy?: number }).energy || BASE_PLAYER_ENERGY;
  const remainingEnergy = Math.max(0, playerEnergyBudget - totalEnergy);

  // 통찰 관련 계산
  const insightLevelSelect = insightReveal?.level || 0;
  const insightVisible = insightReveal?.visible;

  // 오버드라이브 관련 계산
  const enemyWillOverdrivePlan = useMemo(() =>
    shouldEnemyOverdrive(
      enemyPlan.mode,
      enemyPlan.actions as unknown as import("../../../types").AICard[],
      Number(enemy?.etherPts),
      turnNumber
    ),
    [enemyPlan.mode, enemyPlan.actions, enemy?.etherPts, turnNumber]
  );

  const canRevealOverdrive = useMemo(() =>
    (battle.phase === 'select' && insightVisible && insightLevelSelect >= 2) ||
    (battle.phase === 'respond' && insightVisible && insightLevelSelect >= 1) ||
    battle.phase === 'resolve',
    [battle.phase, insightVisible, insightLevelSelect]
  );

  const enemyOverdriveVisible = canRevealOverdrive && (enemyWillOverdrivePlan || enemy?.etherOverdriveActive);
  const enemyOverdriveLabel = enemy?.etherOverdriveActive ? '기원 발동' : '기원 예정';

  // 에테르 델타 계산
  const rawNetDelta = (battle.phase === 'resolve' && etherFinalValue !== null && enemyEtherFinalValue !== null)
    ? (etherFinalValue - enemyEtherFinalValue)
    : null;
  const netFinalEther = netEtherDelta !== null ? netEtherDelta : rawNetDelta;

  // 적 소울 스케일 계산
  const enemyCapacity = (enemy as { etherCapacity?: number })?.etherCapacity ?? Math.max(Number(enemyEtherValue), 1);
  const enemySoulScale = Math.max(0.4, Math.min(1.3, enemyCapacity > 0 ? Number(enemyEtherValue) / enemyCapacity : 1));

  return {
    handDisabled,
    playerEtherValue,
    playerEtherSlots,
    enemyEtherValue,
    playerEnergyBudget,
    remainingEnergy,
    insightLevelSelect,
    insightVisible,
    enemyWillOverdrivePlan,
    canRevealOverdrive,
    enemyOverdriveVisible,
    enemyOverdriveLabel,
    netFinalEther,
    enemyCapacity,
    enemySoulScale
  };
}
