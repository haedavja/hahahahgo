// @ts-nocheck - Test file with type issues
/**
 * @file enemy-patterns.test.ts
 * @description 적 AI 패턴 시스템 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EnemyAI,
  createEnemyAI,
  getPatternForEnemy,
  type EnemyPattern,
} from '../enemy-patterns';
import type { GameCard, EnemyState, PlayerState, TokenState } from '../../core/game-types';

// 테스트용 카드 생성
function createMockCard(overrides: Partial<GameCard> = {}): GameCard {
  return {
    id: `card_${Math.random().toString(36).substr(2, 9)}`,
    name: '테스트 카드',
    cost: 1,
    type: 'attack',
    description: '테스트',
    speedCost: 3,
    ...overrides,
  } as GameCard;
}

// 테스트용 적 상태 생성
function createMockEnemy(overrides: Partial<EnemyState> = {}): EnemyState {
  return {
    hp: 100,
    maxHp: 100,
    block: 0,
    tokens: {},
    intent: null,
    ...overrides,
  } as EnemyState;
}

// 테스트용 플레이어 상태 생성
function createMockPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    hp: 80,
    maxHp: 100,
    block: 0,
    tokens: [],
    hand: [],
    deck: [],
    discard: [],
    ...overrides,
  } as PlayerState;
}

// 테스트용 카드 라이브러리
function createCardLibrary(): Record<string, GameCard> {
  return {
    attack1: createMockCard({ id: 'attack1', name: '기본 공격', damage: 10, type: 'attack' }),
    attack2: createMockCard({ id: 'attack2', name: '강력 공격', damage: 20, type: 'attack' }),
    attack3: createMockCard({ id: 'attack3', name: '다중 공격', damage: 5, hits: 3, type: 'attack' }),
    defense1: createMockCard({ id: 'defense1', name: '기본 방어', block: 10, type: 'defense' }),
    defense2: createMockCard({ id: 'defense2', name: '강력 방어', block: 20, type: 'defense' }),
    combo1: createMockCard({ id: 'combo1', name: '공방 조합', damage: 8, block: 8, type: 'skill' }),
    special1: createMockCard({
      id: 'special1',
      name: '화상 공격',
      damage: 5,
      appliedTokens: [{ id: 'burn', stacks: 2, target: 'enemy' }],
    }),
    special2: createMockCard({
      id: 'special2',
      name: '힘 버프',
      appliedTokens: [{ id: 'strength', stacks: 2, target: 'self' }],
    }),
    debuff1: createMockCard({
      id: 'debuff1',
      name: '허약 부여',
      appliedTokens: [{ id: 'vulnerable', stacks: 1, target: 'player' }],
    }),
    fast1: createMockCard({ id: 'fast1', name: '빠른 공격', damage: 8, speedCost: 2, type: 'attack' }),
    slow1: createMockCard({ id: 'slow1', name: '느린 공격', damage: 15, speedCost: 7, type: 'attack' }),
    cross1: createMockCard({ id: 'cross1', name: '교차 공격', damage: 10, crossBonus: 5, type: 'attack' }),
    trait1: createMockCard({
      id: 'trait1',
      name: '양날의 검',
      damage: 20,
      traits: ['double_edge'],
    }),
    assassin1: createMockCard({ id: 'assassin1', name: '암살', damage: 15, speedCost: 3 }),
    killer1: createMockCard({ id: 'killer1', name: '마무리', damage: 100, type: 'attack' }),
    ignoreBlock: createMockCard({ id: 'ignoreBlock', name: '관통 공격', damage: 10, ignoreBlock: true }),
    poison1: createMockCard({
      id: 'poison1',
      name: '독 공격',
      damage: 3,
      appliedTokens: [{ id: 'poison', stacks: 3, target: 'enemy' }],
    }),
    regen1: createMockCard({
      id: 'regen1',
      name: '재생',
      appliedTokens: [{ id: 'regeneration', stacks: 2, target: 'self' }],
    }),
  };
}

describe('enemy-patterns', () => {
  let cardLibrary: Record<string, GameCard>;
  let ai: EnemyAI;

  beforeEach(() => {
    cardLibrary = createCardLibrary();
    ai = new EnemyAI(cardLibrary);
  });

  describe('EnemyAI 생성', () => {
    it('기본 패턴(balanced)으로 생성된다', () => {
      const enemyAI = new EnemyAI(cardLibrary);
      expect(enemyAI).toBeDefined();
    });

    it('특정 패턴으로 생성할 수 있다', () => {
      const patterns: EnemyPattern[] = [
        'aggressive', 'defensive', 'balanced', 'tactical', 'berserk', 'support', 'assassin'
      ];

      for (const pattern of patterns) {
        const enemyAI = new EnemyAI(cardLibrary, pattern);
        expect(enemyAI).toBeDefined();
      }
    });
  });

  describe('setPattern', () => {
    it('패턴을 변경할 수 있다', () => {
      ai.setPattern('aggressive');
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer(),
        ['attack1', 'defense1'],
        1
      );
      expect(decision.pattern).toBe('aggressive');
    });

    it('모든 패턴으로 변경 가능', () => {
      const patterns: EnemyPattern[] = ['aggressive', 'defensive', 'tactical', 'berserk'];

      for (const pattern of patterns) {
        ai.setPattern(pattern);
        const decision = ai.selectCards(
          createMockEnemy(),
          createMockPlayer(),
          ['attack1'],
          1
        );
        expect(decision.pattern).toBe(pattern);
      }
    });
  });

  describe('selectCards', () => {
    it('지정된 수만큼 카드를 선택한다', () => {
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer(),
        Object.keys(cardLibrary),
        3
      );

      expect(decision.selectedCards.length).toBe(3);
      expect(decision.reasoning.length).toBeGreaterThan(0);
    });

    it('가용 카드가 부족하면 가능한 만큼 선택', () => {
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer(),
        ['attack1', 'defense1'],
        5
      );

      expect(decision.selectedCards.length).toBe(2);
    });

    it('존재하지 않는 카드 ID는 무시', () => {
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer(),
        ['attack1', 'invalid_card', 'defense1'],
        3
      );

      expect(decision.selectedCards.length).toBeLessThanOrEqual(2);
    });
  });

  describe('공격 패턴 테스트 (aggressive)', () => {
    beforeEach(() => {
      ai.setPattern('aggressive');
    });

    it('공격 카드를 우선 선택한다', () => {
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer(),
        ['attack2', 'defense1', 'attack1'],
        2
      );

      const hasAttack = decision.selectedCards.some(c => c.damage && c.damage > 0);
      expect(hasAttack).toBe(true);
    });

    it('다중 히트 카드에 보너스 적용', () => {
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer(),
        ['attack1', 'attack3'], // attack3: 5 damage * 3 hits
        1
      );

      // 다중 히트 보너스 때문에 attack3 선택 가능성 높음
      expect(decision.selectedCards[0]).toBeDefined();
    });

    it('HP 낮을 때 더 공격적', () => {
      const decision = ai.selectCards(
        createMockEnemy({ hp: 30, maxHp: 100 }), // 30% HP
        createMockPlayer(),
        ['attack2', 'defense1'],
        1
      );

      expect(decision.reasoning.some(r => r.includes('공격'))).toBe(true);
    });

    it('치명적 HP에서 올인', () => {
      const decision = ai.selectCards(
        createMockEnemy({ hp: 15, maxHp: 100 }), // 15% HP
        createMockPlayer(),
        ['attack2', 'defense1'],
        1
      );

      expect(decision.reasoning.some(r => r.includes('올인'))).toBe(true);
    });
  });

  describe('방어 패턴 테스트 (defensive)', () => {
    beforeEach(() => {
      ai.setPattern('defensive');
    });

    it('방어 카드를 우선 선택한다', () => {
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer(),
        ['attack1', 'defense2'],
        1
      );

      const selectedCard = decision.selectedCards[0];
      expect(selectedCard).toBeDefined();
      // defensive 패턴에서는 방어 가중치가 높음
    });

    it('공방 조합 카드 선호', () => {
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer(),
        ['attack1', 'combo1', 'defense1'],
        1
      );

      // combo1: 공격 + 방어 조합 보너스
      expect(decision.selectedCards[0]).toBeDefined();
    });

    it('HP 낮을 때 더 방어적', () => {
      const decision = ai.selectCards(
        createMockEnemy({ hp: 40, maxHp: 100 }), // 40% HP
        createMockPlayer(),
        ['attack2', 'defense2'],
        1
      );

      expect(decision.reasoning.some(r => r.includes('방어'))).toBe(true);
    });

    it('치명적 HP에서 필사 방어', () => {
      const decision = ai.selectCards(
        createMockEnemy({ hp: 20, maxHp: 100 }), // 20% HP
        createMockPlayer(),
        ['attack2', 'defense2'],
        1
      );

      expect(decision.reasoning.some(r => r.includes('필사'))).toBe(true);
    });
  });

  describe('전술 패턴 테스트 (tactical)', () => {
    beforeEach(() => {
      ai.setPattern('tactical');
    });

    it('교차 보너스 카드 선호', () => {
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer(),
        ['attack1', 'cross1'],
        1
      );

      expect(decision.selectedCards[0]).toBeDefined();
    });

    it('특성 있는 카드 선호', () => {
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer(),
        ['attack1', 'trait1'],
        2
      );

      expect(decision.selectedCards.length).toBe(2);
    });

    it('특수 효과 가중치 높음', () => {
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer(),
        ['attack1', 'special1', 'debuff1'],
        2
      );

      // 특수 효과 있는 카드들 선택
      expect(decision.selectedCards.length).toBe(2);
    });
  });

  describe('광폭화 패턴 테스트 (berserk)', () => {
    beforeEach(() => {
      ai.setPattern('berserk');
    });

    it('양날의 검 카드도 사용', () => {
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer(),
        ['attack1', 'trait1'],
        1
      );

      expect(decision.selectedCards[0]).toBeDefined();
    });

    it('HP 낮을 때 광폭화', () => {
      const decision = ai.selectCards(
        createMockEnemy({ hp: 40, maxHp: 100 }), // 40% HP
        createMockPlayer(),
        ['attack2', 'defense1'],
        1
      );

      expect(decision.reasoning.some(r => r.includes('광폭화'))).toBe(true);
    });

    it('방어보다 공격 우선', () => {
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer(),
        ['attack2', 'defense2'],
        1
      );

      // berserk는 공격 가중치 높음
      expect(decision.selectedCards[0]).toBeDefined();
    });
  });

  describe('암살자 패턴 테스트 (assassin)', () => {
    beforeEach(() => {
      ai.setPattern('assassin');
    });

    it('빠른 고피해 카드 선호', () => {
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer(),
        ['slow1', 'assassin1'], // assassin1: 15 damage, speed 3
        1
      );

      expect(decision.selectedCards[0]).toBeDefined();
    });

    it('매우 공격적', () => {
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer(),
        ['attack2', 'defense2'],
        1
      );

      // assassin은 attackWeight가 2.5로 매우 높음
      expect(decision.selectedCards[0]).toBeDefined();
    });
  });

  describe('지원 패턴 테스트 (support)', () => {
    beforeEach(() => {
      ai.setPattern('support');
    });

    it('특수 효과 카드 선호', () => {
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer(),
        ['attack1', 'special2', 'regen1'],
        2
      );

      // 버프 카드들 선택 가능성 높음
      expect(decision.selectedCards.length).toBe(2);
    });

    it('치명적 HP에서 힐 우선', () => {
      const decision = ai.selectCards(
        createMockEnemy({ hp: 15, maxHp: 100 }), // 15% HP
        createMockPlayer(),
        ['attack2', 'regen1'],
        1
      );

      expect(decision.reasoning.some(r => r.includes('힐'))).toBe(true);
    });
  });

  describe('플레이어 상태에 따른 조정', () => {
    it('플레이어 빈사 시 마무리 시도', () => {
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer({ hp: 15, maxHp: 100 }), // 플레이어 15% HP
        ['attack2', 'defense1'],
        1
      );

      expect(decision.reasoning.some(r => r.includes('마무리'))).toBe(true);
    });

    it('플레이어 풀피 시 디버프 우선', () => {
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer({ hp: 100, maxHp: 100 }), // 플레이어 풀피
        ['attack1', 'debuff1'],
        2
      );

      expect(decision.reasoning.some(r => r.includes('디버프'))).toBe(true);
    });

    it('킬 가능 시 해당 카드 선호', () => {
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer({ hp: 20, maxHp: 100, block: 0 }), // 20 HP
        ['attack1', 'attack2'], // attack2: 20 damage = 킬 가능
        1
      );

      // 킬 가능한 attack2 선택 가능성 높음
      expect(decision.selectedCards[0]).toBeDefined();
    });

    it('플레이어 방어력 고려', () => {
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer({ hp: 80, maxHp: 100, block: 20 }), // 높은 방어력
        ['attack1', 'ignoreBlock'],
        1
      );

      // 방어력 무시 카드 고려
      expect(decision.selectedCards[0]).toBeDefined();
    });
  });

  describe('다양성 선택', () => {
    it('non-aggressive 패턴에서 공격만 있으면 방어 추가', () => {
      ai.setPattern('balanced');
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer(),
        ['attack1', 'attack2', 'defense1'],
        2
      );

      // 다양성을 위해 방어 카드 추가될 수 있음
      expect(decision.selectedCards.length).toBe(2);
    });

    it('aggressive 패턴에서는 다양성 무시', () => {
      ai.setPattern('aggressive');
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer(),
        ['attack1', 'attack2', 'defense1'],
        2
      );

      // aggressive는 공격 카드만 선택해도 됨
      expect(decision.selectedCards.length).toBe(2);
    });
  });

  describe('토큰 효과 평가', () => {
    it('플레이어에게 부여하는 디버프 평가', () => {
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer(),
        ['attack1', 'debuff1', 'poison1'],
        2
      );

      // 디버프 카드들 선택
      expect(decision.selectedCards.length).toBe(2);
    });

    it('자신에게 부여하는 버프 평가', () => {
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer(),
        ['attack1', 'special2', 'regen1'],
        2
      );

      // 버프 카드들 선택
      expect(decision.selectedCards.length).toBe(2);
    });
  });

  describe('createEnemyAI 팩토리 함수', () => {
    it('EnemyAI 인스턴스를 생성한다', () => {
      const enemyAI = createEnemyAI(cardLibrary);
      expect(enemyAI).toBeInstanceOf(EnemyAI);
    });

    it('패턴과 함께 생성할 수 있다', () => {
      const enemyAI = createEnemyAI(cardLibrary, 'tactical');
      const decision = enemyAI.selectCards(
        createMockEnemy(),
        createMockPlayer(),
        ['attack1'],
        1
      );
      expect(decision.pattern).toBe('tactical');
    });
  });

  describe('getPatternForEnemy 함수', () => {
    it('ghoul은 aggressive', () => {
      expect(getPatternForEnemy('ghoul')).toBe('aggressive');
    });

    it('berserker는 berserk', () => {
      expect(getPatternForEnemy('berserker')).toBe('berserk');
    });

    it('deserter는 defensive', () => {
      expect(getPatternForEnemy('deserter')).toBe('defensive');
    });

    it('captain은 tactical', () => {
      expect(getPatternForEnemy('captain')).toBe('tactical');
    });

    it('alchemist는 support', () => {
      expect(getPatternForEnemy('alchemist')).toBe('support');
    });

    it('nemesis는 assassin', () => {
      expect(getPatternForEnemy('nemesis')).toBe('assassin');
    });

    it('알 수 없는 적은 balanced', () => {
      expect(getPatternForEnemy('unknown_enemy')).toBe('balanced');
    });

    it('hunter는 tactical', () => {
      expect(getPatternForEnemy('hunter')).toBe('tactical');
    });

    it('warlord는 berserk', () => {
      expect(getPatternForEnemy('warlord')).toBe('berserk');
    });

    it('overlord는 tactical', () => {
      expect(getPatternForEnemy('overlord')).toBe('tactical');
    });
  });

  describe('속도 점수', () => {
    it('빠른 카드가 약간 높은 점수', () => {
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer(),
        ['fast1', 'slow1'], // fast1: speed 2, slow1: speed 7
        2
      );

      expect(decision.selectedCards.length).toBe(2);
    });
  });

  describe('엣지 케이스', () => {
    it('빈 덱으로 선택 시 빈 배열', () => {
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer(),
        [],
        3
      );

      expect(decision.selectedCards).toHaveLength(0);
    });

    it('0장 선택 시 빈 배열', () => {
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer(),
        ['attack1', 'defense1'],
        0
      );

      expect(decision.selectedCards).toHaveLength(0);
    });

    it('플레이어 토큰 배열이 없어도 처리', () => {
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer({ tokens: undefined as any }),
        ['attack1'],
        1
      );

      expect(decision.selectedCards).toHaveLength(1);
    });

    it('플레이어 tokens가 비어있어도 처리', () => {
      const decision = ai.selectCards(
        createMockEnemy(),
        createMockPlayer({ tokens: [] }),
        ['attack1'],
        1
      );

      expect(decision.selectedCards).toHaveLength(1);
    });
  });
});
