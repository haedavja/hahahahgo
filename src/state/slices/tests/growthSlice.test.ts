/**
 * @file growthSlice.test.ts
 * @description 피라미드 성장 시스템 상태 슬라이스 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
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
} from '../growthSlice';

// 데이터 모킹
vi.mock('../../../data/growth/ethosData', () => ({
  ETHOS: {
    bravery: { id: 'bravery', name: '용맹' },
    steadfast: { id: 'steadfast', name: '굳건' },
    flame: { id: 'flame', name: '불꽃', nodeId: 'ethos_node_1' },
    ice: { id: 'ice', name: '얼음', nodeId: 'ethos_node_1' },
    shadow: { id: 'shadow', name: '그림자', nodeId: 'ethos_node_2' },
    light: { id: 'light', name: '빛', nodeId: 'ethos_node_2' },
  },
  BASE_ETHOS: {
    bravery: { id: 'bravery', name: '용맹' },
    steadfast: { id: 'steadfast', name: '굳건' },
    composure: { id: 'composure', name: '냉철' },
  },
  ETHOS_NODES: {
    ethos_node_1: {
      id: 'ethos_node_1',
      name: '노드1',
      tier: 3,
      choices: ['flame', 'ice'],
    },
    ethos_node_2: {
      id: 'ethos_node_2',
      name: '노드2',
      tier: 5,
      choices: ['shadow', 'light'],
    },
  },
}));

vi.mock('../../../data/growth/pathosData', () => ({
  PATHOS: {
    iron_bullet: { id: 'iron_bullet', name: '철갑탄', nodeId: 'pathos_node_1' },
    fire_bullet: { id: 'fire_bullet', name: '화염탄', nodeId: 'pathos_node_1' },
    quick_draw: { id: 'quick_draw', name: '퀵드로우' },
    reload: { id: 'reload', name: '장전' },
  },
  TIER2_PATHOS: {
    quick_draw: { id: 'quick_draw', name: '퀵드로우' },
    reload: { id: 'reload', name: '장전' },
  },
  PATHOS_NODES: {
    pathos_node_1: {
      id: 'pathos_node_1',
      name: '탄환 노드',
      tier: 4,
      choices: ['iron_bullet', 'fire_bullet'],
    },
  },
  MAX_EQUIPPED_PATHOS: 3,
}));

vi.mock('../../../data/growth/logosData', () => ({
  getLogosLevelFromPyramid: vi.fn((level) => Math.floor(level / 2)),
}));

vi.mock('../../../data/growth/identityData', () => ({
  IDENTITY_REQUIRED_PYRAMID_LEVEL: 6,
}));

vi.mock('../../../data/reflections', () => ({
  getPyramidLevelFromTraits: vi.fn((count) => count),
}));

// 테스트용 성장 상태 생성
function createMockGrowthState(overrides: Partial<GrowthState> = {}): GrowthState {
  return {
    ...initialGrowthState,
    ...overrides,
  };
}

describe('growthSlice', () => {
  describe('initialGrowthState', () => {
    it('초기 상태가 올바르게 설정되어 있다', () => {
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
    it('피라미드 레벨 1 미만이면 빈 배열을 반환한다', () => {
      const state = createMockGrowthState({ pyramidLevel: 0 });

      const result = getAvailableBaseEthos(state);

      expect(result).toEqual([]);
    });

    it('피라미드 레벨 1 이상이면 해금되지 않은 기초 에토스를 반환한다', () => {
      const state = createMockGrowthState({ pyramidLevel: 1 });

      const result = getAvailableBaseEthos(state);

      expect(result.length).toBe(3); // bravery, steadfast, composure
    });

    it('이미 해금된 에토스는 제외한다', () => {
      const state = createMockGrowthState({
        pyramidLevel: 1,
        unlockedEthos: ['bravery'],
      });

      const result = getAvailableBaseEthos(state);

      expect(result.length).toBe(2);
      expect(result.find(e => e.id === 'bravery')).toBeUndefined();
    });
  });

  describe('getAvailableBasePathos', () => {
    it('피라미드 레벨 2 미만이면 빈 배열을 반환한다', () => {
      const state = createMockGrowthState({ pyramidLevel: 1 });

      const result = getAvailableBasePathos(state);

      expect(result).toEqual([]);
    });

    it('피라미드 레벨 2 이상이면 해금되지 않은 기본 파토스를 반환한다', () => {
      const state = createMockGrowthState({ pyramidLevel: 2 });

      const result = getAvailableBasePathos(state);

      expect(result.length).toBe(2); // quick_draw, reload
    });

    it('이미 해금된 파토스는 제외한다', () => {
      const state = createMockGrowthState({
        pyramidLevel: 2,
        unlockedPathos: ['quick_draw'],
      });

      const result = getAvailableBasePathos(state);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('reload');
    });
  });

  describe('getAvailableEthosNodes', () => {
    it('피라미드 레벨에 맞는 노드를 반환한다', () => {
      const state = createMockGrowthState({ pyramidLevel: 3 });

      const result = getAvailableEthosNodes(state);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('ethos_node_1');
    });

    it('높은 레벨이면 모든 노드를 반환한다', () => {
      const state = createMockGrowthState({ pyramidLevel: 5 });

      const result = getAvailableEthosNodes(state);

      expect(result.length).toBe(2);
    });

    it('이미 해금된 노드는 제외한다', () => {
      const state = createMockGrowthState({
        pyramidLevel: 5,
        unlockedNodes: ['ethos_node_1'],
      });

      const result = getAvailableEthosNodes(state);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('ethos_node_2');
    });
  });

  describe('getAvailablePathosNodes', () => {
    it('피라미드 레벨에 맞는 노드를 반환한다', () => {
      const state = createMockGrowthState({ pyramidLevel: 4 });

      const result = getAvailablePathosNodes(state);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('pathos_node_1');
    });

    it('레벨이 낮으면 빈 배열을 반환한다', () => {
      const state = createMockGrowthState({ pyramidLevel: 3 });

      const result = getAvailablePathosNodes(state);

      expect(result).toEqual([]);
    });
  });

  describe('getNodeChoices', () => {
    it('에토스 노드의 선택지를 반환한다', () => {
      const result = getNodeChoices('ethos_node_1', 'ethos');

      expect(result).not.toBeNull();
      expect(result![0].id).toBe('flame');
      expect(result![1].id).toBe('ice');
    });

    it('파토스 노드의 선택지를 반환한다', () => {
      const result = getNodeChoices('pathos_node_1', 'pathos');

      expect(result).not.toBeNull();
      expect(result![0].id).toBe('iron_bullet');
      expect(result![1].id).toBe('fire_bullet');
    });

    it('존재하지 않는 노드는 null을 반환한다', () => {
      const result = getNodeChoices('invalid_node', 'ethos');

      expect(result).toBeNull();
    });
  });

  describe('canSelectIdentity', () => {
    it('피라미드 레벨 6 이상이면 true를 반환한다', () => {
      const state = createMockGrowthState({ pyramidLevel: 6 });

      expect(canSelectIdentity(state)).toBe(true);
    });

    it('피라미드 레벨 6 미만이면 false를 반환한다', () => {
      const state = createMockGrowthState({ pyramidLevel: 5 });

      expect(canSelectIdentity(state)).toBe(false);
    });
  });

  describe('getAvailableEthos', () => {
    it('기초 에토스와 대기 중인 노드 선택지를 반환한다', () => {
      const state = createMockGrowthState({
        pyramidLevel: 3,
        pendingNodeSelection: { nodeId: 'ethos_node_1', type: 'ethos' },
      });

      const result = getAvailableEthos(state);

      // 기초 에토스 3개 + 노드 선택지 2개
      expect(result.length).toBe(5);
    });

    it('대기 중인 노드가 없으면 기초 에토스만 반환한다', () => {
      const state = createMockGrowthState({ pyramidLevel: 1 });

      const result = getAvailableEthos(state);

      expect(result.length).toBe(3);
    });

    it('파토스 타입 대기 중이면 에토스 선택지에 포함하지 않는다', () => {
      const state = createMockGrowthState({
        pyramidLevel: 1,
        pendingNodeSelection: { nodeId: 'pathos_node_1', type: 'pathos' },
      });

      const result = getAvailableEthos(state);

      expect(result.length).toBe(3); // 기초 에토스만
    });
  });

  describe('getAvailablePathos', () => {
    it('기본 파토스와 대기 중인 노드 선택지를 반환한다', () => {
      const state = createMockGrowthState({
        pyramidLevel: 4,
        pendingNodeSelection: { nodeId: 'pathos_node_1', type: 'pathos' },
      });

      const result = getAvailablePathos(state);

      // 기본 파토스 2개 + 노드 선택지 2개
      expect(result.length).toBe(4);
    });

    it('레벨 2 미만이면 빈 배열을 반환한다', () => {
      const state = createMockGrowthState({ pyramidLevel: 1 });

      const result = getAvailablePathos(state);

      expect(result).toEqual([]);
    });
  });

  describe('getUnlockedEthos', () => {
    it('해금된 에토스 목록을 반환한다', () => {
      const state = createMockGrowthState({
        unlockedEthos: ['bravery', 'steadfast'],
      });

      const result = getUnlockedEthos(state);

      expect(result.length).toBe(2);
      expect(result[0].name).toBe('용맹');
      expect(result[1].name).toBe('굳건');
    });

    it('존재하지 않는 에토스는 필터링된다', () => {
      const state = createMockGrowthState({
        unlockedEthos: ['bravery', 'invalid_ethos'],
      });

      const result = getUnlockedEthos(state);

      expect(result.length).toBe(1);
    });

    it('빈 배열이면 빈 배열을 반환한다', () => {
      const state = createMockGrowthState();

      const result = getUnlockedEthos(state);

      expect(result).toEqual([]);
    });
  });

  describe('getUnlockedPathos', () => {
    it('해금된 파토스 목록을 반환한다', () => {
      const state = createMockGrowthState({
        unlockedPathos: ['quick_draw', 'reload'],
      });

      const result = getUnlockedPathos(state);

      expect(result.length).toBe(2);
    });

    it('존재하지 않는 파토스는 필터링된다', () => {
      const state = createMockGrowthState({
        unlockedPathos: ['quick_draw', 'invalid_pathos'],
      });

      const result = getUnlockedPathos(state);

      expect(result.length).toBe(1);
    });
  });

  describe('GrowthState 타입', () => {
    it('모든 필수 필드가 정의되어 있다', () => {
      const state: GrowthState = {
        pyramidLevel: 3,
        skillPoints: 5,
        unlockedEthos: ['bravery'],
        unlockedPathos: ['quick_draw'],
        unlockedNodes: ['ethos_node_1'],
        pendingNodeSelection: null,
        identities: ['swordsman'],
        logosLevels: {
          common: 1,
          gunkata: 0,
          battleWaltz: 1,
        },
        equippedPathos: ['quick_draw'],
      };

      expect(state.pyramidLevel).toBe(3);
      expect(state.skillPoints).toBe(5);
      expect(state.identities).toContain('swordsman');
    });

    it('pendingNodeSelection이 null일 수 있다', () => {
      const state = createMockGrowthState();

      expect(state.pendingNodeSelection).toBeNull();
    });

    it('pendingNodeSelection에 노드 정보가 있을 수 있다', () => {
      const state = createMockGrowthState({
        pendingNodeSelection: { nodeId: 'ethos_node_1', type: 'ethos' },
      });

      expect(state.pendingNodeSelection?.nodeId).toBe('ethos_node_1');
      expect(state.pendingNodeSelection?.type).toBe('ethos');
    });
  });
});
