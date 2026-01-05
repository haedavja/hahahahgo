/**
 * @file replay-enhanced.ts
 * @description 향상된 리플레이 시스템 - 비교, 검색, 통계, 스트리밍
 */

import { createHash } from 'crypto';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';
import type { BattleResult } from '../core/types';
import type { ReplayData, ReplayEvent, StateSnapshot, ReplaySummary } from './replay';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

// ==================== 확장 타입 ====================

export interface EnhancedReplayData extends ReplayData {
  tags: string[];
  metadata: ReplayMetadata;
  highlights: ReplayHighlight[];
  checksum: string;
}

export interface ReplayMetadata {
  createdBy: string;
  description?: string;
  category?: string;
  rating?: number;
  views?: number;
  difficulty?: 'easy' | 'normal' | 'hard' | 'expert';
  isRanked?: boolean;
  gameVersion?: string;
}

export interface ReplayHighlight {
  eventId: number;
  type: 'critical_hit' | 'combo' | 'close_call' | 'perfect_block' | 'big_damage' | 'clutch_win' | 'custom';
  label: string;
  importance: number;  // 1-10
}

export interface ReplaySearchQuery {
  winner?: 'player' | 'enemy' | 'draw';
  enemyId?: string;
  tags?: string[];
  minTurns?: number;
  maxTurns?: number;
  cardsUsed?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  hasHighlight?: string;
  minRating?: number;
}

export interface ReplayComparisonResult {
  replays: EnhancedReplayData[];
  metrics: ComparisonMetrics;
  insights: string[];
  charts: ChartData[];
}

export interface ComparisonMetrics {
  winRates: { replayId: string; winRate: number }[];
  avgTurns: { replayId: string; turns: number }[];
  avgDamage: { replayId: string; damage: number }[];
  cardUsage: { cardId: string; usageCounts: { replayId: string; count: number }[] }[];
  turnByTurnHp: { turn: number; values: { replayId: string; playerHp: number; enemyHp: number }[] }[];
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'radar';
  title: string;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

// ==================== 이벤트 필터 ====================

export interface EventFilter {
  types?: string[];
  actors?: ('player' | 'enemy' | 'system')[];
  turns?: number[];
  minTurn?: number;
  maxTurn?: number;
  searchText?: string;
  hasData?: Record<string, unknown>;
}

export function filterEvents(events: ReplayEvent[], filter: EventFilter): ReplayEvent[] {
  return events.filter(event => {
    if (filter.types && !filter.types.includes(event.type)) return false;
    if (filter.actors && !filter.actors.includes(event.actor)) return false;
    if (filter.turns && !filter.turns.includes(event.turn)) return false;
    if (filter.minTurn !== undefined && event.turn < filter.minTurn) return false;
    if (filter.maxTurn !== undefined && event.turn > filter.maxTurn) return false;
    if (filter.searchText && !event.description.toLowerCase().includes(filter.searchText.toLowerCase())) return false;

    if (filter.hasData) {
      for (const [key, value] of Object.entries(filter.hasData)) {
        if (event.data[key] !== value) return false;
      }
    }

    return true;
  });
}

// ==================== 통계 분석 ====================

export interface ReplayStatistics {
  general: GeneralStats;
  damage: DamageStats;
  cards: CardStats;
  turns: TurnStats;
  momentum: MomentumStats;
  highlights: HighlightStats;
}

export interface GeneralStats {
  totalEvents: number;
  totalTurns: number;
  duration: number;
  winner: string;
  winMargin: number;  // 최종 HP 차이
}

export interface DamageStats {
  playerTotalDamage: number;
  enemyTotalDamage: number;
  playerDamagePerTurn: number;
  enemyDamagePerTurn: number;
  maxPlayerHit: number;
  maxEnemyHit: number;
  criticalHits: number;
  blockedDamage: number;
}

export interface CardStats {
  totalCardsPlayed: number;
  uniqueCardsPlayed: number;
  cardFrequency: { cardId: string; count: number; avgDamage: number }[];
  mostEffectiveCard: string;
  leastEffectiveCard: string;
  combosTriggered: { comboName: string; count: number; totalDamage: number }[];
}

export interface TurnStats {
  avgTurnDuration: number;
  longestTurn: number;
  shortestTurn: number;
  turnBreakdown: { turn: number; playerDamage: number; enemyDamage: number; cardsPlayed: number }[];
}

export interface MomentumStats {
  leadChanges: number;
  biggestSwing: number;
  playerPeakHpAdvantage: number;
  enemyPeakHpAdvantage: number;
  closestCall: { turn: number; playerHp: number; enemyHp: number };
}

export interface HighlightStats {
  criticalHits: number;
  combos: number;
  closeCalls: number;
  perfectBlocks: number;
  bigDamageInstances: number;
}

export function analyzeReplay(replay: EnhancedReplayData): ReplayStatistics {
  const events = replay.events;
  const snapshots = replay.snapshots;

  // 일반 통계
  const general: GeneralStats = {
    totalEvents: events.length,
    totalTurns: replay.result.turns,
    duration: replay.duration,
    winner: replay.result.winner,
    winMargin: Math.abs(replay.result.finalPlayerHp - replay.result.finalEnemyHp),
  };

  // 피해 통계
  const damageEvents = filterEvents(events, { types: ['damage'] });
  let maxPlayerHit = 0;
  let maxEnemyHit = 0;
  let criticalHits = 0;
  let blockedDamage = 0;

  for (const event of damageEvents) {
    const { actualDamage, blocked, isCritical, actor } = event.data as Record<string, unknown>;
    if (actor === 'player' && (actualDamage as number) > maxPlayerHit) {
      maxPlayerHit = actualDamage as number;
    }
    if (actor === 'enemy' && (actualDamage as number) > maxEnemyHit) {
      maxEnemyHit = actualDamage as number;
    }
    if (isCritical) criticalHits++;
    blockedDamage += (blocked as number) || 0;
  }

  const damage: DamageStats = {
    playerTotalDamage: replay.result.playerDamageDealt,
    enemyTotalDamage: replay.result.enemyDamageDealt,
    playerDamagePerTurn: replay.result.playerDamageDealt / Math.max(1, replay.result.turns),
    enemyDamagePerTurn: replay.result.enemyDamageDealt / Math.max(1, replay.result.turns),
    maxPlayerHit,
    maxEnemyHit,
    criticalHits,
    blockedDamage,
  };

  // 카드 통계
  const cardPlayEvents = filterEvents(events, { types: ['card_play'], actors: ['player'] });
  const cardUsage: Map<string, { count: number; damage: number }> = new Map();

  for (const event of cardPlayEvents) {
    const cardId = event.data.cardId as string;
    const existing = cardUsage.get(cardId) || { count: 0, damage: 0 };
    existing.count++;
    cardUsage.set(cardId, existing);
  }

  const cardFrequency = Array.from(cardUsage.entries()).map(([cardId, stats]) => ({
    cardId,
    count: stats.count,
    avgDamage: stats.damage / stats.count,
  }));

  cardFrequency.sort((a, b) => b.count - a.count);

  const comboEvents = filterEvents(events, { types: ['combo'] });
  const comboStats: Map<string, { count: number; totalDamage: number }> = new Map();

  for (const event of comboEvents) {
    const comboName = event.data.comboName as string;
    const existing = comboStats.get(comboName) || { count: 0, totalDamage: 0 };
    existing.count++;
    comboStats.set(comboName, existing);
  }

  const cards: CardStats = {
    totalCardsPlayed: cardPlayEvents.length,
    uniqueCardsPlayed: cardUsage.size,
    cardFrequency,
    mostEffectiveCard: cardFrequency[0]?.cardId || '',
    leastEffectiveCard: cardFrequency[cardFrequency.length - 1]?.cardId || '',
    combosTriggered: Array.from(comboStats.entries()).map(([comboName, stats]) => ({
      comboName,
      count: stats.count,
      totalDamage: stats.totalDamage,
    })),
  };

  // 턴 통계
  const turnBreakdown: TurnStats['turnBreakdown'] = [];
  let currentTurn = 0;
  let turnDamagePlayer = 0;
  let turnDamageEnemy = 0;
  let turnCards = 0;

  for (const event of events) {
    if (event.turn !== currentTurn) {
      if (currentTurn > 0) {
        turnBreakdown.push({
          turn: currentTurn,
          playerDamage: turnDamagePlayer,
          enemyDamage: turnDamageEnemy,
          cardsPlayed: turnCards,
        });
      }
      currentTurn = event.turn;
      turnDamagePlayer = 0;
      turnDamageEnemy = 0;
      turnCards = 0;
    }

    if (event.type === 'damage') {
      if (event.actor === 'player') {
        turnDamagePlayer += (event.data.actualDamage as number) || 0;
      } else if (event.actor === 'enemy') {
        turnDamageEnemy += (event.data.actualDamage as number) || 0;
      }
    }

    if (event.type === 'card_play' && event.actor === 'player') {
      turnCards++;
    }
  }

  // 마지막 턴 추가
  if (currentTurn > 0) {
    turnBreakdown.push({
      turn: currentTurn,
      playerDamage: turnDamagePlayer,
      enemyDamage: turnDamageEnemy,
      cardsPlayed: turnCards,
    });
  }

  const turnDurations = turnBreakdown.map(t => t.playerDamage + t.enemyDamage);
  const turns: TurnStats = {
    avgTurnDuration: replay.duration / Math.max(1, replay.result.turns),
    longestTurn: Math.max(...turnBreakdown.map(t => t.cardsPlayed), 0),
    shortestTurn: Math.min(...turnBreakdown.map(t => t.cardsPlayed).filter(c => c > 0), 0),
    turnBreakdown,
  };

  // 모멘텀 통계
  let leadChanges = 0;
  let biggestSwing = 0;
  let playerPeakAdvantage = 0;
  let enemyPeakAdvantage = 0;
  let closestCall = { turn: 0, playerHp: 100, enemyHp: 100 };
  let lastLead: 'player' | 'enemy' | 'tie' = 'tie';

  for (const snapshot of snapshots) {
    const playerHp = snapshot.player.hp;
    const enemyHp = snapshot.enemy.hp;
    const playerHpPercent = playerHp / snapshot.player.maxHp;
    const enemyHpPercent = enemyHp / snapshot.enemy.maxHp;
    const diff = playerHpPercent - enemyHpPercent;

    const currentLead: 'player' | 'enemy' | 'tie' = diff > 0.05 ? 'player' : diff < -0.05 ? 'enemy' : 'tie';
    if (currentLead !== lastLead && lastLead !== 'tie' && currentLead !== 'tie') {
      leadChanges++;
    }
    lastLead = currentLead;

    if (diff > playerPeakAdvantage) playerPeakAdvantage = diff;
    if (-diff > enemyPeakAdvantage) enemyPeakAdvantage = -diff;

    // 가장 위험했던 순간 (플레이어 HP 기준)
    if (playerHp < closestCall.playerHp) {
      closestCall = { turn: snapshot.turn, playerHp, enemyHp };
    }
  }

  const momentum: MomentumStats = {
    leadChanges,
    biggestSwing,
    playerPeakHpAdvantage: playerPeakAdvantage * 100,
    enemyPeakHpAdvantage: enemyPeakAdvantage * 100,
    closestCall,
  };

  // 하이라이트 통계
  const highlights: HighlightStats = {
    criticalHits,
    combos: comboEvents.length,
    closeCalls: snapshots.filter(s => s.player.hp <= s.player.maxHp * 0.1).length,
    perfectBlocks: damageEvents.filter(e => (e.data.actualDamage as number) === 0 && (e.data.blocked as number) > 0).length,
    bigDamageInstances: damageEvents.filter(e => (e.data.actualDamage as number) >= 50).length,
  };

  return { general, damage, cards, turns, momentum, highlights };
}

// ==================== 리플레이 비교 ====================

export function compareReplays(replays: EnhancedReplayData[]): ReplayComparisonResult {
  const metrics: ComparisonMetrics = {
    winRates: [],
    avgTurns: [],
    avgDamage: [],
    cardUsage: [],
    turnByTurnHp: [],
  };

  // 기본 메트릭스 수집
  for (const replay of replays) {
    metrics.winRates.push({
      replayId: replay.id,
      winRate: replay.result.winner === 'player' ? 100 : 0,
    });

    metrics.avgTurns.push({
      replayId: replay.id,
      turns: replay.result.turns,
    });

    metrics.avgDamage.push({
      replayId: replay.id,
      damage: replay.result.playerDamageDealt,
    });
  }

  // 카드 사용 비교
  const allCards = new Set<string>();
  const cardCountsByReplay: Map<string, Map<string, number>> = new Map();

  for (const replay of replays) {
    const cardCounts = new Map<string, number>();
    const cardEvents = filterEvents(replay.events, { types: ['card_play'], actors: ['player'] });

    for (const event of cardEvents) {
      const cardId = event.data.cardId as string;
      allCards.add(cardId);
      cardCounts.set(cardId, (cardCounts.get(cardId) || 0) + 1);
    }

    cardCountsByReplay.set(replay.id, cardCounts);
  }

  for (const cardId of allCards) {
    const usageCounts: { replayId: string; count: number }[] = [];

    for (const replay of replays) {
      const counts = cardCountsByReplay.get(replay.id);
      usageCounts.push({
        replayId: replay.id,
        count: counts?.get(cardId) || 0,
      });
    }

    metrics.cardUsage.push({ cardId, usageCounts });
  }

  // 턴별 HP 비교
  const maxTurns = Math.max(...replays.map(r => r.result.turns));
  for (let turn = 1; turn <= maxTurns; turn++) {
    const values: { replayId: string; playerHp: number; enemyHp: number }[] = [];

    for (const replay of replays) {
      const snapshot = replay.snapshots.find(s => s.turn === turn && s.phase === 'end')
        || replay.snapshots.filter(s => s.turn <= turn).pop();

      if (snapshot) {
        values.push({
          replayId: replay.id,
          playerHp: snapshot.player.hp,
          enemyHp: snapshot.enemy.hp,
        });
      }
    }

    if (values.length > 0) {
      metrics.turnByTurnHp.push({ turn, values });
    }
  }

  // 인사이트 생성
  const insights = generateInsights(replays, metrics);

  // 차트 데이터 생성
  const charts = generateCharts(replays, metrics);

  return { replays, metrics, insights, charts };
}

function generateInsights(replays: EnhancedReplayData[], metrics: ComparisonMetrics): string[] {
  const insights: string[] = [];

  // 승리 여부 분석
  const wins = replays.filter(r => r.result.winner === 'player');
  const losses = replays.filter(r => r.result.winner === 'enemy');

  if (wins.length > 0 && losses.length > 0) {
    const avgWinTurns = wins.reduce((s, r) => s + r.result.turns, 0) / wins.length;
    const avgLoseTurns = losses.reduce((s, r) => s + r.result.turns, 0) / losses.length;

    if (avgWinTurns < avgLoseTurns) {
      insights.push(`승리 게임의 평균 턴(${avgWinTurns.toFixed(1)})이 패배 게임(${avgLoseTurns.toFixed(1)})보다 짧습니다. 빠른 공세가 효과적입니다.`);
    } else {
      insights.push(`패배 게임의 평균 턴이 더 짧습니다. 조기 사망을 방지하기 위한 방어 전략이 필요합니다.`);
    }

    // 피해량 비교
    const avgWinDamage = wins.reduce((s, r) => s + r.result.playerDamageDealt, 0) / wins.length;
    const avgLoseDamage = losses.reduce((s, r) => s + r.result.playerDamageDealt, 0) / losses.length;

    insights.push(`승리 시 평균 피해량: ${avgWinDamage.toFixed(0)}, 패배 시: ${avgLoseDamage.toFixed(0)}`);
  }

  // 카드 사용 패턴 분석
  const cardUsageDiffs = metrics.cardUsage
    .map(cu => {
      const maxCount = Math.max(...cu.usageCounts.map(uc => uc.count));
      const minCount = Math.min(...cu.usageCounts.map(uc => uc.count));
      return { cardId: cu.cardId, diff: maxCount - minCount };
    })
    .sort((a, b) => b.diff - a.diff);

  if (cardUsageDiffs.length > 0 && cardUsageDiffs[0].diff >= 3) {
    insights.push(`'${cardUsageDiffs[0].cardId}' 카드 사용량에 큰 차이가 있습니다. 이 카드의 효율성을 분석해보세요.`);
  }

  return insights;
}

function generateCharts(replays: EnhancedReplayData[], metrics: ComparisonMetrics): ChartData[] {
  const charts: ChartData[] = [];

  // HP 변화 라인 차트
  if (metrics.turnByTurnHp.length > 0) {
    charts.push({
      type: 'line',
      title: '턴별 플레이어 HP',
      labels: metrics.turnByTurnHp.map(t => `턴 ${t.turn}`),
      datasets: replays.map(replay => ({
        label: replay.id.slice(0, 10),
        data: metrics.turnByTurnHp.map(t => {
          const val = t.values.find(v => v.replayId === replay.id);
          return val?.playerHp || 0;
        }),
      })),
    });
  }

  // 카드 사용 바 차트
  const topCards = metrics.cardUsage.slice(0, 5);
  if (topCards.length > 0) {
    charts.push({
      type: 'bar',
      title: '주요 카드 사용 횟수',
      labels: topCards.map(c => c.cardId),
      datasets: replays.map(replay => ({
        label: replay.id.slice(0, 10),
        data: topCards.map(card => {
          const usage = card.usageCounts.find(u => u.replayId === replay.id);
          return usage?.count || 0;
        }),
      })),
    });
  }

  return charts;
}

// ==================== 스트리밍 레코더 ====================

export type ReplayEventHandler = (event: ReplayEvent) => void;

export class StreamingReplayRecorder {
  private handlers: ReplayEventHandler[] = [];
  private events: ReplayEvent[] = [];
  private eventId = 0;
  private startTime = Date.now();
  private config: ReplayData['config'] | null = null;
  private bufferSize = 100;
  private flushCallback?: (events: ReplayEvent[]) => void;

  constructor(options?: { bufferSize?: number; onFlush?: (events: ReplayEvent[]) => void }) {
    this.bufferSize = options?.bufferSize ?? 100;
    this.flushCallback = options?.onFlush;
  }

  subscribe(handler: ReplayEventHandler): () => void {
    this.handlers.push(handler);
    return () => {
      const idx = this.handlers.indexOf(handler);
      if (idx >= 0) this.handlers.splice(idx, 1);
    };
  }

  emitEvent(event: Omit<ReplayEvent, 'id' | 'timestamp'>): ReplayEvent {
    const fullEvent: ReplayEvent = {
      ...event,
      id: this.eventId++,
      timestamp: Date.now() - this.startTime,
    };

    this.events.push(fullEvent);

    // 핸들러들에게 스트리밍
    for (const handler of this.handlers) {
      try {
        handler(fullEvent);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    }

    // 버퍼 플러시
    if (this.events.length >= this.bufferSize && this.flushCallback) {
      this.flushCallback([...this.events]);
      this.events = [];
    }

    return fullEvent;
  }

  startRecording(config: ReplayData['config']): void {
    this.config = config;
    this.events = [];
    this.eventId = 0;
    this.startTime = Date.now();

    this.emitEvent({
      turn: 0,
      phase: 'start',
      type: 'battle_start',
      actor: 'system',
      data: { config },
      description: `전투 시작: vs ${config.enemyName}`,
    });
  }

  getEvents(): ReplayEvent[] {
    return [...this.events];
  }
}

// ==================== 압축 저장소 ====================

export class CompressedReplayStorage {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async save(replay: EnhancedReplayData): Promise<string> {
    const json = JSON.stringify(replay);
    const compressed = await gzipAsync(Buffer.from(json, 'utf8'));
    const filename = `${replay.id}.replay.gz`;
    const filepath = `${this.basePath}/${filename}`;

    const fs = await import('fs/promises');
    await fs.mkdir(this.basePath, { recursive: true });
    await fs.writeFile(filepath, compressed);

    return filepath;
  }

  async load(replayId: string): Promise<EnhancedReplayData | null> {
    const filepath = `${this.basePath}/${replayId}.replay.gz`;

    try {
      const fs = await import('fs/promises');
      const compressed = await fs.readFile(filepath);
      const decompressed = await gunzipAsync(compressed);
      return JSON.parse(decompressed.toString('utf8'));
    } catch {
      return null;
    }
  }

  async search(query: ReplaySearchQuery): Promise<EnhancedReplayData[]> {
    const results: EnhancedReplayData[] = [];
    const fs = await import('fs/promises');

    try {
      const files = await fs.readdir(this.basePath);

      for (const file of files) {
        if (!file.endsWith('.replay.gz')) continue;

        const replayId = file.replace('.replay.gz', '');
        const replay = await this.load(replayId);
        if (!replay) continue;

        if (this.matchesQuery(replay, query)) {
          results.push(replay);
        }
      }
    } catch {
      // 디렉토리가 없거나 접근 불가
    }

    return results;
  }

  private matchesQuery(replay: EnhancedReplayData, query: ReplaySearchQuery): boolean {
    if (query.winner && replay.result.winner !== query.winner) return false;
    if (query.enemyId && replay.config.enemyId !== query.enemyId) return false;
    if (query.minTurns && replay.result.turns < query.minTurns) return false;
    if (query.maxTurns && replay.result.turns > query.maxTurns) return false;

    if (query.tags && query.tags.length > 0) {
      if (!query.tags.some(tag => replay.tags.includes(tag))) return false;
    }

    if (query.cardsUsed && query.cardsUsed.length > 0) {
      const usedCards = new Set(
        filterEvents(replay.events, { types: ['card_play'] })
          .map(e => e.data.cardId as string)
      );
      if (!query.cardsUsed.every(card => usedCards.has(card))) return false;
    }

    if (query.dateFrom && replay.timestamp < query.dateFrom.getTime()) return false;
    if (query.dateTo && replay.timestamp > query.dateTo.getTime()) return false;

    if (query.hasHighlight) {
      if (!replay.highlights.some(h => h.type === query.hasHighlight)) return false;
    }

    if (query.minRating && (replay.metadata.rating || 0) < query.minRating) return false;

    return true;
  }
}

// ==================== 하이라이트 자동 감지 ====================

export function detectHighlights(replay: ReplayData): ReplayHighlight[] {
  const highlights: ReplayHighlight[] = [];

  for (const event of replay.events) {
    // 치명타
    if (event.type === 'damage' && event.data.isCritical) {
      highlights.push({
        eventId: event.id,
        type: 'critical_hit',
        label: `치명타! ${event.data.actualDamage} 피해`,
        importance: 6,
      });
    }

    // 콤보
    if (event.type === 'combo') {
      highlights.push({
        eventId: event.id,
        type: 'combo',
        label: `콤보: ${event.data.comboName}`,
        importance: 7,
      });
    }

    // 빅 데미지 (50 이상)
    if (event.type === 'damage' && (event.data.actualDamage as number) >= 50) {
      highlights.push({
        eventId: event.id,
        type: 'big_damage',
        label: `대피해! ${event.data.actualDamage}`,
        importance: 8,
      });
    }

    // 완벽 방어
    if (event.type === 'damage' && (event.data.actualDamage as number) === 0 && (event.data.blocked as number) > 0) {
      highlights.push({
        eventId: event.id,
        type: 'perfect_block',
        label: `완벽 방어! ${event.data.blocked} 방어`,
        importance: 5,
      });
    }
  }

  // 위기 순간 감지
  for (const snapshot of replay.snapshots) {
    if (snapshot.player.hp <= snapshot.player.maxHp * 0.1 && snapshot.player.hp > 0) {
      highlights.push({
        eventId: -1,
        type: 'close_call',
        label: `위기! 턴 ${snapshot.turn}에서 HP ${snapshot.player.hp}`,
        importance: 9,
      });
    }
  }

  // 역전승
  if (replay.result.winner === 'player') {
    const finalSnapshot = replay.snapshots[replay.snapshots.length - 1];
    if (finalSnapshot && finalSnapshot.player.hp <= finalSnapshot.player.maxHp * 0.2) {
      highlights.push({
        eventId: replay.events[replay.events.length - 1].id,
        type: 'clutch_win',
        label: `역전승! HP ${finalSnapshot.player.hp}로 승리`,
        importance: 10,
      });
    }
  }

  return highlights.sort((a, b) => b.importance - a.importance);
}

// ==================== 유틸리티 ====================

export function enhanceReplay(replay: ReplayData, options?: Partial<ReplayMetadata>): EnhancedReplayData {
  const checksum = createHash('sha256')
    .update(JSON.stringify(replay.events))
    .digest('hex')
    .substring(0, 16);

  const enhanced: EnhancedReplayData = {
    ...replay,
    tags: [],
    metadata: {
      createdBy: 'simulator',
      ...options,
    },
    highlights: detectHighlights(replay),
    checksum,
  };

  // 자동 태그 생성
  if (replay.result.winner === 'player') enhanced.tags.push('win');
  else if (replay.result.winner === 'enemy') enhanced.tags.push('loss');
  else enhanced.tags.push('draw');

  if (replay.result.turns <= 5) enhanced.tags.push('quick');
  else if (replay.result.turns >= 20) enhanced.tags.push('long');

  if (enhanced.highlights.some(h => h.type === 'clutch_win')) enhanced.tags.push('clutch');
  if (enhanced.highlights.filter(h => h.type === 'combo').length >= 3) enhanced.tags.push('combo_heavy');

  return enhanced;
}

export function formatStatistics(stats: ReplayStatistics): string {
  return [
    '=== 리플레이 통계 ===',
    '',
    `결과: ${stats.general.winner === 'player' ? '승리' : '패배'} (${stats.general.totalTurns}턴)`,
    `HP 차이: ${stats.general.winMargin}`,
    '',
    '--- 피해량 ---',
    `플레이어 총 피해: ${stats.damage.playerTotalDamage}`,
    `적 총 피해: ${stats.damage.enemyTotalDamage}`,
    `턴당 플레이어 피해: ${stats.damage.playerDamagePerTurn.toFixed(1)}`,
    `최대 피해: ${stats.damage.maxPlayerHit}`,
    `치명타: ${stats.damage.criticalHits}회`,
    '',
    '--- 카드 사용 ---',
    `총 카드: ${stats.cards.totalCardsPlayed}장 (${stats.cards.uniqueCardsPlayed}종류)`,
    `가장 많이 사용: ${stats.cards.mostEffectiveCard}`,
    `콤보: ${stats.cards.combosTriggered.length}종류`,
    '',
    '--- 모멘텀 ---',
    `리드 변경: ${stats.momentum.leadChanges}회`,
    `가장 위험했던 순간: 턴 ${stats.momentum.closestCall.turn} (HP: ${stats.momentum.closestCall.playerHp})`,
    '',
    '--- 하이라이트 ---',
    `치명타: ${stats.highlights.criticalHits}`,
    `콤보: ${stats.highlights.combos}`,
    `위기 순간: ${stats.highlights.closeCalls}`,
    `완벽 방어: ${stats.highlights.perfectBlocks}`,
  ].join('\n');
}
