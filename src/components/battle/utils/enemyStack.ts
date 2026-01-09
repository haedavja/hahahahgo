/**
 * @file enemyStack.ts
 * @description 적 스택 시스템 처리 로직
 *
 * ## 스택 시스템 개요
 * - 모든 몬스터가 스택을 보유
 * - 에테르 델타가 적에게 유리할 때 스택 획득
 * - 스택 효과 타입: A(임계점), B(누적), D(변환), F(시한폭탄)
 *
 * ## 스택 획득 조건
 * - 델타값 = 적 에테르 콤보 - 플레이어 에테르 콤보
 * - 델타 > 0 (적 우세) → 적이 에테르 대신 스택 획득
 */

import type { EnemyBattleState, EnemyStackState, StackConfig, StackTriggerEffect } from '../../../types/enemy';
import { ENEMY_STACK_CONFIGS } from '../../../data/enemyPatterns';

const DEFAULT_MAX_STACK = 20;

/**
 * 스택 상태 초기화
 */
export function initializeEnemyStack(enemyId: string): EnemyStackState | undefined {
  const config = ENEMY_STACK_CONFIGS[enemyId];
  if (!config) return undefined;

  return {
    current: 0,
    max: DEFAULT_MAX_STACK,
    config
  };
}

/**
 * 스택 추가 (델타 기반)
 * @param stack 현재 스택 상태
 * @param amount 추가할 스택량
 * @returns 업데이트된 스택 상태
 */
export function addStack(stack: EnemyStackState, amount: number): EnemyStackState {
  const newCurrent = Math.min(stack.current + amount, stack.max);
  return {
    ...stack,
    current: newCurrent
  };
}

/**
 * 스택 소모 (D형 전용)
 * @param stack 현재 스택 상태
 * @param amount 소모할 스택량
 * @returns 업데이트된 스택 상태
 */
export function consumeStack(stack: EnemyStackState, amount: number): EnemyStackState {
  const newCurrent = Math.max(stack.current - amount, 0);
  return {
    ...stack,
    current: newCurrent
  };
}

/**
 * 스택 리셋 (A/B형 발동 후)
 */
export function resetStack(stack: EnemyStackState): EnemyStackState {
  return {
    ...stack,
    current: 0
  };
}

/**
 * F형 자동 스택 증가 (매턴 시작)
 */
export function processAutoGain(stack: EnemyStackState): EnemyStackState {
  if (stack.config.type !== 'F' || !stack.config.autoGain) {
    return stack;
  }
  return addStack(stack, stack.config.autoGain);
}

/**
 * 에테르 델타 기반 스택 증가
 * @param stack 현재 스택 상태
 * @param delta 에테르 델타 (적 콤보 - 플레이어 콤보)
 * @returns 업데이트된 스택 상태
 */
export function processEtherDelta(stack: EnemyStackState, delta: number): EnemyStackState {
  if (delta <= 0) {
    return stack; // 플레이어 우세면 스택 증가 없음
  }
  // 델타값만큼 스택 증가 (1:1 비율, 조정 가능)
  const stackGain = Math.floor(delta / 10); // 에테르 10당 스택 1
  return addStack(stack, stackGain);
}

/**
 * B형 누적 버프 계산
 * @returns 스택당 공격력/방어력 보너스
 */
export function calculateStackBonus(stack: EnemyStackState): { attackBonus: number; blockBonus: number } {
  if (stack.config.type !== 'B' && stack.config.type !== 'A') {
    return { attackBonus: 0, blockBonus: 0 };
  }

  return {
    attackBonus: (stack.config.attackPerStack || 0) * stack.current,
    blockBonus: (stack.config.blockPerStack || 0) * stack.current
  };
}

/**
 * 스택 임계값 도달 여부 확인
 */
export function hasReachedThreshold(stack: EnemyStackState): boolean {
  return stack.current >= stack.config.threshold;
}

/**
 * D형 스택 소모 가능 여부 확인
 */
export function canConsumeStack(stack: EnemyStackState): boolean {
  if (stack.config.type !== 'D') return false;
  const consumeAmount = stack.config.consumeAmount || 5;
  return stack.current >= consumeAmount;
}

/**
 * 스택 효과 발동 처리
 * @returns 발동된 효과와 업데이트된 스택 상태
 */
export function triggerStackEffect(
  stack: EnemyStackState
): { effect: StackTriggerEffect; newStack: EnemyStackState } | null {
  const config = stack.config;

  switch (config.type) {
    case 'A': // 임계점 폭발
      if (hasReachedThreshold(stack)) {
        return {
          effect: config.effect,
          newStack: resetStack(stack)
        };
      }
      break;

    case 'B': // 누적 버프 (임계값 도달 시 리셋 + 추가 효과)
      if (hasReachedThreshold(stack)) {
        return {
          effect: config.effect,
          newStack: resetStack(stack)
        };
      }
      break;

    case 'D': // 변환형 (소모하여 효과)
      if (canConsumeStack(stack)) {
        const consumeAmount = config.consumeAmount || 5;
        return {
          effect: config.effect,
          newStack: consumeStack(stack, consumeAmount)
        };
      }
      break;

    case 'F': // 시한폭탄 (임계값 도달 시 폭발)
      if (hasReachedThreshold(stack)) {
        return {
          effect: config.effect,
          newStack: resetStack(stack)
        };
      }
      break;
  }

  return null;
}

/**
 * 턴 시작 시 스택 처리
 * - F형 자동 증가
 * @returns 업데이트된 스택 상태와 발동할 효과
 */
export function processTurnStartStack(
  stack: EnemyStackState
): { newStack: EnemyStackState; triggeredEffect: StackTriggerEffect | null } {
  // F형 자동 증가
  let newStack = processAutoGain(stack);

  // 효과 발동 체크
  const triggerResult = triggerStackEffect(newStack);
  if (triggerResult) {
    return {
      newStack: triggerResult.newStack,
      triggeredEffect: triggerResult.effect
    };
  }

  return {
    newStack,
    triggeredEffect: null
  };
}

/**
 * 턴 종료 시 스택 처리
 * - 에테르 델타 기반 스택 증가
 * - D형 효과 발동 체크
 */
export function processTurnEndStack(
  stack: EnemyStackState,
  etherDelta: number
): { newStack: EnemyStackState; triggeredEffect: StackTriggerEffect | null } {
  // 델타 기반 스택 증가
  let newStack = processEtherDelta(stack, etherDelta);

  // D형은 턴 종료 시 효과 발동 체크
  if (newStack.config.type === 'D' && canConsumeStack(newStack)) {
    const triggerResult = triggerStackEffect(newStack);
    if (triggerResult) {
      return {
        newStack: triggerResult.newStack,
        triggeredEffect: triggerResult.effect
      };
    }
  }

  return {
    newStack,
    triggeredEffect: null
  };
}

/**
 * 적 상태에서 스택 정보 가져오기
 */
export function getEnemyStackInfo(enemy: EnemyBattleState): {
  current: number;
  threshold: number;
  type: string;
  attackBonus: number;
  blockBonus: number;
} | null {
  if (!enemy.stack) return null;

  const bonus = calculateStackBonus(enemy.stack);

  return {
    current: enemy.stack.current,
    threshold: enemy.stack.config.threshold,
    type: enemy.stack.config.type,
    attackBonus: bonus.attackBonus,
    blockBonus: bonus.blockBonus
  };
}

/**
 * 스택 효과 설명 생성 (UI용)
 */
export function getStackEffectDescription(config: StackConfig): string {
  const typeNames: Record<string, string> = {
    'A': '임계점',
    'B': '누적',
    'D': '변환',
    'F': '시한폭탄'
  };

  let desc = `[${typeNames[config.type]}] `;

  switch (config.type) {
    case 'A':
      desc += `${config.threshold}스택 도달 시 강력한 효과 발동`;
      break;
    case 'B':
      if (config.attackPerStack) {
        desc += `스택당 공격력 +${config.attackPerStack}`;
      }
      if (config.blockPerStack) {
        desc += `, 방어력 +${config.blockPerStack}`;
      }
      desc += ` (${config.threshold}스택 시 리셋)`;
      break;
    case 'D':
      desc += `${config.consumeAmount || 5}스택 소모하여 특수 효과`;
      break;
    case 'F':
      desc += `매턴 +${config.autoGain || 1}, ${config.threshold}스택 시 폭발`;
      break;
  }

  return desc;
}
