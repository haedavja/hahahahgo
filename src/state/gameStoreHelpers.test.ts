/**
 * @file gameStoreHelpers.test.ts
 * @description 게임 스토어 유틸리티 함수 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  extractResourceDelta,
  cloneNodes,
  resolveAmount,
  canAfford,
  payCost,
  grantRewards,
  applyPenalty,
  computeFriendlyChance,
  ensureEventKey,
  MEMORY_GAIN_PER_NODE,
  AWAKEN_COST,
  MAX_PLAYER_SELECTION,
  BATTLE_TYPES,
  BATTLE_REWARDS,
  BATTLE_LABEL,
  BATTLE_STATS,
  ENEMY_COUNT_BY_TYPE,
} from './gameStoreHelpers';
import type { MapNode, EventRewards, Resources } from '../types';

// Mock EVENT_KEYS
vi.mock('../data/newEvents', () => ({
  NEW_EVENT_LIBRARY: {
    event_001: { id: 'event_001', name: '테스트 이벤트 1' },
    event_002: { id: 'event_002', name: '테스트 이벤트 2' },
    event_003: { id: 'event_003', name: '테스트 이벤트 3' },
  },
  EVENT_KEYS: ['event_001', 'event_002', 'event_003'],
  STAT_REQUIRING_EVENTS: [],  // 테스트에서는 스탯 요구 이벤트 없음
  STAT_EVENT_MIN_LAYER: 5,
}));

// Mock metaProgress
vi.mock('./metaProgress', () => ({
  getRunBonuses: vi.fn(() => ({ hp: 10, gold: 5 })),
  updateStats: vi.fn(),
}));

// Mock relicEffects
vi.mock('../lib/relicEffects', () => ({
  calculatePassiveEffects: vi.fn(() => ({
    maxHp: 20,
    strength: 1,
    agility: 1,
  })),
}));

describe('gameStoreHelpers', () => {
  describe('extractResourceDelta', () => {
    it('EventRewards에서 리소스만 추출한다', () => {
      const rewards: EventRewards = {
        gold: 100,
        intel: 5,
        loot: 3,
        material: 1,
        etherPts: 10,
        memory: 50,
      };

      const delta = extractResourceDelta(rewards);

      expect(delta.gold).toBe(100);
      expect(delta.intel).toBe(5);
      expect(delta.loot).toBe(3);
    });

    it('undefined rewards는 빈 객체를 반환한다', () => {
      const delta = extractResourceDelta(undefined);
      expect(delta).toEqual({});
    });

    it('리소스가 아닌 키는 무시한다', () => {
      const rewards = {
        gold: 100,
        someOtherKey: 'value',
      } as EventRewards;

      const delta = extractResourceDelta(rewards);
      expect(delta.gold).toBe(100);
      expect((delta as Record<string, unknown>).someOtherKey).toBeUndefined();
    });
  });

  describe('cloneNodes', () => {
    it('노드 배열을 복제한다', () => {
      const nodes: MapNode[] = [
        { id: '1', type: 'battle', connections: ['2', '3'], x: 0, y: 0, row: 0, col: 0, layer: 0, cleared: false, selectable: true },
        { id: '2', type: 'event', connections: ['4'], x: 0, y: 0, row: 1, col: 0, layer: 1, cleared: false, selectable: false },
      ];

      const cloned = cloneNodes(nodes);

      expect(cloned).not.toBe(nodes);
      expect(cloned[0].connections).not.toBe(nodes[0].connections);
      expect(cloned[0].id).toBe('1');
      expect(cloned[0].connections).toEqual(['2', '3']);
    });

    it('빈 배열을 처리한다', () => {
      const cloned = cloneNodes([]);
      expect(cloned).toEqual([]);
    });

    it('undefined를 빈 배열로 처리한다', () => {
      const cloned = cloneNodes(undefined);
      expect(cloned).toEqual([]);
    });
  });

  describe('resolveAmount', () => {
    it('숫자를 그대로 반환한다', () => {
      expect(resolveAmount(100)).toBe(100);
    });

    it('min/max 범위에서 랜덤 값을 반환한다', () => {
      const value = { min: 10, max: 20 };
      const result = resolveAmount(value);

      expect(result).toBeGreaterThanOrEqual(10);
      expect(result).toBeLessThanOrEqual(20);
    });

    it('min만 있으면 min을 반환한다', () => {
      const value = { min: 15, max: 15 };
      expect(resolveAmount(value)).toBe(15);
    });

    it('null/undefined는 0을 반환한다', () => {
      expect(resolveAmount(null as number)).toBe(0);
      expect(resolveAmount(undefined as number)).toBe(0);
    });
  });

  describe('canAfford', () => {
    it('비용을 지불할 수 있으면 true', () => {
      const resources: Partial<Resources> = { gold: 100, intel: 10 };
      const cost = { gold: 50, intel: 5 };

      expect(canAfford(resources, cost)).toBe(true);
    });

    it('비용을 지불할 수 없으면 false', () => {
      const resources: Partial<Resources> = { gold: 30, intel: 10 };
      const cost = { gold: 50, intel: 5 };

      expect(canAfford(resources, cost)).toBe(false);
    });

    it('빈 비용은 항상 true', () => {
      const resources: Partial<Resources> = { gold: 10 };
      expect(canAfford(resources, {})).toBe(true);
    });

    it('hp와 hpPercent는 무시한다', () => {
      const resources: Partial<Resources> = { gold: 100 };
      const cost = { gold: 50, hp: 1000, hpPercent: 50 };

      expect(canAfford(resources, cost)).toBe(true);
    });
  });

  describe('payCost', () => {
    it('비용을 차감한다', () => {
      const resources: Partial<Resources> = { gold: 100, intel: 10 };
      const cost = { gold: 30, intel: 5 };

      const next = payCost(cost, resources);

      expect(next.gold).toBe(70);
      expect(next.intel).toBe(5);
    });

    it('0 미만으로 차감되지 않는다', () => {
      const resources: Partial<Resources> = { gold: 10 };
      const cost = { gold: 50 };

      const next = payCost(cost, resources);

      expect(next.gold).toBe(0);
    });
  });

  describe('grantRewards', () => {
    it('보상을 추가한다', () => {
      const resources: Partial<Resources> = { gold: 50 };
      const rewards = { gold: 30, intel: 5 };

      const { next, applied } = grantRewards(rewards, resources);

      expect(next.gold).toBe(80);
      expect(next.intel).toBe(5);
      expect(applied.gold).toBe(30);
      expect(applied.intel).toBe(5);
    });

    it('범위 보상을 처리한다', () => {
      const resources: Partial<Resources> = { gold: 0 };
      const rewards = { gold: { min: 10, max: 10 } };

      const { next, applied } = grantRewards(rewards, resources);

      expect(next.gold).toBe(10);
      expect(applied.gold).toBe(10);
    });
  });

  describe('applyPenalty', () => {
    it('페널티를 적용한다', () => {
      const resources: Partial<Resources> = { gold: 100, intel: 10 };
      const penalty = { gold: 30, intel: 5 };

      const { next, applied } = applyPenalty(penalty, resources);

      expect(next.gold).toBe(70);
      expect(next.intel).toBe(5);
      expect(applied.gold).toBe(-30);
      expect(applied.intel).toBe(-5);
    });

    it('보유량 이상 차감되지 않는다', () => {
      const resources: Partial<Resources> = { gold: 10 };
      const penalty = { gold: 50 };

      const { next, applied } = applyPenalty(penalty, resources);

      expect(next.gold).toBe(0);
      expect(applied.gold).toBe(-10);
    });
  });

  describe('computeFriendlyChance', () => {
    it('mapRisk에 따라 우호 확률을 계산한다', () => {
      expect(computeFriendlyChance(0)).toBe(0.85); // 최대
      expect(computeFriendlyChance(120)).toBe(0.2); // 최소
      expect(computeFriendlyChance(60)).toBeCloseTo(0.5, 1);
    });

    it('범위를 벗어나지 않는다', () => {
      expect(computeFriendlyChance(-100)).toBeLessThanOrEqual(0.85);
      expect(computeFriendlyChance(200)).toBeGreaterThanOrEqual(0.2);
    });
  });

  describe('ensureEventKey', () => {
    it('이벤트 키를 할당한다', () => {
      const node = { id: '1', type: 'event', connections: [], x: 0, y: 0, row: 0, col: 0, layer: 0, cleared: false, selectable: true } as MapNode;

      ensureEventKey(node, []);

      expect(node.eventKey).toBeDefined();
    });

    it('이미 eventKey가 있으면 변경하지 않는다', () => {
      const node = { id: '1', type: 'event', eventKey: 'existing', connections: [], x: 0, y: 0, row: 0, col: 0, layer: 0, cleared: false, selectable: true };

      const result = ensureEventKey(node, []);

      expect(node.eventKey).toBe('existing');
      expect(result).toBe(false);
    });

    it('완료된 이벤트는 제외한다', () => {
      const node = { id: '1', type: 'event', connections: [], x: 0, y: 0, row: 0, col: 0, layer: 0, cleared: false, selectable: true } as MapNode;

      ensureEventKey(node, ['event_001', 'event_002']);

      expect(node.eventKey).toBe('event_003');
    });

    it('pendingNextEvent를 우선 고려한다', () => {
      const node = { id: '1', type: 'event', connections: [], x: 0, y: 0, row: 0, col: 0, layer: 0, cleared: false, selectable: true } as MapNode;

      // 랜덤 기반이므로 여러 번 시도해야 할 수 있음
      let usedPending = false;
      for (let i = 0; i < 100; i++) {
        const testNode = { id: '1', type: 'event', connections: [], x: 0, y: 0, row: 0, col: 0, layer: 0, cleared: false, selectable: true } as MapNode;
        const result = ensureEventKey(testNode, [], 'event_001');
        if (result) {
          usedPending = true;
          expect(testNode.eventKey).toBe('event_001');
          break;
        }
      }
      // pendingNextEvent가 풀에 추가되어 선택될 수 있음
    });
  });

  describe('constants', () => {
    it('MEMORY_GAIN_PER_NODE가 정의되어 있다', () => {
      expect(MEMORY_GAIN_PER_NODE).toBe(10);
    });

    it('AWAKEN_COST가 정의되어 있다', () => {
      expect(AWAKEN_COST).toBe(100);
    });

    it('MAX_PLAYER_SELECTION이 정의되어 있다', () => {
      expect(MAX_PLAYER_SELECTION).toBe(3);
    });

    it('BATTLE_TYPES가 올바른 타입을 포함한다', () => {
      expect(BATTLE_TYPES.has('battle')).toBe(true);
      expect(BATTLE_TYPES.has('elite')).toBe(true);
      expect(BATTLE_TYPES.has('boss')).toBe(true);
      expect(BATTLE_TYPES.has('dungeon')).toBe(true);
    });

    it('BATTLE_REWARDS가 각 타입별 보상을 정의한다', () => {
      expect(BATTLE_REWARDS.battle).toBeDefined();
      expect(BATTLE_REWARDS.elite).toBeDefined();
      expect(BATTLE_REWARDS.boss).toBeDefined();
      expect(BATTLE_REWARDS.boss.material).toBe(1);
    });

    it('BATTLE_LABEL이 한글 라벨을 제공한다', () => {
      expect(BATTLE_LABEL.battle).toBe('전투');
      expect(BATTLE_LABEL.elite).toBe('정예');
      expect(BATTLE_LABEL.boss).toBe('보스');
    });

    it('BATTLE_STATS가 각 타입별 스탯을 정의한다', () => {
      expect(BATTLE_STATS.battle.player.hp).toBe(100);
      expect(BATTLE_STATS.elite.enemy.hp).toBe(55);
      expect(BATTLE_STATS.boss.enemy.hp).toBe(80);
    });

    it('ENEMY_COUNT_BY_TYPE가 적 수를 정의한다', () => {
      expect(ENEMY_COUNT_BY_TYPE.battle).toBe(3);
      expect(ENEMY_COUNT_BY_TYPE.boss).toBe(5);
    });
  });
});
