/**
 * @file turnEndRelicEffectsProcessing.test.js
 * @description 턴 종료 상징 효과 처리 테스트
 *
 * ## 테스트 대상
 * - playTurnEndRelicAnimations: ON_TURN_END 상징 발동 애니메이션
 * - applyTurnEndRelicEffectsToNextTurn: 다음 턴 효과 적용
 *
 * ## 주요 테스트 케이스
 * - ON_TURN_END 타입 상징만 발동
 * - 조건(condition) 함수 체크
 * - 다음 턴 행동력(energyNextTurn) 추가
 * - 힘(strength) 즉시 적용
 * - 상징 활성화 애니메이션 (500ms)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { playTurnEndRelicAnimations, applyTurnEndRelicEffectsToNextTurn } from './turnEndRelicEffectsProcessing';

describe('turnEndRelicEffectsProcessing', () => {
  describe('playTurnEndRelicAnimations', () => {
    const createMockActions = () => ({
      setRelicActivated: vi.fn()
    });

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('ON_TURN_END 상징을 활성화해야 함', () => {
      const actions = createMockActions();
      const playSound = vi.fn();
      const RELICS = {
        relic1: { effects: { type: 'ON_TURN_END' } }
      };

      playTurnEndRelicAnimations({
        relics: ['relic1'],
        RELICS,
        cardsPlayedThisTurn: 3,
        player: {},
        enemy: {},
        playSound,
        actions
      });

      expect(actions.setRelicActivated).toHaveBeenCalledWith('relic1');
      expect(playSound).toHaveBeenCalledWith(800, 200);
    });

    it('500ms 후 상징 활성화를 해제해야 함', () => {
      const actions = createMockActions();
      const RELICS = {
        relic1: { effects: { type: 'ON_TURN_END' } }
      };

      playTurnEndRelicAnimations({
        relics: ['relic1'],
        RELICS,
        cardsPlayedThisTurn: 3,
        player: {},
        enemy: {},
        playSound: vi.fn(),
        actions
      });

      vi.advanceTimersByTime(500);

      expect(actions.setRelicActivated).toHaveBeenCalledWith(null);
    });

    it('ON_TURN_END가 아닌 상징은 무시해야 함', () => {
      const actions = createMockActions();
      const playSound = vi.fn();
      const RELICS = {
        relic1: { effects: { type: 'PASSIVE' } }
      };

      playTurnEndRelicAnimations({
        relics: ['relic1'],
        RELICS,
        cardsPlayedThisTurn: 3,
        player: {},
        enemy: {},
        playSound,
        actions
      });

      expect(actions.setRelicActivated).not.toHaveBeenCalled();
      expect(playSound).not.toHaveBeenCalled();
    });

    it('조건이 있으면 조건을 확인해야 함', () => {
      const actions = createMockActions();
      const condition = vi.fn(() => true);
      const RELICS = {
        relic1: { effects: { type: 'ON_TURN_END', condition } }
      };

      playTurnEndRelicAnimations({
        relics: ['relic1'],
        RELICS,
        cardsPlayedThisTurn: 5,
        player: { hp: 50 },
        enemy: { hp: 30 },
        playSound: vi.fn(),
        actions
      });

      expect(condition).toHaveBeenCalledWith({
        cardsPlayedThisTurn: 5,
        player: { hp: 50 },
        enemy: { hp: 30 }
      });
      expect(actions.setRelicActivated).toHaveBeenCalledWith('relic1');
    });

    it('조건이 false면 활성화하지 않아야 함', () => {
      const actions = createMockActions();
      const condition = vi.fn(() => false);
      const RELICS = {
        relic1: { effects: { type: 'ON_TURN_END', condition } }
      };

      playTurnEndRelicAnimations({
        relics: ['relic1'],
        RELICS,
        cardsPlayedThisTurn: 2,
        player: {},
        enemy: {},
        playSound: vi.fn(),
        actions
      });

      expect(actions.setRelicActivated).not.toHaveBeenCalled();
    });

    it('여러 상징을 처리해야 함', () => {
      const actions = createMockActions();
      const playSound = vi.fn();
      const RELICS = {
        relic1: { effects: { type: 'ON_TURN_END' } },
        relic2: { effects: { type: 'PASSIVE' } },
        relic3: { effects: { type: 'ON_TURN_END' } }
      };

      playTurnEndRelicAnimations({
        relics: ['relic1', 'relic2', 'relic3'],
        RELICS,
        cardsPlayedThisTurn: 3,
        player: {},
        enemy: {},
        playSound,
        actions
      });

      expect(actions.setRelicActivated).toHaveBeenCalledWith('relic1');
      expect(actions.setRelicActivated).toHaveBeenCalledWith('relic3');
      expect(playSound).toHaveBeenCalledTimes(2);
    });

    it('존재하지 않는 상징은 무시해야 함', () => {
      const actions = createMockActions();
      const RELICS = {};

      playTurnEndRelicAnimations({
        relics: ['nonexistent'],
        RELICS,
        cardsPlayedThisTurn: 3,
        player: {},
        enemy: {},
        playSound: vi.fn(),
        actions
      });

      expect(actions.setRelicActivated).not.toHaveBeenCalled();
    });
  });

  describe('applyTurnEndRelicEffectsToNextTurn', () => {
    const createMockActions = () => ({
      setPlayer: vi.fn()
    });

    it('다음 턴 행동력을 추가해야 함', () => {
      const addLog = vi.fn();

      const result = applyTurnEndRelicEffectsToNextTurn({
        turnEndRelicEffects: { energyNextTurn: 2, strength: 0 },
        nextTurnEffects: { bonusEnergy: 1 },
        player: {},
        addLog,
        actions: createMockActions()
      });

      expect(result.bonusEnergy).toBe(3);
      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('다음턴 행동력'));
      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('+2'));
    });

    it('행동력 0이면 로그를 남기지 않아야 함', () => {
      const addLog = vi.fn();

      applyTurnEndRelicEffectsToNextTurn({
        turnEndRelicEffects: { energyNextTurn: 0, strength: 0 },
        nextTurnEffects: { bonusEnergy: 1 },
        player: {},
        addLog,
        actions: createMockActions()
      });

      expect(addLog).not.toHaveBeenCalledWith(expect.stringContaining('행동력'));
    });

    it('힘을 즉시 적용해야 함', () => {
      const addLog = vi.fn();
      const actions = createMockActions();
      const player = { strength: 2, hp: 100 };

      applyTurnEndRelicEffectsToNextTurn({
        turnEndRelicEffects: { energyNextTurn: 0, strength: 3 },
        nextTurnEffects: { bonusEnergy: 0 },
        player,
        addLog,
        actions
      });

      expect(actions.setPlayer).toHaveBeenCalledWith(expect.objectContaining({ strength: 5 }));
      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('힘'));
      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('+3'));
    });

    it('음수 힘도 적용해야 함', () => {
      const addLog = vi.fn();
      const actions = createMockActions();
      const player = { strength: 5 };

      applyTurnEndRelicEffectsToNextTurn({
        turnEndRelicEffects: { energyNextTurn: 0, strength: -2 },
        nextTurnEffects: { bonusEnergy: 0 },
        player,
        addLog,
        actions
      });

      expect(actions.setPlayer).toHaveBeenCalledWith(expect.objectContaining({ strength: 3 }));
      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('-2'));
    });

    it('힘이 0이면 적용하지 않아야 함', () => {
      const addLog = vi.fn();
      const actions = createMockActions();

      applyTurnEndRelicEffectsToNextTurn({
        turnEndRelicEffects: { energyNextTurn: 0, strength: 0 },
        nextTurnEffects: { bonusEnergy: 0 },
        player: { strength: 5 },
        addLog,
        actions
      });

      expect(actions.setPlayer).not.toHaveBeenCalled();
    });

    it('strength가 없는 플레이어도 처리해야 함', () => {
      const addLog = vi.fn();
      const actions = createMockActions();
      const player = { hp: 100 }; // strength 없음

      applyTurnEndRelicEffectsToNextTurn({
        turnEndRelicEffects: { energyNextTurn: 0, strength: 2 },
        nextTurnEffects: { bonusEnergy: 0 },
        player,
        addLog,
        actions
      });

      expect(actions.setPlayer).toHaveBeenCalledWith(expect.objectContaining({ strength: 2 }));
    });

    it('기존 nextTurnEffects를 유지해야 함', () => {
      const result = applyTurnEndRelicEffectsToNextTurn({
        turnEndRelicEffects: { energyNextTurn: 1, strength: 0 },
        nextTurnEffects: { bonusEnergy: 2, otherEffect: true },
        player: {},
        addLog: vi.fn(),
        actions: createMockActions()
      });

      expect(result.bonusEnergy).toBe(3);
      expect(result.otherEffect).toBe(true);
    });
  });
});
