/**
 * @file eventSlice.ts
 * @description 이벤트 시스템 액션 슬라이스
 *
 * 초기 상태는 gameStore.ts의 createInitialState()에서 제공됩니다.
 */

import type { StateCreator } from 'zustand';
import type { GameStore, EventSliceActions } from './types';
import type { ActiveEvent } from '../../types';
import { NEW_EVENT_LIBRARY } from '../../data/newEvents';
import { CARDS } from '../../components/battle/battleData';
import { canAfford, payCost, grantRewards, resolveAmount, extractResourceDelta } from '../gameStoreHelpers';
import { recordEventChoice, recordEventOccurrence } from '../../simulator/bridge/stats-bridge';

export type EventActionsSlice = EventSliceActions;

type SliceCreator = StateCreator<GameStore, [], [], EventActionsSlice>;

export const createEventActions: SliceCreator = (set) => ({
  chooseEvent: (choiceId) =>
    set((state) => {
      const active = state.activeEvent;
      if (!active || active.resolved) return state;

      const currentStage = active.currentStage;
      const stageData = currentStage && active.definition?.stages?.[currentStage];
      const choices = stageData ? stageData.choices : active.definition?.choices;

      const choice = choices?.find((item: { id: string }) => item.id === choiceId);
      if (!choice || !canAfford(state.resources, choice.cost || {})) return state;

      if (choice.statRequirement) {
        const playerStats: Record<string, number> = {
          insight: state.playerInsight || 0,
          strength: state.playerStrength || 0,
          agility: state.playerAgility || 0,
        };
        const meetsRequirements = Object.entries(choice.statRequirement).every(
          ([stat, required]) => (playerStats[stat] ?? 0) >= (required as number)
        );
        if (!meetsRequirements) return state;
      }

      let resources = payCost(choice.cost || {}, state.resources);
      let newPlayerHp = state.playerHp;
      if (choice.cost?.hp) newPlayerHp = Math.max(1, newPlayerHp - choice.cost.hp);
      if (choice.cost?.hpPercent) {
        const hpCost = Math.floor(state.maxHp * (choice.cost.hpPercent / 100));
        newPlayerHp = Math.max(1, newPlayerHp - hpCost);
      }

      let rewards = {};
      let newOwnedCards = [...(state.characterBuild?.ownedCards || [])];

      if (choice.rewards) {
        const resourceDelta = extractResourceDelta(choice.rewards);
        const result = grantRewards(resourceDelta, resources);
        resources = result.next;
        rewards = result.applied;

        if (choice.rewards.card) {
          const cardReward = choice.rewards.card;
          if (typeof cardReward === 'number' && cardReward > 0) {
            const cardCount = resolveAmount(cardReward);
            const availableCards = CARDS.filter((c) => !newOwnedCards.includes(c.id));
            for (let i = 0; i < cardCount && availableCards.length > 0; i++) {
              const randomIndex = Math.floor(Math.random() * availableCards.length);
              const selectedCard = availableCards.splice(randomIndex, 1)[0];
              newOwnedCards.push(selectedCard.id);
            }
          } else if (typeof cardReward === 'string') {
            newOwnedCards.push(cardReward);
          }
        }
      }

      const updatedCharacterBuild = { ...state.characterBuild, ownedCards: newOwnedCards };

      if (choice.nextStage && active.definition?.stages?.[choice.nextStage]) {
        return {
          ...state,
          resources: resources as GameStore['resources'],
          playerHp: newPlayerHp,
          characterBuild: updatedCharacterBuild,
          activeEvent: { ...active, currentStage: choice.nextStage },
        } as Partial<GameStore>;
      }

      if (choice.openShop) {
        return {
          ...state,
          resources: resources as GameStore['resources'],
          playerHp: newPlayerHp,
          characterBuild: updatedCharacterBuild,
          activeShop: { merchantType: choice.openShop },
          activeEvent: {
            ...active,
            resolved: true,
            outcome: { choice: choice.label, success: true, resultDescription: choice.resultDescription || null },
          },
        } as Partial<GameStore>;
      }

      const eventId = active.definition?.id;
      const newCompletedEvents = eventId && !state.completedEvents?.includes(eventId)
        ? [...(state.completedEvents || []), eventId]
        : state.completedEvents || [];

      const pendingNextEvent = choice.nextEvent && NEW_EVENT_LIBRARY[choice.nextEvent]
        ? choice.nextEvent
        : state.pendingNextEvent;

      // 통계 기록: 이벤트 선택
      if (eventId) {
        const hpChange = newPlayerHp - state.playerHp;
        const goldChange = (resources.gold ?? 0) - (state.resources.gold ?? 0);
        const cardsGained = newOwnedCards.filter(c => !(state.characterBuild?.ownedCards || []).includes(c));
        recordEventChoice(eventId, choiceId, {
          success: true,
          hpChange,
          goldChange,
          cardsGained,
        });
      }

      return {
        ...state,
        resources: resources as GameStore['resources'],
        playerHp: newPlayerHp,
        characterBuild: updatedCharacterBuild,
        completedEvents: newCompletedEvents,
        pendingNextEvent,
        activeEvent: {
          ...active,
          resolved: true,
          outcome: {
            choice: choice.label,
            success: true,
            cost: choice.cost || {},
            rewards,
            resultDescription: choice.resultDescription || null,
            // 전투 트리거 정보 추가
            combatTrigger: choice.combatTrigger || false,
            combatRewards: choice.combatRewards,
            combatModifier: choice.combatModifier,
            combatId: choice.combatId,
          },
        },
      } as Partial<GameStore>;
    }),

  invokePrayer: (cost) =>
    set((state) => {
      const active = state.activeEvent;
      if (!active || active.resolved) return state;
      if ((state.resources.etherPts ?? 0) < cost) return state;

      const afterCost = payCost({ etherPts: cost }, state.resources);
      const result = grantRewards({ intel: Math.max(1, Math.ceil(cost / 2)) }, afterCost);

      return {
        ...state,
        resources: result.next as GameStore['resources'],
        activeEvent: {
          ...active,
          resolved: true,
          outcome: {
            choice: `기도 x${cost}`,
            success: true,
            text: '기도로 정보를 얻었습니다.',
            cost: { etherPts: cost },
            rewards: result.applied,
            penalty: {},
            probability: 1,
          },
        },
      } as Partial<GameStore>;
    }),

  closeEvent: () =>
    set((state) => (state.activeEvent ? { ...state, activeEvent: null } : state)),

  setActiveEvent: (event: ActiveEvent | null) =>
    set((state) => {
      // 이벤트가 새로 시작될 때만 통계 기록
      if (event && !state.activeEvent) {
        const eventId = event.definition?.id || event.eventId || 'unknown';
        const eventName = event.definition?.name || '알 수 없는 이벤트';
        recordEventOccurrence(eventId, eventName);
      }
      return { ...state, activeEvent: event };
    }),
});

// 하위 호환성
export const createEventSlice = createEventActions;
export type EventSlice = EventActionsSlice;
