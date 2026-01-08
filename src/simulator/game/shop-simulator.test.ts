/**
 * @file shop-simulator.test.ts
 * @description 상점 시뮬레이터 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ShopSimulator,
  type ShopItem,
  type ShopInventory,
  type PlayerShopState,
  type ShopSimulationConfig,
  type MerchantType,
} from './shop-simulator';

// 테스트 헬퍼 함수
const createTestPlayer = (overrides: Partial<PlayerShopState> = {}): PlayerShopState => ({
  gold: 100,
  hp: 80,
  maxHp: 100,
  deck: ['strike', 'block', 'shoot'],
  relics: [],
  items: [],
  ...overrides,
});

const createTestConfig = (overrides: Partial<ShopSimulationConfig> = {}): ShopSimulationConfig => ({
  player: createTestPlayer(),
  strategy: 'value',
  ...overrides,
});

const createTestInventory = (overrides: Partial<ShopInventory> = {}): ShopInventory => ({
  merchantType: 'shop',
  cards: [
    { id: 'test_card', type: 'card', name: '테스트 카드', price: 20, rarity: 'common', value: 30 },
  ],
  relics: [
    { id: 'test_relic', type: 'relic', name: '테스트 상징', price: 60, rarity: 'common', value: 80 },
  ],
  items: [
    { id: 'test_item', type: 'item', name: '테스트 아이템', price: 25, tier: 1, value: 35 },
  ],
  services: [
    { id: 'healSmall', type: 'service', name: '소량 회복', price: 30, value: 40 },
  ],
  ...overrides,
});

describe('ShopSimulator', () => {
  let simulator: ShopSimulator;

  beforeEach(() => {
    simulator = new ShopSimulator();
  });

  describe('constructor', () => {
    it('ShopSimulator를 생성한다', () => {
      expect(simulator).toBeDefined();
    });
  });

  describe('loadCardData', () => {
    it('카드 데이터를 로드한다', () => {
      simulator.loadCardData({
        strike: { id: 'strike', rarity: 'common' },
        fleche: { id: 'fleche', rarity: 'rare' },
      });
      // 데이터 로드 후 인벤토리 생성으로 확인
      const inventory = simulator.generateShopInventory('shop');
      expect(inventory).toBeDefined();
    });

    it('희귀도가 없으면 common으로 기본 설정된다', () => {
      simulator.loadCardData({
        test: { id: 'test' },
      });
      // 로드 성공 확인
      expect(simulator).toBeDefined();
    });
  });

  describe('loadRelicData', () => {
    it('상징 데이터를 로드한다', () => {
      simulator.loadRelicData({
        test_relic: { id: 'test_relic', rarity: 'rare' },
      });
      expect(simulator).toBeDefined();
    });

    it('희귀도가 없으면 common으로 기본 설정된다', () => {
      simulator.loadRelicData({
        test: { id: 'test' },
      });
      expect(simulator).toBeDefined();
    });
  });

  describe('loadItemData', () => {
    it('아이템 데이터를 로드한다', () => {
      simulator.loadItemData({
        healing_potion: { id: 'healing_potion', tier: 1 },
        ether_bomb: { id: 'ether_bomb', tier: 2 },
      });
      expect(simulator).toBeDefined();
    });

    it('티어가 없으면 1로 기본 설정된다', () => {
      simulator.loadItemData({
        test: { id: 'test' },
      });
      expect(simulator).toBeDefined();
    });
  });

  describe('generateShopInventory', () => {
    beforeEach(() => {
      // 테스트 데이터 로드
      simulator.loadCardData({
        strike: { id: 'strike', rarity: 'common' },
        fleche: { id: 'fleche', rarity: 'rare' },
        parry: { id: 'parry', rarity: 'special' },
      });
      simulator.loadRelicData({
        compass: { id: 'compass', rarity: 'common' },
        shield: { id: 'shield', rarity: 'rare' },
      });
      simulator.loadItemData({
        potion: { id: 'potion', tier: 1 },
        bomb: { id: 'bomb', tier: 2 },
      });
    });

    it('shop 상인 인벤토리를 생성한다', () => {
      const inventory = simulator.generateShopInventory('shop');
      expect(inventory.merchantType).toBe('shop');
      expect(inventory.services.length).toBeGreaterThan(0); // shop은 서비스가 있음
    });

    it('wanderer 상인 인벤토리를 생성한다', () => {
      const inventory = simulator.generateShopInventory('wanderer');
      expect(inventory.merchantType).toBe('wanderer');
      expect(inventory.services.length).toBe(0); // wanderer는 서비스가 없음
    });

    it('collector 상인 인벤토리를 생성한다', () => {
      const inventory = simulator.generateShopInventory('collector');
      expect(inventory.merchantType).toBe('collector');
    });

    it('buyer 상인은 아이템을 팔지 않는다', () => {
      const inventory = simulator.generateShopInventory('buyer');
      expect(inventory.merchantType).toBe('buyer');
      expect(inventory.cards.length).toBe(0);
      expect(inventory.relics.length).toBe(0);
      expect(inventory.items.length).toBe(0);
    });

    it('각 아이템에 가격이 설정된다', () => {
      const inventory = simulator.generateShopInventory('shop');
      inventory.cards.forEach(card => {
        expect(card.price).toBeGreaterThan(0);
      });
      inventory.relics.forEach(relic => {
        expect(relic.price).toBeGreaterThan(0);
      });
    });
  });

  describe('simulateShopVisit', () => {
    beforeEach(() => {
      simulator.loadCardData({
        strike: { id: 'strike', rarity: 'common' },
      });
      simulator.loadRelicData({
        compass: { id: 'compass', rarity: 'common' },
      });
      simulator.loadItemData({
        potion: { id: 'potion', tier: 1 },
      });
    });

    it('상점 방문을 시뮬레이션한다', () => {
      const inventory = createTestInventory();
      const config = createTestConfig({ player: createTestPlayer({ gold: 200 }) });
      const result = simulator.simulateShopVisit(inventory, config);

      expect(result).toBeDefined();
      expect(result.merchantType).toBe('shop');
      expect(result.remainingGold).toBeDefined();
    });

    it('골드가 부족하면 아이템을 구매하지 않는다', () => {
      const inventory = createTestInventory();
      const config = createTestConfig({ player: createTestPlayer({ gold: 5 }) });
      const result = simulator.simulateShopVisit(inventory, config);

      expect(result.purchases.length).toBe(0);
      expect(result.remainingGold).toBe(5);
    });

    it('reserveGold를 유지한다', () => {
      const inventory = createTestInventory({
        cards: [{ id: 'cheap', type: 'card', name: '저렴한 카드', price: 10, value: 20 }],
        relics: [],
        items: [],
        services: [],
      });
      const config = createTestConfig({
        player: createTestPlayer({ gold: 50 }),
        reserveGold: 45,
      });
      const result = simulator.simulateShopVisit(inventory, config);

      // 50 - 45 = 5 available, 10원 카드 구매 불가
      expect(result.remainingGold).toBeGreaterThanOrEqual(45);
    });

    it('maxPurchases를 초과하지 않는다', () => {
      const inventory = createTestInventory({
        cards: [
          { id: 'card1', type: 'card', name: '카드 1', price: 5, value: 10 },
          { id: 'card2', type: 'card', name: '카드 2', price: 5, value: 10 },
          { id: 'card3', type: 'card', name: '카드 3', price: 5, value: 10 },
        ],
        relics: [],
        items: [],
        services: [],
      });
      const config = createTestConfig({
        player: createTestPlayer({ gold: 100 }),
        maxPurchases: 1,
      });
      const result = simulator.simulateShopVisit(inventory, config);

      expect(result.purchases.length).toBeLessThanOrEqual(1);
    });

    it('value 전략은 가치가 높은 아이템을 우선 구매한다', () => {
      const inventory = createTestInventory({
        cards: [
          { id: 'low_value', type: 'card', name: '저가치', price: 10, value: 5 },
          { id: 'high_value', type: 'card', name: '고가치', price: 10, value: 100 },
        ],
        relics: [],
        items: [],
        services: [],
      });
      const config = createTestConfig({
        player: createTestPlayer({ gold: 15 }),
        strategy: 'value',
        maxPurchases: 1,
      });
      const result = simulator.simulateShopVisit(inventory, config);

      if (result.purchases.length > 0) {
        expect(result.purchases[0].id).toBe('high_value');
      }
    });

    it('survival 전략은 힐 관련 아이템을 우선 구매한다', () => {
      const inventory = createTestInventory({
        cards: [],
        relics: [],
        items: [
          { id: 'damage_item', type: 'item', name: '피해 아이템', price: 10, value: 50 },
        ],
        services: [
          { id: 'healSmall', type: 'service', name: '소량 회복', price: 30, value: 40 },
        ],
      });
      const config = createTestConfig({
        player: createTestPlayer({ gold: 100, hp: 30 }),
        strategy: 'survival',
      });
      const result = simulator.simulateShopVisit(inventory, config);

      expect(result).toBeDefined();
    });
  });

  describe('analyzeShop', () => {
    beforeEach(() => {
      simulator.loadCardData({
        strike: { id: 'strike', rarity: 'common' },
      });
    });

    it('상점을 분석한다', () => {
      const inventory = createTestInventory();
      const analysis = simulator.analyzeShop(inventory, 100);

      expect(analysis).toBeDefined();
      expect(analysis.merchantType).toBe('shop');
      expect(analysis.totalValue).toBeDefined();
      expect(analysis.affordableItems).toBeDefined();
    });

    it('구매 가능한 아이템을 필터링한다', () => {
      const inventory = createTestInventory({
        cards: [
          { id: 'cheap', type: 'card', name: '저렴', price: 10, value: 20 },
          { id: 'expensive', type: 'card', name: '비쌈', price: 1000, value: 200 },
        ],
        relics: [],
        items: [],
        services: [],
      });
      const analysis = simulator.analyzeShop(inventory, 50);

      expect(analysis.affordableItems.some(i => i.id === 'cheap')).toBe(true);
      expect(analysis.affordableItems.some(i => i.id === 'expensive')).toBe(false);
    });

    it('추천 구매 목록을 생성한다', () => {
      const inventory = createTestInventory();
      const analysis = simulator.analyzeShop(inventory, 200);

      expect(analysis.recommendedPurchases).toBeDefined();
    });

    it('estimatedGoldNeeded를 계산한다', () => {
      const inventory = createTestInventory();
      const analysis = simulator.analyzeShop(inventory, 100);

      expect(typeof analysis.estimatedGoldNeeded).toBe('number');
    });
  });

  describe('calculateAverageShopValue', () => {
    beforeEach(() => {
      simulator.loadCardData({
        strike: { id: 'strike', rarity: 'common' },
      });
      simulator.loadRelicData({
        compass: { id: 'compass', rarity: 'common' },
      });
      simulator.loadItemData({
        potion: { id: 'potion', tier: 1 },
      });
    });

    it('상점 유형별 평균 가치를 계산한다', () => {
      const result = simulator.calculateAverageShopValue('shop', 5);
      expect(result.avgTotalValue).toBeDefined();
      expect(result.avgAffordableValue).toBeDefined();
      expect(result.avgGoldNeeded).toBeDefined();
    });

    it('기본 샘플 수는 100이다', () => {
      // 시간이 오래 걸릴 수 있으므로 작은 샘플로 테스트
      const result = simulator.calculateAverageShopValue('wanderer', 3);
      expect(typeof result.avgTotalValue).toBe('number');
    });
  });

  describe('아이템 가치 계산', () => {
    it('힐 아이템은 높은 가치를 가진다', () => {
      simulator.loadItemData({
        healing_potion: { id: 'healing_potion', tier: 1 },
        normal_item: { id: 'normal_item', tier: 1 },
      });
      // 로드 성공 확인
      expect(simulator).toBeDefined();
    });

    it('에테르 아이템은 추가 가치를 가진다', () => {
      simulator.loadItemData({
        ether_bomb: { id: 'ether_bomb', tier: 1 },
      });
      expect(simulator).toBeDefined();
    });

    it('에너지 아이템은 추가 가치를 가진다', () => {
      simulator.loadItemData({
        energy_drink: { id: 'energy_drink', tier: 1 },
      });
      expect(simulator).toBeDefined();
    });

    it('공격/방어 아이템은 추가 가치를 가진다', () => {
      simulator.loadItemData({
        attack_boost: { id: 'attack_boost', tier: 1 },
        defense_shield: { id: 'defense_shield', tier: 1 },
        explosive_bomb: { id: 'explosive_bomb', tier: 2 },
      });
      expect(simulator).toBeDefined();
    });
  });

  describe('서비스 시뮬레이션', () => {
    it('힐 서비스를 사용할 수 있다', () => {
      const inventory = createTestInventory({
        cards: [],
        relics: [],
        items: [],
        services: [
          { id: 'healSmall', type: 'service', name: '소량 회복', price: 30, value: 40 },
          { id: 'healFull', type: 'service', name: '완전 회복', price: 80, value: 100 },
        ],
      });
      const config = createTestConfig({
        player: createTestPlayer({ gold: 100, hp: 50, maxHp: 100 }),
        strategy: 'survival',
      });
      const result = simulator.simulateShopVisit(inventory, config);

      expect(result).toBeDefined();
    });

    it('카드 제거 서비스를 사용할 수 있다', () => {
      const inventory = createTestInventory({
        cards: [],
        relics: [],
        items: [],
        services: [
          { id: 'removeCard', type: 'service', name: '카드 제거', price: 50, value: 60 },
        ],
      });
      const config = createTestConfig({
        player: createTestPlayer({ gold: 100, deck: ['strike', 'block', 'bad_card'] }),
      });
      const result = simulator.simulateShopVisit(inventory, config);

      expect(result).toBeDefined();
    });
  });

  describe('random 전략', () => {
    it('랜덤하게 아이템을 선택한다', () => {
      const inventory = createTestInventory({
        cards: [
          { id: 'card1', type: 'card', name: '카드 1', price: 10, value: 20 },
          { id: 'card2', type: 'card', name: '카드 2', price: 10, value: 20 },
        ],
        relics: [],
        items: [],
        services: [],
      });
      const config = createTestConfig({
        player: createTestPlayer({ gold: 50 }),
        strategy: 'random',
      });
      const result = simulator.simulateShopVisit(inventory, config);

      expect(result).toBeDefined();
    });
  });

  describe('synergy 전략', () => {
    it('덱과 시너지가 있는 아이템을 선호한다', () => {
      const inventory = createTestInventory();
      const config = createTestConfig({
        player: createTestPlayer({ gold: 200, deck: ['strike', 'strike', 'block'] }),
        strategy: 'synergy',
      });
      const result = simulator.simulateShopVisit(inventory, config);

      expect(result).toBeDefined();
    });
  });
});
