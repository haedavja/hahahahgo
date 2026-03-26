/**
 * @file growthSlice.test.ts
 * @description 피라미드 성장 시스템 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  initialGrowthState,
  getAvailableBaseEthos,
  getAvailableBasePathos,
  getAvailableEthosNodes,
  getAvailablePathosNodes,
  getNodeChoices,
  canSelectIdentity,
  getAvailableEthos,
  getAvailablePathos,
  getUnlockedEthos,
  getUnlockedPathos,
  type GrowthState,
} from './growthSlice';

// Mock ethosData
vi.mock('../../data/growth/ethosData', () => ({
  BASE_ETHOS: {
    bravery: { id: 'bravery', name: '용맹함', tier: 1 },
    steadfast: { id: 'steadfast', name: '굳건함', tier: 1 },
    composure: { id: 'composure', name: '냉철함', tier: 1 },
  },
  ETHOS: {
    bravery: { id: 'bravery', name: '용맹함', tier: 1 },
    steadfast: { id: 'steadfast', name: '굳건함', tier: 1 },
    composure: { id: 'composure', name: '냉철함', tier: 1 },
    flame: { id: 'flame', name: '불꽃', tier: 3, nodeId: 'ethos_node_1' },
    ice: { id: 'ice', name: '얼음', tier: 3, nodeId: 'ethos_node_1' },
  },
  ETHOS_NODES: {
    ethos_node_1: { id: 'ethos_node_1', tier: 3, choices: ['flame', 'ice'] },
    ethos_node_2: { id: 'ethos_node_2', tier: 5, choices: ['thunder', 'earth'] },
  },
}));

// Mock pathosData
vi.mock('../../data/growth/pathosData', () => ({
  TIER2_PATHOS: {
    quickDraw: { id: 'quickDraw', name: '속사', tier: 2 },
    steadyAim: { id: 'steadyAim', name: '정조준', tier: 2 },
  },
  PATHOS: {
    quickDraw: { id: 'quickDraw', name: '속사', tier: 2 },
    steadyAim: { id: 'steadyAim', name: '정조준', tier: 2 },
    burst: { id: 'burst', name: '연사', tier: 4, nodeId: 'pathos_node_1' },
    snipe: { id: 'snipe', name: '저격', tier: 4, nodeId: 'pathos_node_1' },
  },
  PATHOS_NODES: {
    pathos_node_1: { id: 'pathos_node_1', tier: 4, choices: ['burst', 'snipe'] },
  },
  MAX_EQUIPPED_PATHOS: 3,
}));

// Mock identityData
vi.mock('../../data/growth/identityData', () => ({
  IDENTITY_REQUIRED_PYRAMID_LEVEL: 5,
}));

// Mock reflections
vi.mock('../../data/reflections', () => ({
  getPyramidLevelFromTraits: vi.fn((count: number) => Math.min(count, 7)),
}));

// Mock logosData
vi.mock('../../data/growth/logosData', () => ({
  getLogosLevelFromPyramid: vi.fn((level: number) => Math.floor(level / 2)),
}));

describe('growthSlice', () => {
  let state: GrowthState;

  beforeEach(() => {
    state = { ...initialGrowthState };
  });

  describe('initialGrowthState', () => {
    it('초기 상태가 올바르게 정의되어 있다', () => {
      expect(initialGrowthState.pyramidLevel).toBe(0);
      expect(initialGrowthState.skillPoints).toBe(0);
      expect(initialGrowthState.unlockedEthos).toEqual([]);
      expect(initialGrowthState.unlockedPathos).toEqual([]);
      expect(initialGrowthState.unlockedNodes).toEqual([]);
      expect(initialGrowthState.pendingNodeSelection).toBeNull();
      expect(initialGrowthState.identities).toEqual([]);
      expect(initialGrowthState.equippedPathos).toEqual([]);
    });

    it('로고스 레벨 초기값이 0이다', () => {
      expect(initialGrowthState.logosLevels.common).toBe(0);
      expect(initialGrowthState.logosLevels.gunkata).toBe(0);
      expect(initialGrowthState.logosLevels.battleWaltz).toBe(0);
    });
  });

  describe('getAvailableBaseEthos', () => {
    it('피라미드 레벨 0에서는 빈 배열을 반환한다', () => {
      state.pyramidLevel = 0;
      const result = getAvailableBaseEthos(state);
      expect(result).toEqual([]);
    });

    it('피라미드 레벨 1 이상에서 기초 에토스를 반환한다', () => {
      state.pyramidLevel = 1;
      const result = getAvailableBaseEthos(state);
      expect(result.length).toBe(3);
    });

    it('이미 해금된 에토스는 제외한다', () => {
      state.pyramidLevel = 1;
      state.unlockedEthos = ['bravery'];

      const result = getAvailableBaseEthos(state);
      expect(result.length).toBe(2);
      expect(result.find(e => e.id === 'bravery')).toBeUndefined();
    });
  });

  describe('getAvailableBasePathos', () => {
    it('피라미드 레벨 1에서는 빈 배열을 반환한다', () => {
      state.pyramidLevel = 1;
      const result = getAvailableBasePathos(state);
      expect(result).toEqual([]);
    });

    it('피라미드 레벨 2 이상에서 기본 파토스를 반환한다', () => {
      state.pyramidLevel = 2;
      const result = getAvailableBasePathos(state);
      expect(result.length).toBe(2);
    });

    it('이미 해금된 파토스는 제외한다', () => {
      state.pyramidLevel = 2;
      state.unlockedPathos = ['quickDraw'];

      const result = getAvailableBasePathos(state);
      expect(result.length).toBe(1);
    });
  });

  describe('getAvailableEthosNodes', () => {
    it('피라미드 레벨에 맞는 노드만 반환한다', () => {
      state.pyramidLevel = 3;

      const result = getAvailableEthosNodes(state);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('ethos_node_1');
    });

    it('이미 해금된 노드는 제외한다', () => {
      state.pyramidLevel = 5;
      state.unlockedNodes = ['ethos_node_1'];

      const result = getAvailableEthosNodes(state);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('ethos_node_2');
    });
  });

  describe('getAvailablePathosNodes', () => {
    it('피라미드 레벨에 맞는 노드만 반환한다', () => {
      state.pyramidLevel = 4;

      const result = getAvailablePathosNodes(state);
      expect(result.length).toBe(1);
    });

    it('레벨이 부족하면 빈 배열을 반환한다', () => {
      state.pyramidLevel = 3;

      const result = getAvailablePathosNodes(state);
      expect(result).toEqual([]);
    });
  });

  describe('getNodeChoices', () => {
    it('에토스 노드의 선택지를 반환한다', () => {
      const choices = getNodeChoices('ethos_node_1', 'ethos');

      expect(choices).not.toBeNull();
      expect(choices![0].id).toBe('flame');
      expect(choices![1].id).toBe('ice');
    });

    it('파토스 노드의 선택지를 반환한다', () => {
      const choices = getNodeChoices('pathos_node_1', 'pathos');

      expect(choices).not.toBeNull();
      expect(choices![0].id).toBe('burst');
      expect(choices![1].id).toBe('snipe');
    });

    it('존재하지 않는 노드는 null을 반환한다', () => {
      const choices = getNodeChoices('nonexistent', 'ethos');
      expect(choices).toBeNull();
    });
  });

  describe('canSelectIdentity', () => {
    it('피라미드 레벨 5 미만에서는 false', () => {
      state.pyramidLevel = 4;
      expect(canSelectIdentity(state)).toBe(false);
    });

    it('피라미드 레벨 5 이상에서는 true', () => {
      state.pyramidLevel = 5;
      expect(canSelectIdentity(state)).toBe(true);
    });
  });

  describe('getAvailableEthos', () => {
    it('기초 에토스와 대기 중인 선택지를 모두 반환한다', () => {
      state.pyramidLevel = 3;
      state.pendingNodeSelection = { nodeId: 'ethos_node_1', type: 'ethos' };

      const result = getAvailableEthos(state);

      // 기초 3개 + 선택지 2개
      expect(result.length).toBe(5);
    });

    it('대기 중인 선택이 없으면 기초만 반환한다', () => {
      state.pyramidLevel = 1;

      const result = getAvailableEthos(state);
      expect(result.length).toBe(3);
    });
  });

  describe('getAvailablePathos', () => {
    it('기본 파토스와 대기 중인 선택지를 모두 반환한다', () => {
      state.pyramidLevel = 4;
      state.pendingNodeSelection = { nodeId: 'pathos_node_1', type: 'pathos' };

      const result = getAvailablePathos(state);

      // 기본 2개 + 선택지 2개
      expect(result.length).toBe(4);
    });
  });

  describe('getUnlockedEthos', () => {
    it('해금된 에토스 목록을 반환한다', () => {
      state.unlockedEthos = ['bravery', 'steadfast'];

      const result = getUnlockedEthos(state);

      expect(result.length).toBe(2);
      expect(result[0].id).toBe('bravery');
    });

    it('존재하지 않는 ID는 필터링된다', () => {
      state.unlockedEthos = ['bravery', 'nonexistent'];

      const result = getUnlockedEthos(state);
      expect(result.length).toBe(1);
    });
  });

  describe('getUnlockedPathos', () => {
    it('해금된 파토스 목록을 반환한다', () => {
      state.unlockedPathos = ['quickDraw', 'steadyAim'];

      const result = getUnlockedPathos(state);

      expect(result.length).toBe(2);
    });

    it('빈 배열이면 빈 배열을 반환한다', () => {
      state.unlockedPathos = [];

      const result = getUnlockedPathos(state);
      expect(result).toEqual([]);
    });
  });
});
