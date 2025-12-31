/**
 * @file error-handling.ts
 * @description 시뮬레이터 통합 에러 처리 및 복구 시스템
 */

// ==================== 에러 타입 정의 ====================

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'worker' | 'simulation' | 'data' | 'network' | 'timeout' | 'validation' | 'unknown';

export interface SimulatorError extends Error {
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: number;
  context?: Record<string, unknown>;
  recoverable: boolean;
  retryCount?: number;
}

export interface ErrorLog {
  error: SimulatorError;
  handled: boolean;
  recovery?: string;
  stackTrace?: string;
}

// ==================== 에러 코드 정의 ====================

export const ERROR_CODES = {
  // Worker 에러
  WORKER_INIT_FAILED: { code: 'W001', category: 'worker' as const, severity: 'high' as const, recoverable: true },
  WORKER_CRASHED: { code: 'W002', category: 'worker' as const, severity: 'high' as const, recoverable: true },
  WORKER_TIMEOUT: { code: 'W003', category: 'worker' as const, severity: 'medium' as const, recoverable: true },
  WORKER_MESSAGE_FAILED: { code: 'W004', category: 'worker' as const, severity: 'medium' as const, recoverable: true },

  // 시뮬레이션 에러
  SIM_INVALID_CONFIG: { code: 'S001', category: 'simulation' as const, severity: 'high' as const, recoverable: false },
  SIM_BATTLE_FAILED: { code: 'S002', category: 'simulation' as const, severity: 'medium' as const, recoverable: true },
  SIM_INFINITE_LOOP: { code: 'S003', category: 'simulation' as const, severity: 'high' as const, recoverable: true },
  SIM_MEMORY_EXCEEDED: { code: 'S004', category: 'simulation' as const, severity: 'critical' as const, recoverable: false },

  // 데이터 에러
  DATA_CARD_NOT_FOUND: { code: 'D001', category: 'data' as const, severity: 'medium' as const, recoverable: false },
  DATA_ENEMY_NOT_FOUND: { code: 'D002', category: 'data' as const, severity: 'medium' as const, recoverable: false },
  DATA_PARSE_FAILED: { code: 'D003', category: 'data' as const, severity: 'high' as const, recoverable: false },
  DATA_VALIDATION_FAILED: { code: 'D004', category: 'data' as const, severity: 'medium' as const, recoverable: false },

  // 타임아웃 에러
  TIMEOUT_TASK: { code: 'T001', category: 'timeout' as const, severity: 'medium' as const, recoverable: true },
  TIMEOUT_POOL: { code: 'T002', category: 'timeout' as const, severity: 'high' as const, recoverable: true },
  TIMEOUT_BATCH: { code: 'T003', category: 'timeout' as const, severity: 'medium' as const, recoverable: true },

  // 네트워크 에러 (분산 처리용)
  NETWORK_CONNECTION_FAILED: { code: 'N001', category: 'network' as const, severity: 'high' as const, recoverable: true },
  NETWORK_SYNC_FAILED: { code: 'N002', category: 'network' as const, severity: 'medium' as const, recoverable: true },

  // 일반 에러
  UNKNOWN: { code: 'X001', category: 'unknown' as const, severity: 'medium' as const, recoverable: false },
};

// ==================== 에러 팩토리 ====================

export function createError(
  codeKey: keyof typeof ERROR_CODES,
  message: string,
  context?: Record<string, unknown>
): SimulatorError {
  const errorDef = ERROR_CODES[codeKey];

  const error = new Error(message) as SimulatorError;
  error.code = errorDef.code;
  error.category = errorDef.category;
  error.severity = errorDef.severity;
  error.recoverable = errorDef.recoverable;
  error.timestamp = Date.now();
  error.context = context;
  error.retryCount = 0;

  return error;
}

// ==================== 에러 핸들러 ====================

export interface ErrorHandlerOptions {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  onError?: (error: SimulatorError) => void;
  onRetry?: (error: SimulatorError, attempt: number) => void;
  onRecovery?: (error: SimulatorError) => void;
  onFatal?: (error: SimulatorError) => void;
}

const DEFAULT_OPTIONS: ErrorHandlerOptions = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
};

export class ErrorHandler {
  private options: ErrorHandlerOptions;
  private errorLog: ErrorLog[] = [];
  private errorCounts: Map<string, number> = new Map();

  constructor(options: Partial<ErrorHandlerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * 에러 처리 및 복구 시도
   */
  async handle<T>(
    operation: () => Promise<T>,
    errorCode: keyof typeof ERROR_CODES,
    context?: Record<string, unknown>
  ): Promise<T> {
    let lastError: SimulatorError | null = null;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (err) {
        lastError = this.wrapError(err, errorCode, context);
        lastError.retryCount = attempt;

        this.logError(lastError, attempt < this.options.maxRetries);

        // 복구 불가능한 에러는 즉시 throw
        if (!lastError.recoverable) {
          this.options.onFatal?.(lastError);
          throw lastError;
        }

        // 최대 재시도 횟수 초과
        if (attempt >= this.options.maxRetries) {
          this.options.onFatal?.(lastError);
          throw lastError;
        }

        // 재시도 콜백
        this.options.onRetry?.(lastError, attempt + 1);

        // 대기 (지수 백오프)
        const delay = this.options.exponentialBackoff
          ? this.options.retryDelay * Math.pow(2, attempt)
          : this.options.retryDelay;

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * 동기 작업 에러 처리
   */
  handleSync<T>(
    operation: () => T,
    errorCode: keyof typeof ERROR_CODES,
    context?: Record<string, unknown>
  ): T {
    try {
      return operation();
    } catch (err) {
      const error = this.wrapError(err, errorCode, context);
      this.logError(error, false);
      this.options.onError?.(error);
      throw error;
    }
  }

  /**
   * 에러 래핑
   */
  private wrapError(
    err: unknown,
    errorCode: keyof typeof ERROR_CODES,
    context?: Record<string, unknown>
  ): SimulatorError {
    if (this.isSimulatorError(err)) {
      return err;
    }

    const message = err instanceof Error ? err.message : String(err);
    return createError(errorCode, message, context);
  }

  /**
   * SimulatorError 타입 가드
   */
  private isSimulatorError(err: unknown): err is SimulatorError {
    return (
      err instanceof Error &&
      'code' in err &&
      'category' in err &&
      'severity' in err
    );
  }

  /**
   * 에러 로깅
   */
  private logError(error: SimulatorError, willRetry: boolean): void {
    const log: ErrorLog = {
      error,
      handled: willRetry,
      recovery: willRetry ? 'retry' : undefined,
      stackTrace: error.stack,
    };

    this.errorLog.push(log);

    // 에러 카운트 업데이트
    const count = this.errorCounts.get(error.code) || 0;
    this.errorCounts.set(error.code, count + 1);

    // 콜백 호출
    this.options.onError?.(error);
  }

  /**
   * 대기
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 에러 로그 조회
   */
  getErrorLog(): ErrorLog[] {
    return [...this.errorLog];
  }

  /**
   * 에러 통계 조회
   */
  getErrorStats(): { byCode: Record<string, number>; byCategory: Record<string, number>; bySeverity: Record<string, number> } {
    const byCode: Record<string, number> = Object.fromEntries(this.errorCounts);
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const log of this.errorLog) {
      byCategory[log.error.category] = (byCategory[log.error.category] || 0) + 1;
      bySeverity[log.error.severity] = (bySeverity[log.error.severity] || 0) + 1;
    }

    return { byCode, byCategory, bySeverity };
  }

  /**
   * 로그 초기화
   */
  clearLog(): void {
    this.errorLog = [];
    this.errorCounts.clear();
  }
}

// ==================== 타임아웃 유틸리티 ====================

export interface TimeoutOptions {
  timeout: number;
  errorCode?: keyof typeof ERROR_CODES;
  onTimeout?: () => void;
}

export async function withTimeout<T>(
  promise: Promise<T>,
  options: TimeoutOptions
): Promise<T> {
  const { timeout, errorCode = 'TIMEOUT_TASK', onTimeout } = options;

  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      onTimeout?.();
      reject(createError(errorCode, `Operation timed out after ${timeout}ms`));
    }, timeout);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

// ==================== 회로 차단기 (Circuit Breaker) ====================

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenRequests: number;
}

export type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private lastFailure = 0;
  private halfOpenSuccesses = 0;
  private options: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      resetTimeout: options.resetTimeout ?? 30000,
      halfOpenRequests: options.halfOpenRequests ?? 3,
    };
  }

  /**
   * 작업 실행
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure >= this.options.resetTimeout) {
        this.state = 'half-open';
        this.halfOpenSuccesses = 0;
      } else {
        throw createError('WORKER_CRASHED', 'Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * 성공 처리
   */
  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.options.halfOpenRequests) {
        this.reset();
      }
    } else {
      this.failures = 0;
    }
  }

  /**
   * 실패 처리
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.failures >= this.options.failureThreshold) {
      this.state = 'open';
    }
  }

  /**
   * 상태 리셋
   */
  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.halfOpenSuccesses = 0;
  }

  /**
   * 현재 상태
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * 통계
   */
  getStats(): { state: CircuitState; failures: number; lastFailure: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailure,
    };
  }
}

// ==================== 복구 전략 ====================

export interface RecoveryStrategy<T> {
  name: string;
  canRecover: (error: SimulatorError) => boolean;
  recover: (error: SimulatorError, context?: Record<string, unknown>) => Promise<T> | T;
}

export class RecoveryManager<T> {
  private strategies: RecoveryStrategy<T>[] = [];

  /**
   * 복구 전략 등록
   */
  register(strategy: RecoveryStrategy<T>): void {
    this.strategies.push(strategy);
  }

  /**
   * 복구 시도
   */
  async tryRecover(error: SimulatorError, context?: Record<string, unknown>): Promise<T | null> {
    for (const strategy of this.strategies) {
      if (strategy.canRecover(error)) {
        try {
          return await strategy.recover(error, context);
        } catch {
          // 이 전략 실패, 다음 전략 시도
          continue;
        }
      }
    }
    return null;
  }
}

// ==================== 싱글톤 에러 핸들러 ====================

export const globalErrorHandler = new ErrorHandler({
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  onError: (error) => {
    console.error(`[${error.code}] ${error.category}/${error.severity}: ${error.message}`);
  },
  onFatal: (error) => {
    console.error(`[FATAL] ${error.code}: ${error.message}`);
  },
});

// ==================== 헬퍼 함수 ====================

/**
 * 안전한 비동기 작업 실행
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback: T,
  errorCode: keyof typeof ERROR_CODES = 'UNKNOWN'
): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    const error = createError(errorCode, err instanceof Error ? err.message : String(err));
    console.warn(`[${error.code}] Falling back: ${error.message}`);
    return fallback;
  }
}

/**
 * 안전한 동기 작업 실행
 */
export function safeSync<T>(
  operation: () => T,
  fallback: T,
  errorCode: keyof typeof ERROR_CODES = 'UNKNOWN'
): T {
  try {
    return operation();
  } catch (err) {
    const error = createError(errorCode, err instanceof Error ? err.message : String(err));
    console.warn(`[${error.code}] Falling back: ${error.message}`);
    return fallback;
  }
}

/**
 * 에러 메시지 포매팅
 */
export function formatError(error: SimulatorError): string {
  const lines = [
    `Error: ${error.message}`,
    `  Code: ${error.code}`,
    `  Category: ${error.category}`,
    `  Severity: ${error.severity}`,
    `  Recoverable: ${error.recoverable}`,
    `  Time: ${new Date(error.timestamp).toISOString()}`,
  ];

  if (error.context) {
    lines.push(`  Context: ${JSON.stringify(error.context)}`);
  }

  if (error.retryCount !== undefined) {
    lines.push(`  Retry Count: ${error.retryCount}`);
  }

  return lines.join('\n');
}
