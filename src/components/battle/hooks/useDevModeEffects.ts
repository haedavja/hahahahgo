/**
 * @file useDevModeEffects.ts
 * @description 개발자 모드 관련 효과들 통합 훅
 *
 * ## 주요 기능
 * - 주특기/보조특기 변경 시 덱 재구성
 * - 전투 중 토큰 즉시 추가
 * - 힘 변경 실시간 반영
 */

import { useEffect, useRef, type MutableRefObject } from 'react';
import { addToken } from '../../../lib/tokenUtils';
import { TOKENS } from '../../../data/tokens';
import { initializeDeck, drawFromDeck } from '../utils/handGeneration';
import { DEFAULT_DRAW_COUNT } from '../battleData';
import type { Card, TokenEntity } from '../../../types/core';
import type { CardGrowthState } from '../../../state/slices/types';

interface CharacterBuild {
  mainSpecials?: string[];
  subSpecials?: string[];
  ownedCards?: string[];
}

interface DevTokenInfo {
  id: string;
  stacks: number;
  target: 'player' | 'enemy';
}

interface PlayerState {
  strength?: number;
  tokens?: unknown;
  [key: string]: unknown;
}

interface EnemyState {
  tokens?: unknown;
  [key: string]: unknown;
}

interface BattleRefValue {
  player?: PlayerState;
  enemy?: EnemyState;
  [key: string]: unknown;
}

interface UseDevModeEffectsParams {
  battlePhase: string;
  player: PlayerState;
  enemy: EnemyState;
  playerStrength: number;
  devCharacterBuild: CharacterBuild | null;
  devBattleTokens: DevTokenInfo[] | null;
  devClearBattleTokens: (() => void) | null;
  vanishedCards: Array<{ id: string } | string>;
  escapeBanRef: MutableRefObject<Set<string>>;
  battleRef: MutableRefObject<BattleRefValue | null>;
  addLog: (msg: string) => void;
  cardGrowth: Record<string, CardGrowthState | undefined>;
  actions: {
    setPlayer: (player: PlayerState) => void;
    setEnemy: (enemy: EnemyState) => void;
    setDeck: (deck: Card[]) => void;
    setDiscardPile: (pile: Card[]) => void;
    setHand: (hand: Card[]) => void;
  };
}

/**
 * 개발자 모드 효과들 통합 훅
 */
export function useDevModeEffects(params: UseDevModeEffectsParams): void {
  const {
    battlePhase,
    player,
    enemy,
    playerStrength,
    devCharacterBuild,
    devBattleTokens,
    devClearBattleTokens,
    vanishedCards,
    escapeBanRef,
    battleRef,
    addLog,
    cardGrowth,
    actions
  } = params;

  const prevDevBuildRef = useRef<{ mainSpecials: string[]; subSpecials: string[] } | null>(null);

  // 개발자 모드에서 힘이 변경될 때 실시간 반영
  useEffect(() => {
    if (battlePhase === 'resolve') return;
    const currentStrength = player.strength || 0;
    if (currentStrength !== playerStrength) {
      actions.setPlayer({ ...player, strength: playerStrength });
    }
  }, [playerStrength, battlePhase, player, actions]);

  // [DEV] 개발자 모드에서 주특기/보조특기 변경 시 덱 재구성
  useEffect(() => {
    if (!devCharacterBuild) return;

    const prevBuild = prevDevBuildRef.current;
    const currentMainSpecials = devCharacterBuild.mainSpecials || [];
    const currentSubSpecials = devCharacterBuild.subSpecials || [];

    const prevMainSpecials = prevBuild?.mainSpecials || [];
    const prevSubSpecials = prevBuild?.subSpecials || [];

    const mainChanged = JSON.stringify(currentMainSpecials) !== JSON.stringify(prevMainSpecials);
    const subChanged = JSON.stringify(currentSubSpecials) !== JSON.stringify(prevSubSpecials);

    if (prevBuild && (mainChanged || subChanged)) {
      const vanishedIds = vanishedCards.map(c => typeof c === 'string' ? c : c.id);
      const { deck: newDeck, mainSpecialsHand } = initializeDeck(devCharacterBuild, vanishedIds, cardGrowth);
      const drawResult = drawFromDeck(newDeck, [], DEFAULT_DRAW_COUNT, escapeBanRef.current);

      actions.setDeck(drawResult.newDeck);
      actions.setDiscardPile(drawResult.newDiscardPile);
      actions.setHand([...mainSpecialsHand, ...drawResult.drawnCards]);
    }

    prevDevBuildRef.current = {
      mainSpecials: [...currentMainSpecials],
      subSpecials: [...currentSubSpecials]
    };
  }, [devCharacterBuild, vanishedCards, escapeBanRef, actions]);

  // 개발자 모드: 전투 중 토큰 즉시 추가
  useEffect(() => {
    if (!devBattleTokens || devBattleTokens.length === 0) return;

    devBattleTokens.forEach(tokenInfo => {
      const { id: tokenId, stacks, target } = tokenInfo;

      if (target === 'player') {
        const currentPlayer = battleRef.current?.player || player;
        const tokenResult = addToken(currentPlayer as TokenEntity, tokenId, stacks);
        const updatedPlayer = { ...currentPlayer, tokens: tokenResult.tokens };

        actions.setPlayer(updatedPlayer);
        if (battleRef.current) {
          battleRef.current = { ...battleRef.current, player: updatedPlayer };
        }

        const tokenName = TOKENS[tokenId]?.name || tokenId;
        addLog(`[DEV] 🎁 ${tokenName} +${stacks} 부여`);
      } else if (target === 'enemy') {
        const currentEnemy = battleRef.current?.enemy || enemy;
        const tokenResult = addToken(currentEnemy as TokenEntity, tokenId, stacks);
        const updatedEnemy = { ...currentEnemy, tokens: tokenResult.tokens };

        actions.setEnemy(updatedEnemy);
        if (battleRef.current) {
          battleRef.current = { ...battleRef.current, enemy: updatedEnemy };
        }

        const tokenName = TOKENS[tokenId]?.name || tokenId;
        addLog(`[DEV] 🎁 적에게 ${tokenName} +${stacks} 부여`);
      }
    });

    if (devClearBattleTokens) {
      devClearBattleTokens();
    }
  }, [devBattleTokens, devClearBattleTokens, player, enemy, battleRef, addLog, actions]);
}
