/**
 * @file growthSlice.ts
 * @description 피라미드 성장 시스템 상태 슬라이스
 *
 * 피라미드 구조:
 * - 1단계: 기초 에토스 6개 (자동 해금, 스킬포인트로 선택)
 * - 2단계: 기본 파토스 5개 (자동 해금, 스킬포인트로 선택)
 * - 3단계: 에토스 노드 6개 (각 2개 선택지 중 1개 선택)
 * - 4단계: 파토스 노드 5개 (각 2개 선택지 중 1개 선택)
 * - 5단계: 상위 에토스 노드 4개 (각 2개 선택지 중 1개 선택)
 * - 정점: 자아 (검사/총잡이) + 로고스
 */

import type { StateCreator } from 'zustand';
import type { GameStore } from './types';
import { getPyramidLevelFromTraits } from '../../data/reflections';
import { ETHOS, ETHOS_NODES, BASE_ETHOS, type Ethos, type EthosNode } from '../../data/growth/ethosData';
import { PATHOS, PATHOS_NODES, BASE_PATHOS, MAX_EQUIPPED_PATHOS, type Pathos, type PathosNode } from '../../data/growth/pathosData';
import { getLogosLevelFromPyramid } from '../../data/growth/logosData';
import { IDENTITY_REQUIRED_PYRAMID_LEVEL, type IdentityType } from '../../data/growth/identityData';

// 성장 상태 타입
export interface GrowthState {
  // 피라미드 진행
  pyramidLevel: number;              // 현재 피라미드 레벨
  skillPoints: number;               // 사용 가능한 스킬포인트

  // 해금된 항목
  unlockedEthos: string[];           // 해금된 에토스 ID 목록
  unlockedPathos: string[];          // 해금된 파토스 ID 목록
  unlockedNodes: string[];           // 해금된 노드 ID 목록 (에토스/파토스 공통)

  // 선택 대기 상태
  pendingNodeSelection: {
    nodeId: string;
    type: 'ethos' | 'pathos';
  } | null;

  // 자아
  identities: IdentityType[];        // 선택한 자아들 (하이브리드 가능)

  // 로고스 레벨
  logosLevels: {
    common: number;
    gunkata: number;
    battleWaltz: number;
  };

  // 전투 장착
  equippedPathos: string[];          // 장착된 파토스 (최대 3개)
}

// 초기 상태
export const initialGrowthState: GrowthState = {
  pyramidLevel: 0,
  skillPoints: 0,
  unlockedEthos: [],
  unlockedPathos: [],
  unlockedNodes: [],
  pendingNodeSelection: null,
  identities: [],
  logosLevels: {
    common: 0,
    gunkata: 0,
    battleWaltz: 0,
  },
  equippedPathos: [],
};

// 액션 타입
export interface GrowthSliceActions {
  // 피라미드 레벨 업데이트 (개성 획득 시 호출)
  updatePyramidLevel: () => void;

  // 스킬포인트 추가 (개성 획득 시)
  addSkillPoints: (amount: number) => void;

  // 기초 에토스 선택 (1단계, 스킬포인트 소모)
  selectBaseEthos: (ethosId: string) => void;

  // 기본 파토스 선택 (2단계, 스킬포인트 소모)
  selectBasePathos: (pathosId: string) => void;

  // 노드 해금 (스킬포인트 소모, 선택 대기 상태로)
  unlockNode: (nodeId: string, type: 'ethos' | 'pathos') => void;

  // 노드 내 선택지 선택 (대기 중인 노드의 선택지 선택)
  selectNodeChoice: (choiceId: string) => void;

  // 자아 선택
  selectIdentity: (identity: IdentityType) => void;

  // 파토스 장착 (전투 전)
  equipPathos: (pathosIds: string[]) => void;

  // 기존 호환성 - 에토스 선택 (내부적으로 selectBaseEthos 또는 selectNodeChoice 호출)
  selectEthos: (ethosId: string) => void;

  // 기존 호환성 - 파토스 선택
  selectPathos: (pathosId: string) => void;

  // 파토스 사용 (전투 중)
  usePathos: (pathosId: string) => void;

  // 성장 상태 초기화
  resetGrowth: () => void;
}

export type GrowthActionsSlice = GrowthSliceActions;

type SliceCreator = StateCreator<GameStore, [], [], GrowthActionsSlice>;

export const createGrowthActions: SliceCreator = (set, get) => ({
  updatePyramidLevel: () =>
    set((state) => {
      const traitCount = (state.playerTraits || []).length;
      const newLevel = getPyramidLevelFromTraits(traitCount);
      const currentLevel = state.growth?.pyramidLevel || 0;

      if (newLevel <= currentLevel) return state;

      // 새 레벨 달성
      const growth = { ...(state.growth || initialGrowthState) };
      growth.pyramidLevel = newLevel;

      // 레벨업 시 스킬포인트 획득 (레벨당 1포인트)
      growth.skillPoints += (newLevel - currentLevel);

      // 로고스 레벨 업데이트
      const logosLevel = getLogosLevelFromPyramid(newLevel);
      growth.logosLevels.common = logosLevel;

      // 자아별 로고스 레벨
      if (growth.identities.includes('gunslinger')) {
        growth.logosLevels.gunkata = logosLevel;
      }
      if (growth.identities.includes('swordsman')) {
        growth.logosLevels.battleWaltz = logosLevel;
      }

      return { ...state, growth };
    }),

  addSkillPoints: (amount: number) =>
    set((state) => {
      const growth = { ...(state.growth || initialGrowthState) };
      growth.skillPoints += amount;
      return { ...state, growth };
    }),

  selectBaseEthos: (ethosId: string) =>
    set((state) => {
      const growth = { ...(state.growth || initialGrowthState) };
      const ethos = BASE_ETHOS[ethosId];

      // 유효성 검사
      if (!ethos) return state;
      if (growth.unlockedEthos.includes(ethosId)) return state;
      if (growth.skillPoints < 1) return state;
      if (growth.pyramidLevel < 1) return state;

      // 에토스 해금 및 스킬포인트 소모
      growth.unlockedEthos = [...growth.unlockedEthos, ethosId];
      growth.skillPoints -= 1;

      return { ...state, growth };
    }),

  selectBasePathos: (pathosId: string) =>
    set((state) => {
      const growth = { ...(state.growth || initialGrowthState) };
      const pathos = BASE_PATHOS[pathosId];

      // 유효성 검사
      if (!pathos) return state;
      if (growth.unlockedPathos.includes(pathosId)) return state;
      if (growth.skillPoints < 1) return state;
      if (growth.pyramidLevel < 2) return state;

      // 파토스 해금 및 스킬포인트 소모
      growth.unlockedPathos = [...growth.unlockedPathos, pathosId];
      growth.skillPoints -= 1;

      return { ...state, growth };
    }),

  unlockNode: (nodeId: string, type: 'ethos' | 'pathos') =>
    set((state) => {
      const growth = { ...(state.growth || initialGrowthState) };
      const nodes = type === 'ethos' ? ETHOS_NODES : PATHOS_NODES;
      const node = nodes[nodeId];

      // 유효성 검사
      if (!node) return state;
      if (growth.unlockedNodes.includes(nodeId)) return state;
      if (growth.skillPoints < 1) return state;
      if (growth.pyramidLevel < node.tier) return state;

      // 노드 해금 및 선택 대기 상태로
      growth.unlockedNodes = [...growth.unlockedNodes, nodeId];
      growth.skillPoints -= 1;
      growth.pendingNodeSelection = { nodeId, type };

      return { ...state, growth };
    }),

  selectNodeChoice: (choiceId: string) =>
    set((state) => {
      const growth = { ...(state.growth || initialGrowthState) };

      // 대기 중인 노드 선택이 있어야 함
      if (!growth.pendingNodeSelection) return state;

      const { nodeId, type } = growth.pendingNodeSelection;
      const nodes = type === 'ethos' ? ETHOS_NODES : PATHOS_NODES;
      const node = nodes[nodeId];

      if (!node) return state;

      // 선택지가 해당 노드에 속하는지 확인
      if (!node.choices.includes(choiceId)) return state;

      // 선택지 해금
      if (type === 'ethos') {
        if (!growth.unlockedEthos.includes(choiceId)) {
          growth.unlockedEthos = [...growth.unlockedEthos, choiceId];
        }
      } else {
        if (!growth.unlockedPathos.includes(choiceId)) {
          growth.unlockedPathos = [...growth.unlockedPathos, choiceId];
        }
      }

      // 대기 상태 해제
      growth.pendingNodeSelection = null;

      return { ...state, growth };
    }),

  selectIdentity: (identity: IdentityType) =>
    set((state) => {
      const growth = { ...(state.growth || initialGrowthState) };

      // 피라미드 레벨 체크
      if (growth.pyramidLevel < IDENTITY_REQUIRED_PYRAMID_LEVEL) return state;

      // 이미 선택한 자아인지 체크
      if (growth.identities.includes(identity)) return state;

      // 자아 추가 (하이브리드 가능)
      growth.identities = [...growth.identities, identity];

      // 자아별 로고스 레벨 설정
      const logosLevel = getLogosLevelFromPyramid(growth.pyramidLevel);
      if (identity === 'gunslinger') {
        growth.logosLevels.gunkata = logosLevel;
      } else if (identity === 'swordsman') {
        growth.logosLevels.battleWaltz = logosLevel;
      }

      return { ...state, growth };
    }),

  equipPathos: (pathosIds: string[]) =>
    set((state) => {
      const growth = { ...(state.growth || initialGrowthState) };

      // 최대 3개 제한
      const validIds = pathosIds
        .filter(id => growth.unlockedPathos.includes(id))
        .slice(0, MAX_EQUIPPED_PATHOS);

      growth.equippedPathos = validIds;

      return { ...state, growth };
    }),

  // 기존 호환성 - 에토스 선택
  selectEthos: (ethosId: string) =>
    set((state) => {
      const growth = { ...(state.growth || initialGrowthState) };

      // 기초 에토스인 경우
      if (BASE_ETHOS[ethosId]) {
        const newState = get();
        newState.selectBaseEthos(ethosId);
        return state;
      }

      // 노드 선택지인 경우
      const ethos = ETHOS[ethosId];
      if (ethos?.nodeId && growth.pendingNodeSelection?.nodeId === ethos.nodeId) {
        const newState = get();
        newState.selectNodeChoice(ethosId);
        return state;
      }

      return state;
    }),

  // 기존 호환성 - 파토스 선택
  selectPathos: (pathosId: string) =>
    set((state) => {
      const growth = { ...(state.growth || initialGrowthState) };

      // 기본 파토스인 경우
      if (BASE_PATHOS[pathosId]) {
        const newState = get();
        newState.selectBasePathos(pathosId);
        return state;
      }

      // 노드 선택지인 경우
      const pathos = PATHOS[pathosId];
      if (pathos?.nodeId && growth.pendingNodeSelection?.nodeId === pathos.nodeId) {
        const newState = get();
        newState.selectNodeChoice(pathosId);
        return state;
      }

      return state;
    }),

  usePathos: (pathosId: string) =>
    set((state) => {
      // 전투 중 파토스 사용 - 쿨다운 관리는 battleState에서 처리
      // 여기서는 사용 가능 여부만 체크
      const growth = state.growth || initialGrowthState;

      if (!growth.equippedPathos.includes(pathosId)) return state;

      // TODO: 쿨다운 체크 및 효과 적용은 전투 시스템에서 처리
      return state;
    }),

  resetGrowth: () =>
    set((state) => ({
      ...state,
      growth: initialGrowthState,
    })),
});

// 하위 호환성
export const createGrowthSlice = createGrowthActions;
export type GrowthSlice = GrowthActionsSlice;

// ========================================
// 헬퍼 함수들
// ========================================

// 선택 가능한 기초 에토스 (1단계)
export function getAvailableBaseEthos(state: GrowthState): Ethos[] {
  if (state.pyramidLevel < 1) return [];
  return Object.values(BASE_ETHOS).filter(e =>
    !state.unlockedEthos.includes(e.id)
  );
}

// 선택 가능한 기본 파토스 (2단계)
export function getAvailableBasePathos(state: GrowthState): Pathos[] {
  if (state.pyramidLevel < 2) return [];
  return Object.values(BASE_PATHOS).filter(p =>
    !state.unlockedPathos.includes(p.id)
  );
}

// 해금 가능한 에토스 노드 (3, 5단계)
export function getAvailableEthosNodes(state: GrowthState): EthosNode[] {
  return Object.values(ETHOS_NODES).filter(node =>
    node.tier <= state.pyramidLevel &&
    !state.unlockedNodes.includes(node.id)
  );
}

// 해금 가능한 파토스 노드 (4단계)
export function getAvailablePathosNodes(state: GrowthState): PathosNode[] {
  return Object.values(PATHOS_NODES).filter(node =>
    node.tier <= state.pyramidLevel &&
    !state.unlockedNodes.includes(node.id)
  );
}

// 노드의 선택지 조회
export function getNodeChoices(nodeId: string, type: 'ethos' | 'pathos'): [Ethos | Pathos, Ethos | Pathos] | null {
  const nodes = type === 'ethos' ? ETHOS_NODES : PATHOS_NODES;
  const items = type === 'ethos' ? ETHOS : PATHOS;
  const node = nodes[nodeId];

  if (!node) return null;

  const choice1 = items[node.choices[0]];
  const choice2 = items[node.choices[1]];

  if (!choice1 || !choice2) return null;
  return [choice1, choice2] as [Ethos | Pathos, Ethos | Pathos];
}

// 자아 선택 가능 여부
export function canSelectIdentity(state: GrowthState): boolean {
  return state.pyramidLevel >= IDENTITY_REQUIRED_PYRAMID_LEVEL;
}

// 기존 호환성 - 선택 가능한 에토스 (모든 티어)
export function getAvailableEthos(state: GrowthState): Ethos[] {
  const available: Ethos[] = [];

  // 1단계 기초 에토스
  if (state.pyramidLevel >= 1) {
    available.push(...getAvailableBaseEthos(state));
  }

  // 노드 선택 대기 중인 경우 해당 선택지 반환
  if (state.pendingNodeSelection?.type === 'ethos') {
    const choices = getNodeChoices(state.pendingNodeSelection.nodeId, 'ethos');
    if (choices) {
      available.push(...(choices as [Ethos, Ethos]));
    }
  }

  return available;
}

// 기존 호환성 - 선택 가능한 파토스 (모든 티어)
export function getAvailablePathos(state: GrowthState): Pathos[] {
  const available: Pathos[] = [];

  // 2단계 기본 파토스
  if (state.pyramidLevel >= 2) {
    available.push(...getAvailableBasePathos(state));
  }

  // 노드 선택 대기 중인 경우 해당 선택지 반환
  if (state.pendingNodeSelection?.type === 'pathos') {
    const choices = getNodeChoices(state.pendingNodeSelection.nodeId, 'pathos');
    if (choices) {
      available.push(...(choices as [Pathos, Pathos]));
    }
  }

  return available;
}

// 해금된 에토스 목록 조회
export function getUnlockedEthos(state: GrowthState): Ethos[] {
  return state.unlockedEthos.map(id => ETHOS[id]).filter(Boolean);
}

// 해금된 파토스 목록 조회
export function getUnlockedPathos(state: GrowthState): Pathos[] {
  return state.unlockedPathos.map(id => PATHOS[id]).filter(Boolean);
}
