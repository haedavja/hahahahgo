/**
 * @file statsFormatter.ts
 * @description 시뮬레이터 통계 포맷팅 유틸리티
 *
 * SimulatorTab에서 사용하는 통계 포맷팅 함수들을 분리하여 관리
 */

import { RELICS } from '../../../../data/relics';
import { ITEMS } from '../../../../data/items';
import { CARDS, ENEMIES } from '../../../battle/battleData';
import { NEW_EVENT_LIBRARY } from '../../../../data/newEvents';
import type { DetailedStats } from '../../../../simulator/analysis/detailed-stats';

// ==================== 타입 정의 ====================

/** 전략 타입 */
export type StrategyType = 'balanced' | 'aggressive' | 'defensive';

/** 전략별 통계 타입 */
export type StatsByStrategy = Record<StrategyType, DetailedStats | null>;

/** 전략 레이블 */
export const STRATEGY_LABELS: Record<StrategyType, string> = {
  balanced: '균형',
  aggressive: '공격적',
  defensive: '방어적',
};

/** 모든 전략 목록 */
export const ALL_STRATEGIES: StrategyType[] = ['balanced', 'aggressive', 'defensive'];

// ==================== 헬퍼 함수 ====================

/** 상징 이름 조회 */
export function getRelicName(id: string): string {
  return (RELICS as Record<string, { name?: string }>)[id]?.name || id;
}

/** 아이템 이름 조회 */
export function getItemName(id: string): string {
  return ITEMS[id]?.name || id;
}

/** 카드 이름 조회 */
export function getCardName(id: string): string {
  const card = CARDS.find(c => c.id === id);
  return card?.name || id;
}

/** 몬스터 이름 조회 */
export function getMonsterName(id: string): string {
  const enemy = ENEMIES.find(e => e.id === id);
  return enemy?.name || id;
}

/** 이벤트 이름 조회 */
export function getEventName(id: string): string {
  return NEW_EVENT_LIBRARY[id]?.title || id;
}

/** 카드 효과 요약 문자열 생성 */
export function getCardEffectStr(id: string): string {
  const card = CARDS.find(c => c.id === id);
  if (!card) return '-';
  const effects: string[] = [];
  if (card.damage) effects.push(`피해 ${card.damage}${card.hits && card.hits > 1 ? `×${card.hits}` : ''}`);
  if (card.block) effects.push(`방어 ${card.block}`);
  if (card.speedCost) effects.push(`속도 ${card.speedCost}`);
  return effects.join(', ') || '-';
}

// ==================== 포맷팅 유틸리티 ====================

/** 퍼센트 포맷 */
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

/** 숫자 포맷 */
const num = (v: number) => v.toFixed(1);

// ==================== 메인 포맷팅 함수 ====================

/**
 * 단일 전략 통계 포맷 함수
 * @param stats 상세 통계
 * @param strategyLabel 전략 레이블
 * @returns 마크다운 형식의 문자열 배열
 */
export function formatSingleStrategyStats(stats: DetailedStats, strategyLabel: string): string[] {
  const lines: string[] = [];

  lines.push(`## 📊 ${strategyLabel} 전략 결과`);
  lines.push('');

  // ==================== 1. 런 통계 ====================
  lines.push('### 1. 런 통계');
  lines.push(`- 총 런: ${stats.runStats.totalRuns}회`);
  lines.push(`- 성공: ${stats.runStats.successfulRuns}회 (${pct(stats.runStats.successRate)})`);
  lines.push(`- 평균 도달 층: ${num(stats.runStats.avgLayerReached)}`);
  lines.push(`- 평균 전투 승리: ${num(stats.runStats.avgBattlesWon)}`);
  lines.push(`- 평균 골드: ${num(stats.runStats.avgGoldEarned)}`);
  lines.push(`- 평균 덱 크기: ${num(stats.runStats.avgFinalDeckSize)}`);
  lines.push(`- 평균 상징 수: ${num(stats.runStats.avgFinalRelicCount)}`);
  lines.push('');

  // 사망 원인
  if (stats.runStats.deathCauses && Object.keys(stats.runStats.deathCauses).length > 0) {
    lines.push('#### 사망 원인');
    Object.entries(stats.runStats.deathCauses)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cause, count]) => {
        lines.push(`- ${cause}: ${count}회 (${pct(count / stats.runStats.totalRuns)})`);
      });
    lines.push('');
  }

  // 승리 방식 (영혼파괴/육체파괴)
  const totalWins = (stats.runStats.soulDestructions ?? 0) + (stats.runStats.physicalDestructions ?? 0);
  if (totalWins > 0) {
    lines.push('#### 승리 방식 (파괴 유형)');
    const soulRate = ((stats.runStats.soulDestructions ?? 0) / totalWins * 100).toFixed(1);
    const physRate = ((stats.runStats.physicalDestructions ?? 0) / totalWins * 100).toFixed(1);
    lines.push(`- 💜 영혼파괴: ${stats.runStats.soulDestructions ?? 0}회 (${soulRate}%)`);
    lines.push(`- ❤️ 육체파괴: ${stats.runStats.physicalDestructions ?? 0}회 (${physRate}%)`);
    lines.push('');
  }

  // ==================== 2. 몬스터 통계 ====================
  if (stats.monsterStats.size > 0) {
    lines.push('### 2. 몬스터 전투');
    lines.push('| 몬스터 | 전투 | 승률 | 평균턴 | 평균피해 |');
    lines.push('|--------|------|------|--------|----------|');
    Array.from(stats.monsterStats.entries())
      .sort((a, b) => b[1].battles - a[1].battles)
      .slice(0, 10)
      .forEach(([id, m]) => {
        const avgDmg = m.avgDamageTaken !== undefined ? num(m.avgDamageTaken) : '-';
        lines.push(`| ${getMonsterName(id)} | ${m.battles} | ${pct(m.winRate)} | ${num(m.avgTurns)} | ${avgDmg} |`);
      });
    lines.push('');
  }

  // ==================== 3. 카드 픽률 ====================
  if (stats.cardPickStats && Object.keys(stats.cardPickStats.timesOffered || {}).length > 0) {
    lines.push('### 3. 카드 픽률 (상위 10개)');
    lines.push('| 카드 | 제시 | 픽률 |');
    lines.push('|------|------|------|');
    Object.entries(stats.cardPickStats.timesOffered || {})
      .sort((a, b) => (stats.cardPickStats.pickRate[b[0]] || 0) - (stats.cardPickStats.pickRate[a[0]] || 0))
      .slice(0, 10)
      .forEach(([id, offered]) => {
        const pickRate = stats.cardPickStats.pickRate[id] || 0;
        lines.push(`| ${getCardName(id)} | ${offered} | ${pct(pickRate)} |`);
      });
    lines.push('');
  }

  // ==================== 4. 카드 기여도 ====================
  if (stats.cardContributionStats && Object.keys(stats.cardContributionStats.contribution || {}).length > 0) {
    lines.push('### 4. 카드 기여도 (상위 10개)');
    lines.push('| 카드 | 보유시 승률 | 기여도 |');
    lines.push('|------|-------------|--------|');
    Object.entries(stats.cardContributionStats.contribution || {})
      .filter(([id]) => (stats.cardContributionStats.runsWithCard[id] || 0) >= 2)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 10)
      .forEach(([id, contrib]) => {
        const winWith = stats.cardContributionStats.winRateWithCard[id] || 0;
        const sign = (contrib as number) > 0 ? '+' : '';
        lines.push(`| ${getCardName(id)} | ${pct(winWith)} | ${sign}${pct(contrib as number)} |`);
      });
    lines.push('');
  }

  // ==================== 5. 상징 통계 (상세) ====================
  if (stats.relicStats && stats.relicStats.size > 0) {
    const allRelics = Array.from(stats.relicStats.entries());
    const totalRuns = stats.runStats.totalRuns || 1;

    lines.push('### 5. 상징 통계 (상세)');
    lines.push('');

    // 5.1 상징 기여도 (상위 10개)
    const topContribRelics = allRelics
      .filter(([, s]) => s.timesAcquired >= 2)
      .sort((a, b) => b[1].contribution - a[1].contribution)
      .slice(0, 10);

    if (topContribRelics.length > 0) {
      lines.push('#### 5.1 상징 기여도 (상위 10개)');
      lines.push('| 상징 | 획득 | 획득률 | 보유승률 | 미보유승률 | 기여도 |');
      lines.push('|------|------|--------|----------|------------|--------|');
      topContribRelics.forEach(([, s]) => {
        const acquireRate = s.timesAcquired / totalRuns;
        const sign = s.contribution > 0 ? '+' : '';
        lines.push(`| ${getRelicName(s.relicId)} | ${s.timesAcquired} | ${pct(acquireRate)} | ${pct(s.winRateWith)} | ${pct(s.winRateWithout)} | ${sign}${pct(s.contribution)} |`);
      });
      lines.push('');
    }

    // 5.2 상징 획득 출처 분석
    const sourceStats: Record<string, number> = {};
    allRelics.forEach(([, s]) => {
      Object.entries(s.acquiredFrom || {}).forEach(([source, count]) => {
        sourceStats[source] = (sourceStats[source] || 0) + count;
      });
    });
    if (Object.keys(sourceStats).length > 0) {
      const sourceLabels: Record<string, string> = {
        battle: '전투', shop: '상점', event: '이벤트',
        dungeon: '던전', boss: '보스', starting: '시작',
      };
      lines.push('#### 5.2 상징 획득 출처');
      Object.entries(sourceStats)
        .sort((a, b) => b[1] - a[1])
        .forEach(([source, count]) => {
          lines.push(`- ${sourceLabels[source] || source}: ${count}회`);
        });
      lines.push('');
    }

    // 5.3 상징 효과 발동 (발동 횟수 있는 것만)
    const activeRelics = allRelics
      .filter(([, s]) => s.effectTriggers > 0)
      .sort((a, b) => b[1].effectTriggers - a[1].effectTriggers)
      .slice(0, 10);
    if (activeRelics.length > 0) {
      lines.push('#### 5.3 상징 효과 발동 (상위 10개)');
      lines.push('| 상징 | 발동횟수 | 평균효과 | 평균도달층 |');
      lines.push('|------|----------|----------|------------|');
      activeRelics.forEach(([, s]) => {
        lines.push(`| ${getRelicName(s.relicId)} | ${s.effectTriggers}회 | ${s.avgEffectValue.toFixed(1)} | ${s.avgFloorReachedWith.toFixed(1)} |`);
      });
      lines.push('');
    }

    // 5.4 상징 시너지 (자주 함께 획득되는 상징)
    const synergyPairs: { relic1: string; relic2: string; count: number }[] = [];
    allRelics.forEach(([, s]) => {
      if (s.commonPairs && s.commonPairs.length > 0) {
        s.commonPairs.forEach(pair => {
          // 중복 방지: 알파벳 순서로 정렬
          const [first, second] = [s.relicId, pair.relicId].sort();
          const existing = synergyPairs.find(p => p.relic1 === first && p.relic2 === second);
          if (!existing) {
            synergyPairs.push({ relic1: first, relic2: second, count: pair.frequency });
          }
        });
      }
    });
    if (synergyPairs.length > 0) {
      lines.push('#### 5.4 상징 시너지 (자주 함께 획득)');
      lines.push('| 상징 1 | 상징 2 | 함께 획득 |');
      lines.push('|--------|--------|-----------|');
      synergyPairs
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .forEach(pair => {
          lines.push(`| ${getRelicName(pair.relic1)} | ${getRelicName(pair.relic2)} | ${pair.count}회 |`);
        });
      lines.push('');
    }

    // 5.5 평균 획득 층 (빠른 획득 상징) + 천장 효과 감지
    const earlyRelics = allRelics
      .filter(([, s]) => s.timesAcquired >= 3 && s.avgAcquireFloor > 0)
      .sort((a, b) => a[1].avgAcquireFloor - b[1].avgAcquireFloor)
      .slice(0, 10);
    if (earlyRelics.length > 0) {
      const globalAvgLayer = stats.runStats.avgLayerReached ?? 0;
      const maxLayer = 11; // 최대 층
      const isCeilingEffect = globalAvgLayer >= maxLayer - 0.5; // 10.5 이상이면 천장 효과

      lines.push('#### 5.5 상징 획득 분석');

      if (isCeilingEffect) {
        // 천장 효과: 승률 기여도로 대체
        lines.push(`*(⚠️ 천장 효과 감지: 평균 도달층 ${globalAvgLayer.toFixed(1)}/${maxLayer} - 승률 기여도로 표시)*`);
        lines.push('');
        lines.push('| 상징 | 평균획득층 | 획득횟수 | 보유승률 | 승률기여 |');
        lines.push('|------|------------|----------|----------|----------|');
        earlyRelics.forEach(([, s]) => {
          const winRateStr = `${(s.winRateWith * 100).toFixed(1)}%`;
          const contrib = s.contribution * 100;
          const sign = contrib > 0 ? '+' : '';
          const contribStr = `${sign}${contrib.toFixed(1)}%`;
          lines.push(`| ${getRelicName(s.relicId)} | ${s.avgAcquireFloor.toFixed(1)} | ${s.timesAcquired} | ${winRateStr} | ${contribStr} |`);
        });
      } else {
        // 정상 분포: 도달층 기여도 표시
        lines.push(`*(기준 평균 도달층: ${globalAvgLayer.toFixed(2)})*`);
        lines.push('');
        lines.push('| 상징 | 평균획득층 | 획득횟수 | 보유시도달층 | 도달층기여 |');
        lines.push('|------|------------|----------|--------------|------------|');
        earlyRelics.forEach(([, s]) => {
          const hasValidData = Number.isFinite(s.avgFloorReachedWith) && s.avgFloorReachedWith > 0;
          let floorContribStr = '-';
          let avgFloorStr = '-';
          if (hasValidData) {
            avgFloorStr = s.avgFloorReachedWith.toFixed(2);
            const avgLayer = Number.isFinite(stats.runStats.avgLayerReached) ? stats.runStats.avgLayerReached : 0;
            const floorContrib = s.avgFloorReachedWith - avgLayer;
            const sign = floorContrib > 0 ? '+' : '';
            floorContribStr = `${sign}${floorContrib.toFixed(2)}`;
          }
          lines.push(`| ${getRelicName(s.relicId)} | ${s.avgAcquireFloor.toFixed(1)} | ${s.timesAcquired} | ${avgFloorStr} | ${floorContribStr} |`);
        });
      }
      lines.push('');
    }
  }

  // ==================== 6. 상점 통계 ====================
  if (stats.shopStats) {
    lines.push('### 6. 상점 통계');
    lines.push(`- 총 방문: ${stats.shopStats.totalVisits ?? 0}회`);
    lines.push(`- 총 지출: ${stats.shopStats.totalSpent ?? 0}G`);
    lines.push(`- 평균 지출: ${(stats.shopStats.avgSpentPerVisit ?? 0).toFixed(0)}G/회`);
    lines.push(`- 카드 제거: ${stats.shopStats.cardsRemoved ?? 0}회`);

    const relicsPurchased = Object.entries(stats.shopStats.relicsPurchased || {});
    if (relicsPurchased.length > 0) {
      lines.push('#### 구매한 상징');
      relicsPurchased.forEach(([id, count]) => {
        lines.push(`- ${getRelicName(id)}: ${count}회`);
      });
    }

    const itemsPurchased = Object.entries(stats.shopStats.itemsPurchased || {});
    if (itemsPurchased.length > 0) {
      lines.push('#### 구매한 아이템');
      itemsPurchased.forEach(([id, count]) => {
        lines.push(`- ${getItemName(id)}: ${count}회`);
      });
    }
    lines.push('');
  }

  // ==================== 7. 던전 통계 ====================
  if (stats.dungeonStats) {
    lines.push('### 7. 던전 통계');
    lines.push(`- 총 진입: ${stats.dungeonStats.totalAttempts ?? 0}회`);
    lines.push(`- 클리어율: ${pct(stats.dungeonStats.clearRate ?? 0)}`);
    lines.push(`- 평균 소요 턴: ${num(stats.dungeonStats.avgTurns ?? 0)}`);
    lines.push(`- 평균 받은 피해: ${num(stats.dungeonStats.avgDamageTaken ?? 0)}`);

    const rewardCards = stats.dungeonStats.rewards?.cards ?? [];
    const rewardRelics = stats.dungeonStats.rewards?.relics ?? [];
    if (rewardCards.length > 0) {
      lines.push(`- 획득 카드: ${rewardCards.length}장 (${rewardCards.map((id: string) => getCardName(id)).join(', ')})`);
    }
    if (rewardRelics.length > 0) {
      lines.push(`- 획득 상징: ${rewardRelics.length}개 (${rewardRelics.map((id: string) => getRelicName(id)).join(', ')})`);
    }
    lines.push('');
  }

  // ==================== 8. 이벤트 통계 ====================
  if (stats.eventStats && stats.eventStats.size > 0) {
    lines.push('### 8. 이벤트 통계');
    lines.push('| 이벤트 | 발생 | 성공 | 골드변화 | 재료변화 |');
    lines.push('|--------|------|------|----------|----------|');
    Array.from(stats.eventStats.entries())
      .sort((a, b) => (b[1].occurrences ?? 0) - (a[1].occurrences ?? 0))
      .forEach(([id, e]: [string, { occurrences?: number; successes?: number; totalGoldChange?: number; totalMaterialChange?: number }]) => {
        lines.push(`| ${getEventName(id)} | ${e.occurrences ?? 0} | ${e.successes ?? 0} | ${e.totalGoldChange ?? 0}G | ${e.totalMaterialChange ?? 0} |`);
      });
    lines.push('');

    // 이벤트 선택 상세
    if (stats.eventChoiceStats && stats.eventChoiceStats.size > 0) {
      lines.push('#### 이벤트 선택 상세');
      Array.from(stats.eventChoiceStats.entries()).forEach(([eventId, choiceStats]: [string, { occurrences?: number; timesSkipped?: number; choiceOutcomes?: Record<string, { timesChosen?: number; avgHpChange?: number; avgGoldChange?: number; successRate?: number }> }]) => {
        lines.push(`- **${getEventName(eventId)}**: 발생 ${choiceStats.occurrences ?? 0}회, 스킵 ${choiceStats.timesSkipped ?? 0}회`);
        if (choiceStats.choiceOutcomes) {
          Object.entries(choiceStats.choiceOutcomes).forEach(([choiceId, outcome]) => {
            lines.push(`  - 선택 "${choiceId}": ${outcome.timesChosen ?? 0}회, HP ${(outcome.avgHpChange ?? 0).toFixed(1)}, 골드 ${(outcome.avgGoldChange ?? 0).toFixed(0)}, 성공률 ${pct(outcome.successRate ?? 0)}`);
          });
        }
      });
      lines.push('');
    }
  }

  // ==================== 9. 아이템 통계 ====================
  if (stats.itemUsageStats) {
    const itemsAcquired = Object.entries(stats.itemUsageStats.itemsAcquired || {});
    const itemEffects = Object.entries(stats.itemUsageStats.itemEffects || {});

    if (itemsAcquired.length > 0 || itemEffects.length > 0) {
      lines.push('### 9. 아이템 통계');

      if (itemsAcquired.length > 0) {
        lines.push('#### 획득한 아이템');
        itemsAcquired.forEach(([id, count]) => {
          lines.push(`- ${getItemName(id)}: ${count}개`);
        });
      }

      if (itemEffects.length > 0) {
        lines.push('#### 아이템 사용 효과');
        lines.push('| 아이템 | 사용 | HP회복 | 피해 |');
        lines.push('|--------|------|--------|------|');
        itemEffects.forEach(([id, eff]: [string, { timesUsed: number; totalHpHealed: number; totalDamage: number }]) => {
          lines.push(`| ${getItemName(id)} | ${eff.timesUsed}회 | ${eff.totalHpHealed} | ${eff.totalDamage} |`);
        });
      }
      lines.push('');
    }
  }

  // ==================== 10. 성장 통계 ====================
  if (stats.growthStats) {
    lines.push('### 10. 성장 통계');
    lines.push(`- 총 투자: ${stats.growthStats.totalInvestments ?? 0}회`);
    lines.push(`- 런당 평균: ${(stats.growthStats.avgInvestmentsPerRun ?? 0).toFixed(1)}회`);

    // 스탯별 투자
    const statInvestments = Object.entries(stats.growthStats.statInvestments || {});
    if (statInvestments.length > 0) {
      lines.push('#### 스탯별 투자');
      statInvestments.sort((a, b) => b[1] - a[1]).forEach(([stat, count]) => {
        lines.push(`- ${stat}: ${count}회`);
      });
    }

    // 스탯별 승률 상관관계
    const statWinCorr = Object.entries(stats.growthStats.statWinCorrelation || {});
    if (statWinCorr.length > 0) {
      lines.push('#### 스탯별 승률 기여도');
      lines.push('| 스탯 | 기여도 |');
      lines.push('|------|--------|');
      statWinCorr.sort((a, b) => (b[1] as number) - (a[1] as number)).forEach(([stat, corr]) => {
        const sign = (corr as number) > 0 ? '+' : '';
        lines.push(`| ${stat} | ${sign}${pct(corr as number)} |`);
      });
    }

    // 로고스 효과 발동
    const logosActivations = Object.entries(stats.growthStats.logosActivations || {});
    if (logosActivations.length > 0) {
      lines.push('#### 로고스 효과 발동');
      logosActivations.sort((a, b) => b[1] - a[1]).forEach(([effect, count]) => {
        lines.push(`- ${effect}: ${count}회`);
      });
    }

    // 성장 경로별 승률
    if (stats.growthStats.growthPathStats && stats.growthStats.growthPathStats.length > 0) {
      lines.push('#### 성장 경로별 승률 (상위 5개)');
      lines.push('| 경로 | 횟수 | 승률 |');
      lines.push('|------|------|------|');
      stats.growthStats.growthPathStats.slice(0, 5).forEach(path => {
        lines.push(`| ${path.path} | ${path.count}회 | ${pct(path.winRate)} |`);
      });
    }
    lines.push('');
  }

  // ==================== 11. 카드 승급 통계 ====================
  if (stats.upgradeStats && stats.upgradeStats.totalUpgrades > 0) {
    lines.push('### 11. 카드 승급 통계');
    lines.push(`- 총 승급: ${stats.upgradeStats.totalUpgrades}회`);
    lines.push(`- 런당 평균: ${(stats.upgradeStats.avgUpgradesPerRun ?? 0).toFixed(1)}회`);

    const upgradesByCard = Object.entries(stats.upgradeStats.upgradesByCard || {});
    if (upgradesByCard.length > 0) {
      lines.push('#### 승급된 카드');
      upgradesByCard.sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([id, count]) => {
        lines.push(`- ${getCardName(id)}: ${count}회`);
      });
    }
    lines.push('');
  }

  // ==================== 12. 사망 분석 ====================
  if (stats.deathStats && stats.deathStats.totalDeaths > 0) {
    lines.push('### 12. 사망 분석');
    lines.push(`- 총 사망: ${stats.deathStats.totalDeaths}회`);
    lines.push(`- 평균 사망 층: ${num(stats.deathStats.avgDeathFloor)}`);

    if (stats.deathStats.deadliestEnemies && stats.deathStats.deadliestEnemies.length > 0) {
      lines.push('#### 가장 위험한 적');
      stats.deathStats.deadliestEnemies.slice(0, 3).forEach(enemy => {
        lines.push(`- ${enemy.enemyName}: ${enemy.deaths}회`);
      });
    }
    lines.push('');
  }

  // ==================== 13. 포커 콤보 통계 ====================
  if (stats.pokerComboStats && Object.keys(stats.pokerComboStats.comboFrequency || {}).length > 0) {
    lines.push('### 13. 포커 콤보 통계');
    lines.push('| 콤보 | 발동 | 평균에테르 | 승률 |');
    lines.push('|------|------|------------|------|');

    const comboEntries = Object.entries(stats.pokerComboStats.comboFrequency || {})
      .sort((a, b) => b[1] - a[1]);

    comboEntries.forEach(([combo, freq]) => {
      const avgEther = stats.pokerComboStats.avgEtherByCombo?.[combo] || 0;
      const winRate = stats.pokerComboStats.winRateByCombo?.[combo] || 0;
      lines.push(`| ${combo} | ${freq}회 | ${avgEther.toFixed(1)} | ${pct(winRate)} |`);
    });
    lines.push('');
  }

  // ==================== 14. 카드 시너지 통계 ====================
  if (stats.cardSynergyStats && stats.cardSynergyStats.topSynergies && stats.cardSynergyStats.topSynergies.length > 0) {
    lines.push('### 14. 카드 시너지 (TOP 10)');
    lines.push('| 카드 조합 | 빈도 | 조합승률 |');
    lines.push('|-----------|------|----------|');

    stats.cardSynergyStats.topSynergies.slice(0, 10).forEach(syn => {
      const pairNames = syn.pair.split('+').map(id => getCardName(id.trim())).join(' + ');
      lines.push(`| ${pairNames} | ${syn.frequency}회 | ${pct(syn.winRate)} |`);
    });
    lines.push('');
  }

  // ==================== 15. 카드 심층 분석 ====================
  if (stats.cardDeepStats && stats.cardDeepStats.size > 0) {
    lines.push('### 15. 카드 심층 분석 (상위 10개)');
    lines.push('| 카드 | 전투당사용 | 미사용런 | 보유승률 | 미보유승률 |');
    lines.push('|------|------------|----------|----------|------------|');

    Array.from(stats.cardDeepStats.entries())
      .filter(([, s]) => s.timesPicked >= 3)
      .sort((a, b) => (b[1].winRateWith - b[1].winRateWithout) - (a[1].winRateWith - a[1].winRateWithout))
      .slice(0, 10)
      .forEach(([, s]) => {
        lines.push(`| ${getCardName(s.cardId)} | ${s.avgPlaysPerBattle.toFixed(1)} | ${s.neverPlayedRuns} | ${pct(s.winRateWith)} | ${pct(s.winRateWithout)} |`);
      });

    // 베스트/워스트 파트너
    const topCard = Array.from(stats.cardDeepStats.entries())
      .filter(([, s]) => s.bestPartners && s.bestPartners.length > 0)
      .sort((a, b) => b[1].timesPicked - a[1].timesPicked)[0];

    if (topCard && topCard[1].bestPartners && topCard[1].bestPartners.length > 0) {
      lines.push('');
      lines.push(`#### ${getCardName(topCard[0])} 시너지 파트너`);
      lines.push('- 베스트: ' + topCard[1].bestPartners.slice(0, 3).map(p =>
        `${getCardName(p.cardId)} (${pct(p.winRate)})`
      ).join(', '));
      if (topCard[1].worstPartners && topCard[1].worstPartners.length > 0) {
        lines.push('- 워스트: ' + topCard[1].worstPartners.slice(0, 3).map(p =>
          `${getCardName(p.cardId)} (${pct(p.winRate)})`
        ).join(', '));
      }
    }
    lines.push('');
  }

  // ==================== 16. 층 진행 분석 ====================
  if (stats.floorProgressionAnalysis) {
    const fpa = stats.floorProgressionAnalysis;
    lines.push('### 16. 층 진행 분석');

    // 난이도 스파이크
    if (fpa.difficultySpikes && fpa.difficultySpikes.length > 0) {
      lines.push('#### 난이도 스파이크 (승률 급락 지점)');
      fpa.difficultySpikes.slice(0, 5).forEach(spike => {
        lines.push(`- ${spike.floor}층: ${pct(spike.winRateDrop)} 급락 (${spike.reason})`);
      });
      lines.push('');
    }

    // 병목 구간
    if (fpa.bottleneckAnalysis?.highFailureFloors && fpa.bottleneckAnalysis.highFailureFloors.length > 0) {
      lines.push('#### 병목 구간 (실패 집중 층)');
      fpa.bottleneckAnalysis.highFailureFloors.slice(0, 3).forEach(floor => {
        lines.push(`- ${floor.floor}층: 실패율 ${pct(floor.failureRate)} (${floor.mainCause})`);
      });
      lines.push('');
    }

    // 자원 커브 요약
    if (fpa.resourceCurves?.hpCurve && fpa.resourceCurves.hpCurve.length > 0) {
      const lastHp = fpa.resourceCurves.hpCurve[fpa.resourceCurves.hpCurve.length - 1];
      const midHp = fpa.resourceCurves.hpCurve[Math.floor(fpa.resourceCurves.hpCurve.length / 2)];
      lines.push('#### 자원 커브 요약');
      lines.push(`- 중반(${midHp?.floor || '?'}층) 평균 HP: ${pct(midHp?.avgHpRatio || 0)}`);
      lines.push(`- 최종(${lastHp?.floor || '?'}층) 평균 HP: ${pct(lastHp?.avgHpRatio || 0)}`);
      lines.push('');
    }
  }

  // ==================== 17. 기록 통계 ====================
  if (stats.recordStats) {
    const rs = stats.recordStats;
    const hasRecords = rs.longestWinStreak > 0 || rs.flawlessVictories > 0 || rs.maxSingleTurnDamage > 0;

    if (hasRecords) {
      lines.push('### 17. 기록 통계');
      if (rs.longestWinStreak > 0) lines.push(`- 최장 연승: ${rs.longestWinStreak}연승`);
      if (rs.currentWinStreak > 0) lines.push(`- 현재 연승: ${rs.currentWinStreak}연승`);
      if (rs.flawlessVictories > 0) lines.push(`- 무피해 클리어: ${rs.flawlessVictories}회`);
      if (rs.bossFlawlessCount > 0) lines.push(`- 보스 무피해: ${rs.bossFlawlessCount}회`);
      if (rs.maxSingleTurnDamage > 0) {
        lines.push(`- 단일 턴 최대 피해: ${rs.maxSingleTurnDamage}`);
        if (rs.maxDamageRecord) {
          lines.push(`  └ ${getCardName(rs.maxDamageRecord.cardId)} vs ${rs.maxDamageRecord.monster}`);
        }
      }
      if (rs.fastestClear > 0) {
        lines.push(`- 최소 전투 클리어: ${rs.fastestClear}전`);
      }
      if (rs.smallestDeckClear > 0) lines.push(`- 최소 덱 클리어: ${rs.smallestDeckClear}장`);
      if (rs.largestDeckClear > 0) lines.push(`- 최대 덱 클리어: ${rs.largestDeckClear}장`);
      if (rs.maxGoldHeld > 0) lines.push(`- 최다 골드 보유: ${rs.maxGoldHeld}G`);
      lines.push('');
    }
  }

  // ==================== 18. 토큰 상세 통계 ====================
  if (stats.tokenStats && stats.tokenStats.size > 0) {
    lines.push('### 18. 토큰 통계');
    lines.push('| 토큰 | 획득 | 사용률 | 평균효과 |');
    lines.push('|------|------|--------|----------|');

    Array.from(stats.tokenStats.entries())
      .sort((a, b) => b[1].timesAcquired - a[1].timesAcquired)
      .slice(0, 10)
      .forEach(([, t]) => {
        lines.push(`| ${t.tokenName} | ${t.timesAcquired} | ${pct(t.usageRate)} | ${t.effectStats?.avgValuePerUse?.toFixed(1) || '0'} |`);
      });
    lines.push('');
  }

  return lines;
}

/**
 * AI 공유용 포맷 함수 (3개 전략 통합)
 * @param statsByStrategy 전략별 통계
 * @param config 설정 (런 수, 난이도)
 * @returns 마크다운 형식의 문자열
 */
export async function formatStatsForAI(
  statsByStrategy: StatsByStrategy,
  config: { runCount: number; difficulty: number }
): Promise<string> {
  const lines: string[] = [];

  lines.push('# 시뮬레이션 결과 (3가지 전략 비교)');
  lines.push(`설정: 전략당 ${config.runCount}런, 난이도 ${config.difficulty}`);
  lines.push(`총 시뮬레이션: ${config.runCount * 3}런`);
  lines.push('');

  // 전략별 요약 비교 테이블
  lines.push('## 전략 비교 요약');
  lines.push('| 전략 | 승률 | 평균 도달 층 | 평균 덱 크기 | 평균 상징 | 평균 골드 |');
  lines.push('|------|------|--------------|--------------|-----------|-----------|');
  ALL_STRATEGIES.forEach(strategy => {
    const stats = statsByStrategy[strategy];
    if (stats) {
      lines.push(`| ${STRATEGY_LABELS[strategy]} | ${pct(stats.runStats.successRate)} | ${stats.runStats.avgLayerReached.toFixed(1)} | ${stats.runStats.avgFinalDeckSize.toFixed(1)} | ${stats.runStats.avgFinalRelicCount.toFixed(1)} | ${stats.runStats.avgGoldEarned.toFixed(0)} |`);
    }
  });
  lines.push('');

  // 각 전략별 상세 통계
  ALL_STRATEGIES.forEach(strategy => {
    const stats = statsByStrategy[strategy];
    if (stats) {
      lines.push('---');
      lines.push(...formatSingleStrategyStats(stats, STRATEGY_LABELS[strategy]));
    }
  });

  // ==================== 18. AI 분석 리포트 ====================
  // 균형 전략 기준으로 분석 (가장 기본적인 전략)
  const analysisStats = statsByStrategy.balanced || statsByStrategy.aggressive || statsByStrategy.defensive;
  if (analysisStats) {
    // 동적 import로 stats-analysis-framework 로드
    const { generateAnalysisGuidelines } = await import('../../../../simulator/analysis/stats-analysis-framework');
    lines.push('---');
    lines.push('## 18. AI 분석 리포트');
    lines.push('');
    lines.push(generateAnalysisGuidelines(analysisStats));
  }

  return lines.join('\n');
}
