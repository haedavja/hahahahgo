/**
 * @file selectors.ts
 * @description Zustand 셀렉터 유틸리티
 *
 * ## 사용법
 * ```ts
 * import { useResourcesSelector, useBattleSelector } from '../state/selectors';
 *
 * // 여러 자원을 한번에 선택 (shallow 비교)
 * const { gold, intel } = useResourcesSelector(['gold', 'intel']);
 *
 * // 전투 상태 선택
 * const battle = useBattleSelector();
 * ```
 */

import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from './gameStore';
import type { GameStore } from './slices/types';
import type { Resources } from '../types/core';

// ==================== 자원 셀렉터 ====================

/** 자원 키 타입 */
type ResourceKey = keyof Resources;

/** 선택된 자원 타입 */
type SelectedResources<K extends ResourceKey> = Pick<Resources, K>;

/**
 * 여러 자원을 한번에 선택 (shallow 비교로 최적화)
 * @example
 * const { gold, intel } = useResourcesSelector(['gold', 'intel']);
 */
export function useResourcesSelector<K extends ResourceKey>(keys: K[]): SelectedResources<K> {
  return useGameStore(
    useShallow((state: GameStore) => {
      const result = {} as SelectedResources<K>;
      for (const key of keys) {
        result[key] = (state.resources?.[key] ?? 0) as Resources[K];
      }
      return result;
    })
  );
}

/** 모든 자원 선택 */
export function useAllResources(): Resources {
  return useGameStore(
    useShallow((state: GameStore) => state.resources ?? {
      gold: 0,
      intel: 0,
      loot: 0,
      material: 0,
      etherPts: 0,
      memory: 0,
    })
  );
}

// ==================== 플레이어 셀렉터 ====================

/** 플레이어 스탯 */
export interface PlayerStats {
  playerHp: number;
  maxHp: number;
  playerStrength: number;
  playerAgility: number;
  playerInsight: number;
}

/** 플레이어 스탯 선택 */
export function usePlayerStats(): PlayerStats {
  return useGameStore(
    useShallow((state: GameStore) => ({
      playerHp: state.playerHp ?? 100,
      maxHp: state.maxHp ?? 100,
      playerStrength: state.playerStrength ?? 0,
      playerAgility: state.playerAgility ?? 0,
      playerInsight: state.playerInsight ?? 0,
    }))
  );
}

// ==================== 전투 셀렉터 ====================

/** 전투 활성 여부 */
export function useIsInBattle(): boolean {
  return useGameStore((state: GameStore) => state.activeBattle !== null);
}

/** 전투 상태 */
export function useActiveBattle() {
  return useGameStore((state: GameStore) => state.activeBattle);
}

// ==================== 맵 셀렉터 ====================

/** 맵 상태 */
export interface MapState {
  map: GameStore['map'];
  mapRisk: number;
}

/** 맵 상태 선택 */
export function useMapState(): MapState {
  return useGameStore(
    useShallow((state: GameStore) => ({
      map: state.map,
      mapRisk: state.mapRisk ?? 0,
    }))
  );
}

// ==================== 인벤토리 셀렉터 ====================

/** 인벤토리 상태 */
export interface InventoryState {
  relics: string[];
  items: GameStore['items'];
}

/** 인벤토리 선택 */
export function useInventory(): InventoryState {
  return useGameStore(
    useShallow((state: GameStore) => ({
      relics: state.relics ?? [],
      items: state.items ?? [],
    }))
  );
}

// ==================== 액션 셀렉터 ====================

/** 자원 액션 */
export function useResourceActions() {
  return useGameStore(
    useShallow((state: GameStore) => ({
      setResources: state.setResources,
      addResources: state.addResources,
    }))
  );
}

/** 플레이어 액션 */
export function usePlayerActions() {
  return useGameStore(
    useShallow((state: GameStore) => ({
      setPlayerHp: state.setPlayerHp,
      updatePlayerStrength: state.updatePlayerStrength,
      updatePlayerAgility: state.updatePlayerAgility,
      updatePlayerInsight: state.updatePlayerInsight,
    }))
  );
}

/** 전투 액션 */
export function useBattleActions() {
  return useGameStore(
    useShallow((state: GameStore) => ({
      startBattle: state.startBattle,
      resolveBattle: state.resolveBattle,
      toggleBattleCard: state.toggleBattleCard,
      commitBattlePlan: state.commitBattlePlan,
    }))
  );
}

/** 인벤토리 액션 */
export function useInventoryActions() {
  return useGameStore(
    useShallow((state: GameStore) => ({
      addRelic: state.addRelic,
      removeRelic: state.removeRelic,
      addItem: state.addItem,
      removeItem: state.removeItem,
    }))
  );
}

// ==================== 모달/UI 상태 셀렉터 ====================

/** 모달 상태 */
export interface ModalState {
  activeEvent: GameStore['activeEvent'];
  activeRest: GameStore['activeRest'];
  activeShop: GameStore['activeShop'];
  activeDungeon: GameStore['activeDungeon'];
  lastBattleResult: GameStore['lastBattleResult'];
}

/** 모달 상태 선택 */
export function useModalState(): ModalState {
  return useGameStore(
    useShallow((state: GameStore) => ({
      activeEvent: state.activeEvent,
      activeRest: state.activeRest,
      activeShop: state.activeShop,
      activeDungeon: state.activeDungeon,
      lastBattleResult: state.lastBattleResult,
    }))
  );
}

/** 이벤트 액션 */
export function useEventActions() {
  return useGameStore(
    useShallow((state: GameStore) => ({
      chooseEvent: state.chooseEvent,
      closeEvent: state.closeEvent,
    }))
  );
}

/** 휴식 액션 */
export function useRestActions() {
  return useGameStore(
    useShallow((state: GameStore) => ({
      awakenAtRest: state.awakenAtRest,
      closeRest: state.closeRest,
      healAtRest: state.healAtRest,
    }))
  );
}

/** 던전 액션 */
export function useDungeonActions() {
  return useGameStore(
    useShallow((state: GameStore) => ({
      skipDungeon: state.skipDungeon,
      confirmDungeon: state.confirmDungeon,
      bypassDungeon: state.bypassDungeon,
    }))
  );
}

/** 아이템 상태와 액션 */
export function useItemsWithActions() {
  return useGameStore(
    useShallow((state: GameStore) => ({
      items: state.items ?? [],
      itemBuffs: state.itemBuffs ?? {},
      useItem: state.useItem,
    }))
  );
}
