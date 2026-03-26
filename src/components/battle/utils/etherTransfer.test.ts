/**
 * @file etherTransfer.test.js
 * @description 에테르 전송 계산 테스트
 *
 * ## 테스트 대상
 * - calculateEtherTransfer: 플레이어/적 간 에테르 이동량 계산
 *
 * ## 주요 테스트 케이스
 * - 플레이어 우위: 적에게서 에테르 빼앗기
 * - 적 우위: 플레이어 에테르 감소
 * - 적 처치 시 잔여 에테르 전부 획득
 * - 음수 에테르 방지
 * - 이동량(movedPts) 정확한 계산
 */

import { describe, it, expect } from 'vitest';
import { calculateEtherTransfer } from './etherTransfer';

describe('etherTransfer', () => {
  describe('calculateEtherTransfer', () => {
    it('플레이어가 더 많이 획득하면 적에게서 빼앗아야 함', () => {
      const result = calculateEtherTransfer(100, 50, 0, 200, 100);

      // 순 이동량: 100 - 50 = 50
      // 적 에테르 200에서 50 빼앗기
      expect(result.nextPlayerPts).toBe(50);
      expect(result.nextEnemyPts).toBe(150);
      expect(result.movedPts).toBe(50);
    });

    it('빼앗을 수 있는 양은 적의 현재 에테르로 제한되어야 함', () => {
      const result = calculateEtherTransfer(100, 0, 0, 30, 100);

      // 순 이동량: 100, 하지만 적 에테르 30만 있음
      expect(result.nextPlayerPts).toBe(30);
      expect(result.nextEnemyPts).toBe(0);
      expect(result.movedPts).toBe(30);
    });

    it('적이 더 많이 획득하면 플레이어 에테르는 감소하지 않아야 함', () => {
      const result = calculateEtherTransfer(50, 100, 200, 50, 100);

      // 적이 50 더 획득 → 은총으로 전환, 영혼(etherPts) 변화 없음
      expect(result.nextPlayerPts).toBe(200);
      expect(result.nextEnemyPts).toBe(50); // 영혼은 변화 없음
      expect(result.movedPts).toBe(0);
      expect(result.enemyGraceGain).toBe(50); // 은총으로 획득
    });

    it('적이 죽으면 남은 에테르가 플레이어에게 이전되어야 함', () => {
      const result = calculateEtherTransfer(0, 0, 100, 50, 0);

      // 적 HP가 0이면 남은 에테르 50 모두 플레이어에게
      expect(result.nextPlayerPts).toBe(150);
      expect(result.nextEnemyPts).toBe(0);
      expect(result.movedPts).toBe(50);
    });

    it('적이 죽고 에테르 이동도 있으면 둘 다 적용되어야 함', () => {
      const result = calculateEtherTransfer(50, 0, 100, 80, 0);

      // 1. 순 이동량 50 → 적에게서 50 빼앗기 (적: 80 → 30)
      // 2. 적 HP 0이므로 남은 30 모두 플레이어에게
      expect(result.nextPlayerPts).toBe(180); // 100 + 50 + 30
      expect(result.nextEnemyPts).toBe(0);
      expect(result.movedPts).toBe(80); // 50 + 30
    });

    it('둘 다 같은 양을 획득하면 이동 없어야 함', () => {
      const result = calculateEtherTransfer(50, 50, 100, 100, 50);

      expect(result.nextPlayerPts).toBe(100);
      expect(result.nextEnemyPts).toBe(100);
      expect(result.movedPts).toBe(0);
    });

    it('에테르가 음수가 되지 않아야 함', () => {
      const result = calculateEtherTransfer(1000, 0, 0, 50, 100);

      expect(result.nextPlayerPts).toBeGreaterThanOrEqual(0);
      expect(result.nextEnemyPts).toBeGreaterThanOrEqual(0);
    });

    it('0 에테르 상황도 처리해야 함', () => {
      const result = calculateEtherTransfer(0, 0, 0, 0, 100);

      expect(result.nextPlayerPts).toBe(0);
      expect(result.nextEnemyPts).toBe(0);
      expect(result.movedPts).toBe(0);
    });

    it('적 HP가 음수여도 죽은 것으로 처리해야 함', () => {
      const result = calculateEtherTransfer(0, 0, 100, 50, -10);

      expect(result.nextPlayerPts).toBe(150);
      expect(result.nextEnemyPts).toBe(0);
    });

    it('큰 숫자도 올바르게 처리해야 함', () => {
      const result = calculateEtherTransfer(10000, 5000, 50000, 30000, 100);

      // 순 이동량: 5000
      expect(result.nextPlayerPts).toBe(55000);
      expect(result.nextEnemyPts).toBe(25000);
      expect(result.movedPts).toBe(5000);
    });
  });
});
