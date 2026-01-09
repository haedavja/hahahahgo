/**
 * @file effects.ts
 * @description 효과 시스템 통합 타입 및 레지스트리
 *
 * ## 효과 타이밍
 * - TURN_START: 턴 시작 시
 * - TURN_END: 턴 종료 시
 * - ON_CARD_PLAY: 카드 사용 시
 * - ON_DAMAGE_DEALT: 피해 가할 때
 * - ON_DAMAGE_TAKEN: 피해 받을 때
 * - ON_RELIC_ACTIVATE: 다른 상징 발동 시
 * - ON_COMBAT_START: 전투 시작 시
 * - ON_COMBAT_END: 전투 종료 시
 *
 * ## 유지보수 원칙
 * - 새로운 효과 타이밍 추가 시 EffectTiming에 정의
 * - 핸들러 등록은 EffectRegistry 사용
 */

/**
 * 효과 발동 타이밍
 */
export type EffectTiming =
  | 'TURN_START'
  | 'TURN_END'
  | 'ON_CARD_PLAY'
  | 'ON_DAMAGE_DEALT'
  | 'ON_DAMAGE_TAKEN'
  | 'ON_RELIC_ACTIVATE'
  | 'ON_COMBAT_START'
  | 'ON_COMBAT_END'
  | 'ON_SHOP_ENTER'
  | 'ON_SHOP_PURCHASE';

/**
 * 효과 컨텍스트 (핸들러에 전달되는 정보)
 */
export interface EffectContext {
  /** 피해량 (ON_DAMAGE_DEALT, ON_DAMAGE_TAKEN) */
  damage?: number;
  /** 피해 횟수 (다중 피해) */
  hitCount?: number;
  /** 카드 ID (ON_CARD_PLAY) */
  cardId?: string;
  /** 상점 아이템 (ON_SHOP_PURCHASE) */
  purchasedItem?: { type: string; id: string; cost: number };
  /** 발동한 상징 목록 (ON_RELIC_ACTIVATE) */
  triggeredRelics?: string[];
}

/**
 * 효과 결과
 */
export interface EffectResult {
  /** 다음 턴 방어력 추가 */
  blockNextTurn?: number;
  /** 다음 턴 회복량 추가 */
  healNextTurn?: number;
  /** 힘 추가 */
  strength?: number;
  /** 에테르 추가 */
  etherGain?: number;
  /** 추가 피해 */
  bonusDamage?: number;
  /** 피해 감소 */
  damageReduction?: number;
  /** 할인 (상점) */
  discount?: number;
  /** 골드 획득 */
  goldGain?: number;
}

/**
 * 효과 핸들러 타입
 */
export type EffectHandler = (context: EffectContext) => EffectResult;

/**
 * 등록된 효과
 */
interface RegisteredEffect {
  relicId: string;
  timing: EffectTiming;
  handler: EffectHandler;
  priority: number;
}

/**
 * 효과 레지스트리
 * 중앙 집중식 효과 관리 시스템
 */
class EffectRegistryImpl {
  private effects: Map<EffectTiming, RegisteredEffect[]> = new Map();

  /**
   * 효과 핸들러 등록
   */
  register(
    relicId: string,
    timing: EffectTiming,
    handler: EffectHandler,
    priority: number = 0
  ): void {
    if (!this.effects.has(timing)) {
      this.effects.set(timing, []);
    }
    const list = this.effects.get(timing)!;
    list.push({ relicId, timing, handler, priority });
    list.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 특정 타이밍의 모든 효과 실행
   */
  execute(
    timing: EffectTiming,
    activeRelicIds: string[],
    context: EffectContext
  ): EffectResult {
    const handlers = this.effects.get(timing) || [];
    const activeHandlers = handlers.filter(h => activeRelicIds.includes(h.relicId));

    return activeHandlers.reduce((accumulated, { handler }) => {
      const result = handler(context);
      return this.mergeResults(accumulated, result);
    }, {} as EffectResult);
  }

  /**
   * 결과 병합
   */
  private mergeResults(a: EffectResult, b: EffectResult): EffectResult {
    return {
      blockNextTurn: (a.blockNextTurn || 0) + (b.blockNextTurn || 0),
      healNextTurn: (a.healNextTurn || 0) + (b.healNextTurn || 0),
      strength: (a.strength || 0) + (b.strength || 0),
      etherGain: (a.etherGain || 0) + (b.etherGain || 0),
      bonusDamage: (a.bonusDamage || 0) + (b.bonusDamage || 0),
      damageReduction: (a.damageReduction || 0) + (b.damageReduction || 0),
      discount: (a.discount || 0) + (b.discount || 0),
      goldGain: (a.goldGain || 0) + (b.goldGain || 0),
    };
  }

  /**
   * 특정 상징의 효과 등록 해제
   */
  unregister(relicId: string): void {
    this.effects.forEach((list, timing) => {
      this.effects.set(
        timing,
        list.filter(e => e.relicId !== relicId)
      );
    });
  }

  /**
   * 레지스트리 초기화 (테스트용)
   */
  clear(): void {
    this.effects.clear();
  }
}

/**
 * 전역 효과 레지스트리 인스턴스
 */
export const EffectRegistry = new EffectRegistryImpl();

/**
 * 효과 타이밍별 설명 (디버깅/문서용)
 */
export const EFFECT_TIMING_DESCRIPTIONS: Record<EffectTiming, string> = {
  TURN_START: '턴 시작 시',
  TURN_END: '턴 종료 시',
  ON_CARD_PLAY: '카드 사용 시',
  ON_DAMAGE_DEALT: '피해 가할 때',
  ON_DAMAGE_TAKEN: '피해 받을 때',
  ON_RELIC_ACTIVATE: '다른 상징 발동 시',
  ON_COMBAT_START: '전투 시작 시',
  ON_COMBAT_END: '전투 종료 시',
  ON_SHOP_ENTER: '상점 입장 시',
  ON_SHOP_PURCHASE: '아이템 구매 시',
};
