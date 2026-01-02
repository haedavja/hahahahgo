/**
 * @file useGameStoreSelectors.ts
 * @description 게임 스토어 셀렉터 훅
 *
 * ## 주요 기능
 * - 전투에 필요한 게임 스토어 상태 선택
 * - 개발자 모드 관련 상태
 * - 플레이어 특성 및 유물 상태
 */

import { useGameStore } from '../../../state/gameStore';
import type { CharacterBuild, Token } from '../../../types/core';
import type { PlayerEgo } from '../../../state/slices/types';

interface DevBattleTokens {
  id: string;
  stacks: number;
  target: string;
  timestamp?: number;
  [key: string]: unknown;
}

interface GameStoreSelectors {
  playerTraits: string[];
  playerEgos: PlayerEgo[];
  devCharacterBuild: CharacterBuild | null;
  devBattleTokens: DevBattleTokens[] | null;
  devClearBattleTokens: (() => void) | null;
  relics: string[];
  playerStrength: number;
  devDulledLevel: number | null;
  cardUpgrades: Record<string, string | undefined>;
}

/**
 * 게임 스토어 셀렉터 훅
 */
export function useGameStoreSelectors(): GameStoreSelectors {
  const playerTraits = useGameStore((state) => state.playerTraits || []);
  const playerEgos = useGameStore((state) => state.playerEgos || []);
  const devCharacterBuild = useGameStore((state) => state.characterBuild);
  const devBattleTokens = useGameStore((state) => state.devBattleTokens);
  const devClearBattleTokens = useGameStore((state) => state.devClearBattleTokens);
  const relics = useGameStore((state) => state.relics || []);
  const playerStrength = useGameStore((state) => state.playerStrength || 0);
  const devDulledLevel = useGameStore((state) => state.devDulledLevel ?? null);
  const cardUpgrades = useGameStore((state) => state.cardUpgrades || {});

  return {
    playerTraits,
    playerEgos,
    devCharacterBuild,
    devBattleTokens,
    devClearBattleTokens,
    relics,
    playerStrength,
    devDulledLevel,
    cardUpgrades
  };
}
