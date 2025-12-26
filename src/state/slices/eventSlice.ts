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
import { canAfford, payCost, grantRewards, resolveAmount } from '../gameStoreHelpers';

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
        const result = grantRewards(choice.rewards, resources);
        resources = result.next;
        rewards = result.applied;

        if (choice.rewards.card && choice.rewards.card > 0) {
          const cardCount = resolveAmount(choice.rewards.card);
          const availableCards = CARDS.filter((c) => !newOwnedCards.includes(c.id));
          for (let i = 0; i < cardCount && availableCards.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * availableCards.length);
            const selectedCard = availableCards.splice(randomIndex, 1)[0];
            newOwnedCards.push(selectedCard.id);
          }
        }
      }

      const updatedCharacterBuild = { ...state.characterBuild, ownedCards: newOwnedCards };

      if (choice.nextStage && active.definition?.stages?.[choice.nextStage]) {
        return {
          ...state,
          resources,
          playerHp: newPlayerHp,
          characterBuild: updatedCharacterBuild,
          activeEvent: { ...active, currentStage: choice.nextStage },
        };
      }

      if (choice.openShop) {
        return {
          ...state,
          resources,
          playerHp: newPlayerHp,
          characterBuild: updatedCharacterBuild,
          activeShop: { merchantType: choice.openShop },
          activeEvent: {
            ...active,
            resolved: true,
            outcome: { choice: choice.label, success: true, resultDescription: choice.resultDescription || null },
          },
        };
      }

      const eventId = active.definition?.id;
      const newCompletedEvents = eventId && !state.completedEvents?.includes(eventId)
        ? [...(state.completedEvents || []), eventId]
        : state.completedEvents || [];

      const pendingNextEvent = choice.nextEvent && NEW_EVENT_LIBRARY[choice.nextEvent]
        ? choice.nextEvent
        : state.pendingNextEvent;

      return {
        ...state,
        resources,
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
          },
        },
      };
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
        resources: result.next,
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
      };
    }),

  closeEvent: () =>
    set((state) => (state.activeEvent ? { ...state, activeEvent: null } : state)),

  setActiveEvent: (event: ActiveEvent | null) =>
    set((state) => ({ ...state, activeEvent: event })),
});

// 하위 호환성
export const createEventSlice = createEventActions;
export type EventSlice = EventActionsSlice;
