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
import type { SkillLevel } from '../../../simulator/core/battle-engine-types';
import { analyzeStats, generateAnalysisGuidelines } from '../../../simulator/analysis/stats-analysis-framework';
import { BalanceInsightAnalyzer, type BalanceInsightReport } from '../../../simulator/analysis/balance-insights';

// 전략 타입 및 레이블
type StrategyType = 'balanced' | 'aggressive' | 'defensive';
const STRATEGY_LABELS: Record<StrategyType, string> = {
  balanced: '균형',
  aggressive: '공격적',
  defensive: '방어적',
};
const ALL_STRATEGIES: StrategyType[] = ['balanced', 'aggressive', 'defensive'];

// 스킬 레벨 레이블
const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: '초보 (30% 실수)',
  intermediate: '중급 (15% 실수)',
  advanced: '고수 (5% 실수)',
  optimal: 'AI 최적 (0% 실수)',
};
const ALL_SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'optimal'];

// 전략별 통계 타입
type StatsByStrategy = Record<StrategyType, DetailedStats | null>;

// 단일 전략 통계 포맷 함수
function formatSingleStrategyStats(stats: DetailedStats, strategyLabel: string): string[] {
  const lines: string[] = [];
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const num = (v: number) => v.toFixed(1);
  const getCardName = (id: string) => CARDS.find(c => c.id === id)?.name || id;
  const getMonsterName = (id: string) => ENEMIES.find(e => e.id === id)?.name || id;
  const getRelicNameLocal = (id: string) => (RELICS as Record<string, { name?: string }>)[id]?.name || id;
  const getItemNameLocal = (id: string) => ITEMS[id]?.name || id;
  const getEventNameLocal = (id: string) => NEW_EVENT_LIBRARY[id]?.title || id;

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
        lines.push(`| ${getRelicNameLocal(s.relicId)} | ${s.timesAcquired} | ${pct(acquireRate)} | ${pct(s.winRateWith)} | ${pct(s.winRateWithout)} | ${sign}${pct(s.contribution)} |`);
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
        lines.push(`| ${getRelicNameLocal(s.relicId)} | ${s.effectTriggers}회 | ${s.avgEffectValue.toFixed(1)} | ${s.avgFloorReachedWith.toFixed(1)} |`);
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
          lines.push(`| ${getRelicNameLocal(pair.relic1)} | ${getRelicNameLocal(pair.relic2)} | ${pair.count}회 |`);
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
          lines.push(`| ${getRelicNameLocal(s.relicId)} | ${s.avgAcquireFloor.toFixed(1)} | ${s.timesAcquired} | ${winRateStr} | ${contribStr} |`);
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
          lines.push(`| ${getRelicNameLocal(s.relicId)} | ${s.avgAcquireFloor.toFixed(1)} | ${s.timesAcquired} | ${avgFloorStr} | ${floorContribStr} |`);
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
        lines.push(`- ${getRelicNameLocal(id)}: ${count}회`);
      });
    }

    const itemsPurchased = Object.entries(stats.shopStats.itemsPurchased || {});
    if (itemsPurchased.length > 0) {
      lines.push('#### 구매한 아이템');
      itemsPurchased.forEach(([id, count]) => {
        lines.push(`- ${getItemNameLocal(id)}: ${count}회`);
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
      lines.push(`- 획득 상징: ${rewardRelics.length}개 (${rewardRelics.map((id: string) => getRelicNameLocal(id)).join(', ')})`);
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
        lines.push(`| ${getEventNameLocal(id)} | ${e.occurrences ?? 0} | ${e.successes ?? 0} | ${e.totalGoldChange ?? 0}G | ${e.totalMaterialChange ?? 0} |`);
      });
    lines.push('');

    // 이벤트 선택 상세
    if (stats.eventChoiceStats && stats.eventChoiceStats.size > 0) {
      lines.push('#### 이벤트 선택 상세');
      Array.from(stats.eventChoiceStats.entries()).forEach(([eventId, choiceStats]: [string, { occurrences?: number; timesSkipped?: number; choiceOutcomes?: Record<string, { timesChosen?: number; avgHpChange?: number; avgGoldChange?: number; successRate?: number }> }]) => {
        lines.push(`- **${getEventNameLocal(eventId)}**: 발생 ${choiceStats.occurrences ?? 0}회, 스킵 ${choiceStats.timesSkipped ?? 0}회`);
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
          lines.push(`- ${getItemNameLocal(id)}: ${count}개`);
        });
      }

      if (itemEffects.length > 0) {
        lines.push('#### 아이템 사용 효과');
        lines.push('| 아이템 | 사용 | HP회복 | 피해 |');
        lines.push('|--------|------|--------|------|');
        itemEffects.forEach(([id, eff]: [string, { timesUsed: number; totalHpHealed: number; totalDamage: number }]) => {
          lines.push(`| ${getItemNameLocal(id)} | ${eff.timesUsed}회 | ${eff.totalHpHealed} | ${eff.totalDamage} |`);
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

// AI 공유용 포맷 함수 (3개 전략 통합)
function formatStatsForAI(statsByStrategy: StatsByStrategy, config: { runCount: number; difficulty: number }): string {
  const lines: string[] = [];
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

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
    lines.push('---');
    lines.push('## 18. AI 분석 리포트');
    lines.push('');
    lines.push(generateAnalysisGuidelines(analysisStats));
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

type StatTab = 'run' | 'shop' | 'dungeon' | 'event' | 'item' | 'monster' | 'card' | 'pickrate' | 'contribution' | 'synergy' | 'records' | 'difficulty' | 'cardChoice' | 'recentRuns' | 'growth' | 'aiStrategy' | 'upgrade' | 'analysis' | 'insights' | 'autoTune';

const SimulatorTab = memo(function SimulatorTab() {
  const [runCount, setRunCount] = useState(10);
  const [difficulty, setDifficulty] = useState(1); // 기본 난이도 1 (실제 게임과 동일)
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('intermediate'); // 기본 중급자 (실제 플레이어 수준)
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStrategy, setCurrentStrategy] = useState<StrategyType | null>(null);
  const [statsByStrategy, setStatsByStrategy] = useState<StatsByStrategy>({
    balanced: null,
    aggressive: null,
    defensive: null,
  });
  const [activeStatTab, setActiveStatTab] = useState<StatTab>('run');
  const [activeStrategyTab, setActiveStrategyTab] = useState<StrategyType>('balanced');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  // 난이도 수정자 상태 (Hades Heat / StS Ascension 스타일)
  const [showAdvancedDifficulty, setShowAdvancedDifficulty] = useState(false);
  const [enemyDamageMult, setEnemyDamageMult] = useState(1.0);
  const [startingHpMult, setStartingHpMult] = useState(1.0);
  const [restHealMult, setRestHealMult] = useState(1.0);
  const [goldMult, setGoldMult] = useState(1.0);
  const [shopPriceMult, setShopPriceMult] = useState(1.0);
  const [enemySpeedBonus, setEnemySpeedBonus] = useState(0);
  const [startingCurseCards, setStartingCurseCards] = useState(0);

  // 현재 선택된 전략의 통계
  const stats = statsByStrategy[activeStrategyTab];
  const hasAnyStats = statsByStrategy.balanced !== null || statsByStrategy.aggressive !== null || statsByStrategy.defensive !== null;

  // AI 공유용 복사 함수
  const copyForAI = useCallback(async () => {
    if (!hasAnyStats) return;

    try {
      const text = formatStatsForAI(statsByStrategy, { runCount, difficulty });
      await navigator.clipboard.writeText(text);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  }, [statsByStrategy, hasAnyStats, runCount, difficulty]);

  const runSimulation = useCallback(async () => {
    setIsRunning(true);
    setProgress(0);
    setStatsByStrategy({ balanced: null, aggressive: null, defensive: null });
    setCurrentStrategy(null);

    try {
      const { RunSimulator } = await import('../../../simulator/game/run-simulator');
      const { StatsCollector } = await import('../../../simulator/analysis/detailed-stats');
      const { setLogLevel, LogLevel } = await import('../../../simulator/core/logger');

      setLogLevel(LogLevel.SILENT);

      const totalRuns = runCount * 3; // 3개 전략 × runCount
      let completedRuns = 0;

      const results: StatsByStrategy = {
        balanced: null,
        aggressive: null,
        defensive: null,
      };

      // 3개 전략 모두 실행
      for (const strategy of ALL_STRATEGIES) {
        setCurrentStrategy(strategy);

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
            strategy,
            skillLevel, // 플레이어 스킬 레벨 (실수 확률)
            // 난이도 수정자 (Hades Heat / StS Ascension 스타일)
            difficultyModifiers: {
              enemyDamageMultiplier: enemyDamageMult,
              startingHpMultiplier: startingHpMult,
              restHealMultiplier: restHealMult,
              goldMultiplier: goldMult,
              shopPriceMultiplier: shopPriceMult,
              enemySpeedBonus: enemySpeedBonus,
              startingCurseCards: startingCurseCards,
            }
          });

          completedRuns++;
          setProgress(Math.round((completedRuns / totalRuns) * 100));
          if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
        }

        results[strategy] = collector.finalize();
      }

      setStatsByStrategy(results);
      setCurrentStrategy(null);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsRunning(false);
    }
  }, [runCount, difficulty, skillLevel, enemyDamageMult, startingHpMult, restHealMult, goldMult, shopPriceMult, enemySpeedBonus, startingCurseCards]);

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
    { id: 'upgrade', label: '승급' },
    { id: 'growth', label: '성장' },
    { id: 'aiStrategy', label: 'AI전략' },
    { id: 'difficulty', label: '난이도별' },
    { id: 'cardChoice', label: '선택분석' },
    { id: 'recentRuns', label: '런진행' },
    { id: 'records', label: '기록' },
    { id: 'analysis', label: '🔍분석' },
    { id: 'insights', label: '⚖️인사이트' },
    { id: 'autoTune', label: '🔧자동튜닝' },
  ];

  return (
    <div>
      <h3 style={STYLES.sectionHeader}>🎮 런 시뮬레이터</h3>

      {/* 설정 섹션 */}
      <div style={STYLES.sectionBox}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <div>
            <label style={STYLES.label}>전략당 런 횟수</label>
            <input type="number" min={1} max={100} value={runCount}
              onChange={e => setRunCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
              style={STYLES.input} disabled={isRunning} />
          </div>
          <div>
            <label style={STYLES.label}>난이도</label>
            <input type="number" min={1} max={20} value={difficulty}
              onChange={e => setDifficulty(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
              style={STYLES.input} disabled={isRunning} />
          </div>
          <div>
            <label style={STYLES.label}>플레이어 수준</label>
            <select
              value={skillLevel}
              onChange={e => setSkillLevel(e.target.value as SkillLevel)}
              style={{ ...STYLES.input, minWidth: '140px' }}
              disabled={isRunning}
            >
              {ALL_SKILL_LEVELS.map(level => (
                <option key={level} value={level}>{SKILL_LEVEL_LABELS[level]}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              총 {runCount * 3}런 (3전략 × {runCount}런)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => setShowAdvancedDifficulty(!showAdvancedDifficulty)}
              style={{
                padding: '4px 8px',
                background: showAdvancedDifficulty ? '#4f46e5' : '#374151',
                border: '1px solid #6366f1',
                borderRadius: '4px',
                color: '#e5e7eb',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
              disabled={isRunning}
            >
              ⚙️ 고급 난이도
            </button>
          </div>
        </div>

        {/* 고급 난이도 설정 (Hades Heat / StS Ascension 스타일) */}
        {showAdvancedDifficulty && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '12px',
            padding: '12px',
            background: 'rgba(99, 102, 241, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(99, 102, 241, 0.3)'
          }}>
            <div>
              <label style={{ ...STYLES.label, fontSize: '0.7rem' }}>적 공격력 배율</label>
              <input type="number" min={0.5} max={3} step={0.1} value={enemyDamageMult}
                onChange={e => setEnemyDamageMult(Math.min(3, Math.max(0.5, parseFloat(e.target.value) || 1)))}
                style={{ ...STYLES.input, width: '80px' }} disabled={isRunning} />
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: '4px' }}>
                ({Math.round(enemyDamageMult * 100)}%)
              </span>
            </div>
            <div>
              <label style={{ ...STYLES.label, fontSize: '0.7rem' }}>시작 HP 배율</label>
              <input type="number" min={0.3} max={1.5} step={0.1} value={startingHpMult}
                onChange={e => setStartingHpMult(Math.min(1.5, Math.max(0.3, parseFloat(e.target.value) || 1)))}
                style={{ ...STYLES.input, width: '80px' }} disabled={isRunning} />
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: '4px' }}>
                ({Math.round(startingHpMult * 100)}%)
              </span>
            </div>
            <div>
              <label style={{ ...STYLES.label, fontSize: '0.7rem' }}>휴식 회복 배율</label>
              <input type="number" min={0.2} max={1.5} step={0.1} value={restHealMult}
                onChange={e => setRestHealMult(Math.min(1.5, Math.max(0.2, parseFloat(e.target.value) || 1)))}
                style={{ ...STYLES.input, width: '80px' }} disabled={isRunning} />
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: '4px' }}>
                ({Math.round(restHealMult * 100)}%)
              </span>
            </div>
            <div>
              <label style={{ ...STYLES.label, fontSize: '0.7rem' }}>골드 획득 배율</label>
              <input type="number" min={0.3} max={2} step={0.1} value={goldMult}
                onChange={e => setGoldMult(Math.min(2, Math.max(0.3, parseFloat(e.target.value) || 1)))}
                style={{ ...STYLES.input, width: '80px' }} disabled={isRunning} />
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: '4px' }}>
                ({Math.round(goldMult * 100)}%)
              </span>
            </div>
            <div>
              <label style={{ ...STYLES.label, fontSize: '0.7rem' }}>상점 가격 배율</label>
              <input type="number" min={0.5} max={3} step={0.1} value={shopPriceMult}
                onChange={e => setShopPriceMult(Math.min(3, Math.max(0.5, parseFloat(e.target.value) || 1)))}
                style={{ ...STYLES.input, width: '80px' }} disabled={isRunning} />
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: '4px' }}>
                ({Math.round(shopPriceMult * 100)}%)
              </span>
            </div>
            <div>
              <label style={{ ...STYLES.label, fontSize: '0.7rem' }}>적 속도 보너스</label>
              <input type="number" min={0} max={10} step={1} value={enemySpeedBonus}
                onChange={e => setEnemySpeedBonus(Math.min(10, Math.max(0, parseInt(e.target.value) || 0)))}
                style={{ ...STYLES.input, width: '80px' }} disabled={isRunning} />
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: '4px' }}>
                +{enemySpeedBonus}
              </span>
            </div>
            <div>
              <label style={{ ...STYLES.label, fontSize: '0.7rem' }}>시작 저주카드</label>
              <input type="number" min={0} max={5} step={1} value={startingCurseCards}
                onChange={e => setStartingCurseCards(Math.min(5, Math.max(0, parseInt(e.target.value) || 0)))}
                style={{ ...STYLES.input, width: '80px' }} disabled={isRunning} />
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: '4px' }}>
                {startingCurseCards}장
              </span>
            </div>
          </div>
        )}

        <button onClick={runSimulation} style={isRunning ? STYLES.buttonRunning : STYLES.button} disabled={isRunning}>
          {isRunning
            ? `${currentStrategy ? STRATEGY_LABELS[currentStrategy] : ''} 전략 시뮬레이션 중... ${progress}%`
            : '시뮬레이션 실행 (3가지 전략)'}
        </button>
        {isRunning && <div style={STYLES.progressBar}><div style={{ ...STYLES.progressFill, width: `${progress}%` }} /></div>}
      </div>

      {/* 결과 통계 */}
      {hasAnyStats && (
        <>
          {/* 전략 탭 */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            {ALL_STRATEGIES.map(strategy => {
              const strategyStats = statsByStrategy[strategy];
              const isActive = activeStrategyTab === strategy;
              const winRate = strategyStats ? (strategyStats.runStats.successRate * 100).toFixed(1) : '-';
              return (
                <button
                  key={strategy}
                  onClick={() => setActiveStrategyTab(strategy)}
                  style={{
                    padding: '8px 16px',
                    background: isActive ? '#3b82f6' : '#1e293b',
                    border: isActive ? '2px solid #60a5fa' : '1px solid #334155',
                    borderRadius: '8px',
                    color: isActive ? '#fff' : '#cbd5e1',
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 'bold' : 'normal',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div>{STRATEGY_LABELS[strategy]}</div>
                  <div style={{ fontSize: '0.7rem', color: isActive ? '#bfdbfe' : '#64748b' }}>
                    승률: {winRate}%
                  </div>
                </button>
              );
            })}
            <div style={{ flex: 1 }} />
            <button
              onClick={copyForAI}
              style={{
                padding: '8px 16px',
                background: copyStatus === 'copied' ? '#22c55e' : copyStatus === 'error' ? '#ef4444' : '#8b5cf6',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background 0.2s',
                alignSelf: 'center',
              }}
            >
              {copyStatus === 'copied' ? '✓ 복사됨!' : copyStatus === 'error' ? '✗ 실패' : '📋 AI 공유용 복사 (3전략)'}
            </button>
          </div>

          {/* 통계 탭 네비게이션 */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {statTabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveStatTab(tab.id)}
                style={activeStatTab === tab.id ? STYLES.tabButtonActive : STYLES.tabButton}>
                {tab.label}
              </button>
            ))}
          </div>

          {stats ? (
          <div style={STYLES.sectionBox}>
            {/* 런 통계 */}
            {activeStatTab === 'run' && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#22c55e' }}>📊 {STRATEGY_LABELS[activeStrategyTab]} 전략 런 통계</h4>
                <div style={STYLES.statsGrid}>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>총 런</div><div style={STYLES.statValue}>{stats.runStats.totalRuns ?? 0}회</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>성공률</div><div style={STYLES.statValue}>{((stats.runStats.successRate ?? 0) * 100).toFixed(1)}%</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>평균 도달 층</div><div style={STYLES.statValue}>{(stats.runStats.avgLayerReached ?? 0).toFixed(1)}</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>평균 전투 승리</div><div style={STYLES.statValue}>{(stats.runStats.avgBattlesWon ?? 0).toFixed(1)}</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>평균 골드 획득</div><div style={STYLES.statValue}>{(stats.runStats.avgGoldEarned ?? 0).toFixed(0)}G</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>평균 덱 크기</div><div style={STYLES.statValue}>{(stats.runStats.avgFinalDeckSize ?? 0).toFixed(1)}장</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>평균 상징 수</div><div style={STYLES.statValue}>{(stats.runStats.avgFinalRelicCount ?? 0).toFixed(1)}개</div></div>
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

            {/* 카드 승급 통계 */}
            {activeStatTab === 'upgrade' && stats.upgradeStats && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#f59e0b' }}>⬆️ 카드 승급 통계</h4>
                <div style={STYLES.statsGrid}>
                  <div style={STYLES.statItem}>
                    <div style={STYLES.statLabel}>총 승급</div>
                    <div style={STYLES.statValue}>{stats.upgradeStats.totalUpgrades}회</div>
                  </div>
                  <div style={STYLES.statItem}>
                    <div style={STYLES.statLabel}>런당 평균</div>
                    <div style={STYLES.statValue}>{(stats.upgradeStats.avgUpgradesPerRun ?? 0).toFixed(1)}회</div>
                  </div>
                </div>
                {Object.keys(stats.upgradeStats.upgradesByCard || {}).length > 0 && (
                  <>
                    <h5 style={{ margin: '16px 0 8px 0', color: '#cbd5e1' }}>승급된 카드</h5>
                    <div style={STYLES.scrollBox}>
                      <table style={STYLES.table}>
                        <thead><tr><th style={STYLES.th}>카드</th><th style={STYLES.th}>효과</th><th style={STYLES.th}>승급</th></tr></thead>
                        <tbody>
                          {Object.entries(stats.upgradeStats.upgradesByCard || {})
                            .sort((a, b) => b[1] - a[1])
                            .map(([id, count]) => (
                              <tr key={id}>
                                <td style={STYLES.td}>{getCardName(id)}</td>
                                <td style={{...STYLES.td, fontSize: '0.75rem', color: '#94a3b8'}}>{getCardEffectStr(id)}</td>
                                <td style={STYLES.td}>{count}회</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}

            {/* 성장 통계 */}
            {activeStatTab === 'growth' && stats.growthStats && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#14b8a6' }}>📈 성장 통계</h4>
                <div style={STYLES.statsGrid}>
                  <div style={STYLES.statItem}>
                    <div style={STYLES.statLabel}>총 투자</div>
                    <div style={STYLES.statValue}>{stats.growthStats.totalInvestments ?? 0}회</div>
                  </div>
                  <div style={STYLES.statItem}>
                    <div style={STYLES.statLabel}>런당 평균</div>
                    <div style={STYLES.statValue}>{(stats.growthStats.avgInvestmentsPerRun ?? 0).toFixed(1)}회</div>
                  </div>
                </div>

                {/* 스탯별 투자 */}
                {Object.keys(stats.growthStats.statInvestments || {}).length > 0 && (
                  <>
                    <h5 style={{ margin: '16px 0 8px 0', color: '#cbd5e1' }}>스탯별 투자</h5>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {Object.entries(stats.growthStats.statInvestments || {})
                        .sort((a, b) => b[1] - a[1])
                        .map(([stat, count]) => (
                          <div key={stat} style={{ padding: '6px 10px', background: '#1e293b', borderRadius: '6px', fontSize: '0.8rem' }}>
                            <span style={{ color: '#94a3b8' }}>{stat}: </span>
                            <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{count}회</span>
                          </div>
                        ))}
                    </div>
                  </>
                )}

                {/* 스탯별 승률 기여도 */}
                {Object.keys(stats.growthStats.statWinCorrelation || {}).length > 0 && (
                  <>
                    <h5 style={{ margin: '16px 0 8px 0', color: '#cbd5e1' }}>스탯별 승률 기여도</h5>
                    <div style={STYLES.scrollBox}>
                      <table style={STYLES.table}>
                        <thead><tr><th style={STYLES.th}>스탯</th><th style={STYLES.th}>기여도</th><th style={STYLES.th}>바</th></tr></thead>
                        <tbody>
                          {Object.entries(stats.growthStats.statWinCorrelation || {})
                            .sort((a, b) => (b[1] as number) - (a[1] as number))
                            .map(([stat, corr]) => {
                              const corrValue = corr as number;
                              return (
                                <tr key={stat}>
                                  <td style={STYLES.td}>{stat}</td>
                                  <td style={{...STYLES.td, color: corrValue > 0 ? '#22c55e' : corrValue < 0 ? '#ef4444' : '#94a3b8'}}>
                                    {corrValue > 0 ? '+' : ''}{(corrValue * 100).toFixed(1)}%
                                  </td>
                                  <td style={STYLES.td}>
                                    <div style={{ width: '80px', height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                                      <div style={{ width: `${Math.abs(corrValue) * 100}%`, height: '100%', background: corrValue > 0 ? '#22c55e' : '#ef4444' }} />
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

                {/* 성장 경로별 승률 */}
                {stats.growthStats.growthPathStats && stats.growthStats.growthPathStats.length > 0 && (
                  <>
                    <h5 style={{ margin: '16px 0 8px 0', color: '#cbd5e1' }}>성장 경로별 승률</h5>
                    <div style={STYLES.scrollBox}>
                      <table style={STYLES.table}>
                        <thead><tr><th style={STYLES.th}>경로</th><th style={STYLES.th}>횟수</th><th style={STYLES.th}>승률</th><th style={STYLES.th}>평균레벨</th></tr></thead>
                        <tbody>
                          {stats.growthStats.growthPathStats.slice(0, 10).map((path, i) => (
                            <tr key={i}>
                              <td style={STYLES.td}>{path.path}</td>
                              <td style={STYLES.td}>{path.count}회</td>
                              <td style={{...STYLES.td, color: path.winRate > 0.5 ? '#22c55e' : path.winRate > 0.3 ? '#fbbf24' : '#ef4444'}}>
                                {(path.winRate * 100).toFixed(1)}%
                              </td>
                              <td style={STYLES.td}>{path.avgFinalLevel.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* 최종 스탯 분포 */}
                {Object.keys(stats.growthStats.finalStatDistribution || {}).length > 0 && (
                  <>
                    <h5 style={{ margin: '16px 0 8px 0', color: '#cbd5e1' }}>최종 스탯 분포</h5>
                    <div style={STYLES.scrollBox}>
                      <table style={STYLES.table}>
                        <thead><tr><th style={STYLES.th}>스탯</th><th style={STYLES.th}>평균</th><th style={STYLES.th}>최대</th></tr></thead>
                        <tbody>
                          {Object.entries(stats.growthStats.finalStatDistribution || {}).map(([stat, data]) => (
                            <tr key={stat}>
                              <td style={STYLES.td}>{stat}</td>
                              <td style={STYLES.td}>{data.avg.toFixed(1)}</td>
                              <td style={{...STYLES.td, color: '#fbbf24'}}>{data.max}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* 로고스 효과 발동 */}
                {Object.keys(stats.growthStats.logosActivations || {}).length > 0 && (
                  <>
                    <h5 style={{ margin: '16px 0 8px 0', color: '#cbd5e1' }}>로고스 효과 발동</h5>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {Object.entries(stats.growthStats.logosActivations || {})
                        .sort((a, b) => b[1] - a[1])
                        .map(([effect, count]) => (
                          <div key={effect} style={{ padding: '6px 10px', background: '#1e293b', borderRadius: '6px', fontSize: '0.8rem' }}>
                            <span style={{ color: '#94a3b8' }}>{effect}: </span>
                            <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>{count}회</span>
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* AI 전략 통계 */}
            {activeStatTab === 'aiStrategy' && stats.aiStrategyStats && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#6366f1' }}>🤖 AI 전략 통계</h4>
                {Object.keys(stats.aiStrategyStats.strategyUsage || {}).length > 0 && (
                  <>
                    <div style={STYLES.scrollBox}>
                      <table style={STYLES.table}>
                        <thead><tr><th style={STYLES.th}>전략</th><th style={STYLES.th}>사용</th><th style={STYLES.th}>승률</th><th style={STYLES.th}>평균턴</th></tr></thead>
                        <tbody>
                          {Object.entries(stats.aiStrategyStats.strategyUsage || {}).map(([strat, usage]) => {
                            const winRate = stats.aiStrategyStats.strategyWinRate[strat] || 0;
                            const avgTurns = stats.aiStrategyStats.strategyAvgTurns[strat] || 0;
                            return (
                              <tr key={strat}>
                                <td style={STYLES.td}>{strat}</td>
                                <td style={STYLES.td}>{usage}회</td>
                                <td style={{...STYLES.td, color: winRate > 0.5 ? '#22c55e' : winRate > 0.3 ? '#fbbf24' : '#ef4444'}}>
                                  {(winRate * 100).toFixed(1)}%
                                </td>
                                <td style={STYLES.td}>{avgTurns.toFixed(1)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* 콤보 발동 */}
                {Object.keys(stats.aiStrategyStats.comboTypeUsage || {}).length > 0 && (
                  <>
                    <h5 style={{ margin: '16px 0 8px 0', color: '#cbd5e1' }}>콤보 발동</h5>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {Object.entries(stats.aiStrategyStats.comboTypeUsage || {})
                        .sort((a, b) => b[1] - a[1])
                        .map(([combo, count]) => (
                          <div key={combo} style={{ padding: '6px 10px', background: '#1e293b', borderRadius: '6px', fontSize: '0.8rem' }}>
                            <span style={{ color: '#94a3b8' }}>{combo}: </span>
                            <span style={{ color: '#6366f1', fontWeight: 'bold' }}>{count}회</span>
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* 난이도별 통계 */}
            {activeStatTab === 'difficulty' && stats.difficultyStats && stats.difficultyStats.size > 0 && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#f43f5e' }}>🔥 난이도별 통계</h4>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '12px' }}>
                  Hades Heat 스타일 난이도 진행
                </p>
                <div style={STYLES.scrollBox}>
                  <table style={STYLES.table}>
                    <thead><tr><th style={STYLES.th}>난이도</th><th style={STYLES.th}>런</th><th style={STYLES.th}>승리</th><th style={STYLES.th}>승률</th><th style={STYLES.th}>평균층</th><th style={STYLES.th}>연승</th></tr></thead>
                    <tbody>
                      {Array.from(stats.difficultyStats.entries())
                        .sort((a, b) => a[0] - b[0])
                        .map(([diff, d]) => (
                          <tr key={diff}>
                            <td style={{...STYLES.td, fontWeight: 'bold', color: '#f43f5e'}}>🔥{diff}</td>
                            <td style={STYLES.td}>{d.runs}회</td>
                            <td style={STYLES.td}>{d.wins}회</td>
                            <td style={{...STYLES.td, color: d.winRate > 0.5 ? '#22c55e' : d.winRate > 0.3 ? '#fbbf24' : '#ef4444'}}>
                              {(d.winRate * 100).toFixed(1)}%
                            </td>
                            <td style={STYLES.td}>{d.avgFloorReached.toFixed(1)}</td>
                            <td style={STYLES.td}>{d.winStreak}연승</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* 카드 선택 분석 */}
            {activeStatTab === 'cardChoice' && stats.allCardChoices && stats.allCardChoices.length > 0 && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#0ea5e9' }}>🎯 카드 선택 분석</h4>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '12px' }}>
                  Slay the Spire 스타일 카드 경쟁 분석 - 어떤 카드가 어떤 카드를 이겼는지
                </p>
                {(() => {
                  const cardWinContext: Record<string, { picked: number; total: number; competitors: Record<string, number> }> = {};
                  stats.allCardChoices.forEach(choice => {
                    if (choice.pickedCardId) {
                      if (!cardWinContext[choice.pickedCardId]) {
                        cardWinContext[choice.pickedCardId] = { picked: 0, total: 0, competitors: {} };
                      }
                      cardWinContext[choice.pickedCardId].picked++;
                      cardWinContext[choice.pickedCardId].total++;
                      choice.notPickedCardIds.forEach(notPicked => {
                        cardWinContext[choice.pickedCardId].competitors[notPicked] =
                          (cardWinContext[choice.pickedCardId].competitors[notPicked] || 0) + 1;
                      });
                    }
                    choice.notPickedCardIds.forEach(notPicked => {
                      if (!cardWinContext[notPicked]) {
                        cardWinContext[notPicked] = { picked: 0, total: 0, competitors: {} };
                      }
                      cardWinContext[notPicked].total++;
                    });
                  });

                  return (
                    <div style={STYLES.scrollBox}>
                      <table style={STYLES.table}>
                        <thead><tr><th style={STYLES.th}>카드</th><th style={STYLES.th}>제시</th><th style={STYLES.th}>선택</th><th style={STYLES.th}>선택률</th><th style={STYLES.th}>주요 경쟁카드</th></tr></thead>
                        <tbody>
                          {Object.entries(cardWinContext)
                            .filter(([, data]) => data.total >= 3)
                            .sort((a, b) => (b[1].picked / b[1].total) - (a[1].picked / a[1].total))
                            .slice(0, 20)
                            .map(([cardId, data]) => {
                              const topCompetitors = Object.entries(data.competitors)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 2)
                                .map(([id]) => getCardName(id))
                                .join(', ') || '-';
                              const selectRate = data.picked / data.total;
                              return (
                                <tr key={cardId}>
                                  <td style={STYLES.td}>{getCardName(cardId)}</td>
                                  <td style={STYLES.td}>{data.total}회</td>
                                  <td style={STYLES.td}>{data.picked}회</td>
                                  <td style={{...STYLES.td, color: selectRate > 0.5 ? '#22c55e' : selectRate > 0.25 ? '#fbbf24' : '#ef4444'}}>
                                    {(selectRate * 100).toFixed(1)}%
                                  </td>
                                  <td style={{...STYLES.td, fontSize: '0.75rem', color: '#94a3b8'}}>{topCompetitors}</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </>
            )}

            {/* 최근 런 진행 요약 */}
            {activeStatTab === 'recentRuns' && stats.recentRunProgressions && stats.recentRunProgressions.length > 0 && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#a855f7' }}>🛤️ 최근 런 진행 요약</h4>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '12px' }}>
                  최근 런들의 경로, 덱, 전투 피해 요약
                </p>
                <div style={STYLES.scrollBox}>
                  {stats.recentRunProgressions.slice(0, 5).map((run, i) => (
                    <div key={i} style={{ marginBottom: '16px', padding: '12px', background: '#1e293b', borderRadius: '8px' }}>
                      <h5 style={{ margin: '0 0 8px 0', color: '#fbbf24' }}>런 #{i + 1}</h5>
                      <div style={{ fontSize: '0.875rem', color: '#e2e8f0', marginBottom: '8px' }}>
                        <strong>경로:</strong> {run.pathTaken.join(' → ')}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#e2e8f0', marginBottom: '8px' }}>
                        <strong>최종 덱 ({run.finalDeck.length}장):</strong>{' '}
                        <span style={{ color: '#94a3b8' }}>{run.finalDeck.map(getCardName).join(', ')}</span>
                      </div>
                      {run.finalRelics.length > 0 && (
                        <div style={{ fontSize: '0.875rem', color: '#e2e8f0', marginBottom: '8px' }}>
                          <strong>최종 상징:</strong>{' '}
                          <span style={{ color: '#fbbf24' }}>{run.finalRelics.map(getRelicName).join(', ')}</span>
                        </div>
                      )}
                      {run.damagePerBattle.length > 0 && (
                        <div style={{ fontSize: '0.875rem', color: '#e2e8f0' }}>
                          <strong>전투 피해:</strong>{' '}
                          총 {run.damagePerBattle.reduce((sum, b) => sum + b.damage, 0)},
                          평균 {(run.damagePerBattle.reduce((sum, b) => sum + b.damage, 0) / run.damagePerBattle.length).toFixed(1)}/전투
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* 분석 리포트 */}
            {activeStatTab === 'analysis' && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#f97316' }}>🔍 AI 분석 리포트</h4>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '12px' }}>
                  통계 기반 자동 분석 - 문제점, 원인, 개선 방향 제시
                </p>
                {(() => {
                  const analysis = analyzeStats(stats);
                  return (
                    <>
                      {/* 요약 */}
                      <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px', marginBottom: '16px' }}>
                        <h5 style={{ margin: '0 0 8px 0', color: '#fbbf24' }}>📊 요약</h5>
                        <div style={{ fontSize: '0.875rem', color: '#e2e8f0' }}>{analysis.summary}</div>
                      </div>

                      {/* 문제점 */}
                      {analysis.problems.length > 0 && (
                        <>
                          <h5 style={{ margin: '0 0 8px 0', color: '#ef4444' }}>⚠️ 문제점 ({analysis.problems.length}개)</h5>
                          <div style={STYLES.scrollBox}>
                            {analysis.problems.map((problem, i) => (
                              <div key={i} style={{ padding: '10px', background: '#1e293b', borderRadius: '6px', marginBottom: '8px', borderLeft: `4px solid ${problem.severity >= 4 ? '#ef4444' : problem.severity >= 3 ? '#f59e0b' : '#3b82f6'}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>{problem.category}</span>
                                  <span style={{ fontSize: '0.75rem', color: problem.severity >= 4 ? '#ef4444' : '#fbbf24' }}>심각도 {problem.severity}/5</span>
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#e2e8f0' }}>{problem.description}</div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* 원인 분석 */}
                      {analysis.rootCauses.length > 0 && (
                        <>
                          <h5 style={{ margin: '16px 0 8px 0', color: '#8b5cf6' }}>🔬 원인 분석</h5>
                          <div style={STYLES.scrollBox}>
                            {analysis.rootCauses.map((cause, i) => (
                              <div key={i} style={{ padding: '10px', background: '#1e293b', borderRadius: '6px', marginBottom: '8px' }}>
                                <div style={{ fontSize: '0.75rem', color: '#8b5cf6', marginBottom: '4px' }}>{cause.type}</div>
                                <div style={{ fontSize: '0.875rem', color: '#e2e8f0' }}>{cause.description}</div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* 개선 권장사항 */}
                      {analysis.recommendations.length > 0 && (
                        <>
                          <h5 style={{ margin: '16px 0 8px 0', color: '#22c55e' }}>💡 개선 권장사항</h5>
                          <div style={STYLES.scrollBox}>
                            {analysis.recommendations.map((rec, i) => (
                              <div key={i} style={{ padding: '10px', background: '#1e293b', borderRadius: '6px', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                  <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#fbbf24' }}>{rec.target}</span>
                                  <span style={{ fontSize: '0.75rem', color: '#22c55e' }}>우선순위 {rec.priority}</span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>[{rec.type}]</div>
                                <div style={{ fontSize: '0.875rem', color: '#e2e8f0', marginBottom: '4px' }}>{rec.suggestion}</div>
                                <div style={{ fontSize: '0.8rem', color: '#06b6d4' }}>→ {rec.expectedImpact}</div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* 추가 조사 필요 */}
                      {analysis.needsInvestigation.length > 0 && (
                        <>
                          <h5 style={{ margin: '16px 0 8px 0', color: '#f59e0b' }}>🔎 추가 조사 필요</h5>
                          <div style={{ padding: '10px', background: '#1e293b', borderRadius: '6px' }}>
                            {analysis.needsInvestigation.map((item, i) => (
                              <div key={i} style={{ fontSize: '0.875rem', color: '#e2e8f0', marginBottom: '4px' }}>• {item}</div>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </>
            )}

            {/* 밸런스 인사이트 */}
            {activeStatTab === 'insights' && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#10b981' }}>⚖️ 밸런스 인사이트</h4>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '12px' }}>
                  액션 가능한 밸런스 권장사항, 병목 구간 분석, 필수픽 감지, 다양성 지표
                </p>
                {(() => {
                  const analyzer = new BalanceInsightAnalyzer(stats);
                  const report = analyzer.generateReport();
                  return (
                    <>
                      {/* 요약 카드 */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>건강도 점수</div>
                          <div style={{
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            color: report.summary.healthScore >= 70 ? '#22c55e' : report.summary.healthScore >= 40 ? '#f59e0b' : '#ef4444'
                          }}>
                            {report.summary.healthScore}/100
                          </div>
                        </div>
                        <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>긴급 이슈</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>
                            {report.summary.criticalIssues}개
                          </div>
                        </div>
                        <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>주의 이슈</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
                            {report.summary.warningIssues}개
                          </div>
                        </div>
                        <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>난이도 평가</div>
                          <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#3b82f6' }}>
                            {report.playerExperience.overallDifficulty === 'balanced' ? '균형' :
                             report.playerExperience.overallDifficulty === 'too_easy' ? '너무 쉬움' :
                             report.playerExperience.overallDifficulty === 'easy' ? '쉬움' :
                             report.playerExperience.overallDifficulty === 'hard' ? '어려움' : '매우 어려움'}
                          </div>
                        </div>
                      </div>

                      {/* 최우선 과제 */}
                      {report.summary.topPriorities.length > 0 && (
                        <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px', marginBottom: '16px' }}>
                          <h5 style={{ margin: '0 0 8px 0', color: '#fbbf24' }}>🎯 최우선 과제</h5>
                          {report.summary.topPriorities.map((p, i) => (
                            <div key={i} style={{ fontSize: '0.875rem', color: '#e2e8f0', marginBottom: '4px' }}>
                              {i + 1}. {p}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 긴급 조치 필요 (critical) */}
                      {report.recommendations.filter(r => r.priority === 'critical').length > 0 && (
                        <>
                          <h5 style={{ margin: '0 0 8px 0', color: '#ef4444' }}>🔴 긴급 조치 필요</h5>
                          <div style={STYLES.scrollBox}>
                            {report.recommendations.filter(r => r.priority === 'critical').map((rec, i) => (
                              <div key={i} style={{ padding: '10px', background: '#1e293b', borderRadius: '6px', marginBottom: '8px', borderLeft: '4px solid #ef4444' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                  <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#fbbf24' }}>{rec.targetName}</span>
                                  <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#dc2626', borderRadius: '4px', color: '#fff' }}>{rec.targetType}</span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#f87171', marginBottom: '4px' }}>{rec.issue}</div>
                                <div style={{ fontSize: '0.875rem', color: '#e2e8f0', marginBottom: '4px' }}>💡 {rec.suggestion}</div>
                                {rec.estimatedImpact && (
                                  <div style={{ fontSize: '0.75rem', color: '#06b6d4' }}>
                                    예상 영향: 승률 {rec.estimatedImpact > 0 ? '+' : ''}{(rec.estimatedImpact * 100).toFixed(1)}%
                                  </div>
                                )}
                                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                                  신뢰도: {(rec.confidence * 100).toFixed(0)}%
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* 주의 필요 (warning) */}
                      {report.recommendations.filter(r => r.priority === 'warning').length > 0 && (
                        <>
                          <h5 style={{ margin: '16px 0 8px 0', color: '#f59e0b' }}>🟡 주의 필요</h5>
                          <div style={STYLES.scrollBox}>
                            {report.recommendations.filter(r => r.priority === 'warning').slice(0, 8).map((rec, i) => (
                              <div key={i} style={{ padding: '8px', background: '#1e293b', borderRadius: '6px', marginBottom: '6px', borderLeft: '3px solid #f59e0b' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fbbf24' }}>{rec.targetName}</span>
                                  <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{rec.issueType}</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>{rec.issue} → {rec.suggestion}</div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* 필수픽 경고 */}
                      {report.mustPicks.length > 0 && (
                        <>
                          <h5 style={{ margin: '16px 0 8px 0', color: '#ec4899' }}>⚠️ 필수픽 감지</h5>
                          <div style={STYLES.scrollBox}>
                            {report.mustPicks.map((mp, i) => (
                              <div key={i} style={{ padding: '10px', background: '#1e293b', borderRadius: '6px', marginBottom: '8px', borderLeft: `4px solid ${mp.riskLevel === 'extreme' ? '#ef4444' : mp.riskLevel === 'high' ? '#f59e0b' : '#fbbf24'}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                  <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#f472b6' }}>{mp.targetName}</span>
                                  <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: mp.riskLevel === 'extreme' ? '#dc2626' : '#d97706', borderRadius: '4px', color: '#fff' }}>
                                    {mp.riskLevel === 'extreme' ? '극심' : mp.riskLevel === 'high' ? '높음' : '보통'}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#e2e8f0', marginBottom: '4px' }}>
                                  보유 승률 <span style={{ color: '#22c55e' }}>{(mp.winRateWith * 100).toFixed(1)}%</span> vs 미보유 <span style={{ color: '#ef4444' }}>{(mp.winRateWithout * 100).toFixed(1)}%</span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 'bold' }}>
                                  기여도 차이: +{(mp.contributionGap * 100).toFixed(1)}%
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* 병목 구간 */}
                      {report.bottlenecks.length > 0 && (
                        <>
                          <h5 style={{ margin: '16px 0 8px 0', color: '#a855f7' }}>🚧 병목 구간</h5>
                          <div style={STYLES.scrollBox}>
                            {report.bottlenecks.slice(0, 5).map((bn, i) => (
                              <div key={i} style={{ padding: '10px', background: '#1e293b', borderRadius: '6px', marginBottom: '8px', borderLeft: `4px solid ${bn.severity === 'critical' ? '#ef4444' : bn.severity === 'high' ? '#f59e0b' : '#8b5cf6'}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                  <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#c084fc' }}>{bn.floor}층</span>
                                  <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                                    사망률 {(bn.deathRate * 100).toFixed(1)}% (평균의 {bn.deathRateMultiplier.toFixed(1)}배)
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#e2e8f0', marginBottom: '4px' }}>
                                  주요 원인: <span style={{ color: '#f59e0b' }}>{bn.primaryCause.enemyName}</span> ({(bn.primaryCause.deathContribution * 100).toFixed(0)}%)
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{bn.causeAnalysis}</div>
                                <div style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: '4px' }}>
                                  제안: {bn.suggestions[0]}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* 다양성 지표 */}
                      <h5 style={{ margin: '16px 0 8px 0', color: '#06b6d4' }}>📊 다양성 지표</h5>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>카드 다양성</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>Gini 계수</span>
                            <span style={{
                              fontSize: '0.8rem',
                              fontWeight: 'bold',
                              color: report.diversity.card.giniCoefficient < 0.4 ? '#22c55e' : report.diversity.card.giniCoefficient < 0.6 ? '#f59e0b' : '#ef4444'
                            }}>
                              {report.diversity.card.giniCoefficient.toFixed(3)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>상위 10% 점유율</span>
                            <span style={{ fontSize: '0.8rem', color: '#fbbf24' }}>{(report.diversity.card.top10PercentShare * 100).toFixed(1)}%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>미사용 카드</span>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{report.diversity.card.unusedCount}개</span>
                          </div>
                          <div style={{
                            marginTop: '8px',
                            padding: '4px 8px',
                            background: report.diversity.card.healthRating === 'healthy' ? 'rgba(34, 197, 94, 0.2)' : report.diversity.card.healthRating === 'imbalanced' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            borderRadius: '4px',
                            textAlign: 'center',
                            fontSize: '0.75rem',
                            color: report.diversity.card.healthRating === 'healthy' ? '#22c55e' : report.diversity.card.healthRating === 'imbalanced' ? '#f59e0b' : '#ef4444'
                          }}>
                            {report.diversity.card.healthRating === 'healthy' ? '✅ 건강' : report.diversity.card.healthRating === 'imbalanced' ? '⚠️ 불균형' : '🔴 심각'}
                          </div>
                        </div>
                        <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>상징 다양성</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>Gini 계수</span>
                            <span style={{
                              fontSize: '0.8rem',
                              fontWeight: 'bold',
                              color: report.diversity.relic.giniCoefficient < 0.4 ? '#22c55e' : report.diversity.relic.giniCoefficient < 0.6 ? '#f59e0b' : '#ef4444'
                            }}>
                              {report.diversity.relic.giniCoefficient.toFixed(3)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>상위 10% 점유율</span>
                            <span style={{ fontSize: '0.8rem', color: '#fbbf24' }}>{(report.diversity.relic.top10PercentShare * 100).toFixed(1)}%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>미사용 상징</span>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{report.diversity.relic.unusedCount}개</span>
                          </div>
                          <div style={{
                            marginTop: '8px',
                            padding: '4px 8px',
                            background: report.diversity.relic.healthRating === 'healthy' ? 'rgba(34, 197, 94, 0.2)' : report.diversity.relic.healthRating === 'imbalanced' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            borderRadius: '4px',
                            textAlign: 'center',
                            fontSize: '0.75rem',
                            color: report.diversity.relic.healthRating === 'healthy' ? '#22c55e' : report.diversity.relic.healthRating === 'imbalanced' ? '#f59e0b' : '#ef4444'
                          }}>
                            {report.diversity.relic.healthRating === 'healthy' ? '✅ 건강' : report.diversity.relic.healthRating === 'imbalanced' ? '⚠️ 불균형' : '🔴 심각'}
                          </div>
                        </div>
                      </div>

                      {/* 메타 티어 */}
                      {report.diversity.card.tierDistribution.filter(t => t.cards.length > 0).length > 0 && (
                        <>
                          <h5 style={{ margin: '0 0 8px 0', color: '#fbbf24' }}>🏆 메타 티어</h5>
                          <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px', marginBottom: '16px' }}>
                            {report.diversity.card.tierDistribution.filter(t => t.cards.length > 0).map((tier, i) => (
                              <div key={i} style={{ marginBottom: '8px' }}>
                                <span style={{
                                  display: 'inline-block',
                                  width: '32px',
                                  fontWeight: 'bold',
                                  color: tier.tier === 'S' ? '#ef4444' : tier.tier === 'A' ? '#f59e0b' : tier.tier === 'B' ? '#22c55e' : tier.tier === 'C' ? '#3b82f6' : '#64748b'
                                }}>
                                  {tier.tier}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>
                                  {tier.cards.slice(0, 6).join(', ')}{tier.cards.length > 6 ? ` 외 ${tier.cards.length - 6}개` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* 플레이어 경험 예측 */}
                      <h5 style={{ margin: '0 0 8px 0', color: '#8b5cf6' }}>🎮 플레이어 경험 예측</h5>
                      <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>난이도 점수</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#8b5cf6' }}>{report.playerExperience.difficultyScore}/10</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>신규 이탈률</div>
                            <div style={{
                              fontSize: '1.25rem',
                              fontWeight: 'bold',
                              color: report.playerExperience.newPlayerDropoutRate > 0.5 ? '#ef4444' : '#22c55e'
                            }}>
                              {(report.playerExperience.newPlayerDropoutRate * 100).toFixed(0)}%
                            </div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>숙련자 만족도</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#22c55e' }}>
                              {report.playerExperience.veteranSatisfactionScore}/10
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#e2e8f0', padding: '8px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '6px' }}>
                          {report.playerExperience.overallAssessment}
                        </div>
                        {report.playerExperience.improvementPriorities.length > 0 && (
                          <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#22c55e' }}>
                            개선 우선순위: {report.playerExperience.improvementPriorities.join(' → ')}
                          </div>
                        )}
                      </div>

                      {/* 카드 특성(Trait) 분석 */}
                      <h5 style={{ margin: '16px 0 8px 0', color: '#a855f7' }}>🎴 카드 특성 밸런스</h5>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        {/* 특성별 통계 */}
                        <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>특성별 승률 기여도</div>
                          {report.cardTraitAnalysis.traitStats.slice(0, 6).map((trait, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>{trait.traitName} ({trait.cardCount}장)</span>
                              <span style={{
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                color: trait.rating === 'overpowered' ? '#ef4444' :
                                       trait.rating === 'balanced' ? '#22c55e' :
                                       trait.rating === 'underpowered' ? '#f59e0b' : '#64748b'
                              }}>
                                {trait.avgContribution >= 0 ? '+' : ''}{(trait.avgContribution * 100).toFixed(1)}%
                              </span>
                            </div>
                          ))}
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '8px' }}>
                            특성 다양성: {(report.cardTraitAnalysis.diversityScore * 100).toFixed(0)}%
                          </div>
                        </div>

                        {/* 특성 밸런스 경고 */}
                        <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>특성 밸런스 이슈</div>
                          {report.cardTraitAnalysis.overpoweredTraits.length > 0 && (
                            <div style={{ marginBottom: '8px' }}>
                              <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 'bold' }}>🔴 과잉 강화</div>
                              {report.cardTraitAnalysis.overpoweredTraits.slice(0, 3).map((t, i) => (
                                <div key={i} style={{ fontSize: '0.75rem', color: '#f87171' }}>{t.traitName}: +{(t.avgContribution * 100).toFixed(0)}%</div>
                              ))}
                            </div>
                          )}
                          {report.cardTraitAnalysis.underpoweredTraits.length > 0 && (
                            <div>
                              <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 'bold' }}>🟡 약한 특성</div>
                              {report.cardTraitAnalysis.underpoweredTraits.slice(0, 3).map((t, i) => (
                                <div key={i} style={{ fontSize: '0.75rem', color: '#fbbf24' }}>{t.traitName}: {(t.avgContribution * 100).toFixed(0)}%</div>
                              ))}
                            </div>
                          )}
                          {report.cardTraitAnalysis.overpoweredTraits.length === 0 && report.cardTraitAnalysis.underpoweredTraits.length === 0 && (
                            <div style={{ fontSize: '0.8rem', color: '#22c55e' }}>✓ 특성 밸런스 양호</div>
                          )}
                        </div>
                      </div>

                      {/* 성장 스탯 밸런스 */}
                      <h5 style={{ margin: '16px 0 8px 0', color: '#ec4899' }}>🧬 성장 스탯 밸런스</h5>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        {/* 스탯별 기여도 */}
                        <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>스탯별 승률 기여도</div>
                          {report.growthStatAnalysis.statContributions.slice(0, 6).map((stat, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>{stat.statName}</span>
                              <span style={{
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                color: stat.rating === 'overpowered' ? '#ef4444' :
                                       stat.rating === 'balanced' ? '#22c55e' :
                                       stat.rating === 'underpowered' ? '#f59e0b' : '#64748b'
                              }}>
                                {stat.winCorrelation >= 0 ? '+' : ''}{(stat.winCorrelation * 100).toFixed(1)}%
                              </span>
                            </div>
                          ))}
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '8px' }}>
                            다양성 점수: {(report.growthStatAnalysis.diversityScore * 100).toFixed(0)}%
                          </div>
                        </div>

                        {/* 철학 분기 밸런스 */}
                        <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>철학 분기 밸런스</div>
                          {[
                            { name: '에토스', data: report.growthStatAnalysis.philosophyBalance.ethos, color: '#3b82f6' },
                            { name: '파토스', data: report.growthStatAnalysis.philosophyBalance.pathos, color: '#ef4444' },
                            { name: '로고스', data: report.growthStatAnalysis.philosophyBalance.logos, color: '#22c55e' },
                          ].map((phil, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '0.8rem', color: phil.color, fontWeight: 'bold' }}>{phil.name}</span>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>평균 레벨: {phil.data.avgLevel.toFixed(1)}</div>
                                <div style={{ fontSize: '0.75rem', color: phil.data.winCorrelation > 0 ? '#22c55e' : '#ef4444' }}>
                                  승률: {phil.data.winCorrelation >= 0 ? '+' : ''}{(phil.data.winCorrelation * 100).toFixed(1)}%
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 필수 스탯 경고 */}
                      {report.growthStatAnalysis.mustHaveStats.length > 0 && (
                        <div style={{ padding: '10px', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '6px', marginBottom: '16px', borderLeft: '4px solid #ec4899' }}>
                          <div style={{ fontSize: '0.8rem', color: '#f472b6', fontWeight: 'bold', marginBottom: '4px' }}>⚠️ 필수 스탯 감지</div>
                          {report.growthStatAnalysis.mustHaveStats.map((stat, i) => (
                            <div key={i} style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>
                              {stat.statName}: 기여도 +{(stat.contributionGap * 100).toFixed(0)}% (보유 {(stat.winRateWith * 100).toFixed(0)}% vs 미보유 {(stat.winRateWithout * 100).toFixed(0)}%)
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 성장 경로 분석 */}
                      <h5 style={{ margin: '16px 0 8px 0', color: '#14b8a6' }}>🌱 성장 경로 분석</h5>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        {/* 최적 경로 */}
                        <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>최적 성장 경로 TOP 5</div>
                          {report.growthPaths.optimalPaths.length > 0 ? (
                            report.growthPaths.optimalPaths.map((path, i) => (
                              <div key={i} style={{ marginBottom: '8px', padding: '6px', background: 'rgba(20, 184, 166, 0.1)', borderRadius: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.75rem', color: '#5eead4', fontWeight: 'bold' }}>{i + 1}. {path.path}</span>
                                  <span style={{ fontSize: '0.75rem', color: '#22c55e' }}>{(path.winRate * 100).toFixed(0)}%</span>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{path.description}</div>
                              </div>
                            ))
                          ) : (
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>데이터 부족</div>
                          )}
                        </div>

                        {/* 위험 경로 */}
                        <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>위험 성장 경로</div>
                          {report.growthPaths.riskyPaths.length > 0 ? (
                            report.growthPaths.riskyPaths.map((path, i) => (
                              <div key={i} style={{ marginBottom: '8px', padding: '6px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.75rem', color: '#f87171' }}>{path.path}</span>
                                  <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{(path.winRate * 100).toFixed(0)}%</span>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{path.issue}</div>
                                <div style={{ fontSize: '0.7rem', color: '#22c55e' }}>💡 {path.suggestion}</div>
                              </div>
                            ))
                          ) : (
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>위험 경로 없음</div>
                          )}
                          <div style={{ marginTop: '8px', fontSize: '0.7rem', color: '#64748b' }}>
                            경로 다양성: {report.growthPaths.pathDiversity.uniquePaths}개 고유 경로,
                            Gini: {report.growthPaths.pathDiversity.giniCoefficient.toFixed(3)}
                          </div>
                        </div>
                      </div>

                      {/* 승급 밸런스 분석 */}
                      <h5 style={{ margin: '16px 0 8px 0', color: '#f59e0b' }}>⬆️ 승급 밸런스</h5>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
                        <div style={{ padding: '10px', background: '#1e293b', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>총 승급</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f59e0b' }}>{report.upgradeBalance.overall.totalUpgrades}</div>
                        </div>
                        <div style={{ padding: '10px', background: '#1e293b', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>런당 평균</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#e2e8f0' }}>{report.upgradeBalance.overall.avgUpgradesPerRun.toFixed(1)}</div>
                        </div>
                        <div style={{ padding: '10px', background: '#1e293b', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>승률 상관</div>
                          <div style={{
                            fontSize: '1.25rem',
                            fontWeight: 'bold',
                            color: report.upgradeBalance.overall.upgradeWinCorrelation > 0 ? '#22c55e' : '#ef4444'
                          }}>
                            {report.upgradeBalance.overall.upgradeWinCorrelation >= 0 ? '+' : ''}
                            {(report.upgradeBalance.overall.upgradeWinCorrelation * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div style={{ padding: '10px', background: '#1e293b', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>최적 횟수</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6' }}>{report.upgradeBalance.overall.optimalUpgradeCount}</div>
                        </div>
                      </div>

                      {/* 승급 우선순위 권장 */}
                      {report.upgradeBalance.priorityRecommendations.length > 0 && (
                        <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px', marginBottom: '12px' }}>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>🎯 승급 우선순위 권장</div>
                          {report.upgradeBalance.priorityRecommendations.map((rec, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '0.8rem', color: '#fbbf24' }}>
                                {rec.rank}. {rec.cardName}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{rec.reason}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 과다/과소 승급 경고 */}
                      {(report.upgradeBalance.overUpgraded.length > 0 || report.upgradeBalance.underUpgraded.length > 0) && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          {report.upgradeBalance.overUpgraded.length > 0 && (
                            <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', borderLeft: '3px solid #ef4444' }}>
                              <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 'bold', marginBottom: '4px' }}>⬇️ 과다 승급 (비효율)</div>
                              {report.upgradeBalance.overUpgraded.slice(0, 3).map((card, i) => (
                                <div key={i} style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>
                                  {card.cardName} ({card.upgradeCount}회) - {card.suggestion}
                                </div>
                              ))}
                            </div>
                          )}
                          {report.upgradeBalance.underUpgraded.length > 0 && (
                            <div style={{ padding: '10px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '6px', borderLeft: '3px solid #22c55e' }}>
                              <div style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 'bold', marginBottom: '4px' }}>⬆️ 과소 승급 (기회손실)</div>
                              {report.upgradeBalance.underUpgraded.slice(0, 3).map((card, i) => (
                                <div key={i} style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>
                                  {card.cardName} ({card.upgradeCount}회) - {card.suggestion}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}

            {/* 자동 튜닝 */}
            {activeStatTab === 'autoTune' && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#f97316' }}>🔧 자동 밸런스 튜닝</h4>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '12px' }}>
                  시뮬레이션 결과를 분석하여 구체적인 수치 조정 제안 및 A/B 테스트 자동화
                </p>
                {(() => {
                  // 동적 import를 피하고 간단한 분석 표시
                  const baseWinRate = stats.runStats.successRate;
                  const targetWinRate = 0.5;
                  const gapPercent = ((baseWinRate - targetWinRate) * 100).toFixed(1);
                  const isBalanced = Math.abs(baseWinRate - targetWinRate) < 0.05;

                  // 간단한 카드 분석
                  const cardAnalysis: Array<{
                    id: string;
                    name: string;
                    pickRate: number;
                    contribution: number;
                    suggestion: string;
                    type: 'nerf' | 'buff';
                  }> = [];

                  if (stats.cardDeepStats && stats.cardPickStats && stats.cardContributionStats) {
                    for (const [cardId, deepStats] of stats.cardDeepStats) {
                      const pickRate = stats.cardPickStats.pickRate[cardId] || 0;
                      const contribution = stats.cardContributionStats.contribution[cardId] || 0;
                      const timesOffered = stats.cardPickStats.timesOffered[cardId] || 0;

                      if (timesOffered >= 10) {
                        if (pickRate > 0.7 && contribution > 0.1) {
                          cardAnalysis.push({
                            id: cardId,
                            name: deepStats.cardName,
                            pickRate,
                            contribution,
                            suggestion: `damage/block -${Math.round(contribution * 15)}% 또는 speedCost +1`,
                            type: 'nerf',
                          });
                        } else if (pickRate < 0.25 && contribution < -0.05) {
                          cardAnalysis.push({
                            id: cardId,
                            name: deepStats.cardName,
                            pickRate,
                            contribution,
                            suggestion: `damage/block +${Math.round(Math.abs(contribution) * 20)}% 또는 speedCost -1`,
                            type: 'buff',
                          });
                        }
                      }
                    }
                  }

                  const nerfs = cardAnalysis.filter(c => c.type === 'nerf').sort((a, b) => b.contribution - a.contribution);
                  const buffs = cardAnalysis.filter(c => c.type === 'buff').sort((a, b) => a.contribution - b.contribution);

                  return (
                    <>
                      {/* 현재 상태 요약 */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>현재 승률</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: isBalanced ? '#22c55e' : '#f59e0b' }}>
                            {(baseWinRate * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>목표 승률</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
                            {(targetWinRate * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>편차</div>
                          <div style={{
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            color: isBalanced ? '#22c55e' : parseFloat(gapPercent) > 0 ? '#ef4444' : '#3b82f6'
                          }}>
                            {parseFloat(gapPercent) > 0 ? '+' : ''}{gapPercent}%
                          </div>
                        </div>
                      </div>

                      {/* 밸런스 상태 */}
                      <div style={{
                        padding: '12px',
                        background: isBalanced ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        borderLeft: `4px solid ${isBalanced ? '#22c55e' : '#f59e0b'}`
                      }}>
                        {isBalanced ? (
                          <div style={{ color: '#22c55e' }}>✅ 현재 밸런스가 목표 범위(±5%) 내에 있습니다.</div>
                        ) : parseFloat(gapPercent) > 0 ? (
                          <div style={{ color: '#ef4444' }}>⚠️ 플레이어 승률이 높습니다. 너프가 필요합니다.</div>
                        ) : (
                          <div style={{ color: '#3b82f6' }}>⚠️ 플레이어 승률이 낮습니다. 버프가 필요합니다.</div>
                        )}
                      </div>

                      {/* 너프 후보 */}
                      {nerfs.length > 0 && (
                        <>
                          <h5 style={{ margin: '0 0 8px 0', color: '#ef4444' }}>🔴 너프 후보 (과잉 강화 카드)</h5>
                          <div style={{ ...STYLES.scrollBox, marginBottom: '16px' }}>
                            {nerfs.slice(0, 5).map((card, i) => (
                              <div key={i} style={{ padding: '8px', background: '#1e293b', borderRadius: '6px', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 'bold', color: '#e2e8f0' }}>{card.name}</span>
                                  <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                                    픽률 {(card.pickRate * 100).toFixed(0)}% | 기여도 +{(card.contribution * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                                  💡 제안: {card.suggestion}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* 버프 후보 */}
                      {buffs.length > 0 && (
                        <>
                          <h5 style={{ margin: '0 0 8px 0', color: '#22c55e' }}>🟢 버프 후보 (약한 카드)</h5>
                          <div style={{ ...STYLES.scrollBox, marginBottom: '16px' }}>
                            {buffs.slice(0, 5).map((card, i) => (
                              <div key={i} style={{ padding: '8px', background: '#1e293b', borderRadius: '6px', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 'bold', color: '#e2e8f0' }}>{card.name}</span>
                                  <span style={{ fontSize: '0.75rem', color: '#22c55e' }}>
                                    픽률 {(card.pickRate * 100).toFixed(0)}% | 기여도 {(card.contribution * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                                  💡 제안: {card.suggestion}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {cardAnalysis.length === 0 && (
                        <div style={{ padding: '16px', background: '#1e293b', borderRadius: '8px', textAlign: 'center', color: '#94a3b8' }}>
                          분석할 데이터가 부족합니다. 더 많은 시뮬레이션을 실행하세요.
                        </div>
                      )}

                      {/* 안내 메시지 */}
                      <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px', marginTop: '16px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          📌 <strong>사용 방법:</strong> 위 제안을 참고하여 <code>battleData.ts</code>의 카드 데이터를 수정한 후 다시 시뮬레이션을 실행하세요.
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>
                          상세 분석 모듈: <code>src/simulator/analysis/balance-auto-tuner.ts</code>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>
          ) : (
            <div style={{ ...STYLES.sectionBox, textAlign: 'center', color: '#94a3b8' }}>
              이 전략의 통계가 아직 없습니다.
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default SimulatorTab;
