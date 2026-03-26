/**
 * @file battleConstants.test.ts
 * @description 전투 시스템 공통 상수 테스트
 */

import { describe, it, expect } from 'vitest';
import { TIMING } from './battleConstants';

describe('battleConstants', () => {
  describe('TIMING', () => {
    it('모든 타이밍 상수가 정의되어 있다', () => {
      expect(TIMING.CARD_EXECUTION_DELAY).toBeDefined();
      expect(TIMING.CARD_SHAKE_DURATION).toBeDefined();
      expect(TIMING.CARD_FADEOUT_DELAY).toBeDefined();
      expect(TIMING.CARD_DISAPPEAR_START).toBeDefined();
      expect(TIMING.CARD_DISAPPEAR_DURATION).toBeDefined();
      expect(TIMING.AUTO_PROGRESS_DELAY).toBeDefined();
      expect(TIMING.MULTI_HIT_DELAY).toBeDefined();
      expect(TIMING.ETHER_CALC_START_DELAY).toBeDefined();
      expect(TIMING.ETHER_MULTIPLY_DELAY).toBeDefined();
      expect(TIMING.ETHER_DEFLATION_DELAY).toBeDefined();
    });

    it('모든 타이밍 상수가 양수다', () => {
      Object.values(TIMING).forEach(value => {
        expect(value).toBeGreaterThan(0);
      });
    });

    it('카드 실행 딜레이가 250ms다', () => {
      expect(TIMING.CARD_EXECUTION_DELAY).toBe(250);
    });

    it('카드 흔들림 시간이 200ms다', () => {
      expect(TIMING.CARD_SHAKE_DURATION).toBe(200);
    });

    it('자동 진행 딜레이가 450ms 이상이다', () => {
      // 450ms 미만이면 카드 실행 버그 발생 (CLAUDE.md 참조)
      expect(TIMING.AUTO_PROGRESS_DELAY).toBeGreaterThanOrEqual(450);
    });

    it('다중 타격 딜레이가 100ms다', () => {
      expect(TIMING.MULTI_HIT_DELAY).toBe(100);
    });

    it('에테르 계산 딜레이가 올바르다', () => {
      expect(TIMING.ETHER_CALC_START_DELAY).toBe(400);
      expect(TIMING.ETHER_MULTIPLY_DELAY).toBe(600);
      expect(TIMING.ETHER_DEFLATION_DELAY).toBe(400);
    });

    it('카드 소멸 타이밍이 올바르다', () => {
      expect(TIMING.CARD_FADEOUT_DELAY).toBe(150);
      expect(TIMING.CARD_DISAPPEAR_START).toBe(150);
      expect(TIMING.CARD_DISAPPEAR_DURATION).toBe(300);
    });

    it('카드 소멸 시작이 페이드아웃 딜레이와 같거나 크다', () => {
      expect(TIMING.CARD_DISAPPEAR_START).toBeGreaterThanOrEqual(TIMING.CARD_FADEOUT_DELAY);
    });
  });
});
