/**
 * @file cards.test.ts
 * @description 카드 라이브러리 데이터 검증 테스트
 */

import { describe, it, expect } from 'vitest';
import { CARD_LIBRARY, PLAYER_STARTER_DECK, ENEMY_DECKS } from './cards';

describe('cards', () => {
  describe('CARD_LIBRARY', () => {
    it('카드 라이브러리가 비어있지 않다', () => {
      expect(Object.keys(CARD_LIBRARY).length).toBeGreaterThan(0);
    });

    it('모든 카드가 필수 필드를 가진다', () => {
      Object.values(CARD_LIBRARY).forEach(card => {
        expect(card.id).toBeDefined();
        expect(card.name).toBeDefined();
        expect(card.type).toBeDefined();
        expect(card.speedCost).toBeDefined();
        expect(card.actionCost).toBeDefined();
        expect(card.priority).toBeDefined();
        expect(card.description).toBeDefined();
      });
    });

    it('카드 ID가 키와 일치한다', () => {
      Object.entries(CARD_LIBRARY).forEach(([key, card]) => {
        expect(card.id).toBe(key);
      });
    });

    it('공격 카드는 damage 필드를 가진다', () => {
      Object.values(CARD_LIBRARY)
        .filter(card => card.type === 'attack')
        .forEach(card => {
          expect(card.damage).toBeDefined();
          expect(typeof card.damage).toBe('number');
          expect(card.damage).toBeGreaterThan(0);
        });
    });

    it('방어 카드는 block 필드를 가진다', () => {
      Object.values(CARD_LIBRARY)
        .filter(card => card.type === 'defense')
        .forEach(card => {
          expect(card.block).toBeDefined();
          expect(typeof card.block).toBe('number');
          expect(card.block).toBeGreaterThan(0);
        });
    });

    it('카드 타입이 유효하다', () => {
      const validTypes = ['attack', 'defense', 'move', 'reaction', 'support'];
      Object.values(CARD_LIBRARY).forEach(card => {
        expect(validTypes).toContain(card.type);
      });
    });

    it('우선순위가 유효하다', () => {
      const validPriorities = ['quick', 'normal', 'slow', 'instant'];
      Object.values(CARD_LIBRARY).forEach(card => {
        expect(validPriorities).toContain(card.priority);
      });
    });

    it('속도 비용이 양수다', () => {
      Object.values(CARD_LIBRARY).forEach(card => {
        expect(card.speedCost).toBeGreaterThan(0);
      });
    });

    it('행동 비용이 양수다', () => {
      Object.values(CARD_LIBRARY).forEach(card => {
        expect(card.actionCost).toBeGreaterThan(0);
      });
    });

    it('태그가 배열이다', () => {
      Object.values(CARD_LIBRARY).forEach(card => {
        expect(Array.isArray(card.tags)).toBe(true);
      });
    });
  });

  describe('PLAYER_STARTER_DECK', () => {
    it('시작 덱이 비어있지 않다', () => {
      expect(PLAYER_STARTER_DECK.length).toBeGreaterThan(0);
    });

    it('시작 덱의 모든 카드가 카드 라이브러리에 존재한다', () => {
      PLAYER_STARTER_DECK.forEach(cardId => {
        expect(CARD_LIBRARY[cardId]).toBeDefined();
      });
    });

    it('시작 덱에 공격 카드가 포함되어 있다', () => {
      const hasAttack = PLAYER_STARTER_DECK.some(
        cardId => CARD_LIBRARY[cardId]?.type === 'attack'
      );
      expect(hasAttack).toBe(true);
    });

    it('시작 덱에 방어 카드가 포함되어 있다', () => {
      const hasDefense = PLAYER_STARTER_DECK.some(
        cardId => CARD_LIBRARY[cardId]?.type === 'defense'
      );
      expect(hasDefense).toBe(true);
    });
  });

  describe('ENEMY_DECKS', () => {
    it('적 덱이 정의되어 있다', () => {
      expect(ENEMY_DECKS).toBeDefined();
      expect(Object.keys(ENEMY_DECKS).length).toBeGreaterThan(0);
    });

    it('모든 적 덱 유형이 존재한다', () => {
      expect(ENEMY_DECKS.battle).toBeDefined();
      expect(ENEMY_DECKS.elite).toBeDefined();
      expect(ENEMY_DECKS.boss).toBeDefined();
      expect(ENEMY_DECKS.dungeon).toBeDefined();
      expect(ENEMY_DECKS.default).toBeDefined();
    });

    it('모든 적 덱이 비어있지 않다', () => {
      Object.values(ENEMY_DECKS).forEach(deck => {
        expect(deck.length).toBeGreaterThan(0);
      });
    });
  });
});
