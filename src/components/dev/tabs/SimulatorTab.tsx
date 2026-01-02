/**
 * SimulatorTab.tsx
 * 시뮬레이터 탭 - 게임 내에서 런 시뮬레이션 실행 및 상세 통계 확인
 */

import { useState, useCallback, memo } from 'react';
import type { CSSProperties } from 'react';
import { RELICS } from '../../../data/relics';
import { ITEMS } from '../../../data/items';
import { CARDS, ENEMIES } from '../../battle/battleData';
import { NEW_EVENT_LIBRARY } from '../../../data/newEvents';
import type { DetailedStats } from '../../../simulator/analysis/detailed-stats';

// AI 공유용 포맷 함수 (전체 통계 포함)
function formatStatsForAI(stats: DetailedStats, config: { runCount: number; difficulty: number; strategy: string }): string {
  const lines: string[] = [];
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const num = (v: number) => v.toFixed(1);
  const getCardName = (id: string) => CARDS.find(c => c.id === id)?.name || id;
  const getMonsterName = (id: string) => ENEMIES.find(e => e.id === id)?.name || id;
  const getRelicNameLocal = (id: string) => (RELICS as Record<string, { name?: string }>)[id]?.name || id;
  const getItemNameLocal = (id: string) => ITEMS[id]?.name || id;
  const getEventNameLocal = (id: string) => NEW_EVENT_LIBRARY[id]?.title || id;

  lines.push('# 시뮬레이션 결과');
  lines.push(`설정: ${config.runCount}런, 난이도 ${config.difficulty}, 전략: ${config.strategy}`);
  lines.push('');

  // ==================== 1. 런 통계 ====================
  lines.push('## 1. 런 통계');
  lines.push(`- 총 런: ${stats.runStats.totalRuns}회`);
  lines.push(`- 성공: ${stats.runStats.successfulRuns}회 (${pct(stats.runStats.successRate)})`);
  lines.push(`- 평균 도달 층: ${num(stats.runStats.avgLayerReached)}`);
  lines.push(`- 평균 전투 승리: ${num(stats.runStats.avgBattlesWon)}`);
  lines.push(`- 평균 골드: ${num(stats.runStats.avgGoldEarned)}`);
  lines.push(`- 평균 덱 크기: ${num(stats.runStats.avgFinalDeckSize)}`);
  lines.push('');

  // 사망 원인
  if (stats.runStats.deathCauses && Object.keys(stats.runStats.deathCauses).length > 0) {
    lines.push('### 사망 원인');
    Object.entries(stats.runStats.deathCauses)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cause, count]) => {
        lines.push(`- ${cause}: ${count}회 (${pct(count / stats.runStats.totalRuns)})`);
      });
    lines.push('');
  }

  // 층별 사망 분포
  if (stats.runStats.deathByLayer && Object.keys(stats.runStats.deathByLayer).length > 0) {
    lines.push('### 층별 사망');
    Object.entries(stats.runStats.deathByLayer)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .forEach(([layer, count]) => {
        lines.push(`- ${layer}층: ${count}회`);
      });
    lines.push('');
  }

  // 전략별 승률
  if (stats.runStats.strategyWinRates && Object.keys(stats.runStats.strategyWinRates).length > 0) {
    lines.push('### 전략별 승률');
    Object.entries(stats.runStats.strategyWinRates).forEach(([strat, rate]) => {
      lines.push(`- ${strat}: ${pct(rate)}`);
    });
    lines.push('');
  }

  // ==================== 2. 몬스터 통계 ====================
  if (stats.monsterStats.size > 0) {
    lines.push('## 2. 몬스터 전투');
    lines.push('| 몬스터 | 전투 | 승리 | 패배 | 승률 | 평균턴 | 준피해 | 받은피해 |');
    lines.push('|--------|------|------|------|------|--------|--------|----------|');
    Array.from(stats.monsterStats.entries())
      .sort((a, b) => b[1].battles - a[1].battles)
      .slice(0, 15)
      .forEach(([id, m]) => {
        lines.push(`| ${getMonsterName(id)} | ${m.battles} | ${m.wins} | ${m.losses} | ${pct(m.winRate)} | ${num(m.avgTurns)} | ${num(m.avgDamageDealt)} | ${num(m.avgDamageTaken)} |`);
      });
    lines.push('');
  }

  // ==================== 3. 카드 사용 통계 ====================
  if (stats.cardStats.size > 0) {
    lines.push('## 3. 카드 사용');
    lines.push('| 카드 | 사용 | 승리시 | 패배시 | 총피해 | 총방어 | 교차 |');
    lines.push('|------|------|--------|--------|--------|--------|------|');
    Array.from(stats.cardStats.entries())
      .sort((a, b) => b[1].totalUses - a[1].totalUses)
      .slice(0, 20)
      .forEach(([id, c]) => {
        lines.push(`| ${getCardName(id)} | ${c.totalUses} | ${c.usesInWins} | ${c.usesInLosses} | ${c.totalDamage} | ${c.totalBlock} | ${c.crossTriggers} |`);
      });
    lines.push('');
  }

  // ==================== 4. 카드 픽률 ====================
  if (stats.cardPickStats && Object.keys(stats.cardPickStats.timesOffered || {}).length > 0) {
    lines.push('## 4. 카드 픽률');
    lines.push('| 카드 | 제시 | 선택 | 스킵 | 픽률 |');
    lines.push('|------|------|------|------|------|');
    Object.entries(stats.cardPickStats.timesOffered || {})
      .sort((a, b) => (stats.cardPickStats.pickRate[b[0]] || 0) - (stats.cardPickStats.pickRate[a[0]] || 0))
      .slice(0, 15)
      .forEach(([id, offered]) => {
        const picked = stats.cardPickStats.timesPicked[id] || 0;
        const skipped = stats.cardPickStats.timesSkipped[id] || 0;
        const pickRate = stats.cardPickStats.pickRate[id] || 0;
        lines.push(`| ${getCardName(id)} | ${offered} | ${picked} | ${skipped} | ${pct(pickRate)} |`);
      });
    lines.push('');
  }

  // ==================== 5. 카드 기여도 ====================
  if (stats.cardContributionStats && Object.keys(stats.cardContributionStats.contribution || {}).length > 0) {
    lines.push('## 5. 카드 기여도');
    lines.push('| 카드 | 등장 | 보유시 승률 | 미보유시 승률 | 기여도 |');
    lines.push('|------|------|-------------|---------------|--------|');
    Object.entries(stats.cardContributionStats.contribution || {})
      .filter(([id]) => (stats.cardContributionStats.runsWithCard[id] || 0) >= 2)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 15)
      .forEach(([id, contrib]) => {
        const runs = stats.cardContributionStats.runsWithCard[id] || 0;
        const winWith = stats.cardContributionStats.winRateWithCard[id] || 0;
        const winWithout = stats.cardContributionStats.winRateWithoutCard[id] || 0;
        const sign = (contrib as number) > 0 ? '+' : '';
        lines.push(`| ${getCardName(id)} | ${runs} | ${pct(winWith)} | ${pct(winWithout)} | ${sign}${pct(contrib as number)} |`);
      });
    lines.push('');
  }

  // ==================== 6. 카드 시너지 ====================
  if (stats.cardSynergyStats?.topSynergies && stats.cardSynergyStats.topSynergies.length > 0) {
    lines.push('## 6. 카드 시너지 조합');
    lines.push('| 조합 | 등장 | 승률 |');
    lines.push('|------|------|------|');
    stats.cardSynergyStats.topSynergies.slice(0, 10).forEach(syn => {
      const [c1, c2] = syn.pair.split('+');
      lines.push(`| ${getCardName(c1)} + ${getCardName(c2)} | ${syn.frequency} | ${pct(syn.winRate)} |`);
    });
    lines.push('');
  }

  // ==================== 7. 상점 통계 ====================
  if (stats.shopStats && stats.shopStats.totalVisits > 0) {
    lines.push('## 7. 상점 통계');
    lines.push(`- 방문: ${stats.shopStats.totalVisits}회`);
    lines.push(`- 총 지출: ${stats.shopStats.totalSpent}G`);
    lines.push(`- 평균 지출: ${num(stats.shopStats.avgSpentPerVisit)}G/회`);
    lines.push(`- 카드 제거: ${stats.shopStats.cardsRemoved}회`);
    lines.push(`- 카드 승급: ${stats.shopStats.cardsUpgraded}회`);

    // 구매한 상징
    const relicEntries = Object.entries(stats.shopStats.relicsPurchased || {});
    if (relicEntries.length > 0) {
      lines.push('### 구매한 상징');
      relicEntries.forEach(([id, count]) => {
        lines.push(`- ${getRelicNameLocal(id)}: ${count}회`);
      });
    }

    // 구매한 카드
    const cardEntries = Object.entries(stats.shopStats.cardsPurchased || {});
    if (cardEntries.length > 0) {
      lines.push('### 구매한 카드');
      cardEntries.slice(0, 10).forEach(([id, count]) => {
        lines.push(`- ${getCardName(id)}: ${count}회`);
      });
    }
    lines.push('');
  }

  // ==================== 8. 던전 통계 ====================
  if (stats.dungeonStats && stats.dungeonStats.totalAttempts > 0) {
    lines.push('## 8. 던전 통계');
    lines.push(`- 진입: ${stats.dungeonStats.totalAttempts}회`);
    lines.push(`- 클리어: ${stats.dungeonStats.clears}회 (${pct(stats.dungeonStats.clearRate)})`);
    lines.push(`- 평균 턴: ${num(stats.dungeonStats.avgTurns)}`);
    lines.push(`- 평균 받은 피해: ${num(stats.dungeonStats.avgDamageTaken)}`);
    lines.push('');
  }

  // ==================== 9. 이벤트 통계 ====================
  if (stats.eventStats.size > 0) {
    lines.push('## 9. 이벤트 통계');
    lines.push('| 이벤트 | 발생 | 성공 | 성공률 | 골드변화 |');
    lines.push('|--------|------|------|--------|----------|');
    Array.from(stats.eventStats.entries())
      .sort((a, b) => b[1].occurrences - a[1].occurrences)
      .forEach(([id, e]) => {
        lines.push(`| ${getEventNameLocal(id)} | ${e.occurrences} | ${e.successes} | ${pct(e.successRate)} | ${e.totalGoldChange} |`);
      });
    lines.push('');

    // 이벤트 선택 상세
    if (stats.eventChoiceStats && stats.eventChoiceStats.size > 0) {
      lines.push('### 이벤트 선택 상세');
      Array.from(stats.eventChoiceStats.entries()).forEach(([eventId, choiceStats]) => {
        const eventName = getEventNameLocal(eventId);
        lines.push(`#### ${eventName}`);
        lines.push(`- 발생: ${choiceStats.occurrences ?? 0}회, 스킵: ${choiceStats.timesSkipped ?? 0}회`);
        if (choiceStats.choiceOutcomes) {
          Object.entries(choiceStats.choiceOutcomes).forEach(([choiceId, outcome]) => {
            lines.push(`  - 선택 "${choiceId}": ${outcome.timesChosen ?? 0}회, HP변화 ${(outcome.avgHpChange ?? 0).toFixed(1)}, 골드변화 ${(outcome.avgGoldChange ?? 0).toFixed(0)}, 성공률 ${pct(outcome.successRate ?? 0)}`);
          });
        }
      });
      lines.push('');
    }
  }

  // ==================== 10. 아이템 통계 ====================
  const itemAcquired = Object.entries(stats.itemUsageStats?.itemsAcquired || {});
  if (itemAcquired.length > 0) {
    lines.push('## 10. 아이템 통계');
    lines.push('| 아이템 | 획득 | 사용 |');
    lines.push('|--------|------|------|');
    itemAcquired.slice(0, 10).forEach(([id, acquired]) => {
      const used = stats.itemUsageStats.itemsUsed[id] || 0;
      lines.push(`| ${getItemNameLocal(id)} | ${acquired} | ${used} |`);
    });
    lines.push('');
  }

  // ==================== 11. 카드 승급 통계 ====================
  if (stats.upgradeStats && stats.upgradeStats.totalUpgrades > 0) {
    lines.push('## 11. 카드 승급');
    lines.push(`- 총 승급: ${stats.upgradeStats.totalUpgrades}회`);
    lines.push(`- 런당 평균: ${num(stats.upgradeStats.avgUpgradesPerRun)}회`);

    const upgradeEntries = Object.entries(stats.upgradeStats.upgradesByCard || {});
    if (upgradeEntries.length > 0) {
      lines.push('### 승급된 카드');
      upgradeEntries.sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([id, count]) => {
        lines.push(`- ${getCardName(id)}: ${count}회`);
      });
    }
    lines.push('');
  }

  // ==================== 12. 성장 통계 ====================
  if (stats.growthStats && stats.growthStats.totalInvestments > 0) {
    lines.push('## 12. 성장 통계');
    lines.push(`- 총 투자: ${stats.growthStats.totalInvestments}회`);
    lines.push(`- 런당 평균: ${num(stats.growthStats.avgInvestmentsPerRun)}회`);

    // 개성(trait) 투자
    const traitEntries = Object.entries(stats.growthStats.statInvestments || {});
    if (traitEntries.length > 0) {
      lines.push('### 개성 투자');
      traitEntries.sort((a, b) => b[1] - a[1]).forEach(([stat, count]) => {
        lines.push(`- ${stat}: ${count}회`);
      });
    }

    // 에토스 투자
    const ethosEntries = Object.entries(stats.growthStats.ethosInvestments || {});
    if (ethosEntries.length > 0) {
      lines.push('### 에토스 투자');
      lines.push('| 에토스 | 횟수 |');
      lines.push('|--------|------|');
      ethosEntries.sort((a, b) => b[1] - a[1]).forEach(([ethos, count]) => {
        lines.push(`| ${ethos} | ${count} |`);
      });
    }

    // 파토스 투자
    const pathosEntries = Object.entries(stats.growthStats.pathosInvestments || {});
    if (pathosEntries.length > 0) {
      lines.push('### 파토스 투자');
      lines.push('| 파토스 | 횟수 |');
      lines.push('|--------|------|');
      pathosEntries.sort((a, b) => b[1] - a[1]).forEach(([pathos, count]) => {
        lines.push(`| ${pathos} | ${count} |`);
      });
    }

    // 로고스 투자
    const logosInvEntries = Object.entries(stats.growthStats.logosInvestments || {});
    if (logosInvEntries.length > 0) {
      lines.push('### 로고스 해금');
      lines.push('| 로고스 | 횟수 |');
      lines.push('|--------|------|');
      logosInvEntries.sort((a, b) => b[1] - a[1]).forEach(([logos, count]) => {
        lines.push(`| ${logos} | ${count} |`);
      });
    }

    // 스탯별 승률 상관관계
    const corrEntries = Object.entries(stats.growthStats.statWinCorrelation || {});
    if (corrEntries.length > 0) {
      lines.push('### 스탯별 승률 기여도');
      lines.push('| 스탯 | 기여도 |');
      lines.push('|------|--------|');
      corrEntries.sort((a, b) => (b[1] as number) - (a[1] as number)).forEach(([stat, corr]) => {
        const sign = (corr as number) > 0 ? '+' : '';
        lines.push(`| ${stat} | ${sign}${pct(corr as number)} |`);
      });
    }

    // 성장 경로별 통계
    if (stats.growthStats.growthPathStats && stats.growthStats.growthPathStats.length > 0) {
      lines.push('### 성장 경로별 승률');
      lines.push('| 경로 | 횟수 | 승률 | 평균레벨 |');
      lines.push('|------|------|------|----------|');
      stats.growthStats.growthPathStats.slice(0, 5).forEach(path => {
        lines.push(`| ${path.path} | ${path.count} | ${pct(path.winRate)} | ${num(path.avgFinalLevel)} |`);
      });
    }

    // 최종 스탯 분포
    const finalStatEntries = Object.entries(stats.growthStats.finalStatDistribution || {});
    if (finalStatEntries.length > 0) {
      lines.push('### 최종 스탯 분포');
      lines.push('| 스탯 | 평균 | 최대 |');
      lines.push('|------|------|------|');
      finalStatEntries.forEach(([stat, data]) => {
        lines.push(`| ${stat} | ${num(data.avg)} | ${data.max} |`);
      });
    }

    // 로고스 효과 발동
    const logosActEntries = Object.entries(stats.growthStats.logosActivations || {});
    if (logosActEntries.length > 0) {
      lines.push('### 로고스 효과 발동');
      logosActEntries.sort((a, b) => b[1] - a[1]).forEach(([effect, count]) => {
        lines.push(`- ${effect}: ${count}회`);
      });
    }
    lines.push('');
  }

  // ==================== 13. AI 전략 통계 ====================
  if (stats.aiStrategyStats) {
    const stratUsage = Object.entries(stats.aiStrategyStats.strategyUsage || {});
    if (stratUsage.length > 0) {
      lines.push('## 13. AI 전략');
      lines.push('| 전략 | 사용 | 승률 | 평균턴 |');
      lines.push('|------|------|------|--------|');
      stratUsage.forEach(([strat, usage]) => {
        const winRate = stats.aiStrategyStats.strategyWinRate[strat] || 0;
        const avgTurns = stats.aiStrategyStats.strategyAvgTurns[strat] || 0;
        lines.push(`| ${strat} | ${usage} | ${pct(winRate)} | ${num(avgTurns)} |`);
      });
      lines.push('');
    }

    // 콤보 사용
    const comboUsage = Object.entries(stats.aiStrategyStats.comboTypeUsage || {});
    if (comboUsage.length > 0) {
      lines.push('### 콤보 발동');
      comboUsage.sort((a, b) => b[1] - a[1]).forEach(([combo, count]) => {
        lines.push(`- ${combo}: ${count}회`);
      });
      lines.push('');
    }
  }

  // ==================== 14. 사망 분석 ====================
  if (stats.deathStats && stats.deathStats.totalDeaths > 0) {
    lines.push('## 14. 사망 분석');
    lines.push(`- 총 사망: ${stats.deathStats.totalDeaths}회`);
    lines.push(`- 평균 사망 층: ${num(stats.deathStats.avgDeathFloor)}`);
    lines.push('');

    // 층별 사망 분포
    const floorDeaths = Object.entries(stats.deathStats.deathsByFloor).sort((a, b) => Number(a[0]) - Number(b[0]));
    if (floorDeaths.length > 0) {
      lines.push('### 층별 사망 분포');
      lines.push('| 층 | 사망 수 | 비율 |');
      lines.push('|----|--------|------|');
      floorDeaths.forEach(([floor, deaths]) => {
        const rate = stats.deathStats.totalDeaths > 0 ? deaths / stats.deathStats.totalDeaths : 0;
        lines.push(`| ${floor} | ${deaths} | ${pct(rate)} |`);
      });
      lines.push('');
    }

    // 가장 위험한 적
    if (stats.deathStats.deadliestEnemies && stats.deathStats.deadliestEnemies.length > 0) {
      lines.push('### 가장 위험한 적');
      lines.push('| 적 | 사망 수 | 사망률 |');
      lines.push('|----|--------|--------|');
      stats.deathStats.deadliestEnemies.forEach(enemy => {
        lines.push(`| ${enemy.enemyName} | ${enemy.deaths} | ${pct(enemy.encounterRate)} |`);
      });
      lines.push('');
    }

    // 사망 원인별 분포
    const causeDeaths = Object.entries(stats.deathStats.deathsByCause);
    if (causeDeaths.length > 0) {
      lines.push('### 사망 원인');
      const causeNames: Record<string, string> = {
        burst: '버스트 피해',
        attrition: '지속 피해',
        bad_hand: '나쁜 핸드',
        resource_exhaustion: '자원 고갈',
      };
      causeDeaths.sort((a, b) => b[1] - a[1]).forEach(([cause, count]) => {
        lines.push(`- ${causeNames[cause] || cause}: ${count}회`);
      });
      lines.push('');
    }
  }

  // ==================== 15. 카드 심층 분석 ====================
  if (stats.cardDeepStats && stats.cardDeepStats.size > 0) {
    lines.push('## 15. 카드 심층 분석');

    // 가장 많이 사용된 카드 (timesPlayed 기준)
    const topPlayed = Array.from(stats.cardDeepStats.entries())
      .filter(([, s]) => s.timesPlayed > 0)
      .sort((a, b) => b[1].timesPlayed - a[1].timesPlayed)
      .slice(0, 10);

    if (topPlayed.length > 0) {
      lines.push('### 가장 많이 사용된 카드');
      lines.push('| 카드 | 사용 | 전투당 평균 | 피해 | 방어 |');
      lines.push('|------|------|------------|------|------|');
      topPlayed.forEach(([cardId, s]) => {
        lines.push(`| ${getCardName(cardId)} | ${s.timesPlayed} | ${num(s.avgPlaysPerBattle)} | ${num(s.avgDamageDealt)} | ${num(s.avgBlockGained)} |`);
      });
      lines.push('');
    }

    // 픽했지만 사용하지 않은 카드
    const neverUsed = Array.from(stats.cardDeepStats.entries())
      .filter(([, s]) => s.timesPicked >= 5 && s.neverPlayedRuns > 0)
      .sort((a, b) => b[1].neverPlayedRuns - a[1].neverPlayedRuns)
      .slice(0, 5);

    if (neverUsed.length > 0) {
      lines.push('### 픽했지만 사용 안 한 카드');
      neverUsed.forEach(([cardId, s]) => {
        lines.push(`- ${getCardName(cardId)}: ${s.neverPlayedRuns}런에서 미사용`);
      });
      lines.push('');
    }
  }

  // ==================== 16. 기록 통계 ====================
  if (stats.recordStats) {
    lines.push('## 16. 기록');
    lines.push(`- 최장 연승: ${stats.recordStats.longestWinStreak}연승`);
    lines.push(`- 현재 연승: ${stats.recordStats.currentWinStreak}연승`);
    lines.push(`- 무피해 전투 승리: ${stats.recordStats.flawlessVictories}회`);
    lines.push(`- 보스 무피해 클리어: ${stats.recordStats.bossFlawlessCount}회`);
    lines.push(`- 단일 턴 최대 피해: ${stats.recordStats.maxSingleTurnDamage}`);
    if (stats.recordStats.maxDamageRecord) {
      lines.push(`  - ${getCardName(stats.recordStats.maxDamageRecord.cardId)}로 ${stats.recordStats.maxDamageRecord.monster} 상대`);
    }
    lines.push(`- 최다 골드 보유: ${stats.recordStats.maxGoldHeld}G`);
    if (stats.recordStats.fastestClear > 0) {
      lines.push(`- 가장 빠른 클리어: ${stats.recordStats.fastestClear}전투`);
    }
    if (stats.recordStats.smallestDeckClear > 0) {
      lines.push(`- 가장 작은 덱 클리어: ${stats.recordStats.smallestDeckClear}장`);
    }
    if (stats.recordStats.largestDeckClear > 0) {
      lines.push(`- 가장 큰 덱 클리어: ${stats.recordStats.largestDeckClear}장`);
    }
  }
  lines.push('');

  // ==================== 16a. 상징 통계 ====================
  if (stats.relicStats && stats.relicStats.size > 0) {
    lines.push('## 16a. 상징 통계');

    // 가장 유용한 상징 (기여도 순)
    const topRelics = Array.from(stats.relicStats.entries())
      .filter(([, s]) => s.timesAcquired >= 2)
      .sort((a, b) => b[1].contribution - a[1].contribution)
      .slice(0, 10);

    if (topRelics.length > 0) {
      lines.push('### 상징별 기여도');
      lines.push('| 상징 | 획득 | 보유시 승률 | 미보유시 승률 | 기여도 | 효과발동 |');
      lines.push('|------|------|------------|--------------|--------|----------|');
      topRelics.forEach(([, s]) => {
        const sign = s.contribution > 0 ? '+' : '';
        lines.push(`| ${getRelicNameLocal(s.relicId)} | ${s.timesAcquired} | ${pct(s.winRateWith)} | ${pct(s.winRateWithout)} | ${sign}${pct(s.contribution)} | ${s.effectTriggers} |`);
      });
      lines.push('');
    }

    // 가장 무용한 상징 (기여도 낮은 순)
    const worstRelics = Array.from(stats.relicStats.entries())
      .filter(([, s]) => s.timesAcquired >= 2 && s.contribution < 0)
      .sort((a, b) => a[1].contribution - b[1].contribution)
      .slice(0, 5);

    if (worstRelics.length > 0) {
      lines.push('### 승률에 부정적인 상징');
      worstRelics.forEach(([, s]) => {
        lines.push(`- ${getRelicNameLocal(s.relicId)}: 기여도 ${pct(s.contribution)}`);
      });
      lines.push('');
    }

    // 획득 출처별 통계
    const sourceStats: Record<string, number> = {};
    for (const [, s] of stats.relicStats) {
      for (const [source, count] of Object.entries(s.acquiredFrom)) {
        sourceStats[source] = (sourceStats[source] || 0) + count;
      }
    }
    if (Object.keys(sourceStats).length > 0) {
      const sourceNames: Record<string, string> = {
        battle: '전투 보상',
        shop: '상점 구매',
        event: '이벤트',
        dungeon: '던전',
        boss: '보스',
        starting: '시작 상징',
      };
      lines.push('### 상징 획득 출처');
      Object.entries(sourceStats)
        .sort((a, b) => b[1] - a[1])
        .forEach(([source, count]) => {
          lines.push(`- ${sourceNames[source] || source}: ${count}회`);
        });
      lines.push('');
    }
  }

  // ==================== 17. 난이도별 통계 (Hades Heat 스타일) ====================
  if (stats.difficultyStats && stats.difficultyStats.size > 0) {
    lines.push('## 17. 난이도별 통계');
    lines.push('| 난이도 | 런 | 승리 | 승률 | 평균층 | 연승 |');
    lines.push('|--------|-----|------|------|--------|------|');
    Array.from(stats.difficultyStats.entries())
      .sort((a, b) => a[0] - b[0])
      .forEach(([diff, d]) => {
        lines.push(`| ${diff} | ${d.runs} | ${d.wins} | ${pct(d.winRate)} | ${num(d.avgFloorReached)} | ${d.winStreak} |`);
      });
    lines.push('');
  }

  // ==================== 18. 카드 선택 컨텍스트 (Slay the Spire 스타일) ====================
  if (stats.allCardChoices && stats.allCardChoices.length > 0) {
    lines.push('## 18. 카드 선택 분석');

    // 카드별로 경쟁 상황 분석
    const cardWinContext: Record<string, { picked: number; total: number; competitors: Record<string, number> }> = {};

    stats.allCardChoices.forEach(choice => {
      if (choice.pickedCardId) {
        if (!cardWinContext[choice.pickedCardId]) {
          cardWinContext[choice.pickedCardId] = { picked: 0, total: 0, competitors: {} };
        }
        cardWinContext[choice.pickedCardId].picked++;
        cardWinContext[choice.pickedCardId].total++;

        // 경쟁 카드 기록
        choice.notPickedCardIds.forEach(notPicked => {
          cardWinContext[choice.pickedCardId].competitors[notPicked] =
            (cardWinContext[choice.pickedCardId].competitors[notPicked] || 0) + 1;
        });
      }

      // 선택되지 않은 카드들도 total 증가
      choice.notPickedCardIds.forEach(notPicked => {
        if (!cardWinContext[notPicked]) {
          cardWinContext[notPicked] = { picked: 0, total: 0, competitors: {} };
        }
        cardWinContext[notPicked].total++;
      });
    });

    lines.push('### 카드별 선택 경쟁률');
    lines.push('| 카드 | 제시 | 선택 | 선택률 | 주요 경쟁카드 |');
    lines.push('|------|------|------|--------|--------------|');
    Object.entries(cardWinContext)
      .filter(([, data]) => data.total >= 3)
      .sort((a, b) => (b[1].picked / b[1].total) - (a[1].picked / a[1].total))
      .slice(0, 15)
      .forEach(([cardId, data]) => {
        const topCompetitor = Object.entries(data.competitors)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([id]) => getCardName(id))
          .join(', ') || '-';
        lines.push(`| ${getCardName(cardId)} | ${data.total} | ${data.picked} | ${pct(data.picked / data.total)} | ${topCompetitor} |`);
      });
    lines.push('');
  }

  // ==================== 17. 최근 런 진행 요약 ====================
  if (stats.recentRunProgressions && stats.recentRunProgressions.length > 0) {
    lines.push('## 17. 최근 런 진행 요약');
    stats.recentRunProgressions.slice(0, 3).forEach((run, i) => {
      lines.push(`### 런 ${i + 1}`);
      lines.push(`- 경로: ${run.pathTaken.join(' → ')}`);
      lines.push(`- 최종 덱(${run.finalDeck.length}장): ${run.finalDeck.map(getCardName).join(', ')}`);
      if (run.finalRelics.length > 0) {
        lines.push(`- 최종 상징: ${run.finalRelics.map(getRelicNameLocal).join(', ')}`);
      }

      // 전투별 피해 요약
      if (run.damagePerBattle.length > 0) {
        const totalDamage = run.damagePerBattle.reduce((sum, b) => sum + b.damage, 0);
        const avgDamage = totalDamage / run.damagePerBattle.length;
        lines.push(`- 전투 피해: 총 ${totalDamage}, 평균 ${num(avgDamage)}/전투`);
      }
      lines.push('');
    });
  }

  return lines.join('\n');
}

// 한글 이름 조회 헬퍼 함수들
function getRelicName(id: string): string {
  return (RELICS as Record<string, { name?: string }>)[id]?.name || id;
}

function getItemName(id: string): string {
  return ITEMS[id]?.name || id;
}

function getCardName(id: string): string {
  const card = CARDS.find(c => c.id === id);
  return card?.name || id;
}

function getMonsterName(id: string): string {
  const enemy = ENEMIES.find(e => e.id === id);
  return enemy?.name || id;
}

function getEventName(id: string): string {
  return NEW_EVENT_LIBRARY[id]?.title || id;
}

// 카드 효과 요약 문자열 생성
function getCardEffectStr(id: string): string {
  const card = CARDS.find(c => c.id === id);
  if (!card) return '-';
  const effects: string[] = [];
  if (card.damage) effects.push(`피해 ${card.damage}${card.hits && card.hits > 1 ? `×${card.hits}` : ''}`);
  if (card.block) effects.push(`방어 ${card.block}`);
  if (card.speedCost) effects.push(`속도 ${card.speedCost}`);
  return effects.join(', ') || '-';
}

// 스타일 상수
const STYLES = {
  sectionHeader: { marginTop: 0, color: '#fbbf24', fontSize: '1.125rem' } as CSSProperties,
  sectionBox: { padding: '16px', background: '#0f172a', borderRadius: '8px', marginBottom: '16px' } as CSSProperties,
  label: { display: 'block', marginBottom: '8px', fontSize: '0.875rem', color: '#cbd5e1' } as CSSProperties,
  input: { width: '80px', padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#cbd5e1', fontSize: '0.875rem' } as CSSProperties,
  select: { flex: 1, padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#cbd5e1', fontSize: '0.875rem' } as CSSProperties,
  button: { padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '0.875rem', fontWeight: 'bold', cursor: 'pointer' } as CSSProperties,
  buttonRunning: { padding: '8px 16px', background: '#64748b', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '0.875rem', fontWeight: 'bold', cursor: 'not-allowed' } as CSSProperties,
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' } as CSSProperties,
  statItem: { padding: '8px', background: '#1e293b', borderRadius: '6px', fontSize: '0.875rem' } as CSSProperties,
  statLabel: { color: '#94a3b8', fontSize: '0.75rem' } as CSSProperties,
  statValue: { color: '#fbbf24', fontWeight: 'bold', fontSize: '1rem' } as CSSProperties,
  progressBar: { height: '4px', background: '#334155', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' } as CSSProperties,
  progressFill: { height: '100%', background: '#3b82f6', transition: 'width 0.2s' } as CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' } as CSSProperties,
  th: { textAlign: 'left', padding: '6px 8px', background: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' } as CSSProperties,
  td: { padding: '6px 8px', borderBottom: '1px solid #334155', color: '#e2e8f0' } as CSSProperties,
  tabButton: { padding: '6px 12px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', borderBottom: '2px solid transparent' } as CSSProperties,
  tabButtonActive: { padding: '6px 12px', background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.8rem', borderBottom: '2px solid #3b82f6', fontWeight: 'bold' } as CSSProperties,
  scrollBox: { maxHeight: '300px', overflowY: 'auto' } as CSSProperties,
} as const;

type StatTab = 'run' | 'shop' | 'dungeon' | 'event' | 'item' | 'monster' | 'card' | 'pickrate' | 'contribution' | 'synergy' | 'records';

const SimulatorTab = memo(function SimulatorTab() {
  const [runCount, setRunCount] = useState(10);
  const [difficulty, setDifficulty] = useState(1);
  const [strategy, setStrategy] = useState<'balanced' | 'aggressive' | 'defensive'>('balanced');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<DetailedStats | null>(null);
  const [activeStatTab, setActiveStatTab] = useState<StatTab>('run');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  // AI 공유용 복사 함수
  const copyForAI = useCallback(async () => {
    if (!stats) return;

    try {
      const text = formatStatsForAI(stats, { runCount, difficulty, strategy });
      await navigator.clipboard.writeText(text);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  }, [stats, runCount, difficulty, strategy]);

  const runSimulation = useCallback(async () => {
    setIsRunning(true);
    setProgress(0);
    setStats(null);

    try {
      const { RunSimulator } = await import('../../../simulator/game/run-simulator');
      const { StatsCollector } = await import('../../../simulator/analysis/detailed-stats');
      const { setLogLevel, LogLevel } = await import('../../../simulator/core/logger');

      setLogLevel(LogLevel.SILENT);

      const collector = new StatsCollector();
      const simulator = new RunSimulator();
      simulator.setStatsCollector(collector);

      await simulator.loadGameData();

      for (let i = 0; i < runCount; i++) {
        simulator.simulateRun({
          initialPlayer: {
            hp: 80, maxHp: 80, gold: 150, intel: 0, material: 0, loot: 0, grace: 0,
            strength: 0, agility: 0, insight: 0,
            deck: ['shoot', 'shoot', 'strike', 'strike', 'strike', 'reload', 'quarte', 'octave', 'breach', 'deflect'],
            relics: [], items: [], upgradedCards: []
          },
          difficulty,
          strategy
        });

        setProgress(Math.round(((i + 1) / runCount) * 100));
        if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
      }

      setStats(collector.finalize());
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsRunning(false);
    }
  }, [runCount, difficulty, strategy]);

  const statTabs: { id: StatTab; label: string }[] = [
    { id: 'run', label: '런' },
    { id: 'shop', label: '상점' },
    { id: 'dungeon', label: '던전' },
    { id: 'event', label: '이벤트' },
    { id: 'item', label: '아이템' },
    { id: 'monster', label: '몬스터' },
    { id: 'card', label: '카드' },
    { id: 'pickrate', label: '픽률' },
    { id: 'contribution', label: '기여도' },
    { id: 'synergy', label: '시너지' },
    { id: 'records', label: '기록' },
  ];

  return (
    <div>
      <h3 style={STYLES.sectionHeader}>🎮 런 시뮬레이터</h3>

      {/* 설정 섹션 */}
      <div style={STYLES.sectionBox}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <div>
            <label style={STYLES.label}>런 횟수</label>
            <input type="number" min={1} max={100} value={runCount}
              onChange={e => setRunCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
              style={STYLES.input} disabled={isRunning} />
          </div>
          <div>
            <label style={STYLES.label}>난이도</label>
            <input type="number" min={1} max={5} value={difficulty}
              onChange={e => setDifficulty(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
              style={STYLES.input} disabled={isRunning} />
          </div>
          <div>
            <label style={STYLES.label}>전략</label>
            <select value={strategy} onChange={e => setStrategy(e.target.value as typeof strategy)}
              style={STYLES.select} disabled={isRunning}>
              <option value="balanced">균형</option>
              <option value="aggressive">공격적</option>
              <option value="defensive">방어적</option>
            </select>
          </div>
        </div>
        <button onClick={runSimulation} style={isRunning ? STYLES.buttonRunning : STYLES.button} disabled={isRunning}>
          {isRunning ? `시뮬레이션 중... ${progress}%` : '시뮬레이션 실행'}
        </button>
        {isRunning && <div style={STYLES.progressBar}><div style={{ ...STYLES.progressFill, width: `${progress}%` }} /></div>}
      </div>

      {/* 결과 통계 */}
      {stats && (
        <>
          {/* 탭 네비게이션 + AI 공유 버튼 */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {statTabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveStatTab(tab.id)}
                style={activeStatTab === tab.id ? STYLES.tabButtonActive : STYLES.tabButton}>
                {tab.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button
              onClick={copyForAI}
              style={{
                padding: '6px 12px',
                background: copyStatus === 'copied' ? '#22c55e' : copyStatus === 'error' ? '#ef4444' : '#8b5cf6',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {copyStatus === 'copied' ? '✓ 복사됨!' : copyStatus === 'error' ? '✗ 실패' : '📋 AI 공유용 복사'}
            </button>
          </div>

          <div style={STYLES.sectionBox}>
            {/* 런 통계 */}
            {activeStatTab === 'run' && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#22c55e' }}>📊 런 통계</h4>
                <div style={STYLES.statsGrid}>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>총 런</div><div style={STYLES.statValue}>{stats.runStats.totalRuns ?? 0}회</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>성공률</div><div style={STYLES.statValue}>{((stats.runStats.successRate ?? 0) * 100).toFixed(1)}%</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>평균 도달 층</div><div style={STYLES.statValue}>{(stats.runStats.avgLayerReached ?? 0).toFixed(1)}</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>평균 전투 승리</div><div style={STYLES.statValue}>{(stats.runStats.avgBattlesWon ?? 0).toFixed(1)}</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>평균 골드 획득</div><div style={STYLES.statValue}>{(stats.runStats.avgGoldEarned ?? 0).toFixed(0)}G</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>평균 덱 크기</div><div style={STYLES.statValue}>{(stats.runStats.avgFinalDeckSize ?? 0).toFixed(1)}장</div></div>
                </div>
              </>
            )}

            {/* 상점 통계 */}
            {activeStatTab === 'shop' && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#a855f7' }}>🛒 상점 통계</h4>
                <div style={STYLES.statsGrid}>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>방문</div><div style={STYLES.statValue}>{stats.shopStats.totalVisits}회</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>총 지출</div><div style={STYLES.statValue}>{stats.shopStats.totalSpent}G</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>평균 지출</div><div style={STYLES.statValue}>{(stats.shopStats.avgSpentPerVisit ?? 0).toFixed(0)}G/회</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>카드 제거</div><div style={STYLES.statValue}>{stats.shopStats.cardsRemoved}회</div></div>
                </div>

                <h5 style={{ margin: '16px 0 8px 0', color: '#cbd5e1' }}>구매한 상징</h5>
                <div style={STYLES.scrollBox}>
                  <table style={STYLES.table}>
                    <thead><tr><th style={STYLES.th}>상징</th><th style={STYLES.th}>횟수</th></tr></thead>
                    <tbody>
                      {Object.entries(stats.shopStats.relicsPurchased || {}).map(([id, count]) => (
                        <tr key={id}><td style={STYLES.td}>{getRelicName(id)}</td><td style={STYLES.td}>{count as number}회</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h5 style={{ margin: '16px 0 8px 0', color: '#cbd5e1' }}>구매한 아이템</h5>
                <div style={STYLES.scrollBox}>
                  <table style={STYLES.table}>
                    <thead><tr><th style={STYLES.th}>아이템</th><th style={STYLES.th}>횟수</th></tr></thead>
                    <tbody>
                      {Object.entries(stats.shopStats.itemsPurchased || {}).map(([id, count]) => (
                        <tr key={id}><td style={STYLES.td}>{getItemName(id)}</td><td style={STYLES.td}>{count as number}회</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h5 style={{ margin: '16px 0 8px 0', color: '#cbd5e1' }}>구매 기록 (이유별)</h5>
                <div style={STYLES.scrollBox}>
                  <table style={STYLES.table}>
                    <thead><tr><th style={STYLES.th}>아이템</th><th style={STYLES.th}>타입</th><th style={STYLES.th}>가격</th><th style={STYLES.th}>이유</th></tr></thead>
                    <tbody>
                      {(stats.shopStats.purchaseRecords || []).map((rec: { itemName: string; type: string; price: number; reason: string }, i: number) => {
                        const displayName = rec.type === 'relic' ? getRelicName(rec.itemName) : rec.type === 'item' ? getItemName(rec.itemName) : getCardName(rec.itemName);
                        const typeLabel = rec.type === 'card' ? '카드' : rec.type === 'relic' ? '상징' : '아이템';
                        return <tr key={i}><td style={STYLES.td}>{displayName}</td><td style={STYLES.td}>{typeLabel}</td><td style={STYLES.td}>{rec.price}G</td><td style={STYLES.td}>{rec.reason}</td></tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* 던전 통계 */}
            {activeStatTab === 'dungeon' && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#f97316' }}>🏰 던전 통계</h4>
                <div style={STYLES.statsGrid}>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>총 진입</div><div style={STYLES.statValue}>{stats.dungeonStats.totalAttempts ?? 0}회</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>클리어율</div><div style={STYLES.statValue}>{((stats.dungeonStats.clearRate ?? 0) * 100).toFixed(1)}%</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>평균 소요 턴</div><div style={STYLES.statValue}>{(stats.dungeonStats.avgTurns ?? 0).toFixed(1)}</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>평균 받은 피해</div><div style={STYLES.statValue}>{(stats.dungeonStats.avgDamageTaken ?? 0).toFixed(1)}</div></div>
                </div>
                <div style={{ marginTop: '12px', fontSize: '0.875rem', color: '#cbd5e1' }}>
                  <div>획득 카드: {stats.dungeonStats.rewards?.cards?.length ?? 0}장 - [{(stats.dungeonStats.rewards?.cards ?? []).map((id: string) => getCardName(id)).join(', ')}]</div>
                  <div>획득 상징: {stats.dungeonStats.rewards?.relics?.length ?? 0}개 - [{(stats.dungeonStats.rewards?.relics ?? []).map((id: string) => getRelicName(id)).join(', ')}]</div>
                </div>
              </>
            )}

            {/* 이벤트 통계 */}
            {activeStatTab === 'event' && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#06b6d4' }}>🎲 이벤트 통계</h4>
                <div style={STYLES.scrollBox}>
                  <table style={STYLES.table}>
                    <thead><tr><th style={STYLES.th}>이벤트</th><th style={STYLES.th}>발생</th><th style={STYLES.th}>성공</th><th style={STYLES.th}>골드</th><th style={STYLES.th}>재료</th></tr></thead>
                    <tbody>
                      {Array.from(stats.eventStats.entries()).sort((a: [string, { occurrences: number }], b: [string, { occurrences: number }]) => b[1].occurrences - a[1].occurrences).map(([id, e]: [string, { occurrences: number; successes: number; totalGoldChange?: number; totalMaterialChange?: number }]) => (
                        <tr key={id}><td style={STYLES.td}>{getEventName(id)}</td><td style={STYLES.td}>{e.occurrences}회</td><td style={STYLES.td}>{e.successes}회</td><td style={STYLES.td}>{e.totalGoldChange ?? 0}</td><td style={STYLES.td}>{e.totalMaterialChange ?? 0}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h5 style={{ margin: '16px 0 8px 0', color: '#cbd5e1' }}>이벤트 선택 상세</h5>
                <div style={STYLES.scrollBox}>
                  {Array.from(stats.eventChoiceStats.entries()).map(([eventId, choiceStats]: [string, { occurrences?: number; timesSkipped?: number; choiceOutcomes?: Record<string, { timesChosen?: number; avgHpChange?: number; avgGoldChange?: number; successRate?: number }> }]) => (
                    <div key={eventId} style={{ marginBottom: '12px', padding: '8px', background: '#1e293b', borderRadius: '6px' }}>
                      <div style={{ fontWeight: 'bold', color: '#fbbf24' }}>{getEventName(eventId)}: 발생 {choiceStats.occurrences ?? 0}회, 스킵 {choiceStats.timesSkipped ?? 0}회</div>
                      {choiceStats.choiceOutcomes && Object.entries(choiceStats.choiceOutcomes).map(([choiceId, outcome]) => (
                        <div key={choiceId} style={{ marginLeft: '12px', fontSize: '0.8rem', color: '#94a3b8' }}>
                          선택 "{choiceId}": {outcome.timesChosen ?? 0}회, HP {(outcome.avgHpChange ?? 0).toFixed(1)}, 골드 {(outcome.avgGoldChange ?? 0).toFixed(0)}, 성공률 {((outcome.successRate ?? 0) * 100).toFixed(0)}%
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* 아이템 통계 */}
            {activeStatTab === 'item' && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#84cc16' }}>🎒 아이템 통계</h4>
                <h5 style={{ margin: '0 0 8px 0', color: '#cbd5e1' }}>획득한 아이템</h5>
                <div style={STYLES.scrollBox}>
                  <table style={STYLES.table}>
                    <thead><tr><th style={STYLES.th}>아이템</th><th style={STYLES.th}>획득</th></tr></thead>
                    <tbody>
                      {Object.entries(stats.itemUsageStats.itemsAcquired || {}).map(([id, count]) => (
                        <tr key={id}><td style={STYLES.td}>{getItemName(id)}</td><td style={STYLES.td}>{count as number}개</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h5 style={{ margin: '16px 0 8px 0', color: '#cbd5e1' }}>아이템 사용 효과</h5>
                <div style={STYLES.scrollBox}>
                  <table style={STYLES.table}>
                    <thead><tr><th style={STYLES.th}>아이템</th><th style={STYLES.th}>사용</th><th style={STYLES.th}>HP회복</th><th style={STYLES.th}>피해</th><th style={STYLES.th}>특수효과</th></tr></thead>
                    <tbody>
                      {Object.entries(stats.itemUsageStats.itemEffects || {}).map(([id, eff]: [string, { timesUsed: number; totalHpHealed: number; totalDamage: number; specialEffects: Record<string, number> }]) => (
                        <tr key={id}><td style={STYLES.td}>{getItemName(id)}</td><td style={STYLES.td}>{eff.timesUsed}회</td><td style={STYLES.td}>{eff.totalHpHealed}</td><td style={STYLES.td}>{eff.totalDamage}</td><td style={STYLES.td}>{JSON.stringify(eff.specialEffects)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* 몬스터 통계 */}
            {activeStatTab === 'monster' && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#ef4444' }}>👹 몬스터 전투 통계</h4>
                <div style={STYLES.scrollBox}>
                  <table style={STYLES.table}>
                    <thead><tr><th style={STYLES.th}>몬스터</th><th style={STYLES.th}>조우</th><th style={STYLES.th}>승리</th><th style={STYLES.th}>패배</th><th style={STYLES.th}>승률</th><th style={STYLES.th}>평균턴</th></tr></thead>
                    <tbody>
                      {Array.from(stats.monsterStats.entries()).sort((a: [string, { battles: number }], b: [string, { battles: number }]) => b[1].battles - a[1].battles).map(([id, m]: [string, { battles: number; wins: number; losses: number; avgTurns?: number }]) => (
                        <tr key={id}><td style={STYLES.td}>{getMonsterName(id)}</td><td style={STYLES.td}>{m.battles}회</td><td style={STYLES.td}>{m.wins}회</td><td style={STYLES.td}>{m.losses}회</td><td style={STYLES.td}>{m.battles > 0 ? ((m.wins / m.battles) * 100).toFixed(0) : 0}%</td><td style={STYLES.td}>{(m.avgTurns ?? 0).toFixed(1)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* 카드 통계 */}
            {activeStatTab === 'card' && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#3b82f6' }}>🃏 카드 사용 통계</h4>
                <div style={STYLES.scrollBox}>
                  <table style={STYLES.table}>
                    <thead><tr><th style={STYLES.th}>카드</th><th style={STYLES.th}>효과</th><th style={STYLES.th}>사용</th><th style={STYLES.th}>승리시</th><th style={STYLES.th}>패배시</th><th style={STYLES.th}>피해</th><th style={STYLES.th}>방어</th><th style={STYLES.th}>교차</th></tr></thead>
                    <tbody>
                      {Array.from(stats.cardStats.entries()).sort((a: [string, { totalUses: number }], b: [string, { totalUses: number }]) => b[1].totalUses - a[1].totalUses).map(([id, c]: [string, { totalUses: number; usesInWins: number; usesInLosses: number; totalDamage: number; totalBlock: number; crossTriggers: number }]) => (
                        <tr key={id}><td style={STYLES.td}>{getCardName(id)}</td><td style={{...STYLES.td, fontSize: '0.75rem', color: '#94a3b8'}}>{getCardEffectStr(id)}</td><td style={STYLES.td}>{c.totalUses}회</td><td style={STYLES.td}>{c.usesInWins}회</td><td style={STYLES.td}>{c.usesInLosses}회</td><td style={STYLES.td}>{c.totalDamage}</td><td style={STYLES.td}>{c.totalBlock}</td><td style={STYLES.td}>{c.crossTriggers}회</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* 카드 픽률 통계 */}
            {activeStatTab === 'pickrate' && stats.cardPickStats && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#10b981' }}>📊 카드 픽률 통계</h4>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '12px' }}>
                  제시된 카드 중 선택된 비율 (Slay the Spire 스타일)
                </p>
                <div style={STYLES.scrollBox}>
                  <table style={STYLES.table}>
                    <thead><tr><th style={STYLES.th}>카드</th><th style={STYLES.th}>효과</th><th style={STYLES.th}>제시</th><th style={STYLES.th}>선택</th><th style={STYLES.th}>스킵</th><th style={STYLES.th}>픽률</th><th style={STYLES.th}>픽률 바</th></tr></thead>
                    <tbody>
                      {Object.entries(stats.cardPickStats.timesOffered || {})
                        .sort((a, b) => (stats.cardPickStats.pickRate[b[0]] || 0) - (stats.cardPickStats.pickRate[a[0]] || 0))
                        .map(([id, offered]) => {
                          const picked = stats.cardPickStats.timesPicked[id] || 0;
                          const skipped = stats.cardPickStats.timesSkipped[id] || 0;
                          const pickRate = stats.cardPickStats.pickRate[id] || 0;
                          return (
                            <tr key={id}>
                              <td style={STYLES.td}>{getCardName(id)}</td>
                              <td style={{...STYLES.td, fontSize: '0.75rem', color: '#94a3b8'}}>{getCardEffectStr(id)}</td>
                              <td style={STYLES.td}>{offered as number}회</td>
                              <td style={STYLES.td}>{picked}회</td>
                              <td style={STYLES.td}>{skipped}회</td>
                              <td style={{...STYLES.td, color: pickRate > 0.5 ? '#22c55e' : pickRate > 0.25 ? '#fbbf24' : '#ef4444'}}>
                                {(pickRate * 100).toFixed(1)}%
                              </td>
                              <td style={STYLES.td}>
                                <div style={{ width: '80px', height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div style={{ width: `${pickRate * 100}%`, height: '100%', background: pickRate > 0.5 ? '#22c55e' : pickRate > 0.25 ? '#fbbf24' : '#ef4444' }} />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* 카드 기여도 통계 */}
            {activeStatTab === 'contribution' && stats.cardContributionStats && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#8b5cf6' }}>📈 카드 기여도 통계</h4>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '12px' }}>
                  카드 보유 여부에 따른 승률 차이 (기여도 = 보유시 승률 - 미보유시 승률)
                </p>
                <div style={STYLES.scrollBox}>
                  <table style={STYLES.table}>
                    <thead><tr><th style={STYLES.th}>카드</th><th style={STYLES.th}>효과</th><th style={STYLES.th}>등장</th><th style={STYLES.th}>보유시</th><th style={STYLES.th}>미보유시</th><th style={STYLES.th}>기여도</th></tr></thead>
                    <tbody>
                      {Object.entries(stats.cardContributionStats.contribution || {})
                        .filter(([id]) => (stats.cardContributionStats.runsWithCard[id] || 0) >= 2)
                        .sort((a, b) => (b[1] as number) - (a[1] as number))
                        .map(([id, contrib]) => {
                          const runsWithCard = stats.cardContributionStats.runsWithCard[id] || 0;
                          const winRateWith = stats.cardContributionStats.winRateWithCard[id] || 0;
                          const winRateWithout = stats.cardContributionStats.winRateWithoutCard[id] || 0;
                          const contribution = contrib as number;
                          return (
                            <tr key={id}>
                              <td style={STYLES.td}>{getCardName(id)}</td>
                              <td style={{...STYLES.td, fontSize: '0.75rem', color: '#94a3b8'}}>{getCardEffectStr(id)}</td>
                              <td style={STYLES.td}>{runsWithCard}회</td>
                              <td style={{...STYLES.td, color: '#22c55e'}}>{(winRateWith * 100).toFixed(1)}%</td>
                              <td style={{...STYLES.td, color: '#94a3b8'}}>{(winRateWithout * 100).toFixed(1)}%</td>
                              <td style={{...STYLES.td, fontWeight: 'bold', color: contribution > 0 ? '#22c55e' : contribution < 0 ? '#ef4444' : '#94a3b8'}}>
                                {contribution > 0 ? '+' : ''}{(contribution * 100).toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* 카드 시너지 통계 */}
            {activeStatTab === 'synergy' && stats.cardSynergyStats && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#f59e0b' }}>🔗 카드 시너지 분석</h4>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '12px' }}>
                  자주 함께 픽되는 카드 조합과 해당 조합의 승률 (3회 이상 등장)
                </p>
                <div style={STYLES.scrollBox}>
                  <table style={STYLES.table}>
                    <thead><tr><th style={STYLES.th}>카드 조합</th><th style={STYLES.th}>효과</th><th style={STYLES.th}>등장</th><th style={STYLES.th}>승률</th><th style={STYLES.th}>승률 바</th></tr></thead>
                    <tbody>
                      {(stats.cardSynergyStats.topSynergies || []).map((synergy: { pair: string; frequency: number; winRate: number }, i: number) => {
                        const [card1, card2] = synergy.pair.split('+');
                        return (
                          <tr key={i}>
                            <td style={STYLES.td}>
                              <span style={{ color: '#fbbf24' }}>{getCardName(card1)}</span>
                              <span style={{ color: '#64748b', margin: '0 4px' }}>+</span>
                              <span style={{ color: '#fbbf24' }}>{getCardName(card2)}</span>
                            </td>
                            <td style={{...STYLES.td, fontSize: '0.7rem', color: '#94a3b8'}}>
                              <div>{getCardEffectStr(card1)}</div>
                              <div>{getCardEffectStr(card2)}</div>
                            </td>
                            <td style={STYLES.td}>{synergy.frequency}회</td>
                            <td style={{...STYLES.td, color: synergy.winRate > 0.6 ? '#22c55e' : synergy.winRate > 0.4 ? '#fbbf24' : '#ef4444'}}>
                              {(synergy.winRate * 100).toFixed(1)}%
                            </td>
                            <td style={STYLES.td}>
                              <div style={{ width: '80px', height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${synergy.winRate * 100}%`, height: '100%', background: synergy.winRate > 0.6 ? '#22c55e' : synergy.winRate > 0.4 ? '#fbbf24' : '#ef4444' }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* 기록 통계 */}
            {activeStatTab === 'records' && stats.recordStats && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#ec4899' }}>🏆 기록 통계</h4>
                <div style={STYLES.statsGrid}>
                  <div style={STYLES.statItem}>
                    <div style={STYLES.statLabel}>최장 연승</div>
                    <div style={STYLES.statValue}>{stats.recordStats.longestWinStreak}연승</div>
                  </div>
                  <div style={STYLES.statItem}>
                    <div style={STYLES.statLabel}>현재 연승</div>
                    <div style={STYLES.statValue}>{stats.recordStats.currentWinStreak}연승</div>
                  </div>
                  <div style={STYLES.statItem}>
                    <div style={STYLES.statLabel}>무피해 전투 승리</div>
                    <div style={STYLES.statValue}>{stats.recordStats.flawlessVictories}회</div>
                  </div>
                  <div style={STYLES.statItem}>
                    <div style={STYLES.statLabel}>보스 무피해 클리어</div>
                    <div style={STYLES.statValue}>{stats.recordStats.bossFlawlessCount}회</div>
                  </div>
                  <div style={STYLES.statItem}>
                    <div style={STYLES.statLabel}>단일 턴 최대 피해</div>
                    <div style={STYLES.statValue}>{stats.recordStats.maxSingleTurnDamage}</div>
                  </div>
                  <div style={STYLES.statItem}>
                    <div style={STYLES.statLabel}>최다 골드 보유</div>
                    <div style={STYLES.statValue}>{stats.recordStats.maxGoldHeld}G</div>
                  </div>
                  <div style={STYLES.statItem}>
                    <div style={STYLES.statLabel}>가장 빠른 클리어</div>
                    <div style={STYLES.statValue}>{stats.recordStats.fastestClear || '-'}전투</div>
                  </div>
                  <div style={STYLES.statItem}>
                    <div style={STYLES.statLabel}>가장 작은 덱 클리어</div>
                    <div style={STYLES.statValue}>{stats.recordStats.smallestDeckClear || '-'}장</div>
                  </div>
                  <div style={STYLES.statItem}>
                    <div style={STYLES.statLabel}>가장 큰 덱 클리어</div>
                    <div style={STYLES.statValue}>{stats.recordStats.largestDeckClear || '-'}장</div>
                  </div>
                </div>

                {stats.recordStats.maxDamageRecord && (
                  <div style={{ marginTop: '16px', padding: '12px', background: '#1e293b', borderRadius: '8px' }}>
                    <h5 style={{ margin: '0 0 8px 0', color: '#fbbf24' }}>💥 최고 피해 기록</h5>
                    <div style={{ fontSize: '0.875rem', color: '#e2e8f0' }}>
                      <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{stats.recordStats.maxDamageRecord.damage}</span> 피해 -
                      <span style={{ color: '#fbbf24' }}> {getCardName(stats.recordStats.maxDamageRecord.cardId)}</span>로
                      <span style={{ color: '#ef4444' }}> {stats.recordStats.maxDamageRecord.monster}</span> 상대
                    </div>
                  </div>
                )}

                {stats.recordStats.fastestClearRecord && (
                  <div style={{ marginTop: '12px', padding: '12px', background: '#1e293b', borderRadius: '8px' }}>
                    <h5 style={{ margin: '0 0 8px 0', color: '#fbbf24' }}>⚡ 최속 클리어 기록</h5>
                    <div style={{ fontSize: '0.875rem', color: '#e2e8f0' }}>
                      <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{stats.recordStats.fastestClearRecord.battlesWon}</span>전투 클리어 -
                      덱 <span style={{ color: '#fbbf24' }}>{stats.recordStats.fastestClearRecord.deckSize}장</span>,
                      전략: <span style={{ color: '#3b82f6' }}>{stats.recordStats.fastestClearRecord.strategy}</span>
                    </div>
                  </div>
                )}

                {/* 층별 사망 분포 */}
                {stats.runStats.deathByLayer && Object.keys(stats.runStats.deathByLayer).length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <h5 style={{ margin: '0 0 8px 0', color: '#cbd5e1' }}>☠️ 층별 사망 분포</h5>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {Object.entries(stats.runStats.deathByLayer as Record<number, number>)
                        .sort((a, b) => Number(a[0]) - Number(b[0]))
                        .map(([layer, count]) => (
                          <div key={layer} style={{ padding: '6px 10px', background: '#1e293b', borderRadius: '6px', fontSize: '0.8rem' }}>
                            <span style={{ color: '#94a3b8' }}>{layer}층: </span>
                            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{count}회</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
});

export default SimulatorTab;
