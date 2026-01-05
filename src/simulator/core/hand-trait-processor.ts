/**
 * @file hand-trait-processor.ts
 * @description 핸드 생성 특성 처리 시스템
 *
 * 다음 턴 효과 및 카드 특성을 처리합니다:
 * - repeat: 다음 턴에 같은 카드가 손패에 보장됨
 * - ruin: 다음 턴에 주특기만 드로우
 * - warmup: 해당 카드 사용 시 다음 턴 에너지 +N
 * - oblivion: 에테르 획득 차단
 * - escape: 도주 금지 상태에서 손패에서 제외
 * - exhaust: 사용 후 소멸 (덱에서 완전 제거)
 */

import type { GameCard, PlayerState, GameBattleState } from './game-types';

// ==================== 타입 정의 ====================

export interface NextTurnEffects {
  /** 교차 시 상대 카드 파괴 */
  destroyOverlappingCard?: boolean;
  /** 크리티컬 보장 */
  guaranteedCrit?: boolean;
  /** 카드 회수 */
  recallCard?: boolean;
  /** 긴급 드로우 수 */
  emergencyDraw?: number;
  /** 펜싱 피해 보너스 */
  fencingDamageBonus?: number;
  /** 추가 카드 플레이 수 */
  extraCardPlay?: number;
  /** 보너스 에너지 */
  bonusEnergy?: number;
  /** 최대 속도 보너스 */
  maxSpeedBonus?: number;
  /** 보장된 카드 ID 목록 (repeat 특성) */
  guaranteedCards?: string[];
  /** 에너지 페널티 */
  energyPenalty?: number;
  /** 에테르 차단 (oblivion) */
  etherBlocked?: boolean;
  /** 주특기만 드로우 (ruin) */
  mainSpecialOnly?: boolean;
  /** 부특기 강화 */
  subSpecialBoost?: number;
  /** 다음 턴 방어력 */
  blockNextTurn?: number;
  /** 다음 턴 치유 */
  healNextTurn?: number;
  /** 다음 턴 에너지 */
  energyNextTurn?: number;
}

export interface HandGenerationConfig {
  /** 기본 드로우 수 */
  baseDrawCount: number;
  /** 드로우 보너스 */
  drawBonus: number;
  /** 도주 금지 카드 목록 */
  escapeBan: Set<string>;
  /** 소멸된 카드 목록 */
  vanishedCards: Set<string>;
  /** 주특기 ID 목록 */
  mainSpecialIds: string[];
  /** 부특기 ID 목록 */
  subSpecialIds: string[];
}

export interface HandGenerationResult {
  /** 최종 손패 */
  hand: string[];
  /** 남은 덱 */
  deck: string[];
  /** 무덤 */
  discard: string[];
  /** 리셔플 발생 여부 */
  reshuffled: boolean;
  /** 적용된 효과 로그 */
  effectsApplied: string[];
}

// ==================== 특성 체크 함수 ====================

/**
 * 카드가 특정 특성을 가지고 있는지 확인
 */
export function hasTrait(card: GameCard | undefined, trait: string): boolean {
  return card?.traits?.includes(trait) ?? false;
}

/**
 * 특정 special 효과를 가지고 있는지 확인
 */
export function hasSpecial(card: GameCard | undefined, special: string): boolean {
  if (!card?.special) return false;
  if (typeof card.special === 'string') {
    return card.special === special;
  }
  if (Array.isArray(card.special)) {
    return card.special.includes(special);
  }
  return false;
}

// ==================== 다음 턴 효과 처리 ====================

/**
 * 카드 사용 후 다음 턴 효과 수집
 */
export function collectNextTurnEffects(
  cards: GameCard[],
  currentEffects: NextTurnEffects = {}
): NextTurnEffects {
  const effects: NextTurnEffects = { ...currentEffects };

  for (const card of cards) {
    // repeat 특성: 다음 턴에 같은 카드 보장
    if (hasTrait(card, 'repeat')) {
      effects.guaranteedCards = effects.guaranteedCards || [];
      if (!effects.guaranteedCards.includes(card.id)) {
        effects.guaranteedCards.push(card.id);
      }
    }

    // ruin 특성: 다음 턴에 주특기만 드로우
    if (hasTrait(card, 'ruin')) {
      effects.mainSpecialOnly = true;
    }

    // warmup 특성: 다음 턴 에너지 증가
    if (hasTrait(card, 'warmup')) {
      const warmupValue = 1; // 기본 1 에너지
      effects.bonusEnergy = (effects.bonusEnergy || 0) + warmupValue;
    }

    // oblivion 특성: 에테르 획득 차단
    if (hasTrait(card, 'oblivion')) {
      effects.etherBlocked = true;
    }

    // preparation 특성: 다음 턴 방어력
    if (hasTrait(card, 'preparation')) {
      const prepValue = card.block || 5;
      effects.blockNextTurn = (effects.blockNextTurn || 0) + prepValue;
    }

    // recovery 특성: 다음 턴 치유
    if (hasTrait(card, 'recovery')) {
      effects.healNextTurn = (effects.healNextTurn || 0) + 3;
    }
  }

  return effects;
}

/**
 * 턴 시작 시 다음 턴 효과 적용
 */
export function applyNextTurnEffects(
  player: PlayerState,
  effects: NextTurnEffects
): { player: PlayerState; logs: string[] } {
  const logs: string[] = [];
  let updatedPlayer = { ...player };

  // 보너스 에너지 적용
  if (effects.bonusEnergy && effects.bonusEnergy > 0) {
    updatedPlayer.energy = (updatedPlayer.energy || 0) + effects.bonusEnergy;
    logs.push(`준비 효과: 에너지 +${effects.bonusEnergy}`);
  }

  // 에너지 페널티 적용
  if (effects.energyPenalty && effects.energyPenalty > 0) {
    updatedPlayer.energy = Math.max(0, (updatedPlayer.energy || 0) - effects.energyPenalty);
    logs.push(`페널티 효과: 에너지 -${effects.energyPenalty}`);
  }

  // 다음 턴 방어력 적용
  if (effects.blockNextTurn && effects.blockNextTurn > 0) {
    updatedPlayer.block = (updatedPlayer.block || 0) + effects.blockNextTurn;
    logs.push(`준비 효과: 방어력 +${effects.blockNextTurn}`);
  }

  // 다음 턴 치유 적용
  if (effects.healNextTurn && effects.healNextTurn > 0) {
    const maxHp = updatedPlayer.maxHp || 100;
    const heal = Math.min(effects.healNextTurn, maxHp - updatedPlayer.hp);
    updatedPlayer.hp = updatedPlayer.hp + heal;
    if (heal > 0) {
      logs.push(`회복 효과: HP +${heal}`);
    }
  }

  // 최대 속도 보너스 적용
  if (effects.maxSpeedBonus && effects.maxSpeedBonus > 0) {
    updatedPlayer.maxSpeed = (updatedPlayer.maxSpeed || 30) + effects.maxSpeedBonus;
    logs.push(`속도 효과: 최대 속도 +${effects.maxSpeedBonus}`);
  }

  return { player: updatedPlayer, logs };
}

// ==================== 핸드 생성 ====================

/**
 * 다음 턴 핸드 생성
 */
export function generateNextHand(
  currentDeck: string[],
  currentDiscard: string[],
  effects: NextTurnEffects,
  config: HandGenerationConfig,
  cards: Record<string, GameCard>
): HandGenerationResult {
  const effectsApplied: string[] = [];
  let hand: string[] = [];
  let deck = [...currentDeck];
  let discard = [...currentDiscard];
  let reshuffled = false;

  // 1. 보장된 카드 추가 (repeat 특성)
  if (effects.guaranteedCards && effects.guaranteedCards.length > 0) {
    for (const cardId of effects.guaranteedCards) {
      // 덱이나 무덤에서 해당 카드 찾기
      let found = false;

      const deckIndex = deck.indexOf(cardId);
      if (deckIndex !== -1) {
        deck.splice(deckIndex, 1);
        hand.push(cardId);
        found = true;
      }

      if (!found) {
        const discardIndex = discard.indexOf(cardId);
        if (discardIndex !== -1) {
          discard.splice(discardIndex, 1);
          hand.push(cardId);
          found = true;
        }
      }

      if (found) {
        effectsApplied.push(`반복 효과: ${cardId} 손패에 추가`);
      }
    }
  }

  // 2. 주특기만 드로우 (ruin 특성)
  if (effects.mainSpecialOnly) {
    // 주특기만 드로우
    const mainSpecialsInDeck = deck.filter(id => config.mainSpecialIds.includes(id));
    const mainSpecialsInDiscard = discard.filter(id => config.mainSpecialIds.includes(id));

    // 주특기를 무덤에서 손패로
    for (const cardId of mainSpecialsInDiscard) {
      hand.push(cardId);
      discard = discard.filter(id => id !== cardId);
    }

    // 주특기를 덱에서 손패로
    for (const cardId of mainSpecialsInDeck) {
      hand.push(cardId);
      deck = deck.filter(id => id !== cardId);
    }

    effectsApplied.push('파탄 효과: 주특기만 드로우');

    return {
      hand,
      deck,
      discard,
      reshuffled: false,
      effectsApplied,
    };
  }

  // 3. 일반 드로우
  const drawCount = config.baseDrawCount + config.drawBonus - hand.length;

  if (drawCount > 0) {
    // 덱이 부족하면 무덤 리셔플
    if (deck.length < drawCount && discard.length > 0) {
      // 무덤을 덱으로 셔플
      const shuffled = [...discard].sort(() => Math.random() - 0.5);
      deck = [...deck, ...shuffled];
      discard = [];
      reshuffled = true;
      effectsApplied.push('덱 리셔플');
    }

    // 드로우
    for (let i = 0; i < drawCount && deck.length > 0; i++) {
      const cardId = deck.shift()!;
      const card = cards[cardId];

      // escape 특성 체크
      if (card && hasTrait(card, 'escape') && config.escapeBan.has(cardId)) {
        discard.push(cardId);
        effectsApplied.push(`도주 금지: ${cardId} 무덤으로`);
        i--; // 다시 드로우 시도
        continue;
      }

      // 소멸 카드 체크
      if (config.vanishedCards.has(cardId)) {
        continue;
      }

      hand.push(cardId);
    }
  }

  return {
    hand,
    deck,
    discard,
    reshuffled,
    effectsApplied,
  };
}

// ==================== 소멸 처리 ====================

/**
 * 카드 소멸 처리 (exhaust 특성)
 */
export function processExhaust(
  card: GameCard,
  vanishedCards: Set<string>
): { vanished: boolean; newVanishedCards: Set<string> } {
  if (hasTrait(card, 'exhaust')) {
    const newSet = new Set(vanishedCards);
    newSet.add(card.id);
    return { vanished: true, newVanishedCards: newSet };
  }
  return { vanished: false, newVanishedCards: vanishedCards };
}

/**
 * 턴 종료 시 효과 초기화
 */
export function resetNextTurnEffects(): NextTurnEffects {
  return {};
}

// ==================== 드로우 감소 이변 ====================

/**
 * 드로우 감소 이변 적용
 */
export function applyDrawReduction(
  baseDrawCount: number,
  drawReduction: number
): number {
  return Math.max(1, baseDrawCount - drawReduction);
}
