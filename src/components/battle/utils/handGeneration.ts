/**
 * @file handGeneration.ts
 * @description 캐릭터 빌드 기반 손패 생성 시스템 + 덱/무덤 시스템
 *
 * 강화 시스템 연동:
 * - CardGrowthState를 받아 카드 스탯에 강화 효과 적용
 * - 강화된 카드는 enhancementLevel, enhancedStats 필드 포함
 */

import type {
  HandCard,
  CharacterBuild,
  NextTurnEffects,
  DrawResult,
  InitializeDeckResult
} from '../../../types';
import type { CardGrowthState } from '../../../state/slices/types';
import { CARDS, DEFAULT_STARTING_DECK } from "../battleData";
import { hasTrait } from "./battleUtils";
import { generateHandUid } from "../../../lib/randomUtils";
import { getEnhancedCard } from "../../../lib/cardEnhancementUtils";

/** 카드 성장 상태 맵 타입 */
type CardGrowthMap = Record<string, CardGrowthState>;

/**
 * Fisher-Yates 셔플 알고리즘
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 카드에 강화 및 특화 효과 적용
 */
function applyEnhancementToCard(card: HandCard, cardGrowth?: CardGrowthMap): HandCard {
  if (!cardGrowth) return card;

  const growth = cardGrowth[card.id];
  if (!growth) return card;

  // 강화도 없고 특화도 없으면 원본 반환
  const hasEnhancement = growth.enhancementLevel && growth.enhancementLevel > 0;
  const hasSpecialization = growth.traits && growth.traits.length > 0;
  if (!hasEnhancement && !hasSpecialization) return card;

  // 기본 결과 객체
  let result: HandCard = { ...card };

  // 강화 효과 적용
  if (hasEnhancement) {
    const enhanced = getEnhancedCard(card as Parameters<typeof getEnhancedCard>[0], growth.enhancementLevel!);

    result = {
      ...result,
      speedCost: enhanced.speedCost,
      actionCost: enhanced.actionCost,
      enhancementLevel: enhanced.enhancementLevel,
      enhancedStats: enhanced.enhancedStats,
    };

    // 선택적 필드들 적용
    if (enhanced.damage !== undefined) result.damage = enhanced.damage;
    if (enhanced.block !== undefined) result.block = enhanced.block;
    if (enhanced.hits !== undefined) result.hits = enhanced.hits;
    if (enhanced.pushAmount !== undefined) result.pushAmount = enhanced.pushAmount;
    if (enhanced.advanceAmount !== undefined) result.advanceAmount = enhanced.advanceAmount;
    if (enhanced.parryRange !== undefined) result.parryRange = enhanced.parryRange;
    if (enhanced.traits !== undefined) result.traits = enhanced.traits as typeof result.traits;
    if (enhanced.description !== undefined) result.description = enhanced.description;
  }

  // 특화 특성 병합 (기존 특성 + 특화 특성)
  // 단, 강화로 제거된 특성은 특화로 다시 추가하지 않음
  if (hasSpecialization) {
    const existingTraits = (result.traits || []) as string[];
    const specializationTraits = growth.traits!;
    // 강화로 제거된 특성 목록
    const removedByEnhancement = result.enhancedStats?.removedTraits || [];
    // 제거된 특성을 제외하고 병합
    const filteredSpecTraits = specializationTraits.filter(t => !removedByEnhancement.includes(t));
    const mergedTraits = [...new Set([...existingTraits, ...filteredSpecTraits])];
    result.traits = mergedTraits as typeof result.traits;
  }

  return result;
}

/**
 * 보유 카드로 덱 초기화
 * @param characterBuild 캐릭터 빌드
 * @param vanishedCards 소멸된 카드 목록
 * @param cardGrowth 카드 성장 상태 (강화 효과 적용용)
 */
export function initializeDeck(
  characterBuild: CharacterBuild | null | undefined,
  vanishedCards: string[] = [],
  cardGrowth?: CardGrowthMap
): InitializeDeckResult {
  if (!characterBuild) return { deck: [], mainSpecialsHand: [] };

  const { mainSpecials = [], subSpecials = [], ownedCards = [] } = characterBuild;
  const vanishedSet = new Set(vanishedCards || []);

  const mainSpecialsHand: HandCard[] = mainSpecials
    .filter(cardId => !vanishedSet.has(cardId))
    .map((cardId, idx) => {
      const card = CARDS.find((c) => c.id === cardId);
      if (!card) return null;
      const handCard = {
        ...card,
        __handUid: generateHandUid(card.id, idx, 'main'),
        __isMainSpecial: true
      } as HandCard;
      return applyEnhancementToCard(handCard, cardGrowth);
    })
    .filter(Boolean) as HandCard[];

  const subSpecialCards: HandCard[] = subSpecials
    .filter(cardId => !vanishedSet.has(cardId))
    .map((cardId, idx) => {
      const card = CARDS.find((c) => c.id === cardId);
      if (!card) return null;
      const handCard = {
        ...card,
        __handUid: generateHandUid(card.id, idx, 'sub'),
        __isSubSpecial: true
      } as HandCard;
      return applyEnhancementToCard(handCard, cardGrowth);
    })
    .filter(Boolean) as HandCard[];

  const usedMainCounts: Record<string, number> = {};
  mainSpecials.forEach(cardId => {
    usedMainCounts[cardId] = (usedMainCounts[cardId] || 0) + 1;
  });
  const usedSubCounts: Record<string, number> = {};
  subSpecials.forEach(cardId => {
    usedSubCounts[cardId] = (usedSubCounts[cardId] || 0) + 1;
  });

  const remainingMainCounts = { ...usedMainCounts };
  const remainingSubCounts = { ...usedSubCounts };

  const ownedCardObjs: HandCard[] = ownedCards
    .filter(cardId => {
      if (vanishedSet.has(cardId)) return false;
      if (remainingMainCounts[cardId] > 0) {
        remainingMainCounts[cardId]--;
        return false;
      }
      if (remainingSubCounts[cardId] > 0) {
        remainingSubCounts[cardId]--;
        return false;
      }
      return true;
    })
    .map((cardId, idx) => {
      const card = CARDS.find((c) => c.id === cardId);
      if (!card) return null;
      const handCard = {
        ...card,
        __handUid: generateHandUid(card.id, idx, 'owned')
      } as HandCard;
      return applyEnhancementToCard(handCard, cardGrowth);
    })
    .filter(Boolean) as HandCard[];

  const shuffledOwned = shuffleArray(ownedCardObjs);
  const deck = [...subSpecialCards, ...shuffledOwned];

  return { deck, mainSpecialsHand };
}

/**
 * 덱에서 카드 드로우
 * @param deck 현재 덱
 * @param discardPile 무덤
 * @param count 드로우 수
 * @param escapeBan 탈주 금지 카드 ID 세트
 * @param vanishedCards 소멸된 카드 ID 목록
 * @param options 드로우 옵션
 * @param options.mainSpecialOnly 주특기만 드로우 (파탄 특성)
 */
export function drawFromDeck(
  deck: HandCard[],
  discardPile: HandCard[],
  count: number,
  escapeBan: Set<string> = new Set(),
  vanishedCards: string[] = [],
  options: { mainSpecialOnly?: boolean } = {}
): DrawResult {
  let currentDeck = [...deck];
  let currentDiscard = [...discardPile];
  let reshuffled = false;
  const vanishedSet = new Set(vanishedCards);
  const { mainSpecialOnly = false } = options;

  // 주특기 카드를 무덤에서 꺼내되, 소멸된 카드는 제외
  const mainSpecialsFromDiscard = currentDiscard.filter(card =>
    card.__isMainSpecial && !vanishedSet.has(card.id)
  );
  currentDiscard = currentDiscard.filter(card => !card.__isMainSpecial);

  // 파탄(ruin) 특성: 주특기만 드로우
  if (mainSpecialOnly) {
    return {
      drawnCards: mainSpecialsFromDiscard,
      newDeck: currentDeck,
      newDiscardPile: currentDiscard,
      reshuffled: false
    };
  }

  if (currentDeck.length < count && currentDiscard.length > 0) {
    const subSpecialsFromDiscard = currentDiscard.filter(card => card.__isSubSpecial);
    const normalCardsFromDiscard = currentDiscard.filter(card => !card.__isSubSpecial);

    const shuffledNormal = shuffleArray(normalCardsFromDiscard);

    currentDeck = [...currentDeck, ...subSpecialsFromDiscard, ...shuffledNormal];
    currentDiscard = [];
    reshuffled = true;
  }

  const drawnFromDeck = currentDeck.slice(0, count).filter(card => {
    if (hasTrait(card, 'escape') && escapeBan.has(card.id)) {
      currentDiscard.push(card);
      return false;
    }
    return true;
  });

  const drawnCards = [...mainSpecialsFromDiscard, ...drawnFromDeck];
  const newDeck = currentDeck.slice(count);

  return {
    drawnCards,
    newDeck,
    newDiscardPile: currentDiscard,
    reshuffled
  };
}

/**
 * 기본 시작 덱으로 손패 생성
 */
export function getDefaultStartingHand(): HandCard[] {
  return DEFAULT_STARTING_DECK
    .map((cardId: string) => CARDS.find((card) => card.id === cardId))
    .filter(Boolean) as HandCard[];
}

/**
 * 캐릭터 빌드를 기반으로 손패 생성 (레거시)
 */
export function drawCharacterBuildHand(
  characterBuild: CharacterBuild | null | undefined,
  nextTurnEffects: NextTurnEffects = {},
  previousHand: HandCard[] = [],
  cardDrawBonus: number = 0,
  escapeBan: Set<string> = new Set(),
  vanishedCards: string[] = []
): HandCard[] {
  if (!characterBuild) return [];

  const { mainSpecials = [], subSpecials = [], ownedCards = [] } = characterBuild;
  const vanishedSet = new Set(vanishedCards || []);

  const allCardIds = [...mainSpecials, ...subSpecials, ...ownedCards];

  return allCardIds
    .filter(cardId => !vanishedSet.has(cardId))
    .map((cardId, idx) => {
      const card = CARDS.find((c) => c.id === cardId);
      if (!card) return null;
      return {
        ...card,
        __handUid: generateHandUid(card.id, idx)
      };
    })
    .filter(Boolean) as HandCard[];
}
