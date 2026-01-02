/**
 * @file battleReducer.test.ts
 * @description 전투 상태 관리 Reducer 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { battleReducer, ACTIONS, createInitialState } from './battleReducer';
import type { FullBattleState } from './battleReducerState';
import type { Card } from '../../../types';

// Mock randomUtils
vi.mock('../../../lib/randomUtils', () => ({
  shuffle: vi.fn((arr) => [...arr].reverse()),
}));

// Helper to create test cards
const createTestCard = (id: string, name: string, type: Card['type'] = 'attack'): Card => ({
  id,
  name,
  type,
  speedCost: 1,
  actionCost: 1,
  description: '',
});

describe('battleReducer', () => {
  let initialState: FullBattleState;

  beforeEach(() => {
    initialState = createInitialState({
      initialPlayerState: {
        hp: 100,
        maxHp: 100,
        block: 0,
        tokens: {},
        energy: 3,
        maxEnergy: 3,
      },
      initialEnemyState: {
        hp: 50,
        maxHp: 50,
        block: 0,
        tokens: {},
      },
    });
  });

  describe('플레이어/적 상태', () => {
    it('SET_PLAYER가 플레이어 상태를 설정한다', () => {
      const newPlayer = { hp: 100, maxHp: 100, block: 0, tokens: {}, energy: 3, maxEnergy: 3 };
      const result = battleReducer(initialState, {
        type: ACTIONS.SET_PLAYER,
        payload: newPlayer,
      });
      expect(result.player).toEqual(newPlayer);
    });

    it('UPDATE_PLAYER가 플레이어 상태를 부분 업데이트한다', () => {
      const result = battleReducer(initialState, {
        type: ACTIONS.UPDATE_PLAYER,
        payload: { hp: 50 },
      });
      expect(result.player.hp).toBe(50);
    });

    it('SET_ENEMY가 적 상태를 설정한다', () => {
      const newEnemy = { hp: 80, maxHp: 80, block: 0, tokens: {} };
      const result = battleReducer(initialState, {
        type: ACTIONS.SET_ENEMY,
        payload: newEnemy,
      });
      expect(result.enemy).toEqual(newEnemy);
    });

    it('UPDATE_ENEMY가 적 상태를 부분 업데이트한다', () => {
      const result = battleReducer(initialState, {
        type: ACTIONS.UPDATE_ENEMY,
        payload: { hp: 30 },
      });
      expect(result.enemy.hp).toBe(30);
    });
  });

  describe('페이즈', () => {
    it('SET_PHASE가 페이즈를 변경한다', () => {
      const result = battleReducer(initialState, {
        type: ACTIONS.SET_PHASE,
        payload: 'respond',
      });
      expect(result.phase).toBe('respond');
    });
  });

  describe('카드 관리', () => {
    it('SET_HAND가 핸드를 설정한다', () => {
      const hand = [
        createTestCard('card1', 'Card 1', 'attack'),
        createTestCard('card2', 'Card 2', 'defense'),
      ];
      const result = battleReducer(initialState, {
        type: ACTIONS.SET_HAND,
        payload: hand,
      });
      expect(result.hand).toEqual(hand);
    });

    it('SET_SELECTED가 선택된 카드를 설정한다', () => {
      const selected = [
        createTestCard('card1', 'Card 1', 'attack'),
        createTestCard('card2', 'Card 2', 'defense'),
      ];
      const result = battleReducer(initialState, {
        type: ACTIONS.SET_SELECTED,
        payload: selected,
      });
      expect(result.selected).toEqual(selected);
    });

    it('ADD_SELECTED가 선택된 카드를 추가한다', () => {
      const card1 = createTestCard('card1', 'Card 1', 'attack');
      const card2 = createTestCard('card2', 'Card 2', 'defense');
      const stateWithSelected = { ...initialState, selected: [card1] };
      const result = battleReducer(stateWithSelected, {
        type: ACTIONS.ADD_SELECTED,
        payload: card2,
      });
      expect(result.selected).toEqual([card1, card2]);
    });

    it('REMOVE_SELECTED가 선택된 카드를 제거한다', () => {
      const card1 = createTestCard('card1', 'Card 1', 'attack');
      const card2 = createTestCard('card2', 'Card 2', 'defense');
      const card3 = createTestCard('card3', 'Card 3', 'general');
      const stateWithSelected = { ...initialState, selected: [card1, card2, card3] };
      const result = battleReducer(stateWithSelected, {
        type: ACTIONS.REMOVE_SELECTED,
        payload: 1,
      });
      expect(result.selected).toEqual([card1, card3]);
    });

    it('SET_CAN_REDRAW가 재추첨 가능 여부를 설정한다', () => {
      const result = battleReducer(initialState, {
        type: ACTIONS.SET_CAN_REDRAW,
        payload: false,
      });
      expect(result.canRedraw).toBe(false);
    });

    it('ADD_VANISHED_CARD가 소멸 카드를 추가한다', () => {
      const card = createTestCard('card1', 'Card 1', 'attack');
      const result = battleReducer(initialState, {
        type: ACTIONS.ADD_VANISHED_CARD,
        payload: card,
      });
      expect(result.vanishedCards).toContain(card);
    });

    it('INCREMENT_CARD_USAGE가 카드 사용 횟수를 증가시킨다', () => {
      const result = battleReducer(initialState, {
        type: ACTIONS.INCREMENT_CARD_USAGE,
        payload: 'card1',
      });
      expect(result.cardUsageCount['card1']).toBe(1);

      const result2 = battleReducer(result, {
        type: ACTIONS.INCREMENT_CARD_USAGE,
        payload: 'card1',
      });
      expect(result2.cardUsageCount['card1']).toBe(2);
    });
  });

  describe('덱/무덤 시스템', () => {
    it('SET_DECK이 덱을 설정한다', () => {
      const deck = [
        createTestCard('card1', 'Card 1', 'attack'),
        createTestCard('card2', 'Card 2', 'defense'),
        createTestCard('card3', 'Card 3', 'general'),
      ];
      const result = battleReducer(initialState, {
        type: ACTIONS.SET_DECK,
        payload: deck,
      });
      expect(result.deck).toEqual(deck);
    });

    it('SET_DISCARD_PILE이 무덤을 설정한다', () => {
      const discard = [
        createTestCard('card1', 'Card 1', 'attack'),
        createTestCard('card2', 'Card 2', 'defense'),
      ];
      const result = battleReducer(initialState, {
        type: ACTIONS.SET_DISCARD_PILE,
        payload: discard,
      });
      expect(result.discardPile).toEqual(discard);
    });

    it('ADD_TO_DISCARD가 단일 카드를 무덤에 추가한다', () => {
      const card = createTestCard('card1', 'Card 1', 'attack');
      const result = battleReducer(initialState, {
        type: ACTIONS.ADD_TO_DISCARD,
        payload: card,
      });
      expect(result.discardPile).toContain(card);
    });

    it('ADD_TO_DISCARD가 배열 카드를 무덤에 추가한다', () => {
      const card1 = createTestCard('card1', 'Card 1', 'attack');
      const card2 = createTestCard('card2', 'Card 2', 'defense');
      const result = battleReducer(initialState, {
        type: ACTIONS.ADD_TO_DISCARD,
        payload: [card1, card2] as any,
      });
      expect(result.discardPile).toContain(card1);
      expect(result.discardPile).toContain(card2);
    });

    it('DRAW_FROM_DECK이 덱에서 카드를 뽑는다', () => {
      const card1 = createTestCard('card1', 'Card 1', 'attack');
      const card2 = createTestCard('card2', 'Card 2', 'defense');
      const card3 = createTestCard('card3', 'Card 3', 'general');
      const stateWithDeck: FullBattleState = {
        ...initialState,
        deck: [card1, card2, card3],
        hand: [],
      };
      const result = battleReducer(stateWithDeck, {
        type: ACTIONS.DRAW_FROM_DECK,
        payload: 2,
      });
      expect(result.deck).toEqual([card3]);
      expect(result.hand).toEqual([card1, card2]);
    });

    it('SHUFFLE_DISCARD_INTO_DECK이 무덤을 덱에 섞는다', () => {
      const card1 = createTestCard('card1', 'Card 1', 'attack');
      const card2 = createTestCard('card2', 'Card 2', 'defense');
      const card3 = createTestCard('card3', 'Card 3', 'general');
      const stateWithDiscard: FullBattleState = {
        ...initialState,
        deck: [card1],
        discardPile: [card2, card3],
      };
      const result = battleReducer(stateWithDiscard, {
        type: ACTIONS.SHUFFLE_DISCARD_INTO_DECK,
      });
      expect(result.deck.length).toBe(3);
      expect(result.discardPile).toEqual([]);
    });
  });

  describe('실행 큐', () => {
    it('SET_QUEUE가 큐를 설정한다', () => {
      const queue = [
        {
          actor: 'player' as const,
          card: createTestCard('card1', 'Card 1', 'attack'),
          sp: 1,
        },
      ];
      const result = battleReducer(initialState, {
        type: ACTIONS.SET_QUEUE,
        payload: queue,
      });
      expect(result.queue).toEqual(queue);
    });

    it('SET_Q_INDEX가 큐 인덱스를 설정한다', () => {
      const result = battleReducer(initialState, {
        type: ACTIONS.SET_Q_INDEX,
        payload: 3,
      });
      expect(result.qIndex).toBe(3);
    });

    it('INCREMENT_Q_INDEX가 큐 인덱스를 증가시킨다', () => {
      const stateWithIndex = { ...initialState, qIndex: 2 };
      const result = battleReducer(stateWithIndex, {
        type: ACTIONS.INCREMENT_Q_INDEX,
      });
      expect(result.qIndex).toBe(3);
    });
  });

  describe('로그 & 이벤트', () => {
    it('ADD_LOG가 로그를 추가한다', () => {
      const result = battleReducer(initialState, {
        type: ACTIONS.ADD_LOG,
        payload: '플레이어가 공격했습니다.',
      });
      expect(result.log).toContain('플레이어가 공격했습니다.');
    });

    it('SET_LOG가 로그를 설정한다', () => {
      const logs = ['로그1', '로그2'];
      const result = battleReducer(initialState, {
        type: ACTIONS.SET_LOG,
        payload: logs,
      });
      expect(result.log).toEqual(logs);
    });
  });

  describe('턴', () => {
    it('SET_TURN_NUMBER가 턴 번호를 설정한다', () => {
      const result = battleReducer(initialState, {
        type: ACTIONS.SET_TURN_NUMBER,
        payload: 5,
      });
      expect(result.turnNumber).toBe(5);
    });

    it('INCREMENT_TURN이 턴 번호를 증가시킨다', () => {
      const stateWithTurn = { ...initialState, turnNumber: 3 };
      const result = battleReducer(stateWithTurn, {
        type: ACTIONS.INCREMENT_TURN,
      });
      expect(result.turnNumber).toBe(4);
    });
  });

  describe('에테르', () => {
    it('SET_TURN_ETHER_ACCUMULATED가 턴 에테르 누적을 설정한다', () => {
      const result = battleReducer(initialState, {
        type: ACTIONS.SET_TURN_ETHER_ACCUMULATED,
        payload: 50,
      });
      expect(result.turnEtherAccumulated).toBe(50);
    });

    it('SET_NET_ETHER_DELTA가 순 에테르 변화를 설정한다', () => {
      const result = battleReducer(initialState, {
        type: ACTIONS.SET_NET_ETHER_DELTA,
        payload: 30,
      });
      expect(result.netEtherDelta).toBe(30);
    });
  });

  describe('다중 유닛 시스템', () => {
    it('SET_SELECTED_TARGET_UNIT이 타겟 유닛을 설정한다', () => {
      const result = battleReducer(initialState, {
        type: ACTIONS.SET_SELECTED_TARGET_UNIT,
        payload: 2,
      });
      expect(result.selectedTargetUnit).toBe(2);
    });

    it('UPDATE_ENEMY_UNIT이 적 유닛을 업데이트한다', () => {
      const stateWithUnits: FullBattleState = {
        ...initialState,
        enemy: {
          ...initialState.enemy,
          units: [
            { unitId: 0, hp: 20, maxHp: 20, block: 0, tokens: {} },
            { unitId: 1, hp: 15, maxHp: 15, block: 0, tokens: {} },
          ],
        },
      };
      const result = battleReducer(stateWithUnits, {
        type: ACTIONS.UPDATE_ENEMY_UNIT,
        payload: { unitId: 0, updates: { hp: 10 } },
      });
      const unit = result.enemy.units?.find((u) => u.unitId === 0);
      expect(unit?.hp).toBe(10);
    });
  });

  describe('UI 상태', () => {
    it('TOGGLE_CHARACTER_SHEET가 캐릭터 시트를 토글한다', () => {
      const result = battleReducer(initialState, {
        type: ACTIONS.TOGGLE_CHARACTER_SHEET,
      });
      expect(result.showCharacterSheet).toBe(true);

      const result2 = battleReducer(result, {
        type: ACTIONS.TOGGLE_CHARACTER_SHEET,
      });
      expect(result2.showCharacterSheet).toBe(false);
    });

    it('SET_IS_SIMPLIFIED가 간소화 모드를 설정한다', () => {
      const result = battleReducer(initialState, {
        type: ACTIONS.SET_IS_SIMPLIFIED,
        payload: true,
      });
      expect(result.isSimplified).toBe(true);
    });
  });

  describe('토큰 시스템', () => {
    it('UPDATE_PLAYER_TOKENS가 플레이어 토큰을 업데이트한다', () => {
      const tokens = {
        usage: [{ id: 'strength', stacks: 2 }],
        turn: [{ id: 'burn', stacks: 1 }],
      };
      const result = battleReducer(initialState, {
        type: ACTIONS.UPDATE_PLAYER_TOKENS,
        payload: tokens,
      });
      expect(result.player.tokens).toEqual(tokens);
    });

    it('UPDATE_ENEMY_TOKENS가 적 토큰을 업데이트한다', () => {
      const tokens = {
        turn: [{ id: 'vulnerable', stacks: 1 }],
      };
      const result = battleReducer(initialState, {
        type: ACTIONS.UPDATE_ENEMY_TOKENS,
        payload: tokens,
      });
      expect(result.enemy.tokens).toEqual(tokens);
    });
  });

  describe('피해 분배 시스템', () => {
    it('SET_DISTRIBUTION_MODE가 분배 모드를 설정한다', () => {
      const result = battleReducer(initialState, {
        type: ACTIONS.SET_DISTRIBUTION_MODE,
        payload: true,
      });
      expect(result.distributionMode).toBe(true);
    });

    it('UPDATE_DAMAGE_DISTRIBUTION이 피해 분배를 업데이트한다', () => {
      const result = battleReducer(initialState, {
        type: ACTIONS.UPDATE_DAMAGE_DISTRIBUTION,
        payload: { unitId: 0, damage: 10 },
      });
      expect(result.damageDistribution[0]).toBe(10);
    });

    it('RESET_DISTRIBUTION이 분배 상태를 초기화한다', () => {
      const stateWithDistribution: FullBattleState = {
        ...initialState,
        distributionMode: true,
        pendingDistributionCard: createTestCard('card1', 'Card 1', 'attack'),
        damageDistribution: { 0: 10, 1: 5 },
        totalDistributableDamage: 15,
      };
      const result = battleReducer(stateWithDistribution, {
        type: ACTIONS.RESET_DISTRIBUTION,
      });
      expect(result.distributionMode).toBe(false);
      expect(result.pendingDistributionCard).toBeNull();
      expect(result.damageDistribution).toEqual({});
      expect(result.totalDistributableDamage).toBe(0);
    });
  });

  describe('복합 액션', () => {
    it('RESET_TURN이 턴 상태를 초기화한다', () => {
      const card1 = createTestCard('card1', 'Card 1', 'attack');
      const card2 = createTestCard('card2', 'Card 2', 'defense');
      const stateWithTurnData: FullBattleState = {
        ...initialState,
        selected: [card1, card2],
        canRedraw: false,
        usedCardIndices: [0, 1, 2],
        disappearingCards: [0],
        hiddenCards: [1],
        turnEtherAccumulated: 50,
        enemyTurnEtherAccumulated: 30,
      };
      const result = battleReducer(stateWithTurnData, {
        type: ACTIONS.RESET_TURN,
      });
      expect(result.selected).toEqual([]);
      expect(result.canRedraw).toBe(true);
      expect(result.usedCardIndices).toEqual([]);
      expect(result.turnEtherAccumulated).toBe(0);
    });

    it('RESET_ETHER_ANIMATION이 에테르 애니메이션을 초기화한다', () => {
      const stateWithEther = {
        ...initialState,
        etherAnimationPts: 100,
        etherFinalValue: 50,
        etherPulse: true,
        playerOverdriveFlash: true,
      };
      const result = battleReducer(stateWithEther, {
        type: ACTIONS.RESET_ETHER_ANIMATION,
      });
      expect(result.etherAnimationPts).toBeNull();
      expect(result.etherFinalValue).toBeNull();
      expect(result.etherPulse).toBe(false);
      expect(result.playerOverdriveFlash).toBe(false);
    });
  });

  describe('알 수 없는 액션', () => {
    it('알 수 없는 액션은 상태를 변경하지 않는다', () => {
      const result = battleReducer(initialState, {
        type: 'UNKNOWN_ACTION' as any,
        payload: 'test',
      });
      expect(result).toBe(initialState);
    });
  });
});
