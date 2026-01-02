/**
 * @file optional-modules.d.ts
 * @description 선택적 의존성 모듈의 타입 선언
 *
 * 이 파일은 설치되지 않은 선택적 모듈에 대한 타입 선언을 제공합니다.
 * 실제 타입은 런타임에 모듈이 로드될 때 결정됩니다.
 */

// ws 모듈 (WebSocket 서버)
declare module 'ws' {
  export class WebSocketServer {
    constructor(options: { server: import('http').Server });
    on(event: 'connection', handler: (ws: WebSocket) => void): void;
    close(callback?: () => void): void;
  }

  export class WebSocket {
    static readonly OPEN: number;
    readyState: number;
    send(data: string): void;
    close(): void;
    on(event: string, handler: (...args: unknown[]) => void): void;
  }

  export default {
    WebSocketServer,
    WebSocket,
  };
}

// ioredis 모듈 (Redis 클라이언트)
declare module 'ioredis' {
  interface RedisOptions {
    host: string;
    port: number;
    password?: string;
    db?: number;
    connectTimeout?: number;
    retryStrategy?: (times: number) => number | null;
  }

  class Redis {
    constructor(options: RedisOptions);
    ping(): Promise<string>;
    multi(): Redis;
    hset(key: string, field: string, value: string): Promise<number>;
    hget(key: string, field: string): Promise<string | null>;
    hdel(key: string, field: string): Promise<number>;
    hmget(key: string, ...fields: string[]): Promise<(string | null)[]>;
    zadd(key: string, score: number, member: string): Promise<number>;
    zpopmax(key: string): Promise<string[]>;
    zrevrange(key: string, start: number, stop: number): Promise<string[]>;
    zcard(key: string): Promise<number>;
    del(key: string): Promise<number>;
    exec(): Promise<unknown[]>;
    quit(): Promise<void>;
    duplicate(): Redis;
    subscribe(channel: string): Promise<void>;
    publish(channel: string, message: string): Promise<number>;
    on(event: string, handler: (...args: unknown[]) => void): void;
  }

  export default Redis;
}

// redis 모듈 (Node.js Redis 클라이언트)
declare module 'redis' {
  interface RedisClientOptions {
    url?: string;
    socket?: {
      host: string;
      port: number;
    };
    password?: string;
    database?: number;
  }

  interface RedisClient {
    connect(): Promise<void>;
    ping(): Promise<string>;
    hSet(key: string, field: string, value: string): Promise<number>;
    hGet(key: string, field: string): Promise<string | null>;
    hDel(key: string, field: string): Promise<number>;
    quit(): Promise<void>;
  }

  export function createClient(options?: RedisClientOptions): RedisClient;
}

// better-sqlite3 모듈 (SQLite 데이터베이스)
declare module 'better-sqlite3' {
  interface Statement {
    run(...params: unknown[]): { changes: number };
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  }

  interface Database {
    exec(sql: string): void;
    prepare(sql: string): Statement;
    transaction<T>(fn: (items: T[]) => void): (items: T[]) => void;
    close(): void;
  }

  function BetterSqlite3(filename: string): Database;
  export default BetterSqlite3;
}
