/**
 * @file shop.js
 * @description 상점 시스템 데이터
 *
 * ## 화폐
 * - 골드(gold)만 사용
 *
 * ## 상점 종류
 * - 고정 상점: 던전 노드
 * - 랜덤 상인: 이벤트
 *
 * @typedef {Object} MerchantType
 * @property {string} id - 상인 ID
 * @property {string} name - 이름
 * @property {Object} stock - 재고 설정
 */

import { RELICS, RELIC_RARITIES } from './relics';
import { ITEMS } from './items';
import { shuffle } from '../lib/randomUtils';

// ==================== 타입 정의 ====================

/** 상인 유형 키 */
export type MerchantTypeKey = 'shop' | 'wanderer' | 'collector' | 'buyer';

/** 아이템 티어 */
export type ItemTier = 1 | 2;

/** 카드 등급 */
export type CardRarity = 'common' | 'rare' | 'special' | 'legendary';

/** 서비스 ID */
export type ServiceId = 'healSmall' | 'healFull' | 'removeCard' | 'upgradeCard' | 'reroll';

// 상징 등급별 가격
export const RELIC_PRICES: Record<string, number> = {
  [RELIC_RARITIES.COMMON]: 60,
  [RELIC_RARITIES.RARE]: 120,
  [RELIC_RARITIES.SPECIAL]: 200,
  [RELIC_RARITIES.LEGENDARY]: 350,
};

// 아이템 티어별 가격
export const ITEM_PRICES: Record<ItemTier, number> = {
  1: 25,  // 소형 아이템
  2: 50,  // 대형 아이템
};

// 카드 등급별 가격
export const CARD_PRICES: Record<CardRarity, number> = {
  common: 15,
  rare: 30,
  special: 50,
  legendary: 80,
};

// 서비스 가격
export const SERVICE_PRICES: Record<ServiceId, number> = {
  healSmall: 30,      // 체력 25% 회복
  healFull: 80,       // 체력 전체 회복
  removeCard: 50,     // 카드 제거
  upgradeCard: 75,    // 카드 업그레이드 (미구현 시 비활성화)
  reroll: 15,         // 상점 새로고침
};

// 전리품 매입 가격 (판매가) - 아이템 원가의 60%
export const SELL_PRICE_MULTIPLIER = 0.6;

/** 상인 설정 인터페이스 */
export interface MerchantConfig {
  id: string;
  name: string;
  emoji: string;
  greeting: string;
  relicSlots: number;
  itemSlots: number;
  cardSlots: number;
  hasServices: boolean;
  canSell: boolean;
  priceMultiplier: number;
  sellPriceMultiplier?: number;
  minRarity?: string;
  minCardRarity?: CardRarity;
}

// 상인 유형별 설정
export const MERCHANT_TYPES: Record<MerchantTypeKey, MerchantConfig> = {
  // 고정 상점 (던전 노드)
  shop: {
    id: 'shop',
    name: '여행 상인',
    emoji: '🏪',
    greeting: '어서 오세요, 모험가여. 무엇이 필요하신가요?',
    relicSlots: 3,      // 상징 3개
    itemSlots: 4,       // 아이템 4개
    cardSlots: 3,       // 카드 3개
    hasServices: true,  // 서비스 제공
    canSell: true,      // 전리품 매입
    priceMultiplier: 1.0,
  },
  // 랜덤 상인 (이벤트)
  wanderer: {
    id: 'wanderer',
    name: '떠돌이 상인',
    emoji: '🎒',
    greeting: '이런 곳에서 손님을 만나다니! 좋은 물건이 있어요.',
    relicSlots: 2,
    itemSlots: 3,
    cardSlots: 2,
    hasServices: false,
    canSell: true,
    priceMultiplier: 0.9,  // 10% 할인
  },
  // 고급 상인 (희귀 이벤트)
  collector: {
    id: 'collector',
    name: '수집가',
    emoji: '🎩',
    greeting: '희귀한 물건만 취급합니다. 눈이 높으시군요.',
    relicSlots: 2,
    itemSlots: 2,
    cardSlots: 2,
    hasServices: false,
    canSell: true,
    priceMultiplier: 1.3,  // 30% 비쌈 (대신 희귀 상징만)
    minRarity: RELIC_RARITIES.RARE,  // 희귀 등급 이상만
    minCardRarity: 'rare',  // 희귀 카드 이상만
  },
  // 전리품 매입 전문 상인
  buyer: {
    id: 'buyer',
    name: '고물상',
    emoji: '💰',
    greeting: '좋은 물건 있으면 비싸게 사드립니다!',
    relicSlots: 0,
    itemSlots: 0,
    cardSlots: 0,
    hasServices: false,
    canSell: true,
    priceMultiplier: 1.0,
    sellPriceMultiplier: 1.2,  // 20% 높은 가격에 매입
  },
};

/** 상인 설정 가져오기 헬퍼 */
function getMerchant(merchantType: string): MerchantConfig {
  if (merchantType in MERCHANT_TYPES) {
    return MERCHANT_TYPES[merchantType as MerchantTypeKey];
  }
  return MERCHANT_TYPES.shop;
}

/** 카드 인터페이스 (상점용) */
interface ShopCard {
  id: string;
  rarity?: CardRarity;
  [key: string]: unknown;
}

/**
 * 랜덤 상점 재고 생성
 * @param merchantType - 상인 유형
 * @param ownedRelics - 이미 보유한 상징 ID 배열
 * @param allCards - 전체 카드 배열 (CARDS)
 * @returns { relics, items, cards }
 */
export function generateShopInventory(
  merchantType: string = 'shop',
  ownedRelics: string[] = [],
  allCards: ShopCard[] = []
) {
  const merchant = getMerchant(merchantType);
  const inventory: {
    relics: Array<{ id: string; price: number }>;
    items: Array<{ id: string; price: number }>;
    cards: Array<{ id: string; price: number; rarity: CardRarity }>;
  } = { relics: [], items: [], cards: [] };

  // 상징 선택
  const availableRelics = Object.values(RELICS).filter(r => {
    // 이미 보유한 상징 제외
    if (ownedRelics.includes(r.id)) return false;
    // 개발자 전용 상징 제외
    if (r.id === 'infiniteShield' || r.id === 'perpetualEngine') return false;
    // 최소 등급 체크
    if (merchant.minRarity) {
      const rarityOrder: string[] = [RELIC_RARITIES.COMMON, RELIC_RARITIES.RARE, RELIC_RARITIES.SPECIAL, RELIC_RARITIES.LEGENDARY];
      const minIdx = rarityOrder.indexOf(merchant.minRarity);
      const relicIdx = rarityOrder.indexOf(r.rarity);
      if (relicIdx < minIdx) return false;
    }
    return true;
  });

  // 가중치 기반 랜덤 선택 (희귀할수록 등장 확률 낮음)
  const relicWeights = {
    [RELIC_RARITIES.COMMON]: 4,
    [RELIC_RARITIES.RARE]: 2,
    [RELIC_RARITIES.SPECIAL]: 1,
    [RELIC_RARITIES.LEGENDARY]: 0.3,
  };

  for (let i = 0; i < merchant.relicSlots && availableRelics.length > 0; i++) {
    const totalWeight = availableRelics.reduce((sum, r) => sum + (relicWeights[r.rarity] || 1), 0);
    let rand = Math.random() * totalWeight;

    for (let j = 0; j < availableRelics.length; j++) {
      rand -= relicWeights[availableRelics[j].rarity] || 1;
      if (rand <= 0) {
        const relic = availableRelics.splice(j, 1)[0];
        const basePrice = RELIC_PRICES[relic.rarity] || 100;
        inventory.relics.push({
          id: relic.id,
          price: Math.round(basePrice * merchant.priceMultiplier),
        });
        break;
      }
    }
  }

  // 아이템 선택
  const availableItems = Object.values(ITEMS);
  const shuffledItems = shuffle(availableItems);

  for (let i = 0; i < merchant.itemSlots && i < shuffledItems.length; i++) {
    const item = shuffledItems[i];
    const tier = item.tier as ItemTier;
    const basePrice = ITEM_PRICES[tier] ?? 30;
    inventory.items.push({
      id: item.id,
      price: Math.round(basePrice * merchant.priceMultiplier),
    });
  }

  // 카드 선택
  if (merchant.cardSlots > 0 && allCards.length > 0) {
    const cardRarityOrder: CardRarity[] = ['common', 'rare', 'special', 'legendary'];
    const cardWeights: Record<CardRarity, number> = {
      common: 4,
      rare: 2,
      special: 1,
      legendary: 0.3,
    };

    // 헬퍼 함수: 카드 등급 가져오기
    const getCardRarity = (card: ShopCard): CardRarity => card.rarity ?? 'common';
    const getCardWeight = (card: ShopCard): number => cardWeights[getCardRarity(card)] ?? 1;

    // 최소 등급 필터링
    let availableCards = [...allCards];
    if (merchant.minCardRarity) {
      const minIdx = cardRarityOrder.indexOf(merchant.minCardRarity);
      availableCards = availableCards.filter(c => {
        const cardIdx = cardRarityOrder.indexOf(getCardRarity(c));
        return cardIdx >= minIdx;
      });
    }

    // 셔플 후 가중치 기반 선택
    availableCards = shuffle(availableCards);

    for (let i = 0; i < merchant.cardSlots && availableCards.length > 0; i++) {
      const totalWeight = availableCards.reduce((sum, c) => sum + getCardWeight(c), 0);
      let rand = Math.random() * totalWeight;

      for (let j = 0; j < availableCards.length; j++) {
        rand -= getCardWeight(availableCards[j]);
        if (rand <= 0) {
          const card = availableCards.splice(j, 1)[0];
          const cardRarity = getCardRarity(card);
          const basePrice = CARD_PRICES[cardRarity] ?? CARD_PRICES.common;
          inventory.cards.push({
            id: card.id,
            price: Math.round(basePrice * merchant.priceMultiplier),
            rarity: cardRarity,
          });
          break;
        }
      }
    }
  }

  return inventory;
}

/** 아이템 인터페이스 (상점용) */
interface ShopItem {
  id: string;
  tier?: number;
}

/** 상징 인터페이스 (상점용) */
interface ShopRelic {
  id: string;
  rarity: string;
}

/**
 * 아이템 판매 가격 계산
 * @param item - 아이템 객체
 * @param merchantType - 상인 유형
 * @returns 판매 가격
 */
export function getItemSellPrice(item: ShopItem, merchantType: string = 'shop'): number {
  const merchant = getMerchant(merchantType);
  const tier = (item.tier ?? 1) as ItemTier;
  const basePrice = ITEM_PRICES[tier] ?? 30;
  const sellMultiplier = merchant.sellPriceMultiplier ?? SELL_PRICE_MULTIPLIER;
  return Math.round(basePrice * sellMultiplier);
}

/**
 * 상징 판매 가격 계산 (보유 상징 판매 시)
 * @param relic - 상징 객체
 * @param merchantType - 상인 유형
 * @returns 판매 가격
 */
export function getRelicSellPrice(relic: ShopRelic, merchantType: string = 'shop'): number {
  const merchant = getMerchant(merchantType);
  const basePrice = RELIC_PRICES[relic.rarity] ?? 100;
  const sellMultiplier = merchant.sellPriceMultiplier ?? SELL_PRICE_MULTIPLIER;
  return Math.round(basePrice * sellMultiplier);
}

/**
 * 카드 판매 가격 계산
 * @param _card - 카드 객체 (미사용, 향후 확장용)
 * @param cardRarity - 카드 등급 (업그레이드된 등급 사용)
 * @param merchantType - 상인 유형
 * @returns 판매 가격
 */
export function getCardSellPrice(
  _card: ShopCard,
  cardRarity: CardRarity = 'common',
  merchantType: string = 'shop'
): number {
  const merchant = getMerchant(merchantType);
  const basePrice = CARD_PRICES[cardRarity] ?? CARD_PRICES.common;
  const sellMultiplier = merchant.sellPriceMultiplier ?? SELL_PRICE_MULTIPLIER;
  return Math.round(basePrice * sellMultiplier);
}

/**
 * 서비스 가격 조회
 * @param serviceId - 서비스 ID
 * @param merchantType - 상인 유형
 * @returns 서비스 가격
 */
export function getServicePrice(serviceId: string, merchantType: string = 'shop'): number {
  const merchant = getMerchant(merchantType);
  const isValidServiceId = serviceId in SERVICE_PRICES;
  const basePrice = isValidServiceId ? SERVICE_PRICES[serviceId as ServiceId] : 50;
  return Math.round(basePrice * merchant.priceMultiplier);
}

/**
 * 서비스 목록
 */
export const SHOP_SERVICES = [
  {
    id: 'healSmall',
    name: '치료 (소)',
    emoji: '💊',
    description: '체력 25% 회복',
    effect: { type: 'healPercent', value: 25 },
  },
  {
    id: 'healFull',
    name: '치료 (대)',
    emoji: '💉',
    description: '체력 전체 회복',
    effect: { type: 'healFull' },
  },
  {
    id: 'removeCard',
    name: '카드 제거',
    emoji: '✂️',
    description: '보유 카드 1장 제거',
    effect: { type: 'removeCard' },
  },
  {
    id: 'reroll',
    name: '상품 교체',
    emoji: '🔄',
    description: '상점 물품을 새로고침',
    effect: { type: 'reroll' },
  },
];
