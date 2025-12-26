/**
 * @file devSlice.ts
 * @description 개발자 도구 액션 슬라이스
 *
 * 초기 상태는 gameStore.ts의 createInitialState()에서 제공됩니다.
 */

import type { StateCreator } from 'zustand';
import type { GameStore, DevSliceActions } from './types';
import type { ResolverTimelineEntry } from '../../types';
import { ENEMIES, ENEMY_GROUPS, CARDS } from '../../components/battle/battleData';
import { drawHand, buildSpeedTimeline } from '../../lib/speedQueue';
import { simulateBattle } from '../../lib/battleResolver';
import { NEW_EVENT_LIBRARY } from '../../data/newEvents';
import { cloneNodes, grantRewards, computeFriendlyChance } from '../gameStoreHelpers';
import { travelToNode, drawCharacterBuildHand } from '../battleHelpers';

export type DevActionsSlice = DevSliceActions;

type SliceCreator = StateCreator<GameStore, [], [], DevActionsSlice>;

export const createDevActions: SliceCreator = (set) => ({
  setDevDulledLevel: (level) =>
    set((state) => ({
      ...state,
      devDulledLevel: level === null || level === undefined ? null : Math.max(0, Math.min(3, Number(level) || 0)),
    })),

  setDevForcedCrossroad: (templateId) =>
    set((state) => ({ ...state, devForcedCrossroad: templateId || null })),

  setResources: (newResources) =>
    set((state) => ({ ...state, resources: { ...state.resources, ...newResources } })),

  devClearAllNodes: () =>
    set((state) => {
      const updatedNodes = cloneNodes(state.map.nodes).map((node) => ({
        ...node,
        cleared: true,
        selectable: true,
      }));
      return { ...state, map: { ...state.map, nodes: updatedNodes } };
    }),

  devTeleportToNode: (nodeId) =>
    set((state) => {
      const nodes = state.map?.nodes;
      if (!nodes) return state;

      const targetNode = nodes.find((n) => n.id === nodeId);
      if (!targetNode) return state;

      if (targetNode.type === 'dungeon') {
        return { ...state, activeDungeon: { nodeId: targetNode.id, revealed: false, confirmed: false } };
      }
      if (targetNode.type === 'shop') {
        return { ...state, map: { ...state.map, currentNodeId: nodeId }, activeShop: { nodeId: targetNode.id, merchantType: 'shop' } };
      }
      if (targetNode.type === 'rest') {
        return { ...state, map: { ...state.map, currentNodeId: nodeId }, activeRest: { nodeId: targetNode.id } };
      }

      const tempState = {
        ...state,
        map: { ...state.map, nodes: state.map.nodes.map((n) => (n.id === nodeId ? { ...n, selectable: true, cleared: false } : n)) },
      };

      const result = travelToNode(tempState, nodeId);
      if (!result) return { ...state, map: { ...state.map, currentNodeId: nodeId } };

      return {
        ...state,
        map: result.map,
        activeEvent: result.event,
        activeBattle: result.battle as unknown as GameStore['activeBattle'],
        pendingNextEvent: result.usedPendingEvent ? null : state.pendingNextEvent,
      } as Partial<GameStore>;
    }),

  devForceWin: () =>
    set((state) => {
      if (!state.activeBattle) return state;
      const rewardsDef = state.activeBattle.rewards ?? {};
      const rewards = grantRewards(rewardsDef as Parameters<typeof grantRewards>[0], state.resources);
      return {
        ...state,
        resources: rewards.next as GameStore['resources'],
        activeBattle: null,
        lastBattleResult: {
          nodeId: state.activeBattle.nodeId || '',
          kind: state.activeBattle.kind || '',
          label: state.activeBattle.label || '',
          result: 'victory',
          log: ['[DEV] 강제 승리'],
          finalState: null,
          initialState: null,
          rewards: rewards.applied,
        },
      } as Partial<GameStore>;
    }),

  devForceLose: () =>
    set((state) => {
      if (!state.activeBattle) return state;
      return {
        ...state,
        activeBattle: null,
        lastBattleResult: {
          nodeId: state.activeBattle.nodeId || '',
          kind: state.activeBattle.kind || '',
          label: state.activeBattle.label || '',
          result: 'defeat',
          log: ['[DEV] 강제 패배'],
          finalState: null,
          initialState: null,
          rewards: {},
        },
      };
    }),

  devAddBattleToken: (tokenId, stacks = 1, target = 'player') =>
    set((state) => ({
      ...state,
      devBattleTokens: [...state.devBattleTokens, { id: tokenId, stacks, target, timestamp: Date.now() }],
    })),

  devClearBattleTokens: () =>
    set((state) => ({ ...state, devBattleTokens: [] })),

  devStartBattle: (groupId) =>
    set((state) => {
      if (state.activeBattle) return state;

      const group = ENEMY_GROUPS.find((g) => g.id === groupId);
      if (!group) {
        console.warn(`[DEV] 전투 그룹을 찾을 수 없음: ${groupId}`);
        return state;
      }

      const primaryEnemyId = group.enemies[0];
      const primaryEnemy = ENEMIES.find((e) => e.id === primaryEnemyId);

      const totalEnemyHp = group.enemies.reduce((sum, enemyId) => {
        const enemy = ENEMIES.find((e) => e.id === enemyId);
        return sum + (enemy?.hp || 30);
      }, 0);

      const combinedDeck = group.enemies.flatMap((enemyId) => {
        const enemy = ENEMIES.find((e) => e.id === enemyId);
        return enemy?.deck || [];
      });

      const characterBuild = state.characterBuild;
      const hasCharacterBuild = characterBuild && (characterBuild.mainSpecials?.length > 0 || characterBuild.subSpecials?.length > 0 || characterBuild.ownedCards?.length > 0);

      const playerLibrary: string[] = hasCharacterBuild
        ? [...(characterBuild.mainSpecials || []), ...(characterBuild.subSpecials || [])]
        : CARDS.map(c => c.id);

      const playerDrawPile: string[] = hasCharacterBuild ? [] : [...playerLibrary];
      const enemyDrawPile: string[] = [...combinedDeck];

      const playerHand = hasCharacterBuild
        ? drawCharacterBuildHand(characterBuild.mainSpecials, characterBuild.subSpecials, characterBuild.ownedCards)
        : drawHand(playerDrawPile, 3);

      const enemyHand = drawHand(enemyDrawPile, Math.min(3, enemyDrawPile.length));

      const battleStats = {
        player: { hp: state.playerHp, maxHp: state.maxHp, block: 0 },
        enemy: { hp: totalEnemyHp, maxHp: totalEnemyHp, block: 0 },
      };

      const timeline = buildSpeedTimeline(playerHand, enemyHand, 30);
      const simulation = simulateBattle(timeline as unknown as ResolverTimelineEntry[], battleStats);

      const enemyUnits = group.enemies.map((enemyId, idx) => {
        const enemy = ENEMIES.find((e) => e.id === enemyId);
        return {
          unitId: idx,
          id: enemyId,
          name: enemy?.name || enemyId,
          emoji: enemy?.emoji || '👾',
          hp: enemy?.hp || 30,
          maxHp: enemy?.hp || 30,
          ether: enemy?.ether || 100,
          deck: enemy?.deck || [],
          cardsPerTurn: enemy?.cardsPerTurn || 1,
          tier: enemy?.tier || 1,
          passives: enemy?.passives || {},
        };
      });

      return {
        ...state,
        activeBattle: {
          nodeId: `dev-battle-${groupId}`,
          kind: 'combat',
          label: group.name,
          rewards: { gold: { min: 10, max: 20 }, loot: 1 },
          difficulty: group.tier,
          preview: { playerHand, enemyHand, timeline, tuLimit: 30 },
          enemyInfo: {
            id: primaryEnemyId,
            name: group.name,
            emoji: primaryEnemy?.emoji || '👾',
            tier: group.tier,
            isBoss: primaryEnemy?.isBoss || false,
          },
        },
      };
    }),

  devOpenRest: () =>
    set((state) => ({ ...state, activeRest: { nodeId: 'DEV-REST' } })),

  devTriggerEvent: (eventId) =>
    set((state) => {
      const definition = NEW_EVENT_LIBRARY[eventId];
      if (!definition) {
        console.warn(`[devTriggerEvent] Event not found: ${eventId}`);
        return state;
      }
      return {
        ...state,
        activeEvent: {
          id: definition.id,
          definition,
          currentStage: null,
          resolved: false,
          outcome: null,
          risk: state.mapRisk,
          friendlyChance: computeFriendlyChance(state.mapRisk),
        },
      } as Partial<GameStore>;
    }),
});

// 하위 호환성
export const createDevSlice = createDevActions;
export type DevSlice = DevActionsSlice;
