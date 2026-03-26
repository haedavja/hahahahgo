/**
 * @file cardExecutionContext.test.ts
 * @description 카드 실행 컨텍스트 생성 유틸리티 테스트
 */

import { describe, it, expect, vi } from 'vitest';
import { buildBattleContext } from './cardExecutionContext';
import type { Card, HandAction } from '../../../types';

// Mock battleData
vi.mock('../battleData', () => ({
  BASE_PLAYER_ENERGY: 3,
}));

describe('cardExecutionContext', () => {
  describe('buildBattleContext', () => {
    const createMockCard = (overrides: Partial<Card> = {}): Card => ({
      id: 'test-card',
      name: '테스트 카드',
      type: 'attack',
      baseAtk: 10,
      slot: 1,
      actionCost: 1,
      ...overrides,
    });

    const createMockAction = (overrides: Partial<HandAction> = {}): HandAction => ({
      actor: 'player',
      card: createMockCard(),
      sp: 3,
      index: 0,
      time: 3,
      ...overrides,
    });

    it('기본 컨텍스트를 올바르게 생성한다', () => {
      const action = createMockAction({ sp: 5 });
      const queue = [action];

      const result = buildBattleContext({
        action,
        queue,
        qIndex: 0,
        turnNumber: 1,
        playerState: { energy: 3, maxEnergy: 3 },
        enemyState: { energy: 2, maxEnergy: 2, name: '고블린' },
        allCards: [action.card],
        currentHand: [action.card],
        nextTurnEffects: {},
      });

      expect(result.currentSp).toBe(5);
      expect(result.currentTurn).toBe(1);
      expect(result.queue).toBe(queue);
      expect(result.currentQIndex).toBe(0);
    });

    it('플레이어 남은 에너지를 올바르게 계산한다', () => {
      const card1 = createMockCard({ actionCost: 1 });
      const card2 = createMockCard({ actionCost: 2 });
      const action1 = createMockAction({ card: card1 });
      const action2 = createMockAction({ card: card2 });
      const queue = [action1, action2];

      const result = buildBattleContext({
        action: action1,
        queue,
        qIndex: 0,
        turnNumber: 1,
        playerState: { energy: 5, maxEnergy: 5 },
        enemyState: { energy: 2, maxEnergy: 2 },
        allCards: [],
        currentHand: [],
        nextTurnEffects: {},
      });

      // 총 사용 에너지: 1 + 2 = 3, 남은 에너지: 5 - 3 = 2
      expect(result.remainingEnergy).toBe(2);
    });

    it('적 남은 에너지를 올바르게 계산한다', () => {
      const enemyCard = createMockCard({ actionCost: 1 });
      const enemyAction: HandAction = {
        actor: 'enemy',
        card: enemyCard,
        sp: 2,
        index: 0,
        time: 2,
      };
      const queue = [enemyAction];

      const result = buildBattleContext({
        action: enemyAction,
        queue,
        qIndex: 0,
        turnNumber: 1,
        playerState: { energy: 3, maxEnergy: 3 },
        enemyState: { energy: 3, maxEnergy: 3 },
        allCards: [],
        currentHand: [],
        nextTurnEffects: {},
      });

      // 적 사용 에너지: 1, 남은 에너지: 3 - 1 = 2
      expect(result.enemyRemainingEnergy).toBe(2);
    });

    it('에너지가 음수가 되지 않도록 한다', () => {
      const card = createMockCard({ actionCost: 10 });
      const action = createMockAction({ card });
      const queue = [action];

      const result = buildBattleContext({
        action,
        queue,
        qIndex: 0,
        turnNumber: 1,
        playerState: { energy: 3, maxEnergy: 3 },
        enemyState: { energy: 2, maxEnergy: 2 },
        allCards: [],
        currentHand: [],
        nextTurnEffects: {},
      });

      expect(result.remainingEnergy).toBe(0);
    });

    it('다중 유닛 적의 이름을 올바르게 표시한다', () => {
      const enemyCard = createMockCard({ __sourceUnitId: 1 } as Partial<Card>);
      const enemyAction: HandAction = {
        actor: 'enemy',
        card: enemyCard,
        sp: 2,
        index: 0,
        time: 2,
      };

      const result = buildBattleContext({
        action: enemyAction,
        queue: [enemyAction],
        qIndex: 0,
        turnNumber: 1,
        playerState: { energy: 3, maxEnergy: 3 },
        enemyState: {
          energy: 2,
          maxEnergy: 2,
          name: '슬라임',
          units: [
            { unitId: 0, name: '슬라임A' },
            { unitId: 1, name: '슬라임B' },
          ],
        },
        allCards: [],
        currentHand: [],
        nextTurnEffects: {},
      });

      expect(result.enemyDisplayName).toBe('슬라임 x2');
    });

    it('fencingDamageBonus를 nextTurnEffects에서 가져온다', () => {
      const action = createMockAction();

      const result = buildBattleContext({
        action,
        queue: [action],
        qIndex: 0,
        turnNumber: 1,
        playerState: { energy: 3, maxEnergy: 3 },
        enemyState: { energy: 2, maxEnergy: 2 },
        allCards: [],
        currentHand: [],
        nextTurnEffects: { fencingDamageBonus: 5 },
      });

      expect(result.fencingDamageBonus).toBe(5);
    });

    it('fencingDamageBonus가 없으면 0을 반환한다', () => {
      const action = createMockAction();

      const result = buildBattleContext({
        action,
        queue: [action],
        qIndex: 0,
        turnNumber: 1,
        playerState: { energy: 3, maxEnergy: 3 },
        enemyState: { energy: 2, maxEnergy: 2 },
        allCards: [],
        currentHand: [],
        nextTurnEffects: {},
      });

      expect(result.fencingDamageBonus).toBe(0);
    });

    it('pathosNextCardEffects의 guaranteeCrit을 전달한다', () => {
      const action = createMockAction();

      const result = buildBattleContext({
        action,
        queue: [action],
        qIndex: 0,
        turnNumber: 1,
        playerState: { energy: 3, maxEnergy: 3 },
        enemyState: { energy: 2, maxEnergy: 2 },
        allCards: [],
        currentHand: [],
        nextTurnEffects: {},
        pathosNextCardEffects: { guaranteeCrit: true },
      });

      expect(result.guaranteedCrit).toBe(true);
      expect(result.pathosNextCardEffects?.guaranteeCrit).toBe(true);
    });

    it('pathosTurnEffects를 전달한다', () => {
      const action = createMockAction();

      const result = buildBattleContext({
        action,
        queue: [action],
        qIndex: 0,
        turnNumber: 1,
        playerState: { energy: 3, maxEnergy: 3 },
        enemyState: { energy: 2, maxEnergy: 2 },
        allCards: [],
        currentHand: [],
        nextTurnEffects: {},
        pathosTurnEffects: { someEffect: true },
      });

      expect(result.pathosTurnEffects).toEqual({ someEffect: true });
    });

    it('유닛이 없는 적의 경우 기본 이름을 사용한다', () => {
      const enemyAction: HandAction = {
        actor: 'enemy',
        card: createMockCard(),
        sp: 2,
        index: 0,
        time: 2,
      };

      const result = buildBattleContext({
        action: enemyAction,
        queue: [enemyAction],
        qIndex: 0,
        turnNumber: 1,
        playerState: { energy: 3, maxEnergy: 3 },
        enemyState: { energy: 2, maxEnergy: 2, name: '오크' },
        allCards: [],
        currentHand: [],
        nextTurnEffects: {},
      });

      expect(result.enemyDisplayName).toBe('오크 x1');
    });

    it('적 이름이 없으면 "몬스터"를 사용한다', () => {
      const enemyAction: HandAction = {
        actor: 'enemy',
        card: createMockCard(),
        sp: 2,
        index: 0,
        time: 2,
      };

      const result = buildBattleContext({
        action: enemyAction,
        queue: [enemyAction],
        qIndex: 0,
        turnNumber: 1,
        playerState: { energy: 3, maxEnergy: 3 },
        enemyState: { energy: 2, maxEnergy: 2 },
        allCards: [],
        currentHand: [],
        nextTurnEffects: {},
      });

      expect(result.enemyDisplayName).toBe('몬스터 x1');
    });

    it('hand와 allCards를 올바르게 전달한다', () => {
      const card1 = createMockCard({ id: 'card1' });
      const card2 = createMockCard({ id: 'card2' });
      const action = createMockAction({ card: card1 });

      const result = buildBattleContext({
        action,
        queue: [action],
        qIndex: 0,
        turnNumber: 1,
        playerState: { energy: 3, maxEnergy: 3 },
        enemyState: { energy: 2, maxEnergy: 2 },
        allCards: [card1, card2],
        currentHand: [card1],
        nextTurnEffects: {},
      });

      expect(result.allCards).toEqual([card1, card2]);
      expect(result.hand).toEqual([card1]);
    });
  });
});
