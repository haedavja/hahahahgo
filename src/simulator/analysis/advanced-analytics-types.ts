/**
 * @file advanced-analytics-types.ts
 * @description 고급 분석 시스템 타입 정의
 *
 * 게임의 모든 부분을 통계화하기 위한 확장 타입들
 */

import type { BalanceRecommendation } from './balance-insights';

// ==================== 1. 런 진행 분석 ====================

/** 층별 사망률 분석 */
export interface FloorDeathRateAnalysis {
  floor: number;
  totalReached: number;
  deaths: number;
  deathRate: number;
  /** 전체 평균 대비 배수 */
  deathRateMultiplier: number;
  /** 주요 사망 원인 적 TOP 3 */
  topKillers: { enemyId: string; enemyName: string; kills: number; percentage: number }[];
  /** 사망 원인 유형 분포 */
  causeDistribution: Record<string, number>;
  /** 권장사항 */
  suggestion: string | null;
}

/** 층별 덱 상태 분석 */
export interface FloorDeckStateAnalysis {
  floor: number;
  /** 평균 덱 크기 */
  avgDeckSize: number;
  /** 평균 공격 카드 수 */
  avgAttacks: number;
  /** 평균 스킬 카드 수 */
  avgSkills: number;
  /** 평균 파워 카드 수 */
  avgPowers: number;
  /** 승리 런의 평균 덱 크기 */
  winningAvgDeckSize: number;
  /** 패배 런의 평균 덱 크기 */
  losingAvgDeckSize: number;
  /** 최적 덱 크기 범위 */
  optimalDeckSizeRange: [number, number];
}

/** 카드 픽 타이밍 분석 */
export interface CardPickTimingAnalysis {
  cardId: string;
  cardName: string;
  /** 층별 픽률 */
  pickRateByFloor: { floor: number; pickRate: number; count: number }[];
  /** 최적 픽 시점 (층) */
  optimalPickFloor: number;
  /** 초반 픽 승률 (1-5층) */
  earlyPickWinRate: number;
  /** 중반 픽 승률 (6-10층) */
  midPickWinRate: number;
  /** 후반 픽 승률 (11+층) */
  latePickWinRate: number;
  /** 타이밍 권장사항 */
  timing: 'early_priority' | 'mid_priority' | 'late_priority' | 'always_good' | 'situational';
}

/** 보스별 승률 분석 */
export interface BossWinRateAnalysis {
  bossId: string;
  bossName: string;
  encounters: number;
  wins: number;
  winRate: number;
  /** 평균 전투 턴 */
  avgTurns: number;
  /** 평균 받은 피해 */
  avgDamageTaken: number;
  /** 승리 시 남은 HP */
  avgHpRemaining: number;
  /** 효과적인 카드 TOP 5 */
  effectiveCards: { cardId: string; cardName: string; winRateBoost: number }[];
  /** 효과적인 상징 TOP 5 */
  effectiveRelics: { relicId: string; relicName: string; winRateBoost: number }[];
  /** 비효과적인 전략 */
  ineffectiveStrategies: string[];
  /** 권장 대응 전략 */
  recommendations: string[];
}

/** 카드 제거 효과 분석 */
export interface CardRemovalAnalysis {
  /** 총 제거 횟수 */
  totalRemovals: number;
  /** 런당 평균 제거 */
  avgRemovalsPerRun: number;
  /** 제거된 카드별 통계 */
  removalsByCard: {
    cardId: string;
    cardName: string;
    removalCount: number;
    /** 제거 후 런 승률 */
    winRateAfterRemoval: number;
    /** 제거 안했을 때 예상 승률 */
    expectedWinRateWithout: number;
    /** 제거 가치 */
    removalValue: number;
  }[];
  /** 최적 제거 대상 (순위) */
  priorityRemovals: string[];
  /** 제거하면 안되는 카드 */
  neverRemove: string[];
}

/** 런 진행 통합 분석 */
export interface RunProgressionAnalysis {
  /** 층별 사망률 */
  deathRateByFloor: FloorDeathRateAnalysis[];
  /** 층별 덱 상태 */
  deckStateByFloor: FloorDeckStateAnalysis[];
  /** 카드 픽 타이밍 */
  cardPickTiming: CardPickTimingAnalysis[];
  /** 보스별 승률 */
  bossWinRates: BossWinRateAnalysis[];
  /** 카드 제거 효과 */
  cardRemoval: CardRemovalAnalysis;
  /** 주요 인사이트 */
  keyInsights: string[];
  /** 권장사항 */
  recommendations: BalanceRecommendation[];
}

// ==================== 2. 시너지 분석 강화 ====================

/** 덱 아키타입 정의 */
export interface DeckArchetype {
  id: string;
  name: string;
  description: string;
  /** 핵심 카드 */
  coreCards: string[];
  /** 핵심 특성 */
  coreTraits: string[];
  /** 사용 빈도 */
  frequency: number;
  /** 승률 */
  winRate: number;
  /** 강점 */
  strengths: string[];
  /** 약점 */
  weaknesses: string[];
  /** 상성 좋은 적 */
  goodMatchups: string[];
  /** 상성 나쁜 적 */
  badMatchups: string[];
}

/** 3카드 시너지 분석 */
export interface TripleCardSynergy {
  cards: [string, string, string];
  cardNames: [string, string, string];
  /** 함께 등장 횟수 */
  coOccurrences: number;
  /** 함께 있을 때 승률 */
  combinedWinRate: number;
  /** 개별 평균 승률 */
  individualAvgWinRate: number;
  /** 시너지 보너스 */
  synergyBonus: number;
  /** 시너지 설명 */
  synergyReason: string;
}

/** 상징+카드 시너지 분석 */
export interface RelicCardSynergy {
  relicId: string;
  relicName: string;
  cardId: string;
  cardName: string;
  /** 함께 등장 횟수 */
  coOccurrences: number;
  /** 함께 있을 때 승률 */
  combinedWinRate: number;
  /** 개별 승률 평균 */
  individualAvgWinRate: number;
  /** 시너지 보너스 */
  synergyBonus: number;
  /** 시너지 유형 */
  synergyType: 'multiplicative' | 'additive' | 'enabling' | 'protective';
  /** 시너지 설명 */
  description: string;
}

/** 포커 조합 효율 분석 */
export interface PokerHandEfficiency {
  handType: string;
  handName: string;
  /** 발동 횟수 */
  occurrences: number;
  /** 승리 전투에서 발동 비율 */
  winBattleRate: number;
  /** 평균 에테르 획득 */
  avgEtherGained: number;
  /** 승률 기여도 */
  winContribution: number;
  /** 난이도 (발동 용이성, 0-1) */
  triggerDifficulty: number;
  /** 효율성 점수 (기여도/난이도) */
  efficiencyScore: number;
  /** 최적 카드 조합 */
  optimalCardCombos: { cards: string[]; frequency: number }[];
  /** 강화 제안 */
  balanceSuggestion: string | null;
}

/** 시너지 분석 통합 */
export interface SynergyAnalysis {
  /** 덱 아키타입 */
  archetypes: DeckArchetype[];
  /** 2카드 시너지 TOP 20 */
  topDualSynergies: { cards: [string, string]; winRate: number; synergyBonus: number }[];
  /** 3카드 시너지 TOP 10 */
  topTripleSynergies: TripleCardSynergy[];
  /** 상징+카드 시너지 TOP 15 */
  topRelicCardSynergies: RelicCardSynergy[];
  /** 포커 조합 효율 */
  pokerHandEfficiency: PokerHandEfficiency[];
  /** 안티 시너지 (피해야 할 조합) */
  antiSynergies: { items: string[]; penalty: number; reason: string }[];
  /** 권장사항 */
  recommendations: BalanceRecommendation[];
}

// ==================== 3. 경제/자원 분석 ====================

/** 에테르 효율성 분석 */
export interface EtherEfficiencyAnalysis {
  /** 총 에테르 획득 */
  totalEtherGained: number;
  /** 런당 평균 에테르 */
  avgEtherPerRun: number;
  /** 전투당 평균 에테르 */
  avgEtherPerBattle: number;
  /** 에테르 획득원별 분석 */
  etherSources: {
    source: string;
    totalEther: number;
    percentage: number;
    efficiency: number; // 에테르/행동
  }[];
  /** 에테르 사용처별 분석 */
  etherUsage: {
    usage: string;
    totalSpent: number;
    percentage: number;
    effectValue: number; // 효과/에테르
  }[];
  /** 에테르 효율 상위 카드 */
  efficientCards: { cardId: string; cardName: string; etherPerUse: number; efficiency: number }[];
  /** 에테르 낭비 패턴 */
  wastePatterns: { pattern: string; frequency: number; etherLost: number }[];
  /** 최적 에테르 전략 */
  optimalStrategies: string[];
}

/** 상점 패턴 분석 */
export interface ShopPatternAnalysis {
  /** 평균 방문 횟수 */
  avgVisitsPerRun: number;
  /** 평균 지출 */
  avgSpentPerVisit: number;
  /** 구매 유형별 분석 */
  purchasesByType: {
    type: 'card' | 'relic' | 'service' | 'item';
    frequency: number;
    avgSpent: number;
    winRateImpact: number;
  }[];
  /** 최적 구매 우선순위 */
  optimalPurchasePriority: { itemType: string; priority: number; reason: string }[];
  /** 가격 대비 가치 분석 */
  valueAnalysis: {
    itemId: string;
    itemName: string;
    avgPrice: number;
    winRateBoost: number;
    valueScore: number; // 승률증가/가격
  }[];
  /** 과소비 경고 */
  overspendingWarnings: { pattern: string; winRateLoss: number; suggestion: string }[];
  /** 스킵해야 할 상황 */
  skipConditions: string[];
}

/** HP 곡선 분석 */
export interface HPCurveAnalysis {
  /** 층별 평균 HP */
  hpByFloor: { floor: number; avgHp: number; avgHpRatio: number; winningAvgHp: number; losingAvgHp: number }[];
  /** 위험 구간 (HP 급감) */
  dangerZones: { floorRange: [number, number]; avgHpDrop: number; cause: string }[];
  /** 회복 효율 */
  healingEfficiency: {
    source: string;
    avgHealed: number;
    frequency: number;
    winRateAfter: number;
  }[];
  /** 최적 HP 관리 전략 */
  optimalHpManagement: string[];
  /** HP 임계치별 승률 */
  winRateByHpThreshold: { threshold: number; winRate: number }[];
}

/** 리스크/리워드 분석 */
export interface RiskRewardAnalysis {
  /** 고위험 선택지 분석 */
  highRiskChoices: {
    choiceType: string;
    description: string;
    riskLevel: number; // 0-1
    avgReward: number;
    successRate: number;
    expectedValue: number;
    recommendation: 'always' | 'situational' | 'avoid';
  }[];
  /** 엘리트 전투 분석 */
  eliteAnalysis: {
    eliteId: string;
    eliteName: string;
    riskLevel: number;
    rewardValue: number;
    optimalHpThreshold: number; // 이 이상 HP일 때만 도전 권장
  }[];
  /** 이벤트 리스크 분석 */
  eventRisks: {
    eventId: string;
    eventName: string;
    bestChoice: string;
    worstChoice: string;
    riskVariance: number;
  }[];
  /** 리스크 관리 권장사항 */
  riskManagement: string[];
}

/** 경제/자원 분석 통합 */
export interface EconomyAnalysis {
  etherEfficiency: EtherEfficiencyAnalysis;
  shopPatterns: ShopPatternAnalysis;
  hpCurve: HPCurveAnalysis;
  riskReward: RiskRewardAnalysis;
  /** 전체 경제 건강도 */
  economyHealth: 'healthy' | 'imbalanced' | 'critical';
  /** 권장사항 */
  recommendations: BalanceRecommendation[];
}

// ==================== 4. 플레이 스타일 분석 ====================

/** 공격성 지표 */
export interface AggressionMetrics {
  /** 평균 턴당 공격 횟수 */
  avgAttacksPerTurn: number;
  /** 첫 턴 공격 비율 */
  firstTurnAttackRate: number;
  /** 공격 카드 비율 */
  attackCardRatio: number;
  /** 공격 선호도 점수 (0-10) */
  aggressionScore: number;
  /** 공격적 플레이 승률 */
  aggressiveWinRate: number;
  /** 수비적 플레이 승률 */
  defensiveWinRate: number;
  /** 최적 공격성 범위 */
  optimalAggressionRange: [number, number];
}

/** 방어 성향 분석 */
export interface DefenseMetrics {
  /** 평균 턴당 방어 사용 */
  avgBlockPerTurn: number;
  /** 방어 카드 사용 비율 */
  blockCardUsageRate: number;
  /** 피해 회피율 (방어/받을 피해) */
  damagePreventionRate: number;
  /** 방어 효율성 */
  blockEfficiency: number;
  /** 과방어 턴 비율 (낭비) */
  overBlockRate: number;
  /** 최적 방어 전략 */
  optimalDefenseStrategy: string;
}

/** 선제/대응 비율 분석 */
export interface InitiativeAnalysis {
  /** 선제 공격 비율 */
  initiativeRate: number;
  /** 대응 플레이 비율 */
  reactiveRate: number;
  /** 선제 플레이 승률 */
  initiativeWinRate: number;
  /** 대응 플레이 승률 */
  reactiveWinRate: number;
  /** 최적 비율 */
  optimalRatio: number;
  /** 상황별 권장 */
  situationalAdvice: { situation: string; recommendation: 'initiative' | 'reactive' }[];
}

/** 덱 순환 분석 */
export interface DeckCyclingAnalysis {
  /** 평균 덱 순환 횟수/전투 */
  avgCyclesPerBattle: number;
  /** 드로우 효율 */
  drawEfficiency: number;
  /** 버리기 활용도 */
  discardUtilization: number;
  /** 핸드 관리 점수 */
  handManagementScore: number;
  /** 덱 순환 카드 효과 */
  cyclingCardEffects: { cardId: string; cardName: string; cycleBoost: number; winRateBoost: number }[];
  /** 순환 개선 권장 */
  improvementSuggestions: string[];
}

/** 플레이 스타일 분석 통합 */
export interface PlayStyleAnalysis {
  aggression: AggressionMetrics;
  defense: DefenseMetrics;
  initiative: InitiativeAnalysis;
  deckCycling: DeckCyclingAnalysis;
  /** 전체 플레이 스타일 프로필 */
  styleProfile: 'aggressive' | 'defensive' | 'balanced' | 'combo-oriented' | 'control';
  /** 스타일별 승률 */
  winRateByStyle: Record<string, number>;
  /** 권장사항 */
  recommendations: BalanceRecommendation[];
}

// ==================== 5. 난이도 진행 추적 ====================

/** 연속 승리 분석 */
export interface WinStreakAnalysis {
  /** 현재 연승 */
  currentStreak: number;
  /** 최장 연승 */
  longestStreak: number;
  /** 평균 연승 */
  avgStreak: number;
  /** 연승별 분포 */
  streakDistribution: Record<number, number>;
  /** 연승 달성 요인 */
  streakFactors: { factor: string; correlation: number }[];
  /** 연승 중단 원인 */
  streakBreakers: { cause: string; frequency: number }[];
}

/** 난이도별 통계 분석 */
export interface DifficultyLevelAnalysis {
  difficulty: number;
  runs: number;
  wins: number;
  winRate: number;
  avgFloorReached: number;
  /** 해당 난이도 특수 도전 */
  challenges: string[];
  /** 효과적인 전략 */
  effectiveStrategies: string[];
  /** 필수 카드/상징 */
  requiredItems: string[];
  /** 다음 난이도 권장 조건 */
  advancementCondition: string;
}

/** 성장 곡선 분석 */
export interface PlayerGrowthCurve {
  /** 시간대별 승률 변화 */
  winRateOverTime: { period: number; winRate: number; runs: number }[];
  /** 학습 속도 */
  learningRate: number;
  /** 플래토 구간 (정체기) */
  plateauPeriods: { start: number; end: number; winRate: number }[];
  /** 브레이크스루 구간 */
  breakthroughPeriods: { period: number; winRateJump: number; cause: string }[];
  /** 현재 수준 */
  currentSkillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master';
  /** 다음 레벨 도달 예상 */
  nextLevelEstimate: { runsNeeded: number; targetWinRate: number };
}

/** 난이도 진행 분석 통합 */
export interface DifficultyProgressionAnalysis {
  winStreak: WinStreakAnalysis;
  difficultyLevels: DifficultyLevelAnalysis[];
  growthCurve: PlayerGrowthCurve;
  /** 전체 진행도 */
  overallProgress: number; // 0-100
  /** 권장 다음 목표 */
  nextGoals: string[];
  /** 권장사항 */
  recommendations: BalanceRecommendation[];
}

// ==================== 6. AI 적 분석 ====================

/** 적 행동 패턴 분석 */
export interface EnemyBehaviorPattern {
  enemyId: string;
  enemyName: string;
  /** 행동 패턴 시퀀스 */
  actionPatterns: {
    sequence: string[];
    frequency: number;
    /** 이 패턴 시 플레이어 승률 */
    playerWinRate: number;
  }[];
  /** 상황별 행동 확률 */
  conditionalBehavior: {
    condition: string;
    action: string;
    probability: number;
  }[];
  /** 예측 가능성 점수 */
  predictabilityScore: number;
  /** 위험 행동 */
  dangerousMoves: { action: string; avgDamage: number; frequency: number }[];
}

/** 적 반응 분석 */
export interface EnemyReactionAnalysis {
  enemyId: string;
  enemyName: string;
  /** 플레이어 행동에 대한 반응 */
  reactions: {
    playerAction: string;
    enemyReaction: string;
    frequency: number;
    optimalCounter: string;
  }[];
  /** 약점 행동 (플레이어가 이용 가능) */
  exploitableWeaknesses: {
    weakness: string;
    howToExploit: string;
    winRateBoost: number;
  }[];
  /** 강점 행동 (플레이어가 피해야 함) */
  strengths: {
    strength: string;
    avoidanceStrategy: string;
  }[];
}

/** 적별 최적 카운터 분석 */
export interface EnemyCounterAnalysis {
  enemyId: string;
  enemyName: string;
  /** 효과적인 카드 */
  effectiveCards: {
    cardId: string;
    cardName: string;
    effectivenessScore: number;
    reason: string;
  }[];
  /** 비효과적인 카드 */
  ineffectiveCards: {
    cardId: string;
    cardName: string;
    reason: string;
  }[];
  /** 효과적인 상징 */
  effectiveRelics: {
    relicId: string;
    relicName: string;
    effectivenessScore: number;
  }[];
  /** 효과적인 전략 */
  effectiveStrategies: {
    strategy: string;
    winRateBoost: number;
    description: string;
  }[];
  /** 피해야 할 전략 */
  avoidStrategies: string[];
}

/** AI 적 분석 통합 */
export interface EnemyPatternAnalysis {
  behaviorPatterns: EnemyBehaviorPattern[];
  reactions: EnemyReactionAnalysis[];
  counters: EnemyCounterAnalysis[];
  /** 가장 예측하기 어려운 적 */
  unpredictableEnemies: string[];
  /** 가장 위험한 적 */
  mostDangerousEnemies: { enemyId: string; enemyName: string; dangerScore: number }[];
  /** 가장 쉬운 적 */
  easiestEnemies: { enemyId: string; enemyName: string; winRate: number }[];
  /** 권장사항 */
  recommendations: BalanceRecommendation[];
}

// ==================== 통합 분석 리포트 ====================

/** 종합 분석 리포트 */
export interface ComprehensiveAnalyticsReport {
  /** 생성 시간 */
  generatedAt: Date;
  /** 분석 기반 런 수 */
  totalRuns: number;
  /** 전체 승률 */
  overallWinRate: number;

  /** 1. 런 진행 분석 */
  runProgression: RunProgressionAnalysis;
  /** 2. 시너지 분석 */
  synergy: SynergyAnalysis;
  /** 3. 경제/자원 분석 */
  economy: EconomyAnalysis;
  /** 4. 플레이 스타일 분석 */
  playStyle: PlayStyleAnalysis;
  /** 5. 난이도 진행 */
  difficulty: DifficultyProgressionAnalysis;
  /** 6. 적 패턴 분석 */
  enemyPatterns: EnemyPatternAnalysis;

  /** 전체 요약 */
  summary: {
    /** 전체 건강도 점수 (0-100) */
    healthScore: number;
    /** 주요 문제점 */
    criticalIssues: string[];
    /** 개선 우선순위 */
    priorities: string[];
    /** 강점 */
    strengths: string[];
    /** 약점 */
    weaknesses: string[];
  };

  /** 모든 권장사항 (우선순위 정렬) */
  allRecommendations: BalanceRecommendation[];
}
