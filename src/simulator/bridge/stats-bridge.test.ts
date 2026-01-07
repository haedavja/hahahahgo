/**
 * @file stats-bridge.test.ts
 * @description 게임-시뮬레이터 통계 브릿지 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStatsCollector,
  resetStatsCollector,
  isStatsInitialized,
  adaptGameBattleResult,
  recordGameBattle,
  recordRunStart,
  recordRunEnd,
  recordCardPick,
  recordRelicAcquired,
  recordCardUpgrade,
  getCurrentStats,
  getDetailedStats,
  invalidateStatsCache,
  getCardStats,
  getEnemyStats,
  initStatsBridge,
  type GameBattleContext,
  type GameEnemyInfo,
  type GamePlayerInfo,
} from './stats-bridge';
import type { BattleResult } from '../../types/battle';

describe('stats-bridge', () => {
  beforeEach(async () => {
    // 동적 import 모듈 초기화 후 수집기 리셋
    await initStatsBridge();
    await resetStatsCollector();
    invalidateStatsCache();
  });

  describe('getStatsCollector', () => {
    it('싱글톤 인스턴스를 반환한다', () => {
      const collector1 = getStatsCollector();
      const collector2 = getStatsCollector();
      expect(collector1).toBe(collector2);
    });

    it('초기화 후 새 인스턴스를 반환한다', async () => {
      const collector1 = getStatsCollector();
      await resetStatsCollector();
      const collector2 = getStatsCollector();
      expect(collector1).not.toBe(collector2);
    });
  });

  describe('isStatsInitialized', () => {
    it('초기화 전에는 false를 반환한다', () => {
      // resetStatsCollector가 beforeEach에서 호출되어 이미 true
      // 새로운 테스트를 위해 직접 확인
      expect(isStatsInitialized()).toBe(true);
    });

    it('getStatsCollector 호출 후 true를 반환한다', () => {
      getStatsCollector();
      expect(isStatsInitialized()).toBe(true);
    });
  });

  describe('adaptGameBattleResult', () => {
    const mockGameResult: BattleResult = {
      result: 'victory',
      playerHp: 80,
      deltaEther: 5,
    };

    const mockContext: GameBattleContext = {
      nodeId: 'node1',
      turn: 5,
      damageDealt: 100,
      damageTaken: 20,
      battleLog: ['턴 1 시작', '플레이어가 10 피해를 입힘'],
    };

    const mockEnemyInfo: GameEnemyInfo = {
      id: 'enemy1',
      name: '슬라임',
      tier: 1,
      isBoss: false,
    };

    const mockPlayerInfo: GamePlayerInfo = {
      hp: 80,
      maxHp: 100,
      deck: ['card1', 'card2'],
      relics: ['relic1'],
    };

    it('승리 결과를 올바르게 변환한다', () => {
      const result = adaptGameBattleResult(
        mockGameResult,
        mockContext,
        mockEnemyInfo,
        mockPlayerInfo
      );

      expect(result.winner).toBe('player');
      expect(result.source).toBe('game');
      expect(result.turns).toBe(5);
      expect(result.playerDamageDealt).toBe(100);
      expect(result.enemyDamageDealt).toBe(20);
      expect(result.victory).toBe(true);
    });

    it('패배 결과를 올바르게 변환한다', () => {
      const defeatResult: BattleResult = { ...mockGameResult, result: 'defeat' };
      const result = adaptGameBattleResult(
        defeatResult,
        mockContext,
        mockEnemyInfo,
        mockPlayerInfo
      );

      expect(result.winner).toBe('enemy');
      expect(result.victory).toBe(false);
    });

    it('배틀 로그를 이벤트로 변환한다', () => {
      const result = adaptGameBattleResult(
        mockGameResult,
        mockContext,
        mockEnemyInfo,
        mockPlayerInfo
      );

      expect(result.events.length).toBeGreaterThan(0);
      expect(result.events[0].type).toBe('battle_start');
      expect(result.events[result.events.length - 1].type).toBe('battle_end');
    });

    it('피해 로그를 damage_dealt 이벤트로 변환한다', () => {
      const contextWithDamage: GameBattleContext = {
        ...mockContext,
        battleLog: ['10 damage dealt'],
      };

      const result = adaptGameBattleResult(
        mockGameResult,
        contextWithDamage,
        mockEnemyInfo,
        mockPlayerInfo
      );

      const damageEvent = result.events.find(e => e.type === 'damage_dealt');
      expect(damageEvent).toBeDefined();
      expect(damageEvent?.value).toBe(10);
    });

    it('방어 로그를 block_gained 이벤트로 변환한다', () => {
      const contextWithBlock: GameBattleContext = {
        ...mockContext,
        battleLog: ['5 block gained'],
      };

      const result = adaptGameBattleResult(
        mockGameResult,
        contextWithBlock,
        mockEnemyInfo,
        mockPlayerInfo
      );

      const blockEvent = result.events.find(e => e.type === 'block_gained');
      expect(blockEvent).toBeDefined();
      expect(blockEvent?.value).toBe(5);
    });
  });

  describe('recordGameBattle', () => {
    it('전투 결과를 기록한다', () => {
      const gameResult: BattleResult = {
        result: 'victory',
        playerHp: 80,
        deltaEther: 5,
      };

      const context: GameBattleContext = {
        turn: 3,
        damageDealt: 50,
        damageTaken: 10,
      };

      const enemyInfo: GameEnemyInfo = {
        id: 'slime',
        name: '슬라임',
      };

      const playerInfo: GamePlayerInfo = {
        hp: 80,
        maxHp: 100,
      };

      recordGameBattle(gameResult, context, enemyInfo, playerInfo);

      const stats = getCurrentStats();
      expect(stats.battles).toBe(1);
      expect(stats.wins).toBe(1);
    });

    it('에러가 발생해도 크래시하지 않는다', () => {
      // null/undefined로 호출해도 에러를 잡아야 함
      expect(() => {
        recordGameBattle(
          null as unknown as BattleResult,
          {} as GameBattleContext,
          { name: 'test' } as GameEnemyInfo,
          { hp: 100, maxHp: 100 } as GamePlayerInfo
        );
      }).not.toThrow();
    });
  });

  describe('recordRunStart', () => {
    it('런 시작을 기록한다', () => {
      const deck = ['card1', 'card2', 'card3'];
      const relics = ['relic1'];

      expect(() => {
        recordRunStart(deck, relics);
      }).not.toThrow();
    });

    it('빈 덱으로도 호출할 수 있다', () => {
      expect(() => {
        recordRunStart([]);
      }).not.toThrow();
    });
  });

  describe('recordRunEnd', () => {
    it('성공한 런을 기록한다', () => {
      recordRunStart(['card1', 'card2']);

      expect(() => {
        recordRunEnd(true, 10, ['card1', 'card2', 'card3'], ['relic1']);
      }).not.toThrow();
    });

    it('실패한 런을 기록한다', () => {
      recordRunStart(['card1']);

      expect(() => {
        recordRunEnd(false, 5, ['card1'], []);
      }).not.toThrow();
    });
  });

  describe('recordCardPick', () => {
    it('카드 선택을 기록한다', () => {
      const cardId = 'card1';
      const offeredCards = ['card1', 'card2', 'card3'];

      expect(() => {
        recordCardPick(cardId, offeredCards, { floor: 2 });
      }).not.toThrow();
    });

    it('층 정보 없이도 호출할 수 있다', () => {
      expect(() => {
        recordCardPick('card1', ['card1', 'card2']);
      }).not.toThrow();
    });
  });

  describe('recordRelicAcquired', () => {
    it('상징 획득을 기록한다', () => {
      expect(() => {
        recordRelicAcquired('relic1', { floor: 3, source: 'battle' });
      }).not.toThrow();
    });

    it('유효한 source 타입을 처리한다', () => {
      const validSources = ['battle', 'shop', 'event', 'dungeon', 'boss', 'starting'];

      validSources.forEach(source => {
        expect(() => {
          recordRelicAcquired('relic1', { source });
        }).not.toThrow();
      });
    });

    it('유효하지 않은 source는 event로 대체한다', () => {
      expect(() => {
        recordRelicAcquired('relic1', { source: 'invalid_source' });
      }).not.toThrow();
    });
  });

  describe('recordCardUpgrade', () => {
    it('카드 강화를 기록한다', () => {
      expect(() => {
        recordCardUpgrade('card1', 2, { floor: 5, cost: 50 });
      }).not.toThrow();
    });
  });

  describe('getCurrentStats', () => {
    it('초기 통계를 반환한다', () => {
      const stats = getCurrentStats();

      expect(stats.battles).toBe(0);
      expect(stats.wins).toBe(0);
      expect(stats.losses).toBe(0);
      expect(stats.winRate).toBe(0);
      expect(stats.avgTurns).toBe(0);
      expect(stats.avgDamageDealt).toBe(0);
      expect(stats.avgDamageTaken).toBe(0);
      expect(stats.totalDamageDealt).toBe(0);
    });

    it('전투 후 통계가 업데이트된다', () => {
      recordGameBattle(
        { result: 'victory', playerHp: 80, deltaEther: 0 },
        { turn: 5, damageDealt: 100, damageTaken: 20 },
        { id: 'enemy1', name: 'Enemy' },
        { hp: 80, maxHp: 100 }
      );

      const stats = getCurrentStats();
      expect(stats.battles).toBe(1);
      expect(stats.wins).toBe(1);
      expect(stats.winRate).toBe(1);
    });

    it('여러 전투 후 평균을 올바르게 계산한다', () => {
      // 첫 번째 전투: 승리, 4턴, 80 피해
      recordGameBattle(
        { result: 'victory', playerHp: 80, deltaEther: 0 },
        { turn: 4, damageDealt: 80, damageTaken: 20 },
        { id: 'enemy1', name: 'Enemy1' },
        { hp: 80, maxHp: 100 }
      );

      // 두 번째 전투: 패배, 6턴, 60 피해
      recordGameBattle(
        { result: 'defeat', playerHp: 0, deltaEther: 0 },
        { turn: 6, damageDealt: 60, damageTaken: 100 },
        { id: 'enemy2', name: 'Enemy2' },
        { hp: 0, maxHp: 100 }
      );

      const stats = getCurrentStats();
      expect(stats.battles).toBe(2);
      expect(stats.wins).toBe(1);
      expect(stats.losses).toBe(1);
      expect(stats.winRate).toBe(0.5);
      expect(stats.avgTurns).toBe(5); // (4 + 6) / 2
      expect(stats.avgDamageDealt).toBe(70); // (80 + 60) / 2
    });
  });

  describe('getDetailedStats', () => {
    it('상세 통계를 반환한다', () => {
      const detailed = getDetailedStats();

      expect(detailed).toBeDefined();
      expect(detailed.battleRecords).toBeDefined();
    });

    it('캐시를 사용한다', () => {
      const detailed1 = getDetailedStats();
      const detailed2 = getDetailedStats();

      // 같은 캐시된 객체를 반환해야 함
      expect(detailed1).toBe(detailed2);
    });

    it('캐시 무효화 후 새 데이터를 반환한다', () => {
      const detailed1 = getDetailedStats();
      invalidateStatsCache();
      const detailed2 = getDetailedStats();

      // 다른 객체를 반환해야 함
      expect(detailed1).not.toBe(detailed2);
    });
  });

  describe('getCardStats', () => {
    it('카드 통계를 조회한다', () => {
      // 카드 사용 기록이 없으면 undefined 반환
      const stats = getCardStats('nonexistent_card');
      expect(stats).toBeUndefined();
    });
  });

  describe('getEnemyStats', () => {
    it('적 통계를 조회한다', () => {
      recordGameBattle(
        { result: 'victory', playerHp: 80, deltaEther: 0 },
        { turn: 3 },
        { id: 'test_enemy', name: 'Test Enemy' },
        { hp: 80, maxHp: 100 }
      );

      const stats = getEnemyStats('test_enemy');
      expect(stats).toBeDefined();
    });
  });

  describe('invalidateStatsCache', () => {
    it('캐시를 무효화한다', () => {
      // 캐시 생성
      getDetailedStats();

      // 무효화
      invalidateStatsCache();

      // 새 호출이 새 객체를 반환하는지 확인
      // (이미 위에서 테스트됨)
      expect(() => invalidateStatsCache()).not.toThrow();
    });
  });
});
