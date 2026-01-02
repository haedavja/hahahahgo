/**
 * @file logger.test.ts
 * @description 구조화된 로깅 시스템 테스트
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { logger, battleLogger, shopLogger, growthLogger } from './logger';

describe('logger', () => {
  beforeEach(() => {
    // 매 테스트 전 히스토리 초기화
    logger.clearHistory();
    // 기본 설정으로 리셋
    logger.configure({ enabled: true, minLevel: 'debug', maxHistory: 100 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('configure', () => {
    it('로거 설정을 변경할 수 있다', () => {
      logger.configure({ minLevel: 'warn' });

      logger.debug('Test', 'Debug message');
      logger.info('Test', 'Info message');
      logger.warn('Test', 'Warn message');

      const history = logger.getHistory();
      // debug, info는 기록되지 않음
      expect(history.length).toBe(1);
      expect(history[0].level).toBe('warn');
    });

    it('로깅을 비활성화할 수 있다', () => {
      logger.configure({ enabled: false });

      logger.info('Test', 'Should not be logged');

      expect(logger.getHistory().length).toBe(0);
    });
  });

  describe('setProductionMode', () => {
    it('프로덕션 모드에서는 warn, error만 기록된다', () => {
      logger.setProductionMode();

      logger.debug('Test', 'Debug');
      logger.info('Test', 'Info');
      logger.warn('Test', 'Warning');
      logger.error('Test', 'Error');

      const history = logger.getHistory();
      expect(history.length).toBe(2);
      expect(history[0].level).toBe('warn');
      expect(history[1].level).toBe('error');
    });
  });

  describe('log methods', () => {
    it('debug 로그를 기록한다', () => {
      logger.debug('Battle', 'Player attacked', { damage: 10 });

      const history = logger.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].level).toBe('debug');
      expect(history[0].category).toBe('Battle');
      expect(history[0].message).toBe('Player attacked');
      expect(history[0].data).toEqual({ damage: 10 });
    });

    it('info 로그를 기록한다', () => {
      logger.info('Shop', 'Item purchased');

      const history = logger.getHistory();
      expect(history[0].level).toBe('info');
      expect(history[0].category).toBe('Shop');
    });

    it('warn 로그를 기록한다', () => {
      logger.warn('System', 'Low memory');

      const history = logger.getHistory();
      expect(history[0].level).toBe('warn');
    });

    it('error 로그를 기록한다', () => {
      const error = new Error('Test error');
      logger.error('System', 'Fatal error', error);

      const history = logger.getHistory();
      expect(history[0].level).toBe('error');
      expect(history[0].data).toBe(error);
    });

    it('타임스탬프가 포함된다', () => {
      logger.info('Test', 'Message');

      const history = logger.getHistory();
      expect(history[0].timestamp).toBeDefined();
      expect(new Date(history[0].timestamp).getTime()).not.toBeNaN();
    });
  });

  describe('history management', () => {
    it('히스토리를 가져온다', () => {
      logger.info('A', '1');
      logger.info('B', '2');

      const history = logger.getHistory();
      expect(history.length).toBe(2);
    });

    it('히스토리를 초기화한다', () => {
      logger.info('Test', 'Message');
      expect(logger.getHistory().length).toBe(1);

      logger.clearHistory();
      expect(logger.getHistory().length).toBe(0);
    });

    it('최대 히스토리 크기를 초과하면 오래된 항목을 삭제한다', () => {
      logger.configure({ maxHistory: 3 });

      logger.info('A', '1');
      logger.info('B', '2');
      logger.info('C', '3');
      logger.info('D', '4');

      const history = logger.getHistory();
      expect(history.length).toBe(3);
      expect(history[0].message).toBe('2');
      expect(history[2].message).toBe('4');
    });

    it('카테고리별로 필터링할 수 있다', () => {
      logger.info('Battle', 'Hit');
      logger.info('Shop', 'Purchase');
      logger.info('Battle', 'Block');
      logger.info('Growth', 'Level up');

      const battleLogs = logger.getHistoryByCategory('Battle');
      expect(battleLogs.length).toBe(2);
      expect(battleLogs[0].message).toBe('Hit');
      expect(battleLogs[1].message).toBe('Block');
    });

    it('히스토리 복사본을 반환한다 (원본 수정 방지)', () => {
      logger.info('Test', 'Message');

      const history = logger.getHistory();
      history.push({
        timestamp: '',
        level: 'info',
        category: 'Fake',
        message: 'Fake'
      });

      expect(logger.getHistory().length).toBe(1);
    });
  });

  describe('console groups', () => {
    it('그룹을 시작하고 종료할 수 있다', () => {
      const groupSpy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
      const groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

      logger.group('Battle', 'Turn 1');
      logger.groupEnd();

      expect(groupSpy).toHaveBeenCalledWith('[Battle] Turn 1');
      expect(groupEndSpy).toHaveBeenCalled();
    });

    it('비활성화 상태에서는 그룹을 생성하지 않는다', () => {
      logger.configure({ enabled: false });
      const groupSpy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});

      logger.group('Test', 'Label');

      expect(groupSpy).not.toHaveBeenCalled();
    });
  });

  describe('performance timing', () => {
    it('time과 timeEnd를 호출한다', () => {
      const timeSpy = vi.spyOn(console, 'time').mockImplementation(() => {});
      const timeEndSpy = vi.spyOn(console, 'timeEnd').mockImplementation(() => {});

      logger.time('operation');
      logger.timeEnd('operation');

      expect(timeSpy).toHaveBeenCalledWith('operation');
      expect(timeEndSpy).toHaveBeenCalledWith('operation');
    });

    it('비활성화 상태에서는 타이밍을 측정하지 않는다', () => {
      logger.configure({ enabled: false });
      const timeSpy = vi.spyOn(console, 'time').mockImplementation(() => {});

      logger.time('operation');

      expect(timeSpy).not.toHaveBeenCalled();
    });
  });
});

describe('category loggers', () => {
  beforeEach(() => {
    logger.clearHistory();
    logger.configure({ enabled: true, minLevel: 'debug' });
  });

  describe('battleLogger', () => {
    it('Battle 카테고리로 로그를 기록한다', () => {
      battleLogger.debug('Debug message');
      battleLogger.info('Info message', { hp: 100 });
      battleLogger.warn('Warning message');
      battleLogger.error('Error message', new Error('test'));

      const history = logger.getHistoryByCategory('Battle');
      expect(history.length).toBe(4);
      expect(history[0].category).toBe('Battle');
    });
  });

  describe('shopLogger', () => {
    it('Shop 카테고리로 로그를 기록한다', () => {
      shopLogger.info('Purchase completed', { item: 'sword' });

      const history = logger.getHistoryByCategory('Shop');
      expect(history.length).toBe(1);
      expect(history[0].category).toBe('Shop');
      expect(history[0].data).toEqual({ item: 'sword' });
    });
  });

  describe('growthLogger', () => {
    it('Growth 카테고리로 로그를 기록한다', () => {
      growthLogger.info('Level up');

      const history = logger.getHistoryByCategory('Growth');
      expect(history.length).toBe(1);
      expect(history[0].category).toBe('Growth');
    });
  });
});
