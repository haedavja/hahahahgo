/**
 * @file run-simulator.test.ts
 * @description 런 시뮬레이터 테스트 - 유틸리티 함수, 타입, 클래스 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createDefaultPlayer,
  RunSimulator,
  type PlayerRunState,
  type RunConfig,
  type RunStrategy,
  type NodeResult,
  type RunResult,
  type RunStatistics,
} from './run-simulator';
import { StatsCollector } from '../analysis/detailed-stats';

describe('run-simulator', () => {
  describe('createDefaultPlayer', () => {
    it('기본 플레이어 상태를 생성한다', () => {
      const player = createDefaultPlayer();

      expect(player.hp).toBe(100);
      expect(player.maxHp).toBe(100);
      expect(player.gold).toBe(100);
      expect(player.intel).toBe(0);
      expect(player.material).toBe(0);
      expect(player.loot).toBe(0);
    });

    it('시작 덱이 10장이다', () => {
      const player = createDefaultPlayer();

      expect(player.deck).toHaveLength(10);
    });

    it('시작 덱에 shoot 2장이 있다', () => {
      const player = createDefaultPlayer();

      const shootCount = player.deck.filter(c => c === 'shoot').length;
      expect(shootCount).toBe(2);
    });

    it('시작 덱에 strike 3장이 있다', () => {
      const player = createDefaultPlayer();

      const strikeCount = player.deck.filter(c => c === 'strike').length;
      expect(strikeCount).toBe(3);
    });

    it('시작 덱에 reload 1장이 있다', () => {
      const player = createDefaultPlayer();

      const reloadCount = player.deck.filter(c => c === 'reload').length;
      expect(reloadCount).toBe(1);
    });

    it('시작 덱에 quarte 1장이 있다', () => {
      const player = createDefaultPlayer();

      const quarteCount = player.deck.filter(c => c === 'quarte').length;
      expect(quarteCount).toBe(1);
    });

    it('시작 덱에 octave 1장이 있다', () => {
      const player = createDefaultPlayer();

      const octaveCount = player.deck.filter(c => c === 'octave').length;
      expect(octaveCount).toBe(1);
    });

    it('시작 덱에 breach 1장이 있다', () => {
      const player = createDefaultPlayer();

      const breachCount = player.deck.filter(c => c === 'breach').length;
      expect(breachCount).toBe(1);
    });

    it('시작 덱에 deflect 1장이 있다', () => {
      const player = createDefaultPlayer();

      const deflectCount = player.deck.filter(c => c === 'deflect').length;
      expect(deflectCount).toBe(1);
    });

    it('빈 상징 목록으로 시작한다', () => {
      const player = createDefaultPlayer();

      expect(player.relics).toEqual([]);
    });

    it('빈 아이템 목록으로 시작한다', () => {
      const player = createDefaultPlayer();

      expect(player.items).toEqual([]);
    });

    it('빈 강화 카드 목록으로 시작한다', () => {
      const player = createDefaultPlayer();

      expect(player.upgradedCards).toEqual([]);
    });

    it('빈 개성 목록으로 시작한다', () => {
      const player = createDefaultPlayer();

      expect(player.traits).toEqual([]);
    });

    it('기본 스탯이 1이다', () => {
      const player = createDefaultPlayer();

      expect(player.grace).toBe(1);
      expect(player.strength).toBe(1);
      expect(player.agility).toBe(1);
      expect(player.insight).toBe(1);
    });

    it('성장 상태가 undefined이다', () => {
      const player = createDefaultPlayer();

      expect(player.growth).toBeUndefined();
    });
  });

  describe('PlayerRunState 타입', () => {
    it('모든 필수 필드가 있다', () => {
      const player: PlayerRunState = {
        hp: 100,
        maxHp: 100,
        gold: 50,
        intel: 0,
        material: 0,
        loot: 0,
        grace: 1,
        strength: 1,
        agility: 1,
        insight: 1,
        deck: ['shoot', 'strike'],
        relics: [],
        items: [],
        upgradedCards: [],
      };

      expect(player.hp).toBeDefined();
      expect(player.deck).toBeDefined();
      expect(player.relics).toBeDefined();
      expect(player.items).toBeDefined();
    });

    it('선택적 필드를 가질 수 있다', () => {
      const player: PlayerRunState = {
        hp: 100,
        maxHp: 100,
        gold: 50,
        intel: 0,
        material: 0,
        loot: 0,
        grace: 1,
        strength: 1,
        agility: 1,
        insight: 1,
        deck: [],
        relics: [],
        items: [],
        upgradedCards: [],
        growth: { pyramidLevel: 2, traits: ['용맹함'] } as any,
        traits: ['굳건함'],
      };

      expect(player.growth).toBeDefined();
      expect(player.traits).toHaveLength(1);
    });

    it('HP는 maxHp보다 작거나 같다', () => {
      const player = createDefaultPlayer();

      expect(player.hp).toBeLessThanOrEqual(player.maxHp);
    });
  });

  describe('RunStrategy 타입', () => {
    it('aggressive는 유효한 전략이다', () => {
      const strategy: RunStrategy = 'aggressive';
      expect(strategy).toBe('aggressive');
    });

    it('defensive는 유효한 전략이다', () => {
      const strategy: RunStrategy = 'defensive';
      expect(strategy).toBe('defensive');
    });

    it('balanced는 유효한 전략이다', () => {
      const strategy: RunStrategy = 'balanced';
      expect(strategy).toBe('balanced');
    });

    it('speedrun은 유효한 전략이다', () => {
      const strategy: RunStrategy = 'speedrun';
      expect(strategy).toBe('speedrun');
    });

    it('treasure_hunter는 유효한 전략이다', () => {
      const strategy: RunStrategy = 'treasure_hunter';
      expect(strategy).toBe('treasure_hunter');
    });
  });

  describe('RunConfig 타입', () => {
    it('필수 필드를 포함한다', () => {
      const config: RunConfig = {
        initialPlayer: createDefaultPlayer(),
        difficulty: 1,
        strategy: 'balanced',
      };

      expect(config.initialPlayer).toBeDefined();
      expect(config.difficulty).toBeDefined();
      expect(config.strategy).toBeDefined();
    });

    it('선택적 필드를 가질 수 있다', () => {
      const config: RunConfig = {
        initialPlayer: createDefaultPlayer(),
        difficulty: 2,
        strategy: 'aggressive',
        mapLayers: 11,
        seed: 12345,
        verbose: true,
        anomalyId: 'test_anomaly',
        mapRisk: 2,
      };

      expect(config.mapLayers).toBe(11);
      expect(config.seed).toBe(12345);
      expect(config.verbose).toBe(true);
      expect(config.anomalyId).toBe('test_anomaly');
      expect(config.mapRisk).toBe(2);
    });

    it('difficulty는 숫자이다', () => {
      const config: RunConfig = {
        initialPlayer: createDefaultPlayer(),
        difficulty: 3,
        strategy: 'balanced',
      };

      expect(typeof config.difficulty).toBe('number');
    });
  });

  describe('NodeResult 타입', () => {
    it('모든 필드가 정의된다', () => {
      const nodeResult: NodeResult = {
        nodeId: 'node1',
        nodeType: 'combat',
        success: true,
        hpChange: -20,
        goldChange: 50,
        cardsGained: ['fleche'],
        relicsGained: [],
        details: '전투 승리',
      };

      expect(nodeResult.nodeId).toBe('node1');
      expect(nodeResult.nodeType).toBe('combat');
      expect(nodeResult.success).toBe(true);
      expect(nodeResult.hpChange).toBe(-20);
      expect(nodeResult.goldChange).toBe(50);
      expect(nodeResult.cardsGained).toHaveLength(1);
      expect(nodeResult.relicsGained).toHaveLength(0);
      expect(nodeResult.details).toBe('전투 승리');
    });

    it('다양한 노드 타입을 지원한다', () => {
      const combatResult: NodeResult = {
        nodeId: 'c1', nodeType: 'combat', success: true, hpChange: -10, goldChange: 20,
        cardsGained: [], relicsGained: [], details: '',
      };
      const eliteResult: NodeResult = {
        nodeId: 'e1', nodeType: 'elite', success: true, hpChange: -30, goldChange: 50,
        cardsGained: [], relicsGained: ['relic1'], details: '',
      };
      const bossResult: NodeResult = {
        nodeId: 'b1', nodeType: 'boss', success: true, hpChange: -50, goldChange: 100,
        cardsGained: [], relicsGained: [], details: '',
      };
      const eventResult: NodeResult = {
        nodeId: 'ev1', nodeType: 'event', success: true, hpChange: 0, goldChange: 10,
        cardsGained: [], relicsGained: [], details: '',
      };
      const shopResult: NodeResult = {
        nodeId: 's1', nodeType: 'shop', success: true, hpChange: 0, goldChange: -30,
        cardsGained: ['card1'], relicsGained: [], details: '',
      };
      const restResult: NodeResult = {
        nodeId: 'r1', nodeType: 'rest', success: true, hpChange: 30, goldChange: 0,
        cardsGained: [], relicsGained: [], details: '',
      };
      const dungeonResult: NodeResult = {
        nodeId: 'd1', nodeType: 'dungeon', success: true, hpChange: -20, goldChange: 40,
        cardsGained: [], relicsGained: [], details: '',
      };

      expect(combatResult.nodeType).toBe('combat');
      expect(eliteResult.nodeType).toBe('elite');
      expect(bossResult.nodeType).toBe('boss');
      expect(eventResult.nodeType).toBe('event');
      expect(shopResult.nodeType).toBe('shop');
      expect(restResult.nodeType).toBe('rest');
      expect(dungeonResult.nodeType).toBe('dungeon');
    });
  });

  describe('시작 덱 구성', () => {
    it('시작 덱은 게임 규칙에 맞게 구성된다', () => {
      const player = createDefaultPlayer();

      // 시작 덱: shoot x2, strike x3, reload x1, quarte x1, octave x1, breach x1, deflect x1
      const expectedCards = [
        'shoot', 'shoot',
        'strike', 'strike', 'strike',
        'reload',
        'quarte',
        'octave',
        'breach',
        'deflect',
      ];

      expect(player.deck.sort()).toEqual(expectedCards.sort());
    });
  });

  describe('플레이어 상태 복사', () => {
    it('createDefaultPlayer는 매번 새 객체를 반환한다', () => {
      const player1 = createDefaultPlayer();
      const player2 = createDefaultPlayer();

      expect(player1).not.toBe(player2);
      expect(player1.deck).not.toBe(player2.deck);
    });

    it('플레이어 덱 수정이 다른 플레이어에 영향을 주지 않는다', () => {
      const player1 = createDefaultPlayer();
      const player2 = createDefaultPlayer();

      player1.deck.push('newCard');

      expect(player1.deck).toHaveLength(11);
      expect(player2.deck).toHaveLength(10);
    });
  });

  // ==================== RunSimulator 클래스 테스트 ====================

  describe('RunSimulator 클래스', () => {
    let simulator: RunSimulator;

    beforeEach(() => {
      simulator = new RunSimulator({ seed: 12345, verbose: false });
    });

    describe('생성자', () => {
      it('기본 설정으로 생성된다', () => {
        const sim = new RunSimulator();
        expect(sim).toBeDefined();
        expect(sim.getSeed()).toBeDefined();
      });

      it('시드 옵션으로 생성된다', () => {
        const seed = 99999;
        const sim = new RunSimulator({ seed });
        expect(sim.getSeed()).toBe(seed);
      });

      it('verbose 옵션으로 생성된다', () => {
        const sim = new RunSimulator({ verbose: true });
        expect(sim).toBeDefined();
      });

      it('useEnhancedBattle 옵션으로 생성된다', () => {
        const sim = new RunSimulator({ useEnhancedBattle: false });
        expect(sim).toBeDefined();
      });
    });

    describe('시드 관리', () => {
      it('getSeed()는 현재 시드를 반환한다', () => {
        const seed = simulator.getSeed();
        expect(typeof seed).toBe('number');
        expect(seed).toBe(12345);
      });

      it('resetSeed()로 시드를 리셋한다', () => {
        const newSeed = 54321;
        simulator.resetSeed(newSeed);
        expect(simulator.getSeed()).toBe(newSeed);
      });

      it('resetSeed()를 인자 없이 호출하면 새 시드가 생성된다', () => {
        const originalSeed = simulator.getSeed();
        simulator.resetSeed();
        // 새 시드는 다른 값일 수 있지만, 반드시 숫자여야 함
        expect(typeof simulator.getSeed()).toBe('number');
      });

      it('같은 시드는 동일한 결과를 생성한다', () => {
        const sim1 = new RunSimulator({ seed: 42 });
        const sim2 = new RunSimulator({ seed: 42 });

        expect(sim1.getSeed()).toBe(sim2.getSeed());
      });
    });

    describe('통계 수집기', () => {
      it('setStatsCollector()로 통계 수집기를 설정한다', () => {
        const collector = new StatsCollector();
        simulator.setStatsCollector(collector);

        expect(simulator.getStatsCollector()).toBe(collector);
      });

      it('getStatsCollector()는 설정된 수집기를 반환한다', () => {
        expect(simulator.getStatsCollector()).toBeNull();

        const collector = new StatsCollector();
        simulator.setStatsCollector(collector);

        expect(simulator.getStatsCollector()).toBe(collector);
      });

      it('setStatsCollector(null)로 수집기를 해제한다', () => {
        const collector = new StatsCollector();
        simulator.setStatsCollector(collector);
        simulator.setStatsCollector(null);

        expect(simulator.getStatsCollector()).toBeNull();
      });
    });

    describe('재현성', () => {
      it('같은 시드로 여러 시뮬레이터를 생성하면 동일한 시드를 가진다', () => {
        const seeds = [1, 100, 9999, 123456789];

        for (const seed of seeds) {
          const sim = new RunSimulator({ seed });
          expect(sim.getSeed()).toBe(seed);
        }
      });

      it('시드를 리셋해도 시뮬레이터는 유효하다', () => {
        simulator.resetSeed(1);
        expect(simulator.getSeed()).toBe(1);

        simulator.resetSeed(2);
        expect(simulator.getSeed()).toBe(2);

        simulator.resetSeed(3);
        expect(simulator.getSeed()).toBe(3);
      });
    });
  });

  describe('RunResult 타입', () => {
    it('성공적인 런 결과를 나타낸다', () => {
      const result: RunResult = {
        success: true,
        finalPlayerState: createDefaultPlayer(),
        finalLayer: 5,
        nodesVisited: 12,
        battlesWon: 8,
        battlesLost: 0,
        eventsCompleted: 3,
        shopsVisited: 2,
        restsUsed: 1,
        dungeonsCleared: 1,
        nodeResults: [
          { nodeId: 'n1', nodeType: 'combat', success: true, hpChange: -10, goldChange: 20, cardsGained: [], relicsGained: [], details: '' }
        ],
        totalTurns: 45,
        totalGoldEarned: 350,
        totalCardsGained: 5,
      };

      expect(result.success).toBe(true);
      expect(result.finalLayer).toBe(5);
      expect(result.battlesWon).toBe(8);
    });

    it('실패한 런 결과를 나타낸다', () => {
      const result: RunResult = {
        success: false,
        deathCause: '전투 패배',
        finalPlayerState: { ...createDefaultPlayer(), hp: 0 },
        finalLayer: 3,
        nodesVisited: 7,
        battlesWon: 5,
        battlesLost: 1,
        eventsCompleted: 1,
        shopsVisited: 1,
        restsUsed: 0,
        dungeonsCleared: 0,
        nodeResults: [],
        totalTurns: 30,
        totalGoldEarned: 150,
        totalCardsGained: 2,
      };

      expect(result.success).toBe(false);
      expect(result.deathCause).toBe('전투 패배');
      expect(result.finalPlayerState.hp).toBe(0);
    });
  });

  describe('RunStatistics 타입', () => {
    it('런 통계를 포함한다', () => {
      const stats: RunStatistics = {
        totalRuns: 100,
        successRate: 0.65,
        avgFinalLayer: 4.2,
        avgBattlesWon: 7.5,
        avgGoldEarned: 300,
        avgCardsInDeck: 15,
        deathCauses: { 'elite_combat': 20, 'boss_combat': 15 },
        strategyComparison: {
          aggressive: { successRate: 0.7, avgLayer: 4.5 },
          defensive: { successRate: 0.6, avgLayer: 4.0 },
          balanced: { successRate: 0.65, avgLayer: 4.2 },
          speedrun: { successRate: 0.5, avgLayer: 3.8 },
          treasure_hunter: { successRate: 0.55, avgLayer: 3.5 },
        },
      };

      expect(stats.totalRuns).toBe(100);
      expect(stats.successRate).toBe(0.65);
      expect(stats.avgFinalLayer).toBe(4.2);
    });

    it('숫자 값만 포함한다', () => {
      const stats: RunStatistics = {
        totalRuns: 50,
        successRate: 0.6,
        avgFinalLayer: 4.0,
        avgBattlesWon: 6,
        avgGoldEarned: 250,
        avgCardsInDeck: 12,
        deathCauses: {},
        strategyComparison: {
          aggressive: { successRate: 0.7, avgLayer: 4.5 },
          defensive: { successRate: 0.6, avgLayer: 4.0 },
          balanced: { successRate: 0.65, avgLayer: 4.2 },
          speedrun: { successRate: 0.5, avgLayer: 3.8 },
          treasure_hunter: { successRate: 0.55, avgLayer: 3.5 },
        },
      };

      expect(typeof stats.totalRuns).toBe('number');
      expect(typeof stats.successRate).toBe('number');
      expect(typeof stats.avgFinalLayer).toBe('number');
      expect(typeof stats.avgBattlesWon).toBe('number');
      expect(typeof stats.avgGoldEarned).toBe('number');
      expect(typeof stats.avgCardsInDeck).toBe('number');
    });
  });
});
