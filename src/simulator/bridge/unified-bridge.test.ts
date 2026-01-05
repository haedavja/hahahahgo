/**
 * @file unified-bridge.test.ts
 * @description 통합 브릿지 서비스 테스트
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initializeBridge,
  cleanupBridge,
  startNewRun,
  finishRun,
  checkSyncHealth,
  generateDiagnosticReport,
} from './index';

describe('UnifiedBridge', () => {
  beforeEach(() => {
    // 각 테스트 전 브릿지 정리
    cleanupBridge();
  });

  afterEach(() => {
    // 각 테스트 후 브릿지 정리
    cleanupBridge();
  });

  describe('initializeBridge', () => {
    it('브릿지를 초기화함', () => {
      expect(() => initializeBridge({ autoVerify: false })).not.toThrow();
    });

    it('중복 초기화 시 경고만 출력', () => {
      initializeBridge({ autoVerify: false });
      expect(() => initializeBridge({ autoVerify: false })).not.toThrow();
    });

    it('옵션 없이 초기화 가능', () => {
      expect(() => initializeBridge()).not.toThrow();
    });
  });

  describe('cleanupBridge', () => {
    it('초기화된 브릿지를 정리함', () => {
      initializeBridge({ autoVerify: false });
      expect(() => cleanupBridge()).not.toThrow();
    });

    it('초기화되지 않은 상태에서도 정리 가능', () => {
      expect(() => cleanupBridge()).not.toThrow();
    });
  });

  describe('startNewRun', () => {
    it('런 ID를 반환함', () => {
      initializeBridge({ autoVerify: false });
      const runId = startNewRun(['card1', 'card2'], ['relic1']);

      expect(runId).toBeDefined();
      expect(typeof runId).toBe('string');
      expect(runId.startsWith('run_')).toBe(true);
    });

    it('빈 덱으로 시작 가능', () => {
      initializeBridge({ autoVerify: false });
      const runId = startNewRun([]);

      expect(runId).toBeDefined();
    });

    it('연속 런 시작 시 다른 ID 생성', () => {
      initializeBridge({ autoVerify: false });
      const runId1 = startNewRun(['card1']);
      const runId2 = startNewRun(['card2']);

      expect(runId1).not.toBe(runId2);
    });
  });

  describe('finishRun', () => {
    it('런을 정상 종료함', () => {
      initializeBridge({ autoVerify: false });
      startNewRun(['card1', 'card2']);

      expect(() => finishRun(true, 10, ['card1', 'card2', 'card3'])).not.toThrow();
    });

    it('런 실패로 종료함', () => {
      initializeBridge({ autoVerify: false });
      startNewRun(['card1']);

      expect(() => finishRun(false, 5, ['card1'])).not.toThrow();
    });

    it('유물 포함하여 종료', () => {
      initializeBridge({ autoVerify: false });
      startNewRun(['card1'], ['relic1']);

      expect(() => finishRun(true, 15, ['card1'], ['relic1', 'relic2'])).not.toThrow();
    });
  });

  describe('checkSyncHealth', () => {
    it('동기화 상태를 확인함', () => {
      initializeBridge({ autoVerify: false });
      const health = checkSyncHealth();

      expect(health).toBeDefined();
      expect(typeof health.healthy).toBe('boolean');
      expect(typeof health.score).toBe('number');
      expect(typeof health.message).toBe('string');
    });
  });

  describe('generateDiagnosticReport', () => {
    it('진단 보고서를 생성함', () => {
      initializeBridge({ autoVerify: false });
      startNewRun(['card1']);

      const report = generateDiagnosticReport();

      expect(report).toBeDefined();
      expect(typeof report).toBe('string');
    });
  });
});
