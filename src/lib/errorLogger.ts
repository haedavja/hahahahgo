/**
 * @file errorLogger.ts
 * @description 중앙 에러 로깅 시스템
 *
 * ## 기능
 * - 에러 수집 및 포맷팅
 * - 컨텍스트 정보 첨부 (게임 상태, 페이즈 등)
 * - 로컬 스토리지에 에러 히스토리 저장
 * - 개발 모드에서 콘솔 출력
 */

import type {
  ErrorLogEntry,
  ErrorContext,
  ErrorLoggerConfig
} from '../types';

// Re-export for backward compatibility
export type { ErrorLogEntry, ErrorContext };

const DEFAULT_CONFIG: ErrorLoggerConfig = {
  maxEntries: 50,
  storageKey: 'hahahahgo_error_log',
  enableConsole: true,
};

let config = { ...DEFAULT_CONFIG };

/**
 * UUID 생성 (간단 버전)
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 에러 로그 저장
 */
function saveToStorage(entries: ErrorLogEntry[]): void {
  try {
    const trimmed = entries.slice(-config.maxEntries);
    localStorage.setItem(config.storageKey, JSON.stringify(trimmed));
  } catch (e) {
    // 스토리지 용량 초과 시 경고만 출력
    if (config.enableConsole) {
      console.warn('[ErrorLogger] Storage full, unable to save logs:', e);
    }
  }
}

/**
 * 에러 로그 불러오기
 */
export function getErrorLog(): ErrorLogEntry[] {
  try {
    const data = localStorage.getItem(config.storageKey);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * 에러 로그 초기화
 */
export function clearErrorLog(): void {
  try {
    localStorage.removeItem(config.storageKey);
  } catch (e) {
    // 로컬스토리지 제거 실패 시 경고 출력
    if (config.enableConsole) {
      console.warn('[ErrorLogger] Failed to clear error log:', e);
    }
  }
}

/**
 * 에러 로깅
 * @param error - 에러 객체 또는 메시지
 * @param context - 추가 컨텍스트 정보
 */
export function logError(
  error: Error | string,
  context?: ErrorContext
): ErrorLogEntry {
  const entry: ErrorLogEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    message: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
    context,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
  };

  // 기존 로그에 추가
  const entries = getErrorLog();
  entries.push(entry);
  saveToStorage(entries);

  // 콘솔 출력 (개발 모드)
  if (config.enableConsole) {
    console.error('[ErrorLogger]', entry.message, {
      context: entry.context,
      stack: entry.stack,
    });
  }

  return entry;
}

/**
 * 경고 로깅 (에러보다 낮은 심각도)
 */
export function logWarning(
  message: string,
  context?: ErrorContext
): void {
  if (config.enableConsole) {
    console.warn('[ErrorLogger:Warning]', message, context);
  }
}

/**
 * 에러 로거 설정 변경
 */
export function configureErrorLogger(
  newConfig: Partial<ErrorLoggerConfig>
): void {
  config = { ...config, ...newConfig };
}

/**
 * 에러 바운더리용 핸들러
 * ErrorBoundary.componentDidCatch에서 호출
 */
export function handleBoundaryError(
  error: Error,
  errorInfo: { componentStack?: string; context?: string; severity?: 'error' | 'warning' }
): ErrorLogEntry {
  const contextName = errorInfo.context || 'ErrorBoundary';
  const severity = errorInfo.severity || 'error';

  // 경고 수준이면 콘솔에만 출력
  if (severity === 'warning') {
    logWarning(`[${contextName}] ${error.message}`, {
      componentName: contextName,
      additionalInfo: { componentStack: errorInfo.componentStack },
    });
  }

  return logError(error, {
    componentName: contextName,
    additionalInfo: {
      componentStack: errorInfo.componentStack,
      severity,
    },
  });
}

/**
 * Promise 에러 핸들러
 * window.onunhandledrejection에서 사용
 */
export function handleUnhandledRejection(
  event: PromiseRejectionEvent
): ErrorLogEntry {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason);

  return logError(reason instanceof Error ? reason : message, {
    action: 'unhandledRejection',
  });
}

/**
 * 전역 에러 핸들러
 * window.onerror에서 사용
 */
export function handleGlobalError(
  message: string,
  source?: string,
  lineno?: number,
  colno?: number,
  error?: Error
): ErrorLogEntry {
  return logError(error || message, {
    action: 'globalError',
    additionalInfo: {
      source,
      lineno,
      colno,
    },
  });
}

/**
 * 전역 에러 핸들러 등록
 * 앱 초기화 시 호출
 */
export function setupGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  window.onerror = (message, source, lineno, colno, error) => {
    handleGlobalError(
      typeof message === 'string' ? message : 'Unknown error',
      source,
      lineno,
      colno,
      error
    );
    return false; // 기본 에러 처리 허용
  };
}

/**
 * 에러 리포트 생성 (디버깅용)
 */
export function generateErrorReport(): string {
  const entries = getErrorLog();
  const report = {
    generatedAt: new Date().toISOString(),
    totalErrors: entries.length,
    recentErrors: entries.slice(-10),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  };

  return JSON.stringify(report, null, 2);
}
