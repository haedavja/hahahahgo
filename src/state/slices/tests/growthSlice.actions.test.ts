/**
 * @file growthSlice.actions.test.ts
 * @description 피라미드 성장 시스템 액션 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createGrowthActions, initialGrowthState, type GrowthState } from '../growthSlice';
import type { GameStore } from '../types';

// 데이터 모킹
vi.mock('../../../data/growth/ethosData', () => ({
  ETHOS: {
    bravery: { id: 'bravery', name: '용맹', pyramidLevel: 1 },
    steadfast: { id: 'steadfast', name: '굳건', pyramidLevel: 1 },
    composure: { id: 'composure', name: '냉철', pyramidLevel: 1 },
    flame: { id: 'flame', name: '불꽃', nodeId: 'advance', pyramidLevel: 3 },
    ice: { id: 'ice', name: '얼음', nodeId: 'advance', pyramidLevel: 3 },
    shadow: { id: 'shadow', name: '그림자', nodeId: 'emperor', pyramidLevel: 5 },
    light: { id: 'light', name: '빛', nodeId: 'emperor', pyramidLevel: 5 },
  },
  BASE_ETHOS: {
    bravery: { id: 'bravery', name: '용맹', pyramidLevel: 1 },
    steadfast: { id: 'steadfast', name: '굳건', pyramidLevel: 1 },
    composure: { id: 'composure', name: '냉철', pyramidLevel: 1 },
  },
  ETHOS_NODES: {
    advance: {
      id: 'advance',
      name: '전진',
      tier: 3,
      choices: ['flame', 'ice'],
    },
    emperor: {
      id: 'emperor',
      name: '제왕',
      tier: 5,
      choices: ['shadow', 'light'],
    },
  },
}));

vi.mock('../../../data/growth/pathosData', () => ({
  PATHOS: {
    quick_draw: { id: 'quick_draw', name: '퀵드로우', pyramidLevel: 2 },
    reload: { id: 'reload', name: '장전', pyramidLevel: 2 },
    iron_bullet: { id: 'iron_bullet', name: '철갑탄', nodeId: 'bullet_node', pyramidLevel: 4 },
    fire_bullet: { id: 'fire_bullet', name: '화염탄', nodeId: 'bullet_node', pyramidLevel: 4 },
  },
  TIER2_PATHOS: {
    quick_draw: { id: 'quick_draw', name: '퀵드로우', pyramidLevel: 2 },
    reload: { id: 'reload', name: '장전', pyramidLevel: 2 },
  },
  PATHOS_NODES: {
    bullet_node: {
      id: 'bullet_node',
      name: '탄환 노드',
      tier: 4,
      choices: ['iron_bullet', 'fire_bullet'],
    },
  },
  MAX_EQUIPPED_PATHOS: 3,
}));

vi.mock('../../../data/growth/logosData', () => ({
  getLogosLevelFromPyramid: vi.fn((level: number) => {
    if (level >= 7) return 3;
    if (level >= 5) return 2;
    if (level >= 3) return 1;
    return 0;
  }),
}));

vi.mock('../../../data/growth/identityData', () => ({
  IDENTITY_REQUIRED_PYRAMID_LEVEL: 3,
}));

vi.mock('../../../data/reflections', () => ({
  getPyramidLevelFromTraits: vi.fn((count: number) => Math.min(count, 7)),
}));

// 테스트용 상태 생성 헬퍼
function createMockState(growthOverrides: Partial<GrowthState> = {}): GameStore {
  return {
    growth: {
      ...initialGrowthState,
      ...growthOverrides,
    },
    playerTraits: [],
  } as unknown as GameStore;
}

// 액션 테스트용 래퍼
function createActionsWithMockStore(initialState: GameStore) {
  let currentState = initialState;

  const set = vi.fn((updater: (state: GameStore) => GameStore) => {
    currentState = updater(currentState);
    return currentState;
  });

  const get = vi.fn(() => currentState);

  const actions = createGrowthActions(set as any, get as any, {} as any);

  return {
    actions,
    getState: () => currentState,
    set,
    get,
  };
}

describe('growthSlice actions', () => {
  describe('updatePyramidLevel', () => {
    it('개성 개수에 따라 피라미드 레벨을 업데이트한다', () => {
      const initialState = createMockState({ pyramidLevel: 0 });
      (initialState as any).playerTraits = ['용맹함', '굳건함', '냉철함'];

      const { actions, getState } = createActionsWithMockStore(initialState);
      actions.updatePyramidLevel();

      expect(getState().growth.pyramidLevel).toBe(3);
    });

    it('레벨업 시 스킬포인트를 획득한다', () => {
      const initialState = createMockState({ pyramidLevel: 1, skillPoints: 0 });
      (initialState as any).playerTraits = ['용맹함', '굳건함', '냉철함'];

      const { actions, getState } = createActionsWithMockStore(initialState);
      actions.updatePyramidLevel();

      // 레벨 1 → 3: 2포인트 획득
      expect(getState().growth.skillPoints).toBe(2);
    });

    it('개성 이름에 해당하는 에토스를 자동 해금한다', () => {
      const initialState = createMockState({ pyramidLevel: 0 });
      (initialState as any).playerTraits = ['용맹함'];

      const { actions, getState } = createActionsWithMockStore(initialState);
      actions.updatePyramidLevel();

      expect(getState().growth.unlockedEthos).toContain('bravery');
    });

    it('레벨이 오르지 않으면 스킬포인트를 획득하지 않는다', () => {
      const initialState = createMockState({ pyramidLevel: 3, skillPoints: 5 });
      (initialState as any).playerTraits = ['용맹함', '굳건함', '냉철함'];

      const { actions, getState } = createActionsWithMockStore(initialState);
      actions.updatePyramidLevel();

      expect(getState().growth.skillPoints).toBe(5);
    });
  });

  describe('addSkillPoints', () => {
    it('스킬포인트를 추가한다', () => {
      const initialState = createMockState({ skillPoints: 5 });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.addSkillPoints(3);

      expect(getState().growth.skillPoints).toBe(8);
    });

    it('음수 스킬포인트도 추가할 수 있다', () => {
      const initialState = createMockState({ skillPoints: 5 });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.addSkillPoints(-2);

      expect(getState().growth.skillPoints).toBe(3);
    });
  });

  describe('selectBaseEthos', () => {
    it('기초 에토스를 해금한다', () => {
      const initialState = createMockState({ pyramidLevel: 1 });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.selectBaseEthos('bravery');

      expect(getState().growth.unlockedEthos).toContain('bravery');
    });

    it('피라미드 레벨이 1 미만이면 해금하지 않는다', () => {
      const initialState = createMockState({ pyramidLevel: 0 });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.selectBaseEthos('bravery');

      expect(getState().growth.unlockedEthos).not.toContain('bravery');
    });

    it('이미 해금된 에토스는 중복 해금하지 않는다', () => {
      const initialState = createMockState({
        pyramidLevel: 1,
        unlockedEthos: ['bravery'],
      });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.selectBaseEthos('bravery');

      expect(getState().growth.unlockedEthos.filter(e => e === 'bravery').length).toBe(1);
    });

    it('존재하지 않는 에토스는 해금하지 않는다', () => {
      const initialState = createMockState({ pyramidLevel: 1 });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.selectBaseEthos('invalid_ethos');

      expect(getState().growth.unlockedEthos).toEqual([]);
    });
  });

  describe('selectBasePathos', () => {
    it('기본 파토스를 해금하고 스킬포인트를 소모한다', () => {
      const initialState = createMockState({ pyramidLevel: 2, skillPoints: 3 });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.selectBasePathos('quick_draw');

      expect(getState().growth.unlockedPathos).toContain('quick_draw');
      expect(getState().growth.skillPoints).toBe(2);
    });

    it('피라미드 레벨이 2 미만이면 해금하지 않는다', () => {
      const initialState = createMockState({ pyramidLevel: 1, skillPoints: 3 });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.selectBasePathos('quick_draw');

      expect(getState().growth.unlockedPathos).not.toContain('quick_draw');
    });

    it('스킬포인트가 부족하면 해금하지 않는다', () => {
      const initialState = createMockState({ pyramidLevel: 2, skillPoints: 0 });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.selectBasePathos('quick_draw');

      expect(getState().growth.unlockedPathos).not.toContain('quick_draw');
    });

    it('이미 해금된 파토스는 중복 해금하지 않는다', () => {
      const initialState = createMockState({
        pyramidLevel: 2,
        skillPoints: 3,
        unlockedPathos: ['quick_draw'],
      });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.selectBasePathos('quick_draw');

      expect(getState().growth.skillPoints).toBe(3); // 스킬포인트 소모 안됨
    });
  });

  describe('unlockNode', () => {
    it('에토스 노드를 해금하고 선택 대기 상태로 전환한다', () => {
      const initialState = createMockState({ pyramidLevel: 3, skillPoints: 2 });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.unlockNode('advance', 'ethos');

      expect(getState().growth.unlockedNodes).toContain('advance');
      expect(getState().growth.pendingNodeSelection).toEqual({
        nodeId: 'advance',
        type: 'ethos',
      });
      expect(getState().growth.skillPoints).toBe(1);
    });

    it('파토스 노드를 해금할 수 있다', () => {
      const initialState = createMockState({ pyramidLevel: 4, skillPoints: 2 });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.unlockNode('bullet_node', 'pathos');

      expect(getState().growth.unlockedNodes).toContain('bullet_node');
      expect(getState().growth.pendingNodeSelection?.type).toBe('pathos');
    });

    it('피라미드 레벨이 노드 티어보다 낮으면 해금하지 않는다', () => {
      const initialState = createMockState({ pyramidLevel: 2, skillPoints: 2 });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.unlockNode('advance', 'ethos'); // tier 3 필요

      expect(getState().growth.unlockedNodes).not.toContain('advance');
    });

    it('스킬포인트가 부족하면 해금하지 않는다', () => {
      const initialState = createMockState({ pyramidLevel: 3, skillPoints: 0 });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.unlockNode('advance', 'ethos');

      expect(getState().growth.unlockedNodes).not.toContain('advance');
    });

    it('이미 해금된 노드는 중복 해금하지 않는다', () => {
      const initialState = createMockState({
        pyramidLevel: 3,
        skillPoints: 2,
        unlockedNodes: ['advance'],
      });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.unlockNode('advance', 'ethos');

      expect(getState().growth.skillPoints).toBe(2);
    });
  });

  describe('selectNodeChoice', () => {
    it('대기 중인 노드의 선택지를 해금한다', () => {
      const initialState = createMockState({
        pyramidLevel: 3,
        pendingNodeSelection: { nodeId: 'advance', type: 'ethos' },
      });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.selectNodeChoice('flame');

      expect(getState().growth.unlockedEthos).toContain('flame');
      expect(getState().growth.pendingNodeSelection).toBeNull();
    });

    it('파토스 노드 선택지도 해금할 수 있다', () => {
      const initialState = createMockState({
        pyramidLevel: 4,
        pendingNodeSelection: { nodeId: 'bullet_node', type: 'pathos' },
      });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.selectNodeChoice('iron_bullet');

      expect(getState().growth.unlockedPathos).toContain('iron_bullet');
    });

    it('대기 중인 노드가 없으면 아무것도 하지 않는다', () => {
      const initialState = createMockState({ pyramidLevel: 3 });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.selectNodeChoice('flame');

      expect(getState().growth.unlockedEthos).not.toContain('flame');
    });

    it('해당 노드의 선택지가 아니면 해금하지 않는다', () => {
      const initialState = createMockState({
        pyramidLevel: 3,
        pendingNodeSelection: { nodeId: 'advance', type: 'ethos' },
      });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.selectNodeChoice('shadow'); // emperor 노드의 선택지

      expect(getState().growth.unlockedEthos).not.toContain('shadow');
    });
  });

  describe('selectIdentity', () => {
    it('자아를 선택한다', () => {
      const initialState = createMockState({ pyramidLevel: 3 });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.selectIdentity('gunslinger');

      expect(getState().growth.identities).toContain('gunslinger');
    });

    it('하이브리드 (두 자아 모두 선택) 가능하다', () => {
      const initialState = createMockState({
        pyramidLevel: 3,
        identities: ['gunslinger'],
      });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.selectIdentity('swordsman');

      expect(getState().growth.identities).toContain('gunslinger');
      expect(getState().growth.identities).toContain('swordsman');
    });

    it('피라미드 레벨이 요구치 미만이면 선택하지 않는다', () => {
      const initialState = createMockState({ pyramidLevel: 2 });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.selectIdentity('gunslinger');

      expect(getState().growth.identities).not.toContain('gunslinger');
    });

    it('이미 선택한 자아는 중복 선택하지 않는다', () => {
      const initialState = createMockState({
        pyramidLevel: 3,
        identities: ['gunslinger'],
      });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.selectIdentity('gunslinger');

      expect(getState().growth.identities.filter(i => i === 'gunslinger').length).toBe(1);
    });
  });

  describe('unlockLogos', () => {
    it('로고스 레벨을 올린다', () => {
      const initialState = createMockState({
        pyramidLevel: 3,
        skillPoints: 2,
        identities: ['gunslinger'],
      });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.unlockLogos('common');

      expect(getState().growth.logosLevels.common).toBe(1);
      expect(getState().growth.skillPoints).toBe(1);
    });

    it('gunkata 로고스는 총잡이 자아가 필요하다', () => {
      const initialState = createMockState({
        pyramidLevel: 3,
        skillPoints: 2,
        identities: ['gunslinger'],
      });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.unlockLogos('gunkata');

      expect(getState().growth.logosLevels.gunkata).toBe(1);
    });

    it('battleWaltz 로고스는 검잡이 자아가 필요하다', () => {
      const initialState = createMockState({
        pyramidLevel: 3,
        skillPoints: 2,
        identities: ['swordsman'],
      });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.unlockLogos('battleWaltz');

      expect(getState().growth.logosLevels.battleWaltz).toBe(1);
    });

    it('자아가 없으면 로고스를 해금하지 않는다', () => {
      const initialState = createMockState({
        pyramidLevel: 3,
        skillPoints: 2,
        identities: [],
      });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.unlockLogos('common');

      expect(getState().growth.logosLevels.common).toBe(0);
    });

    it('스킬포인트가 부족하면 해금하지 않는다', () => {
      const initialState = createMockState({
        pyramidLevel: 3,
        skillPoints: 0,
        identities: ['gunslinger'],
      });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.unlockLogos('common');

      expect(getState().growth.logosLevels.common).toBe(0);
    });

    it('최대 레벨(3)을 초과하면 해금하지 않는다', () => {
      const initialState = createMockState({
        pyramidLevel: 7,
        skillPoints: 2,
        identities: ['gunslinger'],
        logosLevels: { common: 3, gunkata: 0, battleWaltz: 0 },
      });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.unlockLogos('common');

      expect(getState().growth.logosLevels.common).toBe(3);
      expect(getState().growth.skillPoints).toBe(2); // 스킬포인트 소모 안됨
    });

    it('피라미드 레벨에 따른 최대 해금 레벨을 초과하면 해금하지 않는다', () => {
      const initialState = createMockState({
        pyramidLevel: 3, // 최대 로고스 레벨 1
        skillPoints: 2,
        identities: ['gunslinger'],
        logosLevels: { common: 1, gunkata: 0, battleWaltz: 0 },
      });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.unlockLogos('common');

      expect(getState().growth.logosLevels.common).toBe(1);
    });
  });

  describe('equipPathos', () => {
    it('해금된 파토스를 장착한다', () => {
      const initialState = createMockState({
        unlockedPathos: ['quick_draw', 'reload'],
      });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.equipPathos(['quick_draw', 'reload']);

      expect(getState().growth.equippedPathos).toEqual(['quick_draw', 'reload']);
    });

    it('해금되지 않은 파토스는 장착하지 않는다', () => {
      const initialState = createMockState({
        unlockedPathos: ['quick_draw'],
      });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.equipPathos(['quick_draw', 'reload']);

      expect(getState().growth.equippedPathos).toEqual(['quick_draw']);
    });

    it('최대 3개까지만 장착한다', () => {
      const initialState = createMockState({
        unlockedPathos: ['quick_draw', 'reload', 'iron_bullet', 'fire_bullet'],
      });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.equipPathos(['quick_draw', 'reload', 'iron_bullet', 'fire_bullet']);

      expect(getState().growth.equippedPathos.length).toBe(3);
    });
  });

  describe('usePathos', () => {
    it('장착된 파토스만 사용할 수 있다', () => {
      const initialState = createMockState({
        equippedPathos: ['quick_draw'],
      });
      const { actions, set } = createActionsWithMockStore(initialState);

      actions.usePathos('quick_draw');

      // usePathos는 현재 상태를 반환하고 실제 효과는 전투 시스템에서 처리
      expect(set).toHaveBeenCalled();
    });

    it('장착되지 않은 파토스는 사용하지 않는다', () => {
      const initialState = createMockState({
        equippedPathos: ['quick_draw'],
      });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.usePathos('reload');

      // 상태 변경 없음
      expect(getState().growth.equippedPathos).toEqual(['quick_draw']);
    });
  });

  describe('resetGrowth', () => {
    it('성장 상태를 초기화한다', () => {
      const initialState = createMockState({
        pyramidLevel: 5,
        skillPoints: 10,
        unlockedEthos: ['bravery', 'flame'],
        unlockedPathos: ['quick_draw'],
        identities: ['gunslinger'],
        logosLevels: { common: 2, gunkata: 1, battleWaltz: 0 },
      });
      const { actions, getState } = createActionsWithMockStore(initialState);

      actions.resetGrowth();

      const growth = getState().growth;
      expect(growth.pyramidLevel).toBe(0);
      expect(growth.skillPoints).toBe(0);
      expect(growth.unlockedEthos).toEqual([]);
      expect(growth.unlockedPathos).toEqual([]);
      expect(growth.identities).toEqual([]);
      expect(growth.logosLevels.common).toBe(0);
    });
  });

  describe('selectEthos (호환성)', () => {
    it('기초 에토스가 아니고 대기 노드도 없으면 상태를 변경하지 않는다', () => {
      const initialState = createMockState({ pyramidLevel: 1 });
      const { actions, getState } = createActionsWithMockStore(initialState);

      // selectEthos는 get()을 호출하여 액션을 가져오려 하지만,
      // 테스트 환경에서는 액션이 없으므로 상태 변경 없이 반환
      // 이 테스트는 잘못된 에토스 ID에 대해 상태가 변경되지 않음을 확인
      const beforeState = { ...getState().growth };

      // 노드 에토스이지만 대기 노드가 없는 경우
      actions.selectEthos('shadow'); // emperor 노드 에토스

      expect(getState().growth.unlockedEthos).toEqual(beforeState.unlockedEthos);
    });
  });

  describe('selectPathos (호환성)', () => {
    it('기본 파토스가 아니고 대기 노드도 없으면 상태를 변경하지 않는다', () => {
      const initialState = createMockState({ pyramidLevel: 4, skillPoints: 1 });
      const { actions, getState } = createActionsWithMockStore(initialState);

      const beforeState = { ...getState().growth };

      // 노드 파토스이지만 대기 노드가 없는 경우
      actions.selectPathos('iron_bullet');

      expect(getState().growth.unlockedPathos).toEqual(beforeState.unlockedPathos);
    });
  });
});
