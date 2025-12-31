/**
 * @file shop-simulator.ts
 * @description 상점 노드 시뮬레이터
 *
 * ## 기능
 * - 상점 아이템 구매 시뮬레이션
 * - 최적 구매 전략 분석
 * - 카드/상징/아이템 가치 평가
 * - 서비스 이용 시뮬레이션
 */

import { getLogger } from '../core/logger';

const log = getLogger('ShopSimulator');

// ==================== 타입 정의 ====================

export type ItemTier = 1 | 2;
export type CardRarity = 'common' | 'rare' | 'special' | 'legendary';
export type RelicRarity = 'common' | 'rare' | 'special' | 'legendary';
export type ServiceId = 'healSmall' | 'healFull' | 'removeCard' | 'upgradeCard' | 'reroll';
export type MerchantType = 'shop' | 'wanderer' | 'collector' | 'buyer';

export interface ShopItem {
  id: string;
  type: 'card' | 'relic' | 'item' | 'service';
  name: string;
  price: number;
  rarity?: CardRarity | RelicRarity;
  tier?: ItemTier;
  value: number; // 내부 가치 평가
  sold?: boolean;
}

export interface ShopInventory {
  merchantType: MerchantType;
  cards: ShopItem[];
  relics: ShopItem[];
  items: ShopItem[];
  services: ShopItem[];
}

export interface PlayerShopState {
  gold: number;
  hp: number;
  maxHp: number;
  deck: string[];
  relics: string[];
  items: string[];
}

export interface PurchaseDecision {
  item: ShopItem;
  priority: number;
  reason: string;
}

export interface ShopSimulationConfig {
  player: PlayerShopState;
  strategy: 'value' | 'synergy' | 'survival' | 'random';
  maxPurchases?: number;
  reserveGold?: number;
}

export interface ShopResult {
  merchantType: MerchantType;
  purchases: ShopItem[];
  totalSpent: number;
  remainingGold: number;
  servicesUsed: ShopItem[];
  skippedItems: ShopItem[];
  finalPlayerState: PlayerShopState;
}

export interface ShopAnalysis {
  merchantType: MerchantType;
  totalValue: number;
  affordableItems: ShopItem[];
  recommendedPurchases: PurchaseDecision[];
  estimatedGoldNeeded: number;
}

// ==================== 상수 ====================

const RELIC_PRICES: Record<RelicRarity, number> = {
  common: 60,
  rare: 120,
  special: 200,
  legendary: 350,
};

const CARD_PRICES: Record<CardRarity, number> = {
  common: 15,
  rare: 30,
  special: 50,
  legendary: 80,
};

const ITEM_PRICES: Record<ItemTier, number> = {
  1: 25,
  2: 50,
};

const SERVICE_PRICES: Record<ServiceId, number> = {
  healSmall: 30,
  healFull: 80,
  removeCard: 50,
  upgradeCard: 75,
  reroll: 15,
};

const MERCHANT_CONFIGS: Record<MerchantType, {
  priceMultiplier: number;
  sellMultiplier: number;
  relicSlots: number;
  cardSlots: number;
  itemSlots: number;
  hasServices: boolean;
}> = {
  shop: { priceMultiplier: 1.0, sellMultiplier: 0.6, relicSlots: 3, cardSlots: 3, itemSlots: 4, hasServices: true },
  wanderer: { priceMultiplier: 0.9, sellMultiplier: 0.6, relicSlots: 2, cardSlots: 2, itemSlots: 3, hasServices: false },
  collector: { priceMultiplier: 1.3, sellMultiplier: 0.6, relicSlots: 2, cardSlots: 2, itemSlots: 2, hasServices: false },
  buyer: { priceMultiplier: 1.0, sellMultiplier: 1.2, relicSlots: 0, cardSlots: 0, itemSlots: 0, hasServices: false },
};

// ==================== 상점 시뮬레이터 ====================

export class ShopSimulator {
  private cardData: Record<string, { id: string; rarity: CardRarity; value?: number }> = {};
  private relicData: Record<string, { id: string; rarity: RelicRarity; value?: number }> = {};
  private itemData: Record<string, { id: string; tier: ItemTier; value?: number }> = {};

  constructor() {
    log.info('ShopSimulator initialized');
  }

  // ==================== 데이터 로드 ====================

  loadCardData(cards: Record<string, { id: string; rarity?: string }>): void {
    for (const [id, card] of Object.entries(cards)) {
      this.cardData[id] = {
        id,
        rarity: (card.rarity as CardRarity) || 'common',
        value: this.calculateCardValue(card),
      };
    }
  }

  loadRelicData(relics: Record<string, { id: string; rarity?: string }>): void {
    for (const [id, relic] of Object.entries(relics)) {
      this.relicData[id] = {
        id,
        rarity: (relic.rarity as RelicRarity) || 'common',
        value: this.calculateRelicValue(relic),
      };
    }
  }

  loadItemData(items: Record<string, { id: string; tier?: number }>): void {
    for (const [id, item] of Object.entries(items)) {
      this.itemData[id] = {
        id,
        tier: (item.tier as ItemTier) || 1,
        value: this.calculateItemValue(item),
      };
    }
  }

  // ==================== 가치 계산 ====================

  private calculateCardValue(card: { rarity?: string }): number {
    const rarityValues: Record<string, number> = {
      common: 20,
      rare: 50,
      special: 100,
      legendary: 200,
    };
    return rarityValues[card.rarity || 'common'] || 20;
  }

  private calculateRelicValue(relic: { rarity?: string }): number {
    const rarityValues: Record<string, number> = {
      common: 80,
      rare: 150,
      special: 250,
      legendary: 400,
    };
    return rarityValues[relic.rarity || 'common'] || 80;
  }

  private calculateItemValue(item: { tier?: number }): number {
    return item.tier === 2 ? 60 : 30;
  }

  // ==================== 상점 생성 ====================

  /**
   * 랜덤 상점 인벤토리 생성
   */
  generateShopInventory(merchantType: MerchantType): ShopInventory {
    const config = MERCHANT_CONFIGS[merchantType];
    const inventory: ShopInventory = {
      merchantType,
      cards: [],
      relics: [],
      items: [],
      services: [],
    };

    // 카드 생성
    const cardIds = Object.keys(this.cardData);
    for (let i = 0; i < config.cardSlots && cardIds.length > 0; i++) {
      const randomId = cardIds[Math.floor(Math.random() * cardIds.length)];
      const card = this.cardData[randomId];
      if (card) {
        const price = Math.floor(CARD_PRICES[card.rarity] * config.priceMultiplier);
        inventory.cards.push({
          id: card.id,
          type: 'card',
          name: card.id,
          price,
          rarity: card.rarity,
          value: card.value || 20,
        });
      }
    }

    // 상징 생성
    const relicIds = Object.keys(this.relicData);
    for (let i = 0; i < config.relicSlots && relicIds.length > 0; i++) {
      const randomId = relicIds[Math.floor(Math.random() * relicIds.length)];
      const relic = this.relicData[randomId];
      if (relic) {
        const price = Math.floor(RELIC_PRICES[relic.rarity] * config.priceMultiplier);
        inventory.relics.push({
          id: relic.id,
          type: 'relic',
          name: relic.id,
          price,
          rarity: relic.rarity,
          value: relic.value || 80,
        });
      }
    }

    // 아이템 생성
    const itemIds = Object.keys(this.itemData);
    for (let i = 0; i < config.itemSlots && itemIds.length > 0; i++) {
      const randomId = itemIds[Math.floor(Math.random() * itemIds.length)];
      const item = this.itemData[randomId];
      if (item) {
        const price = Math.floor(ITEM_PRICES[item.tier] * config.priceMultiplier);
        inventory.items.push({
          id: item.id,
          type: 'item',
          name: item.id,
          price,
          tier: item.tier,
          value: item.value || 30,
        });
      }
    }

    // 서비스 생성
    if (config.hasServices) {
      for (const [serviceId, basePrice] of Object.entries(SERVICE_PRICES)) {
        inventory.services.push({
          id: serviceId,
          type: 'service',
          name: serviceId,
          price: Math.floor(basePrice * config.priceMultiplier),
          value: this.calculateServiceValue(serviceId as ServiceId),
        });
      }
    }

    return inventory;
  }

  private calculateServiceValue(serviceId: ServiceId): number {
    const values: Record<ServiceId, number> = {
      healSmall: 40,
      healFull: 100,
      removeCard: 60,
      upgradeCard: 80,
      reroll: 10,
    };
    return values[serviceId];
  }

  // ==================== 시뮬레이션 ====================

  /**
   * 상점 방문 시뮬레이션
   */
  simulateShopVisit(
    inventory: ShopInventory,
    config: ShopSimulationConfig
  ): ShopResult {
    const player = { ...config.player };
    const reserveGold = config.reserveGold || 0;
    const availableGold = player.gold - reserveGold;
    const maxPurchases = config.maxPurchases || 10;

    const purchases: ShopItem[] = [];
    const servicesUsed: ShopItem[] = [];
    const skippedItems: ShopItem[] = [];
    let totalSpent = 0;

    // 모든 아이템 수집 및 우선순위 정렬
    const allItems = [
      ...inventory.cards,
      ...inventory.relics,
      ...inventory.items,
    ];

    const prioritizedItems = this.prioritizeItems(allItems, config);

    // 구매 결정
    for (const decision of prioritizedItems) {
      if (purchases.length >= maxPurchases) break;
      if (decision.item.sold) continue;

      const canAfford = (availableGold - totalSpent) >= decision.item.price;

      if (canAfford) {
        // 카드는 덱에 같은 카드가 2장 미만일 때만 구매 (게임과 동일)
        if (decision.item.type === 'card') {
          const cardCount = player.deck.filter(c => c === decision.item.id).length;
          if (cardCount >= 2) {
            skippedItems.push(decision.item);
            continue; // 이미 2장 보유 시 스킵
          }
        }

        // 상징은 중복 불가
        if (decision.item.type === 'relic') {
          if (player.relics.includes(decision.item.id)) {
            skippedItems.push(decision.item);
            continue; // 이미 보유 시 스킵
          }
        }

        purchases.push(decision.item);
        totalSpent += decision.item.price;
        decision.item.sold = true;

        // 플레이어 상태 업데이트
        if (decision.item.type === 'card') {
          player.deck.push(decision.item.id);
        } else if (decision.item.type === 'relic') {
          player.relics.push(decision.item.id);
        } else if (decision.item.type === 'item') {
          player.items.push(decision.item.id);
        }
      } else {
        skippedItems.push(decision.item);
      }
    }

    // 서비스 사용 결정
    if (inventory.services.length > 0) {
      const serviceDecisions = this.decideServices(inventory.services, player, availableGold - totalSpent);
      for (const service of serviceDecisions) {
        if ((availableGold - totalSpent) >= service.price) {
          servicesUsed.push(service);
          totalSpent += service.price;

          // 서비스 효과 적용
          this.applyServiceEffect(service.id as ServiceId, player);
        }
      }
    }

    player.gold -= totalSpent;

    return {
      merchantType: inventory.merchantType,
      purchases,
      totalSpent,
      remainingGold: player.gold,
      servicesUsed,
      skippedItems,
      finalPlayerState: player,
    };
  }

  /**
   * 아이템 우선순위 결정
   */
  private prioritizeItems(
    items: ShopItem[],
    config: ShopSimulationConfig
  ): PurchaseDecision[] {
    const decisions: PurchaseDecision[] = [];

    for (const item of items) {
      let priority = 0;
      let reason = '';

      switch (config.strategy) {
        case 'value':
          // 가성비 기준
          priority = (item.value / item.price) * 100;
          reason = `가성비: ${(item.value / item.price).toFixed(2)}`;
          break;

        case 'synergy':
          // 현재 덱과의 시너지 (간단한 구현)
          priority = item.value;
          if (item.type === 'relic') priority *= 1.5;
          reason = '시너지 중심';
          break;

        case 'survival':
          // 생존 중심 (힐/방어 우선)
          if (item.type === 'service' && (item.id === 'healSmall' || item.id === 'healFull')) {
            priority = 200;
            reason = '생존 우선';
          } else {
            priority = item.value * 0.5;
            reason = '낮은 우선순위';
          }
          break;

        case 'random':
        default:
          priority = Math.random() * 100;
          reason = '랜덤 선택';
      }

      decisions.push({ item, priority, reason });
    }

    return decisions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 서비스 사용 결정
   */
  private decideServices(
    services: ShopItem[],
    player: PlayerShopState,
    availableGold: number
  ): ShopItem[] {
    const selected: ShopItem[] = [];

    // 체력이 50% 미만이면 힐 우선
    if (player.hp < player.maxHp * 0.5) {
      const healFull = services.find(s => s.id === 'healFull');
      const healSmall = services.find(s => s.id === 'healSmall');

      if (healFull && availableGold >= healFull.price && player.hp < player.maxHp * 0.3) {
        selected.push(healFull);
      } else if (healSmall && availableGold >= healSmall.price) {
        selected.push(healSmall);
      }
    }

    // 덱이 너무 크면 카드 제거 고려
    if (player.deck.length > 20) {
      const removeCard = services.find(s => s.id === 'removeCard');
      if (removeCard && availableGold >= removeCard.price) {
        selected.push(removeCard);
      }
    }

    return selected;
  }

  /**
   * 서비스 효과 적용
   */
  private applyServiceEffect(serviceId: ServiceId, player: PlayerShopState): void {
    switch (serviceId) {
      case 'healSmall':
        player.hp = Math.min(player.maxHp, player.hp + Math.floor(player.maxHp * 0.25));
        break;
      case 'healFull':
        player.hp = player.maxHp;
        break;
      case 'removeCard':
        // 랜덤 카드 제거 (시뮬레이션용)
        if (player.deck.length > 0) {
          const randomIndex = Math.floor(Math.random() * player.deck.length);
          player.deck.splice(randomIndex, 1);
        }
        break;
      case 'upgradeCard':
        // 업그레이드는 현재 미구현
        break;
      case 'reroll':
        // 리롤은 인벤토리 재생성 필요
        break;
    }
  }

  // ==================== 분석 ====================

  /**
   * 상점 분석
   */
  analyzeShop(
    inventory: ShopInventory,
    playerGold: number
  ): ShopAnalysis {
    const allItems = [
      ...inventory.cards,
      ...inventory.relics,
      ...inventory.items,
      ...inventory.services,
    ];

    const totalValue = allItems.reduce((sum, item) => sum + item.value, 0);
    const affordableItems = allItems.filter(item => item.price <= playerGold);

    const recommendedPurchases: PurchaseDecision[] = affordableItems
      .map(item => ({
        item,
        priority: item.value / item.price,
        reason: `가치/비용 비율: ${(item.value / item.price).toFixed(2)}`,
      }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5);

    const estimatedGoldNeeded = allItems
      .sort((a, b) => (b.value / b.price) - (a.value / a.price))
      .slice(0, 3)
      .reduce((sum, item) => sum + item.price, 0);

    return {
      merchantType: inventory.merchantType,
      totalValue,
      affordableItems,
      recommendedPurchases,
      estimatedGoldNeeded,
    };
  }

  // ==================== 통계 ====================

  /**
   * 상점 유형별 평균 가치 계산
   */
  calculateAverageShopValue(
    merchantType: MerchantType,
    samples: number = 100
  ): { avgTotalValue: number; avgAffordableValue: number; avgGoldNeeded: number } {
    let totalValue = 0;
    let affordableValue = 0;
    let goldNeeded = 0;

    for (let i = 0; i < samples; i++) {
      const inventory = this.generateShopInventory(merchantType);
      const analysis = this.analyzeShop(inventory, 100); // 100골드 기준

      totalValue += analysis.totalValue;
      affordableValue += analysis.affordableItems.reduce((sum, item) => sum + item.value, 0);
      goldNeeded += analysis.estimatedGoldNeeded;
    }

    return {
      avgTotalValue: totalValue / samples,
      avgAffordableValue: affordableValue / samples,
      avgGoldNeeded: goldNeeded / samples,
    };
  }
}

// ==================== 헬퍼 함수 ====================

export async function createShopSimulator(): Promise<ShopSimulator> {
  const simulator = new ShopSimulator();

  try {
    // 카드 데이터 로드 (CARD_LIBRARY 사용)
    const { CARD_LIBRARY } = await import('../../data/cards');
    simulator.loadCardData(CARD_LIBRARY as Record<string, { id: string; rarity?: string }>);

    // 상징 데이터 로드
    const { RELICS } = await import('../../data/relics');
    simulator.loadRelicData(RELICS as Record<string, { id: string; rarity?: string }>);

    // 아이템 데이터 로드
    const { ITEMS } = await import('../../data/items');
    simulator.loadItemData(ITEMS as Record<string, { id: string; tier?: number }>);

    log.info('ShopSimulator data loaded successfully');
  } catch (error) {
    log.warn('Failed to load some shop data', { error });
  }

  return simulator;
}
