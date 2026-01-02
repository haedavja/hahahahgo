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

import type { DetailedStats } from './detailed-stats-types';

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
    ...analyzeCardBalance(stats, thresholds),
    ...analyzeProgressionCurve(stats),
    ...analyzeSynergies(stats, thresholds),
    ...analyzeGrowthPaths(stats),
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
  analyzeCardBalance,
  analyzeProgressionCurve,
  analyzeSynergies,
  analyzeGrowthPaths,
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
