/**
 * @file log-ingestion.ts
 * @description 서버 로그 연동 프레임워크 - 실제 플레이 데이터 분석
 */

import { getLogger } from '../core/logger';

const log = getLogger('LogIngestion');

// ==================== 타입 정의 ====================

export interface GameLogEntry {
  timestamp: string;
  sessionId: string;
  userId?: string;
  eventType: LogEventType;
  payload: Record<string, unknown>;
  metadata?: LogMetadata;
}

export type LogEventType =
  | 'battle_start'
  | 'battle_end'
  | 'card_played'
  | 'turn_start'
  | 'turn_end'
  | 'damage_dealt'
  | 'damage_received'
  | 'buff_applied'
  | 'debuff_applied'
  | 'relic_triggered'
  | 'deck_built'
  | 'enemy_action'
  | 'game_start'
  | 'game_end'
  | 'shop_purchase'
  | 'rest_action';

export interface LogMetadata {
  clientVersion?: string;
  platform?: string;
  region?: string;
  deviceInfo?: string;
}

export interface BattleStartPayload {
  battleId: string;
  enemyId: string;
  enemyHp: number;
  playerHp: number;
  playerMaxHp: number;
  deck: string[];
  relics: string[];
  floor?: number;
}

export interface BattleEndPayload {
  battleId: string;
  winner: 'player' | 'enemy';
  turns: number;
  playerFinalHp: number;
  enemyFinalHp: number;
  cardsPlayed: string[];
  duration: number;
}

export interface CardPlayedPayload {
  battleId: string;
  turn: number;
  cardId: string;
  target?: string;
  damage?: number;
  block?: number;
  effectsApplied?: string[];
}

export interface LogFilter {
  startDate?: Date;
  endDate?: Date;
  eventTypes?: LogEventType[];
  sessionIds?: string[];
  userIds?: string[];
  enemyIds?: string[];
}

export interface AggregatedStats {
  totalBattles: number;
  totalWins: number;
  winRate: number;
  avgTurns: number;
  avgDuration: number;
  cardUsage: Map<string, CardUsageStats>;
  enemyStats: Map<string, EnemyStats>;
  hourlyDistribution: number[];
  platformDistribution: Map<string, number>;
}

export interface CardUsageStats {
  cardId: string;
  timesPlayed: number;
  winRateWhenPlayed: number;
  avgDamageDealt: number;
  avgBlockGiven: number;
  playedInWins: number;
  playedInLosses: number;
}

export interface EnemyStats {
  enemyId: string;
  encounters: number;
  wins: number;
  losses: number;
  winRate: number;
  avgTurns: number;
  avgPlayerHpRemaining: number;
}

// ==================== 로그 파서 ====================

export class LogParser {
  private formats: Map<string, (line: string) => GameLogEntry | null> = new Map();

  constructor() {
    this.registerDefaultFormats();
  }

  /**
   * 기본 로그 포맷 등록
   */
  private registerDefaultFormats(): void {
    // JSON 라인 포맷
    this.formats.set('jsonl', (line: string): GameLogEntry | null => {
      try {
        const data = JSON.parse(line);
        return {
          timestamp: data.timestamp || new Date().toISOString(),
          sessionId: data.sessionId || 'unknown',
          userId: data.userId,
          eventType: data.eventType || data.event || 'unknown',
          payload: data.payload || data.data || data,
          metadata: data.metadata,
        };
      } catch {
        return null;
      }
    });

    // CSV 포맷 (타임스탬프,세션ID,이벤트,페이로드JSON)
    this.formats.set('csv', (line: string): GameLogEntry | null => {
      try {
        const parts = line.split(',');
        if (parts.length < 4) return null;

        return {
          timestamp: parts[0],
          sessionId: parts[1],
          eventType: parts[2] as LogEventType,
          payload: JSON.parse(parts.slice(3).join(',')),
        };
      } catch {
        return null;
      }
    });

    // 커스텀 텍스트 포맷 [timestamp] sessionId eventType: payload
    this.formats.set('text', (line: string): GameLogEntry | null => {
      try {
        const match = line.match(/\[(.+?)\]\s+(\S+)\s+(\w+):\s*(.+)/);
        if (!match) return null;

        return {
          timestamp: match[1],
          sessionId: match[2],
          eventType: match[3] as LogEventType,
          payload: JSON.parse(match[4]),
        };
      } catch {
        return null;
      }
    });
  }

  /**
   * 커스텀 포맷 등록
   */
  registerFormat(name: string, parser: (line: string) => GameLogEntry | null): void {
    this.formats.set(name, parser);
  }

  /**
   * 로그 라인 파싱
   */
  parseLine(line: string, format: string = 'jsonl'): GameLogEntry | null {
    const parser = this.formats.get(format);
    if (!parser) {
      log.warn('Unknown log format', { format });
      return null;
    }
    return parser(line.trim());
  }

  /**
   * 여러 줄 파싱
   */
  parseLines(lines: string[], format: string = 'jsonl'): GameLogEntry[] {
    return lines
      .map(line => this.parseLine(line, format))
      .filter((entry): entry is GameLogEntry => entry !== null);
  }

  /**
   * 포맷 자동 감지
   */
  detectFormat(sample: string): string {
    if (sample.startsWith('{')) return 'jsonl';
    if (sample.startsWith('[')) return 'text';
    if (sample.includes(',')) return 'csv';
    return 'jsonl';
  }
}

// ==================== 로그 저장소 ====================

export class LogStore {
  private entries: GameLogEntry[] = [];
  private indexes: {
    bySession: Map<string, GameLogEntry[]>;
    byEvent: Map<LogEventType, GameLogEntry[]>;
    byBattle: Map<string, GameLogEntry[]>;
    byDate: Map<string, GameLogEntry[]>;
  };

  constructor() {
    this.indexes = {
      bySession: new Map(),
      byEvent: new Map(),
      byBattle: new Map(),
      byDate: new Map(),
    };
  }

  /**
   * 로그 항목 추가
   */
  add(entry: GameLogEntry): void {
    this.entries.push(entry);
    this.indexEntry(entry);
  }

  /**
   * 대량 추가
   */
  addBatch(entries: GameLogEntry[]): void {
    for (const entry of entries) {
      this.add(entry);
    }
  }

  /**
   * 인덱싱
   */
  private indexEntry(entry: GameLogEntry): void {
    // 세션별 인덱스
    if (!this.indexes.bySession.has(entry.sessionId)) {
      this.indexes.bySession.set(entry.sessionId, []);
    }
    this.indexes.bySession.get(entry.sessionId)!.push(entry);

    // 이벤트 타입별 인덱스
    if (!this.indexes.byEvent.has(entry.eventType)) {
      this.indexes.byEvent.set(entry.eventType, []);
    }
    this.indexes.byEvent.get(entry.eventType)!.push(entry);

    // 배틀 ID별 인덱스
    const battleId = (entry.payload as { battleId?: string }).battleId;
    if (battleId) {
      if (!this.indexes.byBattle.has(battleId)) {
        this.indexes.byBattle.set(battleId, []);
      }
      this.indexes.byBattle.get(battleId)!.push(entry);
    }

    // 날짜별 인덱스
    const dateKey = entry.timestamp.split('T')[0];
    if (!this.indexes.byDate.has(dateKey)) {
      this.indexes.byDate.set(dateKey, []);
    }
    this.indexes.byDate.get(dateKey)!.push(entry);
  }

  /**
   * 필터링 조회
   */
  query(filter: LogFilter): GameLogEntry[] {
    let results = this.entries;

    if (filter.startDate) {
      const start = filter.startDate.toISOString();
      results = results.filter(e => e.timestamp >= start);
    }

    if (filter.endDate) {
      const end = filter.endDate.toISOString();
      results = results.filter(e => e.timestamp <= end);
    }

    if (filter.eventTypes && filter.eventTypes.length > 0) {
      results = results.filter(e => filter.eventTypes!.includes(e.eventType));
    }

    if (filter.sessionIds && filter.sessionIds.length > 0) {
      results = results.filter(e => filter.sessionIds!.includes(e.sessionId));
    }

    if (filter.userIds && filter.userIds.length > 0) {
      results = results.filter(e => e.userId && filter.userIds!.includes(e.userId));
    }

    return results;
  }

  /**
   * 세션별 조회
   */
  getBySession(sessionId: string): GameLogEntry[] {
    return this.indexes.bySession.get(sessionId) || [];
  }

  /**
   * 배틀별 조회
   */
  getByBattle(battleId: string): GameLogEntry[] {
    return this.indexes.byBattle.get(battleId) || [];
  }

  /**
   * 이벤트 타입별 조회
   */
  getByEventType(eventType: LogEventType): GameLogEntry[] {
    return this.indexes.byEvent.get(eventType) || [];
  }

  /**
   * 총 항목 수
   */
  get size(): number {
    return this.entries.length;
  }

  /**
   * 저장소 초기화
   */
  clear(): void {
    this.entries = [];
    this.indexes.bySession.clear();
    this.indexes.byEvent.clear();
    this.indexes.byBattle.clear();
    this.indexes.byDate.clear();
  }
}

// ==================== 로그 분석기 ====================

export class LogAnalyzer {
  private store: LogStore;

  constructor(store: LogStore) {
    this.store = store;
  }

  /**
   * 전체 통계 집계
   */
  aggregateStats(filter?: LogFilter): AggregatedStats {
    const battleEnds = this.store.getByEventType('battle_end')
      .filter(e => !filter || this.matchesFilter(e, filter));

    const cardPlays = this.store.getByEventType('card_played')
      .filter(e => !filter || this.matchesFilter(e, filter));

    const totalBattles = battleEnds.length;
    const wins = battleEnds.filter(e => (e.payload as unknown as BattleEndPayload).winner === 'player');
    const totalWins = wins.length;

    // 카드 사용 통계
    const cardUsage = this.calculateCardUsage(cardPlays, battleEnds);

    // 적 통계
    const enemyStats = this.calculateEnemyStats(battleEnds);

    // 시간대별 분포
    const hourlyDistribution = this.calculateHourlyDistribution(battleEnds);

    // 플랫폼 분포
    const platformDistribution = this.calculatePlatformDistribution(battleEnds);

    // 평균 값들
    const avgTurns = battleEnds.length > 0
      ? battleEnds.reduce((sum, e) => sum + ((e.payload as unknown as BattleEndPayload).turns || 0), 0) / battleEnds.length
      : 0;

    const avgDuration = battleEnds.length > 0
      ? battleEnds.reduce((sum, e) => sum + ((e.payload as unknown as BattleEndPayload).duration || 0), 0) / battleEnds.length
      : 0;

    return {
      totalBattles,
      totalWins,
      winRate: totalBattles > 0 ? totalWins / totalBattles : 0,
      avgTurns,
      avgDuration,
      cardUsage,
      enemyStats,
      hourlyDistribution,
      platformDistribution,
    };
  }

  /**
   * 필터 매칭 확인
   */
  private matchesFilter(entry: GameLogEntry, filter: LogFilter): boolean {
    if (filter.startDate && entry.timestamp < filter.startDate.toISOString()) return false;
    if (filter.endDate && entry.timestamp > filter.endDate.toISOString()) return false;
    if (filter.sessionIds && !filter.sessionIds.includes(entry.sessionId)) return false;
    if (filter.userIds && (!entry.userId || !filter.userIds.includes(entry.userId))) return false;
    return true;
  }

  /**
   * 카드 사용 통계 계산
   */
  private calculateCardUsage(
    cardPlays: GameLogEntry[],
    battleEnds: GameLogEntry[]
  ): Map<string, CardUsageStats> {
    const stats = new Map<string, CardUsageStats>();

    // 배틀별 승패 맵
    const battleWins = new Map<string, boolean>();
    for (const end of battleEnds) {
      const payload = end.payload as BattleEndPayload;
      battleWins.set(payload.battleId, payload.winner === 'player');
    }

    // 카드별 집계
    for (const play of cardPlays) {
      const payload = play.payload as CardPlayedPayload;
      const cardId = payload.cardId;
      const battleId = payload.battleId;
      const won = battleWins.get(battleId) || false;

      if (!stats.has(cardId)) {
        stats.set(cardId, {
          cardId,
          timesPlayed: 0,
          winRateWhenPlayed: 0,
          avgDamageDealt: 0,
          avgBlockGiven: 0,
          playedInWins: 0,
          playedInLosses: 0,
        });
      }

      const cardStats = stats.get(cardId)!;
      cardStats.timesPlayed++;
      cardStats.avgDamageDealt += (payload.damage || 0);
      cardStats.avgBlockGiven += (payload.block || 0);

      if (won) {
        cardStats.playedInWins++;
      } else {
        cardStats.playedInLosses++;
      }
    }

    // 평균 계산
    for (const [, cardStats] of stats) {
      if (cardStats.timesPlayed > 0) {
        cardStats.avgDamageDealt /= cardStats.timesPlayed;
        cardStats.avgBlockGiven /= cardStats.timesPlayed;
        const totalGames = cardStats.playedInWins + cardStats.playedInLosses;
        cardStats.winRateWhenPlayed = totalGames > 0 ? cardStats.playedInWins / totalGames : 0;
      }
    }

    return stats;
  }

  /**
   * 적 통계 계산
   */
  private calculateEnemyStats(battleEnds: GameLogEntry[]): Map<string, EnemyStats> {
    const stats = new Map<string, EnemyStats>();

    const battleStarts = this.store.getByEventType('battle_start');
    const enemyMap = new Map<string, string>();
    for (const start of battleStarts) {
      const payload = start.payload as BattleStartPayload;
      enemyMap.set(payload.battleId, payload.enemyId);
    }

    for (const end of battleEnds) {
      const payload = end.payload as BattleEndPayload;
      const enemyId = enemyMap.get(payload.battleId);
      if (!enemyId) continue;

      if (!stats.has(enemyId)) {
        stats.set(enemyId, {
          enemyId,
          encounters: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          avgTurns: 0,
          avgPlayerHpRemaining: 0,
        });
      }

      const enemyStats = stats.get(enemyId)!;
      enemyStats.encounters++;
      enemyStats.avgTurns += payload.turns;

      if (payload.winner === 'player') {
        enemyStats.wins++;
        enemyStats.avgPlayerHpRemaining += payload.playerFinalHp;
      } else {
        enemyStats.losses++;
      }
    }

    // 평균 계산
    for (const [, enemyStats] of stats) {
      if (enemyStats.encounters > 0) {
        enemyStats.winRate = enemyStats.wins / enemyStats.encounters;
        enemyStats.avgTurns /= enemyStats.encounters;
        if (enemyStats.wins > 0) {
          enemyStats.avgPlayerHpRemaining /= enemyStats.wins;
        }
      }
    }

    return stats;
  }

  /**
   * 시간대별 분포 계산
   */
  private calculateHourlyDistribution(entries: GameLogEntry[]): number[] {
    const distribution = new Array(24).fill(0);

    for (const entry of entries) {
      try {
        const hour = new Date(entry.timestamp).getHours();
        distribution[hour]++;
      } catch {
        // 타임스탬프 파싱 실패 시 무시
      }
    }

    return distribution;
  }

  /**
   * 플랫폼 분포 계산
   */
  private calculatePlatformDistribution(entries: GameLogEntry[]): Map<string, number> {
    const distribution = new Map<string, number>();

    for (const entry of entries) {
      const platform = entry.metadata?.platform || 'unknown';
      distribution.set(platform, (distribution.get(platform) || 0) + 1);
    }

    return distribution;
  }

  /**
   * 배틀 재구성 (리플레이용)
   */
  reconstructBattle(battleId: string): BattleReplay | null {
    const events = this.store.getByBattle(battleId);
    if (events.length === 0) return null;

    events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const startEvent = events.find(e => e.eventType === 'battle_start');
    const endEvent = events.find(e => e.eventType === 'battle_end');

    if (!startEvent) return null;

    const startPayload = startEvent.payload as BattleStartPayload;
    const endPayload = endEvent?.payload as BattleEndPayload | undefined;

    const turns: BattleTurn[] = [];
    let currentTurn: BattleTurn | null = null;

    for (const event of events) {
      if (event.eventType === 'turn_start') {
        if (currentTurn) turns.push(currentTurn);
        currentTurn = {
          turnNumber: (event.payload as { turn: number }).turn || turns.length + 1,
          actions: [],
        };
      } else if (event.eventType === 'card_played' && currentTurn) {
        currentTurn.actions.push({
          type: 'card_played',
          ...event.payload,
        });
      } else if (event.eventType === 'enemy_action' && currentTurn) {
        currentTurn.actions.push({
          type: 'enemy_action',
          ...event.payload,
        });
      }
    }
    if (currentTurn) turns.push(currentTurn);

    return {
      battleId,
      enemyId: startPayload.enemyId,
      deck: startPayload.deck,
      relics: startPayload.relics,
      initialPlayerHp: startPayload.playerHp,
      initialEnemyHp: startPayload.enemyHp,
      turns,
      result: endPayload ? {
        winner: endPayload.winner,
        playerFinalHp: endPayload.playerFinalHp,
        enemyFinalHp: endPayload.enemyFinalHp,
        totalTurns: endPayload.turns,
        duration: endPayload.duration,
      } : undefined,
    };
  }

  /**
   * 밸런스 이슈 탐지
   */
  detectBalanceIssues(): BalanceIssue[] {
    const issues: BalanceIssue[] = [];
    const stats = this.aggregateStats();

    // 전체 승률 체크
    if (stats.winRate > 0.75) {
      issues.push({
        type: 'too_easy',
        severity: 'medium',
        description: `전체 승률이 ${(stats.winRate * 100).toFixed(1)}%로 너무 높습니다.`,
        suggestion: '적 밸런스 상향 조정 필요',
      });
    } else if (stats.winRate < 0.35) {
      issues.push({
        type: 'too_hard',
        severity: 'high',
        description: `전체 승률이 ${(stats.winRate * 100).toFixed(1)}%로 너무 낮습니다.`,
        suggestion: '난이도 하향 조정 필요',
      });
    }

    // 특정 적 승률 체크
    for (const [enemyId, enemyStats] of stats.enemyStats) {
      if (enemyStats.encounters >= 10) {
        if (enemyStats.winRate < 0.2) {
          issues.push({
            type: 'enemy_too_strong',
            severity: 'high',
            target: enemyId,
            description: `${enemyId} 상대 승률이 ${(enemyStats.winRate * 100).toFixed(1)}%로 너무 낮습니다.`,
            suggestion: '해당 적 너프 필요',
          });
        } else if (enemyStats.winRate > 0.9) {
          issues.push({
            type: 'enemy_too_weak',
            severity: 'low',
            target: enemyId,
            description: `${enemyId} 상대 승률이 ${(enemyStats.winRate * 100).toFixed(1)}%로 너무 높습니다.`,
            suggestion: '해당 적 버프 필요',
          });
        }
      }
    }

    // 카드 밸런스 체크
    for (const [cardId, cardStats] of stats.cardUsage) {
      if (cardStats.timesPlayed >= 50) {
        if (cardStats.winRateWhenPlayed > 0.85) {
          issues.push({
            type: 'card_overpowered',
            severity: 'medium',
            target: cardId,
            description: `${cardId} 사용 시 승률이 ${(cardStats.winRateWhenPlayed * 100).toFixed(1)}%로 너무 높습니다.`,
            suggestion: '해당 카드 너프 필요',
          });
        } else if (cardStats.winRateWhenPlayed < 0.25) {
          issues.push({
            type: 'card_underpowered',
            severity: 'low',
            target: cardId,
            description: `${cardId} 사용 시 승률이 ${(cardStats.winRateWhenPlayed * 100).toFixed(1)}%로 너무 낮습니다.`,
            suggestion: '해당 카드 버프 필요',
          });
        }
      }
    }

    return issues;
  }

  /**
   * 분석 리포트 생성
   */
  generateReport(filter?: LogFilter): string {
    const stats = this.aggregateStats(filter);
    const issues = this.detectBalanceIssues();

    const lines: string[] = [
      '═══════════════════════════════════════════════════════',
      '📊 게임 로그 분석 리포트',
      '═══════════════════════════════════════════════════════',
      '',
      '📈 전체 통계',
      '───────────────────────────────────────────────────────',
      `총 전투 수: ${stats.totalBattles}`,
      `승리: ${stats.totalWins} (${(stats.winRate * 100).toFixed(1)}%)`,
      `평균 턴 수: ${stats.avgTurns.toFixed(1)}`,
      `평균 전투 시간: ${(stats.avgDuration / 1000).toFixed(1)}초`,
      '',
      '🃏 카드 사용 통계 (상위 10개)',
      '───────────────────────────────────────────────────────',
    ];

    // 카드 정렬 (사용 횟수 기준)
    const sortedCards = Array.from(stats.cardUsage.entries())
      .sort((a, b) => b[1].timesPlayed - a[1].timesPlayed)
      .slice(0, 10);

    for (const [cardId, cardStats] of sortedCards) {
      lines.push(
        `  ${cardId}: ${cardStats.timesPlayed}회 사용, ` +
        `승률 ${(cardStats.winRateWhenPlayed * 100).toFixed(1)}%, ` +
        `평균 피해 ${cardStats.avgDamageDealt.toFixed(1)}`
      );
    }

    lines.push('');
    lines.push('👾 적 통계');
    lines.push('───────────────────────────────────────────────────────');

    for (const [enemyId, enemyStats] of stats.enemyStats) {
      lines.push(
        `  ${enemyId}: ${enemyStats.encounters}회 조우, ` +
        `승률 ${(enemyStats.winRate * 100).toFixed(1)}%, ` +
        `평균 ${enemyStats.avgTurns.toFixed(1)}턴`
      );
    }

    if (issues.length > 0) {
      lines.push('');
      lines.push('⚠️ 밸런스 이슈');
      lines.push('───────────────────────────────────────────────────────');

      for (const issue of issues) {
        const icon = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
        lines.push(`  ${icon} [${issue.type}] ${issue.description}`);
        lines.push(`     → ${issue.suggestion}`);
      }
    }

    lines.push('');
    lines.push('═══════════════════════════════════════════════════════');

    return lines.join('\n');
  }
}

// ==================== 추가 타입 ====================

export interface BattleReplay {
  battleId: string;
  enemyId: string;
  deck: string[];
  relics: string[];
  initialPlayerHp: number;
  initialEnemyHp: number;
  turns: BattleTurn[];
  result?: {
    winner: 'player' | 'enemy';
    playerFinalHp: number;
    enemyFinalHp: number;
    totalTurns: number;
    duration: number;
  };
}

export interface BattleTurn {
  turnNumber: number;
  actions: BattleAction[];
}

export interface BattleAction {
  type: 'card_played' | 'enemy_action' | 'buff_applied' | 'damage_dealt';
  [key: string]: unknown;
}

export interface BalanceIssue {
  type: 'too_easy' | 'too_hard' | 'enemy_too_strong' | 'enemy_too_weak' | 'card_overpowered' | 'card_underpowered';
  severity: 'low' | 'medium' | 'high';
  target?: string;
  description: string;
  suggestion: string;
}

// ==================== 로그 수집기 (실시간) ====================

export class LogCollector {
  private store: LogStore;
  private parser: LogParser;
  private buffer: GameLogEntry[] = [];
  private flushInterval: number = 1000;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private onFlush?: (entries: GameLogEntry[]) => void;

  constructor(store: LogStore, parser: LogParser) {
    this.store = store;
    this.parser = parser;
  }

  /**
   * 실시간 수집 시작
   */
  startCollection(options?: { flushInterval?: number; onFlush?: (entries: GameLogEntry[]) => void }): void {
    this.flushInterval = options?.flushInterval || 1000;
    this.onFlush = options?.onFlush;

    this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
    log.info('로그 수집 시작');
  }

  /**
   * 수집 중지
   */
  stopCollection(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
    log.info('로그 수집 중지');
  }

  /**
   * 로그 항목 추가
   */
  collect(entry: GameLogEntry): void {
    this.buffer.push(entry);
  }

  /**
   * 원시 로그 라인 추가
   */
  collectRaw(line: string, format: string = 'jsonl'): void {
    const entry = this.parser.parseLine(line, format);
    if (entry) {
      this.collect(entry);
    }
  }

  /**
   * 버퍼 플러시
   */
  private flush(): void {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    this.store.addBatch(entries);

    if (this.onFlush) {
      this.onFlush(entries);
    }
  }
}

// ==================== 내보내기 ====================

export function createLogSystem(): {
  store: LogStore;
  parser: LogParser;
  analyzer: LogAnalyzer;
  collector: LogCollector;
} {
  const store = new LogStore();
  const parser = new LogParser();
  const analyzer = new LogAnalyzer(store);
  const collector = new LogCollector(store, parser);

  return { store, parser, analyzer, collector };
}
