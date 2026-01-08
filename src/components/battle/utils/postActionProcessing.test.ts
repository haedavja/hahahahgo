/**
 * @file postActionProcessing.test.ts
 * @description 카드 실행 후 상태 업데이트 처리 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  processCriticalToken,
  processGrowingDefense,
  processMultiUnitDamage,
  checkBattleEnd,
} from './postActionProcessing';

// Mock dependencies
vi.mock('../../../lib/tokenUtils', () => ({
  addToken: vi.fn((entity, tokenType, count) => ({
    ...entity,
    tokens: { ...(entity.tokens || {}), [tokenType]: ((entity.tokens as Record<string, number>)?.[tokenType] || 0) + count },
  })),
}));

vi.mock('./battleUtils', () => ({
  hasTrait: vi.fn(() => false),
  hasEnemyUnits: vi.fn((units) => units && units.length > 0 && units.some((u: { hp: number }) => u.hp > 0)),
}));

vi.mock('./unitDamageDistribution', () => ({
  distributeUnitDamage: vi.fn(({ damageDealt, enemyUnits }) => {
    if (!enemyUnits || enemyUnits.length === 0) return null;
    const newTotalHp = Math.max(0, enemyUnits.reduce((sum: number, u: { hp: number }) => sum + u.hp, 0) - damageDealt);
    return {
      newTotalHp,
      updatedUnits: enemyUnits.map((u: { hp: number; id: number }) => ({ ...u, hp: Math.max(0, u.hp - damageDealt / enemyUnits.length) })),
      logs: [`유닛에 ${damageDealt} 데미지 분배`],
    };
  }),
}));

describe('postActionProcessing', () => {
  let mockAddLog: ReturnType<typeof vi.fn>;
  let mockSetPlayer: ReturnType<typeof vi.fn>;
  let mockPlaySound: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAddLog = vi.fn();
    mockSetPlayer = vi.fn();
    mockPlaySound = vi.fn();
  });

  describe('processCriticalToken', () => {
    it('치명타가 아니면 상태 변경 없음', () => {
      const playerState = { hp: 100, tokens: {} };
      const battleRef = { current: { player: playerState } };

      const result = processCriticalToken({
        actionResult: { isCritical: false },
        actor: 'player',
        playerState,
        battleRef,
        addLog: mockAddLog,
        actions: { setPlayer: mockSetPlayer },
      });

      expect(result).toEqual(playerState);
      expect(mockAddLog).not.toHaveBeenCalled();
      expect(mockSetPlayer).not.toHaveBeenCalled();
    });

    it('적의 치명타는 기교 토큰을 부여하지 않음', () => {
      const playerState = { hp: 100, tokens: {} };
      const battleRef = { current: { player: playerState } };

      const result = processCriticalToken({
        actionResult: { isCritical: true, criticalHits: 2 },
        actor: 'enemy',
        playerState,
        battleRef,
        addLog: mockAddLog,
        actions: { setPlayer: mockSetPlayer },
      });

      expect(result).toEqual(playerState);
      expect(mockAddLog).not.toHaveBeenCalled();
    });

    it('플레이어 치명타 시 기교 토큰 부여', () => {
      const playerState = { hp: 100, tokens: {} };
      const battleRef = { current: { player: playerState } };

      const result = processCriticalToken({
        actionResult: { isCritical: true, criticalHits: 3 },
        actor: 'player',
        playerState,
        battleRef,
        addLog: mockAddLog,
        actions: { setPlayer: mockSetPlayer },
      });

      expect(result.tokens).toHaveProperty('finesse', 3);
      expect(mockAddLog).toHaveBeenCalledWith('✨ 치명타! 기교 +3 획득');
      expect(mockSetPlayer).toHaveBeenCalled();
    });

    it('criticalHits 없으면 기본 1개 부여', () => {
      const playerState = { hp: 100, tokens: {} };
      const battleRef = { current: { player: playerState } };

      const result = processCriticalToken({
        actionResult: { isCritical: true },
        actor: 'player',
        playerState,
        battleRef,
        addLog: mockAddLog,
        actions: { setPlayer: mockSetPlayer },
      });

      expect(result.tokens).toHaveProperty('finesse', 1);
      expect(mockAddLog).toHaveBeenCalledWith('✨ 치명타! 기교 +1 획득');
    });
  });

  describe('processGrowingDefense', () => {
    it('growingDefenseRef가 null이면 기본값 반환', () => {
      const playerState = { block: 5, def: true };
      const growingDefenseRef = { current: null };

      const result = processGrowingDefense({
        action: { sp: 3, actor: 'player', card: null, index: 0, time: 3 },
        playerState,
        growingDefenseRef,
        addLog: mockAddLog,
      });

      expect(result).toEqual({ block: 5, def: true });
      expect(mockAddLog).not.toHaveBeenCalled();
    });

    it('방어력 추가가 필요하면 적용', () => {
      const playerState = { block: 0, def: false };
      const growingDefenseRef = { current: { activatedSp: 2, totalDefenseApplied: 0 } };

      const result = processGrowingDefense({
        action: { sp: 5, actor: 'player', card: null, index: 0, time: 5 },
        playerState,
        growingDefenseRef,
        addLog: mockAddLog,
      });

      // totalDefenseNeeded = 5 - 2 = 3, defenseDelta = 3 - 0 = 3
      expect(result.block).toBe(3);
      expect(result.def).toBe(true);
      expect(mockAddLog).toHaveBeenCalledWith('🛡️ 방어자세: +3 방어력 (총 3)');
      expect(growingDefenseRef.current?.totalDefenseApplied).toBe(3);
    });

    it('이미 충분한 방어력이 적용되었으면 추가 안함', () => {
      const playerState = { block: 3, def: true };
      const growingDefenseRef = { current: { activatedSp: 2, totalDefenseApplied: 3 } };

      const result = processGrowingDefense({
        action: { sp: 5, actor: 'player', card: null, index: 0, time: 5 },
        playerState,
        growingDefenseRef,
        addLog: mockAddLog,
      });

      // totalDefenseNeeded = 5 - 2 = 3, defenseDelta = 3 - 3 = 0
      expect(result.block).toBe(3);
      expect(mockAddLog).not.toHaveBeenCalled();
    });

    it('기존 방어력에 추가', () => {
      const playerState = { block: 10, def: true };
      const growingDefenseRef = { current: { activatedSp: 1, totalDefenseApplied: 2 } };

      const result = processGrowingDefense({
        action: { sp: 6, actor: 'player', card: null, index: 0, time: 6 },
        playerState,
        growingDefenseRef,
        addLog: mockAddLog,
      });

      // totalDefenseNeeded = 6 - 1 = 5, defenseDelta = 5 - 2 = 3
      expect(result.block).toBe(13); // 10 + 3
      expect(result.def).toBe(true);
    });
  });

  describe('processMultiUnitDamage', () => {
    it('유닛이 없으면 상태 변경 없음', () => {
      const enemyState = { hp: 100 };

      const result = processMultiUnitDamage({
        action: { actor: 'player', card: { type: 'attack', id: 'test', name: 'Test', baseAtk: 10, slot: 0 }, sp: 3, index: 0, time: 3 },
        actionResult: { dealt: 20 },
        enemyState,
        selectedTargetUnit: 0,
        addLog: mockAddLog,
      });

      expect(result).toEqual(enemyState);
    });

    it('적의 공격은 유닛 데미지 분배 안함', () => {
      const enemyState = { hp: 100, units: [{ id: 1, hp: 50, maxHp: 50 }] };

      const result = processMultiUnitDamage({
        action: { actor: 'enemy', card: { type: 'attack', id: 'e1', name: 'Enemy Attack', baseAtk: 10, slot: 0 }, sp: 3, index: 0, time: 3 },
        actionResult: { dealt: 20 },
        enemyState,
        selectedTargetUnit: 0,
        addLog: mockAddLog,
      });

      expect(result).toEqual(enemyState);
    });

    it('유닛에 데미지 분배', () => {
      const enemyState = { hp: 100, units: [{ id: 1, hp: 50, maxHp: 50 }] };

      const result = processMultiUnitDamage({
        action: { actor: 'player', card: { type: 'attack', id: 'test', name: 'Test', baseAtk: 10, slot: 0 }, sp: 3, index: 0, time: 3 },
        actionResult: { dealt: 20 },
        enemyState,
        selectedTargetUnit: 1,
        addLog: mockAddLog,
      });

      expect(result.hp).toBeLessThan(100);
      expect(mockAddLog).toHaveBeenCalled();
    });

    it('파토스 AOE 효과 적용', () => {
      const enemyState = { hp: 100, units: [{ id: 1, hp: 30, maxHp: 30 }, { id: 2, hp: 30, maxHp: 30 }] };

      processMultiUnitDamage({
        action: { actor: 'player', card: { type: 'attack', id: 'test', name: 'Test', baseAtk: 10, slot: 0 }, sp: 3, index: 0, time: 3 },
        actionResult: { dealt: 20 },
        enemyState,
        pathosNextCardEffects: { aoe: true },
        selectedTargetUnit: 0,
        addLog: mockAddLog,
      });

      expect(mockAddLog).toHaveBeenCalledWith('💥 파토스: 전체 공격!');
    });
  });

  describe('checkBattleEnd', () => {
    let mockActions: {
      setPostCombatOptions: ReturnType<typeof vi.fn>;
      setPhase: ReturnType<typeof vi.fn>;
      setEtherCalcPhase: ReturnType<typeof vi.fn>;
      setTurnEtherAccumulated: ReturnType<typeof vi.fn>;
      setResolvedPlayerCards: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockActions = {
        setPostCombatOptions: vi.fn(),
        setPhase: vi.fn(),
        setEtherCalcPhase: vi.fn(),
        setTurnEtherAccumulated: vi.fn(),
        setResolvedPlayerCards: vi.fn(),
      };
    });

    it('플레이어 HP가 0 이하면 패배', () => {
      const result = checkBattleEnd({
        playerHp: 0,
        enemyHp: 50,
        newQIndex: 0,
        queue: [],
        queueLength: 0,
        turnEtherAccumulated: 0,
        playSound: mockPlaySound,
        actions: mockActions,
      });

      expect(result).toEqual({ ended: true, result: 'defeat' });
      expect(mockActions.setPostCombatOptions).toHaveBeenCalledWith({ type: 'defeat' });
      expect(mockActions.setPhase).toHaveBeenCalledWith('post');
    });

    it('적 HP가 0 이하면 승리', () => {
      const result = checkBattleEnd({
        playerHp: 50,
        enemyHp: 0,
        newQIndex: 3,
        queue: [
          { actor: 'player', card: null, sp: 1, index: 0, time: 1 },
          { actor: 'enemy', card: null, sp: 2, index: 1, time: 2 },
          { actor: 'player', card: null, sp: 3, index: 2, time: 3 },
        ],
        queueLength: 3,
        turnEtherAccumulated: 0,
        playSound: mockPlaySound,
        actions: mockActions,
      });

      expect(result).toEqual({ ended: true, result: 'victory' });
      expect(mockActions.setResolvedPlayerCards).toHaveBeenCalledWith(2); // 2 player cards in queue
    });

    it('에테르 누적이 있으면 사운드 재생', () => {
      checkBattleEnd({
        playerHp: 50,
        enemyHp: 0,
        newQIndex: 0,
        queue: [],
        queueLength: 0,
        turnEtherAccumulated: 10,
        playSound: mockPlaySound,
        actions: mockActions,
      });

      expect(mockPlaySound).toHaveBeenCalledWith(800, 150);
      expect(mockActions.setEtherCalcPhase).toHaveBeenCalledWith('win_calc');
    });

    it('큐 완료 시 바로 승리 처리', () => {
      checkBattleEnd({
        playerHp: 50,
        enemyHp: 0,
        newQIndex: 5,
        queue: [],
        queueLength: 5,
        turnEtherAccumulated: 0,
        playSound: mockPlaySound,
        actions: mockActions,
      });

      expect(mockActions.setPostCombatOptions).toHaveBeenCalledWith({ type: 'victory' });
      expect(mockActions.setPhase).toHaveBeenCalledWith('post');
    });

    it('양측 HP가 남아있으면 전투 계속', () => {
      const result = checkBattleEnd({
        playerHp: 50,
        enemyHp: 50,
        newQIndex: 0,
        queue: [],
        queueLength: 5,
        turnEtherAccumulated: 0,
        playSound: mockPlaySound,
        actions: mockActions,
      });

      expect(result).toEqual({ ended: false });
      expect(mockActions.setPostCombatOptions).not.toHaveBeenCalled();
      expect(mockActions.setPhase).not.toHaveBeenCalled();
    });
  });
});
