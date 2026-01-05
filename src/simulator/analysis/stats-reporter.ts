/**
 * @file stats-reporter.ts
 * @description 통계 리포트 생성 클래스
 *
 * detailed-stats.ts에서 분리된 StatsReporter 클래스입니다.
 * DetailedStats 데이터를 받아 다양한 형식의 리포트를 생성합니다.
 */

import type { DetailedStats } from './detailed-stats-types';

// ==================== 통계 리포터 ====================

export class StatsReporter {
  constructor(private stats: DetailedStats) {}

  /** 카드 효과 리포트 생성 */
  generateCardReport(): string {
    const lines: string[] = [];
    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                           카드 효과 상세 분석                             ║');
    lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    // 사용 빈도 TOP 15
    const sortedByUsage = Array.from(this.stats.cardStats.values())
      .sort((a, b) => b.totalUses - a.totalUses)
      .slice(0, 15);

    lines.push('┌─────────────────────────────────────────────────────────────────────────┐');
    lines.push('│ 【 카드 사용 빈도 TOP 15 】                                             │');
    lines.push('├────────────┬───────┬────────┬─────────┬─────────┬───────────────────────┤');
    lines.push('│ 카드       │ 횟수  │ 승률   │ 평균DMG │ 평균BLK │ 사용 비율             │');
    lines.push('├────────────┼───────┼────────┼─────────┼─────────┼───────────────────────┤');

    const maxUses = sortedByUsage[0]?.totalUses || 1;
    for (const card of sortedByUsage) {
      const name = card.cardName.substring(0, 10).padEnd(10);
      const uses = String(card.totalUses).padStart(5);
      const winRate = (card.winContribution * 100).toFixed(0) + '%';
      const avgDmg = card.avgDamage.toFixed(1).padStart(7);
      const avgBlk = card.avgBlock.toFixed(1).padStart(7);
      const barLen = Math.floor((card.totalUses / maxUses) * 15);
      const bar = '█'.repeat(barLen).padEnd(15);
      lines.push(`│ ${name} │${uses} │ ${winRate.padStart(5)} │${avgDmg} │${avgBlk} │ ${bar}       │`);
    }
    lines.push('└────────────┴───────┴────────┴─────────┴─────────┴───────────────────────┘');

    // 피해량 TOP 10
    lines.push('');
    const sortedByDamage = Array.from(this.stats.cardStats.values())
      .filter(c => c.totalDamage > 0)
      .sort((a, b) => b.totalDamage - a.totalDamage)
      .slice(0, 10);

    if (sortedByDamage.length > 0) {
      lines.push('┌─────────────────────────────────────────────────────────────────────────┐');
      lines.push('│ 【 총 피해량 TOP 10 】                                                  │');
      lines.push('├────────────┬───────────┬─────────┬────────────────────────────────────┤');
      lines.push('│ 카드       │ 총 피해량 │ 평균    │ 피해 비율                          │');
      lines.push('├────────────┼───────────┼─────────┼────────────────────────────────────┤');

      const maxDmg = sortedByDamage[0]?.totalDamage || 1;
      for (const card of sortedByDamage) {
        const name = card.cardName.substring(0, 10).padEnd(10);
        const total = String(card.totalDamage).padStart(9);
        const avg = card.avgDamage.toFixed(1).padStart(7);
        const barLen = Math.floor((card.totalDamage / maxDmg) * 25);
        const bar = '█'.repeat(barLen).padEnd(25);
        lines.push(`│ ${name} │${total} │${avg} │ ${bar}          │`);
      }
      lines.push('└────────────┴───────────┴─────────┴────────────────────────────────────┘');
    }

    // 특수효과 카드
    const specialCards = Array.from(this.stats.cardStats.values())
      .filter(c => c.crossTriggers > 0 || Object.keys(c.specialTriggers).length > 0);

    if (specialCards.length > 0) {
      lines.push('');
      lines.push('┌─────────────────────────────────────────────────────────────────────────┐');
      lines.push('│ 【 특수효과 발동 통계 】                                                │');
      lines.push('├────────────┬───────────┬───────────────────────────────────────────────┤');
      lines.push('│ 카드       │ 교차 발동 │ 기타 효과                                     │');
      lines.push('├────────────┼───────────┼───────────────────────────────────────────────┤');

      for (const card of specialCards.slice(0, 10)) {
        const name = card.cardName.substring(0, 10).padEnd(10);
        const cross = String(card.crossTriggers).padStart(9);
        const effects = Object.entries(card.specialTriggers)
          .map(([k, v]) => `${k}:${v}`)
          .join(', ')
          .substring(0, 35)
          .padEnd(35);
        lines.push(`│ ${name} │${cross} │ ${effects}           │`);
      }
      lines.push('└────────────┴───────────┴───────────────────────────────────────────────┘');
    }

    return lines.join('\n');
  }

  /** 몬스터 전투 리포트 생성 */
  generateMonsterReport(): string {
    const lines: string[] = [];
    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                          몬스터별 전투 분석                               ║');
    lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    const sorted = Array.from(this.stats.monsterStats.values())
      .sort((a, b) => b.battles - a.battles);

    // 일반 몬스터
    const regular = sorted.filter(m => !m.isBoss);
    if (regular.length > 0) {
      lines.push('┌─────────────────────────────────────────────────────────────────────────┐');
      lines.push('│ 【 일반 전투 】                                                         │');
      lines.push('├────────────────┬───────┬────────┬────────┬─────────┬──────────────────┤');
      lines.push('│ 몬스터         │ 횟수  │ 승률   │ 평균턴 │ 받은DMG │ 준DMG            │');
      lines.push('├────────────────┼───────┼────────┼────────┼─────────┼──────────────────┤');

      for (const m of regular.slice(0, 10)) {
        const name = m.monsterName.substring(0, 14).padEnd(14);
        const battles = String(m.battles).padStart(5);
        const winRate = (m.winRate * 100).toFixed(0) + '%';
        const avgTurns = m.avgTurns.toFixed(1).padStart(6);
        const dmgTaken = m.avgDamageTaken.toFixed(0).padStart(7);
        const dmgDealt = m.avgDamageDealt.toFixed(0).padStart(7);
        lines.push(`│ ${name} │${battles} │ ${winRate.padStart(5)} │${avgTurns} │${dmgTaken} │${dmgDealt}          │`);
      }
      lines.push('└────────────────┴───────┴────────┴────────┴─────────┴──────────────────┘');
    }

    // 보스
    const bosses = sorted.filter(m => m.isBoss);
    if (bosses.length > 0) {
      lines.push('');
      lines.push('┌─────────────────────────────────────────────────────────────────────────┐');
      lines.push('│ 【 보스 전투 】                                                         │');
      lines.push('├────────────────┬───────┬────────┬────────┬─────────┬──────────────────┤');
      lines.push('│ 보스           │ 횟수  │ 승률   │ 평균턴 │ 남은HP  │ 주요 카드        │');
      lines.push('├────────────────┼───────┼────────┼────────┼─────────┼──────────────────┤');

      for (const m of bosses) {
        const name = m.monsterName.substring(0, 14).padEnd(14);
        const battles = String(m.battles).padStart(5);
        const winRate = (m.winRate * 100).toFixed(0) + '%';
        const avgTurns = m.avgTurns.toFixed(1).padStart(6);
        const hpRemain = m.avgHpRemainingOnWin.toFixed(0).padStart(7);
        const topCard = m.topCardsUsed[0]?.cardId.substring(0, 10) || '-';
        lines.push(`│ ${name} │${battles} │ ${winRate.padStart(5)} │${avgTurns} │${hpRemain} │ ${topCard.padEnd(16)}│`);
      }
      lines.push('└────────────────┴───────┴────────┴────────┴─────────┴──────────────────┘');
    }

    return lines.join('\n');
  }

  /** 런 전체 리포트 생성 */
  generateRunReport(): string {
    const lines: string[] = [];
    const rs = this.stats.runStats;

    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                            런 전체 통계                                   ║');
    lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    lines.push('【 전체 요약 】');
    lines.push(`  총 런: ${rs.totalRuns}회`);
    lines.push(`  성공: ${rs.successfulRuns}회 (${(rs.successRate * 100).toFixed(1)}%)`);
    lines.push(`  평균 도달 층: ${rs.avgLayerReached.toFixed(1)}`);
    lines.push(`  평균 전투 승리: ${rs.avgBattlesWon.toFixed(1)}`);
    lines.push(`  평균 골드 획득: ${rs.avgGoldEarned.toFixed(0)}`);
    lines.push(`  평균 덱 크기: ${rs.avgFinalDeckSize.toFixed(1)}`);
    lines.push(`  평균 상징 수: ${rs.avgFinalRelicCount.toFixed(1)}`);

    // 영혼파괴/육체파괴 통계
    const totalWins = rs.soulDestructions + rs.physicalDestructions;
    if (totalWins > 0) {
      lines.push('');
      lines.push('【 승리 방식 (파괴 유형) 】');
      const soulRate = (rs.soulDestructions / totalWins * 100).toFixed(1);
      const physRate = (rs.physicalDestructions / totalWins * 100).toFixed(1);
      lines.push(`  💜 영혼파괴: ${rs.soulDestructions}회 (${soulRate}%) - 에테르/버스트로 처치`);
      lines.push(`  ❤️ 육체파괴: ${rs.physicalDestructions}회 (${physRate}%) - HP 피해로 처치`);
    }

    if (Object.keys(rs.deathCauses).length > 0) {
      lines.push('');
      lines.push('【 사망 원인 】');
      const sortedCauses = Object.entries(rs.deathCauses)
        .sort((a, b) => b[1] - a[1]);
      for (const [cause, count] of sortedCauses) {
        lines.push(`  ${cause}: ${count}회`);
      }
    }

    if (Object.keys(rs.deathByLayer).length > 0) {
      lines.push('');
      lines.push('【 층별 사망 분포 】');
      const sortedLayers = Object.entries(rs.deathByLayer)
        .sort((a, b) => Number(a[0]) - Number(b[0]));
      for (const [layer, count] of sortedLayers) {
        const bar = '█'.repeat(count);
        lines.push(`  층 ${layer.padStart(2)}: ${bar} (${count})`);
      }
    }

    if (Object.keys(rs.strategyWinRates).length > 0) {
      lines.push('');
      lines.push('【 전략별 승률 】');
      const sortedStrats = Object.entries(rs.strategyWinRates)
        .sort((a, b) => b[1] - a[1]);
      for (const [strategy, rate] of sortedStrats) {
        lines.push(`  ${strategy}: ${(rate * 100).toFixed(1)}%`);
      }
    }

    return lines.join('\n');
  }

  /** 카드 승급 리포트 생성 */
  generateUpgradeReport(): string {
    const lines: string[] = [];
    const us = this.stats.upgradeStats;

    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                           카드 승급 통계                                  ║');
    lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    lines.push('【 승급 요약 】');
    lines.push(`  총 승급 횟수: ${us.totalUpgrades}회`);
    lines.push(`  런당 평균 승급: ${us.avgUpgradesPerRun.toFixed(1)}회`);
    lines.push(`  승급-승률 상관관계: ${(us.upgradeWinCorrelation * 100).toFixed(1)}%`);

    if (Object.keys(us.upgradesByCard).length > 0) {
      lines.push('');
      lines.push('【 카드별 승급 횟수 TOP 10 】');
      const sorted = Object.entries(us.upgradesByCard)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      for (const [cardId, count] of sorted) {
        const bar = '█'.repeat(Math.min(20, count));
        lines.push(`  ${cardId.padEnd(15)}: ${String(count).padStart(3)}회 ${bar}`);
      }
    }

    return lines.join('\n');
  }

  /** 성장 시스템 리포트 생성 */
  generateGrowthReport(): string {
    const lines: string[] = [];
    const gs = this.stats.growthStats;

    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                          성장 시스템 통계                                 ║');
    lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    lines.push('【 성장 요약 】');
    lines.push(`  총 투자 횟수: ${gs.totalInvestments}회`);
    lines.push(`  런당 평균 투자: ${gs.avgInvestmentsPerRun.toFixed(1)}회`);

    if (Object.keys(gs.statInvestments).length > 0) {
      lines.push('');
      lines.push('【 스탯별 투자 】');
      const sorted = Object.entries(gs.statInvestments)
        .sort((a, b) => b[1] - a[1]);
      for (const [stat, count] of sorted) {
        const bar = '█'.repeat(Math.min(25, count));
        lines.push(`  ${stat.padEnd(12)}: ${String(count).padStart(3)}회 ${bar}`);
      }
    }

    if (Object.keys(gs.logosActivations).length > 0) {
      lines.push('');
      lines.push('【 로고스 효과 활성화 】');
      for (const [effect, count] of Object.entries(gs.logosActivations)) {
        lines.push(`  ${effect}: ${count}회`);
      }
    }

    if (Object.keys(gs.levelDistribution).length > 0) {
      lines.push('');
      lines.push('【 성장 레벨 분포 】');
      const sorted = Object.entries(gs.levelDistribution)
        .sort((a, b) => Number(a[0]) - Number(b[0]));
      for (const [level, count] of sorted) {
        const bar = '█'.repeat(count);
        lines.push(`  레벨 ${level.padStart(2)}: ${bar} (${count})`);
      }
    }

    return lines.join('\n');
  }

  /** 상점 리포트 생성 */
  generateShopReport(): string {
    const lines: string[] = [];
    const ss = this.stats.shopStats;

    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                            상점 이용 통계                                 ║');
    lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    lines.push('【 상점 요약 】');
    lines.push(`  총 방문 횟수: ${ss.totalVisits}회`);
    lines.push(`  총 지출: ${ss.totalSpent}G`);
    lines.push(`  방문당 평균 지출: ${ss.avgSpentPerVisit.toFixed(0)}G`);
    lines.push(`  카드 제거: ${ss.cardsRemoved}회`);
    lines.push(`  카드 승급: ${ss.cardsUpgraded}회`);

    if (Object.keys(ss.cardsPurchased).length > 0) {
      lines.push('');
      lines.push('【 구매한 카드 TOP 10 】');
      const sorted = Object.entries(ss.cardsPurchased)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      for (const [cardId, count] of sorted) {
        lines.push(`  ${cardId.padEnd(15)}: ${count}회`);
      }
    }

    if (Object.keys(ss.relicsPurchased).length > 0) {
      lines.push('');
      lines.push('【 구매한 상징 】');
      for (const [relicId, count] of Object.entries(ss.relicsPurchased)) {
        lines.push(`  ${relicId}: ${count}회`);
      }
    }

    // 구매 이유 통계
    if (ss.purchaseRecords && ss.purchaseRecords.length > 0) {
      lines.push('');
      lines.push('【 구매 결정 이유 분석 】');

      // 이유별 그룹핑
      const reasonCounts: Record<string, { count: number; items: string[]; totalCost: number }> = {};
      for (const record of ss.purchaseRecords) {
        if (!reasonCounts[record.reason]) {
          reasonCounts[record.reason] = { count: 0, items: [], totalCost: 0 };
        }
        reasonCounts[record.reason].count++;
        reasonCounts[record.reason].items.push(record.itemName);
        reasonCounts[record.reason].totalCost += record.price;
      }

      const sortedReasons = Object.entries(reasonCounts)
        .sort((a, b) => b[1].count - a[1].count);

      lines.push('┌──────────────────────────────────┬─────┬─────────┬──────────────────────┐');
      lines.push('│ 구매 이유                        │ 횟수│ 총비용  │ 주요 아이템          │');
      lines.push('├──────────────────────────────────┼─────┼─────────┼──────────────────────┤');

      for (const [reason, data] of sortedReasons.slice(0, 15)) {
        const reasonStr = reason.substring(0, 32).padEnd(32);
        const countStr = String(data.count).padStart(3);
        const costStr = `${data.totalCost}G`.padStart(7);
        // 가장 많이 구매한 아이템
        const itemCounts: Record<string, number> = {};
        for (const item of data.items) {
          itemCounts[item] = (itemCounts[item] || 0) + 1;
        }
        const topItem = Object.entries(itemCounts)
          .sort((a, b) => b[1] - a[1])[0];
        const topItemStr = topItem ? `${topItem[0]}(${topItem[1]})`.substring(0, 20) : '-';
        lines.push(`│ ${reasonStr} │ ${countStr} │${costStr} │ ${topItemStr.padEnd(20)} │`);
      }
      lines.push('└──────────────────────────────────┴─────┴─────────┴──────────────────────┘');

      // 타입별 구매 이유 세부 분석
      lines.push('');
      lines.push('【 타입별 구매 상세 (최근 20건) 】');

      const recentRecords = ss.purchaseRecords.slice(-20);
      const byType: Record<string, typeof recentRecords> = {
        card: [],
        relic: [],
        item: [],
      };
      for (const record of recentRecords) {
        byType[record.type]?.push(record);
      }

      for (const [type, records] of Object.entries(byType)) {
        if (records.length === 0) continue;
        const typeLabel = type === 'card' ? '카드' : type === 'relic' ? '상징' : '아이템';
        lines.push(`  [${typeLabel}]`);
        for (const record of records.slice(0, 5)) {
          lines.push(`    ${record.itemName.padEnd(12)} ${record.price}G | ${record.reason}`);
        }
        if (records.length > 5) {
          lines.push(`    ... 외 ${records.length - 5}건`);
        }
      }
    }

    return lines.join('\n');
  }

  /** 던전 리포트 생성 */
  generateDungeonReport(): string {
    const lines: string[] = [];
    const ds = this.stats.dungeonStats;

    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                           던전 돌파 통계                                  ║');
    lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    lines.push('【 던전 요약 】');
    lines.push(`  총 진입: ${ds.totalAttempts}회`);
    lines.push(`  클리어: ${ds.clears}회 (${(ds.clearRate * 100).toFixed(1)}%)`);
    lines.push(`  평균 소요 턴: ${ds.avgTurns.toFixed(1)}`);
    lines.push(`  평균 받은 피해: ${ds.avgDamageTaken.toFixed(1)}`);

    if (Object.keys(ds.clearsByDungeon).length > 0) {
      lines.push('');
      lines.push('【 던전별 클리어 】');
      for (const [dungeonId, count] of Object.entries(ds.clearsByDungeon)) {
        lines.push(`  ${dungeonId}: ${count}회`);
      }
    }

    lines.push('');
    lines.push('【 던전 보상 총계 】');
    lines.push(`  골드: ${ds.rewards.gold}G`);
    lines.push(`  카드: ${ds.rewards.cards.length}장`);
    lines.push(`  상징: ${ds.rewards.relics.length}개`);

    return lines.join('\n');
  }

  /** 이벤트 리포트 생성 */
  generateEventReport(): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                            이벤트 통계                                    ║');
    lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    const events = Array.from(this.stats.eventStats.values())
      .sort((a, b) => b.occurrences - a.occurrences);

    if (events.length === 0) {
      lines.push('  이벤트 기록 없음');
      return lines.join('\n');
    }

    lines.push('【 이벤트 발생 빈도 TOP 15 】');
    lines.push('┌──────────────────────┬─────┬──────┬───────────────────────────────────────┐');
    lines.push('│ 이벤트               │ 횟수│ 성공 │ 자원 변화                             │');
    lines.push('├──────────────────────┼─────┼──────┼───────────────────────────────────────┤');

    for (const ev of events.slice(0, 15)) {
      const name = ev.eventName.substring(0, 20).padEnd(20);
      const count = String(ev.occurrences).padStart(3);
      const rate = (ev.successRate * 100).toFixed(0) + '%';

      // 자원 변화 문자열 생성
      const changes: string[] = [];
      if (ev.totalHpChange !== 0) changes.push(`HP${ev.totalHpChange >= 0 ? '+' : ''}${ev.totalHpChange}`);
      if (ev.totalGoldChange !== 0) changes.push(`금${ev.totalGoldChange >= 0 ? '+' : ''}${ev.totalGoldChange}`);
      if (ev.totalIntelChange !== 0) changes.push(`정보${ev.totalIntelChange >= 0 ? '+' : ''}${ev.totalIntelChange}`);
      if (ev.totalMaterialChange !== 0) changes.push(`재료${ev.totalMaterialChange >= 0 ? '+' : ''}${ev.totalMaterialChange}`);
      if (ev.totalInsightChange !== 0) changes.push(`통찰${ev.totalInsightChange >= 0 ? '+' : ''}${ev.totalInsightChange}`);
      if (ev.totalGraceChange !== 0) changes.push(`은총${ev.totalGraceChange >= 0 ? '+' : ''}${ev.totalGraceChange}`);
      if (ev.totalLootChange !== 0) changes.push(`전리품${ev.totalLootChange >= 0 ? '+' : ''}${ev.totalLootChange}`);

      const resourceStr = changes.length > 0 ? changes.join(', ') : '-';
      lines.push(`│ ${name} │ ${count} │${rate.padStart(5)} │ ${resourceStr.substring(0, 37).padEnd(37)} │`);
    }
    lines.push('└──────────────────────┴─────┴──────┴───────────────────────────────────────┘');

    // 이벤트에서 획득한 보상 총계
    const allCards = events.flatMap(e => e.cardsGained);
    const allRelics = events.flatMap(e => e.relicsGained);
    const totalIntel = events.reduce((sum, e) => sum + e.totalIntelChange, 0);
    const totalMaterial = events.reduce((sum, e) => sum + e.totalMaterialChange, 0);
    const totalGold = events.reduce((sum, e) => sum + e.totalGoldChange, 0);
    const totalInsight = events.reduce((sum, e) => sum + e.totalInsightChange, 0);

    lines.push('');
    lines.push('【 이벤트 보상 총계 】');
    lines.push(`  골드: ${totalGold >= 0 ? '+' : ''}${totalGold}G`);
    lines.push(`  정보: ${totalIntel >= 0 ? '+' : ''}${totalIntel}`);
    lines.push(`  원자재: ${totalMaterial >= 0 ? '+' : ''}${totalMaterial}`);
    lines.push(`  통찰: ${totalInsight >= 0 ? '+' : ''}${totalInsight}`);
    if (allCards.length > 0) {
      lines.push(`  획득 카드: ${allCards.length}장`);
    }
    if (allRelics.length > 0) {
      lines.push(`  획득 상징: ${allRelics.length}개`);
    }

    return lines.join('\n');
  }

  /** 상점 서비스 상세 리포트 생성 */
  generateShopServiceReport(): string {
    const lines: string[] = [];
    const ss = this.stats.shopServiceStats;

    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                        상점 서비스 상세 통계                              ║');
    lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    lines.push('【 서비스 이용 요약 】');
    lines.push(`  치료 이용: ${ss.healingUsed}회`);
    lines.push(`  치료로 회복한 HP: ${ss.totalHpHealed}`);
    lines.push(`  치료 비용 총합: ${ss.healingCost}G`);
    lines.push('');
    lines.push(`  카드 제거 비용 총합: ${ss.removalCost}G`);
    lines.push(`  카드 승급 비용 총합: ${ss.upgradeCost}G`);
    lines.push(`  새로고침: ${ss.refreshUsed}회 (총 ${ss.refreshCost}G)`);

    if (Object.keys(ss.removedCards).length > 0) {
      lines.push('');
      lines.push('【 제거한 카드 TOP 10 】');
      const sorted = Object.entries(ss.removedCards)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      for (const [cardId, count] of sorted) {
        lines.push(`  ${cardId.padEnd(20)}: ${count}회`);
      }
    }

    if (Object.keys(ss.upgradedCards).length > 0) {
      lines.push('');
      lines.push('【 상점에서 승급한 카드 TOP 10 】');
      const sorted = Object.entries(ss.upgradedCards)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      for (const [cardId, count] of sorted) {
        lines.push(`  ${cardId.padEnd(20)}: ${count}회`);
      }
    }

    return lines.join('\n');
  }

  /** 아이템 활용 리포트 생성 */
  generateItemReport(): string {
    const lines: string[] = [];
    const is = this.stats.itemUsageStats;

    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                           아이템 활용 통계                                ║');
    lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    const totalAcquired = Object.values(is.itemsAcquired).reduce((a, b) => a + b, 0);
    const totalUsed = Object.values(is.itemsUsed).reduce((a, b) => a + b, 0);
    const totalDiscarded = Object.values(is.itemsDiscarded).reduce((a, b) => a + b, 0);

    lines.push('【 아이템 요약 】');
    lines.push(`  총 획득: ${totalAcquired}개`);
    lines.push(`  총 사용: ${totalUsed}개`);
    lines.push(`  사용률: ${totalAcquired > 0 ? ((totalUsed / totalAcquired) * 100).toFixed(1) : 0}%`);
    lines.push(`  버림: ${totalDiscarded}개`);

    if (Object.keys(is.itemsAcquired).length > 0) {
      lines.push('');
      lines.push('【 획득한 아이템 TOP 10 】');
      const sorted = Object.entries(is.itemsAcquired)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      for (const [itemId, count] of sorted) {
        const used = is.itemsUsed[itemId] || 0;
        const usageRate = ((used / count) * 100).toFixed(0);
        lines.push(`  ${itemId.padEnd(15)}: ${String(count).padStart(3)}개 획득, ${String(used).padStart(3)}개 사용 (${usageRate}%)`);
      }
    }

    if (Object.keys(is.itemsUsed).length > 0) {
      lines.push('');
      lines.push('【 아이템별 사용 효과 】');
      const sorted = Object.entries(is.itemEffects)
        .filter(([_, eff]) => eff.timesUsed > 0)
        .sort((a, b) => b[1].timesUsed - a[1].timesUsed)
        .slice(0, 10);
      for (const [itemId, eff] of sorted) {
        lines.push(`  ${itemId}:`);
        lines.push(`    사용 ${eff.timesUsed}회 | HP회복: ${eff.totalHpHealed} | 피해: ${eff.totalDamage} | 골드: ${eff.totalGoldGained}`);
        if (Object.keys(eff.specialEffects).length > 0) {
          const effects = Object.entries(eff.specialEffects).map(([k, v]) => `${k}:${v}`).join(', ');
          lines.push(`    특수효과: ${effects}`);
        }
      }
    }

    // 전투 중/외 사용 비교
    const inBattle = Object.values(is.usageContext.inBattle).reduce((a, b) => a + b, 0);
    const outBattle = Object.values(is.usageContext.outOfBattle).reduce((a, b) => a + b, 0);
    if (inBattle > 0 || outBattle > 0) {
      lines.push('');
      lines.push('【 사용 상황 】');
      lines.push(`  전투 중 사용: ${inBattle}회`);
      lines.push(`  전투 외 사용: ${outBattle}회`);
    }

    if (Object.keys(is.itemsDiscarded).length > 0) {
      lines.push('');
      lines.push('【 버린 아이템 】');
      for (const [itemId, count] of Object.entries(is.itemsDiscarded)) {
        lines.push(`  ${itemId}: ${count}개`);
      }
    }

    return lines.join('\n');
  }

  /** 이벤트 선택 상세 리포트 생성 */
  generateEventChoiceReport(): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                        이벤트 선택 상세 통계                              ║');
    lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    const events = Array.from(this.stats.eventChoiceStats.values())
      .sort((a, b) => b.occurrences - a.occurrences);

    if (events.length === 0) {
      lines.push('  이벤트 선택 기록 없음');
      return lines.join('\n');
    }

    // 전체 통계
    const totalEvents = events.reduce((sum, e) => sum + e.occurrences, 0);
    const totalSkipped = events.reduce((sum, e) => sum + e.timesSkipped, 0);
    lines.push('【 전체 요약 】');
    lines.push(`  이벤트 발생: ${totalEvents}회`);
    lines.push(`  패스: ${totalSkipped}회 (${((totalSkipped / totalEvents) * 100).toFixed(1)}%)`);

    // 이벤트별 상세
    lines.push('');
    lines.push('【 이벤트별 선택 상세 】');
    for (const ev of events.slice(0, 10)) {
      lines.push('');
      lines.push(`▶ ${ev.eventName} (${ev.occurrences}회)`);

      // 선택지 분포
      if (Object.keys(ev.choicesMade).length > 0) {
        lines.push('  선택 분포:');
        const sorted = Object.entries(ev.choicesMade)
          .sort((a, b) => b[1] - a[1]);
        for (const [choiceId, count] of sorted) {
          const outcome = ev.choiceOutcomes[choiceId];
          const rate = ((count / ev.occurrences) * 100).toFixed(0);
          let desc = `    ${choiceId}: ${count}회 (${rate}%)`;
          if (outcome) {
            const hpStr = outcome.avgHpChange >= 0 ? `+${outcome.avgHpChange.toFixed(1)}` : outcome.avgHpChange.toFixed(1);
            const goldStr = outcome.avgGoldChange >= 0 ? `+${outcome.avgGoldChange.toFixed(0)}` : outcome.avgGoldChange.toFixed(0);
            desc += ` | HP: ${hpStr}, 골드: ${goldStr}, 성공률: ${(outcome.successRate * 100).toFixed(0)}%`;
          }
          lines.push(desc);
        }
      }

      // 패스 이유
      if (ev.timesSkipped > 0 && Object.keys(ev.skipReasons).length > 0) {
        lines.push(`  패스 ${ev.timesSkipped}회 - 이유:`);
        const sorted = Object.entries(ev.skipReasons)
          .sort((a, b) => b[1] - a[1]);
        for (const [reason, count] of sorted) {
          lines.push(`    ${reason}: ${count}회`);
        }
      }
    }

    // 가장 많이 패스한 이벤트
    const mostSkipped = events
      .filter(e => e.timesSkipped > 0)
      .sort((a, b) => b.timesSkipped - a.timesSkipped)
      .slice(0, 5);

    if (mostSkipped.length > 0) {
      lines.push('');
      lines.push('【 가장 많이 패스한 이벤트 TOP 5 】');
      for (const ev of mostSkipped) {
        const rate = ((ev.timesSkipped / ev.occurrences) * 100).toFixed(0);
        lines.push(`  ${ev.eventName}: ${ev.timesSkipped}회 패스 (${rate}%)`);
        const topReason = Object.entries(ev.skipReasons)
          .sort((a, b) => b[1] - a[1])[0];
        if (topReason) {
          lines.push(`    주요 이유: ${topReason[0]} (${topReason[1]}회)`);
        }
      }
    }

    return lines.join('\n');
  }

  /** AI 전략 리포트 생성 */
  generateAIStrategyReport(): string {
    const lines: string[] = [];
    const as = this.stats.aiStrategyStats;

    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                           AI 전략 통계                                    ║');
    lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    // 전략별 요약
    if (Object.keys(as.strategyUsage).length > 0) {
      lines.push('【 전략별 성과 】');
      lines.push('┌──────────────────┬─────────┬────────┬──────────┬───────────────────────┐');
      lines.push('│ 전략             │ 사용    │ 승률   │ 평균턴   │ 평균 피해량           │');
      lines.push('├──────────────────┼─────────┼────────┼──────────┼───────────────────────┤');

      const sortedStrategies = Object.entries(as.strategyUsage)
        .sort((a, b) => b[1] - a[1]);

      for (const [strategy, usage] of sortedStrategies) {
        const name = strategy.padEnd(16);
        const usageStr = String(usage).padStart(7);
        const winRate = ((as.strategyWinRate[strategy] || 0) * 100).toFixed(1) + '%';
        const avgTurns = (as.strategyAvgTurns[strategy] || 0).toFixed(1);
        const avgDamage = (as.strategyAvgDamage[strategy] || 0).toFixed(0);
        lines.push(`│ ${name} │${usageStr} │ ${winRate.padStart(5)} │ ${avgTurns.padStart(8)} │ ${avgDamage.padStart(21)} │`);
      }
      lines.push('└──────────────────┴─────────┴────────┴──────────┴───────────────────────┘');
    }

    // HP 비율별 전략 선택
    if (Object.keys(as.strategyByHpRatio).length > 0) {
      lines.push('');
      lines.push('【 HP 상태별 전략 선택 분포 】');

      for (const [hpBracket, strategies] of Object.entries(as.strategyByHpRatio)) {
        const bracketLabel = hpBracket === 'low' ? '위험 (0-30%)' :
                            hpBracket === 'medium' ? '주의 (30-60%)' : '안전 (60%+)';
        lines.push(`  [${bracketLabel}]`);

        const total = Object.values(strategies).reduce((a, b) => a + b, 0);
        const sorted = Object.entries(strategies).sort((a, b) => b[1] - a[1]);

        for (const [strategy, count] of sorted) {
          const percent = ((count / total) * 100).toFixed(1);
          const bar = '█'.repeat(Math.floor((count / total) * 20));
          lines.push(`    ${strategy.padEnd(12)}: ${bar} ${percent}%`);
        }
      }
    }

    // 카드 선택 이유
    if (Object.keys(as.cardSelectionReasons).length > 0) {
      lines.push('');
      lines.push('【 카드 선택 이유 TOP 10 】');

      const sortedReasons = Object.entries(as.cardSelectionReasons)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const maxCount = sortedReasons[0]?.[1] || 1;
      for (const [reason, count] of sortedReasons) {
        const barLen = Math.floor((count / maxCount) * 25);
        const bar = '█'.repeat(barLen);
        lines.push(`  ${reason.substring(0, 25).padEnd(25)}: ${String(count).padStart(5)} ${bar}`);
      }
    }

    // 시너지 발동
    if (Object.keys(as.synergyTriggers).length > 0) {
      lines.push('');
      lines.push('【 시너지 발동 통계 】');

      const sorted = Object.entries(as.synergyTriggers)
        .sort((a, b) => b[1] - a[1]);

      for (const [synergy, count] of sorted) {
        lines.push(`  ${synergy}: ${count}회`);
      }
    }

    // 콤보 타입
    if (Object.keys(as.comboTypeUsage).length > 0) {
      lines.push('');
      lines.push('【 콤보 타입별 발동 】');

      const sorted = Object.entries(as.comboTypeUsage)
        .sort((a, b) => b[1] - a[1]);

      for (const [comboType, count] of sorted) {
        lines.push(`  ${comboType}: ${count}회`);
      }
    }

    return lines.join('\n');
  }

  /** 전체 리포트 생성 */
  generateFullReport(): string {
    const parts: string[] = [];
    parts.push(this.generateRunReport());
    parts.push(this.generateCardReport());
    parts.push(this.generateMonsterReport());
    parts.push(this.generateUpgradeReport());
    parts.push(this.generateGrowthReport());
    parts.push(this.generateShopReport());
    parts.push(this.generateShopServiceReport());
    parts.push(this.generateDungeonReport());
    parts.push(this.generateEventReport());
    parts.push(this.generateItemReport());
    parts.push(this.generateEventChoiceReport());
    parts.push(this.generateAIStrategyReport());
    return parts.join('\n');
  }

  /** JSON 형식 내보내기 */
  exportToJson(): string {
    const exportData = {
      startTime: this.stats.startTime.toISOString(),
      endTime: this.stats.endTime.toISOString(),
      runStats: this.stats.runStats,
      cardStats: Object.fromEntries(this.stats.cardStats),
      monsterStats: Object.fromEntries(this.stats.monsterStats),
      eventStats: Object.fromEntries(this.stats.eventStats),
      upgradeStats: this.stats.upgradeStats,
      growthStats: this.stats.growthStats,
      shopStats: this.stats.shopStats,
      shopServiceStats: this.stats.shopServiceStats,
      dungeonStats: this.stats.dungeonStats,
      itemUsageStats: this.stats.itemUsageStats,
      eventChoiceStats: Object.fromEntries(this.stats.eventChoiceStats),
      aiStrategyStats: this.stats.aiStrategyStats,
      battleRecords: this.stats.battleRecords,
    };
    return JSON.stringify(exportData, null, 2);
  }
}

/** 통계에서 리포터 생성 */
export function createReporter(stats: DetailedStats): StatsReporter {
  return new StatsReporter(stats);
}
