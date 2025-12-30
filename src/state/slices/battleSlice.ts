/**
 * @file battleSlice.ts
 * @description 전투 시스템 액션 슬라이스
 *
 * 초기 상태는 gameStore.ts의 createInitialState()에서 제공됩니다.
 */

import type { StateCreator } from 'zustand';
import type { GameStore, BattleSliceActions, BattleCard } from './types';
import type { ResolverTimelineEntry, ResolverSimulationResult } from '../../types';
import { ENEMIES, getRandomEnemy } from '../../components/battle/battleData';
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

export type BattleActionsSlice = BattleSliceActions;

type SliceCreator = StateCreator<GameStore, [], [], BattleActionsSlice>;

export const createBattleActions: SliceCreator = (set) => ({
  startBattle: (battleConfig = {}) =>
    set((state) => {
      const characterBuild = state.characterBuild;
      const hasCharacterBuild = characterBuild && (
        characterBuild.mainSpecials?.length > 0 ||
        characterBuild.subSpecials?.length > 0 ||
        (characterBuild.ownedCards?.length ?? 0) > 0
      );

      const playerLibrary = hasCharacterBuild
        ? [...characterBuild.mainSpecials, ...characterBuild.subSpecials]
        : [...BATTLE_CARDS];

      let enemy: typeof ENEMIES[number] | null = null;
      let enemyDeck: string[] = [];

      if (battleConfig.enemyId) {
        enemy = ENEMIES.find((e) => e.id === battleConfig.enemyId) || null;
      } else if (battleConfig.tier) {
        enemy = getRandomEnemy(battleConfig.tier as number) || null;
      }

      if (enemy) {
        enemyDeck = enemy?.deck || [];
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
      const preview = { playerHand, enemyHand, timeline, tuLimit: 30 };

      const enemyInfo = enemy
        ? { id: enemy.id, name: enemy.name, emoji: enemy.emoji, tier: enemy.tier, isBoss: enemy.isBoss || false }
        : null;

      return {
        ...state,
        activeBattle: {
          nodeId: (battleConfig.nodeId as string) || 'dungeon-combat',
          kind: (battleConfig.kind as string) || 'combat',
          label: (battleConfig.label as string) || enemy?.name || '던전 몬스터',
          rewards: battleConfig.rewards || { gold: { min: 5 + (enemy?.tier || 1) * 3, max: 10 + (enemy?.tier || 1) * 5 }, loot: 1 },
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
        } as unknown as GameStore['activeBattle'],
      } as Partial<GameStore>;
    }),

  resolveBattle: (outcome = {}) =>
    set((state) => {
      if (!state.activeBattle) return state;
      const rewardsDef = state.activeBattle.rewards ?? {};
      const autoResult = pickOutcome(state.activeBattle.simulation as unknown as ResolverSimulationResult | null, 'victory');
      const resultLabel = outcome.result ?? autoResult;
      const rewards = resultLabel === 'victory'
        ? grantRewards(rewardsDef as Parameters<typeof grantRewards>[0], state.resources)
        : { next: state.resources, applied: {} };

      if (resultLabel === 'victory') {
        const enemyInfo = state.activeBattle.enemyInfo;
        const statsUpdate: Record<string, number> = {
          totalKills: 1,
          totalDamageDealt: outcome.damageDealt || 0,
        };
        if (enemyInfo?.isBoss || state.activeBattle.kind === 'boss') {
          statsUpdate.bossKills = 1;
        }
        updateStats(statsUpdate);
      }

      let finalPlayerHp = outcome.playerHp ?? state.activeBattle.simulation?.finalPHp ?? state.playerHp;
      let newMaxHp = outcome.playerMaxHp ?? state.maxHp;

      try {
        const combatEndEffects = applyCombatEndEffects(state.relics || [], { playerHp: finalPlayerHp, maxHp: state.maxHp });
        const healed = combatEndEffects.heal || 0;
        const maxHpGain = combatEndEffects.maxHp || 0;
        newMaxHp = state.maxHp + maxHpGain;
        finalPlayerHp = Math.min(newMaxHp, finalPlayerHp + healed + maxHpGain);
      } catch (error) {
        if (import.meta.env.DEV) console.error('Error applying combat end effects:', error);
      }

      return {
        ...state,
        resources: rewards.next as GameStore['resources'],
        playerHp: Math.max(0, finalPlayerHp),
        maxHp: newMaxHp,
        activeBattle: null,
        lastBattleResult: {
          nodeId: state.activeBattle.nodeId || '',
          kind: state.activeBattle.kind || '',
          label: state.activeBattle.label || '',
          result: resultLabel as 'victory' | 'defeat',
          log: state.activeBattle.simulation?.lines ?? [],
          finalState: { player: { hp: finalPlayerHp } },
          initialState: null,
          rewards: rewards.applied,
          enemyInfo: state.activeBattle.enemyInfo,
        },
      } as Partial<GameStore>;
    }),

  clearBattleResult: () =>
    set((state) => (state.lastBattleResult ? { ...state, lastBattleResult: null } : state)),

  toggleBattleCard: (cardId) =>
    set((state) => {
      const battle = state.activeBattle;
      if (!battle || !battle.playerHand) return state;
      const inHand = battle.playerHand.some((card) => card.instanceId === cardId || card.id === cardId);
      if (!inHand) return state;
      const idKey = battle.playerHand.find((card) => card.instanceId === cardId)?.instanceId ?? cardId;
      const selectedCardIds = battle.selectedCardIds || [];
      const isSelected = selectedCardIds.includes(idKey);
      let nextSelected = selectedCardIds;
      if (isSelected) {
        nextSelected = selectedCardIds.filter((id) => id !== idKey);
      } else if (selectedCardIds.length < (battle.maxSelection ?? MAX_PLAYER_SELECTION)) {
        nextSelected = [...selectedCardIds, idKey];
      } else {
        return state;
      }
      return { ...state, activeBattle: { ...battle, selectedCardIds: nextSelected } };
    }),

  commitBattlePlan: () =>
    set((state) => {
      const battle = state.activeBattle;
      if (!battle) return state;

      const drawFromPile = (pile: BattleCard[]) => (!pile.length ? [] : drawHand(pile.map(c => c.id), Math.min(3, pile.length)));
      const recyclePile = (pile: BattleCard[], discard: BattleCard[]) => (pile.length > 0 || discard.length === 0 ? pile : [...discard]);

      const playerHand = battle.playerHand || [];
      const selectedCardIds = battle.selectedCardIds || [];
      const selectedCards = selectedCardIds.length > 0
        ? playerHand.filter((card) => selectedCardIds.includes(card.instanceId ?? card.id))
        : playerHand;

      const enemyHand = battle.enemyHand || [];
      const enemyDrawPile = battle.enemyDrawPile || [];
      const enemyDiscardPile = battle.enemyDiscardPile || [];
      const enemyCards = enemyHand.length > 0 ? enemyHand : drawFromPile(enemyDrawPile.length ? enemyDrawPile : recyclePile(enemyDrawPile, enemyDiscardPile));

      const remainingPlayerHand = playerHand.filter((card) => !selectedCards.some((chosen) => chosen.instanceId === card.instanceId));

      const playerDiscardPile = battle.playerDiscardPile || [];
      const playerDiscard = [...playerDiscardPile, ...selectedCards];
      const enemyDiscard = [...enemyDiscardPile, ...enemyCards];

      let newPlayerHand: BattleCard[];
      let nextPlayerDraw: BattleCard[];

      if (battle.hasCharacterBuild && battle.characterBuild) {
        newPlayerHand = drawCharacterBuildHand(battle.characterBuild.mainSpecials, battle.characterBuild.subSpecials, battle.characterBuild.ownedCards);
        nextPlayerDraw = [];
      } else {
        const playerDrawPile = battle.playerDrawPile || [];
        nextPlayerDraw = playerDrawPile.filter((card) => !selectedCards.some((chosen) => chosen.instanceId === card.instanceId));
        if (nextPlayerDraw.length < 3) nextPlayerDraw = recyclePile(nextPlayerDraw, playerDiscard);
        newPlayerHand = remainingPlayerHand.length ? remainingPlayerHand : drawFromPile(nextPlayerDraw);
      }

      let nextEnemyDraw = enemyDrawPile.filter((card) => !enemyCards.some((chosen) => chosen.instanceId === card.instanceId));
      if (nextEnemyDraw.length < 3) nextEnemyDraw = recyclePile(nextEnemyDraw, enemyDiscard);
      const newEnemyHand = drawFromPile(nextEnemyDraw);

      const { preview, simulation } = computeBattlePlan(battle.kind || '', selectedCards as Parameters<typeof computeBattlePlan>[1], enemyCards as Parameters<typeof computeBattlePlan>[2], state.playerHp, state.maxHp);

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
        } as unknown as GameStore['activeBattle'],
      } as Partial<GameStore>;
    }),

  clearPendingItemEffects: () =>
    set((state) => {
      if (!state.activeBattle) return state;
      return { ...state, activeBattle: { ...state.activeBattle, pendingItemEffects: [] } };
    }),
});

// 하위 호환성
export const createBattleSlice = createBattleActions;
export type BattleSlice = BattleActionsSlice;
