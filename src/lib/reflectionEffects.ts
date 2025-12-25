/**
 * @file reflectionEffects.ts
 * @description 성찰 효과 처리 유틸리티
 *
 * ## 발동 조건
 * - 매 턴 시작 시 확률 발동
 * - 자아(ego) 보유 시 해당 성찰 활성화
 * - 개성 5개 초과 시 확률 보너스
 */

import {
  REFLECTIONS,
  REFLECTION_EFFECT_TYPES,
  getReflectionsByEgos,
  getTraitCountBonus
} from '../data/reflections.js';
import { addToken } from './tokenUtils';

interface TokenState {
  usage: unknown[];
  turn: unknown[];
  permanent: unknown[];
  [key: string]: unknown[];
}

interface Player {
  egos?: string[];
  traits?: string[];
  hp?: number;
  maxHp?: number;
  tokens?: TokenState;
  [key: string]: unknown;
}

interface BattleState {
  reflectionTriggerCounts?: Record<string, number>;
  bonusEnergy?: number;
  etherMultiplier?: number;
  timelineBonus?: number;
  enemyFreezeTurns?: number;
  [key: string]: unknown;
}

interface ReflectionEffect {
  type: string;
  tokenId?: string;
  stacks?: number;
  value?: number;
}

interface Reflection {
  id: string;
  name: string;
  probability: number;
  maxTriggers?: number;
  effect: ReflectionEffect;
}

interface EffectResult {
  updatedPlayer: Player;
  updatedBattleState: BattleState;
  description: string;
}

interface ProcessedEffect {
  reflectionId: string;
  reflectionName: string;
  updatedPlayer: Player;
  updatedBattleState: BattleState;
  description: string;
}

interface ProcessReflectionsResult {
  updatedPlayer: Player;
  updatedBattleState: BattleState;
  effects: ProcessedEffect[];
  logs: string[];
}

interface InitialReflectionState {
  reflectionTriggerCounts: Record<string, number>;
  bonusEnergy: number;
  etherMultiplier: number;
  timelineBonus: number;
  enemyFreezeTurns: number;
}

/**
 * 턴 시작 시 성찰 효과 처리
 */
export function processReflections(
  player: Player,
  battleState: BattleState = {},
  turnNumber: number = 1
): ProcessReflectionsResult {
  const results: ProcessReflectionsResult = {
    updatedPlayer: { ...player },
    updatedBattleState: { ...battleState },
    effects: [],
    logs: []
  };

  // 자아가 없으면 성찰 불가
  const egos = player.egos || [];
  if (egos.length === 0) {
    return results;
  }

  // 획득한 자아에 해당하는 성찰만 활성화
  const activeReflections = getReflectionsByEgos(egos) as Reflection[];
  if (activeReflections.length === 0) {
    return results;
  }

  // 개성 수에 따른 확률 보너스
  const traits = player.traits || [];
  const probabilityBonus = getTraitCountBonus(traits.length);

  // 발동 횟수 추적 (결의 등 최대 횟수 제한용)
  const triggerCounts: Record<string, number> = { ...(battleState.reflectionTriggerCounts || {}) };

  for (const reflection of activeReflections) {
    // 최대 발동 횟수 체크
    if (reflection.maxTriggers) {
      const currentCount = triggerCounts[reflection.id] || 0;
      if (currentCount >= reflection.maxTriggers) {
        continue; // 최대 횟수 도달
      }
    }

    // 확률 판정
    const finalProbability = reflection.probability + probabilityBonus;
    const roll = Math.random();

    if (roll < finalProbability) {
      // 성찰 발동!
      const effectResult = applyReflectionEffect(
        reflection,
        results.updatedPlayer,
        results.updatedBattleState,
        turnNumber
      );

      results.updatedPlayer = effectResult.updatedPlayer;
      results.updatedBattleState = effectResult.updatedBattleState;
      results.effects.push({
        reflectionId: reflection.id,
        reflectionName: reflection.name,
        ...effectResult
      });

      const logMsg = `✨ ${reflection.name} 발동! ${effectResult.description}`;
      results.logs.push(logMsg);

      // 발동 횟수 증가
      triggerCounts[reflection.id] = (triggerCounts[reflection.id] || 0) + 1;
    }
  }

  results.updatedBattleState.reflectionTriggerCounts = triggerCounts;

  return results;
}

/**
 * 개별 성찰 효과 적용
 */
function applyReflectionEffect(
  reflection: Reflection,
  player: Player,
  battleState: BattleState,
  turnNumber: number = 1
): EffectResult {
  const { effect } = reflection;
  let updatedPlayer: Player = { ...player };
  let updatedBattleState: BattleState = { ...battleState };
  let description = '';

  switch (effect.type) {
    case REFLECTION_EFFECT_TYPES.ADD_TOKEN: {
      // 턴 시작 시 부여되는 토큰은 SP 0에서 부여됨
      const grantedAt = { turn: turnNumber, sp: 0 };
      const tokenResult = addToken(updatedPlayer, effect.tokenId!, effect.stacks || 1, grantedAt);
      updatedPlayer.tokens = tokenResult.tokens;
      description = `${effect.tokenId} ${effect.stacks}스택 획득`;
      break;
    }

    case REFLECTION_EFFECT_TYPES.ENERGY_BOOST: {
      // 이번 턴 추가 행동력
      updatedBattleState.bonusEnergy = (updatedBattleState.bonusEnergy || 0) + (effect.value || 0);
      description = `행동력 +${effect.value}`;
      break;
    }

    case REFLECTION_EFFECT_TYPES.HEAL_PERCENT: {
      const maxHp = updatedPlayer.maxHp || 100;
      const healAmount = Math.floor(maxHp * (effect.value || 0));
      updatedPlayer.hp = Math.min(maxHp, (updatedPlayer.hp || 0) + healAmount);
      description = `체력 ${healAmount} 회복`;
      break;
    }

    case REFLECTION_EFFECT_TYPES.ETHER_MULTIPLIER: {
      // 이번 턴 에테르 배율
      updatedBattleState.etherMultiplier = (updatedBattleState.etherMultiplier || 1) * (effect.value || 1);
      description = `에테르 획득 ${effect.value}배`;
      break;
    }

    case REFLECTION_EFFECT_TYPES.TIMELINE_BOOST: {
      // 이번 턴 타임라인 최대치 증가
      updatedBattleState.timelineBonus = (updatedBattleState.timelineBonus || 0) + (effect.value || 0);
      description = `타임라인 +${effect.value}`;
      break;
    }

    case REFLECTION_EFFECT_TYPES.CARD_FREEZE: {
      // 적 타임라인 동결
      updatedBattleState.enemyFreezeTurns = (updatedBattleState.enemyFreezeTurns || 0) + (effect.value || 0);
      description = `적 타임라인 ${effect.value}턴 동결`;
      break;
    }

    default:
      description = '알 수 없는 효과';
  }

  return { updatedPlayer, updatedBattleState, description };
}

/**
 * 전투 시작 시 성찰 상태 초기화
 */
export function initReflectionState(): InitialReflectionState {
  return {
    reflectionTriggerCounts: {},
    bonusEnergy: 0,
    etherMultiplier: 1,
    timelineBonus: 0,
    enemyFreezeTurns: 0
  };
}

/**
 * 턴 종료 시 성찰 관련 턴 효과 초기화
 */
export function resetTurnReflectionEffects(battleState: BattleState): BattleState {
  return {
    ...battleState,
    bonusEnergy: 0,
    etherMultiplier: 1,
    timelineBonus: 0
    // enemyFreezeTurns는 턴마다 1씩 감소
  };
}

/**
 * 적 동결 턴 감소
 */
export function decreaseEnemyFreeze(battleState: BattleState): BattleState {
  if (!battleState.enemyFreezeTurns || battleState.enemyFreezeTurns <= 0) {
    return battleState;
  }

  return {
    ...battleState,
    enemyFreezeTurns: battleState.enemyFreezeTurns - 1
  };
}
