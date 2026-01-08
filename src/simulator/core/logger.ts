/**
 * @file logger.ts
 * @description 통합 로깅 시스템 - console.log 대체, 레벨 기반 로깅, 포맷팅
 */

// ==================== 로그 레벨 ====================

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
  SILENT = 6,
}

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.TRACE]: 'TRACE',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
  [LogLevel.SILENT]: 'SILENT',
};

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.TRACE]: '\x1b[90m',    // Gray
  [LogLevel.DEBUG]: '\x1b[36m',    // Cyan
  [LogLevel.INFO]: '\x1b[32m',     // Green
  [LogLevel.WARN]: '\x1b[33m',     // Yellow
  [LogLevel.ERROR]: '\x1b[31m',    // Red
  [LogLevel.FATAL]: '\x1b[35m',    // Magenta
  [LogLevel.SILENT]: '',
};

const RESET_COLOR = '\x1b[0m';

// ==================== 로그 엔트리 ====================

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
  error?: Error;
  context?: Record<string, unknown>;
  duration?: number;
}

export interface LogFormatter {
  format(entry: LogEntry): string;
}

export interface LogTransport {
  log(entry: LogEntry): void;
  flush?(): Promise<void>;
}

// ==================== 포매터 ====================

export class SimpleFormatter implements LogFormatter {
  private useColors: boolean;

  constructor(useColors: boolean = true) {
    this.useColors = useColors;
  }

  format(entry: LogEntry): string {
    const time = entry.timestamp.toISOString().slice(11, 23);
    const level = LOG_LEVEL_NAMES[entry.level].padEnd(5);
    const module = entry.module.padEnd(15);

    let message = entry.message;
    if (entry.duration !== undefined) {
      message += ` (${entry.duration.toFixed(2)}ms)`;
    }

    if (this.useColors) {
      const color = LOG_LEVEL_COLORS[entry.level];
      return `${color}[${time}] ${level}${RESET_COLOR} [${module}] ${message}`;
    }

    return `[${time}] ${level} [${module}] ${message}`;
  }
}

export class JsonFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    return JSON.stringify({
      timestamp: entry.timestamp.toISOString(),
      level: LOG_LEVEL_NAMES[entry.level],
      module: entry.module,
      message: entry.message,
      data: entry.data,
      error: entry.error ? {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack,
      } : undefined,
      context: entry.context,
      duration: entry.duration,
    });
  }
}

// ==================== 트랜스포트 ====================

export class ConsoleTransport implements LogTransport {
  private formatter: LogFormatter;
  private minLevel: LogLevel;

  constructor(formatter?: LogFormatter, minLevel: LogLevel = LogLevel.DEBUG) {
    this.formatter = formatter || new SimpleFormatter();
    this.minLevel = minLevel;
  }

  log(entry: LogEntry): void {
    if (entry.level < this.minLevel) return;

    const formatted = this.formatter.format(entry);

    switch (entry.level) {
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formatted);
        if (entry.error) console.error(entry.error);
        if (entry.data) console.error(entry.data);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
  }
}

export class MemoryTransport implements LogTransport {
  private logs: LogEntry[] = [];
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  log(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxSize) {
      this.logs.shift();
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(l => l.level === level);
  }

  getLogsByModule(module: string): LogEntry[] {
    return this.logs.filter(l => l.module === module);
  }

  clear(): void {
    this.logs = [];
  }

  search(query: {
    level?: LogLevel;
    module?: string;
    message?: string;
    from?: Date;
    to?: Date;
  }): LogEntry[] {
    return this.logs.filter(entry => {
      if (query.level !== undefined && entry.level !== query.level) return false;
      if (query.module && !entry.module.includes(query.module)) return false;
      if (query.message && !entry.message.includes(query.message)) return false;
      if (query.from && entry.timestamp < query.from) return false;
      if (query.to && entry.timestamp > query.to) return false;
      return true;
    });
  }
}

export class FileTransport implements LogTransport {
  private buffer: string[] = [];
  private filePath: string;
  private bufferSize: number;
  private formatter: LogFormatter;

  constructor(filePath: string, bufferSize: number = 100) {
    this.filePath = filePath;
    this.bufferSize = bufferSize;
    this.formatter = new JsonFormatter();
  }

  log(entry: LogEntry): void {
    this.buffer.push(this.formatter.format(entry));

    if (this.buffer.length >= this.bufferSize) {
      this.flush().catch(err => console.error('Log flush failed:', err));
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const fs = await import('fs/promises');
    const content = this.buffer.join('\n') + '\n';
    this.buffer = [];

    await fs.appendFile(this.filePath, content, 'utf-8');
  }
}

// ==================== 메인 로거 ====================

export class Logger {
  private module: string;
  private transports: LogTransport[];
  private context: Record<string, unknown>;
  private timers: Map<string, number> = new Map();

  constructor(module: string, transports?: LogTransport[]) {
    this.module = module;
    this.transports = transports || [new ConsoleTransport()];
    this.context = {};
  }

  setContext(context: Record<string, unknown>): this {
    this.context = { ...this.context, ...context };
    return this;
  }

  clearContext(): this {
    this.context = {};
    return this;
  }

  child(subModule: string): Logger {
    const child = new Logger(`${this.module}:${subModule}`, this.transports);
    child.context = { ...this.context };
    return child;
  }

  private log(level: LogLevel, message: string, data?: unknown, error?: Error): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      module: this.module,
      message,
      data,
      error,
      context: Object.keys(this.context).length > 0 ? this.context : undefined,
    };

    for (const transport of this.transports) {
      transport.log(entry);
    }
  }

  trace(message: string, data?: unknown): void {
    this.log(LogLevel.TRACE, message, data);
  }

  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error | unknown, data?: unknown): void {
    const err = error instanceof Error ? error : undefined;
    const logData = error instanceof Error ? data : error;
    this.log(LogLevel.ERROR, message, logData, err);
  }

  fatal(message: string, error?: Error, data?: unknown): void {
    this.log(LogLevel.FATAL, message, data, error);
  }

  // ==================== 타이밍 ====================

  time(label: string): void {
    this.timers.set(label, performance.now());
  }

  timeEnd(label: string, message?: string): number {
    const start = this.timers.get(label);
    if (start === undefined) {
      this.warn(`Timer '${label}' does not exist`);
      return 0;
    }

    const duration = performance.now() - start;
    this.timers.delete(label);

    const entry: LogEntry = {
      timestamp: new Date(),
      level: LogLevel.DEBUG,
      module: this.module,
      message: message || `${label} completed`,
      duration,
    };

    for (const transport of this.transports) {
      transport.log(entry);
    }

    return duration;
  }

  async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.time(label);
    try {
      const result = await fn();
      this.timeEnd(label);
      return result;
    } catch (error) {
      this.timeEnd(label, `${label} failed`);
      throw error;
    }
  }

  // ==================== 그룹 ====================

  group(label: string): void {
    console.group(label);
  }

  groupEnd(): void {
    console.groupEnd();
  }

  // ==================== 진행률 ====================

  progress(current: number, total: number, label?: string): void {
    const percent = Math.round((current / total) * 100);
    const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
    const message = label
      ? `${label}: [${bar}] ${percent}% (${current}/${total})`
      : `[${bar}] ${percent}% (${current}/${total})`;

    if (typeof process !== 'undefined' && process.stdout?.clearLine) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(message);
    } else {
      this.info(message);
    }
  }

  progressEnd(label?: string): void {
    if (typeof process !== 'undefined' && typeof process.stdout?.clearLine === 'function') {
      process.stdout.write('\n');
    }
    if (label) {
      this.info(`${label} 완료`);
    }
  }

  // ==================== 테이블 ====================

  table(data: Record<string, unknown>[] | Record<string, unknown>, columns?: string[]): void {
    console.table(data, columns);
  }
}

// ==================== 글로벌 로거 관리 ====================

class LoggerManager {
  private loggers: Map<string, Logger> = new Map();
  private transports: LogTransport[] = [];
  private globalLevel: LogLevel = LogLevel.WARN;
  private memoryTransport?: MemoryTransport;

  constructor() {
    // 기본 콘솔 트랜스포트
    this.transports.push(new ConsoleTransport(new SimpleFormatter(), this.globalLevel));

    // 메모리 트랜스포트 (디버깅용)
    this.memoryTransport = new MemoryTransport(5000);
    this.transports.push(this.memoryTransport);
  }

  setLevel(level: LogLevel): void {
    this.globalLevel = level;
    // 기존 콘솔 트랜스포트 교체
    this.transports = this.transports.filter(t => !(t instanceof ConsoleTransport));
    this.transports.unshift(new ConsoleTransport(new SimpleFormatter(), level));
  }

  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  getLogger(module: string): Logger {
    if (!this.loggers.has(module)) {
      this.loggers.set(module, new Logger(module, this.transports));
    }
    return this.loggers.get(module)!;
  }

  getLogs(): LogEntry[] {
    return this.memoryTransport?.getLogs() || [];
  }

  searchLogs(query: Parameters<MemoryTransport['search']>[0]): LogEntry[] {
    return this.memoryTransport?.search(query) || [];
  }

  clearLogs(): void {
    this.memoryTransport?.clear();
  }

  async flushAll(): Promise<void> {
    for (const transport of this.transports) {
      if (transport.flush) {
        await transport.flush();
      }
    }
  }
}

// ==================== 싱글톤 인스턴스 ====================

export const loggerManager = new LoggerManager();

export function getLogger(module: string): Logger {
  return loggerManager.getLogger(module);
}

export function setLogLevel(level: LogLevel): void {
  loggerManager.setLevel(level);
}

// ==================== 유틸리티 ====================

export function formatError(error: Error): string {
  return `${error.name}: ${error.message}${error.stack ? '\n' + error.stack : ''}`;
}

export function createLogContext(context: Record<string, unknown>): Record<string, unknown> {
  return {
    ...context,
    timestamp: new Date().toISOString(),
    pid: typeof process !== 'undefined' ? process.pid : undefined,
  };
}

// ==================== 로그 레벨 파싱 ====================

export function parseLogLevel(level: string): LogLevel {
  const upper = level.toUpperCase();
  switch (upper) {
    case 'TRACE': return LogLevel.TRACE;
    case 'DEBUG': return LogLevel.DEBUG;
    case 'INFO': return LogLevel.INFO;
    case 'WARN': return LogLevel.WARN;
    case 'ERROR': return LogLevel.ERROR;
    case 'FATAL': return LogLevel.FATAL;
    case 'SILENT': return LogLevel.SILENT;
    default: return LogLevel.INFO;
  }
}

// 환경변수에서 로그 레벨 설정
if (typeof process !== 'undefined' && process.env?.LOG_LEVEL) {
  setLogLevel(parseLogLevel(process.env.LOG_LEVEL));
}

// config에서 로그 레벨 동기화
try {
  // 동적 import로 순환 의존성 방지
  import('./config').then(({ getConfig }) => {
    const configLevel = getConfig().logging.level;
    setLogLevel(parseLogLevel(configLevel));
  }).catch(() => {
    // config 로드 실패 시 기본값 유지
  });
} catch {
  // 브라우저 환경에서는 무시
}
