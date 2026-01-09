/**
 * @file battleSlice.ts
 * @description 전투 시스템 액션 슬라이스
 *
 * 초기 상태는 gameStore.ts의 createInitialState()에서 제공됩니다.
 */

import type { StateCreator } from 'zustand';
import type { GameStore, BattleSliceActions, BattleCard, BattleRewards, MapLogEntry, MapLogType } from './types';
import { ENEMIES, getRandomEnemy } from '../../components/battle/battleData';
import { drawHand, buildSpeedTimeline } from '../../lib/speedQueue';
import { simulateBattle, pickOutcome } from '../../lib/battleResolver';
import { applyCombatEndEffects } from '../../lib/relicEffects';
import { updateStats } from '../metaProgress';
import { recordGameBattle, recordRunEnd, recordRelicAcquired } from '../../simulator/bridge/stats-bridge';
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
import { CARD_LIBRARY } from '../../data/cards';
import { getRandomRelicReward } from '../../data/shop';

export type BattleActionsSlice = BattleSliceActions;

type SliceCreator = StateCreator<GameStore, [], [], BattleActionsSlice>;

/** Convert card IDs to BattleCard objects */
const toBattleCards = (cardIds: string[]): BattleCard[] =>
  cardIds.map(id => CARD_LIBRARY[id]).filter(Boolean);

/** 로그 ID 카운터 */
let battleLogIdCounter = 0;

/** 로그 항목 생성 헬퍼 */
const createLogEntry = (
  type: MapLogType,
  message: string,
  details?: string,
  icon?: string
): MapLogEntry => ({
  id: `battle_log_${Date.now()}_${battleLogIdCounter++}`,
  timestamp: Date.now(),
  type,
  message,
  details,
  icon,
});

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
        enemy = getRandomEnemy(battleConfig.tier) || null;
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
      const enemyHp = battleConfig.enemyHp ?? enemy?.hp ?? 30;

      const battleStats = {
        player: { hp: state.playerHp, maxHp: state.maxHp, block: 0 },
        enemy: { hp: enemyHp, maxHp: enemyHp, block: 0 },
      };

      const timeline = buildSpeedTimeline(playerHand, enemyHand, 30);
      const simulation = simulateBattle(timeline, battleStats);
      const preview = { playerHand, enemyHand, timeline, tuLimit: 30 };

      const enemyInfo = enemy
        ? {
            id: enemy.id,
            name: enemy.name,
            emoji: enemy.emoji,
            tier: enemy.tier,
            isBoss: enemy.isBoss || false,
            // 그룹 정보 (battleConfig에서 전달받은 경우)
            groupId: battleConfig.groupId,
            groupName: battleConfig.groupName,
            enemyCount: battleConfig.enemyCount,
            composition: battleConfig.composition,
          }
        : battleConfig.groupId
          ? {
              // 적 정보 없이 그룹 정보만 있는 경우
              id: battleConfig.enemyId,
              name: battleConfig.groupName ?? battleConfig.label ?? 'Unknown',
              tier: battleConfig.tier,
              isBoss: false,
              groupId: battleConfig.groupId,
              groupName: battleConfig.groupName,
              enemyCount: battleConfig.enemyCount,
              composition: battleConfig.composition,
            }
          : undefined;

      // Convert ResolverSimulationResult to SimulationResult format
      const simulationResult = simulation ? {
        pDealt: 0,
        pTaken: 0,
        finalPHp: simulation.finalState.player.hp,
        finalEHp: simulation.finalState.enemy.hp,
        lines: simulation.log.map(entry => `${entry.actor}: ${entry.name || entry.cardId}`),
        winner: simulation.winner,
      } : undefined;

      const activeBattle: GameStore['activeBattle'] = {
        nodeId: battleConfig.nodeId ?? 'dungeon-combat',
        kind: battleConfig.kind ?? 'combat',
        label: battleConfig.label ?? enemy?.name ?? '던전 몬스터',
        rewards: battleConfig.rewards ?? { gold: { min: 5 + (enemy?.tier || 1) * 3, max: 10 + (enemy?.tier || 1) * 5 }, loot: 1 },
        difficulty: enemy?.tier || 2,
        enemyInfo,
        playerLibrary: toBattleCards(playerLibrary),
        playerDrawPile: toBattleCards(playerDrawPile),
        playerDiscardPile: [],
        enemyLibrary: toBattleCards(enemyLibrary),
        enemyDrawPile: toBattleCards(enemyDrawPile),
        enemyDiscardPile: [],
        playerHand,
        enemyHand,
        selectedCardIds: [],
        maxSelection: MAX_PLAYER_SELECTION,
        preview,
        simulation: simulationResult,
        hasCharacterBuild,
        characterBuild: hasCharacterBuild ? characterBuild : null,
      };
      return { ...state, activeBattle };
    }),

  resolveBattle: (outcome = {}) =>
    set((state) => {
      if (!state.activeBattle) return state;
      const rewardsDef = state.activeBattle.rewards ?? {};
      const autoResult = pickOutcome(state.activeBattle.simulation ?? null, 'victory');
      const resultLabel = outcome.result ?? autoResult;
      const rewards = resultLabel === 'victory'
        ? grantRewards(rewardsDef as Parameters<typeof grantRewards>[0], state.resources)
        : { next: state.resources, applied: {} };

      // 상징 보상 처리 (정예 전투 등)
      let newRelics = state.relics || [];
      let rewardedRelicId: string | null = null;
      if (resultLabel === 'victory' && rewardsDef.relic && rewardsDef.relic > 0) {
        const isElite = state.activeBattle.kind === 'elite';
        rewardedRelicId = getRandomRelicReward(state.relics || [], isElite);
        if (rewardedRelicId && !newRelics.includes(rewardedRelicId)) {
          newRelics = [...newRelics, rewardedRelicId];
          // 상징 획득 통계 기록
          const battleSource = state.activeBattle.kind === 'boss' ? 'boss' : 'battle';
          recordRelicAcquired(rewardedRelicId, {
            floor: state.currentLayer,
            source: battleSource,
          });
        }
      }

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

      // 시뮬레이터 통계 시스템에 전투 결과 기록
      try {
        const enemyInfo = state.activeBattle.enemyInfo;
        const battleLog = state.activeBattle.simulation?.lines ?? [];

        // HP 차이로 피해량 계산 (시뮬레이터 방식)
        const initialPlayerHp = state.playerHp; // 전투 시작 시 플레이어 HP
        const totalEnemyHp = state.activeBattle.totalEnemyHp || 0; // 적 총 HP

        // 플레이어가 가한 피해 = 적 초기 HP - 적 최종 HP (승리 시 0)
        const calculatedDamageDealt = resultLabel === 'victory'
          ? totalEnemyHp
          : Math.max(0, totalEnemyHp - (outcome.enemyRemainingHp || totalEnemyHp));

        // 플레이어가 받은 피해 = 초기 HP - 최종 HP
        const calculatedDamageTaken = Math.max(0, initialPlayerHp - finalPlayerHp);

        recordGameBattle(
          {
            result: resultLabel as 'victory' | 'defeat',
            playerHp: finalPlayerHp,
            deltaEther: 0,
            isEtherVictory: outcome.isEtherVictory,
          },
          {
            nodeId: state.activeBattle.nodeId,
            kind: state.activeBattle.kind,
            damageDealt: outcome.damageDealt || calculatedDamageDealt,
            damageTaken: outcome.damageTaken || calculatedDamageTaken,
            battleLog,
            isEtherVictory: outcome.isEtherVictory,
            // P1: 새 통계 필드 추가
            enemyFinalHp: resultLabel === 'victory' ? 0 : (outcome.enemyRemainingHp ?? totalEnemyHp),
            enemyMaxHp: totalEnemyHp,
            floor: state.map?.baseLayer,
          },
          {
            id: enemyInfo?.id,
            name: enemyInfo?.name || state.activeBattle.label || 'Unknown',
            tier: enemyInfo?.tier,
            isBoss: enemyInfo?.isBoss,
            emoji: enemyInfo?.emoji,
            // 그룹 정보 전달
            groupId: enemyInfo?.groupId,
            groupName: enemyInfo?.groupName,
            enemyCount: enemyInfo?.enemyCount,
            composition: enemyInfo?.composition,
          },
          {
            hp: finalPlayerHp,
            maxHp: newMaxHp,
            deck: state.activeBattle.playerLibrary?.map(c => c.id) || [],
            relics: state.relics || [],
          }
        );

        // 패배 시 런 종료 기록
        if (resultLabel === 'defeat' && finalPlayerHp <= 0) {
          const currentFloor = state.map?.baseLayer ?? 1;
          recordRunEnd(
            false,
            currentFloor,
            state.activeBattle.playerLibrary?.map(c => c.id) || [],
            state.relics || []
          );
        }

        // 보스 승리 시 런 종료 기록
        if (resultLabel === 'victory' && (enemyInfo?.isBoss || state.activeBattle.kind === 'boss')) {
          const currentFloor = state.map?.baseLayer ?? 11;
          recordRunEnd(
            true,
            currentFloor,
            state.activeBattle.playerLibrary?.map(c => c.id) || [],
            state.relics || []
          );
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error('[StatsBridge] Error recording battle:', error);
      }

      // 보상에 상징 ID 추가 (UI 표시용)
      const appliedRewards = { ...rewards.applied };
      if (rewardedRelicId) {
        appliedRewards.relic = rewardedRelicId;
      }

      // 전투 결과 로그 생성
      const enemyName = state.activeBattle.enemyInfo?.name || state.activeBattle.label || '적';
      const battleKind = state.activeBattle.kind === 'elite' ? '정예' : state.activeBattle.kind === 'boss' ? '보스' : '';
      const resultIcon = resultLabel === 'victory' ? '🏆' : '💀';
      const logMessage = resultLabel === 'victory'
        ? `${battleKind} ${enemyName} 처치!`
        : `${battleKind} ${enemyName}에게 패배...`;

      // 보상 상세 정보
      const rewardDetails: string[] = [];
      if (appliedRewards.gold) rewardDetails.push(`금 +${appliedRewards.gold}`);
      if (appliedRewards.loot) rewardDetails.push(`전리품 +${appliedRewards.loot}`);
      if (appliedRewards.intel) rewardDetails.push(`정보 +${appliedRewards.intel}`);
      if (appliedRewards.memory) rewardDetails.push(`기억 +${appliedRewards.memory}`);
      if (appliedRewards.relic) rewardDetails.push(`상징 획득!`);

      const battleLogEntry = createLogEntry(
        'battle',
        logMessage.trim(),
        rewardDetails.length > 0 ? rewardDetails.join(' · ') : undefined,
        resultIcon
      );

      return {
        ...state,
        resources: rewards.next as GameStore['resources'],
        relics: newRelics,
        playerHp: Math.max(0, finalPlayerHp),
        maxHp: newMaxHp,
        activeBattle: null,
        mapLogs: [battleLogEntry, ...(state.mapLogs || [])].slice(0, 50),
        lastBattleResult: {
          nodeId: state.activeBattle.nodeId || '',
          kind: state.activeBattle.kind || '',
          label: state.activeBattle.label || '',
          result: resultLabel as 'victory' | 'defeat',
          log: state.activeBattle.simulation?.lines ?? [],
          finalState: { player: { hp: finalPlayerHp } },
          initialState: null,
          rewards: appliedRewards,
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

      // Convert ResolverSimulationResult to SimulationResult format
      const simulationResult = simulation ? {
        pDealt: 0,
        pTaken: 0,
        finalPHp: simulation.finalState.player.hp,
        finalEHp: simulation.finalState.enemy.hp,
        lines: simulation.log.map(entry => `${entry.actor}: ${entry.name || entry.cardId}`),
        winner: simulation.winner,
      } : undefined;

      const updatedBattle: GameStore['activeBattle'] = {
        ...battle,
        preview,
        simulation: simulationResult,
        playerHand: newPlayerHand,
        enemyHand: newEnemyHand,
        playerDrawPile: nextPlayerDraw,
        playerDiscardPile: playerDiscard,
        enemyDrawPile: nextEnemyDraw,
        enemyDiscardPile: enemyDiscard,
        selectedCardIds: [],
      };
      return { ...state, activeBattle: updatedBattle };
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
