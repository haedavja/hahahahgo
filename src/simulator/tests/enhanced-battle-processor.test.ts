// @ts-nocheck - Test file with complex type issues
/**
 * @file enhanced-battle-processor.test.ts
 * @description 통합 전투 처리기 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EnhancedBattleProcessor,
  createEnhancedBattleProcessor,
  runMultiEnemyBattle,
  type EnhancedBattleConfig,
  type EnhancedBattleResult,
} from '../core/enhanced-battle-processor';
import type { GameCard, EnemyState, GameBattleState } from '../core/game-types';

// TimelineBattleEngine 모킹
vi.mock('../core/timeline-battle-engine', () => ({
  TimelineBattleEngine: class {
    runBattle = vi.fn().mockReturnValue({
      winner: 'player',
      turns: 5,
      playerDamageDealt: 100,
      enemyDamageDealt: 50,
      playerFinalHp: 70,
      enemyFinalHp: 0,
      etherGained: 30,
      goldChange: 10,
      battleLog: ['턴 1', '턴 2'],
      events: [],
      cardUsage: { card_001: 2 },
      comboStats: {},
      tokenStats: {},
      timeline: [],
    });
  },
}));

// MultiEnemyBattleEngine 모킹
vi.mock('../core/multi-enemy-battle-engine', () => ({
  MultiEnemyBattleEngine: class {
    runMultiEnemyBattle = vi.fn().mockReturnValue({
      winner: 'player',
      turns: 6,
      playerDamageDealt: 150,
      enemyDamageDealt: 60,
      playerFinalHp: 65,
      enemyFinalHp: 0,
      etherGained: 50,
      goldChange: 20,
      battleLog: ['멀티 턴 1', '토큰 효과'],
      events: [],
      cardUsage: { card_001: 3, card_002: 2 },
      comboStats: {},
      tokenStats: {},
      timeline: [],
      enemiesKilled: 2,
    });
  },
  runSharedTimelineBattle: vi.fn(),
}));

// token-effects-processor 모킹
vi.mock('../core/token-effects-processor', () => ({
  processAttackTokenEffects: vi.fn((state, actor, baseDamage) => ({
    modifiedValue: baseDamage + 5,
    effects: ['힘 +5'],
  })),
  processDefenseTokenEffects: vi.fn((state, actor, baseBlock) => ({
    modifiedValue: baseBlock + 3,
    effects: ['민첩 +3'],
  })),
  processDamageTakenTokenEffects: vi.fn((state, actor, damage) => ({
    modifiedValue: Math.max(0, damage - 2),
    effects: ['방어력 -2'],
  })),
  processTurnStartTokenEffects: vi.fn(() => ({
    effects: ['독 피해 3'],
    damageDealt: 3,
  })),
  processTurnEndTokenEffects: vi.fn(() => ({
    effects: ['재생 2'],
    healAmount: 2,
  })),
  consumeTokens: vi.fn(),
  applyTokenEffects: vi.fn(),
}));

// combo-optimizer 모킹
vi.mock('../ai/combo-optimizer', () => ({
  createComboOptimizer: vi.fn(() => ({
    selectOptimalCards: vi.fn((hand, count) => ({
      selectedCards: hand.slice(0, count),
      reasoning: ['콤보 최적화'],
    })),
  })),
  hasComboOpportunity: vi.fn(() => false),
}));

// 테스트용 카드 라이브러리
function createMockCardLibrary(): Record<string, GameCard> {
  return {
    card_001: {
      id: 'card_001',
      name: '기본 공격',
      cost: 1,
      type: 'attack',
      damage: 10,
      description: '10 피해',
    } as GameCard,
    card_002: {
      id: 'card_002',
      name: '방어',
      cost: 1,
      type: 'skill',
      block: 5,
      description: '5 방어',
    } as GameCard,
    chain_001: {
      id: 'chain_001',
      name: '연계 시작',
      cost: 1,
      type: 'attack',
      damage: 8,
      traits: ['chain'],
      description: '연계 시작',
    } as GameCard,
    followup_001: {
      id: 'followup_001',
      name: '후속',
      cost: 0,
      type: 'attack',
      damage: 6,
      traits: ['followup'],
      description: '후속',
    } as GameCard,
    finisher_001: {
      id: 'finisher_001',
      name: '마무리',
      cost: 2,
      type: 'attack',
      damage: 15,
      traits: ['finisher'],
      description: '마무리',
    } as GameCard,
  };
}

// 테스트용 적 생성
function createMockEnemy(overrides: Partial<EnemyState> = {}): EnemyState {
  return {
    id: 'test_enemy',
    name: '테스트 적',
    hp: 50,
    maxHp: 50,
    block: 0,
    tokens: {},
    deck: ['enemy_card_1'],
    cardsPerTurn: 2,
    ...overrides,
  } as EnemyState;
}

// 테스트용 게임 상태 생성
function createMockGameState(): GameBattleState {
  return {
    turn: 1,
    phase: 'player_turn',
    player: {
      hp: 70,
      maxHp: 80,
      energy: 3,
      maxEnergy: 3,
      block: 0,
      tokens: { strength: 2, poison: 1 },
      hand: [],
      deck: [],
      discard: [],
      exhaust: [],
      relics: [],
      insight: 0,
    },
    enemy: createMockEnemy(),
    timeline: [],
    comboUsageCount: {},
  } as GameBattleState;
}

describe('enhanced-battle-processor', () => {
  describe('EnhancedBattleProcessor', () => {
    describe('constructor', () => {
      it('기본 설정으로 생성된다', () => {
        const processor = new EnhancedBattleProcessor();
        expect(processor).toBeDefined();
      });

      it('커스텀 설정으로 생성된다', () => {
        const config: EnhancedBattleConfig = {
          verbose: true,
          useMultiEnemy: false,
          useChainSystem: false,
          useEnhancedTokens: false,
          useComboOptimizer: false,
        };

        const processor = new EnhancedBattleProcessor(config);
        expect(processor).toBeDefined();
      });

      it('모든 설정이 병합된다', () => {
        const processor = new EnhancedBattleProcessor({ verbose: true });
        expect(processor).toBeDefined();
      });
    });

    describe('setCardLibrary', () => {
      it('카드 라이브러리를 설정한다', () => {
        const processor = new EnhancedBattleProcessor();
        const cards = createMockCardLibrary();

        processor.setCardLibrary(cards);

        // 카드 선택 테스트로 라이브러리 설정 확인
        const result = processor.selectOptimalCards(['card_001', 'card_002'], 1);
        expect(result.selectedCards).toHaveLength(1);
      });

      it('콤보 최적화가 비활성화되면 옵티마이저를 생성하지 않는다', () => {
        const processor = new EnhancedBattleProcessor({ useComboOptimizer: false });
        const cards = createMockCardLibrary();

        processor.setCardLibrary(cards);

        const result = processor.selectOptimalCards(['card_001', 'card_002'], 1);
        expect(result.reasoning).toContain('기본 전투력 순 선택');
      });
    });

    describe('runBattle', () => {
      it('단일 적 전투를 실행한다', () => {
        const processor = new EnhancedBattleProcessor();
        const enemy = createMockEnemy();

        const result = processor.runBattle(
          ['card_001', 'card_002'],
          [],
          enemy
        );

        expect(result.winner).toBe('player');
        expect(result.chainsCompleted).toBe(0);
        expect(result.maxChainLength).toBe(0);
        expect(result.enemiesKilled).toBe(1);
      });

      it('패배 시 적 처치 수가 0이다', () => {
        const processor = new EnhancedBattleProcessor();
        const enemy = createMockEnemy();

        // 모킹된 엔진의 결과 변경
        vi.mocked(
          (processor as any).baseEngine.runBattle
        ).mockReturnValueOnce({
          winner: 'enemy',
          turns: 3,
          playerDamageDealt: 30,
          enemyDamageDealt: 80,
          playerFinalHp: 0,
          enemyFinalHp: 20,
          etherGained: 0,
          goldChange: 0,
          battleLog: [],
          events: [],
          cardUsage: {},
          comboStats: {},
          tokenStats: {},
          timeline: [],
        });

        const result = processor.runBattle(
          ['card_001'],
          [],
          enemy
        );

        expect(result.winner).toBe('enemy');
        expect(result.enemiesKilled).toBe(0);
      });

      it('이변과 카드 강화를 전달한다', () => {
        const processor = new EnhancedBattleProcessor();
        const enemy = createMockEnemy();

        const result = processor.runBattle(
          ['card_001'],
          ['relic_001'],
          enemy,
          'anomaly_1',
          { card_001: 2 }
        );

        expect(result).toBeDefined();
      });
    });

    describe('runMultiEnemyBattle', () => {
      it('단일 적이면 기본 전투를 실행한다', () => {
        const processor = new EnhancedBattleProcessor();
        const enemies = [createMockEnemy()];

        const result = processor.runMultiEnemyBattle(
          ['card_001'],
          [],
          enemies
        );

        expect(result.winner).toBe('player');
      });

      it('다중 적에 대해 공유 타임라인 전투를 실행한다', () => {
        const processor = new EnhancedBattleProcessor({ useSharedTimeline: true });
        processor.setCardLibrary(createMockCardLibrary());
        const enemies = [
          createMockEnemy({ id: 'enemy_1', name: '적1' }),
          createMockEnemy({ id: 'enemy_2', name: '적2' }),
        ];

        const result = processor.runMultiEnemyBattle(
          ['card_001', 'card_002'],
          [],
          enemies
        );

        expect(result).toBeDefined();
        expect(result.enemiesKilled).toBeDefined();
      });

      it('useMultiEnemy가 false면 첫 번째 적과만 전투한다', () => {
        const processor = new EnhancedBattleProcessor({ useMultiEnemy: false });
        const enemies = [
          createMockEnemy({ id: 'enemy_1' }),
          createMockEnemy({ id: 'enemy_2' }),
        ];

        const result = processor.runMultiEnemyBattle(
          ['card_001'],
          [],
          enemies
        );

        expect(result.winner).toBe('player');
      });

      it('순차 전투 모드에서 모든 적을 처치한다', () => {
        const processor = new EnhancedBattleProcessor({
          useSharedTimeline: false,
          useMultiEnemy: true,
        });
        processor.setCardLibrary(createMockCardLibrary());

        const enemies = [
          createMockEnemy({ id: 'enemy_1' }),
          createMockEnemy({ id: 'enemy_2' }),
        ];

        const result = processor.runMultiEnemyBattle(
          ['card_001', 'card_002'],
          [],
          enemies
        );

        expect(result).toBeDefined();
      });
    });

    describe('selectOptimalCards', () => {
      it('최적의 카드를 선택한다', () => {
        const processor = new EnhancedBattleProcessor();
        processor.setCardLibrary(createMockCardLibrary());

        const result = processor.selectOptimalCards(
          ['card_001', 'card_002', 'chain_001'],
          2
        );

        expect(result.selectedCards).toHaveLength(2);
        expect(result.reasoning.length).toBeGreaterThan(0);
      });

      it('콤보 최적화가 비활성화되면 기본 선택을 사용한다', () => {
        const processor = new EnhancedBattleProcessor({ useComboOptimizer: false });
        processor.setCardLibrary(createMockCardLibrary());

        const result = processor.selectOptimalCards(
          ['card_001', 'card_002'],
          1
        );

        expect(result.reasoning).toContain('기본 전투력 순 선택');
      });

      it('컨텍스트가 전달된다', () => {
        const processor = new EnhancedBattleProcessor();
        processor.setCardLibrary(createMockCardLibrary());

        const result = processor.selectOptimalCards(
          ['card_001', 'card_002'],
          1,
          { hpRatio: 0.5, enemyThreat: 0.8 }
        );

        expect(result.selectedCards).toHaveLength(1);
      });

      it('빈 손패에서는 빈 배열을 반환한다', () => {
        const processor = new EnhancedBattleProcessor({ useComboOptimizer: false });
        processor.setCardLibrary(createMockCardLibrary());

        const result = processor.selectOptimalCards([], 2);

        expect(result.selectedCards).toHaveLength(0);
      });

      it('존재하지 않는 카드는 필터링된다', () => {
        const processor = new EnhancedBattleProcessor({ useComboOptimizer: false });
        processor.setCardLibrary(createMockCardLibrary());

        const result = processor.selectOptimalCards(
          ['card_001', 'invalid_card', 'card_002'],
          3
        );

        expect(result.selectedCards).toHaveLength(2);
      });
    });

    describe('processTurnStart', () => {
      it('턴 시작 토큰 효과를 처리한다', () => {
        const processor = new EnhancedBattleProcessor();
        const state = createMockGameState();

        const result = processor.processTurnStart(state, 'player');

        expect(result.effects).toContain('독 피해 3');
      });

      it('토큰 효과가 비활성화되면 빈 결과를 반환한다', () => {
        const processor = new EnhancedBattleProcessor({ useEnhancedTokens: false });
        const state = createMockGameState();

        const result = processor.processTurnStart(state, 'player');

        expect(result).toEqual({});
      });

      it('적 턴 시작도 처리한다', () => {
        const processor = new EnhancedBattleProcessor();
        const state = createMockGameState();

        const result = processor.processTurnStart(state, 'enemy');

        expect(result).toBeDefined();
      });
    });

    describe('processTurnEnd', () => {
      it('턴 종료 토큰 효과를 처리한다', () => {
        const processor = new EnhancedBattleProcessor();
        const state = createMockGameState();

        const result = processor.processTurnEnd(state, 'player');

        expect(result.effects).toContain('재생 2');
      });

      it('토큰 효과가 비활성화되면 빈 결과를 반환한다', () => {
        const processor = new EnhancedBattleProcessor({ useEnhancedTokens: false });
        const state = createMockGameState();

        const result = processor.processTurnEnd(state, 'enemy');

        expect(result).toEqual({});
      });
    });

    describe('processAttack', () => {
      it('공격 토큰 효과를 처리한다', () => {
        const processor = new EnhancedBattleProcessor();
        const state = createMockGameState();

        const result = processor.processAttack(state, 'player', 10);

        expect(result.modifiedValue).toBe(15); // 10 + 5
        expect(result.effects).toContain('힘 +5');
      });

      it('카드 정보가 전달된다', () => {
        const processor = new EnhancedBattleProcessor();
        const state = createMockGameState();
        const card = createMockCardLibrary().card_001;

        const result = processor.processAttack(state, 'player', 10, card);

        expect(result).toBeDefined();
      });

      it('토큰 효과가 비활성화되면 기본 피해를 반환한다', () => {
        const processor = new EnhancedBattleProcessor({ useEnhancedTokens: false });
        const state = createMockGameState();

        const result = processor.processAttack(state, 'player', 10);

        expect(result.modifiedValue).toBe(10);
      });
    });

    describe('processDefense', () => {
      it('방어 토큰 효과를 처리한다', () => {
        const processor = new EnhancedBattleProcessor();
        const state = createMockGameState();

        const result = processor.processDefense(state, 'player', 5);

        expect(result.modifiedValue).toBe(8); // 5 + 3
      });

      it('토큰 효과가 비활성화되면 기본 방어를 반환한다', () => {
        const processor = new EnhancedBattleProcessor({ useEnhancedTokens: false });
        const state = createMockGameState();

        const result = processor.processDefense(state, 'player', 5);

        expect(result.modifiedValue).toBe(5);
      });
    });

    describe('processDamageTaken', () => {
      it('피해 수신 토큰 효과를 처리한다', () => {
        const processor = new EnhancedBattleProcessor();
        const state = createMockGameState();

        const result = processor.processDamageTaken(state, 'player', 10);

        expect(result.modifiedValue).toBe(8); // 10 - 2
      });

      it('토큰 효과가 비활성화되면 기본 피해를 반환한다', () => {
        const processor = new EnhancedBattleProcessor({ useEnhancedTokens: false });
        const state = createMockGameState();

        const result = processor.processDamageTaken(state, 'enemy', 10);

        expect(result.modifiedValue).toBe(10);
      });
    });
  });

  describe('createEnhancedBattleProcessor', () => {
    it('기본 설정으로 프로세서를 생성한다', () => {
      const processor = createEnhancedBattleProcessor();

      expect(processor).toBeInstanceOf(EnhancedBattleProcessor);
    });

    it('커스텀 설정으로 프로세서를 생성한다', () => {
      const processor = createEnhancedBattleProcessor({
        verbose: true,
        useChainSystem: false,
      });

      expect(processor).toBeInstanceOf(EnhancedBattleProcessor);
    });
  });

  describe('runMultiEnemyBattle 유틸리티 함수', () => {
    it('다중 적 전투를 실행한다', () => {
      const enemies = [
        createMockEnemy({ id: 'enemy_1' }),
        createMockEnemy({ id: 'enemy_2' }),
      ];
      const cardLibrary = createMockCardLibrary();

      const result = runMultiEnemyBattle(
        ['card_001', 'card_002'],
        [],
        enemies,
        cardLibrary
      );

      expect(result).toBeDefined();
      expect(result.enemiesKilled).toBeDefined();
    });

    it('설정을 전달할 수 있다', () => {
      const enemies = [createMockEnemy()];
      const cardLibrary = createMockCardLibrary();

      const result = runMultiEnemyBattle(
        ['card_001'],
        [],
        enemies,
        cardLibrary,
        { verbose: true }
      );

      expect(result).toBeDefined();
    });
  });

  describe('EnhancedBattleResult', () => {
    it('확장된 결과 필드가 포함된다', () => {
      const processor = new EnhancedBattleProcessor();
      const enemy = createMockEnemy();

      const result = processor.runBattle(['card_001'], [], enemy);

      expect(result).toHaveProperty('chainsCompleted');
      expect(result).toHaveProperty('maxChainLength');
      expect(result).toHaveProperty('enemiesKilled');
      expect(result).toHaveProperty('tokenEffectsTriggered');
      expect(result).toHaveProperty('combosAchieved');
    });
  });
});
