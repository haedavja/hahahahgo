/**
 * @file growthSlice.test.ts
 * @description 피라미드 성장 시스템 상태 슬라이스 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import {
  initialGrowthState,
  createGrowthActions,
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
  type GrowthActionsSlice,
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

  // ========================================
  // 액션 테스트
  // ========================================

  describe('createGrowthActions', () => {
    // 테스트용 스토어 타입
    type TestStore = {
      growth: GrowthState | null;
      playerTraits: string[];
    } & GrowthActionsSlice;

    // 테스트용 스토어 생성
    const createTestStore = (initialState: Partial<TestStore> = {}) =>
      create<TestStore>((set, get, api) => ({
        growth: initialGrowthState,
        playerTraits: [],
        ...initialState,
        ...createGrowthActions(set as never, get as never, api as never),
      }));

    describe('updatePyramidLevel', () => {
      it('개성 수에 따라 피라미드 레벨을 업데이트한다', () => {
        const store = createTestStore({ playerTraits: ['용맹함', '굳건함'] });

        store.getState().updatePyramidLevel();

        expect(store.getState().growth?.pyramidLevel).toBe(2);
      });

      it('개성에 해당하는 에토스를 자동 해금한다', () => {
        const store = createTestStore({ playerTraits: ['용맹함'] });

        store.getState().updatePyramidLevel();

        expect(store.getState().growth?.unlockedEthos).toContain('bravery');
      });

      it('레벨업 시 스킬포인트를 획득한다', () => {
        const store = createTestStore({ playerTraits: ['용맹함', '굳건함', '냉철함'] });

        store.getState().updatePyramidLevel();

        expect(store.getState().growth?.skillPoints).toBe(3);
      });

      it('레벨이 낮아지지 않는다', () => {
        const store = createTestStore({
          growth: { ...initialGrowthState, pyramidLevel: 5, skillPoints: 5 },
          playerTraits: ['용맹함'],
        });

        store.getState().updatePyramidLevel();

        expect(store.getState().growth?.pyramidLevel).toBe(5);
      });
    });

    describe('addSkillPoints', () => {
      it('스킬포인트를 추가한다', () => {
        const store = createTestStore();

        store.getState().addSkillPoints(3);

        expect(store.getState().growth?.skillPoints).toBe(3);
      });

      it('누적으로 스킬포인트가 추가된다', () => {
        const store = createTestStore({
          growth: { ...initialGrowthState, skillPoints: 2 },
        });

        store.getState().addSkillPoints(5);

        expect(store.getState().growth?.skillPoints).toBe(7);
      });
    });

    describe('selectBaseEthos', () => {
      it('기초 에토스를 해금한다', () => {
        const store = createTestStore({
          growth: { ...initialGrowthState, pyramidLevel: 1 },
        });

        store.getState().selectBaseEthos('bravery');

        expect(store.getState().growth?.unlockedEthos).toContain('bravery');
      });

      it('피라미드 레벨이 1 미만이면 해금하지 않는다', () => {
        const store = createTestStore({
          growth: { ...initialGrowthState, pyramidLevel: 0 },
        });

        store.getState().selectBaseEthos('bravery');

        expect(store.getState().growth?.unlockedEthos).not.toContain('bravery');
      });

      it('이미 해금된 에토스는 중복 추가하지 않는다', () => {
        const store = createTestStore({
          growth: { ...initialGrowthState, pyramidLevel: 1, unlockedEthos: ['bravery'] },
        });

        store.getState().selectBaseEthos('bravery');

        expect(store.getState().growth?.unlockedEthos.filter(e => e === 'bravery').length).toBe(1);
      });

      it('존재하지 않는 에토스는 해금하지 않는다', () => {
        const store = createTestStore({
          growth: { ...initialGrowthState, pyramidLevel: 1 },
        });

        store.getState().selectBaseEthos('invalid_ethos');

        expect(store.getState().growth?.unlockedEthos).toEqual([]);
      });
    });

    describe('selectBasePathos', () => {
      it('기본 파토스를 해금한다', () => {
        const store = createTestStore({
          growth: { ...initialGrowthState, pyramidLevel: 2, skillPoints: 1 },
        });

        store.getState().selectBasePathos('quick_draw');

        expect(store.getState().growth?.unlockedPathos).toContain('quick_draw');
      });

      it('스킬포인트를 소모한다', () => {
        const store = createTestStore({
          growth: { ...initialGrowthState, pyramidLevel: 2, skillPoints: 3 },
        });

        store.getState().selectBasePathos('quick_draw');

        expect(store.getState().growth?.skillPoints).toBe(2);
      });

      it('스킬포인트가 없으면 해금하지 않는다', () => {
        const store = createTestStore({
          growth: { ...initialGrowthState, pyramidLevel: 2, skillPoints: 0 },
        });

        store.getState().selectBasePathos('quick_draw');

        expect(store.getState().growth?.unlockedPathos).not.toContain('quick_draw');
      });

      it('피라미드 레벨이 2 미만이면 해금하지 않는다', () => {
        const store = createTestStore({
          growth: { ...initialGrowthState, pyramidLevel: 1, skillPoints: 1 },
        });

        store.getState().selectBasePathos('quick_draw');

        expect(store.getState().growth?.unlockedPathos).not.toContain('quick_draw');
      });
    });

    describe('unlockNode', () => {
      it('노드를 해금하고 선택 대기 상태로 전환한다', () => {
        const store = createTestStore({
          growth: { ...initialGrowthState, pyramidLevel: 3, skillPoints: 1 },
        });

        store.getState().unlockNode('ethos_node_1', 'ethos');

        expect(store.getState().growth?.unlockedNodes).toContain('ethos_node_1');
        expect(store.getState().growth?.pendingNodeSelection).toEqual({
          nodeId: 'ethos_node_1',
          type: 'ethos',
        });
      });

      it('스킬포인트를 소모한다', () => {
        const store = createTestStore({
          growth: { ...initialGrowthState, pyramidLevel: 3, skillPoints: 2 },
        });

        store.getState().unlockNode('ethos_node_1', 'ethos');

        expect(store.getState().growth?.skillPoints).toBe(1);
      });

      it('피라미드 레벨이 노드 티어보다 낮으면 해금하지 않는다', () => {
        const store = createTestStore({
          growth: { ...initialGrowthState, pyramidLevel: 2, skillPoints: 1 },
        });

        store.getState().unlockNode('ethos_node_1', 'ethos'); // tier: 3

        expect(store.getState().growth?.unlockedNodes).not.toContain('ethos_node_1');
      });

      it('스킬포인트가 없으면 해금하지 않는다', () => {
        const store = createTestStore({
          growth: { ...initialGrowthState, pyramidLevel: 3, skillPoints: 0 },
        });

        store.getState().unlockNode('ethos_node_1', 'ethos');

        expect(store.getState().growth?.unlockedNodes).toEqual([]);
      });

      it('파토스 노드도 해금할 수 있다', () => {
        const store = createTestStore({
          growth: { ...initialGrowthState, pyramidLevel: 4, skillPoints: 1 },
        });

        store.getState().unlockNode('pathos_node_1', 'pathos');

        expect(store.getState().growth?.unlockedNodes).toContain('pathos_node_1');
        expect(store.getState().growth?.pendingNodeSelection?.type).toBe('pathos');
      });
    });

    describe('selectNodeChoice', () => {
      it('대기 중인 에토스 노드의 선택지를 해금한다', () => {
        const store = createTestStore({
          growth: {
            ...initialGrowthState,
            pyramidLevel: 3,
            unlockedNodes: ['ethos_node_1'],
            pendingNodeSelection: { nodeId: 'ethos_node_1', type: 'ethos' },
          },
        });

        store.getState().selectNodeChoice('flame');

        expect(store.getState().growth?.unlockedEthos).toContain('flame');
        expect(store.getState().growth?.pendingNodeSelection).toBeNull();
      });

      it('대기 중인 파토스 노드의 선택지를 해금한다', () => {
        const store = createTestStore({
          growth: {
            ...initialGrowthState,
            pyramidLevel: 4,
            unlockedNodes: ['pathos_node_1'],
            pendingNodeSelection: { nodeId: 'pathos_node_1', type: 'pathos' },
          },
        });

        store.getState().selectNodeChoice('iron_bullet');

        expect(store.getState().growth?.unlockedPathos).toContain('iron_bullet');
        expect(store.getState().growth?.pendingNodeSelection).toBeNull();
      });

      it('대기 중인 노드가 없으면 아무것도 하지 않는다', () => {
        const store = createTestStore({
          growth: { ...initialGrowthState, pendingNodeSelection: null },
        });

        store.getState().selectNodeChoice('flame');

        expect(store.getState().growth?.unlockedEthos).toEqual([]);
      });

      it('노드에 속하지 않는 선택지는 무시한다', () => {
        const store = createTestStore({
          growth: {
            ...initialGrowthState,
            pendingNodeSelection: { nodeId: 'ethos_node_1', type: 'ethos' },
          },
        });

        store.getState().selectNodeChoice('shadow'); // ethos_node_2의 선택지

        expect(store.getState().growth?.unlockedEthos).not.toContain('shadow');
      });
    });

    describe('selectIdentity', () => {
      it('자아를 선택한다', () => {
        const store = createTestStore({
          growth: { ...initialGrowthState, pyramidLevel: 6 },
        });

        store.getState().selectIdentity('swordsman');

        expect(store.getState().growth?.identities).toContain('swordsman');
      });

      it('피라미드 레벨이 6 미만이면 선택하지 않는다', () => {
        const store = createTestStore({
          growth: { ...initialGrowthState, pyramidLevel: 5 },
        });

        store.getState().selectIdentity('swordsman');

        expect(store.getState().growth?.identities).not.toContain('swordsman');
      });

      it('이미 선택한 자아는 중복 추가하지 않는다', () => {
        const store = createTestStore({
          growth: { ...initialGrowthState, pyramidLevel: 6, identities: ['swordsman'] },
        });

        store.getState().selectIdentity('swordsman');

        expect(store.getState().growth?.identities.filter(i => i === 'swordsman').length).toBe(1);
      });

      it('하이브리드 자아를 추가할 수 있다', () => {
        const store = createTestStore({
          growth: { ...initialGrowthState, pyramidLevel: 6, identities: ['swordsman'] },
        });

        store.getState().selectIdentity('gunslinger');

        expect(store.getState().growth?.identities).toContain('swordsman');
        expect(store.getState().growth?.identities).toContain('gunslinger');
      });
    });

    describe('unlockLogos', () => {
      it('공용 로고스 레벨을 증가시킨다', () => {
        const store = createTestStore({
          growth: {
            ...initialGrowthState,
            pyramidLevel: 6,
            skillPoints: 1,
            identities: ['swordsman'],
          },
        });

        store.getState().unlockLogos('common');

        expect(store.getState().growth?.logosLevels.common).toBe(1);
        expect(store.getState().growth?.skillPoints).toBe(0);
      });

      it('스킬포인트가 없으면 해금하지 않는다', () => {
        const store = createTestStore({
          growth: {
            ...initialGrowthState,
            pyramidLevel: 6,
            skillPoints: 0,
            identities: ['swordsman'],
          },
        });

        store.getState().unlockLogos('common');

        expect(store.getState().growth?.logosLevels.common).toBe(0);
      });

      it('자아가 없으면 공용 로고스를 해금하지 않는다', () => {
        const store = createTestStore({
          growth: { ...initialGrowthState, pyramidLevel: 6, skillPoints: 1 },
        });

        store.getState().unlockLogos('common');

        expect(store.getState().growth?.logosLevels.common).toBe(0);
      });

      it('검잡이 자아가 없으면 battleWaltz를 해금하지 않는다', () => {
        const store = createTestStore({
          growth: {
            ...initialGrowthState,
            pyramidLevel: 6,
            skillPoints: 1,
            identities: ['gunslinger'],
          },
        });

        store.getState().unlockLogos('battleWaltz');

        expect(store.getState().growth?.logosLevels.battleWaltz).toBe(0);
      });

      it('총잡이 자아가 없으면 gunkata를 해금하지 않는다', () => {
        const store = createTestStore({
          growth: {
            ...initialGrowthState,
            pyramidLevel: 6,
            skillPoints: 1,
            identities: ['swordsman'],
          },
        });

        store.getState().unlockLogos('gunkata');

        expect(store.getState().growth?.logosLevels.gunkata).toBe(0);
      });

      it('최대 레벨(3)을 초과하지 않는다', () => {
        const store = createTestStore({
          growth: {
            ...initialGrowthState,
            pyramidLevel: 8,
            skillPoints: 5,
            identities: ['swordsman'],
            logosLevels: { common: 3, gunkata: 0, battleWaltz: 0 },
          },
        });

        store.getState().unlockLogos('common');

        expect(store.getState().growth?.logosLevels.common).toBe(3);
        expect(store.getState().growth?.skillPoints).toBe(5); // 소모되지 않음
      });
    });

    describe('equipPathos', () => {
      it('파토스를 장착한다', () => {
        const store = createTestStore({
          growth: { ...initialGrowthState, unlockedPathos: ['quick_draw', 'reload'] },
        });

        store.getState().equipPathos(['quick_draw', 'reload']);

        expect(store.getState().growth?.equippedPathos).toContain('quick_draw');
        expect(store.getState().growth?.equippedPathos).toContain('reload');
      });

      it('해금되지 않은 파토스는 장착하지 않는다', () => {
        const store = createTestStore({
          growth: { ...initialGrowthState, unlockedPathos: ['quick_draw'] },
        });

        store.getState().equipPathos(['quick_draw', 'invalid_pathos']);

        expect(store.getState().growth?.equippedPathos).toContain('quick_draw');
        expect(store.getState().growth?.equippedPathos).not.toContain('invalid_pathos');
      });

      it('최대 3개까지만 장착한다', () => {
        const store = createTestStore({
          growth: { ...initialGrowthState, unlockedPathos: ['a', 'b', 'c', 'd'] },
        });

        store.getState().equipPathos(['a', 'b', 'c', 'd']);

        expect(store.getState().growth?.equippedPathos.length).toBeLessThanOrEqual(3);
      });
    });

    describe('usePathos', () => {
      it('장착된 파토스를 사용할 수 있다', () => {
        const store = createTestStore({
          growth: {
            ...initialGrowthState,
            unlockedPathos: ['quick_draw'],
            equippedPathos: ['quick_draw'],
          },
        });

        // usePathos는 현재 사용 가능 여부만 체크
        store.getState().usePathos('quick_draw');

        // 상태 변경 없이 통과해야 함 (쿨다운 관리는 전투 시스템에서)
        expect(store.getState().growth?.equippedPathos).toContain('quick_draw');
      });

      it('장착되지 않은 파토스는 무시한다', () => {
        const store = createTestStore({
          growth: {
            ...initialGrowthState,
            unlockedPathos: ['quick_draw'],
            equippedPathos: [],
          },
        });

        // 아무 동작도 하지 않음
        store.getState().usePathos('quick_draw');

        expect(store.getState().growth).toBeDefined();
      });
    });

    describe('resetGrowth', () => {
      it('성장 상태를 초기화한다', () => {
        const store = createTestStore({
          growth: {
            ...initialGrowthState,
            pyramidLevel: 5,
            skillPoints: 10,
            unlockedEthos: ['bravery', 'steadfast'],
            unlockedPathos: ['quick_draw'],
            identities: ['swordsman'],
          },
        });

        store.getState().resetGrowth();

        expect(store.getState().growth).toEqual(initialGrowthState);
      });
    });

    describe('selectEthos (기존 호환성)', () => {
      it('기초 에토스가 아니면 상태를 유지한다', () => {
        const store = createTestStore({
          growth: { ...initialGrowthState, pyramidLevel: 1 },
        });

        store.getState().selectEthos('invalid_ethos');

        // 존재하지 않는 에토스는 무시
        expect(store.getState().growth?.unlockedEthos).toEqual([]);
      });

      it('노드 선택 대기 상태에서 선택지가 아닌 에토스는 무시한다', () => {
        const store = createTestStore({
          growth: {
            ...initialGrowthState,
            pyramidLevel: 3,
            pendingNodeSelection: { nodeId: 'ethos_node_1', type: 'ethos' },
          },
        });

        store.getState().selectEthos('shadow'); // 다른 노드의 선택지

        expect(store.getState().growth?.unlockedEthos).not.toContain('shadow');
      });
    });

    describe('selectPathos (기존 호환성)', () => {
      it('기본 파토스가 아니면 상태를 유지한다', () => {
        const store = createTestStore({
          growth: { ...initialGrowthState, pyramidLevel: 2, skillPoints: 1 },
        });

        store.getState().selectPathos('invalid_pathos');

        // 존재하지 않는 파토스는 무시
        expect(store.getState().growth?.unlockedPathos).toEqual([]);
      });

      it('노드 선택 대기 상태에서 선택지가 아닌 파토스는 무시한다', () => {
        const store = createTestStore({
          growth: {
            ...initialGrowthState,
            pyramidLevel: 4,
            pendingNodeSelection: { nodeId: 'pathos_node_1', type: 'pathos' },
          },
        });

        store.getState().selectPathos('other_pathos'); // 다른 노드의 선택지

        expect(store.getState().growth?.unlockedPathos).not.toContain('other_pathos');
      });
    });
  });
});
