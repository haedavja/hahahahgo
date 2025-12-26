/**
 * @file battleSlice.ts
 * @description 전투 시스템 슬라이스
 */

import type { SliceCreator, BattleSliceState, BattleSliceActions } from './types';
import { CARDS, ENEMIES, getRandomEnemy } from '../../components/battle/battleData';
import { drawHand, buildSpeedTimeline } from '../../lib/speedQueue';
import { simulateBattle, pickOutcome } from '../../lib/battleResolver';
import { applyCombatEndEffects } from '../../lib/relicEffects';
import { updateStats } from '../metaProgress';
import {
  BATTLE_CARDS,
  resolveEnemyDeck,
  computeBattlePlan,
  drawCharacterBuildHand,
} from '../battleHelpers';
import {
  grantRewards,
  MAX_PLAYER_SELECTION,
} from '../gameStoreHelpers';

export type BattleSlice = BattleSliceState & BattleSliceActions;

export const createBattleSlice: SliceCreator<BattleSlice> = (set, get) => ({
  // 초기 상태
  activeBattle: null,
  lastBattleResult: null,

  // 액션
  startBattle: (battleConfig: Record<string, unknown> = {}) =>
    set((state) => {
      const characterBuild = state.characterBuild;
      const hasCharacterBuild = characterBuild && (
        characterBuild.mainSpecials?.length > 0 ||
        characterBuild.subSpecials?.length > 0 ||
        characterBuild.ownedCards?.length > 0
      );

      const playerLibrary = hasCharacterBuild
        ? [...characterBuild.mainSpecials, ...characterBuild.subSpecials]
        : [...BATTLE_CARDS];

      // 적 선택
      let enemy = null;
      let enemyDeck: unknown[] = [];

      if (battleConfig.enemyId) {
        enemy = ENEMIES.find((e) => e.id === battleConfig.enemyId);
      } else if (battleConfig.tier) {
        enemy = getRandomEnemy(battleConfig.tier as number);
      }

      if (enemy) {
        enemyDeck = enemy.deck || [];
      } else {
        enemyDeck = resolveEnemyDeck('battle');
      }

      const enemyLibrary = [...enemyDeck];
      const playerDrawPile = hasCharacterBuild ? [] : [...playerLibrary];
      const enemyDrawPile = [...enemyLibrary];

      const playerHand = hasCharacterBuild
        ? drawCharacterBuildHand(characterBuild.mainSpecials, characterBuild.subSpecials, characterBuild.ownedCards)
        : drawHand(playerDrawPile, 3);

      const enemyHand = drawHand(enemyDrawPile, Math.min(3, enemyDrawPile.length));

      const enemyHp = (battleConfig.enemyHp as number) || enemy?.hp || 30;

      const battleStats = {
        player: { hp: state.playerHp, maxHp: state.maxHp, block: 0 },
        enemy: { hp: enemyHp, maxHp: enemyHp, block: 0 },
      };

      const timeline = buildSpeedTimeline(playerHand, enemyHand, 30);
      const simulation = simulateBattle(timeline, battleStats);
      const preview = {
        playerHand,
        enemyHand,
        timeline,
        tuLimit: 30,
      };

      const enemyInfo = enemy
        ? {
            id: enemy.id,
            name: enemy.name,
            emoji: enemy.emoji,
            tier: enemy.tier,
            isBoss: enemy.isBoss || false,
          }
        : null;

      return {
        ...state,
        activeBattle: {
          nodeId: (battleConfig.nodeId as string) || 'dungeon-combat',
          kind: (battleConfig.kind as string) || 'combat',
          label: (battleConfig.label as string) || enemy?.name || '던전 몬스터',
          rewards: (battleConfig.rewards as Record<string, unknown>) || {
            gold: { min: 5 + (enemy?.tier || 1) * 3, max: 10 + (enemy?.tier || 1) * 5 },
            loot: 1,
          },
          difficulty: enemy?.tier || 2,
          enemyInfo,
          playerLibrary,
          playerDrawPile,
          playerDiscardPile: [],
          enemyLibrary,
          enemyDrawPile,
          enemyDiscardPile: [],
          playerHand,
          enemyHand,
          selectedCardIds: [],
          maxSelection: MAX_PLAYER_SELECTION,
          preview,
          simulation,
          hasCharacterBuild,
          characterBuild: hasCharacterBuild ? characterBuild : null,
        },
      };
    }),

  resolveBattle: (outcome: Record<string, unknown> = {}) =>
    set((state) => {
      if (!state.activeBattle) return state;
      const rewardsDef = state.activeBattle.rewards ?? {};
      const autoResult = pickOutcome(state.activeBattle.simulation, 'victory');
      const resultLabel = (outcome.result as string) ?? autoResult;
      const rewards =
        resultLabel === 'victory'
          ? grantRewards(rewardsDef, state.resources)
          : { next: state.resources, applied: {} };

      // 메타 진행 통계 업데이트 (승리 시)
      if (resultLabel === 'victory') {
        const enemyInfo = state.activeBattle.enemyInfo as Record<string, unknown> | null;
        const statsUpdate: Record<string, number> = {
          totalKills: 1,
          totalDamageDealt: (outcome.damageDealt as number) || 0,
        };

        if (enemyInfo?.isBoss || state.activeBattle.kind === 'boss') {
          statsUpdate.bossKills = 1;
        }

        updateStats(statsUpdate);
      }

      let finalPlayerHp =
        (outcome.playerHp as number) ??
        (state.activeBattle.simulation as Record<string, unknown>)?.finalState?.player?.hp ??
        state.playerHp;
      let newMaxHp = (outcome.playerMaxHp as number) ?? state.maxHp;

      // Apply combat end effects from relics
      try {
        const combatEndEffects = applyCombatEndEffects(state.relics || [], {
          playerHp: finalPlayerHp,
          maxHp: state.maxHp,
        });

        const healed = combatEndEffects.heal || 0;
        const maxHpGain = combatEndEffects.maxHp || 0;

        newMaxHp = state.maxHp + maxHpGain;
        finalPlayerHp = Math.min(newMaxHp, finalPlayerHp + healed + maxHpGain);
      } catch (error) {
        console.error('Error applying combat end effects:', error);
      }

      return {
        ...state,
        resources: rewards.next,
        playerHp: Math.max(0, finalPlayerHp),
        maxHp: newMaxHp,
        activeBattle: null,
        lastBattleResult: {
          nodeId: state.activeBattle.nodeId as string,
          kind: state.activeBattle.kind as string,
          label: state.activeBattle.label as string,
          result: resultLabel as 'victory' | 'defeat',
          log: (state.activeBattle.simulation as Record<string, unknown>)?.log ?? [],
          finalState: (state.activeBattle.simulation as Record<string, unknown>)?.finalState ?? null,
          initialState: (state.activeBattle.simulation as Record<string, unknown>)?.initialState ?? null,
          rewards: rewards.applied,
          enemyInfo: state.activeBattle.enemyInfo,
        },
      };
    }),

  clearBattleResult: () =>
    set((state) => (state.lastBattleResult ? { ...state, lastBattleResult: null } : state)),

  toggleBattleCard: (cardId) =>
    set((state) => {
      const battle = state.activeBattle;
      if (!battle || !battle.playerHand) return state;
      const inHand = battle.playerHand.some(
        (card: { instanceId?: string; id?: string }) =>
          card.instanceId === cardId || card.id === cardId
      );
      if (!inHand) return state;
      const idKey =
        battle.playerHand.find(
          (card: { instanceId?: string; id?: string }) => card.instanceId === cardId
        )?.instanceId ?? cardId;
      const selectedCardIds = battle.selectedCardIds || [];
      const isSelected = selectedCardIds.includes(idKey);
      let nextSelected = selectedCardIds;
      if (isSelected) {
        nextSelected = selectedCardIds.filter((id: string) => id !== idKey);
      } else if (selectedCardIds.length < (battle.maxSelection ?? MAX_PLAYER_SELECTION)) {
        nextSelected = [...selectedCardIds, idKey];
      } else {
        return state;
      }
      return {
        ...state,
        activeBattle: {
          ...battle,
          selectedCardIds: nextSelected,
        },
      };
    }),

  commitBattlePlan: () =>
    set((state) => {
      const battle = state.activeBattle;
      if (!battle) return state;

      const drawFromPile = (pile: unknown[]) => {
        if (!pile.length) return [];
        return drawHand(pile, Math.min(3, pile.length));
      };

      const recyclePile = (pile: unknown[], discard: unknown[]) => {
        if (pile.length > 0 || discard.length === 0) return pile;
        return [...discard];
      };

      const playerHand = battle.playerHand || [];
      const selectedCardIds = battle.selectedCardIds || [];

      const selectedCards =
        selectedCardIds.length > 0
          ? playerHand.filter((card: { instanceId?: string; id?: string }) =>
              selectedCardIds.includes(card.instanceId ?? card.id)
            )
          : playerHand;

      const enemyHand = battle.enemyHand || [];
      const enemyDrawPile = battle.enemyDrawPile || [];
      const enemyDiscardPile = battle.enemyDiscardPile || [];

      const enemyCards =
        enemyHand.length > 0
          ? enemyHand
          : drawFromPile(
              enemyDrawPile.length ? enemyDrawPile : recyclePile(enemyDrawPile, enemyDiscardPile)
            );

      const remainingPlayerHand = playerHand.filter(
        (card: { instanceId?: string }) =>
          !selectedCards.some(
            (chosen: { instanceId?: string }) => chosen.instanceId === card.instanceId
          )
      );

      const playerDiscardPile = battle.playerDiscardPile || [];
      const playerDiscard = [...playerDiscardPile, ...selectedCards];
      const enemyDiscard = [...enemyDiscardPile, ...enemyCards];

      let newPlayerHand: unknown[];
      let nextPlayerDraw: unknown[];

      if (battle.hasCharacterBuild && battle.characterBuild) {
        newPlayerHand = drawCharacterBuildHand(
          battle.characterBuild.mainSpecials,
          battle.characterBuild.subSpecials,
          battle.characterBuild.ownedCards
        );
        nextPlayerDraw = [];
      } else {
        const playerDrawPile = battle.playerDrawPile || [];
        nextPlayerDraw = playerDrawPile.filter(
          (card: { instanceId?: string }) =>
            !selectedCards.some(
              (chosen: { instanceId?: string }) => chosen.instanceId === card.instanceId
            )
        );
        if (nextPlayerDraw.length < 3) {
          nextPlayerDraw = recyclePile(nextPlayerDraw, playerDiscard);
        }
        newPlayerHand = remainingPlayerHand.length
          ? remainingPlayerHand
          : drawFromPile(nextPlayerDraw);
      }

      let nextEnemyDraw = enemyDrawPile.filter(
        (card: { instanceId?: string }) =>
          !enemyCards.some(
            (chosen: { instanceId?: string }) => chosen.instanceId === card.instanceId
          )
      );
      if (nextEnemyDraw.length < 3) {
        nextEnemyDraw = recyclePile(nextEnemyDraw, enemyDiscard);
      }
      const newEnemyHand = drawFromPile(nextEnemyDraw);

      const { preview, simulation } = computeBattlePlan(
        battle.kind as string,
        selectedCards,
        enemyCards,
        state.playerHp,
        state.maxHp
      );

      return {
        ...state,
        activeBattle: {
          ...battle,
          preview,
          simulation,
          playerHand: newPlayerHand,
          enemyHand: newEnemyHand,
          playerDrawPile: nextPlayerDraw,
          playerDiscardPile: playerDiscard,
          enemyDrawPile: nextEnemyDraw,
          enemyDiscardPile: enemyDiscard,
          selectedCardIds: [],
        },
      };
    }),

  clearPendingItemEffects: () =>
    set((state) => {
      if (!state.activeBattle) return state;
      const battle = { ...state.activeBattle };
      battle.pendingItemEffects = [];
      return { ...state, activeBattle: battle };
    }),
});
