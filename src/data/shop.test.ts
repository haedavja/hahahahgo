/**
 * @file shop.test.ts
 * @description 상점 시스템 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RELIC_PRICES,
  ITEM_PRICES,
  CARD_PRICES,
  SERVICE_PRICES,
  SELL_PRICE_MULTIPLIER,
  MERCHANT_TYPES,
  SHOP_SERVICES,
  generateShopInventory,
  getItemSellPrice,
  getRelicSellPrice,
  getCardSellPrice,
  getServicePrice,
} from './shop';
import { RELIC_RARITIES } from './relics';

// Mock randomUtils
vi.mock('../lib/randomUtils', () => ({
  shuffle: vi.fn((arr) => [...arr]),
}));

describe('shop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RELIC_PRICES', () => {
    it('모든 상징 등급에 가격이 정의되어 있다', () => {
      expect(RELIC_PRICES[RELIC_RARITIES.COMMON]).toBeDefined();
      expect(RELIC_PRICES[RELIC_RARITIES.RARE]).toBeDefined();
      expect(RELIC_PRICES[RELIC_RARITIES.SPECIAL]).toBeDefined();
      expect(RELIC_PRICES[RELIC_RARITIES.LEGENDARY]).toBeDefined();
    });

    it('가격이 등급에 따라 증가한다', () => {
      expect(RELIC_PRICES[RELIC_RARITIES.COMMON]).toBeLessThan(
        RELIC_PRICES[RELIC_RARITIES.RARE]
      );
      expect(RELIC_PRICES[RELIC_RARITIES.RARE]).toBeLessThan(
        RELIC_PRICES[RELIC_RARITIES.SPECIAL]
      );
      expect(RELIC_PRICES[RELIC_RARITIES.SPECIAL]).toBeLessThan(
        RELIC_PRICES[RELIC_RARITIES.LEGENDARY]
      );
    });
  });

  describe('ITEM_PRICES', () => {
    it('티어별 가격이 정의되어 있다', () => {
      expect(ITEM_PRICES[1]).toBeDefined();
      expect(ITEM_PRICES[2]).toBeDefined();
    });

    it('티어 2 아이템이 티어 1보다 비싸다', () => {
      expect(ITEM_PRICES[2]).toBeGreaterThan(ITEM_PRICES[1]);
    });
  });

  describe('CARD_PRICES', () => {
    it('모든 카드 등급에 가격이 정의되어 있다', () => {
      expect(CARD_PRICES.common).toBeDefined();
      expect(CARD_PRICES.rare).toBeDefined();
      expect(CARD_PRICES.special).toBeDefined();
      expect(CARD_PRICES.legendary).toBeDefined();
    });

    it('가격이 등급에 따라 증가한다', () => {
      expect(CARD_PRICES.common).toBeLessThan(CARD_PRICES.rare);
      expect(CARD_PRICES.rare).toBeLessThan(CARD_PRICES.special);
      expect(CARD_PRICES.special).toBeLessThan(CARD_PRICES.legendary);
    });
  });

  describe('SERVICE_PRICES', () => {
    it('모든 서비스에 가격이 정의되어 있다', () => {
      expect(SERVICE_PRICES.healSmall).toBeDefined();
      expect(SERVICE_PRICES.healFull).toBeDefined();
      expect(SERVICE_PRICES.removeCard).toBeDefined();
      expect(SERVICE_PRICES.upgradeCard).toBeDefined();
      expect(SERVICE_PRICES.reroll).toBeDefined();
    });
  });

  describe('SELL_PRICE_MULTIPLIER', () => {
    it('판매 가격 배율이 1 미만이다', () => {
      expect(SELL_PRICE_MULTIPLIER).toBeLessThan(1);
      expect(SELL_PRICE_MULTIPLIER).toBeGreaterThan(0);
    });
  });

  describe('MERCHANT_TYPES', () => {
    it('모든 상인 유형이 정의되어 있다', () => {
      expect(MERCHANT_TYPES.shop).toBeDefined();
      expect(MERCHANT_TYPES.wanderer).toBeDefined();
      expect(MERCHANT_TYPES.collector).toBeDefined();
      expect(MERCHANT_TYPES.buyer).toBeDefined();
    });

    it('각 상인이 필수 필드를 가진다', () => {
      Object.values(MERCHANT_TYPES).forEach(merchant => {
        expect(merchant.id).toBeDefined();
        expect(merchant.name).toBeDefined();
        expect(merchant.emoji).toBeDefined();
        expect(merchant.greeting).toBeDefined();
        expect(merchant.relicSlots).toBeDefined();
        expect(merchant.itemSlots).toBeDefined();
        expect(merchant.cardSlots).toBeDefined();
        expect(typeof merchant.hasServices).toBe('boolean');
        expect(typeof merchant.canSell).toBe('boolean');
        expect(merchant.priceMultiplier).toBeDefined();
      });
    });

    it('여행 상인이 모든 서비스를 제공한다', () => {
      expect(MERCHANT_TYPES.shop.hasServices).toBe(true);
      expect(MERCHANT_TYPES.shop.canSell).toBe(true);
    });

    it('떠돌이 상인은 할인을 제공한다', () => {
      expect(MERCHANT_TYPES.wanderer.priceMultiplier).toBeLessThan(1);
    });

    it('수집가는 프리미엄 가격을 부과한다', () => {
      expect(MERCHANT_TYPES.collector.priceMultiplier).toBeGreaterThan(1);
    });

    it('고물상은 높은 매입가를 제공한다', () => {
      expect(MERCHANT_TYPES.buyer.sellPriceMultiplier).toBeGreaterThan(
        SELL_PRICE_MULTIPLIER
      );
    });
  });

  describe('SHOP_SERVICES', () => {
    it('서비스 목록이 비어있지 않다', () => {
      expect(SHOP_SERVICES.length).toBeGreaterThan(0);
    });

    it('모든 서비스가 필수 필드를 가진다', () => {
      SHOP_SERVICES.forEach(service => {
        expect(service.id).toBeDefined();
        expect(service.name).toBeDefined();
        expect(service.emoji).toBeDefined();
        expect(service.description).toBeDefined();
        expect(service.effect).toBeDefined();
      });
    });
  });

  describe('generateShopInventory', () => {
    it('기본 상점 재고를 생성한다', () => {
      const inventory = generateShopInventory('shop', [], []);
      expect(inventory.relics).toBeDefined();
      expect(inventory.items).toBeDefined();
      expect(inventory.cards).toBeDefined();
    });

    it('아이템 재고가 생성된다', () => {
      const inventory = generateShopInventory('shop', [], []);
      expect(inventory.items.length).toBeGreaterThan(0);
    });

    it('상징 재고가 생성된다', () => {
      const inventory = generateShopInventory('shop', [], []);
      expect(inventory.relics.length).toBeGreaterThan(0);
    });

    it('이미 보유한 상징은 제외된다', () => {
      const inventory1 = generateShopInventory('shop', [], []);
      const ownedRelicIds = inventory1.relics.map(r => r.id);
      const inventory2 = generateShopInventory('shop', ownedRelicIds, []);

      // 보유 상징이 재고에 포함되지 않음
      inventory2.relics.forEach(relic => {
        expect(ownedRelicIds).not.toContain(relic.id);
      });
    });

    it('카드가 제공되면 카드 재고가 생성된다', () => {
      const mockCards = [
        { id: 'card1', rarity: 'common' as const },
        { id: 'card2', rarity: 'rare' as const },
        { id: 'card3', rarity: 'common' as const },
      ];
      const inventory = generateShopInventory('shop', [], mockCards);
      expect(inventory.cards.length).toBeGreaterThan(0);
    });
  });

  describe('getItemSellPrice', () => {
    it('티어 1 아이템 판매 가격을 계산한다', () => {
      const price = getItemSellPrice({ id: 'test', tier: 1 });
      expect(price).toBe(Math.round(ITEM_PRICES[1] * SELL_PRICE_MULTIPLIER));
    });

    it('티어 2 아이템 판매 가격을 계산한다', () => {
      const price = getItemSellPrice({ id: 'test', tier: 2 });
      expect(price).toBe(Math.round(ITEM_PRICES[2] * SELL_PRICE_MULTIPLIER));
    });

    it('고물상은 더 높은 가격에 매입한다', () => {
      const shopPrice = getItemSellPrice({ id: 'test', tier: 1 }, 'shop');
      const buyerPrice = getItemSellPrice({ id: 'test', tier: 1 }, 'buyer');
      expect(buyerPrice).toBeGreaterThan(shopPrice);
    });

    it('티어가 없으면 기본값 1로 처리한다', () => {
      const price = getItemSellPrice({ id: 'test' });
      expect(price).toBe(Math.round(ITEM_PRICES[1] * SELL_PRICE_MULTIPLIER));
    });
  });

  describe('getRelicSellPrice', () => {
    it('일반 상징 판매 가격을 계산한다', () => {
      const price = getRelicSellPrice({ id: 'test', rarity: 'common' });
      expect(price).toBe(
        Math.round(RELIC_PRICES['common'] * SELL_PRICE_MULTIPLIER)
      );
    });

    it('희귀 상징 판매 가격을 계산한다', () => {
      const price = getRelicSellPrice({ id: 'test', rarity: 'rare' });
      expect(price).toBe(
        Math.round(RELIC_PRICES['rare'] * SELL_PRICE_MULTIPLIER)
      );
    });

    it('고물상은 더 높은 가격에 매입한다', () => {
      const shopPrice = getRelicSellPrice(
        { id: 'test', rarity: 'common' },
        'shop'
      );
      const buyerPrice = getRelicSellPrice(
        { id: 'test', rarity: 'common' },
        'buyer'
      );
      expect(buyerPrice).toBeGreaterThan(shopPrice);
    });
  });

  describe('getCardSellPrice', () => {
    it('일반 카드 판매 가격을 계산한다', () => {
      const price = getCardSellPrice({ id: 'test' }, 'common');
      expect(price).toBe(
        Math.round(CARD_PRICES.common * SELL_PRICE_MULTIPLIER)
      );
    });

    it('희귀 카드 판매 가격을 계산한다', () => {
      const price = getCardSellPrice({ id: 'test' }, 'rare');
      expect(price).toBe(
        Math.round(CARD_PRICES.rare * SELL_PRICE_MULTIPLIER)
      );
    });

    it('전설 카드 판매 가격을 계산한다', () => {
      const price = getCardSellPrice({ id: 'test' }, 'legendary');
      expect(price).toBe(
        Math.round(CARD_PRICES.legendary * SELL_PRICE_MULTIPLIER)
      );
    });
  });

  describe('getServicePrice', () => {
    it('소형 치료 가격을 반환한다', () => {
      const price = getServicePrice('healSmall', 'shop');
      expect(price).toBe(
        Math.round(SERVICE_PRICES.healSmall * MERCHANT_TYPES.shop.priceMultiplier)
      );
    });

    it('대형 치료 가격을 반환한다', () => {
      const price = getServicePrice('healFull', 'shop');
      expect(price).toBe(
        Math.round(SERVICE_PRICES.healFull * MERCHANT_TYPES.shop.priceMultiplier)
      );
    });

    it('카드 제거 가격을 반환한다', () => {
      const price = getServicePrice('removeCard', 'shop');
      expect(price).toBe(
        Math.round(SERVICE_PRICES.removeCard * MERCHANT_TYPES.shop.priceMultiplier)
      );
    });

    it('상품 교체 가격을 반환한다', () => {
      const price = getServicePrice('reroll', 'shop');
      expect(price).toBe(
        Math.round(SERVICE_PRICES.reroll * MERCHANT_TYPES.shop.priceMultiplier)
      );
    });

    it('존재하지 않는 서비스는 기본 가격 50을 사용한다', () => {
      const price = getServicePrice('unknownService', 'shop');
      expect(price).toBe(50);
    });

    it('떠돌이 상인은 할인된 가격을 제공한다', () => {
      const shopPrice = getServicePrice('healSmall', 'shop');
      const wandererPrice = getServicePrice('healSmall', 'wanderer');
      expect(wandererPrice).toBeLessThan(shopPrice);
    });
  });
});
