// @vitest-environment happy-dom
/**
 * @file errorLogger.test.ts
 * @description 에러 로깅 시스템 테스트
 *
 * ## 테스트 대상
 * - logError: 에러 로깅 및 저장
 * - getErrorLog: 에러 로그 조회
 * - clearErrorLog: 에러 로그 초기화
 * - handleBoundaryError: ErrorBoundary 핸들러
 *
 * ## 주요 테스트 케이스
 * - 에러 로깅 기본 동작
 * - 컨텍스트 정보 포함
 * - 로컬 스토리지 저장/조회
 * - 최대 항목 수 제한
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  logError,
  getErrorLog,
  clearErrorLog,
  handleBoundaryError,
  configureErrorLogger,
  generateErrorReport,
} from './errorLogger';

describe('errorLogger', () => {
  beforeEach(() => {
    // 각 테스트 전 로그 초기화
    clearErrorLog();
    // 콘솔 에러 모킹
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('logError', () => {
    it('문자열 에러를 로깅해야 함', () => {
      const entry = logError('테스트 에러');

      expect(entry.message).toBe('테스트 에러');
      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeDefined();
    });

    it('Error 객체를 로깅해야 함', () => {
      const error = new Error('에러 객체');
      const entry = logError(error);

      expect(entry.message).toBe('에러 객체');
      expect(entry.stack).toBeDefined();
    });

    it('컨텍스트 정보를 포함해야 함', () => {
      const entry = logError('컨텍스트 에러', {
        phase: 'battle',
        action: 'attack',
      });

      expect(entry.context?.phase).toBe('battle');
      expect(entry.context?.action).toBe('attack');
    });

    it('로컬 스토리지에 저장해야 함', () => {
      logError('저장 테스트');

      const logs = getErrorLog();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe('저장 테스트');
    });
  });

  describe('getErrorLog', () => {
    it('빈 로그를 반환해야 함', () => {
      const logs = getErrorLog();
      expect(logs).toEqual([]);
    });

    it('여러 에러를 순서대로 반환해야 함', () => {
      logError('첫 번째');
      logError('두 번째');
      logError('세 번째');

      const logs = getErrorLog();
      expect(logs.length).toBe(3);
      expect(logs[0].message).toBe('첫 번째');
      expect(logs[2].message).toBe('세 번째');
    });
  });

  describe('clearErrorLog', () => {
    it('로그를 초기화해야 함', () => {
      logError('테스트');
      expect(getErrorLog().length).toBe(1);

      clearErrorLog();
      expect(getErrorLog().length).toBe(0);
    });
  });

  describe('handleBoundaryError', () => {
    it('ErrorBoundary 에러를 로깅해야 함', () => {
      const error = new Error('바운더리 에러');
      const entry = handleBoundaryError(error, {
        componentStack: '<App>\n  <Battle>',
      });

      expect(entry.context?.componentName).toBe('ErrorBoundary');
      expect(entry.context?.additionalInfo?.componentStack).toBeDefined();
    });
  });

  describe('configureErrorLogger', () => {
    it('최대 항목 수를 제한해야 함', () => {
      configureErrorLogger({ maxEntries: 3 });

      logError('1');
      logError('2');
      logError('3');
      logError('4');
      logError('5');

      const logs = getErrorLog();
      expect(logs.length).toBe(3);
      expect(logs[0].message).toBe('3'); // 가장 오래된 것이 삭제됨
    });
  });

  describe('generateErrorReport', () => {
    it('JSON 형식의 리포트를 생성해야 함', () => {
      logError('리포트 테스트');

      const report = generateErrorReport();
      const parsed = JSON.parse(report);

      expect(parsed.totalErrors).toBe(1);
      expect(parsed.recentErrors).toHaveLength(1);
      expect(parsed.generatedAt).toBeDefined();
    });
  });
});
