/**
 * @file effect-core.ts
 * @description 효과 시스템 공통 코어
 *
 * 게임과 시뮬레이터가 공유하는 효과 처리 함수들
 * 외부 의존성 없음 (React, Zustand, logger 등 금지)
 *
 * 주요 원칙:
 * 1. 모든 함수는 순수 함수
 * 2. 효과 정의는 외부에서 주입
 * 3. 상태 변형 금지 (새 객체 반환)
 */

import type { UnifiedTokenState } from './types';
import { addTokenSimple, removeTokenSimple, hasToken, getTokenStacks } from './token-core';

// ==================== 타입 정의 ====================

/** 효과 타겟 */
export type EffectTarget = 'self' | 'enemy' | 'all_enemies' | 'random_enemy';

/** 효과 트리거 시점 */
export type EffectTrigger =
  | 'onPlay'           // 카드 사용 시
  | 'onAttack'         // 공격 시
  | 'onDefend'         // 방어 시
  | 'onHit'            // 피해 적중 시
  | 'onTakeDamage'     // 피해 받을 때
  | 'onKill'           // 처치 시
  | 'onDeath'          // 사망 시
  | 'onTurnStart'      // 턴 시작 시
  | 'onTurnEnd'        // 턴 종료 시
  | 'onDraw'           // 카드 드로우 시
  | 'onDiscard'        // 카드 버릴 때
  | 'onExhaust'        // 카드 소진 시
  | 'onHeal'           // 회복 시
  | 'onBlock'          // 방어력 획득 시
  | 'onCrit'           // 치명타 시
  | 'onDodge'          // 회피 시
  | 'onCounter';       // 반격 시

/** 효과 정의 */
export interface EffectDefinition {
  id: string;
  trigger: EffectTrigger;
  target: EffectTarget;
  /** 효과 동작 */
  action: EffectAction;
  /** 조건 (선택적) */
  condition?: EffectCondition;
  /** 1회성 효과 여부 */
  consumable?: boolean;
}

/** 효과 동작 */
export type EffectAction =
  | { type: 'addToken'; tokenId: string; stacks: number }
  | { type: 'removeToken'; tokenId: string; stacks: number }
  | { type: 'damage'; amount: number; ignoreBlock?: boolean }
  | { type: 'heal'; amount: number }
  | { type: 'block'; amount: number }
  | { type: 'draw'; count: number }
  | { type: 'discard'; count: number }
  | { type: 'energy'; amount: number }
  | { type: 'custom'; id: string; params?: Record<string, unknown> };

/** 효과 조건 */
export type EffectCondition =
  | { type: 'hasToken'; tokenId: string; minStacks?: number }
  | { type: 'noToken'; tokenId: string }
  | { type: 'hpBelow'; percent: number }
  | { type: 'hpAbove'; percent: number }
  | { type: 'blockAbove'; amount: number }
  | { type: 'turnCount'; min?: number; max?: number }
  | { type: 'cardType'; cardType: string }
  | { type: 'and'; conditions: EffectCondition[] }
  | { type: 'or'; conditions: EffectCondition[] }
  | { type: 'custom'; id: string; params?: Record<string, unknown> };

/** 효과 컨텍스트 */
export interface EffectContext {
  /** 효과 시전자 토큰 */
  sourceTokens: UnifiedTokenState;
  /** 효과 대상 토큰 */
  targetTokens: UnifiedTokenState;
  /** 현재 HP */
  currentHp: number;
  /** 최대 HP */
  maxHp: number;
  /** 현재 방어력 */
  currentBlock: number;
  /** 현재 턴 */
  currentTurn: number;
  /** 현재 에너지 */
  currentEnergy?: number;
  /** 카드 정보 (선택적) */
  cardInfo?: {
    type: string;
    tags?: string[];
  };
}

/** 효과 처리 결과 */
export interface EffectResult {
  /** 변경된 소스 토큰 */
  sourceTokens: UnifiedTokenState;
  /** 변경된 타겟 토큰 */
  targetTokens: UnifiedTokenState;
  /** HP 변화량 (음수: 피해, 양수: 회복) */
  hpChange: number;
  /** 방어력 변화량 */
  blockChange: number;
  /** 에너지 변화량 */
  energyChange: number;
  /** 드로우할 카드 수 */
  drawCount: number;
  /** 버릴 카드 수 */
  discardCount: number;
  /** 효과 로그 */
  logs: string[];
  /** 효과 발동 여부 */
  triggered: boolean;
}

// ==================== 조건 검사 ====================

/**
 * 효과 조건 검사
 */
export function checkCondition(
  condition: EffectCondition,
  context: EffectContext
): boolean {
  switch (condition.type) {
    case 'hasToken':
      return getTokenStacks(context.targetTokens, condition.tokenId) >= (condition.minStacks || 1);

    case 'noToken':
      return !hasToken(context.targetTokens, condition.tokenId);

    case 'hpBelow':
      return (context.currentHp / context.maxHp) * 100 < condition.percent;

    case 'hpAbove':
      return (context.currentHp / context.maxHp) * 100 > condition.percent;

    case 'blockAbove':
      return context.currentBlock > condition.amount;

    case 'turnCount':
      if (condition.min !== undefined && context.currentTurn < condition.min) return false;
      if (condition.max !== undefined && context.currentTurn > condition.max) return false;
      return true;

    case 'cardType':
      return context.cardInfo?.type === condition.cardType;

    case 'and':
      return condition.conditions.every(c => checkCondition(c, context));

    case 'or':
      return condition.conditions.some(c => checkCondition(c, context));

    case 'custom':
      // 커스텀 조건은 외부에서 처리
      return true;

    default:
      return true;
  }
}

// ==================== 효과 처리 ====================

/**
 * 단일 효과 처리
 */
export function processEffect(
  effect: EffectDefinition,
  context: EffectContext
): EffectResult {
  const result: EffectResult = {
    sourceTokens: { ...context.sourceTokens },
    targetTokens: { ...context.targetTokens },
    hpChange: 0,
    blockChange: 0,
    energyChange: 0,
    drawCount: 0,
    discardCount: 0,
    logs: [],
    triggered: false,
  };

  // 조건 검사
  if (effect.condition && !checkCondition(effect.condition, context)) {
    return result;
  }

  result.triggered = true;
  const action = effect.action;

  switch (action.type) {
    case 'addToken':
      if (effect.target === 'self') {
        result.sourceTokens = addTokenSimple(result.sourceTokens, action.tokenId, action.stacks);
      } else {
        result.targetTokens = addTokenSimple(result.targetTokens, action.tokenId, action.stacks);
      }
      result.logs.push(`${action.tokenId} ${action.stacks}스택 추가`);
      break;

    case 'removeToken':
      if (effect.target === 'self') {
        result.sourceTokens = removeTokenSimple(result.sourceTokens, action.tokenId, action.stacks);
      } else {
        result.targetTokens = removeTokenSimple(result.targetTokens, action.tokenId, action.stacks);
      }
      result.logs.push(`${action.tokenId} ${action.stacks}스택 제거`);
      break;

    case 'damage':
      result.hpChange = -action.amount;
      result.logs.push(`${action.amount} 피해`);
      break;

    case 'heal':
      result.hpChange = action.amount;
      result.logs.push(`${action.amount} 회복`);
      break;

    case 'block':
      result.blockChange = action.amount;
      result.logs.push(`방어력 ${action.amount} 획득`);
      break;

    case 'draw':
      result.drawCount = action.count;
      result.logs.push(`${action.count}장 드로우`);
      break;

    case 'discard':
      result.discardCount = action.count;
      result.logs.push(`${action.count}장 버림`);
      break;

    case 'energy':
      result.energyChange = action.amount;
      result.logs.push(`에너지 ${action.amount > 0 ? '+' : ''}${action.amount}`);
      break;

    case 'custom':
      result.logs.push(`커스텀 효과: ${action.id}`);
      break;
  }

  return result;
}

/**
 * 다중 효과 처리
 */
export function processEffects(
  effects: EffectDefinition[],
  trigger: EffectTrigger,
  context: EffectContext
): EffectResult {
  const result: EffectResult = {
    sourceTokens: { ...context.sourceTokens },
    targetTokens: { ...context.targetTokens },
    hpChange: 0,
    blockChange: 0,
    energyChange: 0,
    drawCount: 0,
    discardCount: 0,
    logs: [],
    triggered: false,
  };

  // 해당 트리거의 효과만 필터링
  const relevantEffects = effects.filter(e => e.trigger === trigger);

  for (const effect of relevantEffects) {
    const effectContext: EffectContext = {
      ...context,
      sourceTokens: result.sourceTokens,
      targetTokens: result.targetTokens,
    };

    const effectResult = processEffect(effect, effectContext);

    if (effectResult.triggered) {
      result.triggered = true;
      result.sourceTokens = effectResult.sourceTokens;
      result.targetTokens = effectResult.targetTokens;
      result.hpChange += effectResult.hpChange;
      result.blockChange += effectResult.blockChange;
      result.energyChange += effectResult.energyChange;
      result.drawCount += effectResult.drawCount;
      result.discardCount += effectResult.discardCount;
      result.logs.push(...effectResult.logs);
    }
  }

  return result;
}

// ==================== 특수 효과 처리 ====================

/** 반격 효과 처리 */
export interface CounterEffectResult {
  damage: number;
  newTokens: UnifiedTokenState;
  triggered: boolean;
}

/**
 * 반격 효과 처리
 */
export function processCounterEffect(
  defenderTokens: UnifiedTokenState,
  baseDamage: number = 4
): CounterEffectResult {
  // 반격+ 우선
  if (hasToken(defenderTokens, 'counterPlus')) {
    return {
      damage: baseDamage * 2,
      newTokens: removeTokenSimple(defenderTokens, 'counterPlus', 1),
      triggered: true,
    };
  }

  if (hasToken(defenderTokens, 'counter')) {
    return {
      damage: baseDamage,
      newTokens: removeTokenSimple(defenderTokens, 'counter', 1),
      triggered: true,
    };
  }

  return {
    damage: 0,
    newTokens: defenderTokens,
    triggered: false,
  };
}

/**
 * 대응사격 효과 처리
 */
export function processCounterShotEffect(
  defenderTokens: UnifiedTokenState,
  baseDamage: number = 8
): CounterEffectResult & { rouletteAdded: boolean } {
  if (hasToken(defenderTokens, 'counterShot')) {
    let newTokens = removeTokenSimple(defenderTokens, 'counterShot', 1);
    // 룰렛 스택 증가
    newTokens = addTokenSimple(newTokens, 'roulette', 1);

    return {
      damage: baseDamage,
      newTokens,
      triggered: true,
      rouletteAdded: true,
    };
  }

  return {
    damage: 0,
    newTokens: defenderTokens,
    triggered: false,
    rouletteAdded: false,
  };
}

/**
 * 가시 효과 처리 (공격받을 때 반사 피해)
 */
export function processThornEffect(
  defenderTokens: UnifiedTokenState,
  damagePerStack: number = 2
): { damage: number } {
  const thornStacks = getTokenStacks(defenderTokens, 'thorns');
  return { damage: thornStacks * damagePerStack };
}

// ==================== 패시브 효과 ====================

/**
 * 턴 시작 패시브 효과 처리
 */
export function processTurnStartPassives(
  tokens: UnifiedTokenState
): { hpChange: number; newTokens: UnifiedTokenState; logs: string[] } {
  let hpChange = 0;
  let newTokens = { ...tokens };
  const logs: string[] = [];

  // 재생: 스택당 2 회복
  const regenStacks = getTokenStacks(newTokens, 'regen');
  if (regenStacks > 0) {
    const heal = regenStacks * 2;
    hpChange += heal;
    newTokens = removeTokenSimple(newTokens, 'regen', 1);
    logs.push(`재생으로 ${heal} 회복`);
  }

  // 화상: 스택당 3 피해
  const burnStacks = getTokenStacks(newTokens, 'burn');
  if (burnStacks > 0) {
    const damage = burnStacks * 3;
    hpChange -= damage;
    newTokens = removeTokenSimple(newTokens, 'burn', 1);
    logs.push(`화상으로 ${damage} 피해`);
  }

  return { hpChange, newTokens, logs };
}

/**
 * 턴 종료 패시브 효과 처리
 */
export function processTurnEndPassives(
  tokens: UnifiedTokenState
): { hpChange: number; newTokens: UnifiedTokenState; logs: string[] } {
  let hpChange = 0;
  let newTokens = { ...tokens };
  const logs: string[] = [];

  // 독: 스택당 2 피해
  const poisonStacks = getTokenStacks(newTokens, 'poison');
  if (poisonStacks > 0) {
    const damage = poisonStacks * 2;
    hpChange -= damage;
    newTokens = removeTokenSimple(newTokens, 'poison', 1);
    logs.push(`독으로 ${damage} 피해`);
  }

  return { hpChange, newTokens, logs };
}

// ==================== 유틸리티 ====================

/**
 * 효과 결과 병합
 */
export function mergeEffectResults(results: EffectResult[]): EffectResult {
  return results.reduce(
    (acc, result) => ({
      sourceTokens: result.sourceTokens, // 마지막 값 사용
      targetTokens: result.targetTokens,
      hpChange: acc.hpChange + result.hpChange,
      blockChange: acc.blockChange + result.blockChange,
      energyChange: acc.energyChange + result.energyChange,
      drawCount: acc.drawCount + result.drawCount,
      discardCount: acc.discardCount + result.discardCount,
      logs: [...acc.logs, ...result.logs],
      triggered: acc.triggered || result.triggered,
    }),
    {
      sourceTokens: {},
      targetTokens: {},
      hpChange: 0,
      blockChange: 0,
      energyChange: 0,
      drawCount: 0,
      discardCount: 0,
      logs: [],
      triggered: false,
    }
  );
}

/**
 * 빈 효과 결과 생성
 */
export function createEmptyEffectResult(context: EffectContext): EffectResult {
  return {
    sourceTokens: { ...context.sourceTokens },
    targetTokens: { ...context.targetTokens },
    hpChange: 0,
    blockChange: 0,
    energyChange: 0,
    drawCount: 0,
    discardCount: 0,
    logs: [],
    triggered: false,
  };
}
