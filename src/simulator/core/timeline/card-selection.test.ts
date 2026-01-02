/**
 * @file card-selection.test.ts
 * @description 카드 선택 AI 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  getCardValue,
  cardValueToNumber,
  analyzePokerCombos,
  estimateDamageOutput,
  analyzeBattleSituation,
} from './card-selection';
import type { GameCard, GameBattleState } from '../game-types';

// Mock 카드 생성 헬퍼
function createMockCard(overrides: Partial<GameCard> = {}): GameCard {
  return {
    id: 'test_card',
    name: 'Test Card',
    type: 'attack',
    speedCost: 5,
    actionCost: 1,
    description: 'Test',
    ...overrides,
  };
}

describe('카드 선택 AI', () => {
  // ==================== 카드 값 추출 ====================
  describe('getCardValue', () => {
    it('카드 value 속성에서 값 추출', () => {
      const card = createMockCard({ name: 'Strike' }) as GameCard & { value: string };
      card.value = '5';

      expect(getCardValue(card)).toBe('5');
    });

    it('카드 이름에서 숫자 추출', () => {
      const card = createMockCard({ name: 'Strike 7' });

      expect(getCardValue(card)).toBe('7');
    });

    it('카드 이름에서 문자 값 추출', () => {
      const card = createMockCard({ name: 'Royal Guard K' });

      expect(getCardValue(card)).toBe('K');
    });

    it('카드 ID에서 값 추출', () => {
      const card = createMockCard({ id: 'strike_10', name: 'Strike' });

      expect(getCardValue(card)).toBe('10');
    });

    it('값이 없으면 null 반환', () => {
      const card = createMockCard({ id: 'basic', name: 'Basic Attack' });

      expect(getCardValue(card)).toBeNull();
    });
  });

  // ==================== 카드 값 숫자 변환 ====================
  describe('cardValueToNumber', () => {
    it('숫자 문자열 변환', () => {
      expect(cardValueToNumber('5')).toBe(5);
      expect(cardValueToNumber('10')).toBe(10);
    });

    it('A는 14', () => {
      expect(cardValueToNumber('A')).toBe(14);
    });

    it('K는 13', () => {
      expect(cardValueToNumber('K')).toBe(13);
    });

    it('Q는 12', () => {
      expect(cardValueToNumber('Q')).toBe(12);
    });

    it('J는 11', () => {
      expect(cardValueToNumber('J')).toBe(11);
    });
  });

  // ==================== 포커 조합 분석 ====================
  describe('analyzePokerCombos', () => {
    it('동일 값 카드 수 계산', () => {
      const cards = [
        createMockCard({ name: 'Strike 5' }),
        createMockCard({ name: 'Guard 5' }),
        createMockCard({ name: 'Attack 7' }),
      ];

      const result = analyzePokerCombos(cards);

      expect(result.valueCount['5']).toBe(2);
      expect(result.valueCount['7']).toBe(1);
    });

    it('스트레이트 가능성 감지', () => {
      const cards = [
        createMockCard({ name: 'Card 3' }),
        createMockCard({ name: 'Card 4' }),
        createMockCard({ name: 'Card 5' }),
      ];

      const result = analyzePokerCombos(cards);

      expect(result.straightPossible).toBe(true);
      expect(result.straightCards.length).toBe(3);
    });

    it('스트레이트 불가능', () => {
      const cards = [
        createMockCard({ name: 'Card 3' }),
        createMockCard({ name: 'Card 5' }),
        createMockCard({ name: 'Card 8' }),
      ];

      const result = analyzePokerCombos(cards);

      expect(result.straightPossible).toBe(false);
    });
  });

  // ==================== 피해량 추정 ====================
  describe('estimateDamageOutput', () => {
    it('공격 카드 피해량 합산', () => {
      const cards = [
        createMockCard({ damage: 10, actionCost: 1 }),
        createMockCard({ damage: 8, actionCost: 1 }),
      ];

      const result = estimateDamageOutput(cards, 3);

      expect(result).toBe(18);
    });

    it('에너지 부족 시 일부만 계산', () => {
      const cards = [
        createMockCard({ damage: 10, actionCost: 2 }),
        createMockCard({ damage: 8, actionCost: 2 }),
      ];

      const result = estimateDamageOutput(cards, 3);

      expect(result).toBe(10); // 첫 번째만 사용 가능
    });

    it('다단히트 카드 계산', () => {
      const cards = [
        createMockCard({ damage: 5, hits: 3, actionCost: 1 }),
      ];

      const result = estimateDamageOutput(cards, 3);

      expect(result).toBe(15); // 5 * 3
    });

    it('힘 보정 적용', () => {
      const cards = [
        createMockCard({ damage: 5, hits: 2, actionCost: 1 }),
      ];

      const result = estimateDamageOutput(cards, 3, 3);

      expect(result).toBe(16); // (5 + 3) * 2
    });

    it('공격 카드 없으면 0', () => {
      const cards = [
        createMockCard({ block: 10, actionCost: 1 }),
      ];

      const result = estimateDamageOutput(cards, 3);

      expect(result).toBe(0);
    });
  });

  // ==================== 상황 분석 ====================
  describe('analyzeBattleSituation', () => {
    const createMockState = (overrides: Partial<{
      playerHp: number;
      playerMaxHp: number;
      enemyHp: number;
      enemyMaxHp: number;
      isBoss: boolean;
      ether: number;
    }> = {}): GameBattleState => ({
      player: {
        hp: overrides.playerHp ?? 50,
        maxHp: overrides.playerMaxHp ?? 100,
        energy: 3,
        maxEnergy: 3,
        strength: 0,
        agility: 0,
        insight: 0,
        maxSpeed: 30,
        tokens: {},
        hand: [],
        deck: [],
        discard: [],
        relics: [],
        ether: overrides.ether ?? 0,
        block: 0,
        gold: 0,
      },
      enemy: {
        id: 'test_enemy',
        name: 'Test Enemy',
        hp: overrides.enemyHp ?? 50,
        maxHp: overrides.enemyMaxHp ?? 100,
        maxSpeed: 30,
        cardsPerTurn: 1,
        deck: [],
        block: 0,
        tokens: {},
        isBoss: overrides.isBoss ?? false,
      },
      turn: 1,
      phase: 'select',
      timeline: [],
      battleLog: [],
    });

    it('위험 상태 감지', () => {
      const state = createMockState({ playerHp: 30, playerMaxHp: 100 });

      const result = analyzeBattleSituation(state, 10);

      expect(result.isInDanger).toBe(true);
      expect(result.needsDefense).toBe(true);
    });

    it('안전 상태', () => {
      const state = createMockState({ playerHp: 80, playerMaxHp: 100 });

      const result = analyzeBattleSituation(state, 10);

      expect(result.isInDanger).toBe(false);
    });

    it('적 처치 가능 감지', () => {
      const state = createMockState({ enemyHp: 20 });

      const result = analyzeBattleSituation(state, 30);

      expect(result.canKillEnemy).toBe(true);
    });

    it('보스전 감지', () => {
      const state = createMockState({ isBoss: true });

      const result = analyzeBattleSituation(state, 10);

      expect(result.isBossFight).toBe(true);
    });

    it('에테르 버스트 감지', () => {
      const state = createMockState({ ether: 90 });

      const result = analyzeBattleSituation(state, 10);

      expect(result.nearBurst).toBe(true);
      expect(result.canBurst).toBe(false);
    });

    it('에테르 버스트 가능', () => {
      const state = createMockState({ ether: 100 });

      const result = analyzeBattleSituation(state, 10);

      expect(result.canBurst).toBe(true);
    });
  });
});
