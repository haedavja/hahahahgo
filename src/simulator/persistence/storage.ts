/**
 * @file storage.ts
 * @description 데이터 영속성 레이어 - JSON 및 SQLite 지원
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
  SimulationResult,
  HistoryEntry,
  QueryOptions,
  SimulationSummary,
} from '../core/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==================== 스토리지 인터페이스 ====================

export interface StorageAdapter {
  save(result: SimulationResult, tags?: string[], notes?: string): Promise<string>;
  get(id: string): Promise<HistoryEntry | null>;
  query(options: QueryOptions): Promise<HistoryEntry[]>;
  delete(id: string): Promise<boolean>;
  getStats(): Promise<StorageStats>;
  clear(): Promise<void>;
}

export interface StorageStats {
  totalEntries: number;
  totalBattles: number;
  avgWinRate: number;
  dateRange: { start: number; end: number } | null;
  sizeBytes: number;
}

// ==================== JSON 파일 스토리지 ====================

export class JsonStorage implements StorageAdapter {
  private dataDir: string;
  private indexPath: string;
  private index: HistoryIndex;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || join(__dirname, '../../data/history');
    this.indexPath = join(this.dataDir, 'index.json');

    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }

    this.index = this.loadIndex();
  }

  private loadIndex(): HistoryIndex {
    if (existsSync(this.indexPath)) {
      try {
        return JSON.parse(readFileSync(this.indexPath, 'utf-8'));
      } catch {
        return { entries: [], version: 1 };
      }
    }
    return { entries: [], version: 1 };
  }

  private saveIndex(): void {
    writeFileSync(this.indexPath, JSON.stringify(this.index, null, 2), 'utf-8');
  }

  async save(result: SimulationResult, tags?: string[], notes?: string): Promise<string> {
    const id = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const entry: HistoryEntry = {
      id,
      timestamp: result.timestamp,
      config: result.config,
      summary: result.summary,
      tags,
      notes,
    };

    // 전체 결과는 별도 파일에 저장
    const dataPath = join(this.dataDir, `${id}.json`);
    writeFileSync(dataPath, JSON.stringify(result, null, 2), 'utf-8');

    // 인덱스에 추가
    this.index.entries.push({
      id,
      timestamp: entry.timestamp,
      winRate: entry.summary.winRate,
      totalBattles: entry.summary.totalBattles,
      tags: tags || [],
      enemyIds: result.config.enemyIds,
    });

    this.saveIndex();
    return id;
  }

  async get(id: string): Promise<HistoryEntry | null> {
    const dataPath = join(this.dataDir, `${id}.json`);
    if (!existsSync(dataPath)) return null;

    try {
      const result: SimulationResult = JSON.parse(readFileSync(dataPath, 'utf-8'));
      const indexEntry = this.index.entries.find(e => e.id === id);

      return {
        id,
        timestamp: result.timestamp,
        config: result.config,
        summary: result.summary,
        tags: indexEntry?.tags,
      };
    } catch {
      return null;
    }
  }

  async getFullResult(id: string): Promise<SimulationResult | null> {
    const dataPath = join(this.dataDir, `${id}.json`);
    if (!existsSync(dataPath)) return null;

    try {
      return JSON.parse(readFileSync(dataPath, 'utf-8'));
    } catch {
      return null;
    }
  }

  async query(options: QueryOptions): Promise<HistoryEntry[]> {
    let entries = [...this.index.entries];

    // 필터링
    if (options.startDate) {
      entries = entries.filter(e => e.timestamp >= options.startDate!);
    }
    if (options.endDate) {
      entries = entries.filter(e => e.timestamp <= options.endDate!);
    }
    if (options.tags && options.tags.length > 0) {
      entries = entries.filter(e =>
        options.tags!.some(tag => e.tags?.includes(tag))
      );
    }
    if (options.enemyIds && options.enemyIds.length > 0) {
      entries = entries.filter(e =>
        options.enemyIds!.some(id => e.enemyIds?.includes(id))
      );
    }
    if (options.minWinRate !== undefined) {
      entries = entries.filter(e => e.winRate >= options.minWinRate!);
    }
    if (options.maxWinRate !== undefined) {
      entries = entries.filter(e => e.winRate <= options.maxWinRate!);
    }

    // 정렬 (최신순)
    entries.sort((a, b) => b.timestamp - a.timestamp);

    // 페이지네이션
    const offset = options.offset || 0;
    const limit = options.limit || 100;
    entries = entries.slice(offset, offset + limit);

    // 전체 엔트리 로드
    const results: HistoryEntry[] = [];
    for (const indexEntry of entries) {
      const entry = await this.get(indexEntry.id);
      if (entry) results.push(entry);
    }

    return results;
  }

  async delete(id: string): Promise<boolean> {
    const dataPath = join(this.dataDir, `${id}.json`);

    if (existsSync(dataPath)) {
      unlinkSync(dataPath);
      this.index.entries = this.index.entries.filter(e => e.id !== id);
      this.saveIndex();
      return true;
    }

    return false;
  }

  async getStats(): Promise<StorageStats> {
    const entries = this.index.entries;

    if (entries.length === 0) {
      return {
        totalEntries: 0,
        totalBattles: 0,
        avgWinRate: 0,
        dateRange: null,
        sizeBytes: 0,
      };
    }

    const totalBattles = entries.reduce((sum, e) => sum + e.totalBattles, 0);
    const avgWinRate = entries.reduce((sum, e) => sum + e.winRate, 0) / entries.length;
    const timestamps = entries.map(e => e.timestamp);

    // 파일 크기 계산
    let sizeBytes = 0;
    const files = readdirSync(this.dataDir);
    for (const file of files) {
      const filePath = join(this.dataDir, file);
      try {
        const stats = require('fs').statSync(filePath);
        sizeBytes += stats.size;
      } catch {
        // ignore
      }
    }

    return {
      totalEntries: entries.length,
      totalBattles,
      avgWinRate,
      dateRange: {
        start: Math.min(...timestamps),
        end: Math.max(...timestamps),
      },
      sizeBytes,
    };
  }

  async clear(): Promise<void> {
    const files = readdirSync(this.dataDir);
    for (const file of files) {
      unlinkSync(join(this.dataDir, file));
    }
    this.index = { entries: [], version: 1 };
  }

  // 집계 쿼리
  async getWinRateTrend(days: number = 30): Promise<{ date: string; winRate: number }[]> {
    const now = Date.now();
    const startDate = now - days * 24 * 60 * 60 * 1000;

    const entries = this.index.entries.filter(e => e.timestamp >= startDate);

    // 일별 그룹화
    const dailyData: Record<string, { wins: number; total: number }> = {};

    for (const entry of entries) {
      const date = new Date(entry.timestamp).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { wins: 0, total: 0 };
      }
      dailyData[date].wins += entry.winRate * entry.totalBattles;
      dailyData[date].total += entry.totalBattles;
    }

    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        winRate: data.total > 0 ? data.wins / data.total : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getEnemyStats(): Promise<Record<string, { battles: number; avgWinRate: number }>> {
    const enemyStats: Record<string, { totalWins: number; totalBattles: number }> = {};

    for (const entry of this.index.entries) {
      for (const enemyId of entry.enemyIds || []) {
        if (!enemyStats[enemyId]) {
          enemyStats[enemyId] = { totalWins: 0, totalBattles: 0 };
        }
        enemyStats[enemyId].totalWins += entry.winRate * entry.totalBattles;
        enemyStats[enemyId].totalBattles += entry.totalBattles;
      }
    }

    const result: Record<string, { battles: number; avgWinRate: number }> = {};
    for (const [enemyId, stats] of Object.entries(enemyStats)) {
      result[enemyId] = {
        battles: stats.totalBattles,
        avgWinRate: stats.totalBattles > 0 ? stats.totalWins / stats.totalBattles : 0,
      };
    }

    return result;
  }
}

// ==================== 인덱스 타입 ====================

interface HistoryIndex {
  version: number;
  entries: IndexEntry[];
}

interface IndexEntry {
  id: string;
  timestamp: number;
  winRate: number;
  totalBattles: number;
  tags?: string[];
  enemyIds?: string[];
}

// ==================== SQLite 스토리지 (옵션) ====================

export class SqliteStorage implements StorageAdapter {
  private db: any;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || join(__dirname, '../../data/simulator.db');

    // SQLite 초기화는 런타임에 수행
    this.initDatabase();
  }

  private async initDatabase(): Promise<void> {
    try {
      // better-sqlite3 동적 임포트 시도
      const Database = (await import('better-sqlite3')).default;
      this.db = new Database(this.dbPath);

      // 테이블 생성
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS simulations (
          id TEXT PRIMARY KEY,
          timestamp INTEGER NOT NULL,
          config TEXT NOT NULL,
          summary TEXT NOT NULL,
          tags TEXT,
          notes TEXT
        );

        CREATE TABLE IF NOT EXISTS battle_results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          simulation_id TEXT NOT NULL,
          winner TEXT NOT NULL,
          turns INTEGER NOT NULL,
          player_damage INTEGER NOT NULL,
          enemy_damage INTEGER NOT NULL,
          FOREIGN KEY (simulation_id) REFERENCES simulations(id)
        );

        CREATE INDEX IF NOT EXISTS idx_simulations_timestamp ON simulations(timestamp);
        CREATE INDEX IF NOT EXISTS idx_battle_results_simulation ON battle_results(simulation_id);
      `);
    } catch (error) {
      console.warn('SQLite not available, falling back to JSON storage');
      throw error;
    }
  }

  async save(result: SimulationResult, tags?: string[], notes?: string): Promise<string> {
    const id = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const stmt = this.db.prepare(`
      INSERT INTO simulations (id, timestamp, config, summary, tags, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      result.timestamp,
      JSON.stringify(result.config),
      JSON.stringify(result.summary),
      tags ? JSON.stringify(tags) : null,
      notes
    );

    // 배틀 결과 저장
    const battleStmt = this.db.prepare(`
      INSERT INTO battle_results (simulation_id, winner, turns, player_damage, enemy_damage)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertBattles = this.db.transaction((battles: any[]) => {
      for (const battle of battles) {
        battleStmt.run(id, battle.winner, battle.turns, battle.playerDamageDealt, battle.enemyDamageDealt);
      }
    });

    insertBattles(result.results);

    return id;
  }

  async get(id: string): Promise<HistoryEntry | null> {
    const row = this.db.prepare('SELECT * FROM simulations WHERE id = ?').get(id);
    if (!row) return null;

    return {
      id: row.id,
      timestamp: row.timestamp,
      config: JSON.parse(row.config),
      summary: JSON.parse(row.summary),
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      notes: row.notes,
    };
  }

  async query(options: QueryOptions): Promise<HistoryEntry[]> {
    let sql = 'SELECT * FROM simulations WHERE 1=1';
    const params: any[] = [];

    if (options.startDate) {
      sql += ' AND timestamp >= ?';
      params.push(options.startDate);
    }
    if (options.endDate) {
      sql += ' AND timestamp <= ?';
      params.push(options.endDate);
    }

    sql += ' ORDER BY timestamp DESC';

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }
    if (options.offset) {
      sql += ' OFFSET ?';
      params.push(options.offset);
    }

    const rows = this.db.prepare(sql).all(...params);

    return rows.map((row: any) => ({
      id: row.id,
      timestamp: row.timestamp,
      config: JSON.parse(row.config),
      summary: JSON.parse(row.summary),
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      notes: row.notes,
    }));
  }

  async delete(id: string): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM simulations WHERE id = ?').run(id);
    this.db.prepare('DELETE FROM battle_results WHERE simulation_id = ?').run(id);
    return result.changes > 0;
  }

  async getStats(): Promise<StorageStats> {
    const countRow = this.db.prepare('SELECT COUNT(*) as count, SUM(json_extract(summary, "$.totalBattles")) as battles FROM simulations').get();
    const avgRow = this.db.prepare('SELECT AVG(json_extract(summary, "$.winRate")) as avgWinRate FROM simulations').get();
    const dateRow = this.db.prepare('SELECT MIN(timestamp) as start, MAX(timestamp) as end FROM simulations').get();

    return {
      totalEntries: countRow.count,
      totalBattles: countRow.battles || 0,
      avgWinRate: avgRow.avgWinRate || 0,
      dateRange: dateRow.start ? { start: dateRow.start, end: dateRow.end } : null,
      sizeBytes: 0, // SQLite doesn't easily expose this
    };
  }

  async clear(): Promise<void> {
    this.db.exec('DELETE FROM battle_results');
    this.db.exec('DELETE FROM simulations');
  }

  close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}

// ==================== 스토리지 팩토리 ====================

export type StorageType = 'json' | 'sqlite';

export function createStorage(type: StorageType = 'json', path?: string): StorageAdapter {
  if (type === 'sqlite') {
    try {
      return new SqliteStorage(path);
    } catch {
      console.warn('SQLite not available, using JSON storage');
      return new JsonStorage(path);
    }
  }
  return new JsonStorage(path);
}

// ==================== 기본 스토리지 인스턴스 ====================

let defaultStorage: StorageAdapter | null = null;

export function getDefaultStorage(): StorageAdapter {
  if (!defaultStorage) {
    defaultStorage = createStorage('json');
  }
  return defaultStorage;
}

export function setDefaultStorage(storage: StorageAdapter): void {
  defaultStorage = storage;
}
