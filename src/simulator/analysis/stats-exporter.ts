/**
 * @file stats-exporter.ts
 * @description 통계 데이터 내보내기 (CSV, JSON)
 *
 * ## 기능
 * - 카드 통계 CSV 내보내기
 * - 적 통계 CSV 내보내기
 * - 전체 통계 JSON 내보내기
 */

import type { DetailedStats, CardDeepStats, DeathStats } from './detailed-stats-types';

// ==================== CSV 내보내기 ====================

/**
 * 카드 통계 CSV 생성
 */
export function exportCardStatsCSV(stats: DetailedStats): string {
  const headers = [
    'cardId',
    'cardName',
    'timesOffered',
    'timesPicked',
    'pickRate',
    'timesPlayed',
    'avgPlaysPerBattle',
    'neverPlayedRuns',
    'winRateWith',
    'winRateWithout',
    'contribution',
    'avgDamageDealt',
    'avgBlockGained',
  ];

  const rows: string[][] = [headers];
  const { cardDeepStats, cardPickStats, cardContributionStats } = stats;

  for (const [cardId, deepStats] of cardDeepStats) {
    rows.push([
      cardId,
      deepStats.cardName,
      String(cardPickStats.timesOffered[cardId] || 0),
      String(deepStats.timesPicked),
      String((cardPickStats.pickRate[cardId] || 0).toFixed(4)),
      String(deepStats.timesPlayed),
      String(deepStats.avgPlaysPerBattle.toFixed(4)),
      String(deepStats.neverPlayedRuns),
      String(deepStats.winRateWith.toFixed(4)),
      String(deepStats.winRateWithout.toFixed(4)),
      String((cardContributionStats.contribution[cardId] || 0).toFixed(4)),
      String(deepStats.avgDamageDealt.toFixed(2)),
      String(deepStats.avgBlockGained.toFixed(2)),
    ]);
  }

  return rows.map(row => row.join(',')).join('\n');
}

/**
 * 적 통계 CSV 생성
 */
export function exportMonsterStatsCSV(stats: DetailedStats): string {
  const headers = [
    'monsterId',
    'monsterName',
    'tier',
    'isBoss',
    'battles',
    'wins',
    'losses',
    'winRate',
    'avgTurns',
    'avgDamageTaken',
    'avgDamageDealt',
    'avgHpRemainingOnWin',
    'deaths',
    'deathRate',
  ];

  const rows: string[][] = [headers];
  const { monsterStats, deathStats } = stats;

  for (const [monsterId, monster] of monsterStats) {
    const deaths = deathStats.deathsByEnemy[monsterId] || 0;
    const deathRate = monster.battles > 0 ? deaths / monster.battles : 0;

    rows.push([
      monsterId,
      monster.monsterName,
      String(monster.tier),
      String(monster.isBoss),
      String(monster.battles),
      String(monster.wins),
      String(monster.losses),
      String(monster.winRate.toFixed(4)),
      String(monster.avgTurns.toFixed(2)),
      String(monster.avgDamageTaken.toFixed(2)),
      String(monster.avgDamageDealt.toFixed(2)),
      String(monster.avgHpRemainingOnWin.toFixed(2)),
      String(deaths),
      String(deathRate.toFixed(4)),
    ]);
  }

  return rows.map(row => row.join(',')).join('\n');
}

/**
 * 이벤트 통계 CSV 생성
 */
export function exportEventStatsCSV(stats: DetailedStats): string {
  const headers = [
    'eventId',
    'eventName',
    'occurrences',
    'successes',
    'successRate',
    'totalHpChange',
    'totalGoldChange',
    'avgHpChange',
    'avgGoldChange',
  ];

  const rows: string[][] = [headers];
  const { eventStats } = stats;

  for (const [eventId, event] of eventStats) {
    const avgHpChange = event.occurrences > 0 ? event.totalHpChange / event.occurrences : 0;
    const avgGoldChange = event.occurrences > 0 ? event.totalGoldChange / event.occurrences : 0;

    rows.push([
      eventId,
      event.eventName,
      String(event.occurrences),
      String(event.successes),
      String(event.successRate.toFixed(4)),
      String(event.totalHpChange),
      String(event.totalGoldChange),
      String(avgHpChange.toFixed(2)),
      String(avgGoldChange.toFixed(2)),
    ]);
  }

  return rows.map(row => row.join(',')).join('\n');
}

/**
 * 사망 통계 CSV 생성
 */
export function exportDeathStatsCSV(stats: DetailedStats): string {
  const headers = [
    'floor',
    'enemyId',
    'enemyName',
    'causeType',
    'overkillDamage',
    'turnsBeforeDeath',
    'deckSize',
    'attackCards',
    'skillCards',
    'powerCards',
    'relicCount',
  ];

  const rows: string[][] = [headers];
  const { deathStats } = stats;

  for (const death of deathStats.recentDeaths) {
    rows.push([
      String(death.floor),
      death.enemyId,
      death.enemyName,
      death.causeType,
      String(death.overkillDamage),
      String(death.turnsBeforeDeath),
      String(death.deckComposition.total),
      String(death.deckComposition.attacks),
      String(death.deckComposition.skills),
      String(death.deckComposition.powers),
      String(death.relicsAtDeath.length),
    ]);
  }

  return rows.map(row => row.join(',')).join('\n');
}

/**
 * 층별 스냅샷 CSV 생성 (최근 런들)
 */
export function exportFloorProgressionCSV(stats: DetailedStats): string {
  const headers = [
    'runIndex',
    'floor',
    'nodeType',
    'hp',
    'maxHp',
    'hpPercent',
    'gold',
    'deckSize',
    'relicCount',
  ];

  const rows: string[][] = [headers];

  stats.recentRunProgressions.forEach((run, runIndex) => {
    for (const floor of run.floorProgression) {
      rows.push([
        String(runIndex),
        String(floor.floor),
        floor.nodeType,
        String(floor.hp),
        String(floor.maxHp),
        String((floor.hp / floor.maxHp * 100).toFixed(1)),
        String(floor.gold),
        String(floor.deckSize),
        String(floor.relicCount),
      ]);
    }
  });

  return rows.map(row => row.join(',')).join('\n');
}

// ==================== JSON 내보내기 ====================

/**
 * 전체 통계 JSON 객체 생성 (Map을 Object로 변환)
 */
export function exportFullStatsJSON(stats: DetailedStats): object {
  return {
    meta: {
      startTime: stats.startTime.toISOString(),
      endTime: stats.endTime.toISOString(),
      exportedAt: new Date().toISOString(),
    },
    runStats: stats.runStats,
    cardStats: Object.fromEntries(stats.cardStats),
    monsterStats: Object.fromEntries(stats.monsterStats),
    eventStats: Object.fromEntries(stats.eventStats),
    eventChoiceStats: Object.fromEntries(stats.eventChoiceStats),
    upgradeStats: stats.upgradeStats,
    growthStats: stats.growthStats,
    shopStats: stats.shopStats,
    dungeonStats: stats.dungeonStats,
    shopServiceStats: stats.shopServiceStats,
    itemUsageStats: stats.itemUsageStats,
    aiStrategyStats: stats.aiStrategyStats,
    cardPickStats: stats.cardPickStats,
    cardContributionStats: stats.cardContributionStats,
    cardSynergyStats: stats.cardSynergyStats,
    cardDeepStats: Object.fromEntries(stats.cardDeepStats),
    deathStats: stats.deathStats,
    recordStats: stats.recordStats,
    difficultyStats: Object.fromEntries(stats.difficultyStats),
  };
}

/**
 * 요약 통계 JSON 생성 (경량화)
 */
export function exportSummaryJSON(stats: DetailedStats): object {
  const { runStats, deathStats, cardPickStats, cardContributionStats, difficultyStats } = stats;

  // 상위 카드 추출
  const topCards = Object.entries(cardPickStats.pickRate)
    .filter(([, rate]) => rate > 0.5)
    .map(([cardId, rate]) => ({
      cardId,
      pickRate: rate,
      contribution: cardContributionStats.contribution[cardId] || 0,
    }))
    .sort((a, b) => b.pickRate - a.pickRate)
    .slice(0, 10);

  // 난이도별 요약
  const difficultyArray = Array.from(difficultyStats.values()).map(d => ({
    difficulty: d.difficulty,
    runs: d.runs,
    winRate: d.winRate,
    avgFloorReached: d.avgFloorReached,
  }));

  return {
    summary: {
      totalRuns: runStats.totalRuns,
      winRate: runStats.successRate,
      avgFloorReached: runStats.avgLayerReached,
      totalBattles: Math.round(runStats.avgBattlesWon * runStats.totalRuns),
      avgBattlesWon: runStats.avgBattlesWon,
    },
    deathAnalysis: {
      totalDeaths: deathStats.totalDeaths,
      avgDeathFloor: deathStats.avgDeathFloor,
      topCauses: Object.entries(deathStats.deathsByCause)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      deadliestEnemies: deathStats.deadliestEnemies,
    },
    topCards,
    difficultyStats: difficultyArray,
    exportedAt: new Date().toISOString(),
  };
}

// ==================== 파일 다운로드 헬퍼 ====================

/**
 * 브라우저에서 파일 다운로드 트리거
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 카드 통계 CSV 다운로드
 */
export function downloadCardStatsCSV(stats: DetailedStats) {
  const csv = exportCardStatsCSV(stats);
  downloadFile(csv, 'card_stats.csv', 'text/csv');
}

/**
 * 적 통계 CSV 다운로드
 */
export function downloadMonsterStatsCSV(stats: DetailedStats) {
  const csv = exportMonsterStatsCSV(stats);
  downloadFile(csv, 'monster_stats.csv', 'text/csv');
}

/**
 * 전체 통계 JSON 다운로드
 */
export function downloadFullStatsJSON(stats: DetailedStats) {
  const json = JSON.stringify(exportFullStatsJSON(stats), null, 2);
  downloadFile(json, 'full_stats.json', 'application/json');
}

/**
 * 요약 통계 JSON 다운로드
 */
export function downloadSummaryJSON(stats: DetailedStats) {
  const json = JSON.stringify(exportSummaryJSON(stats), null, 2);
  downloadFile(json, 'summary_stats.json', 'application/json');
}
