/**
 * @file growthSlice.ts
 * @description 피라미드 성장 시스템 상태 슬라이스
 *
 * 구조:
 * 개성 → 에토스/파토스 (번갈아) → 자아 → 로고스
 *
 * - 피라미드 레벨: 개성 수에 따라 증가
 * - 에토스: 홀수 레벨에서 선택 (패시브)
 * - 파토스: 짝수 레벨에서 선택 (액티브, 전투에 3개 장착)
 * - 자아: 총잡이/검잡이 선택
 * - 로고스: 자아에 따른 보너스
 */

import type { StateCreator } from 'zustand';
import type { GameStore } from './types';
import { getPyramidLevelFromTraits } from '../../data/reflections';
import { ETHOS, type Ethos } from '../../data/growth/ethosData';
import { PATHOS, MAX_EQUIPPED_PATHOS, type Pathos } from '../../data/growth/pathosData';
import { getLogosLevelFromPyramid } from '../../data/growth/logosData';
import { IDENTITY_REQUIRED_PYRAMID_LEVEL, type IdentityType } from '../../data/growth/identityData';

// 성장 상태 타입
export interface GrowthState {
  // 피라미드 진행
  pyramidLevel: number;              // 현재 피라미드 레벨
  unlockedEthos: string[];           // 해금된 에토스 ID 목록
  unlockedPathos: string[];          // 해금된 파토스 ID 목록
  pendingSelection: 'ethos' | 'pathos' | null; // 대기 중인 선택

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
  unlockedEthos: [],
  unlockedPathos: [],
  pendingSelection: null,
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

  // 에토스 선택
  selectEthos: (ethosId: string) => void;

  // 파토스 선택
  selectPathos: (pathosId: string) => void;

  // 자아 선택
  selectIdentity: (identity: IdentityType) => void;

  // 파토스 장착 (전투 전)
  equipPathos: (pathosIds: string[]) => void;

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

      // 홀수 레벨: 에토스 선택 대기
      // 짝수 레벨: 파토스 선택 대기
      if (newLevel % 2 === 1) {
        growth.pendingSelection = 'ethos';
      } else {
        growth.pendingSelection = 'pathos';
      }

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

  selectEthos: (ethosId: string) =>
    set((state) => {
      const growth = { ...(state.growth || initialGrowthState) };

      // 유효성 검사
      if (growth.pendingSelection !== 'ethos') return state;
      if (!ETHOS[ethosId]) return state;
      if (growth.unlockedEthos.includes(ethosId)) return state;

      // 피라미드 레벨 체크
      const ethos = ETHOS[ethosId];
      if (ethos.pyramidLevel > growth.pyramidLevel) return state;

      // 에토스 해금
      growth.unlockedEthos = [...growth.unlockedEthos, ethosId];
      growth.pendingSelection = null;

      return { ...state, growth };
    }),

  selectPathos: (pathosId: string) =>
    set((state) => {
      const growth = { ...(state.growth || initialGrowthState) };

      // 유효성 검사
      if (growth.pendingSelection !== 'pathos') return state;
      if (!PATHOS[pathosId]) return state;
      if (growth.unlockedPathos.includes(pathosId)) return state;

      // 피라미드 레벨 체크
      const pathos = PATHOS[pathosId];
      if (pathos.pyramidLevel > growth.pyramidLevel) return state;

      // 파토스 해금
      growth.unlockedPathos = [...growth.unlockedPathos, pathosId];
      growth.pendingSelection = null;

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

// 헬퍼 함수들
export function getAvailableEthos(state: GrowthState): Ethos[] {
  return Object.values(ETHOS).filter(e =>
    e.pyramidLevel <= state.pyramidLevel &&
    !state.unlockedEthos.includes(e.id)
  );
}

export function getAvailablePathos(state: GrowthState): Pathos[] {
  return Object.values(PATHOS).filter(p =>
    p.pyramidLevel <= state.pyramidLevel &&
    !state.unlockedPathos.includes(p.id)
  );
}

export function canSelectIdentity(state: GrowthState): boolean {
  return state.pyramidLevel >= IDENTITY_REQUIRED_PYRAMID_LEVEL;
}
