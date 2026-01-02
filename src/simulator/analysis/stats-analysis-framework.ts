/**
 * @file stats-analysis-framework.ts
 * @description AI 통계 분석 프레임워크 v3 - 하하하GO 맞춤형
 *
 * ⚠️ AI 시뮬레이션 한계 인지:
 * - 이 분석은 AI 시뮬레이터가 생성한 데이터 기반
 * - AI 판단 ≠ 실제 플레이어 판단 (픽률, 전략 등)
 * - 반드시 직접 플레이 테스트와 병행해야 함
 * - "재미" 요소는 데이터로 측정 불가
 *
 * 게임 업계 베스트 프랙티스 참고 (하하하GO에 맞게 조정):
 * - Riot Games: 동적 임계값, 학습 곡선 (PvP→싱글플레이어 조정)
 * - Supercell: Use Rate + Win Rate 매트릭스 (AI 편향 고려)
 * - MegaCrit (StS): 카드 경쟁 분석 (가장 유사한 장르)
 *
 * Sources:
 * - https://medium.com/snipe-gg/understanding-league-of-legends-data-analytics-c2e5d77b55e6
 * - https://www.gamedeveloper.com/design/how-i-slay-the-spire-i-s-devs-use-data-to-balance-their-roguelike-deck-builder
 */

import type {
  DetailedStats,
  EventImpactAnalysis,
  EventImpactStats,
  EventChoiceImpact,
  EventImpactRanking,
  RelicSynergyImpactAnalysis,
  RelicSynergyStats,
  RelicSynergyRanking,
  CoreRelicStats,
  ContextualRelicValue,
  GrowthDecisionAnalysis,
  GrowthDecisionRecord,
  GrowthContextPattern,
  GrowthMistake,
  OptimalGrowthPath,
  CardSelectionReasoningAnalysis,
  CardSelectionDecision,
  SkipReasonAnalysis,
  CardSelectionMistake,
  CardValueAssessment,
  CardPickGuideEntry,
} from './detailed-stats-types';

// ==================== 하하하GO 게임 설정 ====================

/**
 * 난이도별 목표 승률
 * - 싱글플레이어 로그라이크는 PvP와 달리 50%가 정답이 아님
 * - 난이도가 높을수록 목표 승률이 낮아야 도전 요소 유지
 */
export const DIFFICULTY_TARGET_WIN_RATES: Record<number, { target: number; tolerance: number; description: string }> = {
  1: { target: 0.75, tolerance: 0.10, description: '입문자용 - 대부분 클리어 가능해야 함' },
  2: { target: 0.60, tolerance: 0.10, description: '쉬움 - 기본기 익히면 클리어' },
  3: { target: 0.45, tolerance: 0.10, description: '보통 - 적절한 도전과 보상' },
  4: { target: 0.30, tolerance: 0.08, description: '어려움 - 숙련자 도전 구간' },
  5: { target: 0.15, tolerance: 0.05, description: '극한 - 최적 플레이 + 운 필요' },
};

/**
 * AI 시뮬레이션 한계 경고 레벨
 */
export const AI_LIMITATION_WARNINGS = {
  PICK_RATE_BIAS: 'AI 픽률은 알고리즘 편향이 있음 - 실제 플레이어와 다를 수 있음',
  SYNERGY_BLIND_SPOT: 'AI가 발견 못한 시너지는 데이터에 없음',
  FUN_FACTOR: '"재미" 요소는 측정 불가 - 직접 플레이 테스트 필수',
  SAMPLE_SIZE: 'AI 시뮬레이션은 동일 전략 반복 - 다양성 부족',
  SKILL_CEILING: 'AI는 "최적 플레이"만 시도 - 플레이어 실수 미반영',
};

// ==================== 분석 결과 타입 ====================

export interface AnalysisResult {
  /** 분석 요약 */
  summary: string;
  /** 데이터 신뢰도 */
  confidence: ConfidenceLevel;
  /** 난이도별 밸런스 평가 */
  difficultyAssessment: DifficultyAssessment;
  /** AI 시뮬레이션 한계 경고 */
  aiLimitationWarnings: string[];
  /** 핵심 문제점들 */
  problems: Problem[];
  /** 원인 분석 */
  rootCauses: RootCause[];
  /** 개선 제안 */
  recommendations: Recommendation[];
  /** 추가 조사 필요 항목 */
  needsInvestigation: string[];
  /** 메타 분석 결과 */
  metaAnalysis: MetaAnalysis;
}

export interface DifficultyAssessment {
  /** 분석된 난이도 */
  difficulty: number;
  /** 목표 승률 */
  targetWinRate: number;
  /** 실제 승률 */
  actualWinRate: number;
  /** 허용 오차 */
  tolerance: number;
  /** 목표 달성 여부 */
  isOnTarget: boolean;
  /** 평가 메시지 */
  assessment: string;
  /** 조정 필요 방향 */
  adjustmentNeeded: 'none' | 'easier' | 'harder';
}

export interface ConfidenceLevel {
  level: 'low' | 'medium' | 'high';
  sampleSize: number;
  minimumRequired: number;
  message: string;
}

export interface MetaAnalysis {
  /** 전체 평균 승률 */
  avgWinRate: number;
  /** 승률 표준편차 */
  winRateStdDev: number;
  /** 카드 픽률 평균 */
  avgPickRate: number;
  /** 픽률 표준편차 */
  pickRateStdDev: number;
  /** Use Rate + Win Rate 4분면 분류 */
  cardQuadrants: CardQuadrantAnalysis;
  /** 학습 곡선 감지된 항목 */
  learningCurveItems: LearningCurveItem[];
}

export interface CardQuadrantAnalysis {
  /** 높은 픽률 + 높은 승률 = OP (너프 고려) */
  overpowered: string[];
  /** 높은 픽률 + 낮은 승률 = 함정 (버프 또는 재설계) */
  trap: string[];
  /** 낮은 픽률 + 높은 승률 = 히든 젬 (발굴 필요) */
  hiddenGem: string[];
  /** 낮은 픽률 + 낮은 승률 = 약함 (버프 필요) */
  weak: string[];
  /** 평균 근처 = 균형 잡힘 */
  balanced: string[];
}

export interface LearningCurveItem {
  id: string;
  type: 'card' | 'enemy' | 'synergy';
  earlyPerformance: number;
  latePerformance: number;
  gamesUntilProficiency: number;
  recommendation: string;
}

export interface Problem {
  category: 'balance' | 'design' | 'synergy' | 'progression' | 'player_weakness' | 'meta';
  description: string;
  severity: number;
  confidence: number; // 0-1, 통계적 신뢰도
  relatedData: Record<string, unknown>;
  methodology: string; // 어떤 분석 방법론을 사용했는지
}

export interface RootCause {
  problemIndex: number;
  type: 'insufficient_options' | 'stat_mismatch' | 'synergy_gap' | 'tempo_issue' | 'resource_shortage' | 'learning_curve';
  description: string;
  evidence: string[];
  counterEvidence?: string[]; // 반대 증거도 표시
}

export interface Recommendation {
  type: 'buff_card' | 'nerf_enemy' | 'add_option' | 'adjust_curve' | 'improve_synergy' | 'monitor' | 'ab_test';
  target: string;
  suggestion: string;
  expectedImpact: string;
  priority: number;
  testConfig?: ABTestConfig; // Supercell 스타일 A/B 테스트 제안
}

export interface ABTestConfig {
  controlGroup: string;
  testGroup: string;
  suggestedSampleSize: number;
  successMetric: string;
}

// ==================== 통계 유틸리티 ====================

/**
 * 표준편차 계산
 */
function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(v => Math.pow(v - avg, 2));
  return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Z-score 계산 (Riot 스타일: 평균에서 몇 표준편차 떨어졌는지)
 */
function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * 샘플 크기 기반 신뢰도 계산
 * Slay the Spire: 최소 3회 등장해야 분석
 * Riot: 충분한 게임 수 없으면 결론 보류
 */
function calculateConfidence(sampleSize: number, minRequired: number = 20): number {
  if (sampleSize < 3) return 0;
  if (sampleSize >= minRequired) return 1;
  return Math.min(1, sampleSize / minRequired);
}

/**
 * Wilson Score Interval - 작은 샘플에서도 신뢰할 수 있는 승률 추정
 * (Reddit, Yelp 등에서 사용하는 방식)
 */
function wilsonScoreLower(wins: number, total: number, confidence: number = 0.95): number {
  if (total === 0) return 0;
  const z = confidence === 0.95 ? 1.96 : 1.645; // 95% or 90% confidence
  const p = wins / total;
  const denominator = 1 + z * z / total;
  const center = p + z * z / (2 * total);
  const spread = z * Math.sqrt((p * (1 - p) + z * z / (4 * total)) / total);
  return (center - spread) / denominator;
}

// ==================== 동적 임계값 계산 (Riot 스타일) ====================

interface DynamicThresholds {
  winRate: {
    mean: number;
    stdDev: number;
    tooHard: number;  // mean - 2σ
    tooEasy: number;  // mean + 2σ
    broken: number;   // mean ± 5% (Riot: ±5%면 broken)
  };
  pickRate: {
    mean: number;
    stdDev: number;
    mustPick: number; // mean + 2σ
    neverPick: number; // mean - 1.5σ
  };
}

function calculateDynamicThresholds(stats: DetailedStats): DynamicThresholds {
  // 적 승률 통계
  const enemyWinRates = Array.from(stats.monsterStats.values())
    .filter(m => m.battles >= 3)
    .map(m => m.winRate);

  const avgEnemyWinRate = enemyWinRates.length > 0
    ? enemyWinRates.reduce((a, b) => a + b, 0) / enemyWinRates.length
    : 0.5;
  const enemyWinRateStdDev = calculateStdDev(enemyWinRates);

  // 카드 픽률 통계
  const pickRates = stats.cardPickStats
    ? Object.values(stats.cardPickStats.pickRate).filter(r => r > 0)
    : [];

  const avgPickRate = pickRates.length > 0
    ? pickRates.reduce((a, b) => a + b, 0) / pickRates.length
    : 0.3;
  const pickRateStdDev = calculateStdDev(pickRates);

  return {
    winRate: {
      mean: avgEnemyWinRate,
      stdDev: enemyWinRateStdDev,
      tooHard: Math.max(0.25, avgEnemyWinRate - 2 * enemyWinRateStdDev),
      tooEasy: Math.min(0.95, avgEnemyWinRate + 2 * enemyWinRateStdDev),
      broken: 0.05, // Riot: ±5%면 문제
    },
    pickRate: {
      mean: avgPickRate,
      stdDev: pickRateStdDev,
      mustPick: Math.min(0.9, avgPickRate + 2 * pickRateStdDev),
      neverPick: Math.max(0.05, avgPickRate - 1.5 * pickRateStdDev),
    },
  };
}

// ==================== Supercell 스타일 4분면 분석 ====================

function analyzeCardQuadrants(stats: DetailedStats, thresholds: DynamicThresholds): CardQuadrantAnalysis {
  const result: CardQuadrantAnalysis = {
    overpowered: [],
    trap: [],
    hiddenGem: [],
    weak: [],
    balanced: [],
  };

  if (!stats.cardPickStats || !stats.cardContributionStats) return result;

  const { pickRate } = stats.cardPickStats;
  const { winRateWithCard } = stats.cardContributionStats;

  for (const cardId of Object.keys(pickRate)) {
    const pr = pickRate[cardId] || 0;
    const wr = winRateWithCard[cardId] || 0.5;

    const highPick = pr > thresholds.pickRate.mean;
    const highWin = wr > thresholds.winRate.mean + thresholds.winRate.broken;
    const lowWin = wr < thresholds.winRate.mean - thresholds.winRate.broken;

    if (highPick && highWin) {
      result.overpowered.push(cardId);
    } else if (highPick && lowWin) {
      result.trap.push(cardId);
    } else if (!highPick && highWin) {
      result.hiddenGem.push(cardId);
    } else if (!highPick && lowWin) {
      result.weak.push(cardId);
    } else {
      result.balanced.push(cardId);
    }
  }

  return result;
}

// ==================== Slay the Spire 스타일 카드 경쟁 분석 ====================

interface CardCompetitionResult {
  cardId: string;
  timesOffered: number;
  timesPicked: number;
  pickRate: number;
  /** 이 카드가 이긴 상대들 (제시됐을 때 이 카드 대신 버려진 카드들) */
  winsAgainst: Record<string, number>;
  /** 이 카드가 진 상대들 */
  lossesAgainst: Record<string, number>;
  /** 주요 라이벌 (가장 자주 경쟁하는 카드) */
  mainRival: string | null;
  /** 라이벌 대비 승률 */
  rivalWinRate: number;
}

function analyzeCardCompetition(stats: DetailedStats): CardCompetitionResult[] {
  if (!stats.allCardChoices || stats.allCardChoices.length === 0) return [];

  const cardData: Record<string, CardCompetitionResult> = {};

  for (const choice of stats.allCardChoices) {
    const { pickedCardId, notPickedCardIds } = choice;

    // 선택된 카드 데이터 초기화
    if (pickedCardId) {
      if (!cardData[pickedCardId]) {
        cardData[pickedCardId] = {
          cardId: pickedCardId,
          timesOffered: 0,
          timesPicked: 0,
          pickRate: 0,
          winsAgainst: {},
          lossesAgainst: {},
          mainRival: null,
          rivalWinRate: 0,
        };
      }
      cardData[pickedCardId].timesOffered++;
      cardData[pickedCardId].timesPicked++;

      // 이 카드가 이긴 상대들 기록
      for (const loser of notPickedCardIds) {
        cardData[pickedCardId].winsAgainst[loser] =
          (cardData[pickedCardId].winsAgainst[loser] || 0) + 1;
      }
    }

    // 선택되지 않은 카드들 데이터
    for (const loserId of notPickedCardIds) {
      if (!cardData[loserId]) {
        cardData[loserId] = {
          cardId: loserId,
          timesOffered: 0,
          timesPicked: 0,
          pickRate: 0,
          winsAgainst: {},
          lossesAgainst: {},
          mainRival: null,
          rivalWinRate: 0,
        };
      }
      cardData[loserId].timesOffered++;

      // 이 카드가 진 상대 기록
      if (pickedCardId) {
        cardData[loserId].lossesAgainst[pickedCardId] =
          (cardData[loserId].lossesAgainst[pickedCardId] || 0) + 1;
      }
    }
  }

  // 픽률 및 라이벌 분석 계산
  const results = Object.values(cardData).map(card => {
    card.pickRate = card.timesOffered > 0 ? card.timesPicked / card.timesOffered : 0;

    // 가장 많이 경쟁한 상대 찾기
    const allCompetitors = { ...card.winsAgainst };
    for (const [rival, losses] of Object.entries(card.lossesAgainst)) {
      allCompetitors[rival] = (allCompetitors[rival] || 0) + losses;
    }

    const rivalEntries = Object.entries(allCompetitors).sort((a, b) => b[1] - a[1]);
    if (rivalEntries.length > 0) {
      card.mainRival = rivalEntries[0][0];
      const winsVsRival = card.winsAgainst[card.mainRival] || 0;
      const lossesVsRival = card.lossesAgainst[card.mainRival] || 0;
      const totalVsRival = winsVsRival + lossesVsRival;
      card.rivalWinRate = totalVsRival > 0 ? winsVsRival / totalVsRival : 0.5;
    }

    return card;
  });

  return results.sort((a, b) => b.timesOffered - a.timesOffered);
}

// ==================== Slay the Spire 스타일 적별 피해 분석 ====================

interface EnemyDamageProfile {
  enemyId: string;
  battles: number;
  avgDamageTaken: number;
  avgDamageDealt: number;
  /** 이 적에게 효과적인 카드들 (사용 시 받는 피해 감소) */
  effectiveCards: Array<{ cardId: string; damageReduction: number }>;
  /** 이 적에게 비효과적인 카드들 */
  ineffectiveCards: Array<{ cardId: string; damageIncrease: number }>;
  /** 권장 대응 전략 */
  counterStrategy: string;
}

function analyzeEnemyDamageProfiles(stats: DetailedStats): EnemyDamageProfile[] {
  const profiles: EnemyDamageProfile[] = [];

  for (const [enemyId, enemyStats] of stats.monsterStats) {
    if (enemyStats.battles < 3) continue;

    const profile: EnemyDamageProfile = {
      enemyId,
      battles: enemyStats.battles,
      avgDamageTaken: enemyStats.avgDamageTaken,
      avgDamageDealt: enemyStats.avgDamageDealt,
      effectiveCards: [],
      ineffectiveCards: [],
      counterStrategy: '',
    };

    // 전략 추천
    const damageRatio = enemyStats.avgDamageTaken / Math.max(1, enemyStats.avgDamageDealt);
    if (damageRatio > 1.5) {
      profile.counterStrategy = '공격적 플레이 권장 - 빠른 처치로 피해 최소화';
    } else if (enemyStats.avgTurns > 8) {
      profile.counterStrategy = '지구전 대비 필요 - 방어/회복 카드 확보';
    } else if (enemyStats.avgTurns < 4) {
      profile.counterStrategy = '초반 버스트 대응 필요 - 선방어 또는 선딜 카드';
    } else {
      profile.counterStrategy = '균형 잡힌 덱으로 대응 가능';
    }

    profiles.push(profile);
  }

  return profiles.sort((a, b) => a.avgDamageTaken - b.avgDamageTaken);
}

// ==================== 야스오 스타일 학습 곡선 감지 ====================

function detectLearningCurves(stats: DetailedStats): LearningCurveItem[] {
  const items: LearningCurveItem[] = [];

  // 최근 런 진행 데이터가 있으면 시간에 따른 성능 변화 분석
  if (stats.recentRunProgressions && stats.recentRunProgressions.length >= 5) {
    // 초반 런 vs 후반 런 승률 비교
    const midpoint = Math.floor(stats.recentRunProgressions.length / 2);
    const earlyRuns = stats.recentRunProgressions.slice(0, midpoint);
    const lateRuns = stats.recentRunProgressions.slice(midpoint);

    // 전체 성공률 변화 감지
    // (실제로는 런별 승패 데이터가 필요하지만, 현재는 구조적 힌트만 제공)
  }

  // 낮은 픽률 + 높은 승률 카드 = 학습 곡선이 있을 수 있음
  if (stats.cardPickStats && stats.cardContributionStats) {
    const { pickRate } = stats.cardPickStats;
    const { winRateWithCard, runsWithCard } = stats.cardContributionStats;

    for (const cardId of Object.keys(pickRate)) {
      const pr = pickRate[cardId] || 0;
      const wr = winRateWithCard[cardId] || 0;
      const runs = runsWithCard[cardId] || 0;

      // 낮은 픽률(< 20%)이지만 높은 승률(> 60%)이면 학습 곡선 의심
      if (pr < 0.2 && wr > 0.6 && runs >= 3) {
        items.push({
          id: cardId,
          type: 'card',
          earlyPerformance: pr, // 픽률을 초기 인식으로 해석
          latePerformance: wr,  // 승률을 숙련 후 성능으로 해석
          gamesUntilProficiency: Math.ceil(10 / pr), // 추정
          recommendation: `${cardId}는 학습 곡선이 있을 수 있음 - 즉각적 버프보다 플레이어 교육/가이드 고려`,
        });
      }
    }
  }

  return items;
}

// ==================== 메인 분석 함수들 ====================

/**
 * 적 밸런스 분석 (Riot 스타일 동적 임계값 + Z-score)
 */
export function analyzeEnemyBalance(stats: DetailedStats, thresholds: DynamicThresholds): Problem[] {
  const problems: Problem[] = [];

  for (const [enemyId, enemyStats] of stats.monsterStats) {
    if (enemyStats.battles < 3) continue; // 최소 샘플 요구

    const winRate = enemyStats.winRate;
    const zScore = calculateZScore(winRate, thresholds.winRate.mean, thresholds.winRate.stdDev);
    const confidence = calculateConfidence(enemyStats.battles, 10);

    // Z-score 기반 이상치 탐지 (Riot: 2σ 이상 = 유의미)
    if (zScore < -2) {
      // 승률이 평균보다 2σ 이상 낮음 = 너무 어려움
      const avgDamageTaken = enemyStats.avgDamageTaken;
      const avgDamageDealt = enemyStats.avgDamageDealt;
      const avgTurns = enemyStats.avgTurns;

      let reason = '';
      if (avgDamageTaken > avgDamageDealt * 1.5) {
        reason = '딜량 부족으로 장기전 손해';
      } else if (avgTurns > 10) {
        reason = '전투 장기화 - 턴당 딜이 낮음';
      } else if (avgTurns < 4) {
        reason = '초반 폭딜 - 선방어 옵션 부족';
      } else {
        reason = '전반적 스탯 열세';
      }

      problems.push({
        category: 'player_weakness',
        description: `${enemyId} 전투 승률 ${(winRate * 100).toFixed(1)}% (평균 ${(thresholds.winRate.mean * 100).toFixed(1)}%, Z=${zScore.toFixed(2)}): ${reason}`,
        severity: zScore < -3 ? 5 : zScore < -2.5 ? 4 : 3,
        confidence,
        relatedData: { enemyId, winRate, zScore, avgDamageTaken, avgDamageDealt, avgTurns },
        methodology: 'Riot-style Z-score analysis (2σ threshold)',
      });
    } else if (zScore > 2) {
      problems.push({
        category: 'balance',
        description: `${enemyId} 전투가 너무 쉬움 (승률 ${(winRate * 100).toFixed(1)}%, Z=${zScore.toFixed(2)})`,
        severity: 2,
        confidence,
        relatedData: { enemyId, winRate, zScore },
        methodology: 'Riot-style Z-score analysis',
      });
    }
  }

  return problems;
}

/**
 * 적 그룹 밸런스 분석
 * - 그룹별 승률, 피해량 분석
 * - 단독 vs 다수 출현 시 차이 분석
 * - 혼합 그룹의 시너지 위협도 분석
 */
export function analyzeEnemyGroupBalance(stats: DetailedStats, thresholds: DynamicThresholds): Problem[] {
  const problems: Problem[] = [];

  // 그룹 통계가 없으면 빈 배열 반환
  if (!stats.enemyGroupStats || stats.enemyGroupStats.size === 0) {
    return problems;
  }

  for (const [groupId, groupStats] of stats.enemyGroupStats) {
    if (groupStats.battles < 3) continue;

    const winRate = groupStats.winRate;
    const zScore = calculateZScore(winRate, thresholds.winRate.mean, thresholds.winRate.stdDev);
    const confidence = calculateConfidence(groupStats.battles, 10);

    // 그룹이 너무 어려움
    if (zScore < -2) {
      // 피해 기여도 분석
      const topDamageDealer = groupStats.damageContribution.length > 0
        ? groupStats.damageContribution.reduce((max, curr) => curr.percentage > max.percentage ? curr : max)
        : null;

      let reason = '';
      if (groupStats.enemyCount >= 4) {
        reason = `다수 적(${groupStats.enemyCount}마리)으로 인한 누적 피해`;
      } else if (topDamageDealer && topDamageDealer.percentage > 0.6) {
        reason = `${topDamageDealer.monsterId}가 피해의 ${(topDamageDealer.percentage * 100).toFixed(0)}% 담당`;
      } else if (!groupStats.isHomogeneous) {
        reason = '혼합 그룹 시너지로 인한 복합 위협';
      } else {
        reason = '그룹 총 HP/피해량 과다';
      }

      problems.push({
        category: 'player_weakness',
        description: `그룹 "${groupStats.groupName}" 승률 ${(winRate * 100).toFixed(1)}% (Z=${zScore.toFixed(2)}): ${reason}`,
        severity: zScore < -3 ? 5 : zScore < -2.5 ? 4 : 3,
        confidence,
        relatedData: {
          groupId,
          groupName: groupStats.groupName,
          enemyCount: groupStats.enemyCount,
          composition: groupStats.composition,
          winRate,
          zScore,
          avgDamageTaken: groupStats.avgDamageTaken,
          damageContribution: groupStats.damageContribution,
        },
        methodology: '그룹 단위 Z-score 분석 + 피해 기여도',
      });
    } else if (zScore > 2) {
      problems.push({
        category: 'balance',
        description: `그룹 "${groupStats.groupName}"이 너무 쉬움 (승률 ${(winRate * 100).toFixed(1)}%, Z=${zScore.toFixed(2)})`,
        severity: 2,
        confidence,
        relatedData: { groupId, winRate, zScore },
        methodology: '그룹 단위 Z-score 분석',
      });
    }

    // 그룹 내 처치 순서 분석 - 특정 적이 항상 마지막까지 생존하면 문제
    if (groupStats.killOrder.length >= 2) {
      const lastKilled = groupStats.killOrder.reduce((max, curr) =>
        curr.avgOrder > max.avgOrder ? curr : max
      );
      const firstKilled = groupStats.killOrder.reduce((min, curr) =>
        curr.avgOrder < min.avgOrder ? curr : min
      );

      if (lastKilled.avgOrder - firstKilled.avgOrder > 1.5 && groupStats.enemyCount >= 3) {
        problems.push({
          category: 'design',
          description: `그룹 "${groupStats.groupName}"에서 ${lastKilled.monsterId}가 항상 마지막까지 생존 (처치 순서 ${lastKilled.avgOrder.toFixed(1)})`,
          severity: 2,
          confidence: confidence * 0.8,
          relatedData: { groupId, killOrder: groupStats.killOrder },
          methodology: '처치 순서 분석',
        });
      }
    }
  }

  // 개별 적의 컨텍스트별 통계 분석
  for (const [enemyId, enemyStats] of stats.monsterStats) {
    if (!enemyStats.contextStats) continue;

    const { solo, withSameType, withMixedGroup } = enemyStats.contextStats;

    // 단독 vs 다수 승률 차이가 큰 경우
    if (solo.battles >= 3 && withSameType.battles >= 3) {
      const soloWinRate = solo.winRate;
      const groupWinRate = withSameType.winRate;
      const diff = soloWinRate - groupWinRate;

      if (Math.abs(diff) > 0.2) {
        problems.push({
          category: 'balance',
          description: `${enemyId} 단독(${(soloWinRate * 100).toFixed(0)}%) vs 다수(${(groupWinRate * 100).toFixed(0)}%) 승률 차이 ${(Math.abs(diff) * 100).toFixed(0)}%p`,
          severity: Math.abs(diff) > 0.3 ? 4 : 3,
          confidence: calculateConfidence(Math.min(solo.battles, withSameType.battles), 5),
          relatedData: { enemyId, soloWinRate, groupWinRate, diff },
          methodology: '컨텍스트별 승률 비교',
        });
      }
    }

    // 혼합 그룹에서 특히 위협적인 경우
    if (withMixedGroup.battles >= 3 && solo.battles >= 3) {
      const mixedWinRate = withMixedGroup.winRate;
      const soloWinRate = solo.winRate;

      if (soloWinRate - mixedWinRate > 0.25) {
        const partners = withMixedGroup.frequentPartners.slice(0, 2).map(p => p.monsterId).join(', ');
        problems.push({
          category: 'player_weakness',
          description: `${enemyId}가 ${partners}와 함께 나올 때 승률 급락 (${(soloWinRate * 100).toFixed(0)}% → ${(mixedWinRate * 100).toFixed(0)}%)`,
          severity: 4,
          confidence: calculateConfidence(withMixedGroup.battles, 5),
          relatedData: { enemyId, soloWinRate, mixedWinRate, partners: withMixedGroup.frequentPartners },
          methodology: '혼합 그룹 시너지 분석',
        });
      }
    }
  }

  return problems;
}

/**
 * 카드 밸런스 분석 (Supercell 4분면 + Slay the Spire 경쟁 분석)
 */
export function analyzeCardBalance(stats: DetailedStats, thresholds: DynamicThresholds): Problem[] {
  const problems: Problem[] = [];
  const quadrants = analyzeCardQuadrants(stats, thresholds);
  const competition = analyzeCardCompetition(stats);

  // OP 카드 (높은 픽률 + 높은 승률)
  for (const cardId of quadrants.overpowered) {
    const pickRate = stats.cardPickStats?.pickRate[cardId] || 0;
    const winRate = stats.cardContributionStats?.winRateWithCard[cardId] || 0;
    const confidence = calculateConfidence(stats.cardContributionStats?.runsWithCard[cardId] || 0);

    problems.push({
      category: 'balance',
      description: `${cardId} OP 의심 - 픽률 ${(pickRate * 100).toFixed(1)}%, 보유시 승률 ${(winRate * 100).toFixed(1)}%`,
      severity: 4,
      confidence,
      relatedData: { cardId, pickRate, winRate, quadrant: 'overpowered' },
      methodology: 'Supercell-style Use Rate + Win Rate matrix (Q1: OP)',
    });
  }

  // 함정 카드 (높은 픽률 + 낮은 승률) - 과대평가됨
  for (const cardId of quadrants.trap) {
    const pickRate = stats.cardPickStats?.pickRate[cardId] || 0;
    const winRate = stats.cardContributionStats?.winRateWithCard[cardId] || 0;
    const confidence = calculateConfidence(stats.cardContributionStats?.runsWithCard[cardId] || 0);

    problems.push({
      category: 'design',
      description: `${cardId} 함정카드 - 픽률 ${(pickRate * 100).toFixed(1)}%지만 승률 ${(winRate * 100).toFixed(1)}% (과대평가)`,
      severity: 3,
      confidence,
      relatedData: { cardId, pickRate, winRate, quadrant: 'trap' },
      methodology: 'Supercell-style matrix (Q2: Trap)',
    });
  }

  // 히든 젬 (낮은 픽률 + 높은 승률) - 과소평가됨
  for (const cardId of quadrants.hiddenGem) {
    const pickRate = stats.cardPickStats?.pickRate[cardId] || 0;
    const winRate = stats.cardContributionStats?.winRateWithCard[cardId] || 0;

    problems.push({
      category: 'design',
      description: `${cardId} 히든젬 발견 - 픽률 ${(pickRate * 100).toFixed(1)}%지만 승률 ${(winRate * 100).toFixed(1)}% (과소평가)`,
      severity: 2, // 긍정적 발견이므로 낮은 심각도
      confidence: calculateConfidence(stats.cardContributionStats?.runsWithCard[cardId] || 0),
      relatedData: { cardId, pickRate, winRate, quadrant: 'hiddenGem' },
      methodology: 'Supercell-style matrix (Q3: Hidden Gem)',
    });
  }

  // 약한 카드 (낮은 픽률 + 낮은 승률)
  for (const cardId of quadrants.weak.slice(0, 5)) { // 상위 5개만
    const pickRate = stats.cardPickStats?.pickRate[cardId] || 0;
    const winRate = stats.cardContributionStats?.winRateWithCard[cardId] || 0;

    problems.push({
      category: 'balance',
      description: `${cardId} 약함 - 픽률 ${(pickRate * 100).toFixed(1)}%, 승률 ${(winRate * 100).toFixed(1)}%`,
      severity: 3,
      confidence: calculateConfidence(stats.cardContributionStats?.runsWithCard[cardId] || 0),
      relatedData: { cardId, pickRate, winRate, quadrant: 'weak' },
      methodology: 'Supercell-style matrix (Q4: Weak)',
    });
  }

  // Slay the Spire 스타일: 라이벌 대비 극단적 승률
  for (const card of competition.slice(0, 10)) {
    if (card.mainRival && card.timesOffered >= 5) {
      if (card.rivalWinRate > 0.8) {
        problems.push({
          category: 'balance',
          description: `${card.cardId}가 ${card.mainRival} 대비 ${(card.rivalWinRate * 100).toFixed(0)}% 선택됨 - 경쟁 불균형`,
          severity: 3,
          confidence: calculateConfidence(card.timesOffered),
          relatedData: { cardId: card.cardId, rival: card.mainRival, rivalWinRate: card.rivalWinRate },
          methodology: 'Slay the Spire-style card competition analysis',
        });
      }
    }
  }

  return problems;
}

/**
 * 진행 곡선 분석
 */
export function analyzeProgressionCurve(stats: DetailedStats): Problem[] {
  const problems: Problem[] = [];
  const deathByLayer = stats.runStats.deathByLayer || {};
  const totalDeaths = Object.values(deathByLayer).reduce((sum, count) => sum + count, 0);

  if (totalDeaths === 0) return problems;

  // 층별 사망률 분석
  const layerDeathRates = Object.entries(deathByLayer)
    .map(([layer, count]) => ({ layer: Number(layer), rate: count / totalDeaths }))
    .sort((a, b) => a.layer - b.layer);

  const avgDeathRate = 1 / layerDeathRates.length;
  const deathRateStdDev = calculateStdDev(layerDeathRates.map(l => l.rate));

  for (const { layer, rate } of layerDeathRates) {
    const zScore = calculateZScore(rate, avgDeathRate, deathRateStdDev);

    if (zScore > 2) { // 평균보다 2σ 이상 높은 사망률
      let analysis = '';
      if (layer <= 3) {
        analysis = '초반 덱이 약하거나 첫 적이 너무 강함';
      } else if (layer >= 8) {
        analysis = '후반 스케일링 부족 또는 보스 대응력 부족';
      } else {
        analysis = '중반 전환 실패 - 핵심 시너지 미완성';
      }

      problems.push({
        category: 'progression',
        description: `${layer}층에서 사망 집중 (${(rate * 100).toFixed(1)}%, Z=${zScore.toFixed(2)}): ${analysis}`,
        severity: zScore > 3 ? 5 : 4,
        confidence: calculateConfidence(totalDeaths, 15),
        relatedData: { layer, rate, zScore, analysis },
        methodology: 'Z-score based death concentration analysis',
      });
    }
  }

  return problems;
}

/**
 * 시너지 분석
 */
export function analyzeSynergies(stats: DetailedStats, thresholds: DynamicThresholds): Problem[] {
  const problems: Problem[] = [];
  const synergyStats = stats.cardSynergyStats;

  if (!synergyStats?.topSynergies) return problems;

  const winRates = synergyStats.topSynergies
    .filter(s => s.frequency >= 3)
    .map(s => s.winRate);

  if (winRates.length === 0) return problems;

  const avgSynergyWinRate = winRates.reduce((a, b) => a + b, 0) / winRates.length;
  const synergyWinRateStdDev = calculateStdDev(winRates);

  for (const syn of synergyStats.topSynergies.filter(s => s.frequency >= 3)) {
    const zScore = calculateZScore(syn.winRate, avgSynergyWinRate, synergyWinRateStdDev);

    if (zScore > 2) {
      problems.push({
        category: 'synergy',
        description: `${syn.pair} 조합이 압도적 (${(syn.winRate * 100).toFixed(1)}%, Z=${zScore.toFixed(2)}) - 다른 빌드 약함`,
        severity: 3,
        confidence: calculateConfidence(syn.frequency, 5),
        relatedData: { pair: syn.pair, winRate: syn.winRate, frequency: syn.frequency, zScore },
        methodology: 'Synergy win rate Z-score analysis',
      });
    } else if (zScore < -2) {
      problems.push({
        category: 'synergy',
        description: `${syn.pair} 조합이 함정 (${(syn.winRate * 100).toFixed(1)}%, Z=${zScore.toFixed(2)})`,
        severity: 2,
        confidence: calculateConfidence(syn.frequency, 5),
        relatedData: { pair: syn.pair, winRate: syn.winRate, frequency: syn.frequency, zScore },
        methodology: 'Synergy win rate Z-score analysis',
      });
    }
  }

  return problems;
}

/**
 * 카드 컨텍스트 분석
 * - HP 상태별 카드 효과 비교
 * - 층별 카드 성능 변화
 * - 적 유형별 카드 효과
 * - 턴 순서별 카드 효과
 */
export function analyzeCardContexts(stats: DetailedStats, thresholds: DynamicThresholds): Problem[] {
  const problems: Problem[] = [];

  for (const [cardId, cardStats] of stats.cardStats) {
    if (cardStats.totalUses < 5) continue;

    // HP 상태별 분석
    if (cardStats.contextByHpState) {
      const { critical, unstable, stable } = cardStats.contextByHpState;

      // 위기 상황에서만 좋은 카드 (위기 승률이 안정 상황보다 20%p 이상 높음)
      if (critical.uses >= 3 && stable.uses >= 3) {
        const diff = critical.winRate - stable.winRate;
        if (diff > 0.2) {
          problems.push({
            category: 'design',
            description: `${cardId}는 위기 상황(HP<30%)에서 승률 ${(critical.winRate * 100).toFixed(0)}%, 안정 상황에서 ${(stable.winRate * 100).toFixed(0)}% - 역전용 카드`,
            severity: 2,
            confidence: calculateConfidence(Math.min(critical.uses, stable.uses), 5),
            relatedData: { cardId, criticalWinRate: critical.winRate, stableWinRate: stable.winRate, diff },
            methodology: 'HP 상태별 카드 효과 분석',
          });
        } else if (diff < -0.2) {
          problems.push({
            category: 'balance',
            description: `${cardId}는 위기 상황에서 승률 급락 (${(critical.winRate * 100).toFixed(0)}% vs ${(stable.winRate * 100).toFixed(0)}%) - 위기 대응력 부족`,
            severity: 3,
            confidence: calculateConfidence(Math.min(critical.uses, stable.uses), 5),
            relatedData: { cardId, criticalWinRate: critical.winRate, stableWinRate: stable.winRate, diff },
            methodology: 'HP 상태별 카드 효과 분석',
          });
        }
      }
    }

    // 층별 분석
    if (cardStats.contextByFloor) {
      const { early, mid, late } = cardStats.contextByFloor;

      // 후반에 약해지는 카드 (스케일링 문제)
      if (early.uses >= 3 && late.uses >= 3) {
        const scalingDiff = early.winRate - late.winRate;
        if (scalingDiff > 0.25) {
          problems.push({
            category: 'design',
            description: `${cardId}는 후반 스케일링 부족 - 초반 승률 ${(early.winRate * 100).toFixed(0)}%, 후반 ${(late.winRate * 100).toFixed(0)}%`,
            severity: 3,
            confidence: calculateConfidence(Math.min(early.uses, late.uses), 5),
            relatedData: { cardId, earlyWinRate: early.winRate, lateWinRate: late.winRate, scalingDiff },
            methodology: '층별 카드 성능 분석',
          });
        }
      }
    }

    // 적 유형별 분석
    if (cardStats.contextByEnemy) {
      const { vsNormal, vsElite, vsBoss, vsMultiple } = cardStats.contextByEnemy;

      // 보스전에서 특히 약한 카드
      if (vsNormal.uses >= 3 && vsBoss.uses >= 3) {
        const bossDiff = vsNormal.winRate - vsBoss.winRate;
        if (bossDiff > 0.3) {
          problems.push({
            category: 'balance',
            description: `${cardId}는 보스전 약함 - 일반 ${(vsNormal.winRate * 100).toFixed(0)}%, 보스 ${(vsBoss.winRate * 100).toFixed(0)}%`,
            severity: 3,
            confidence: calculateConfidence(vsBoss.uses, 3),
            relatedData: { cardId, vsNormalWinRate: vsNormal.winRate, vsBossWinRate: vsBoss.winRate },
            methodology: '적 유형별 카드 효과 분석',
          });
        }
      }

      // 다수 적 상대에서 특히 약한 카드
      if (vsNormal.uses >= 3 && vsMultiple.uses >= 3) {
        const multiDiff = vsNormal.winRate - vsMultiple.winRate;
        if (multiDiff > 0.25) {
          problems.push({
            category: 'design',
            description: `${cardId}는 다수 적 전투 약함 - 단일 적 ${(vsNormal.winRate * 100).toFixed(0)}%, 다수 적 ${(vsMultiple.winRate * 100).toFixed(0)}%`,
            severity: 3,
            confidence: calculateConfidence(vsMultiple.uses, 5),
            relatedData: { cardId, vsNormalWinRate: vsNormal.winRate, vsMultipleWinRate: vsMultiple.winRate },
            methodology: '적 유형별 카드 효과 분석',
          });
        }
      }
    }

    // 턴 순서별 분석
    if (cardStats.contextByTurn) {
      const { firstTurn, lateTurns } = cardStats.contextByTurn;

      // 첫 턴에만 좋은 카드 vs 후반 턴에 좋은 카드
      if (firstTurn.uses >= 3 && lateTurns.uses >= 3) {
        const turnDiff = firstTurn.winRate - lateTurns.winRate;
        if (Math.abs(turnDiff) > 0.2) {
          problems.push({
            category: 'design',
            description: turnDiff > 0
              ? `${cardId}는 첫 턴 특화 (첫턴 ${(firstTurn.winRate * 100).toFixed(0)}%, 후반 ${(lateTurns.winRate * 100).toFixed(0)}%)`
              : `${cardId}는 지구전 특화 (첫턴 ${(firstTurn.winRate * 100).toFixed(0)}%, 후반 ${(lateTurns.winRate * 100).toFixed(0)}%)`,
            severity: 2,
            confidence: calculateConfidence(Math.min(firstTurn.uses, lateTurns.uses), 5),
            relatedData: { cardId, firstTurnWinRate: firstTurn.winRate, lateTurnsWinRate: lateTurns.winRate },
            methodology: '턴 순서별 카드 효과 분석',
          });
        }
      }
    }
  }

  return problems;
}

/**
 * 토큰 밸런스 분석
 * - 사용률 분석
 * - 효과 가치 분석
 * - 컨텍스트별 효과 분석
 */
export function analyzeTokenBalance(stats: DetailedStats): Problem[] {
  const problems: Problem[] = [];

  if (!stats.tokenStats || stats.tokenStats.size === 0) {
    return problems;
  }

  const allTokens = Array.from(stats.tokenStats.values());
  const usageRates = allTokens.filter(t => t.timesAcquired >= 3).map(t => t.usageRate);
  const avgUsageRate = usageRates.length > 0 ? usageRates.reduce((a, b) => a + b, 0) / usageRates.length : 0.5;
  const usageRateStdDev = calculateStdDev(usageRates);

  for (const [tokenId, tokenStats] of stats.tokenStats) {
    if (tokenStats.timesAcquired < 3) continue;

    const zScore = calculateZScore(tokenStats.usageRate, avgUsageRate, usageRateStdDev);
    const confidence = calculateConfidence(tokenStats.timesAcquired, 5);

    // 거의 사용되지 않는 토큰
    if (zScore < -1.5 || tokenStats.usageRate < 0.2) {
      problems.push({
        category: 'balance',
        description: `토큰 "${tokenStats.tokenName}" 사용률 ${(tokenStats.usageRate * 100).toFixed(0)}% - 효용 부족 또는 사용 타이밍 어려움`,
        severity: tokenStats.usageRate < 0.1 ? 4 : 3,
        confidence,
        relatedData: { tokenId, usageRate: tokenStats.usageRate, zScore, timesAcquired: tokenStats.timesAcquired },
        methodology: '토큰 사용률 Z-score 분석',
      });
    }

    // 만료율이 높은 토큰 (획득했지만 사용 안함)
    if (tokenStats.timesExpired > tokenStats.timesUsed) {
      const expireRate = tokenStats.timesExpired / tokenStats.timesAcquired;
      problems.push({
        category: 'design',
        description: `토큰 "${tokenStats.tokenName}" 만료율 ${(expireRate * 100).toFixed(0)}% - 사용 조건이 까다롭거나 효과가 약함`,
        severity: expireRate > 0.7 ? 4 : 3,
        confidence,
        relatedData: { tokenId, expireRate, timesUsed: tokenStats.timesUsed, timesExpired: tokenStats.timesExpired },
        methodology: '토큰 만료율 분석',
      });
    }

    // HP 상태별 토큰 사용 분석
    if (tokenStats.contextStats?.byHpState) {
      const { critical, stable } = tokenStats.contextStats.byHpState;

      // 위기 상황에서 더 많이 쓰이는 토큰 (구조용)
      if (critical.uses >= 3 && stable.uses >= 3) {
        const criticalRatio = critical.uses / (critical.uses + stable.uses);
        if (criticalRatio > 0.6) {
          // 이건 정보 제공용 (문제가 아님)
          problems.push({
            category: 'design',
            description: `토큰 "${tokenStats.tokenName}"는 위기 상황(HP<30%)에서 ${(criticalRatio * 100).toFixed(0)}% 사용 - 구명 토큰`,
            severity: 1, // 낮은 심각도 (정보 제공)
            confidence,
            relatedData: { tokenId, criticalUses: critical.uses, stableUses: stable.uses, criticalRatio },
            methodology: 'HP 상태별 토큰 사용 분석',
          });
        }
      }
    }
  }

  return problems;
}

/**
 * 포커 콤보 밸런스 분석
 * - 콤보별 에테르 효율
 * - 콤보별 승률 기여도
 * - 컨텍스트별 콤보 효과
 */
export function analyzePokerComboBalance(stats: DetailedStats): Problem[] {
  const problems: Problem[] = [];

  if (!stats.pokerComboStats) {
    return problems;
  }

  const { comboFrequency, avgEtherByCombo, winRateByCombo, comboDetails } = stats.pokerComboStats;

  // 콤보 빈도 분석
  const frequencies = Object.values(comboFrequency);
  const totalCombos = frequencies.reduce((a, b) => a + b, 0);
  if (totalCombos === 0) return problems;

  const avgFrequency = totalCombos / Object.keys(comboFrequency).length;
  const frequencyStdDev = calculateStdDev(frequencies);

  // 에테르 획득량 분석
  const etherValues = Object.values(avgEtherByCombo).filter(v => v > 0);
  const avgEther = etherValues.length > 0 ? etherValues.reduce((a, b) => a + b, 0) / etherValues.length : 0;
  const etherStdDev = calculateStdDev(etherValues);

  for (const [comboType, freq] of Object.entries(comboFrequency)) {
    if (freq < 5) continue;

    const freqRate = freq / totalCombos;
    const ether = avgEtherByCombo[comboType] || 0;
    const winRate = winRateByCombo[comboType] || 0.5;
    const freqZScore = calculateZScore(freq, avgFrequency, frequencyStdDev);
    const etherZScore = calculateZScore(ether, avgEther, etherStdDev);

    // 발동 빈도가 너무 낮은 콤보
    if (freqZScore < -1.5 && freqRate < 0.05) {
      problems.push({
        category: 'design',
        description: `콤보 "${comboType}" 발동률 ${(freqRate * 100).toFixed(1)}% - 달성 조건이 까다롭거나 카드 풀 부족`,
        severity: 3,
        confidence: calculateConfidence(totalCombos, 20),
        relatedData: { comboType, frequency: freq, freqRate, freqZScore },
        methodology: '포커 콤보 빈도 분석',
      });
    }

    // 에테르 효율이 극단적인 콤보
    if (Math.abs(etherZScore) > 2) {
      const isHigh = etherZScore > 0;
      problems.push({
        category: 'balance',
        description: isHigh
          ? `콤보 "${comboType}" 에테르 ${ether.toFixed(1)} - 평균 대비 과다 (Z=${etherZScore.toFixed(2)})`
          : `콤보 "${comboType}" 에테르 ${ether.toFixed(1)} - 평균 대비 부족 (Z=${etherZScore.toFixed(2)})`,
        severity: Math.abs(etherZScore) > 3 ? 4 : 3,
        confidence: calculateConfidence(freq, 10),
        relatedData: { comboType, avgEther: ether, etherZScore },
        methodology: '포커 콤보 에테르 효율 분석',
      });
    }

    // 승률 기여도 분석
    if (comboDetails && comboDetails.has(comboType)) {
      const detail = comboDetails.get(comboType)!;
      if (detail.totalOccurrences >= 10) {
        // 콤보 발동했는데 승률이 낮으면 효과가 약한 것
        if (detail.winRateAfterCombo < 0.4) {
          problems.push({
            category: 'balance',
            description: `콤보 "${comboType}" 발동 후 승률 ${(detail.winRateAfterCombo * 100).toFixed(0)}% - 콤보 보상이 약함`,
            severity: 4,
            confidence: calculateConfidence(detail.totalOccurrences, 15),
            relatedData: { comboType, winRateAfterCombo: detail.winRateAfterCombo, totalOccurrences: detail.totalOccurrences },
            methodology: '포커 콤보 승률 기여도 분석',
          });
        }
      }
    }
  }

  return problems;
}

/**
 * 층별 진행 분석
 * - 층별 클리어율/사망률
 * - 난이도 스파이크 감지
 * - 자원 커브 분석
 * - 병목 구간 분석
 */
export function analyzeFloorProgression(stats: DetailedStats): Problem[] {
  const problems: Problem[] = [];

  if (!stats.floorProgressionAnalysis) {
    return problems;
  }

  const { floorStats, difficultySpikes, bottleneckAnalysis, resourceCurves } = stats.floorProgressionAnalysis;

  // 난이도 스파이크 분석
  for (const spike of difficultySpikes) {
    if (spike.winRateDrop > 0.15) {
      problems.push({
        category: 'progression',
        description: `${spike.floor}층 난이도 스파이크 - 승률 ${(spike.winRateDrop * 100).toFixed(0)}%p 급락: ${spike.reason}`,
        severity: spike.winRateDrop > 0.25 ? 5 : 4,
        confidence: 0.8,
        relatedData: { floor: spike.floor, winRateDrop: spike.winRateDrop, reason: spike.reason },
        methodology: '층별 승률 변화 분석',
      });
    }
  }

  // 병목 구간 분석
  if (bottleneckAnalysis) {
    for (const bottleneck of bottleneckAnalysis.highFailureFloors) {
      problems.push({
        category: 'progression',
        description: `${bottleneck.floor}층 병목 - 실패율 ${(bottleneck.failureRate * 100).toFixed(0)}%: ${bottleneck.mainCause}`,
        severity: bottleneck.failureRate > 0.4 ? 5 : 4,
        confidence: 0.7,
        relatedData: { floor: bottleneck.floor, failureRate: bottleneck.failureRate, mainCause: bottleneck.mainCause },
        methodology: '층별 실패율 분석',
      });
    }

    // 자원 고갈 구간 분석
    for (const zone of bottleneckAnalysis.resourceDepletionZones) {
      problems.push({
        category: 'progression',
        description: `${zone.floorRange[0]}-${zone.floorRange[1]}층 자원 고갈 구간 - 실패 시 평균 HP ${zone.avgHpAtFailure.toFixed(0)}`,
        severity: 4,
        confidence: 0.6,
        relatedData: { floorRange: zone.floorRange, avgHpAtFailure: zone.avgHpAtFailure },
        methodology: '자원 커브 분석',
      });
    }
  }

  // 층별 상세 통계 분석
  if (floorStats && floorStats.size > 0) {
    const floors = Array.from(floorStats.entries()).sort((a, b) => a[0] - b[0]);
    const clearRates = floors.map(([, s]) => s.clearRate);
    const avgClearRate = clearRates.reduce((a, b) => a + b, 0) / clearRates.length;
    const clearRateStdDev = calculateStdDev(clearRates);

    for (const [floor, floorStat] of floors) {
      if (floorStat.timesReached < 5) continue;

      const zScore = calculateZScore(floorStat.clearRate, avgClearRate, clearRateStdDev);

      // 클리어율이 평균보다 2σ 이상 낮은 층
      if (zScore < -2) {
        const battleStats = floorStat.battleStats;
        let reason = '';

        if (battleStats.avgDamageTaken > battleStats.avgDamageDealt) {
          reason = '피해량 열세';
        } else if (battleStats.avgTurns > 8) {
          reason = '장기전으로 인한 자원 소모';
        } else if (battleStats.flawlessVictories === 0 && battleStats.totalBattles > 3) {
          reason = '무피해 클리어 불가능 - 피해 회피 옵션 부족';
        } else {
          reason = '종합적 난이도 상승';
        }

        problems.push({
          category: 'progression',
          description: `${floor}층 클리어율 ${(floorStat.clearRate * 100).toFixed(0)}% (평균 ${(avgClearRate * 100).toFixed(0)}%, Z=${zScore.toFixed(2)}): ${reason}`,
          severity: zScore < -3 ? 5 : 4,
          confidence: calculateConfidence(floorStat.timesReached, 10),
          relatedData: {
            floor,
            clearRate: floorStat.clearRate,
            zScore,
            battleStats: {
              avgDamageTaken: battleStats.avgDamageTaken,
              avgDamageDealt: battleStats.avgDamageDealt,
              avgTurns: battleStats.avgTurns,
            },
          },
          methodology: '층별 클리어율 Z-score 분석',
        });
      }

      // 자원 통계 분석 - HP 분포가 위기 상황에 편중된 층
      if (floorStat.resourceStats) {
        const { hpDistribution } = floorStat.resourceStats;
        if (hpDistribution.critical > 0.3) {
          problems.push({
            category: 'progression',
            description: `${floor}층 도달 시 ${(hpDistribution.critical * 100).toFixed(0)}%가 위기 상황(HP<30%) - 이전 구간 피해 누적`,
            severity: hpDistribution.critical > 0.5 ? 4 : 3,
            confidence: calculateConfidence(floorStat.timesReached, 10),
            relatedData: { floor, hpDistribution },
            methodology: '층별 HP 분포 분석',
          });
        }
      }
    }
  }

  return problems;
}

/**
 * 성장 경로 분석
 */
export function analyzeGrowthPaths(stats: DetailedStats): Problem[] {
  const problems: Problem[] = [];
  const growthStats = stats.growthStats;

  if (!growthStats?.growthPathStats || growthStats.growthPathStats.length < 2) {
    return problems;
  }

  const winRates = growthStats.growthPathStats.map(p => p.winRate);
  const avgWinRate = winRates.reduce((a, b) => a + b, 0) / winRates.length;
  const stdDev = calculateStdDev(winRates);

  for (const path of growthStats.growthPathStats) {
    const zScore = calculateZScore(path.winRate, avgWinRate, stdDev);

    if (Math.abs(zScore) > 2 && path.count >= 3) {
      problems.push({
        category: 'design',
        description: `성장 경로 불균형 - ${path.path} (${(path.winRate * 100).toFixed(1)}%, Z=${zScore.toFixed(2)})`,
        severity: Math.abs(zScore) > 3 ? 4 : 3,
        confidence: calculateConfidence(path.count, 5),
        relatedData: { path: path.path, winRate: path.winRate, count: path.count, zScore },
        methodology: 'Growth path win rate Z-score analysis',
      });
    }
  }

  return problems;
}

// ==================== 이벤트 영향력 분석 ====================

/**
 * 이벤트 영향력 분석
 * - 이벤트별 승률 영향
 * - 선택지별 영향력
 * - 치명적 이벤트 감지
 */
export function analyzeEventImpact(stats: DetailedStats): EventImpactAnalysis {
  const eventImpacts = new Map<string, EventImpactStats>();
  const mostBeneficialEvents: EventImpactRanking[] = [];
  const mostDetrimentalEvents: EventImpactRanking[] = [];

  // 이벤트 선택 통계가 있는 경우 분석
  if (stats.eventChoiceStats && stats.eventChoiceStats.size > 0) {
    const allImpacts: { eventId: string; netImpact: number; stats: EventImpactStats }[] = [];

    for (const [eventId, eventChoice] of stats.eventChoiceStats) {
      if (eventChoice.occurrences < 3) continue;

      // 선택지별 영향력 계산
      const choiceImpacts: EventChoiceImpact[] = [];
      let totalChoices = 0;
      let totalWins = 0;

      for (const [choiceId, outcome] of Object.entries(eventChoice.choiceOutcomes)) {
        totalChoices += outcome.timesChosen;
        // 승률 추정 (successRate를 사용)
        totalWins += outcome.timesChosen * outcome.successRate;

        choiceImpacts.push({
          choiceId,
          choiceName: choiceId,
          timesChosen: outcome.timesChosen,
          winRateAfterChoice: outcome.successRate,
          winRateDifferential: 0, // 후에 계산
          optimalChoiceRate: 0,
          reasonDistribution: {},
          outcomeDistribution: {
            positive: outcome.avgHpChange > 0 ? outcome.timesChosen : 0,
            neutral: outcome.avgHpChange === 0 ? outcome.timesChosen : 0,
            negative: outcome.avgHpChange < 0 && outcome.avgHpChange > -20 ? outcome.timesChosen : 0,
            fatal: outcome.avgHpChange <= -20 ? outcome.timesChosen : 0,
          },
        });
      }

      // 평균 승률 계산
      const avgWinRate = totalChoices > 0 ? totalWins / totalChoices : 0.5;

      // 선택지별 차이 계산
      if (choiceImpacts.length > 0) {
        const bestChoice = choiceImpacts.reduce((a, b) =>
          a.winRateAfterChoice > b.winRateAfterChoice ? a : b
        );
        for (const impact of choiceImpacts) {
          impact.winRateDifferential = impact.winRateAfterChoice - avgWinRate;
          impact.optimalChoiceRate = impact.choiceId === bestChoice.choiceId ? 1 : 0;
        }
      }

      const eventStats: EventImpactStats = {
        eventId,
        eventName: eventChoice.eventName,
        occurrences: eventChoice.occurrences,
        winRateAfterEvent: eventChoice.postEventWinRate,
        winRateWhenSkipped: eventChoice.timesSkipped > 0 ? 0.5 : 0, // 스킵 데이터 없으면 기본값
        netImpact: eventChoice.postEventWinRate - 0.5,
        choiceImpacts,
        survivalProbability: eventChoice.postEventWinRate,
        avgResourceChanges: {
          hp: Object.values(eventChoice.choiceOutcomes).reduce((sum, o) => sum + o.avgHpChange * o.timesChosen, 0) /
              Math.max(1, totalChoices),
          gold: Object.values(eventChoice.choiceOutcomes).reduce((sum, o) => sum + o.avgGoldChange * o.timesChosen, 0) /
              Math.max(1, totalChoices),
          deckQuality: 0,
          relicValue: 0,
        },
        avgFloorsToDeathAfter: 0,
        directDeathCount: 0,
      };

      eventImpacts.set(eventId, eventStats);
      allImpacts.push({ eventId, netImpact: eventStats.netImpact, stats: eventStats });
    }

    // 영향력 순위 계산
    const impacts = allImpacts.map(i => i.netImpact);
    const avgImpact = impacts.length > 0 ? impacts.reduce((a, b) => a + b, 0) / impacts.length : 0;
    const stdDev = calculateStdDev(impacts);

    for (const { eventId, netImpact, stats: eventStats } of allImpacts) {
      const zScore = calculateZScore(netImpact, avgImpact, stdDev);
      const ranking: EventImpactRanking = {
        eventId,
        eventName: eventStats.eventName,
        netImpact,
        zScore,
        recommendation: zScore > 1.5 ? 'always_do' :
                       zScore < -1.5 ? 'avoid' :
                       Math.abs(zScore) < 0.5 ? 'situational' : 'situational',
        optimalChoice: eventStats.choiceImpacts.length > 0
          ? eventStats.choiceImpacts.reduce((a, b) => a.winRateAfterChoice > b.winRateAfterChoice ? a : b).choiceId
          : null,
      };

      if (zScore > 1) {
        mostBeneficialEvents.push(ranking);
      } else if (zScore < -1) {
        mostDetrimentalEvents.push(ranking);
      }
    }

    // 정렬
    mostBeneficialEvents.sort((a, b) => b.netImpact - a.netImpact);
    mostDetrimentalEvents.sort((a, b) => a.netImpact - b.netImpact);
  }

  // 가장 치명적인 선택 찾기
  let mostFatalChoice: { eventId: string; choiceId: string; deathRate: number } | null = null;
  for (const [eventId, eventStats] of eventImpacts) {
    for (const choice of eventStats.choiceImpacts) {
      const deathRate = choice.outcomeDistribution.fatal / Math.max(1, choice.timesChosen);
      if (!mostFatalChoice || deathRate > mostFatalChoice.deathRate) {
        mostFatalChoice = { eventId, choiceId: choice.choiceId, deathRate };
      }
    }
  }

  return {
    eventImpacts,
    mostBeneficialEvents: mostBeneficialEvents.slice(0, 5),
    mostDetrimentalEvents: mostDetrimentalEvents.slice(0, 5),
    overallEventInfluence: {
      winContribution: mostBeneficialEvents.length / Math.max(1, eventImpacts.size),
      lossContribution: mostDetrimentalEvents.length / Math.max(1, eventImpacts.size),
      mostFatalChoice,
    },
  };
}

// ==================== 상징 시너지 영향력 분석 ====================

/**
 * 상징 시너지 영향력 분석
 * - 상징 조합별 승률
 * - 핵심 상징 감지
 * - 상황별 가치 분석
 */
export function analyzeRelicSynergyImpact(stats: DetailedStats): RelicSynergyImpactAnalysis {
  const synergyCombinations = new Map<string, RelicSynergyStats>();
  const topSynergies: RelicSynergyRanking[] = [];
  const antiSynergies: RelicSynergyRanking[] = [];
  const coreRelics: CoreRelicStats[] = [];
  const contextualRelicValues = new Map<string, ContextualRelicValue>();

  // 상징 통계가 있는 경우 분석
  if (stats.relicStats && stats.relicStats.size > 0) {
    const relicList = Array.from(stats.relicStats.entries());

    // 개별 상징 승률 계산
    const individualWinRates = new Map<string, number>();
    for (const [relicId, relicData] of relicList) {
      individualWinRates.set(relicId, relicData.winRateWith || 0.5);

      // 핵심 상징 감지
      const contribution = (relicData.winRateWith || 0.5) - (relicData.winRateWithout || 0.5);
      if (contribution > 0.1 && relicData.timesAcquired >= 3) {
        coreRelics.push({
          relicId,
          relicName: relicData.relicName,
          winRateWith: relicData.winRateWith || 0.5,
          winRateWithout: relicData.winRateWithout || 0.5,
          coreScore: contribution,
          isBuildDefining: contribution > 0.2,
          mustHavePairs: [],
          optimalAcquisitionFloor: relicData.avgAcquireFloor || 5,
        });
      }

      // 상황별 가치 분석 (컨텍스트 통계가 있는 경우)
      if ('contextStats' in relicData && relicData.contextStats) {
        const ctx = relicData.contextStats as {
          byFloorRange?: { early: { avgValue: number }; mid: { avgValue: number }; late: { avgValue: number } };
          byBattleType?: { normal: { avgValue: number }; elite: { avgValue: number }; boss: { avgValue: number } };
        };
        contextualRelicValues.set(relicId, {
          relicId,
          earlyValue: ctx.byFloorRange?.early?.avgValue || 0.5,
          midValue: ctx.byFloorRange?.mid?.avgValue || 0.5,
          lateValue: ctx.byFloorRange?.late?.avgValue || 0.5,
          valueByBattleType: {
            normal: ctx.byBattleType?.normal?.avgValue || 0.5,
            elite: ctx.byBattleType?.elite?.avgValue || 0.5,
            boss: ctx.byBattleType?.boss?.avgValue || 0.5,
          },
          valueByDeckType: {},
          valueFactors: [],
        });
      }
    }

    // 상징 조합 시너지 분석 (기존 시너지 데이터 활용)
    for (const [relicId, relicData] of relicList) {
      if ('synergies' in relicData && Array.isArray(relicData.synergies)) {
        for (const syn of relicData.synergies) {
          const combinationKey = [relicId, syn.relicId].sort().join(':');
          if (synergyCombinations.has(combinationKey)) continue;

          const individualAvg = ((individualWinRates.get(relicId) || 0.5) + (individualWinRates.get(syn.relicId) || 0.5)) / 2;
          const synergyBonus = syn.combinedWinRate - individualAvg;

          const synergyStats: RelicSynergyStats = {
            combinationKey,
            relicIds: [relicId, syn.relicId],
            relicNames: [relicData.relicName, syn.relicId],
            coOccurrences: syn.count,
            combinedWinRate: syn.combinedWinRate,
            individualWinRate: individualAvg,
            synergyBonus,
            activationBoost: 0,
            additionalValue: {
              damageBoost: 0,
              survivalBoost: synergyBonus * 100,
              resourceBoost: 0,
            },
            optimalAcquisitionOrder: synergyBonus > 0 ? [relicId, syn.relicId] : [],
          };

          synergyCombinations.set(combinationKey, synergyStats);

          // 시너지 순위
          if (syn.count >= 2) {
            const ranking: RelicSynergyRanking = {
              combinationKey,
              relicNames: [relicData.relicName, syn.relicId],
              synergyScore: Math.max(0, Math.min(1, 0.5 + synergyBonus)),
              winRateBoost: synergyBonus,
              acquisitionDifficulty: 0.5, // 기본값
              efficiency: synergyBonus / 0.5,
              recommendedContext: [],
            };

            if (synergyBonus > 0.05) {
              topSynergies.push(ranking);
            } else if (synergyBonus < -0.05) {
              antiSynergies.push(ranking);
            }
          }
        }
      }
    }

    // 정렬
    topSynergies.sort((a, b) => b.winRateBoost - a.winRateBoost);
    antiSynergies.sort((a, b) => a.winRateBoost - b.winRateBoost);
    coreRelics.sort((a, b) => b.coreScore - a.coreScore);
  }

  // 상징 수에 따른 승률 곡선 (추정)
  const relicCountImpact: { count: number; winRate: number; avgValue: number }[] = [];
  for (let i = 0; i <= 10; i++) {
    relicCountImpact.push({
      count: i,
      winRate: Math.min(0.9, 0.3 + i * 0.05), // 추정값
      avgValue: i * 10,
    });
  }

  return {
    synergyCombinations,
    topSynergies: topSynergies.slice(0, 10),
    antiSynergies: antiSynergies.slice(0, 5),
    relicCountImpact,
    coreRelics: coreRelics.slice(0, 10),
    contextualRelicValues,
  };
}

// ==================== AI 성장 결정 분석 ====================

/**
 * AI 성장 결정 분석
 * - 성장 선택 패턴
 * - 선택 정확도
 * - 최적 경로 추천
 */
export function analyzeGrowthDecisions(stats: DetailedStats): GrowthDecisionAnalysis {
  const decisions: GrowthDecisionRecord[] = [];
  const reasonsByType: Record<string, Record<string, number>> = {};
  const contextualPatterns: GrowthContextPattern[] = [];
  const commonMistakes: GrowthMistake[] = [];
  const optimalPaths: OptimalGrowthPath[] = [];

  // 성장 통계에서 패턴 추출
  if (stats.growthStats) {
    const { statInvestments, ethosInvestments, pathosInvestments, logosInvestments, growthPathStats, statWinCorrelation } = stats.growthStats;

    // 스탯별 투자 이유 분포 (추정)
    for (const [stat, count] of Object.entries(statInvestments)) {
      if (!reasonsByType[stat]) reasonsByType[stat] = {};
      reasonsByType[stat]['general_boost'] = count;
    }

    // 성장 경로별 분석
    if (growthPathStats && growthPathStats.length > 0) {
      // 최적 경로 추출
      const sortedPaths = [...growthPathStats].sort((a, b) => b.winRate - a.winRate);

      for (const pathStat of sortedPaths.slice(0, 5)) {
        optimalPaths.push({
          pathName: pathStat.path,
          steps: pathStat.path.split('→').map((stat, i) => ({
            floor: (i + 1) * 2,
            stat,
            reason: `${stat} 선택으로 시너지 강화`,
          })),
          winRate: pathStat.winRate,
          recommendedFor: ['일반 플레이'],
          requirements: [],
        });
      }

      // 상황별 패턴 추출
      const avgWinRate = sortedPaths.reduce((sum, p) => sum + p.winRate, 0) / sortedPaths.length;

      for (const pathStat of sortedPaths) {
        if (pathStat.count >= 3) {
          const firstStat = pathStat.path.split('→')[0];
          contextualPatterns.push({
            patternName: `${firstStat} 우선 빌드`,
            conditions: { startWith: firstStat },
            preferredChoices: [{ stat: firstStat, frequency: pathStat.count, winRate: pathStat.winRate }],
            optimalChoice: firstStat,
            frequency: pathStat.count,
          });
        }
      }

      // 실수 분석 (낮은 승률 경로)
      for (const pathStat of sortedPaths.slice(-3)) {
        if (pathStat.winRate < avgWinRate - 0.1 && pathStat.count >= 2) {
          const bestPath = sortedPaths[0];
          commonMistakes.push({
            mistakeType: 'suboptimal_path',
            chosenStat: pathStat.path,
            optimalStat: bestPath.path,
            occurrences: pathStat.count,
            winRateLoss: bestPath.winRate - pathStat.winRate,
            situationDescription: `${pathStat.path} 경로가 ${bestPath.path}보다 승률 ${((bestPath.winRate - pathStat.winRate) * 100).toFixed(1)}%p 낮음`,
          });
        }
      }
    }

    // 스탯 상관관계 기반 패턴
    if (statWinCorrelation) {
      const sortedStats = Object.entries(statWinCorrelation).sort((a, b) => b[1] - a[1]);
      for (const [stat, correlation] of sortedStats) {
        if (correlation > 0.1) {
          contextualPatterns.push({
            patternName: `${stat} 집중`,
            conditions: { highCorrelation: stat },
            preferredChoices: [{ stat, frequency: statInvestments[stat] || 0, winRate: 0.5 + correlation }],
            optimalChoice: stat,
            frequency: statInvestments[stat] || 0,
          });
        }
      }
    }
  }

  // 정확도 계산
  const totalDecisions = decisions.length;
  const correctDecisions = decisions.filter(d => d.wasOptimal).length;
  const correctChoiceRate = totalDecisions > 0 ? correctDecisions / totalDecisions : 0.5;

  return {
    decisions,
    reasonsByType,
    contextualPatterns,
    decisionAccuracy: {
      correctChoiceRate,
      commonMistakes,
      accuracyByContext: {},
    },
    optimalPaths,
  };
}

// ==================== 카드 선택 이유 분석 ====================

/**
 * 카드 선택 이유 분석
 * - 선택/스킵 패턴
 * - 선택 정확도
 * - 카드 가치 평가
 */
export function analyzeCardSelectionReasoning(stats: DetailedStats): CardSelectionReasoningAnalysis {
  const decisions: CardSelectionDecision[] = [];
  const reasonsByCard = new Map<string, Record<string, number>>();
  const commonMistakes: CardSelectionMistake[] = [];
  const cardValueAssessment = new Map<string, CardValueAssessment>();
  const optimalPickGuide: CardPickGuideEntry[] = [];

  // 스킵 이유 분석
  let totalSkips = 0;
  const skipReasonDistribution: Record<string, number> = {};
  const shouldHaveSkipped: { cardId: string; occurrences: number; winRateLoss: number }[] = [];
  const shouldNotHaveSkipped: { cardId: string; occurrences: number; winRateLoss: number }[] = [];

  // 카드 선택 기록 분석
  if (stats.allCardChoices && stats.allCardChoices.length > 0) {
    for (const choice of stats.allCardChoices) {
      if (choice.skipped) {
        totalSkips++;
        skipReasonDistribution['deck_size'] = (skipReasonDistribution['deck_size'] || 0) + 1;
      }
    }
  }

  // 카드별 가치 평가
  if (stats.cardPickStats && stats.cardContributionStats) {
    const { pickRate, timesOffered, timesPicked } = stats.cardPickStats;
    const { winRateWithCard, winRateWithoutCard, contribution } = stats.cardContributionStats;

    for (const cardId of Object.keys(pickRate)) {
      const pr = pickRate[cardId] || 0;
      const wr = winRateWithCard[cardId] || 0.5;
      const wrWithout = winRateWithoutCard[cardId] || 0.5;
      const offered = timesOffered[cardId] || 0;
      const picked = timesPicked[cardId] || 0;

      // 선택 이유 분포 추정
      const reasons: Record<string, number> = {};
      if (wr > wrWithout + 0.1) {
        reasons['power_level'] = picked;
      } else if (pr > 0.5) {
        reasons['deck_synergy'] = picked;
      } else {
        reasons['situational'] = picked;
      }
      reasonsByCard.set(cardId, reasons);

      // 가치 평가
      const assessment: CardValueAssessment = {
        cardId,
        cardName: cardId,
        baseValue: wr,
        contextModifiers: [],
        synergyBonuses: [],
        optimalConditions: wr > 0.6 ? ['항상 좋음'] : ['상황에 따라'],
        skipConditions: wr < 0.4 ? ['낮은 승률'] : [],
      };
      cardValueAssessment.set(cardId, assessment);

      // 실수 분석
      // 픽률 높지만 승률 낮은 카드 = 과대평가 (스킵해야 했음)
      if (pr > 0.5 && wr < wrWithout - 0.05 && offered >= 5) {
        shouldHaveSkipped.push({
          cardId,
          occurrences: picked,
          winRateLoss: wrWithout - wr,
        });
        commonMistakes.push({
          mistakeType: 'should_skip',
          pickedCard: cardId,
          optimalCard: null,
          occurrences: picked,
          winRateLoss: wrWithout - wr,
          situationDescription: `${cardId} 선택 시 승률 ${((wrWithout - wr) * 100).toFixed(1)}%p 하락`,
        });
      }

      // 픽률 낮지만 승률 높은 카드 = 과소평가 (스킵하지 말았어야 함)
      if (pr < 0.3 && wr > wrWithout + 0.1 && offered >= 5) {
        const skipped = offered - picked;
        shouldNotHaveSkipped.push({
          cardId,
          occurrences: skipped,
          winRateLoss: wr - wrWithout,
        });
        commonMistakes.push({
          mistakeType: 'should_not_skip',
          pickedCard: null,
          optimalCard: cardId,
          occurrences: skipped,
          winRateLoss: wr - wrWithout,
          situationDescription: `${cardId} 스킵 시 승률 ${((wr - wrWithout) * 100).toFixed(1)}%p 손실`,
        });
      }
    }

    // 최적 픽 가이드 생성
    const sortedByContribution = Object.entries(contribution || {}).sort((a, b) => b[1] - a[1]);

    // 일반 상황 가이드
    optimalPickGuide.push({
      situation: '일반 상황',
      conditions: {},
      recommendedPicks: sortedByContribution.slice(0, 5).map(([cardId, contrib], i) => ({
        cardId,
        priority: 5 - i,
        reason: `기여도 ${((contrib || 0) * 100).toFixed(1)}%p`,
      })),
      avoidPicks: sortedByContribution.slice(-3).map(([cardId]) => ({
        cardId,
        reason: '낮은 기여도',
      })),
      shouldSkip: false,
    });

    // 덱 크기별 가이드
    optimalPickGuide.push({
      situation: '덱이 큰 경우 (15장+)',
      conditions: { deckSize: 15 },
      recommendedPicks: [],
      avoidPicks: [],
      shouldSkip: true,
      skipReason: '덱 비대화 방지',
    });
  }

  const skipReasonAnalysis: SkipReasonAnalysis = {
    totalSkips,
    reasonDistribution: skipReasonDistribution,
    winRateAfterSkip: 0.5, // 기본값
    shouldHaveSkipped,
    shouldNotHaveSkipped,
  };

  // 정확도 계산
  const totalDecisions = decisions.length;
  const correctDecisions = decisions.filter(d => d.wasOptimal).length;
  const correctRate = totalDecisions > 0 ? correctDecisions / totalDecisions : 0.5;

  return {
    decisions,
    reasonsByCard,
    skipReasonAnalysis,
    selectionAccuracy: {
      correctRate,
      commonMistakes,
      accuracyByContext: {},
    },
    cardValueAssessment,
    optimalPickGuide,
  };
}

// ==================== 영향력 분석 문제점 추출 ====================

/**
 * 이벤트 영향력 분석에서 문제점 추출
 */
export function analyzeEventImpactProblems(stats: DetailedStats): Problem[] {
  const problems: Problem[] = [];
  const analysis = analyzeEventImpact(stats);

  // 치명적인 이벤트 선택
  if (analysis.overallEventInfluence.mostFatalChoice) {
    const fatal = analysis.overallEventInfluence.mostFatalChoice;
    if (fatal.deathRate > 0.3) {
      problems.push({
        category: 'design',
        description: `이벤트 "${fatal.eventId}"의 선택지 "${fatal.choiceId}"가 ${(fatal.deathRate * 100).toFixed(0)}% 확률로 치명적`,
        severity: fatal.deathRate > 0.5 ? 5 : 4,
        confidence: 0.7,
        relatedData: { eventId: fatal.eventId, choiceId: fatal.choiceId, deathRate: fatal.deathRate },
        methodology: '이벤트 영향력 분석',
      });
    }
  }

  // 극단적으로 부정적인 이벤트
  for (const event of analysis.mostDetrimentalEvents) {
    if (event.netImpact < -0.1) {
      problems.push({
        category: 'balance',
        description: `이벤트 "${event.eventName}" 승률 영향 ${(event.netImpact * 100).toFixed(1)}%p - 조정 필요`,
        severity: event.netImpact < -0.2 ? 4 : 3,
        confidence: 0.6,
        relatedData: { eventId: event.eventId, netImpact: event.netImpact, zScore: event.zScore },
        methodology: '이벤트 영향력 Z-score 분석',
      });
    }
  }

  return problems;
}

/**
 * 상징 시너지 분석에서 문제점 추출
 */
export function analyzeRelicSynergyProblems(stats: DetailedStats): Problem[] {
  const problems: Problem[] = [];
  const analysis = analyzeRelicSynergyImpact(stats);

  // OP 시너지
  for (const synergy of analysis.topSynergies.slice(0, 3)) {
    if (synergy.winRateBoost > 0.15) {
      problems.push({
        category: 'balance',
        description: `상징 조합 "${synergy.relicNames.join(' + ')}" 시너지가 과도함 (+${(synergy.winRateBoost * 100).toFixed(1)}%p)`,
        severity: synergy.winRateBoost > 0.25 ? 4 : 3,
        confidence: 0.6,
        relatedData: { combinationKey: synergy.combinationKey, winRateBoost: synergy.winRateBoost },
        methodology: '상징 시너지 분석',
      });
    }
  }

  // 핵심 상징이 너무 강함
  for (const core of analysis.coreRelics.slice(0, 3)) {
    if (core.coreScore > 0.2) {
      problems.push({
        category: 'balance',
        description: `상징 "${core.relicName}"이 필수급 (+${(core.coreScore * 100).toFixed(1)}%p 승률)`,
        severity: core.coreScore > 0.3 ? 5 : 4,
        confidence: 0.7,
        relatedData: { relicId: core.relicId, coreScore: core.coreScore },
        methodology: '핵심 상징 분석',
      });
    }
  }

  // 안티 시너지
  for (const anti of analysis.antiSynergies) {
    if (anti.winRateBoost < -0.1) {
      problems.push({
        category: 'design',
        description: `상징 조합 "${anti.relicNames.join(' + ')}"이 안티시너지 (${(anti.winRateBoost * 100).toFixed(1)}%p)`,
        severity: 2,
        confidence: 0.5,
        relatedData: { combinationKey: anti.combinationKey, winRateBoost: anti.winRateBoost },
        methodology: '안티시너지 분석',
      });
    }
  }

  return problems;
}

/**
 * 성장 결정 분석에서 문제점 추출
 */
export function analyzeGrowthDecisionProblems(stats: DetailedStats): Problem[] {
  const problems: Problem[] = [];
  const analysis = analyzeGrowthDecisions(stats);

  // 자주 발생하는 실수
  for (const mistake of analysis.decisionAccuracy.commonMistakes) {
    if (mistake.winRateLoss > 0.1 && mistake.occurrences >= 3) {
      problems.push({
        category: 'design',
        description: `성장 경로 "${mistake.chosenStat}"이 최적 경로 "${mistake.optimalStat}"보다 ${(mistake.winRateLoss * 100).toFixed(1)}%p 낮음`,
        severity: mistake.winRateLoss > 0.15 ? 4 : 3,
        confidence: calculateConfidence(mistake.occurrences, 5),
        relatedData: { chosenStat: mistake.chosenStat, optimalStat: mistake.optimalStat, winRateLoss: mistake.winRateLoss },
        methodology: 'AI 성장 결정 분석',
      });
    }
  }

  return problems;
}

/**
 * 카드 선택 분석에서 문제점 추출
 */
export function analyzeCardSelectionProblems(stats: DetailedStats): Problem[] {
  const problems: Problem[] = [];
  const analysis = analyzeCardSelectionReasoning(stats);

  // 스킵해야 했는데 안 한 카드
  for (const skip of analysis.skipReasonAnalysis.shouldHaveSkipped) {
    if (skip.winRateLoss > 0.05 && skip.occurrences >= 3) {
      problems.push({
        category: 'design',
        description: `카드 "${skip.cardId}" 과대평가됨 - 선택 시 승률 ${(skip.winRateLoss * 100).toFixed(1)}%p 하락`,
        severity: skip.winRateLoss > 0.1 ? 4 : 3,
        confidence: calculateConfidence(skip.occurrences, 5),
        relatedData: { cardId: skip.cardId, winRateLoss: skip.winRateLoss },
        methodology: '카드 선택 이유 분석',
      });
    }
  }

  // 스킵하지 말았어야 하는 카드
  for (const noSkip of analysis.skipReasonAnalysis.shouldNotHaveSkipped) {
    if (noSkip.winRateLoss > 0.05 && noSkip.occurrences >= 3) {
      problems.push({
        category: 'design',
        description: `카드 "${noSkip.cardId}" 과소평가됨 - 스킵 시 승률 ${(noSkip.winRateLoss * 100).toFixed(1)}%p 손실`,
        severity: noSkip.winRateLoss > 0.1 ? 4 : 3,
        confidence: calculateConfidence(noSkip.occurrences, 5),
        relatedData: { cardId: noSkip.cardId, winRateLoss: noSkip.winRateLoss },
        methodology: '카드 선택 이유 분석',
      });
    }
  }

  return problems;
}

// ==================== 종합 분석 ====================

/**
 * 전체 통계 종합 분석
 */
export function analyzeStats(stats: DetailedStats): AnalysisResult {
  // 1. 동적 임계값 계산
  const thresholds = calculateDynamicThresholds(stats);

  // 2. 각 영역 분석
  const allProblems: Problem[] = [
    ...analyzeEnemyBalance(stats, thresholds),
    ...analyzeEnemyGroupBalance(stats, thresholds),
    ...analyzeCardBalance(stats, thresholds),
    ...analyzeCardContexts(stats, thresholds),
    ...analyzeTokenBalance(stats),
    ...analyzePokerComboBalance(stats),
    ...analyzeFloorProgression(stats),
    ...analyzeProgressionCurve(stats),
    ...analyzeSynergies(stats, thresholds),
    ...analyzeGrowthPaths(stats),
    // 새로운 영향력 분석
    ...analyzeEventImpactProblems(stats),
    ...analyzeRelicSynergyProblems(stats),
    ...analyzeGrowthDecisionProblems(stats),
    ...analyzeCardSelectionProblems(stats),
  ];

  // 3. 신뢰도 가중 심각도 정렬
  allProblems.sort((a, b) => {
    const weightedA = a.severity * a.confidence;
    const weightedB = b.severity * b.confidence;
    return weightedB - weightedA;
  });

  // 4. 메타 분석
  const metaAnalysis: MetaAnalysis = {
    avgWinRate: thresholds.winRate.mean,
    winRateStdDev: thresholds.winRate.stdDev,
    avgPickRate: thresholds.pickRate.mean,
    pickRateStdDev: thresholds.pickRate.stdDev,
    cardQuadrants: analyzeCardQuadrants(stats, thresholds),
    learningCurveItems: detectLearningCurves(stats),
  };

  // 5. 신뢰도 평가
  const sampleSize = stats.runStats.totalRuns;
  const confidence: ConfidenceLevel = {
    level: sampleSize >= 50 ? 'high' : sampleSize >= 20 ? 'medium' : 'low',
    sampleSize,
    minimumRequired: 20,
    message: sampleSize < 20
      ? `⚠️ 샘플 ${sampleSize}개 - 최소 20개 필요. 결론 보류 권장 (Riot: "data-informed, not data-driven")`
      : sampleSize < 50
        ? `샘플 ${sampleSize}개 - 중간 신뢰도. 주요 트렌드는 파악 가능`
        : `샘플 ${sampleSize}개 - 높은 신뢰도`,
  };

  // 6. 원인 분석
  const rootCauses: RootCause[] = allProblems.slice(0, 5).map((problem, index) => {
    let type: RootCause['type'] = 'stat_mismatch';
    let description = '';
    const counterEvidence: string[] = [];

    // 학습 곡선 체크
    const learningItem = metaAnalysis.learningCurveItems.find(
      item => item.id === problem.relatedData.cardId || item.id === problem.relatedData.enemyId
    );
    if (learningItem) {
      type = 'learning_curve';
      description = learningItem.recommendation;
      counterEvidence.push('학습 곡선이 감지됨 - 즉각적 밸런스 조정보다 모니터링 권장');
    } else {
      switch (problem.category) {
        case 'player_weakness':
          type = 'insufficient_options';
          description = `플레이어 카드 풀에서 ${problem.relatedData.enemyId} 대응 옵션 부족`;
          break;
        case 'balance':
          type = 'stat_mismatch';
          description = `${problem.relatedData.cardId || problem.relatedData.enemyId}의 스탯이 Z-score 기준 이상치`;
          break;
        case 'synergy':
          type = 'synergy_gap';
          description = '빌드 다양성 부족으로 특정 조합에 의존';
          break;
        case 'progression':
          type = 'tempo_issue';
          description = '덱 성장 곡선과 적 강화 곡선 불일치';
          break;
        default:
          type = 'stat_mismatch';
          description = '밸런스 조정 필요';
      }
    }

    return {
      problemIndex: index,
      type,
      description,
      evidence: [problem.description],
      counterEvidence: counterEvidence.length > 0 ? counterEvidence : undefined,
    };
  });

  // 7. 개선 제안 (A/B 테스트 포함)
  const recommendations: Recommendation[] = allProblems.slice(0, 5).map((problem, index) => {
    let type: Recommendation['type'] = 'adjust_curve';
    let suggestion = '';
    let expectedImpact = '';
    let testConfig: ABTestConfig | undefined;

    // 낮은 신뢰도면 모니터링 권장
    if (problem.confidence < 0.5) {
      type = 'monitor';
      suggestion = `${problem.relatedData.cardId || problem.relatedData.enemyId || '해당 영역'} 추가 데이터 수집 후 재분석`;
      expectedImpact = '신뢰도 향상 후 정확한 판단 가능';
    } else {
      switch (problem.category) {
        case 'player_weakness':
          type = 'add_option';
          suggestion = `${problem.relatedData.enemyId} 대응용 카드 추가 또는 기존 카드 버프`;
          expectedImpact = '해당 전투 승률 10-15% 상승 예상';
          testConfig = {
            controlGroup: 'current',
            testGroup: 'with_counter_option',
            suggestedSampleSize: 30,
            successMetric: `${problem.relatedData.enemyId} 전투 승률`,
          };
          break;
        case 'balance':
          if (problem.relatedData.quadrant === 'overpowered') {
            type = 'buff_card';
            suggestion = `${problem.relatedData.cardId}의 대안 카드들을 버프 (직접 너프보다 우선)`;
            expectedImpact = '픽률 분산으로 메타 다양성 증가';
          } else if (problem.relatedData.quadrant === 'weak') {
            type = 'buff_card';
            suggestion = `${problem.relatedData.cardId} 효용 증가 필요`;
            expectedImpact = '픽률 상승으로 카드 활용도 정상화';
            testConfig = {
              controlGroup: 'current_stats',
              testGroup: 'buffed_stats',
              suggestedSampleSize: 20,
              successMetric: '픽률 및 보유시 승률',
            };
          } else {
            type = 'ab_test';
            suggestion = `${problem.relatedData.cardId} A/B 테스트로 최적 수치 탐색`;
            expectedImpact = '데이터 기반 정밀 조정';
          }
          break;
        case 'synergy':
          type = 'improve_synergy';
          suggestion = '대체 시너지 경로 강화 또는 새 조합 추가';
          expectedImpact = '빌드 다양성 증가';
          break;
        case 'progression':
          type = 'adjust_curve';
          suggestion = `${problem.relatedData.layer}층 전후 난이도 곡선 조정`;
          expectedImpact = '해당 구간 사망률 감소';
          break;
        default:
          type = 'monitor';
          suggestion = '추가 모니터링 필요';
          expectedImpact = '트렌드 파악';
      }
    }

    return {
      type,
      target: String(problem.relatedData.cardId || problem.relatedData.enemyId || problem.relatedData.layer || '전반'),
      suggestion,
      expectedImpact,
      priority: Math.min(5, 6 - index),
      testConfig,
    };
  });

  // 8. 난이도별 밸런스 평가
  const difficulty = stats.runStats.difficulty ?? 3; // 기본 난이도 3
  const targetConfig = DIFFICULTY_TARGET_WIN_RATES[difficulty] || DIFFICULTY_TARGET_WIN_RATES[3];
  const actualWinRate = stats.runStats.successRate;
  const diff = actualWinRate - targetConfig.target;
  const isOnTarget = Math.abs(diff) <= targetConfig.tolerance;

  let assessment = '';
  let adjustmentNeeded: DifficultyAssessment['adjustmentNeeded'] = 'none';

  if (isOnTarget) {
    assessment = `✅ 목표 달성 - 난이도 ${difficulty} 밸런스 적절 (${targetConfig.description})`;
  } else if (diff > 0) {
    assessment = `⚠️ 너무 쉬움 - 승률 ${(actualWinRate * 100).toFixed(1)}%가 목표 ${(targetConfig.target * 100).toFixed(1)}%보다 ${(diff * 100).toFixed(1)}%p 높음`;
    adjustmentNeeded = 'harder';
  } else {
    assessment = `⚠️ 너무 어려움 - 승률 ${(actualWinRate * 100).toFixed(1)}%가 목표 ${(targetConfig.target * 100).toFixed(1)}%보다 ${(Math.abs(diff) * 100).toFixed(1)}%p 낮음`;
    adjustmentNeeded = 'easier';
  }

  const difficultyAssessment: DifficultyAssessment = {
    difficulty,
    targetWinRate: targetConfig.target,
    actualWinRate,
    tolerance: targetConfig.tolerance,
    isOnTarget,
    assessment,
    adjustmentNeeded,
  };

  // 9. AI 시뮬레이션 한계 경고
  const aiLimitationWarnings: string[] = [
    AI_LIMITATION_WARNINGS.PICK_RATE_BIAS,
    AI_LIMITATION_WARNINGS.FUN_FACTOR,
  ];

  if (sampleSize < 50) {
    aiLimitationWarnings.push(AI_LIMITATION_WARNINGS.SAMPLE_SIZE);
  }

  if (metaAnalysis.cardQuadrants.hiddenGem.length > 2) {
    aiLimitationWarnings.push(AI_LIMITATION_WARNINGS.SYNERGY_BLIND_SPOT);
  }

  // 10. 추가 조사 필요 항목
  const needsInvestigation: string[] = [];

  if (confidence.level === 'low') {
    needsInvestigation.push(`샘플 크기 부족 (${sampleSize}개) - 최소 20런 이상 수집 필요`);
  }

  if (metaAnalysis.learningCurveItems.length > 0) {
    needsInvestigation.push(`학습 곡선 의심 항목 ${metaAnalysis.learningCurveItems.length}개 - 시간 경과 후 재분석 권장`);
  }

  if (metaAnalysis.cardQuadrants.hiddenGem.length > 3) {
    needsInvestigation.push(`히든젬 ${metaAnalysis.cardQuadrants.hiddenGem.length}개 발견 - 플레이어 가이드/튜토리얼 개선 고려`);
  }

  if (!isOnTarget) {
    needsInvestigation.push(`난이도 ${difficulty} 밸런스 조정 필요 - ${adjustmentNeeded === 'easier' ? '쉽게' : '어렵게'} 조정 고려`);
  }

  needsInvestigation.push('⚠️ 직접 플레이 테스트 필수 - AI 분석만으로 밸런스 결정 금지');

  // 11. 요약 생성
  const highConfidenceProblems = allProblems.filter(p => p.severity >= 4 && p.confidence >= 0.7);
  const summary = confidence.level === 'low'
    ? `⚠️ 데이터 부족 (${sampleSize}런) - ${allProblems.length}개 잠재적 이슈 감지됨, 추가 데이터 필요`
    : highConfidenceProblems.length > 0
      ? `${highConfidenceProblems.length}개의 확실한 문제 발견 (신뢰도 70%+): ${highConfidenceProblems.slice(0, 3).map(p => p.description.split(':')[0]).join(', ')}`
      : allProblems.length > 0
        ? `${allProblems.length}개의 개선 포인트 발견 (메타 안정적)`
        : '주요 문제 없음 - 밸런스 양호';

  return {
    summary: `${summary} | ${difficultyAssessment.assessment}`,
    confidence,
    difficultyAssessment,
    aiLimitationWarnings,
    problems: allProblems,
    rootCauses,
    recommendations,
    needsInvestigation,
    metaAnalysis,
  };
}

// ==================== AI 분석 가이드라인 출력 ====================

/**
 * AI를 위한 분석 가이드라인 텍스트 생성
 */
export function generateAnalysisGuidelines(stats: DetailedStats): string {
  const analysis = analyzeStats(stats);
  const lines: string[] = [];

  lines.push('# 시뮬레이션 분석 리포트 v3 - 하하하GO 맞춤형');
  lines.push('');

  // AI 한계 경고 (맨 위에 표시)
  lines.push('## ⚠️ AI 시뮬레이션 한계');
  lines.push('');
  analysis.aiLimitationWarnings.forEach(warning => {
    lines.push(`- ${warning}`);
  });
  lines.push('');

  // 난이도별 밸런스 평가
  lines.push('## 🎯 난이도 밸런스 평가');
  lines.push('');
  const da = analysis.difficultyAssessment;
  lines.push(`- 난이도: **${da.difficulty}** (${DIFFICULTY_TARGET_WIN_RATES[da.difficulty]?.description || '알 수 없음'})`);
  lines.push(`- 목표 승률: ${(da.targetWinRate * 100).toFixed(0)}% ±${(da.tolerance * 100).toFixed(0)}%`);
  lines.push(`- 실제 승률: ${(da.actualWinRate * 100).toFixed(1)}%`);
  lines.push(`- 평가: ${da.assessment}`);
  if (da.adjustmentNeeded !== 'none') {
    lines.push(`- 조정 방향: **${da.adjustmentNeeded === 'easier' ? '쉽게' : '어렵게'}** 조정 필요`);
  }
  lines.push('');

  lines.push('## 분석 방법론');
  lines.push('- Riot Games: 동적 임계값 (평균 ±2σ), 학습 곡선');
  lines.push('- Supercell: Use Rate + Win Rate 4분면 매트릭스');
  lines.push('- MegaCrit (StS): 카드 경쟁 분석');
  lines.push('- **하하하GO 맞춤**: 난이도별 목표 승률, AI 편향 고려');
  lines.push('');

  lines.push('## 데이터 신뢰도');
  lines.push(`- 레벨: **${analysis.confidence.level.toUpperCase()}**`);
  lines.push(`- ${analysis.confidence.message}`);
  lines.push('');

  lines.push('## 메타 분석');
  lines.push(`- 평균 승률: ${(analysis.metaAnalysis.avgWinRate * 100).toFixed(1)}% (σ=${(analysis.metaAnalysis.winRateStdDev * 100).toFixed(1)}%)`);
  lines.push(`- 평균 픽률: ${(analysis.metaAnalysis.avgPickRate * 100).toFixed(1)}% (σ=${(analysis.metaAnalysis.pickRateStdDev * 100).toFixed(1)}%)`);
  lines.push('');

  // 4분면 요약
  const q = analysis.metaAnalysis.cardQuadrants;
  lines.push('### 카드 4분면 분류 (Supercell 스타일)');
  lines.push(`- 🔴 OP (높픽+높승): ${q.overpowered.length > 0 ? q.overpowered.join(', ') : '없음'}`);
  lines.push(`- 🟡 함정 (높픽+낮승): ${q.trap.length > 0 ? q.trap.join(', ') : '없음'}`);
  lines.push(`- 🟢 히든젬 (낮픽+높승): ${q.hiddenGem.length > 0 ? q.hiddenGem.join(', ') : '없음'}`);
  lines.push(`- ⚫ 약함 (낮픽+낮승): ${q.weak.length > 0 ? q.weak.slice(0, 5).join(', ') : '없음'}`);
  lines.push('');

  lines.push('## 요약');
  lines.push(analysis.summary);
  lines.push('');

  if (analysis.problems.length > 0) {
    lines.push('## 문제점 분석');
    lines.push('');
    lines.push('심각도 × 신뢰도 가중 정렬됨');
    lines.push('');

    analysis.problems.slice(0, 10).forEach((problem, i) => {
      const confidenceBar = '█'.repeat(Math.round(problem.confidence * 5)) + '░'.repeat(5 - Math.round(problem.confidence * 5));
      lines.push(`### ${i + 1}. [${problem.category.toUpperCase()}] 심각도 ${problem.severity}/5 | 신뢰도 ${confidenceBar}`);
      lines.push(problem.description);
      lines.push(`> 방법론: ${problem.methodology}`);
      lines.push('');
    });
  }

  if (analysis.rootCauses.length > 0) {
    lines.push('## 원인 분석');
    lines.push('');

    analysis.rootCauses.forEach((cause) => {
      lines.push(`- **${cause.type}**: ${cause.description}`);
      cause.evidence.forEach(e => lines.push(`  - 근거: ${e}`));
      if (cause.counterEvidence) {
        cause.counterEvidence.forEach(ce => lines.push(`  - ⚠️ 반론: ${ce}`));
      }
    });
    lines.push('');
  }

  if (analysis.recommendations.length > 0) {
    lines.push('## 개선 권장사항');
    lines.push('');

    analysis.recommendations.forEach((rec, i) => {
      lines.push(`### ${i + 1}. [우선순위 ${rec.priority}] ${rec.target}`);
      lines.push(`- 유형: ${rec.type}`);
      lines.push(`- 제안: ${rec.suggestion}`);
      lines.push(`- 예상 효과: ${rec.expectedImpact}`);
      if (rec.testConfig) {
        lines.push(`- 📊 A/B 테스트: ${rec.testConfig.testGroup} vs ${rec.testConfig.controlGroup} (n=${rec.testConfig.suggestedSampleSize})`);
      }
      lines.push('');
    });
  }

  if (analysis.needsInvestigation.length > 0) {
    lines.push('## 추가 조사 필요');
    lines.push('');
    analysis.needsInvestigation.forEach(item => {
      lines.push(`- ${item}`);
    });
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## 하하하GO 분석 가이드라인');
  lines.push('');
  lines.push('### 핵심 원칙');
  lines.push('1. **AI 분석은 참고용**: 최종 결정은 직접 플레이 테스트 후');
  lines.push('2. **난이도별 목표 승률 준수**: 난이도 1(75%) ~ 5(15%)');
  lines.push('3. **재미 > 밸런스**: 숫자보다 플레이 경험 우선');
  lines.push('4. **버프 우선 정책**: 너프보다 약한 것 강화');
  lines.push('');
  lines.push('### 업계 참고 (하하하GO 맞춤 적용)');
  lines.push('- Riot: 동적 임계값 사용 (단, PvP 50% 목표 → 난이도별 목표로 조정)');
  lines.push('- Supercell: 4분면 분석 사용 (단, AI 픽률 편향 고려)');
  lines.push('- StS: 카드 경쟁 분석 사용 (가장 유사한 장르)');
  lines.push('');
  lines.push('### 향후 개선 방향');
  lines.push('1. 실제 플레이어 데이터 수집 시스템');
  lines.push('2. "재미" 지표 정량화 시도 (극적 역전, 콤보 달성률 등)');
  lines.push('3. 난이도별 AI 전략 다양화');
  lines.push('4. 플레이어 실수 패턴 시뮬레이션');
  lines.push('5. 지속적인 방법론 검증 및 조정');
  lines.push('');

  return lines.join('\n');
}

// ==================== 내보내기 ====================

export const StatsAnalyzer = {
  // 메인 분석
  analyzeStats,
  generateAnalysisGuidelines,
  // 개별 분석
  analyzeEnemyBalance,
  analyzeEnemyGroupBalance,
  analyzeCardBalance,
  analyzeCardContexts,
  analyzeTokenBalance,
  analyzePokerComboBalance,
  analyzeFloorProgression,
  analyzeProgressionCurve,
  analyzeSynergies,
  analyzeGrowthPaths,
  // 영향력 분석 (신규)
  analyzeEventImpact,
  analyzeRelicSynergyImpact,
  analyzeGrowthDecisions,
  analyzeCardSelectionReasoning,
  // 영향력 분석 문제점 추출 (신규)
  analyzeEventImpactProblems,
  analyzeRelicSynergyProblems,
  analyzeGrowthDecisionProblems,
  analyzeCardSelectionProblems,
  // 유틸리티
  calculateDynamicThresholds,
  analyzeCardQuadrants,
  analyzeCardCompetition,
  analyzeEnemyDamageProfiles,
  detectLearningCurves,
  calculateZScore,
  calculateConfidence,
  wilsonScoreLower,
  // 하하하GO 설정
  DIFFICULTY_TARGET_WIN_RATES,
  AI_LIMITATION_WARNINGS,
};

export default StatsAnalyzer;
