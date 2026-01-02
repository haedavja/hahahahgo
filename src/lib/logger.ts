/**
 * @file logger.ts
 * @description 구조화된 로깅 시스템
 *
 * 사용법:
 * import { logger } from '@/lib/logger';
 * logger.info('Battle', 'Player attacked', { damage: 10 });
 * logger.error('Shop', 'Purchase failed', error);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
}

interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  maxHistory: number;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '#9ca3af',
  info: '#60a5fa',
  warn: '#fbbf24',
  error: '#f87171',
};

class Logger {
  private config: LoggerConfig = {
    enabled: true,
    minLevel: 'debug',
    maxHistory: 100,
  };

  private history: LogEntry[] = [];

  /**
   * 로거 설정
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 프로덕션 모드 설정 (warn, error만 출력)
   */
  setProductionMode(): void {
    this.config.minLevel = 'warn';
  }

  /**
   * 디버그 로그
   */
  debug(category: string, message: string, data?: unknown): void {
    this.log('debug', category, message, data);
  }

  /**
   * 정보 로그
   */
  info(category: string, message: string, data?: unknown): void {
    this.log('info', category, message, data);
  }

  /**
   * 경고 로그
   */
  warn(category: string, message: string, data?: unknown): void {
    this.log('warn', category, message, data);
  }

  /**
   * 에러 로그
   */
  error(category: string, message: string, error?: unknown): void {
    this.log('error', category, message, error);
  }

  /**
   * 그룹 시작 (접을 수 있는 로그 그룹)
   */
  group(category: string, label: string): void {
    if (!this.config.enabled) return;
    console.groupCollapsed(`[${category}] ${label}`);
  }

  /**
   * 그룹 종료
   */
  groupEnd(): void {
    if (!this.config.enabled) return;
    console.groupEnd();
  }

  /**
   * 성능 측정 시작
   */
  time(label: string): void {
    if (!this.config.enabled) return;
    console.time(label);
  }

  /**
   * 성능 측정 종료
   */
  timeEnd(label: string): void {
    if (!this.config.enabled) return;
    console.timeEnd(label);
  }

  /**
   * 로그 히스토리 가져오기
   */
  getHistory(): LogEntry[] {
    return [...this.history];
  }

  /**
   * 로그 히스토리 초기화
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * 특정 카테고리 로그만 필터링
   */
  getHistoryByCategory(category: string): LogEntry[] {
    return this.history.filter(entry => entry.category === category);
  }

  /**
   * 내부 로그 처리
   */
  private log(level: LogLevel, category: string, message: string, data?: unknown): void {
    if (!this.config.enabled) return;
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.minLevel]) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };

    // 히스토리에 추가
    this.history.push(entry);
    if (this.history.length > this.config.maxHistory) {
      this.history.shift();
    }

    // 콘솔 출력
    const color = LOG_COLORS[level];
    const prefix = `%c[${level.toUpperCase()}]%c [${category}]`;
    const styles = [`color: ${color}; font-weight: bold`, 'color: inherit'];

    if (data !== undefined) {
      console[level === 'debug' ? 'log' : level](prefix, ...styles, message, data);
    } else {
      console[level === 'debug' ? 'log' : level](prefix, ...styles, message);
    }
  }
}

// 싱글톤 인스턴스
export const logger = new Logger();

// 개발 모드가 아닐 때 프로덕션 모드로 설정
if (typeof window !== 'undefined' && import.meta.env.PROD) {
  logger.setProductionMode();
}

// 카테고리별 편의 로거
export const battleLogger = {
  debug: (msg: string, data?: unknown) => logger.debug('Battle', msg, data),
  info: (msg: string, data?: unknown) => logger.info('Battle', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('Battle', msg, data),
  error: (msg: string, error?: unknown) => logger.error('Battle', msg, error),
};

export const shopLogger = {
  debug: (msg: string, data?: unknown) => logger.debug('Shop', msg, data),
  info: (msg: string, data?: unknown) => logger.info('Shop', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('Shop', msg, data),
  error: (msg: string, error?: unknown) => logger.error('Shop', msg, error),
};

export const growthLogger = {
  debug: (msg: string, data?: unknown) => logger.debug('Growth', msg, data),
  info: (msg: string, data?: unknown) => logger.info('Growth', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('Growth', msg, data),
  error: (msg: string, error?: unknown) => logger.error('Growth', msg, error),
};

export default logger;
