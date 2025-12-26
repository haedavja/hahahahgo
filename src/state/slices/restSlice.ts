/**
 * @file restSlice.ts
 * @description 휴식/각성 시스템 슬라이스
 */

import type { SliceCreator, RestSliceState, RestSliceActions } from './types';
import { AWAKEN_COST } from '../gameStoreHelpers';

export type RestSlice = RestSliceState & RestSliceActions;

export const createRestSlice: SliceCreator<RestSlice> = (set, get) => ({
  // 초기 상태
  activeRest: null,

  // 액션
  closeRest: () =>
    set((state) => ({
      ...state,
      activeRest: null,
    })),

  healAtRest: (healAmount = 0) =>
    set((state) => {
      const maxHp = state.maxHp ?? 0;
      const current = state.playerHp ?? 0;
      const heal = Math.max(0, Math.min(maxHp - current, healAmount));
      if (heal <= 0) return state;
      return {
        ...state,
        playerHp: current + heal,
      };
    }),

  awakenAtRest: (choiceId) =>
    set((state) => {
      if (!state.activeRest) return state;
      const memory = state.resources.memory ?? 0;
      if (memory < AWAKEN_COST) return state;

      type ChoiceFn = (s: typeof state) => Record<string, unknown>;
      const choices: Record<string, ChoiceFn> = {
        brave: (s) => ({ playerStrength: (s.playerStrength || 0) + 1, trait: '용맹함' }),
        sturdy: (s) => {
          const newMax = (s.maxHp || 0) + 10;
          const newHp = Math.min(newMax, (s.playerHp || 0) + 10);
          return { maxHp: newMax, playerHp: newHp, trait: '굳건함' };
        },
        cold: (s) => ({ playerInsight: (s.playerInsight || 0) + 1, trait: '냉철함' }),
        thorough: (s) => ({
          extraSubSpecialSlots: (s.extraSubSpecialSlots || 0) + 1,
          trait: '철저함',
        }),
        passionate: (s) => ({
          playerMaxSpeedBonus: (s.playerMaxSpeedBonus || 0) + 5,
          trait: '열정적',
        }),
        lively: (s) => ({ playerEnergyBonus: (s.playerEnergyBonus || 0) + 1, trait: '활력적' }),
        random: (s) => {
          const keys = ['brave', 'sturdy', 'cold', 'thorough', 'passionate', 'lively'];
          const pick = keys[Math.floor(Math.random() * keys.length)];
          return choices[pick](s);
        },
      };

      const applyFn = choiceId && choices[choiceId] ? choices[choiceId] : choices.random;
      const applied = applyFn(state);
      const newTraits = [...(state.playerTraits || [])];
      if (applied.trait) newTraits.push(applied.trait as string);

      return {
        ...state,
        ...applied,
        resources: { ...state.resources, memory: memory - AWAKEN_COST },
        playerTraits: newTraits,
        activeRest: null,
      };
    }),

  formEgo: (selectedTraits) =>
    set((state) => {
      if (!selectedTraits || selectedTraits.length !== 5) return state;

      // 선택된 개성이 실제로 보유중인지 확인
      const availableTraits = [...(state.playerTraits || [])];
      const traitsToRemove = [...selectedTraits];
      for (const trait of traitsToRemove) {
        const idx = availableTraits.indexOf(trait);
        if (idx === -1) return state;
        availableTraits.splice(idx, 1);
      }

      // 개성별 효과 정의
      const traitEffects: Record<string, Record<string, number>> = {
        용맹함: { playerStrength: 1 },
        굳건함: { maxHp: 10, playerHp: 10 },
        냉철함: { playerInsight: 1 },
        철저함: { extraSubSpecialSlots: 1 },
        열정적: { playerMaxSpeedBonus: 5 },
        활력적: { playerEnergyBonus: 1 },
      };

      // 자아 규칙
      const egoRules = [
        { ego: '헌신', parts: ['열정적', '용맹함'] },
        { ego: '지략', parts: ['냉철함', '용맹함'] },
        { ego: '추격', parts: ['철저함', '용맹함'] },
        { ego: '역동', parts: ['활력적', '용맹함'] },
        { ego: '결의', parts: ['굳건함', '냉철함'] },
        { ego: '추진', parts: ['굳건함', '활력적'] },
        { ego: '신념', parts: ['굳건함', '열정적'] },
        { ego: '완성', parts: ['굳건함', '철저함'] },
        { ego: '분석', parts: ['냉철함', '열정적'] },
        { ego: '실행', parts: ['냉철함', '철저함'] },
        { ego: '정열', parts: ['활력적', '열정적'] },
        { ego: '지배', parts: ['활력적', '철저함'] },
      ];

      // 선택된 개성 카운트
      const traitCounts = selectedTraits.reduce(
        (acc, t) => {
          acc[t] = (acc[t] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // 자아 이름 결정
      let bestEgo: string | null = null;
      let bestScore = 0;
      for (const { ego, parts } of egoRules) {
        const score = (traitCounts[parts[0]] || 0) + (traitCounts[parts[1]] || 0);
        if (score > bestScore) {
          bestScore = score;
          bestEgo = ego;
        }
      }
      if (!bestEgo) bestEgo = '각성';

      // 소모된 개성들의 효과 합산
      const combinedEffects: Record<string, number> = {};
      for (const trait of selectedTraits) {
        const effects = traitEffects[trait];
        if (effects) {
          for (const [key, value] of Object.entries(effects)) {
            combinedEffects[key] = (combinedEffects[key] || 0) + value;
          }
        }
      }

      // 새 자아 객체 생성
      const newEgo = {
        name: bestEgo,
        consumedTraits: selectedTraits,
        effects: combinedEffects,
      };

      const newEgos = [...(state.playerEgos || []), newEgo];

      return {
        ...state,
        playerTraits: availableTraits,
        playerEgos: newEgos,
      };
    }),
});
