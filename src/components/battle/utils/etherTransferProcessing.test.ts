/**
 * @file etherTransferProcessing.test.ts
 * @description 에테르 전송 처리 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processEtherTransfer } from './etherTransferProcessing';
import type { MonsterGraceState } from '../../../data/monsterEther';

// ==================== Mock 설정 ====================

const createMockActions = () => ({
  setNetEtherDelta: vi.fn(),
  setPlayerTransferPulse: vi.fn(),
  setEnemyTransferPulse: vi.fn(),
});

const createMockGraceState = (overrides: Partial<MonsterGraceState> = {}): MonsterGraceState => ({
  gracePts: 0,
  soulShield: 0,
  blessingTurns: 0,
  blessingBonus: 0,
  availablePrayers: ['immunity', 'blessing', 'healing', 'offense', 'veil'],
  usedPrayersThisTurn: [],
  ...overrides,
});

// ==================== 테스트 ====================

describe('processEtherTransfer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('기본 에테르 이동', () => {
    it('플레이어 에테르가 높으면 플레이어가 에테르를 얻음', () => {
      const actions = createMockActions();
      const mockCalculate = vi.fn(() => ({
        nextPlayerPts: 15,
        nextEnemyPts: 5,
        movedPts: 5,
      }));

      const result = processEtherTransfer({
        playerAppliedEther: 20,
        enemyAppliedEther: 10,
        curPlayerPts: 10,
        curEnemyPts: 10,
        enemyHp: 50,
        calculateEtherTransfer: mockCalculate,
        addLog: vi.fn(),
        playSound: vi.fn(),
        actions,
      });

      expect(result.nextPlayerPts).toBe(15);
      expect(result.nextEnemyPts).toBe(5);
      expect(result.movedPts).toBe(5);
    });

    it('적 에테르가 높으면 플레이어가 에테르를 잃음', () => {
      const actions = createMockActions();
      const mockCalculate = vi.fn(() => ({
        nextPlayerPts: 5,
        nextEnemyPts: 15,
        movedPts: -5,
      }));

      const result = processEtherTransfer({
        playerAppliedEther: 10,
        enemyAppliedEther: 20,
        curPlayerPts: 10,
        curEnemyPts: 10,
        enemyHp: 50,
        calculateEtherTransfer: mockCalculate,
        addLog: vi.fn(),
        playSound: vi.fn(),
        actions,
      });

      expect(result.movedPts).toBe(-5);
    });

    it('에테르 이동이 없으면 movedPts가 0', () => {
      const actions = createMockActions();
      const mockCalculate = vi.fn(() => ({
        nextPlayerPts: 10,
        nextEnemyPts: 10,
        movedPts: 0,
      }));

      const result = processEtherTransfer({
        playerAppliedEther: 15,
        enemyAppliedEther: 15,
        curPlayerPts: 10,
        curEnemyPts: 10,
        enemyHp: 50,
        calculateEtherTransfer: mockCalculate,
        addLog: vi.fn(),
        playSound: vi.fn(),
        actions,
      });

      expect(result.movedPts).toBe(0);
    });
  });

  describe('은총 시스템', () => {
    it('적이 은총을 획득하면 enemyGraceGain이 반환됨', () => {
      const actions = createMockActions();
      const updatedGrace = createMockGraceState({ gracePts: 50 });
      const mockCalculate = vi.fn(() => ({
        nextPlayerPts: 10,
        nextEnemyPts: 10,
        movedPts: 0,
        enemyGraceGain: 50,
        updatedGraceState: updatedGrace,
      }));

      const result = processEtherTransfer({
        playerAppliedEther: 10,
        enemyAppliedEther: 20,
        curPlayerPts: 10,
        curEnemyPts: 10,
        enemyHp: 50,
        graceState: createMockGraceState(),
        calculateEtherTransfer: mockCalculate,
        addLog: vi.fn(),
        playSound: vi.fn(),
        actions,
      });

      expect(result.enemyGraceGain).toBe(50);
      expect(result.updatedGraceState).toEqual(updatedGrace);
    });

    it('은총 획득 시 로그가 추가됨', () => {
      const actions = createMockActions();
      const addLog = vi.fn();
      const mockCalculate = vi.fn(() => ({
        nextPlayerPts: 10,
        nextEnemyPts: 10,
        movedPts: 0,
        enemyGraceGain: 30,
      }));

      processEtherTransfer({
        playerAppliedEther: 10,
        enemyAppliedEther: 20,
        curPlayerPts: 10,
        curEnemyPts: 10,
        enemyHp: 50,
        calculateEtherTransfer: mockCalculate,
        addLog,
        playSound: vi.fn(),
        actions,
      });

      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('은총 획득'));
    });
  });

  describe('보호막 시스템', () => {
    it('보호막이 영혼 피해를 흡수하면 shieldBlocked가 반환됨', () => {
      const actions = createMockActions();
      const mockCalculate = vi.fn(() => ({
        nextPlayerPts: 15,
        nextEnemyPts: 8,
        movedPts: 5,
        shieldBlocked: 2,
      }));

      const result = processEtherTransfer({
        playerAppliedEther: 25,
        enemyAppliedEther: 10,
        curPlayerPts: 10,
        curEnemyPts: 10,
        enemyHp: 50,
        graceState: createMockGraceState({ soulShield: 2 }),
        calculateEtherTransfer: mockCalculate,
        addLog: vi.fn(),
        playSound: vi.fn(),
        actions,
      });

      expect(result.shieldBlocked).toBe(2);
    });

    it('보호막 흡수 시 로그가 추가됨', () => {
      const actions = createMockActions();
      const addLog = vi.fn();
      const mockCalculate = vi.fn(() => ({
        nextPlayerPts: 15,
        nextEnemyPts: 8,
        movedPts: 5,
        shieldBlocked: 3,
      }));

      processEtherTransfer({
        playerAppliedEther: 25,
        enemyAppliedEther: 10,
        curPlayerPts: 10,
        curEnemyPts: 10,
        enemyHp: 50,
        calculateEtherTransfer: mockCalculate,
        addLog,
        playSound: vi.fn(),
        actions,
      });

      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('보호막'));
    });
  });

  describe('액션 호출', () => {
    it('에테르 이동 시 netEtherDelta가 설정됨', () => {
      const actions = createMockActions();
      const mockCalculate = vi.fn(() => ({
        nextPlayerPts: 15,
        nextEnemyPts: 5,
        movedPts: 5,
      }));

      processEtherTransfer({
        playerAppliedEther: 20,
        enemyAppliedEther: 10,
        curPlayerPts: 10,
        curEnemyPts: 10,
        enemyHp: 50,
        calculateEtherTransfer: mockCalculate,
        addLog: vi.fn(),
        playSound: vi.fn(),
        actions,
      });

      expect(actions.setNetEtherDelta).toHaveBeenCalledWith(5);
    });

    it('에테르 이동 시 펄스 애니메이션이 시작됨', () => {
      const actions = createMockActions();
      const mockCalculate = vi.fn(() => ({
        nextPlayerPts: 15,
        nextEnemyPts: 5,
        movedPts: 5,
      }));

      processEtherTransfer({
        playerAppliedEther: 20,
        enemyAppliedEther: 10,
        curPlayerPts: 10,
        curEnemyPts: 10,
        enemyHp: 50,
        calculateEtherTransfer: mockCalculate,
        addLog: vi.fn(),
        playSound: vi.fn(),
        actions,
      });

      expect(actions.setPlayerTransferPulse).toHaveBeenCalledWith(true);
      expect(actions.setEnemyTransferPulse).toHaveBeenCalledWith(true);
    });

    it('펄스 애니메이션이 450ms 후 종료됨', () => {
      const actions = createMockActions();
      const mockCalculate = vi.fn(() => ({
        nextPlayerPts: 15,
        nextEnemyPts: 5,
        movedPts: 5,
      }));

      processEtherTransfer({
        playerAppliedEther: 20,
        enemyAppliedEther: 10,
        curPlayerPts: 10,
        curEnemyPts: 10,
        enemyHp: 50,
        calculateEtherTransfer: mockCalculate,
        addLog: vi.fn(),
        playSound: vi.fn(),
        actions,
      });

      // 450ms 전에는 펄스가 false로 설정되지 않음
      vi.advanceTimersByTime(449);
      expect(actions.setPlayerTransferPulse).not.toHaveBeenCalledWith(false);

      // 450ms 후에 펄스가 false로 설정됨
      vi.advanceTimersByTime(1);
      expect(actions.setPlayerTransferPulse).toHaveBeenCalledWith(false);
      expect(actions.setEnemyTransferPulse).toHaveBeenCalledWith(false);
    });

    it('에테르 이동이 없으면 펄스 애니메이션이 시작되지 않음', () => {
      const actions = createMockActions();
      const mockCalculate = vi.fn(() => ({
        nextPlayerPts: 10,
        nextEnemyPts: 10,
        movedPts: 0,
      }));

      processEtherTransfer({
        playerAppliedEther: 15,
        enemyAppliedEther: 15,
        curPlayerPts: 10,
        curEnemyPts: 10,
        enemyHp: 50,
        calculateEtherTransfer: mockCalculate,
        addLog: vi.fn(),
        playSound: vi.fn(),
        actions,
      });

      expect(actions.setPlayerTransferPulse).not.toHaveBeenCalledWith(true);
    });
  });

  describe('사운드 효과', () => {
    it('플레이어가 에테르를 얻으면 높은 음 재생', () => {
      const actions = createMockActions();
      const playSound = vi.fn();
      const mockCalculate = vi.fn(() => ({
        nextPlayerPts: 15,
        nextEnemyPts: 5,
        movedPts: 5,
      }));

      processEtherTransfer({
        playerAppliedEther: 20,
        enemyAppliedEther: 10,
        curPlayerPts: 10,
        curEnemyPts: 10,
        enemyHp: 50,
        calculateEtherTransfer: mockCalculate,
        addLog: vi.fn(),
        playSound,
        actions,
      });

      expect(playSound).toHaveBeenCalledWith(900, 180);
    });

    it('플레이어가 에테르를 잃으면 낮은 음 재생', () => {
      const actions = createMockActions();
      const playSound = vi.fn();
      const mockCalculate = vi.fn(() => ({
        nextPlayerPts: 5,
        nextEnemyPts: 15,
        movedPts: -5,
      }));

      processEtherTransfer({
        playerAppliedEther: 10,
        enemyAppliedEther: 20,
        curPlayerPts: 10,
        curEnemyPts: 10,
        enemyHp: 50,
        calculateEtherTransfer: mockCalculate,
        addLog: vi.fn(),
        playSound,
        actions,
      });

      expect(playSound).toHaveBeenCalledWith(600, 180);
    });
  });

  describe('적 처치 시 잔여 영혼 회수', () => {
    it('적이 처치되고 영혼이 남아있으면 회수 로그 추가', () => {
      const actions = createMockActions();
      const addLog = vi.fn();
      const mockCalculate = vi.fn(() => ({
        nextPlayerPts: 20,
        nextEnemyPts: 0,
        movedPts: 10,
      }));

      processEtherTransfer({
        playerAppliedEther: 30,
        enemyAppliedEther: 10,
        curPlayerPts: 10,
        curEnemyPts: 5,
        enemyHp: 0,
        calculateEtherTransfer: mockCalculate,
        addLog,
        playSound: vi.fn(),
        actions,
      });

      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('잔여 영혼 회수'));
    });

    it('적이 살아있으면 회수 로그가 추가되지 않음', () => {
      const actions = createMockActions();
      const addLog = vi.fn();
      const mockCalculate = vi.fn(() => ({
        nextPlayerPts: 15,
        nextEnemyPts: 5,
        movedPts: 5,
      }));

      processEtherTransfer({
        playerAppliedEther: 20,
        enemyAppliedEther: 10,
        curPlayerPts: 10,
        curEnemyPts: 10,
        enemyHp: 50,
        calculateEtherTransfer: mockCalculate,
        addLog,
        playSound: vi.fn(),
        actions,
      });

      const calls = addLog.mock.calls.flat();
      expect(calls.some(msg => msg.includes('잔여 영혼 회수'))).toBe(false);
    });
  });
});
