/**
 * @file ai-share-formatter.ts
 * @description AI 공유를 위한 시뮬레이션 결과 포맷터
 *
 * 특징:
 * - 이모지/유니코드 장식 없음 (깔끔한 텍스트)
 * - 계층적 마크다운 구조 (AI가 파싱하기 쉬움)
 * - 핵심 데이터만 포함 (노이즈 최소화)
 * - 복사-붙여넣기 최적화
 */

import type {
  BattleResult,
  SimulationResult,
  SimulationSummary,
  SimulationConfig,
} from '../core/types';
import type { DetailedStats } from './detailed-stats-types';
import type { RunStatistics } from '../game/run-simulator';

// ==================== 유틸리티 ====================

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function num(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

// ==================== 전투 결과 포맷 ====================

export interface AIShareBattleOptions {
  /** 전투 로그 포함 여부 */
  includeLog?: boolean;
  /** 카드 사용 통계 포함 여부 */
  includeCardUsage?: boolean;
  /** 콤보 통계 포함 여부 */
  includeComboStats?: boolean;
  /** 토큰 통계 포함 여부 */
  includeTokenStats?: boolean;
}

/**
 * 단일 전투 결과를 AI 공유 형식으로 포맷
 */
export function formatBattleForAI(
  result: BattleResult,
  options: AIShareBattleOptions = {}
): string {
  const lines: string[] = [];

  // 기본 정보
  lines.push('# Battle Result');
  lines.push('');
  lines.push(`- Winner: ${result.winner}`);
  lines.push(`- Turns: ${result.turns}`);
  lines.push(`- Player HP: ${result.playerFinalHp}`);
  lines.push(`- Enemy HP: ${result.enemyFinalHp}`);
  lines.push(`- Player Damage Dealt: ${result.playerDamageDealt}`);
  lines.push(`- Enemy Damage Dealt: ${result.enemyDamageDealt}`);

  if (result.etherGained !== undefined) {
    lines.push(`- Ether Gained: ${result.etherGained}`);
  }

  // 카드 사용 통계
  if (options.includeCardUsage && Object.keys(result.cardUsage).length > 0) {
    lines.push('');
    lines.push('## Card Usage');
    const sorted = Object.entries(result.cardUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    for (const [card, count] of sorted) {
      lines.push(`- ${card}: ${count}`);
    }
  }

  // 콤보 통계
  if (options.includeComboStats && Object.keys(result.comboStats).length > 0) {
    lines.push('');
    lines.push('## Combo Stats');
    for (const [combo, count] of Object.entries(result.comboStats)) {
      lines.push(`- ${combo}: ${count}`);
    }
  }

  // 토큰 통계
  if (options.includeTokenStats && result.tokenStats && Object.keys(result.tokenStats).length > 0) {
    lines.push('');
    lines.push('## Token Stats');
    for (const [token, count] of Object.entries(result.tokenStats)) {
      lines.push(`- ${token}: ${count}`);
    }
  }

  // 전투 로그
  if (options.includeLog && result.battleLog.length > 0) {
    lines.push('');
    lines.push('## Battle Log');
    lines.push('```');
    for (const log of result.battleLog.slice(-30)) { // 마지막 30개만
      lines.push(log);
    }
    lines.push('```');
  }

  return lines.join('\n');
}

// ==================== 시뮬레이션 요약 포맷 ====================

export interface AIShareSimulationOptions {
  /** 카드 효율 Top N개 포함 */
  topCards?: number;
  /** 설정 정보 포함 여부 */
  includeConfig?: boolean;
  /** 원본 데이터 JSON 포함 여부 */
  includeRawJson?: boolean;
}

/**
 * 시뮬레이션 결과를 AI 공유 형식으로 포맷
 */
export function formatSimulationForAI(
  result: SimulationResult,
  options: AIShareSimulationOptions = {}
): string {
  const lines: string[] = [];
  const { summary, config } = result;

  lines.push('# Simulation Summary');
  lines.push('');

  // 설정 정보
  if (options.includeConfig) {
    lines.push('## Configuration');
    lines.push(`- Battles: ${config.battles}`);
    lines.push(`- Max Turns: ${config.maxTurns}`);
    lines.push(`- Enemies: ${config.enemyIds.join(', ')}`);
    lines.push(`- Deck Size: ${config.playerDeck.length}`);
    if (config.playerRelics?.length) {
      lines.push(`- Relics: ${config.playerRelics.join(', ')}`);
    }
    if (config.anomalyId) {
      lines.push(`- Anomaly: ${config.anomalyId} (Lv.${config.anomalyLevel ?? 1})`);
    }
    lines.push('');
  }

  // 핵심 통계
  lines.push('## Results');
  lines.push(`- Total Battles: ${summary.totalBattles}`);
  lines.push(`- Wins: ${summary.wins} (${pct(summary.winRate)})`);
  lines.push(`- Losses: ${summary.losses}`);
  lines.push(`- Draws: ${summary.draws}`);
  lines.push(`- Avg Turns: ${num(summary.avgTurns)}`);
  lines.push(`- Avg Player Damage: ${num(summary.avgPlayerDamage)}`);
  lines.push(`- Avg Enemy Damage: ${num(summary.avgEnemyDamage)}`);
  if (summary.avgEtherGained !== undefined) {
    lines.push(`- Avg Ether Gained: ${num(summary.avgEtherGained)}`);
  }

  // 실행 시간
  lines.push('');
  lines.push('## Performance');
  lines.push(`- Duration: ${formatDuration(result.duration)}`);
  lines.push(`- Timestamp: ${new Date(result.timestamp).toISOString()}`);

  // Top 카드
  const topN = options.topCards ?? 10;
  if (summary.topCards && summary.topCards.length > 0) {
    lines.push('');
    lines.push(`## Top ${topN} Cards`);
    lines.push('| Card | Uses | Avg Damage |');
    lines.push('|------|------|------------|');
    for (const card of summary.topCards.slice(0, topN)) {
      const cardId = card.cardId || card.id;
      lines.push(`| ${cardId} | ${card.uses || card.count || 0} | ${num(card.avgDamage)} |`);
    }
  }

  // 토큰 사용
  if (summary.tokenUsage && Object.keys(summary.tokenUsage).length > 0) {
    lines.push('');
    lines.push('## Token Usage');
    for (const [token, count] of Object.entries(summary.tokenUsage)) {
      lines.push(`- ${token}: ${count}`);
    }
  }

  // 원본 JSON
  if (options.includeRawJson) {
    lines.push('');
    lines.push('## Raw Data (JSON)');
    lines.push('```json');
    lines.push(JSON.stringify(summary, null, 2));
    lines.push('```');
  }

  return lines.join('\n');
}

// ==================== 런 통계 포맷 ====================

export interface AIShareRunStatsOptions {
  /** 전략 비교 포함 */
  includeStrategyComparison?: boolean;
  /** 원본 데이터 JSON 포함 */
  includeRawJson?: boolean;
}

/**
 * 런 통계를 AI 공유 형식으로 포맷
 */
export function formatRunStatsForAI(
  stats: RunStatistics,
  options: AIShareRunStatsOptions = {}
): string {
  const lines: string[] = [];

  lines.push('# Run Statistics');
  lines.push('');

  // 총괄 통계
  lines.push('## Overall');
  lines.push(`- Total Runs: ${stats.totalRuns}`);
  lines.push(`- Success Rate: ${pct(stats.successRate)}`);
  lines.push(`- Avg Final Layer: ${num(stats.avgFinalLayer)}`);
  lines.push(`- Avg Battles Won: ${num(stats.avgBattlesWon)}`);
  lines.push(`- Avg Gold Earned: ${num(stats.avgGoldEarned)}`);
  lines.push(`- Avg Cards in Deck: ${num(stats.avgCardsInDeck)}`);

  // 사망 원인
  if (stats.deathCauses && Object.keys(stats.deathCauses).length > 0) {
    lines.push('');
    lines.push('## Death Causes');
    const sorted = Object.entries(stats.deathCauses)
      .sort((a, b) => b[1] - a[1]);
    for (const [cause, count] of sorted) {
      const rate = count / Math.max(1, stats.totalRuns);
      lines.push(`- ${cause}: ${count} (${pct(rate)})`);
    }
  }

  // 전략 비교
  if (options.includeStrategyComparison && stats.strategyComparison) {
    lines.push('');
    lines.push('## Strategy Comparison');
    lines.push('| Strategy | Success Rate | Avg Layer |');
    lines.push('|----------|--------------|-----------|');
    for (const [strategy, data] of Object.entries(stats.strategyComparison)) {
      lines.push(`| ${strategy} | ${pct(data.successRate)} | ${num(data.avgLayer)} |`);
    }
  }

  // 원본 JSON
  if (options.includeRawJson) {
    lines.push('');
    lines.push('## Raw Data (JSON)');
    lines.push('```json');
    lines.push(JSON.stringify(stats, null, 2));
    lines.push('```');
  }

  return lines.join('\n');
}

// ==================== 상세 통계 포맷 ====================

/**
 * DetailedStats를 AI 공유 형식으로 포맷
 */
export function formatDetailedStatsForAI(
  stats: DetailedStats,
  options: { topN?: number; includeRawJson?: boolean } = {}
): string {
  const lines: string[] = [];
  const topN = options.topN ?? 10;

  lines.push('# Detailed Statistics');
  lines.push('');

  // 카드 통계
  if (stats.cardStats.size > 0) {
    lines.push('## Card Statistics');
    lines.push('| Card | Uses | Total Dmg | Avg Dmg | Win Contrib |');
    lines.push('|------|------|-----------|---------|-------------|');

    const cardArr = Array.from(stats.cardStats.entries())
      .sort((a, b) => b[1].totalUses - a[1].totalUses)
      .slice(0, topN);

    for (const [cardId, cardStat] of cardArr) {
      lines.push(`| ${cardId} | ${cardStat.totalUses} | ${cardStat.totalDamage} | ${num(cardStat.avgDamage)} | ${pct(cardStat.winContribution)} |`);
    }
  }

  // 몬스터 통계
  if (stats.monsterStats.size > 0) {
    lines.push('');
    lines.push('## Monster Statistics');
    lines.push('| Monster | Battles | Win% | Avg Turns |');
    lines.push('|---------|---------|------|-----------|');

    const monsterArr = Array.from(stats.monsterStats.entries())
      .sort((a, b) => b[1].battles - a[1].battles)
      .slice(0, topN);

    for (const [monsterId, monsterStat] of monsterArr) {
      lines.push(`| ${monsterId} | ${monsterStat.battles} | ${pct(monsterStat.winRate)} | ${num(monsterStat.avgTurns)} |`);
    }
  }

  // 이벤트 통계
  if (stats.eventStats.size > 0) {
    lines.push('');
    lines.push('## Event Statistics');
    lines.push('| Event | Occurrences | Success% |');
    lines.push('|-------|-------------|----------|');

    for (const [eventId, eventStat] of stats.eventStats) {
      lines.push(`| ${eventId} | ${eventStat.occurrences} | ${pct(eventStat.successRate)} |`);
    }
  }

  // 런 통계
  if (stats.runStats) {
    lines.push('');
    lines.push('## Run Statistics');
    lines.push(`- Total Runs: ${stats.runStats.totalRuns}`);
    lines.push(`- Success Rate: ${pct(stats.runStats.successRate)}`);
    lines.push(`- Avg Layer: ${num(stats.runStats.avgLayerReached)}`);
    lines.push(`- Avg Battles Won: ${num(stats.runStats.avgBattlesWon)}`);
    // 영혼파괴/육체파괴 통계
    const totalWins = (stats.runStats.soulDestructions || 0) + (stats.runStats.physicalDestructions || 0);
    if (totalWins > 0) {
      const soulRate = ((stats.runStats.soulDestructions || 0) / totalWins * 100).toFixed(1);
      const physRate = ((stats.runStats.physicalDestructions || 0) / totalWins * 100).toFixed(1);
      lines.push(`- Soul Destructions (Ether): ${stats.runStats.soulDestructions || 0} (${soulRate}%)`);
      lines.push(`- Physical Destructions (HP): ${stats.runStats.physicalDestructions || 0} (${physRate}%)`);
    }
  }

  // 원본 JSON
  if (options.includeRawJson) {
    lines.push('');
    lines.push('## Raw Data (JSON)');
    lines.push('```json');
    // Map을 Object로 변환
    const serializable = {
      cardStats: Object.fromEntries(stats.cardStats),
      monsterStats: Object.fromEntries(stats.monsterStats),
      eventStats: Object.fromEntries(stats.eventStats),
      runStats: stats.runStats,
    };
    lines.push(JSON.stringify(serializable, null, 2));
    lines.push('```');
  }

  return lines.join('\n');
}

// ==================== 밸런스 비교 포맷 ====================

export interface BalanceComparisonData {
  name: string;
  before: SimulationSummary;
  after: SimulationSummary;
  changes: string[];
}

/**
 * 밸런스 변경 전후 비교를 AI 공유 형식으로 포맷
 */
export function formatBalanceComparisonForAI(data: BalanceComparisonData): string {
  const lines: string[] = [];
  const { before, after } = data;

  lines.push(`# Balance Comparison: ${data.name}`);
  lines.push('');

  // 변경 사항
  if (data.changes.length > 0) {
    lines.push('## Changes');
    for (const change of data.changes) {
      lines.push(`- ${change}`);
    }
    lines.push('');
  }

  // 비교 테이블
  lines.push('## Results Comparison');
  lines.push('| Metric | Before | After | Change |');
  lines.push('|--------|--------|-------|--------|');

  const winRateDiff = after.winRate - before.winRate;
  const turnsDiff = after.avgTurns - before.avgTurns;
  const dmgDiff = after.avgPlayerDamage - before.avgPlayerDamage;

  lines.push(`| Win Rate | ${pct(before.winRate)} | ${pct(after.winRate)} | ${winRateDiff >= 0 ? '+' : ''}${pct(winRateDiff)} |`);
  lines.push(`| Avg Turns | ${num(before.avgTurns)} | ${num(after.avgTurns)} | ${turnsDiff >= 0 ? '+' : ''}${num(turnsDiff)} |`);
  lines.push(`| Avg Player Dmg | ${num(before.avgPlayerDamage)} | ${num(after.avgPlayerDamage)} | ${dmgDiff >= 0 ? '+' : ''}${num(dmgDiff)} |`);

  // 평가
  lines.push('');
  lines.push('## Assessment');
  if (Math.abs(winRateDiff) < 0.02) {
    lines.push('- Win rate change: Negligible (< 2%)');
  } else if (winRateDiff > 0) {
    lines.push(`- Win rate increased by ${pct(winRateDiff)} - Player buff`);
  } else {
    lines.push(`- Win rate decreased by ${pct(Math.abs(winRateDiff))} - Player nerf`);
  }

  return lines.join('\n');
}

// ==================== 종합 리포트 ====================

export interface ComprehensiveReportData {
  title: string;
  simulation?: SimulationResult;
  runStats?: RunStatistics;
  detailedStats?: DetailedStats;
  notes?: string[];
}

/**
 * 종합 리포트를 AI 공유 형식으로 포맷
 */
export function formatComprehensiveReportForAI(data: ComprehensiveReportData): string {
  const lines: string[] = [];

  lines.push(`# ${data.title}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  // 노트
  if (data.notes && data.notes.length > 0) {
    lines.push('## Notes');
    for (const note of data.notes) {
      lines.push(`- ${note}`);
    }
    lines.push('');
  }

  // 시뮬레이션 결과
  if (data.simulation) {
    lines.push(formatSimulationForAI(data.simulation, { topCards: 5 }));
    lines.push('');
  }

  // 런 통계
  if (data.runStats) {
    lines.push(formatRunStatsForAI(data.runStats));
    lines.push('');
  }

  // 상세 통계
  if (data.detailedStats) {
    lines.push(formatDetailedStatsForAI(data.detailedStats, { topN: 5 }));
  }

  return lines.join('\n');
}

// ==================== 클립보드 복사 헬퍼 ====================

/**
 * 텍스트를 클립보드에 복사 (Node.js 환경)
 * 터미널에서 실행 시 stdout으로 출력
 */
export function outputForCopy(text: string): void {
  console.log('\n' + '='.repeat(60));
  console.log('AI SHARE - Copy the content below:');
  console.log('='.repeat(60) + '\n');
  console.log(text);
  console.log('\n' + '='.repeat(60));
  console.log('End of AI share content');
  console.log('='.repeat(60) + '\n');
}

// ==================== 내보내기 ====================

export const AIShareFormatter = {
  battle: formatBattleForAI,
  simulation: formatSimulationForAI,
  runStats: formatRunStatsForAI,
  detailedStats: formatDetailedStatsForAI,
  balanceComparison: formatBalanceComparisonForAI,
  comprehensive: formatComprehensiveReportForAI,
  output: outputForCopy,
};

export default AIShareFormatter;
