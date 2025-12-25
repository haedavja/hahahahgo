/**
 * @file etherTransferProcessing.test.js
 * @description 에테르 전송 처리 테스트
 *
 * ## 테스트 대상
 * - processEtherTransfer: 에테르 전송 계산 및 애니메이션 트리거
 *
 * ## 주요 테스트 케이스
 * - 에테르 이동량(movedPts) 계산
 * - 적 처치 시 잔여 에테르 회수 로그
 * - 펄스 애니메이션 활성화/비활성화 (450ms)
 * - 양수/음수 이동 시 사운드 주파수 (900Hz/600Hz)
 * - 이동량 0일 때 애니메이션/사운드 스킵
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processEtherTransfer } from './etherTransferProcessing';

describe('etherTransferProcessing', () => {
  describe('processEtherTransfer', () => {
    const createMockActions = () => ({
      setNetEtherDelta: vi.fn(),
      setPlayerTransferPulse: vi.fn(),
      setEnemyTransferPulse: vi.fn()
    });

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('에테르 전송 계산 함수를 호출해야 함', () => {
      const calculateEtherTransfer = vi.fn(() => ({
        nextPlayerPts: 15,
        nextEnemyPts: 10,
        movedPts: 5
      }));

      processEtherTransfer({
        playerAppliedEther: 10,
        enemyAppliedEther: 5,
        curPlayerPts: 5,
        curEnemyPts: 15,
        enemyHp: 50,
        calculateEtherTransfer,
        addLog: vi.fn(),
        playSound: vi.fn(),
        actions: createMockActions()
      });

      expect(calculateEtherTransfer).toHaveBeenCalledWith(10, 5, 5, 15, 50);
    });

    it('적 처치 시 잔여 에테르 회수 로그를 남겨야 함', () => {
      const addLog = vi.fn();
      const calculateEtherTransfer = vi.fn(() => ({
        nextPlayerPts: 20,
        nextEnemyPts: 0,
        movedPts: 10
      }));

      processEtherTransfer({
        playerAppliedEther: 10,
        enemyAppliedEther: 0,
        curPlayerPts: 10,
        curEnemyPts: 10, // 잔여 에테르 있음
        enemyHp: 0, // 처치됨
        calculateEtherTransfer,
        addLog,
        playSound: vi.fn(),
        actions: createMockActions()
      });

      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('잔여 에테르 회수'));
      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('10'));
    });

    it('적이 살아있으면 회수 로그를 남기지 않아야 함', () => {
      const addLog = vi.fn();
      const calculateEtherTransfer = vi.fn(() => ({
        nextPlayerPts: 15,
        nextEnemyPts: 10,
        movedPts: 5
      }));

      processEtherTransfer({
        playerAppliedEther: 10,
        enemyAppliedEther: 5,
        curPlayerPts: 5,
        curEnemyPts: 10,
        enemyHp: 50, // 살아있음
        calculateEtherTransfer,
        addLog,
        playSound: vi.fn(),
        actions: createMockActions()
      });

      expect(addLog).not.toHaveBeenCalledWith(expect.stringContaining('잔여 에테르 회수'));
    });

    it('netEtherDelta를 설정해야 함', () => {
      const actions = createMockActions();
      const calculateEtherTransfer = vi.fn(() => ({
        nextPlayerPts: 15,
        nextEnemyPts: 10,
        movedPts: 5
      }));

      processEtherTransfer({
        playerAppliedEther: 10,
        enemyAppliedEther: 5,
        curPlayerPts: 5,
        curEnemyPts: 15,
        enemyHp: 50,
        calculateEtherTransfer,
        addLog: vi.fn(),
        playSound: vi.fn(),
        actions
      });

      expect(actions.setNetEtherDelta).toHaveBeenCalledWith(5);
    });

    it('에테르 이동 시 펄스 애니메이션을 활성화해야 함', () => {
      const actions = createMockActions();
      const calculateEtherTransfer = vi.fn(() => ({
        nextPlayerPts: 15,
        nextEnemyPts: 10,
        movedPts: 5
      }));

      processEtherTransfer({
        playerAppliedEther: 10,
        enemyAppliedEther: 5,
        curPlayerPts: 5,
        curEnemyPts: 15,
        enemyHp: 50,
        calculateEtherTransfer,
        addLog: vi.fn(),
        playSound: vi.fn(),
        actions
      });

      expect(actions.setPlayerTransferPulse).toHaveBeenCalledWith(true);
      expect(actions.setEnemyTransferPulse).toHaveBeenCalledWith(true);
    });

    it('450ms 후 펄스 애니메이션을 비활성화해야 함', () => {
      const actions = createMockActions();
      const calculateEtherTransfer = vi.fn(() => ({
        nextPlayerPts: 15,
        nextEnemyPts: 10,
        movedPts: 5
      }));

      processEtherTransfer({
        playerAppliedEther: 10,
        enemyAppliedEther: 5,
        curPlayerPts: 5,
        curEnemyPts: 15,
        enemyHp: 50,
        calculateEtherTransfer,
        addLog: vi.fn(),
        playSound: vi.fn(),
        actions
      });

      vi.advanceTimersByTime(450);

      expect(actions.setPlayerTransferPulse).toHaveBeenCalledWith(false);
      expect(actions.setEnemyTransferPulse).toHaveBeenCalledWith(false);
    });

    it('양수 이동 시 900Hz 사운드를 재생해야 함', () => {
      const playSound = vi.fn();
      const calculateEtherTransfer = vi.fn(() => ({
        nextPlayerPts: 15,
        nextEnemyPts: 10,
        movedPts: 5
      }));

      processEtherTransfer({
        playerAppliedEther: 10,
        enemyAppliedEther: 5,
        curPlayerPts: 5,
        curEnemyPts: 15,
        enemyHp: 50,
        calculateEtherTransfer,
        addLog: vi.fn(),
        playSound,
        actions: createMockActions()
      });

      expect(playSound).toHaveBeenCalledWith(900, 180);
    });

    it('음수 이동 시 600Hz 사운드를 재생해야 함', () => {
      const playSound = vi.fn();
      const calculateEtherTransfer = vi.fn(() => ({
        nextPlayerPts: 5,
        nextEnemyPts: 15,
        movedPts: -5
      }));

      processEtherTransfer({
        playerAppliedEther: 5,
        enemyAppliedEther: 10,
        curPlayerPts: 10,
        curEnemyPts: 10,
        enemyHp: 50,
        calculateEtherTransfer,
        addLog: vi.fn(),
        playSound,
        actions: createMockActions()
      });

      expect(playSound).toHaveBeenCalledWith(600, 180);
    });

    it('이동량이 0이면 펄스/사운드/로그가 없어야 함', () => {
      const actions = createMockActions();
      const playSound = vi.fn();
      const addLog = vi.fn();
      const calculateEtherTransfer = vi.fn(() => ({
        nextPlayerPts: 10,
        nextEnemyPts: 10,
        movedPts: 0
      }));

      processEtherTransfer({
        playerAppliedEther: 5,
        enemyAppliedEther: 5,
        curPlayerPts: 5,
        curEnemyPts: 5,
        enemyHp: 50,
        calculateEtherTransfer,
        addLog,
        playSound,
        actions
      });

      expect(actions.setPlayerTransferPulse).not.toHaveBeenCalled();
      expect(playSound).not.toHaveBeenCalled();
      expect(addLog).not.toHaveBeenCalledWith(expect.stringContaining('에테르 이동'));
    });

    it('에테르 이동 로그를 남겨야 함', () => {
      const addLog = vi.fn();
      const calculateEtherTransfer = vi.fn(() => ({
        nextPlayerPts: 15,
        nextEnemyPts: 10,
        movedPts: 5
      }));

      processEtherTransfer({
        playerAppliedEther: 10,
        enemyAppliedEther: 5,
        curPlayerPts: 5,
        curEnemyPts: 15,
        enemyHp: 50,
        calculateEtherTransfer,
        addLog,
        playSound: vi.fn(),
        actions: createMockActions()
      });

      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('에테르 이동'));
      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('+5'));
    });

    it('결과를 올바르게 반환해야 함', () => {
      const calculateEtherTransfer = vi.fn(() => ({
        nextPlayerPts: 15,
        nextEnemyPts: 10,
        movedPts: 5
      }));

      const result = processEtherTransfer({
        playerAppliedEther: 10,
        enemyAppliedEther: 5,
        curPlayerPts: 5,
        curEnemyPts: 15,
        enemyHp: 50,
        calculateEtherTransfer,
        addLog: vi.fn(),
        playSound: vi.fn(),
        actions: createMockActions()
      });

      expect(result.nextPlayerPts).toBe(15);
      expect(result.nextEnemyPts).toBe(10);
      expect(result.movedPts).toBe(5);
    });
  });
});
