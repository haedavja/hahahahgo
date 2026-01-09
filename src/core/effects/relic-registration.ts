/**
 * @file relic-registration.ts
 * @description 상징 효과를 EffectRegistry에 등록
 *
 * ## 마이그레이션 전략
 * - 기존 relicEffects.ts 함수들과 병행 사용
 * - 점진적으로 EffectRegistry.execute() 호출로 전환
 * - 새로운 상징은 이 파일에서 등록
 *
 * ## 효과 타입 매핑
 * - PASSIVE → 별도 처리 (calculatePassiveEffects)
 * - ON_COMBAT_START → ON_COMBAT_START
 * - ON_TURN_START → TURN_START
 * - ON_TURN_END → TURN_END
 * - ON_DAMAGE_TAKEN → ON_DAMAGE_TAKEN
 * - ON_RELIC_ACTIVATE → ON_RELIC_ACTIVATE
 */

import { EffectRegistry, type EffectTiming, type EffectContext, type EffectResult } from './effects';
import { RELICS } from '../../data/relics';

/** 상징 효과 타입 → EffectTiming 매핑 */
const EFFECT_TYPE_TO_TIMING: Record<string, EffectTiming> = {
  ON_COMBAT_START: 'ON_COMBAT_START',
  ON_COMBAT_END: 'ON_COMBAT_END',
  ON_TURN_START: 'TURN_START',
  ON_TURN_END: 'TURN_END',
  ON_CARD_PLAYED: 'ON_CARD_PLAY',
  ON_DAMAGE_TAKEN: 'ON_DAMAGE_TAKEN',
  ON_RELIC_ACTIVATE: 'ON_RELIC_ACTIVATE',
  ON_SHOP_ENTER: 'ON_SHOP_ENTER',
  ON_SHOP_PURCHASE: 'ON_SHOP_PURCHASE',
};

/**
 * 개별 상징 효과를 EffectResult로 변환하는 핸들러 생성
 */
function createHandler(relicId: string, effects: Record<string, unknown>): (context: EffectContext) => EffectResult {
  return (context: EffectContext): EffectResult => {
    const result: EffectResult = {};

    // ON_DAMAGE_TAKEN 효과
    if (effects.type === 'ON_DAMAGE_TAKEN') {
      if (effects.blockNextTurn) result.blockNextTurn = effects.blockNextTurn as number;
      if (effects.healNextTurn) result.healNextTurn = effects.healNextTurn as number;
      if (effects.strength) result.strength = effects.strength as number;
      if (effects.strengthPerDamage && context.damage) {
        result.strength = (result.strength || 0) + context.damage * (effects.strengthPerDamage as number);
      }
    }

    // ON_RELIC_ACTIVATE 효과
    if (effects.type === 'ON_RELIC_ACTIVATE') {
      if (effects.etherGain) result.etherGain = effects.etherGain as number;
    }

    // ON_COMBAT_START 효과
    if (effects.type === 'ON_COMBAT_START') {
      if (effects.block) result.blockNextTurn = effects.block as number;
      if (effects.strength) result.strength = effects.strength as number;
    }

    // ON_TURN_START 효과 (즉시 적용 필드 사용)
    if (effects.type === 'ON_TURN_START') {
      if (effects.block) result.block = effects.block as number;
      if (effects.heal) result.heal = effects.heal as number;
      if (effects.energy) result.energy = effects.energy as number;
    }

    // ON_TURN_END 효과
    if (effects.type === 'ON_TURN_END') {
      if (effects.strength) result.strength = effects.strength as number;
    }

    // ON_SHOP_ENTER 효과
    if (effects.type === 'ON_SHOP_ENTER') {
      if (effects.discount) result.discount = effects.discount as number;
    }

    // ON_SHOP_PURCHASE 효과
    if (effects.type === 'ON_SHOP_PURCHASE') {
      if (effects.goldGain) result.goldGain = effects.goldGain as number;
    }

    return result;
  };
}

/**
 * 모든 상징을 EffectRegistry에 등록
 * 앱 초기화 시 한 번 호출
 */
export function registerAllRelicEffects(): void {
  const relicsRecord = RELICS as Record<string, { id: string; effects?: Record<string, unknown> }>;

  Object.values(relicsRecord).forEach((relic) => {
    if (!relic.effects || !relic.effects.type) return;

    const effectType = relic.effects.type as string;

    // PASSIVE는 별도 처리 (calculatePassiveEffects 사용)
    if (effectType === 'PASSIVE') return;

    const timing = EFFECT_TYPE_TO_TIMING[effectType];
    if (!timing) return;

    const handler = createHandler(relic.id, relic.effects);
    EffectRegistry.register(relic.id, timing, handler);
  });
}

/**
 * 특정 상징을 EffectRegistry에 등록
 * 동적으로 상징 추가 시 사용
 */
export function registerRelicEffect(
  relicId: string,
  timing: EffectTiming,
  handler: (context: EffectContext) => EffectResult,
  priority: number = 0
): void {
  EffectRegistry.register(relicId, timing, handler, priority);
}

/**
 * 등록 해제
 */
export function unregisterRelicEffect(relicId: string): void {
  EffectRegistry.unregister(relicId);
}

/**
 * 레지스트리 초기화 (테스트용)
 */
export function clearRegistry(): void {
  EffectRegistry.clear();
}

/**
 * 피해 받기 효과 실행 (EffectRegistry 기반)
 * applyDamageTakenEffects의 대체 함수
 */
export function executeDamageTakenEffects(
  relicIds: string[],
  damage: number
): EffectResult {
  return EffectRegistry.execute('ON_DAMAGE_TAKEN', relicIds, { damage });
}

/**
 * 상징 발동 효과 실행 (EffectRegistry 기반)
 * applyRelicActivateEffects의 대체 함수
 */
export function executeRelicActivateEffects(
  relicIds: string[],
  triggeredRelics: string[]
): EffectResult {
  return EffectRegistry.execute('ON_RELIC_ACTIVATE', relicIds, { triggeredRelics });
}

/**
 * 전투 시작 효과 실행 (EffectRegistry 기반)
 */
export function executeCombatStartEffects(relicIds: string[]): EffectResult {
  return EffectRegistry.execute('ON_COMBAT_START', relicIds, {});
}

/**
 * 상점 입장 효과 실행 (EffectRegistry 기반)
 */
export function executeShopEnterEffects(relicIds: string[]): EffectResult {
  return EffectRegistry.execute('ON_SHOP_ENTER', relicIds, {});
}

/**
 * 아이템 구매 효과 실행 (EffectRegistry 기반)
 */
export function executeShopPurchaseEffects(
  relicIds: string[],
  purchasedItem: { type: string; id: string; cost: number }
): EffectResult {
  return EffectRegistry.execute('ON_SHOP_PURCHASE', relicIds, { purchasedItem });
}

/**
 * 턴 시작 효과 실행 (EffectRegistry 기반)
 * applyTurnStartEffects의 대체 함수
 */
export function executeTurnStartEffects(relicIds: string[]): EffectResult {
  return EffectRegistry.execute('TURN_START', relicIds, {});
}

/**
 * 턴 종료 효과 실행 (EffectRegistry 기반)
 * applyTurnEndEffects의 대체 함수
 */
export function executeTurnEndEffects(relicIds: string[]): EffectResult {
  return EffectRegistry.execute('TURN_END', relicIds, {});
}

/**
 * 전투 종료 효과 실행 (EffectRegistry 기반)
 */
export function executeCombatEndEffects(relicIds: string[]): EffectResult {
  return EffectRegistry.execute('ON_COMBAT_END', relicIds, {});
}
