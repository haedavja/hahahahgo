/**
 * @file detailed-stats-types.ts
 * @description 상세 통계 시스템의 타입 정의
 *
 * 이 파일은 detailed-stats.ts에서 분리된 타입 정의를 포함합니다.
 */

// ==================== 타입 정의 ====================

/** 카드 효과 상세 통계 */
export interface CardEffectStats {
  cardId: string;
  cardName: string;
  cardType: string;
  /** 총 사용 횟수 */
  totalUses: number;
  /** 승리한 전투에서 사용 횟수 */
  usesInWins: number;
  /** 패배한 전투에서 사용 횟수 */
  usesInLosses: number;
  /** 총 피해량 */
  totalDamage: number;
  /** 평균 피해량 */
  avgDamage: number;
  /** 총 방어량 */
  totalBlock: number;
  /** 평균 방어량 */
  avgBlock: number;
  /** 특수효과 발동 횟수 */
  specialTriggers: Record<string, number>;
  /** 교차 발동 횟수 */
  crossTriggers: number;
  /** 승률 기여도 (사용 시 승률) */
  winContribution: number;
  /** HP 상태별 카드 사용 통계 */
  contextByHpState: CardHpContextStats;
  /** 층별 카드 사용 통계 */
  contextByFloor: CardFloorContextStats;
  /** 적 유형별 카드 효과 통계 */
  contextByEnemy: CardEnemyContextStats;
  /** 턴 순서별 카드 통계 */
  contextByTurn: CardTurnContextStats;
}

/** HP 상태별 카드 사용 컨텍스트 */
export interface CardHpContextStats {
  /** 위기 상황 (HP < 30%) */
  critical: {
    uses: number;
    avgDamage: number;
    avgBlock: number;
    winRate: number;
  };
  /** 불안정 상황 (HP 30-60%) */
  unstable: {
    uses: number;
    avgDamage: number;
    avgBlock: number;
    winRate: number;
  };
  /** 안정 상황 (HP > 60%) */
  stable: {
    uses: number;
    avgDamage: number;
    avgBlock: number;
    winRate: number;
  };
}

/** 층별 카드 사용 컨텍스트 */
export interface CardFloorContextStats {
  /** 초반 (층 1-5) */
  early: {
    uses: number;
    avgDamage: number;
    avgBlock: number;
    winRate: number;
  };
  /** 중반 (층 6-10) */
  mid: {
    uses: number;
    avgDamage: number;
    avgBlock: number;
    winRate: number;
  };
  /** 후반 (층 11+) */
  late: {
    uses: number;
    avgDamage: number;
    avgBlock: number;
    winRate: number;
  };
  /** 층별 상세 데이터 */
  byFloor: Map<number, { uses: number; avgDamage: number; avgBlock: number; winRate: number }>;
}

/** 적 유형별 카드 효과 컨텍스트 */
export interface CardEnemyContextStats {
  /** 일반 몬스터 대상 */
  vsNormal: {
    uses: number;
    avgDamage: number;
    avgBlock: number;
    winRate: number;
  };
  /** 엘리트 대상 */
  vsElite: {
    uses: number;
    avgDamage: number;
    avgBlock: number;
    winRate: number;
  };
  /** 보스 대상 */
  vsBoss: {
    uses: number;
    avgDamage: number;
    avgBlock: number;
    winRate: number;
  };
  /** 다수 적 대상 */
  vsMultiple: {
    uses: number;
    avgDamage: number;
    avgBlock: number;
    winRate: number;
  };
  /** 특정 적 유형별 상세 */
  byEnemyType: Map<string, { uses: number; avgDamage: number; avgBlock: number; winRate: number }>;
}

/** 턴 순서별 카드 사용 컨텍스트 */
export interface CardTurnContextStats {
  /** 첫 턴 */
  firstTurn: {
    uses: number;
    avgDamage: number;
    avgBlock: number;
    winRate: number;
  };
  /** 초반 (2-3턴) */
  earlyTurns: {
    uses: number;
    avgDamage: number;
    avgBlock: number;
    winRate: number;
  };
  /** 중반 (4-6턴) */
  midTurns: {
    uses: number;
    avgDamage: number;
    avgBlock: number;
    winRate: number;
  };
  /** 후반 (7턴+) */
  lateTurns: {
    uses: number;
    avgDamage: number;
    avgBlock: number;
    winRate: number;
  };
}

/** 몬스터 전투 통계 */
export interface MonsterBattleStats {
  monsterId: string;
  monsterName: string;
  tier: number;
  isBoss: boolean;
  /** 전투 횟수 */
  battles: number;
  /** 승리 횟수 */
  wins: number;
  /** 패배 횟수 */
  losses: number;
  /** 승률 */
  winRate: number;
  /** 평균 전투 턴 */
  avgTurns: number;
  /** 플레이어가 받은 총 피해 */
  totalDamageTaken: number;
  /** 플레이어가 준 총 피해 */
  totalDamageDealt: number;
  /** 평균 받은 피해 */
  avgDamageTaken: number;
  /** 평균 준 피해 */
  avgDamageDealt: number;
  /** 승리 시 남은 HP 평균 */
  avgHpRemainingOnWin: number;
  /** 주로 사용된 카드 TOP 5 */
  topCardsUsed: { cardId: string; count: number }[];
  /** 출현 컨텍스트별 통계 (단독 vs 다수) */
  contextStats: MonsterContextStats;
}

/** 적 출현 컨텍스트별 통계 */
export interface MonsterContextStats {
  /** 단독 출현 시 통계 */
  solo: {
    battles: number;
    wins: number;
    winRate: number;
    avgDamageTaken: number;
    avgTurns: number;
  };
  /** 다수 출현 시 통계 (같은 종류) */
  withSameType: {
    battles: number;
    wins: number;
    winRate: number;
    avgDamageTaken: number;
    avgTurns: number;
    avgGroupSize: number;
  };
  /** 혼합 그룹 시 통계 (다른 종류와 함께) */
  withMixedGroup: {
    battles: number;
    wins: number;
    winRate: number;
    avgDamageTaken: number;
    avgTurns: number;
    frequentPartners: { monsterId: string; count: number }[];
  };
}

/** 적 그룹 전투 통계 */
export interface EnemyGroupStats {
  groupId: string;
  groupName: string;
  /** 그룹 구성 (적 ID 배열) */
  composition: string[];
  /** 적 수 */
  enemyCount: number;
  /** 티어 */
  tier: number;
  /** 보스 그룹 여부 */
  isBoss: boolean;
  /** 전투 횟수 */
  battles: number;
  /** 승리 횟수 */
  wins: number;
  /** 패배 횟수 */
  losses: number;
  /** 승률 */
  winRate: number;
  /** 평균 전투 턴 */
  avgTurns: number;
  /** 플레이어가 받은 평균 피해 */
  avgDamageTaken: number;
  /** 플레이어가 받은 최대 피해 */
  maxDamageTaken: number;
  /** 그룹 총 HP */
  totalGroupHp: number;
  /** 플레이어가 준 평균 피해 */
  avgDamageDealt: number;
  /** 승리 시 남은 HP 평균 */
  avgHpRemainingOnWin: number;
  /** 적별 피해 기여도 */
  damageContribution: { monsterId: string; avgDamage: number; percentage: number }[];
  /** 첫 처치 순서 (어떤 적이 먼저 죽는지) */
  killOrder: { monsterId: string; avgOrder: number }[];
  /** 출현 노드 범위 */
  nodeRange: [number, number] | null;
  /** 가장 효과적인 카드 TOP 5 */
  effectiveCards: { cardId: string; winRateBoost: number }[];
  /** 동종 그룹 여부 (모든 적이 같은 타입) */
  isHomogeneous: boolean;
}

/** 개별 적 피해 기록 (전투 내) */
export interface IndividualEnemyDamageRecord {
  /** 적 인스턴스 ID (전투 내 고유) */
  instanceId: string;
  /** 적 타입 ID */
  monsterId: string;
  /** 적 이름 */
  monsterName: string;
  /** 이 적이 플레이어에게 준 피해 */
  damageDealt: number;
  /** 이 적이 받은 피해 */
  damageReceived: number;
  /** 처치 순서 (1부터 시작, 0이면 생존) */
  killOrder: number;
  /** 생존 여부 */
  survived: boolean;
  /** 이 적이 사용한 카드들 */
  cardsUsed: Record<string, number>;
}

/** 이벤트 통계 */
export interface EventStats {
  eventId: string;
  eventName: string;
  /** 발생 횟수 */
  occurrences: number;
  /** 성공 횟수 */
  successes: number;
  /** 성공률 */
  successRate: number;
  /** HP 변화 총합 */
  totalHpChange: number;
  /** 골드 변화 총합 */
  totalGoldChange: number;
  /** 정보(intel) 변화 총합 */
  totalIntelChange: number;
  /** 원자재(material) 변화 총합 */
  totalMaterialChange: number;
  /** 통찰(insight) 변화 총합 */
  totalInsightChange: number;
  /** 은총(grace) 변화 총합 */
  totalGraceChange: number;
  /** 전리품(loot) 변화 총합 */
  totalLootChange: number;
  /** 획득한 카드 */
  cardsGained: string[];
  /** 획득한 상징 */
  relicsGained: string[];
}

/** 런 전체 통계 */
export interface RunStats {
  /** 총 런 횟수 */
  totalRuns: number;
  /** 성공 횟수 */
  successfulRuns: number;
  /** 성공률 */
  successRate: number;
  /** 평균 도달 층 */
  avgLayerReached: number;
  /** 평균 전투 승리 수 */
  avgBattlesWon: number;
  /** 평균 골드 획득 */
  avgGoldEarned: number;
  /** 평균 최종 덱 크기 */
  avgFinalDeckSize: number;
  /** 사망 원인 분포 */
  deathCauses: Record<string, number>;
  /** 층별 사망 분포 */
  deathByLayer: Record<number, number>;
  /** 전략별 승률 */
  strategyWinRates: Record<string, number>;
}

/** 카드 승급 통계 */
export interface CardUpgradeStats {
  /** 카드별 승급 횟수 */
  upgradesByCard: Record<string, number>;
  /** 총 승급 횟수 */
  totalUpgrades: number;
  /** 런당 평균 승급 */
  avgUpgradesPerRun: number;
  /** 승급된 카드가 승률에 미치는 영향 */
  upgradeWinCorrelation: number;
}

/** 성장 시스템 통계 */
export interface GrowthStats {
  /** 개성(trait) 투자 횟수 */
  statInvestments: Record<string, number>;
  /** 에토스 투자 횟수 */
  ethosInvestments: Record<string, number>;
  /** 파토스 투자 횟수 */
  pathosInvestments: Record<string, number>;
  /** 로고스 투자 횟수 */
  logosInvestments: Record<string, number>;
  /** 총 투자 횟수 */
  totalInvestments: number;
  /** 런당 평균 투자 */
  avgInvestmentsPerRun: number;
  /** 로고스 효과 활성화 횟수 */
  logosActivations: Record<string, number>;
  /** 성장 레벨 분포 */
  levelDistribution: Record<number, number>;
  /** 스탯별 승률 상관관계 */
  statWinCorrelation: Record<string, number>;
  /** 성장 경로별 통계 (어떤 순서로 스탯을 올렸는지) */
  growthPathStats: GrowthPathStats[];
  /** 최종 스탯 분포 (런 종료 시) */
  finalStatDistribution: Record<string, { total: number; avg: number; max: number }>;
}

/** 성장 경로 통계 */
export interface GrowthPathStats {
  /** 성장 경로 (예: "strength→agility→insight") */
  path: string;
  /** 해당 경로 사용 횟수 */
  count: number;
  /** 해당 경로 승률 */
  winRate: number;
  /** 평균 최종 레벨 */
  avgFinalLevel: number;
}

/** 구매 결정 기록 */
export interface PurchaseRecord {
  itemId: string;
  itemName: string;
  type: 'card' | 'relic' | 'item';
  price: number;
  reason: string;
}

/** 상점 이용 통계 */
export interface ShopStats {
  /** 총 방문 횟수 */
  totalVisits: number;
  /** 총 지출 골드 */
  totalSpent: number;
  /** 평균 지출 */
  avgSpentPerVisit: number;
  /** 구매한 카드 */
  cardsPurchased: Record<string, number>;
  /** 구매한 상징 */
  relicsPurchased: Record<string, number>;
  /** 구매한 아이템 */
  itemsPurchased: Record<string, number>;
  /** 구매 기록 (이유 포함) */
  purchaseRecords: PurchaseRecord[];
  /** 카드 제거 횟수 */
  cardsRemoved: number;
  /** 카드 승급 횟수 */
  cardsUpgraded: number;
}

/** 던전 통계 */
export interface DungeonStats {
  /** 총 진입 횟수 */
  totalAttempts: number;
  /** 클리어 횟수 */
  clears: number;
  /** 클리어율 */
  clearRate: number;
  /** 던전별 클리어 횟수 */
  clearsByDungeon: Record<string, number>;
  /** 획득한 보상 */
  rewards: {
    gold: number;
    cards: string[];
    relics: string[];
  };
  /** 평균 소요 턴 */
  avgTurns: number;
  /** 평균 받은 피해 */
  avgDamageTaken: number;
}

/** 상점 서비스 상세 통계 */
export interface ShopServiceStats {
  /** 치료 서비스 이용 */
  healingUsed: number;
  /** 치료로 회복한 총 HP */
  totalHpHealed: number;
  /** 치료 비용 총합 */
  healingCost: number;
  /** 카드 제거 비용 총합 */
  removalCost: number;
  /** 제거한 카드 목록 */
  removedCards: Record<string, number>;
  /** 카드 승급 비용 총합 */
  upgradeCost: number;
  /** 승급한 카드 목록 */
  upgradedCards: Record<string, number>;
  /** 새로고침 사용 횟수 */
  refreshUsed: number;
  /** 새로고침 비용 총합 */
  refreshCost: number;
}

/** 아이템 활용 통계 */
export interface ItemUsageStats {
  /** 아이템별 획득 횟수 */
  itemsAcquired: Record<string, number>;
  /** 아이템별 사용 횟수 */
  itemsUsed: Record<string, number>;
  /** 아이템별 효과 (HP 회복, 피해 등) */
  itemEffects: Record<string, {
    timesUsed: number;
    totalHpHealed: number;
    totalDamage: number;
    totalGoldGained: number;
    specialEffects: Record<string, number>;
  }>;
  /** 사용하지 않고 버린 아이템 */
  itemsDiscarded: Record<string, number>;
  /** 전투 중 사용 vs 전투 외 사용 */
  usageContext: {
    inBattle: Record<string, number>;
    outOfBattle: Record<string, number>;
  };
}

/** 이벤트 선택 상세 통계 */
export interface EventChoiceStats {
  eventId: string;
  eventName: string;
  /** 총 발생 횟수 */
  occurrences: number;
  /** 선택지별 선택 횟수 */
  choicesMade: Record<string, number>;
  /** 선택지별 결과 */
  choiceOutcomes: Record<string, {
    timesChosen: number;
    avgHpChange: number;
    avgGoldChange: number;
    cardsGained: string[];
    relicsGained: string[];
    successRate: number;
  }>;
  /** 패스한 횟수 */
  timesSkipped: number;
  /** 패스 이유 분포 */
  skipReasons: Record<string, number>;
  /** 이벤트 후 전투 승률 */
  postEventWinRate: number;
}

/** 전투 상세 기록 */
export interface BattleRecord {
  battleId: string;
  monsterId: string;
  monsterName: string;
  isBoss: boolean;
  isElite: boolean;
  winner: 'player' | 'enemy' | 'draw';
  turns: number;
  playerDamageDealt: number;
  enemyDamageDealt: number;
  playerFinalHp: number;
  enemyFinalHp: number;
  cardsUsed: Record<string, number>;
  specialEffects: Record<string, number>;
  crossTriggers: number;
  combosTriggered: Record<string, number>;
  /** 그룹 전투 정보 (다수 적 전투 시) */
  groupInfo: BattleGroupInfo | null;
}

/** 전투 그룹 정보 */
export interface BattleGroupInfo {
  /** 그룹 ID (예: ghoul_duo, wildrat_swarm) */
  groupId: string;
  /** 그룹 이름 */
  groupName: string;
  /** 총 적 수 */
  enemyCount: number;
  /** 개별 적 피해 기록 */
  individualEnemies: IndividualEnemyDamageRecord[];
  /** 그룹 구성 (적 타입 ID 배열) */
  composition: string[];
  /** 동종 그룹 여부 (같은 타입만 있음) */
  isHomogeneous: boolean;
  /** 그룹 총 HP */
  totalGroupHp: number;
  /** 그룹 총 피해 (플레이어가 받음) */
  totalGroupDamage: number;
}

/** AI 전략 통계 */
export interface AIStrategyStats {
  /** 전략별 사용 횟수 */
  strategyUsage: Record<string, number>;
  /** 전략별 승률 */
  strategyWinRate: Record<string, number>;
  /** 전략별 평균 턴 수 */
  strategyAvgTurns: Record<string, number>;
  /** 전략별 평균 피해량 */
  strategyAvgDamage: Record<string, number>;
  /** 상황별 전략 선택 분포 (HP 비율 구간별) */
  strategyByHpRatio: Record<string, Record<string, number>>;
  /** 카드 선택 이유 통계 */
  cardSelectionReasons: Record<string, number>;
  /** 시너지 발동 통계 */
  synergyTriggers: Record<string, number>;
  /** 콤보 타입별 발동 횟수 */
  comboTypeUsage: Record<string, number>;
}

/** 카드 픽률 통계 (Slay the Spire 스타일) */
export interface CardPickStats {
  /** 카드별 제시 횟수 */
  timesOffered: Record<string, number>;
  /** 카드별 선택 횟수 */
  timesPicked: Record<string, number>;
  /** 카드별 픽률 (선택/제시) */
  pickRate: Record<string, number>;
  /** 카드별 스킵 횟수 */
  timesSkipped: Record<string, number>;
}

/** 카드 기여도 통계 */
export interface CardContributionStats {
  /** 카드별: 해당 카드가 덱에 있을 때 승률 */
  winRateWithCard: Record<string, number>;
  /** 카드별: 해당 카드가 덱에 없을 때 승률 */
  winRateWithoutCard: Record<string, number>;
  /** 카드별: 기여도 (있을 때 - 없을 때) */
  contribution: Record<string, number>;
  /** 카드별: 등장 런 횟수 */
  runsWithCard: Record<string, number>;
}

/** 카드 시너지 통계 */
export interface CardSynergyStats {
  /** 함께 픽된 카드 쌍별 횟수 */
  cardPairFrequency: Record<string, number>;
  /** 카드 쌍별 승률 */
  cardPairWinRate: Record<string, number>;
  /** TOP 시너지 조합 */
  topSynergies: { pair: string; frequency: number; winRate: number }[];
}

/** 카드 심층 분석 통계 */
export interface CardDeepStats {
  cardId: string;
  cardName: string;
  /** 픽된 횟수 */
  timesPicked: number;
  /** 제시된 횟수 */
  timesOffered: number;
  /** 실제 전투에서 사용된 횟수 */
  timesPlayed: number;
  /** 전투당 평균 사용 횟수 */
  avgPlaysPerBattle: number;
  /** 한 번도 사용되지 않은 런 수 */
  neverPlayedRuns: number;
  /** 해당 카드가 있을 때 승률 */
  winRateWith: number;
  /** 해당 카드가 없을 때 승률 */
  winRateWithout: number;
  /** 평균 피해량 */
  avgDamageDealt: number;
  /** 평균 방어량 */
  avgBlockGained: number;
  /** 최고 시너지 파트너 */
  bestPartners: { cardId: string; winRate: number; frequency: number }[];
  /** 최악 시너지 파트너 */
  worstPartners: { cardId: string; winRate: number; frequency: number }[];
}

/** 사망 분석 */
export interface DeathAnalysis {
  /** 사망 층 */
  floor: number;
  /** 사망 원인 적 */
  enemyId: string;
  enemyName: string;
  /** 사망 원인 분류 */
  causeType: 'burst' | 'attrition' | 'bad_hand' | 'resource_exhaustion';
  /** 최종 HP */
  finalHp: number;
  /** 초과 피해량 (오버킬) */
  overkillDamage: number;
  /** 사망 전 턴 수 */
  turnsBeforeDeath: number;
  /** 마지막 핸드 카드 */
  lastHandCards: string[];
  /** 덱 구성 */
  deckComposition: {
    attacks: number;
    skills: number;
    powers: number;
    total: number;
  };
  /** 사망 시점 상징 */
  relicsAtDeath: string[];
  /** HP 히스토리 (최근 5턴) */
  hpHistory: number[];
}

/** 사망 통계 집계 */
export interface DeathStats {
  /** 총 사망 횟수 */
  totalDeaths: number;
  /** 층별 사망 분포 */
  deathsByFloor: Record<number, number>;
  /** 적별 사망 횟수 */
  deathsByEnemy: Record<string, number>;
  /** 원인별 사망 횟수 */
  deathsByCause: Record<string, number>;
  /** 평균 사망 층 */
  avgDeathFloor: number;
  /** 최근 사망 분석 (최대 20개) */
  recentDeaths: DeathAnalysis[];
  /** 가장 위험한 적 TOP 5 */
  deadliestEnemies: { enemyId: string; enemyName: string; deaths: number; encounterRate: number }[];
}

// ==================== 상징(Relic) 상세 통계 ====================

/** 상징 상세 통계 (확장) */
export interface RelicDetailedStats {
  relicId: string;
  relicName: string;
  rarity: string;
  /** 획득 횟수 */
  timesAcquired: number;
  /** 보유 시 런 승률 */
  winRateWithRelic: number;
  /** 미보유 시 런 승률 */
  winRateWithoutRelic: number;
  /** 기여도 (보유 승률 - 미보유 승률) */
  contribution: number;
  /** 발동 통계 */
  activationStats: RelicActivationStats;
  /** 컨텍스트별 통계 */
  contextStats: RelicContextStats;
  /** 시너지 상징 */
  synergies: { relicId: string; combinedWinRate: number; count: number }[];
}

/** 상징 발동 통계 */
export interface RelicActivationStats {
  /** 총 발동 횟수 */
  totalActivations: number;
  /** 전투당 평균 발동 */
  avgActivationsPerBattle: number;
  /** 발동 조건별 횟수 */
  activationsByTrigger: Record<string, number>;
  /** 발동 시 효과별 총 가치 */
  effectValues: {
    damageDealt: number;
    damageBlocked: number;
    hpHealed: number;
    etherGained: number;
    cardsDrawn: number;
    goldGained: number;
    otherEffects: Record<string, number>;
  };
  /** 평균 효과 가치 (발동당) */
  avgValuePerActivation: number;
  /** 발동 실패 횟수 (조건 미충족) */
  failedActivations: number;
}

/** 상징 컨텍스트별 통계 */
export interface RelicContextStats {
  /** 층 구간별 발동 */
  byFloorRange: {
    early: { activations: number; avgValue: number };
    mid: { activations: number; avgValue: number };
    late: { activations: number; avgValue: number };
  };
  /** 전투 유형별 발동 */
  byBattleType: {
    normal: { activations: number; avgValue: number };
    elite: { activations: number; avgValue: number };
    boss: { activations: number; avgValue: number };
  };
  /** HP 상태별 발동 */
  byHpState: {
    critical: { activations: number; avgValue: number };
    unstable: { activations: number; avgValue: number };
    stable: { activations: number; avgValue: number };
  };
  /** 획득 시점 (층) */
  avgAcquisitionFloor: number;
  /** 획득 방법별 횟수 */
  acquisitionMethods: Record<string, number>;
}

// ==================== 토큰 통계 ====================

/** 토큰 상세 통계 */
export interface TokenStats {
  tokenId: string;
  tokenName: string;
  category: string;
  /** 획득 횟수 */
  timesAcquired: number;
  /** 사용 횟수 */
  timesUsed: number;
  /** 사용률 (사용/획득) */
  usageRate: number;
  /** 만료 횟수 (사용 안하고 소멸) */
  timesExpired: number;
  /** 효과 통계 */
  effectStats: TokenEffectStats;
  /** 컨텍스트별 통계 */
  contextStats: TokenContextStats;
}

/** 토큰 효과 통계 */
export interface TokenEffectStats {
  /** 총 피해량 */
  totalDamage: number;
  /** 총 방어량 */
  totalBlock: number;
  /** 총 회복량 */
  totalHealing: number;
  /** 총 에테르 획득 */
  totalEtherGained: number;
  /** 특수 효과 횟수 */
  specialEffects: Record<string, number>;
  /** 평균 효과 가치 */
  avgValuePerUse: number;
}

/** 토큰 컨텍스트별 통계 */
export interface TokenContextStats {
  /** HP 상태별 사용 */
  byHpState: {
    critical: { uses: number; avgValue: number };
    unstable: { uses: number; avgValue: number };
    stable: { uses: number; avgValue: number };
  };
  /** 전투 유형별 사용 */
  byBattleType: {
    normal: { uses: number; avgValue: number };
    elite: { uses: number; avgValue: number };
    boss: { uses: number; avgValue: number };
  };
  /** 턴별 사용 (어느 턴에 주로 쓰는지) */
  byTurn: Map<number, { uses: number; avgValue: number }>;
  /** 함께 사용된 카드 TOP 5 */
  frequentCardCombos: { cardId: string; count: number }[];
}

// ==================== 포커 콤보 통계 ====================

/** 포커 콤보 상세 통계 */
export interface PokerComboStats {
  /** 콤보별 발동 횟수 */
  comboFrequency: Record<string, number>;
  /** 콤보별 에테르 획득 총량 */
  etherByCombo: Record<string, number>;
  /** 콤보별 평균 에테르 */
  avgEtherByCombo: Record<string, number>;
  /** 콤보별 승률 (해당 전투) */
  winRateByCombo: Record<string, number>;
  /** 콤보별 상세 통계 */
  comboDetails: Map<string, ComboDetailStats>;
}

/** 콤보 상세 통계 */
export interface ComboDetailStats {
  comboType: string;
  /** 총 발동 횟수 */
  totalOccurrences: number;
  /** 승리한 전투에서 발동 */
  inWins: number;
  /** 패배한 전투에서 발동 */
  inLosses: number;
  /** 총 에테르 획득 */
  totalEtherGained: number;
  /** 평균 에테르 획득 */
  avgEtherGained: number;
  /** 발동 후 승률 */
  winRateAfterCombo: number;
  /** 컨텍스트별 통계 */
  contextStats: {
    /** 층 구간별 */
    byFloorRange: Record<string, { occurrences: number; avgEther: number }>;
    /** 적 유형별 */
    byEnemyType: Record<string, { occurrences: number; avgEther: number }>;
    /** 턴별 */
    byTurn: Map<number, { occurrences: number; avgEther: number }>;
  };
  /** 카드 조합별 발동 (어떤 카드들로 콤보 완성) */
  cardCombinations: { cards: string[]; count: number }[];
}

// ==================== 층별 상세 통계 ====================

/** 층별 상세 통계 */
export interface FloorDetailedStats {
  floor: number;
  /** 해당 층 도달 횟수 */
  timesReached: number;
  /** 해당 층 클리어 횟수 */
  timesCleared: number;
  /** 해당 층 클리어율 */
  clearRate: number;
  /** 해당 층에서 런 종료 횟수 */
  runsEndedHere: number;
  /** 전투 통계 */
  battleStats: FloorBattleStats;
  /** 자원 통계 */
  resourceStats: FloorResourceStats;
  /** 노드 타입별 통계 */
  nodeTypeStats: Record<string, FloorNodeStats>;
}

/** 층별 전투 통계 */
export interface FloorBattleStats {
  /** 해당 층 전투 횟수 */
  totalBattles: number;
  /** 승리 횟수 */
  wins: number;
  /** 패배 횟수 */
  losses: number;
  /** 승률 */
  winRate: number;
  /** 평균 전투 턴 */
  avgTurns: number;
  /** 평균 받은 피해 */
  avgDamageTaken: number;
  /** 평균 준 피해 */
  avgDamageDealt: number;
  /** 해당 층 주요 적 */
  commonEnemies: { monsterId: string; count: number; winRate: number }[];
  /** 무피해 클리어 횟수 */
  flawlessVictories: number;
}

/** 층별 자원 통계 */
export interface FloorResourceStats {
  /** 해당 층 도달 시 평균 HP */
  avgHpOnArrival: number;
  /** 해당 층 도달 시 평균 HP 비율 */
  avgHpRatioOnArrival: number;
  /** 해당 층 도달 시 평균 골드 */
  avgGoldOnArrival: number;
  /** 해당 층 도달 시 평균 덱 크기 */
  avgDeckSizeOnArrival: number;
  /** 해당 층 도달 시 평균 상징 수 */
  avgRelicCountOnArrival: number;
  /** HP 분포 (구간별 도달 비율) */
  hpDistribution: {
    critical: number;  // < 30%
    unstable: number;  // 30-60%
    stable: number;    // > 60%
  };
  /** 런 생존 가능성 (해당 층에서 승리한 런의 최종 성공률) */
  survivalProjection: number;
}

/** 층별 노드 타입 통계 */
export interface FloorNodeStats {
  nodeType: string;
  /** 방문 횟수 */
  visits: number;
  /** 선택률 (해당 층에서 선택한 비율) */
  selectionRate: number;
  /** 방문 후 런 성공률 */
  winRateAfterVisit: number;
  /** 평균 HP 변화 */
  avgHpChange: number;
  /** 평균 골드 변화 */
  avgGoldChange: number;
  /** 획득한 카드 수 */
  cardsGained: number;
  /** 획득한 상징 수 */
  relicsGained: number;
}

// ==================== 통합 층 진행 분석 ====================

/** 층 진행 분석 통계 */
export interface FloorProgressionAnalysis {
  /** 층별 상세 통계 */
  floorStats: Map<number, FloorDetailedStats>;
  /** 난이도 스파이크 층 (승률 급락) */
  difficultySpikes: { floor: number; winRateDrop: number; reason: string }[];
  /** 자원 커브 분석 */
  resourceCurves: {
    /** 층별 평균 HP 커브 */
    hpCurve: { floor: number; avgHp: number; avgHpRatio: number }[];
    /** 층별 평균 골드 커브 */
    goldCurve: { floor: number; avgGold: number }[];
    /** 층별 평균 덱 크기 커브 */
    deckSizeCurve: { floor: number; avgSize: number }[];
  };
  /** 최적 경로 분석 */
  optimalPathAnalysis: {
    /** 승률 높은 경로 패턴 */
    highWinRatePaths: { path: string[]; winRate: number; count: number }[];
    /** 승률 낮은 경로 패턴 */
    lowWinRatePaths: { path: string[]; winRate: number; count: number }[];
  };
  /** 병목 구간 분석 */
  bottleneckAnalysis: {
    /** 가장 많이 실패하는 층 */
    highFailureFloors: { floor: number; failureRate: number; mainCause: string }[];
    /** 자원 부족으로 실패하는 구간 */
    resourceDepletionZones: { floorRange: [number, number]; avgHpAtFailure: number }[];
  };
}

/** 층별 진행 데이터 (Slay the Spire 스타일) */
export interface FloorProgressionData {
  /** 층 번호 */
  floor: number;
  /** 노드 타입 */
  nodeType: string;
  /** 해당 시점 HP */
  hp: number;
  /** 해당 시점 최대 HP */
  maxHp: number;
  /** 해당 시점 골드 */
  gold: number;
  /** 해당 시점 덱 크기 */
  deckSize: number;
  /** 해당 시점 상징 개수 */
  relicCount: number;
}

/** 카드 선택 컨텍스트 (Slay the Spire 스타일) */
export interface CardChoiceContext {
  /** 선택된 카드 ID */
  pickedCardId: string | null;
  /** 제시된 다른 카드들 */
  notPickedCardIds: string[];
  /** 선택 시점 층 */
  floor: number;
  /** 스킵 여부 */
  skipped: boolean;
}

/** 난이도별 통계 (Hades Heat 스타일) */
export interface DifficultyStats {
  /** 난이도 레벨 */
  difficulty: number;
  /** 해당 난이도 런 횟수 */
  runs: number;
  /** 해당 난이도 성공 횟수 */
  wins: number;
  /** 해당 난이도 승률 */
  winRate: number;
  /** 해당 난이도 평균 도달 층 */
  avgFloorReached: number;
  /** 해당 난이도 연승 기록 */
  winStreak: number;
}

/** 런 진행 기록 (Slay the Spire run_data 스타일) */
export interface RunProgressionStats {
  /** 층별 진행 데이터 */
  floorProgression: FloorProgressionData[];
  /** 카드 선택 기록 */
  cardChoices: CardChoiceContext[];
  /** 전투별 받은 피해 */
  damagePerBattle: { monsterId: string; damage: number; floor: number }[];
  /** 경로 선택 (노드 타입 순서) */
  pathTaken: string[];
  /** 최종 덱 구성 */
  finalDeck: string[];
  /** 최종 상징 */
  finalRelics: string[];
}

/** 상징(Relic) 통계 */
export interface RelicStats {
  relicId: string;
  relicName: string;
  /** 획득 횟수 */
  timesAcquired: number;
  /** 획득 층 평균 */
  avgAcquireFloor: number;
  /** 획득 출처별 횟수 */
  acquiredFrom: Record<string, number>;
  /** 보유 시 런 승률 */
  winRateWith: number;
  /** 미보유 시 런 승률 */
  winRateWithout: number;
  /** 승률 기여도 (보유 - 미보유) */
  contribution: number;
  /** 효과 발동 횟수 */
  effectTriggers: number;
  /** 효과 발동당 평균 이득 (HP, 피해 등) */
  avgEffectValue: number;
  /** 해당 상징 보유 시 평균 도달 층 */
  avgFloorReachedWith: number;
  /** 해당 상징 보유 시 평균 HP 잔여율 (0~1) */
  avgHpWithRelic: number;
  /** 해당 상징과 자주 함께 획득되는 상징 */
  commonPairs: { relicId: string; frequency: number }[];
}

/** 기록 통계 (Hades/Balatro 스타일) */
export interface RecordStats {
  /** 최장 연승 기록 */
  longestWinStreak: number;
  /** 현재 연승 */
  currentWinStreak: number;
  /** 무피해 전투 횟수 */
  flawlessVictories: number;
  /** 단일 턴 최대 피해 */
  maxSingleTurnDamage: number;
  /** 단일 턴 최대 피해 기록 상세 */
  maxDamageRecord: { cardId: string; damage: number; monster: string } | null;
  /** 가장 빠른 런 클리어 (전투 횟수) */
  fastestClear: number;
  /** 가장 빠른 런 상세 */
  fastestClearRecord: { battlesWon: number; deckSize: number; strategy: string } | null;
  /** 가장 큰 덱으로 클리어 */
  largestDeckClear: number;
  /** 가장 작은 덱으로 클리어 */
  smallestDeckClear: number;
  /** 최다 골드 보유 (런 종료 시) */
  maxGoldHeld: number;
  /** 보스 무피해 클리어 횟수 */
  bossFlawlessCount: number;
}

/** 전체 상세 통계 */
export interface DetailedStats {
  /** 수집 시작 시간 */
  startTime: Date;
  /** 수집 종료 시간 */
  endTime: Date;
  /** 카드별 통계 */
  cardStats: Map<string, CardEffectStats>;
  /** 몬스터별 통계 */
  monsterStats: Map<string, MonsterBattleStats>;
  /** 적 그룹별 통계 */
  enemyGroupStats: Map<string, EnemyGroupStats>;
  /** 이벤트별 통계 */
  eventStats: Map<string, EventStats>;
  /** 런 전체 통계 */
  runStats: RunStats & {
    /** 난이도 (시뮬레이션 설정) */
    difficulty?: number;
  };
  /** 전투 기록 목록 */
  battleRecords: BattleRecord[];
  /** 카드 승급 통계 */
  upgradeStats: CardUpgradeStats;
  /** 성장 시스템 통계 */
  growthStats: GrowthStats;
  /** 상점 통계 */
  shopStats: ShopStats;
  /** 던전 통계 */
  dungeonStats: DungeonStats;
  /** 상점 서비스 상세 통계 */
  shopServiceStats: ShopServiceStats;
  /** 아이템 활용 통계 */
  itemUsageStats: ItemUsageStats;
  /** 이벤트 선택 상세 통계 */
  eventChoiceStats: Map<string, EventChoiceStats>;
  /** AI 전략 통계 */
  aiStrategyStats: AIStrategyStats;
  /** 카드 픽률 통계 */
  cardPickStats: CardPickStats;
  /** 카드 기여도 통계 */
  cardContributionStats: CardContributionStats;
  /** 카드 시너지 통계 */
  cardSynergyStats: CardSynergyStats;
  /** 카드 심층 분석 통계 */
  cardDeepStats: Map<string, CardDeepStats>;
  /** 사망 통계 */
  deathStats: DeathStats;
  /** 상징 통계 */
  relicStats: Map<string, RelicStats>;
  /** 기록 통계 */
  recordStats: RecordStats;
  /** 난이도별 통계 (Hades Heat 스타일) */
  difficultyStats: Map<number, DifficultyStats>;
  /** 최근 런 진행 기록 (최대 10개) */
  recentRunProgressions: RunProgressionStats[];
  /** 전체 카드 선택 기록 (분석용) */
  allCardChoices: CardChoiceContext[];

  // ==================== 신규 상세 통계 ====================

  /** 토큰별 통계 */
  tokenStats: Map<string, TokenStats>;
  /** 포커 콤보 통계 */
  pokerComboStats: PokerComboStats;
  /** 층 진행 분석 */
  floorProgressionAnalysis: FloorProgressionAnalysis;

  // ==================== 영향력 분석 ====================

  /** 이벤트 영향력 분석 */
  eventImpactAnalysis: EventImpactAnalysis;
  /** 상징 시너지 영향력 분석 */
  relicSynergyImpactAnalysis: RelicSynergyImpactAnalysis;
  /** AI 성장 선택 이유 분석 */
  growthDecisionAnalysis: GrowthDecisionAnalysis;
  /** 카드 선택 이유 분석 */
  cardSelectionReasoningAnalysis: CardSelectionReasoningAnalysis;

  // ==================== 게임 요소 영향도 분석 ====================

  /** 게임 요소별 영향도 분석 (카드/상징/아이템/성장/승급/이벤트/상점/던전/전투 비교) */
  elementImpactAnalysis: ElementImpactAnalysis;
  /** 노드 타입별 가치 비교 */
  nodeTypeValueComparison: Map<string, NodeTypeValueComparison>;
}

// ==================== 이벤트 영향력 분석 ====================

/** 이벤트 영향력 분석 */
export interface EventImpactAnalysis {
  /** 이벤트별 영향력 */
  eventImpacts: Map<string, EventImpactStats>;
  /** 가장 긍정적인 이벤트 TOP 5 */
  mostBeneficialEvents: EventImpactRanking[];
  /** 가장 부정적인 이벤트 TOP 5 */
  mostDetrimentalEvents: EventImpactRanking[];
  /** 이벤트 선택이 런 결과에 미친 영향 (전체) */
  overallEventInfluence: {
    /** 이벤트가 승리에 기여한 정도 (0-1) */
    winContribution: number;
    /** 이벤트가 패배에 기여한 정도 (0-1) */
    lossContribution: number;
    /** 가장 치명적인 이벤트 선택 */
    mostFatalChoice: { eventId: string; choiceId: string; deathRate: number } | null;
  };
}

/** 개별 이벤트 영향력 통계 */
export interface EventImpactStats {
  eventId: string;
  eventName: string;
  /** 발생 횟수 */
  occurrences: number;
  /** 이벤트 발생 후 런 승률 */
  winRateAfterEvent: number;
  /** 이벤트 스킵 시 런 승률 */
  winRateWhenSkipped: number;
  /** 순 영향력 (발생 후 승률 - 스킵 시 승률) */
  netImpact: number;
  /** 선택지별 영향력 */
  choiceImpacts: EventChoiceImpact[];
  /** 이벤트 후 생존 확률 (다음 3층까지) */
  survivalProbability: number;
  /** 이벤트로 인한 평균 자원 변화 */
  avgResourceChanges: {
    hp: number;
    gold: number;
    deckQuality: number; // 덱 품질 변화 추정
    relicValue: number;  // 획득 상징 가치
  };
  /** 이벤트 후 패배까지 평균 층 수 */
  avgFloorsToDeathAfter: number;
  /** 이벤트가 직접적으로 패배를 유발한 횟수 (HP 부족 등) */
  directDeathCount: number;
}

/** 이벤트 선택지 영향력 */
export interface EventChoiceImpact {
  choiceId: string;
  choiceName: string;
  /** 선택 횟수 */
  timesChosen: number;
  /** 이 선택 후 승률 */
  winRateAfterChoice: number;
  /** 다른 선택지 대비 승률 차이 */
  winRateDifferential: number;
  /** 이 선택이 최적이었던 비율 */
  optimalChoiceRate: number;
  /** 선택 이유 분포 */
  reasonDistribution: Record<string, number>;
  /** 결과별 분포 */
  outcomeDistribution: {
    positive: number;   // 좋은 결과
    neutral: number;    // 보통
    negative: number;   // 나쁜 결과
    fatal: number;      // 치명적 (HP 0 또는 직접 패배)
  };
}

/** 이벤트 영향력 순위 */
export interface EventImpactRanking {
  eventId: string;
  eventName: string;
  /** 순 영향력 */
  netImpact: number;
  /** Z-score (밸런스 이상치) */
  zScore: number;
  /** 권장 행동 */
  recommendation: 'always_do' | 'situational' | 'avoid' | 'skip';
  /** 최적 선택지 */
  optimalChoice: string | null;
}

// ==================== 상징 시너지 영향력 분석 ====================

/** 상징 시너지 영향력 분석 */
export interface RelicSynergyImpactAnalysis {
  /** 상징 조합별 시너지 */
  synergyCombinations: Map<string, RelicSynergyStats>;
  /** 가장 강력한 시너지 TOP 10 */
  topSynergies: RelicSynergyRanking[];
  /** 안티 시너지 (함께 있으면 안 좋은 조합) */
  antiSynergies: RelicSynergyRanking[];
  /** 상징 수에 따른 승률 곡선 */
  relicCountImpact: {
    count: number;
    winRate: number;
    avgValue: number;
  }[];
  /** 핵심 상징 (있으면 승률 급상승) */
  coreRelics: CoreRelicStats[];
  /** 상황별 상징 가치 */
  contextualRelicValues: Map<string, ContextualRelicValue>;
}

/** 상징 시너지 통계 */
export interface RelicSynergyStats {
  /** 조합 키 (relicId1:relicId2 형태) */
  combinationKey: string;
  relicIds: string[];
  relicNames: string[];
  /** 함께 보유한 횟수 */
  coOccurrences: number;
  /** 함께 보유 시 승률 */
  combinedWinRate: number;
  /** 개별 보유 시 평균 승률 */
  individualWinRate: number;
  /** 시너지 효과 (조합 승률 - 개별 평균 승률) */
  synergyBonus: number;
  /** 조합 시 평균 효과 발동 횟수 증가 */
  activationBoost: number;
  /** 조합으로 인한 추가 가치 */
  additionalValue: {
    damageBoost: number;
    survivalBoost: number;
    resourceBoost: number;
  };
  /** 최적 획득 순서 */
  optimalAcquisitionOrder: string[];
}

/** 상징 시너지 순위 */
export interface RelicSynergyRanking {
  combinationKey: string;
  relicNames: string[];
  /** 시너지 점수 (0-1) */
  synergyScore: number;
  /** 승률 증가 */
  winRateBoost: number;
  /** 획득 난이도 (희귀도 기반) */
  acquisitionDifficulty: number;
  /** 효율성 (시너지 / 난이도) */
  efficiency: number;
  /** 권장 상황 */
  recommendedContext: string[];
}

/** 핵심 상징 통계 */
export interface CoreRelicStats {
  relicId: string;
  relicName: string;
  /** 보유 시 승률 */
  winRateWith: number;
  /** 미보유 시 승률 */
  winRateWithout: number;
  /** 핵심도 점수 (차이) */
  coreScore: number;
  /** 빌드 정의 상징 여부 (특정 전략 활성화) */
  isBuildDefining: boolean;
  /** 함께 가져가야 할 상징 */
  mustHavePairs: string[];
  /** 최적 획득 시점 (층) */
  optimalAcquisitionFloor: number;
}

/** 상황별 상징 가치 */
export interface ContextualRelicValue {
  relicId: string;
  /** 초반 가치 (층 1-5) */
  earlyValue: number;
  /** 중반 가치 (층 6-10) */
  midValue: number;
  /** 후반 가치 (층 11+) */
  lateValue: number;
  /** 전투 유형별 가치 */
  valueByBattleType: {
    normal: number;
    elite: number;
    boss: number;
  };
  /** 덱 유형별 가치 */
  valueByDeckType: Record<string, number>;
  /** 가치 변동 요인 */
  valueFactors: string[];
}

// ==================== AI 성장 선택 이유 분석 ====================

/** AI 성장 선택 이유 분석 */
export interface GrowthDecisionAnalysis {
  /** 성장 결정 기록 */
  decisions: GrowthDecisionRecord[];
  /** 스탯별 선택 이유 분포 */
  reasonsByType: Record<string, Record<string, number>>;
  /** 상황별 선택 패턴 */
  contextualPatterns: GrowthContextPattern[];
  /** 선택 정확도 (결과 기반 평가) */
  decisionAccuracy: {
    /** 올바른 선택 비율 (승리 런에서) */
    correctChoiceRate: number;
    /** 가장 자주 틀린 선택 */
    commonMistakes: GrowthMistake[];
    /** 상황별 정확도 */
    accuracyByContext: Record<string, number>;
  };
  /** 최적 성장 경로 추천 */
  optimalPaths: OptimalGrowthPath[];
}

/** 성장 결정 기록 */
export interface GrowthDecisionRecord {
  /** 결정 시점 층 */
  floor: number;
  /** 현재 스탯 상태 */
  currentStats: Record<string, number>;
  /** 선택한 스탯 */
  chosenType: 'trait' | 'ethos' | 'pathos' | 'logos';
  /** 선택한 구체적 스탯/스킬 */
  chosenStat: string;
  /** 제시된 선택지들 */
  availableOptions: string[];
  /** 선택 이유 */
  reasons: GrowthDecisionReason[];
  /** 선택 시 컨텍스트 */
  context: GrowthDecisionContext;
  /** 결과 (해당 런 결과) */
  outcome: 'win' | 'loss';
  /** 선택이 올바랐는지 (후행 분석) */
  wasOptimal: boolean;
}

/** 성장 결정 이유 */
export interface GrowthDecisionReason {
  /** 이유 타입 */
  type: 'synergy' | 'weakness_cover' | 'deck_complement' | 'relic_synergy' | 'current_situation' | 'long_term_plan';
  /** 이유 설명 */
  description: string;
  /** 이유 가중치 (0-1) */
  weight: number;
  /** 관련 카드/상징 ID */
  relatedItems?: string[];
}

/** 성장 결정 컨텍스트 */
export interface GrowthDecisionContext {
  /** 현재 HP 비율 */
  hpRatio: number;
  /** 현재 덱 구성 */
  deckComposition: { attacks: number; skills: number; powers: number };
  /** 보유 상징 */
  relics: string[];
  /** 최근 전투 결과 */
  recentBattleResults: ('win' | 'loss')[];
  /** 남은 보스까지 거리 */
  floorsToNextBoss: number;
}

/** 성장 컨텍스트 패턴 */
export interface GrowthContextPattern {
  /** 패턴 이름 */
  patternName: string;
  /** 패턴 조건 */
  conditions: Record<string, unknown>;
  /** 이 패턴에서 선호되는 선택 */
  preferredChoices: { stat: string; frequency: number; winRate: number }[];
  /** 이 패턴의 최적 선택 */
  optimalChoice: string;
  /** 패턴 발생 빈도 */
  frequency: number;
}

/** 성장 실수 분석 */
export interface GrowthMistake {
  /** 실수 유형 */
  mistakeType: string;
  /** 선택한 스탯 */
  chosenStat: string;
  /** 최적이었던 스탯 */
  optimalStat: string;
  /** 발생 횟수 */
  occurrences: number;
  /** 승률 손실 */
  winRateLoss: number;
  /** 실수 상황 설명 */
  situationDescription: string;
}

/** 최적 성장 경로 */
export interface OptimalGrowthPath {
  /** 경로 이름 */
  pathName: string;
  /** 경로 단계 */
  steps: { floor: number; stat: string; reason: string }[];
  /** 이 경로의 승률 */
  winRate: number;
  /** 권장 상황 */
  recommendedFor: string[];
  /** 필요한 상징/카드 */
  requirements: string[];
}

// ==================== 카드 선택 이유 분석 ====================

/** 카드 선택 이유 분석 */
export interface CardSelectionReasoningAnalysis {
  /** 카드 선택 결정 기록 */
  decisions: CardSelectionDecision[];
  /** 카드별 선택 이유 분포 */
  reasonsByCard: Map<string, Record<string, number>>;
  /** 스킵 이유 분석 */
  skipReasonAnalysis: SkipReasonAnalysis;
  /** 선택 정확도 */
  selectionAccuracy: {
    /** 올바른 선택 비율 */
    correctRate: number;
    /** 자주 하는 실수 */
    commonMistakes: CardSelectionMistake[];
    /** 상황별 정확도 */
    accuracyByContext: Record<string, number>;
  };
  /** 카드 가치 평가 */
  cardValueAssessment: Map<string, CardValueAssessment>;
  /** 상황별 최적 픽 가이드 */
  optimalPickGuide: CardPickGuideEntry[];
}

/** 카드 선택 결정 */
export interface CardSelectionDecision {
  /** 선택 시점 층 */
  floor: number;
  /** 제시된 카드들 */
  offeredCards: string[];
  /** 선택한 카드 (null = 스킵) */
  pickedCard: string | null;
  /** 선택/스킵 이유들 */
  reasons: CardSelectionReason[];
  /** 선택 시 컨텍스트 */
  context: CardSelectionContext;
  /** 런 결과 */
  runOutcome: 'win' | 'loss';
  /** 이 선택이 최적이었는지 */
  wasOptimal: boolean;
  /** 실제로 사용된 횟수 (해당 런에서) */
  timesUsedInRun: number;
}

/** 카드 선택 이유 */
export interface CardSelectionReason {
  /** 이유 타입 */
  type:
    | 'deck_synergy'        // 덱과 시너지
    | 'missing_type'        // 부족한 타입 보충
    | 'relic_synergy'       // 상징과 시너지
    | 'current_weakness'    // 현재 약점 보완
    | 'power_level'         // 단순 강함
    | 'combo_potential'     // 콤보 가능성
    | 'enemy_counter'       // 다가오는 적 대응
    | 'skip_bloat'          // 덱 비대화 방지
    | 'skip_redundant'      // 이미 충분
    | 'skip_weak'           // 카드가 약함
    | 'trait_synergy'       // 특성과 시너지
    | 'ether_synergy';      // 에테르와 시너지
  /** 이유 설명 */
  description: string;
  /** 이유 가중치 */
  weight: number;
  /** 관련 카드/상징 */
  relatedItems?: string[];
}

/** 카드 선택 컨텍스트 */
export interface CardSelectionContext {
  /** 현재 층 */
  floor: number;
  /** 현재 덱 크기 */
  deckSize: number;
  /** 덱 구성 */
  deckComposition: {
    attacks: number;
    skills: number;
    powers: number;
    byTrait: Record<string, number>;
  };
  /** HP 상태 */
  hpRatio: number;
  /** 보유 상징 */
  relics: string[];
  /** 최근 전투 어려움 정도 */
  recentDifficulty: 'easy' | 'medium' | 'hard';
  /** 다음 노드 타입 */
  upcomingNodes: string[];
}

/** 스킵 이유 분석 */
export interface SkipReasonAnalysis {
  /** 총 스킵 횟수 */
  totalSkips: number;
  /** 이유별 분포 */
  reasonDistribution: Record<string, number>;
  /** 스킵 시 런 승률 */
  winRateAfterSkip: number;
  /** 스킵해야 했는데 안 한 경우 */
  shouldHaveSkipped: {
    cardId: string;
    occurrences: number;
    winRateLoss: number;
  }[];
  /** 스킵하지 말았어야 했는데 한 경우 */
  shouldNotHaveSkipped: {
    cardId: string;
    occurrences: number;
    winRateLoss: number;
  }[];
}

/** 카드 선택 실수 */
export interface CardSelectionMistake {
  /** 실수 유형 */
  mistakeType: 'picked_wrong' | 'missed_good' | 'should_skip' | 'should_not_skip';
  /** 선택한 카드 */
  pickedCard: string | null;
  /** 최적이었던 카드 */
  optimalCard: string | null;
  /** 발생 횟수 */
  occurrences: number;
  /** 승률 손실 */
  winRateLoss: number;
  /** 상황 설명 */
  situationDescription: string;
}

/** 카드 가치 평가 */
export interface CardValueAssessment {
  cardId: string;
  cardName: string;
  /** 기본 가치 (상황 무관) */
  baseValue: number;
  /** 상황별 가치 수정 */
  contextModifiers: {
    condition: string;
    modifier: number;
  }[];
  /** 시너지 보너스 (특정 카드/상징 보유 시) */
  synergyBonuses: {
    itemId: string;
    bonus: number;
  }[];
  /** 최적 픽 상황 */
  optimalConditions: string[];
  /** 스킵해야 할 상황 */
  skipConditions: string[];
}

/** 카드 픽 가이드 */
export interface CardPickGuideEntry {
  /** 상황 설명 */
  situation: string;
  /** 상황 조건 */
  conditions: Record<string, unknown>;
  /** 추천 픽 순위 */
  recommendedPicks: { cardId: string; priority: number; reason: string }[];
  /** 피해야 할 픽 */
  avoidPicks: { cardId: string; reason: string }[];
  /** 스킵 권장 여부 */
  shouldSkip: boolean;
  /** 스킵 이유 */
  skipReason?: string;
}

// ==================== 게임 요소별 영향도 분석 ====================

/** 게임 요소 카테고리 */
export type GameElementCategory =
  | 'cards'      // 카드 (덱 빌딩)
  | 'relics'     // 상징
  | 'items'      // 아이템
  | 'growth'     // 성장 (특성/에토스)
  | 'upgrades'   // 승급
  | 'events'     // 이벤트
  | 'shops'      // 상점
  | 'dungeons'   // 던전
  | 'combats';   // 전투

/** 게임 요소별 영향도 분석 */
export interface ElementImpactAnalysis {
  /** 각 요소 카테고리별 통계 */
  categories: Map<GameElementCategory, ElementCategoryStats>;
  /** 요소 간 상대적 가치 비교 */
  comparativeValue: ElementComparativeValue;
  /** 전략별 요소 활용도 */
  strategyUsage: Map<string, StrategyElementUsage>;
  /** 요소별 최적화 제안 */
  optimizationSuggestions: ElementOptimizationSuggestion[];
}

/** 개별 요소 카테고리 통계 */
export interface ElementCategoryStats {
  /** 카테고리 ID */
  category: GameElementCategory;
  /** 카테고리명 (한글) */
  categoryName: string;
  /** 총 획득/발생 횟수 */
  totalOccurrences: number;
  /** 런당 평균 획득/발생 */
  avgPerRun: number;
  /** 이 요소 사용 시 승률 */
  winRateWithElement: number;
  /** 이 요소 미사용 시 승률 */
  winRateWithoutElement: number;
  /** 승률 기여도 (차이) */
  winRateContribution: number;
  /** 평균 층 도달 기여도 */
  avgFloorContribution: number;
  /** 골드 효율 (투자 대비 효과) */
  goldEfficiency: number;
  /** HP 영향 (양수: 회복, 음수: 손실) */
  avgHpImpact: number;
  /** 전투 턴 감소 기여도 */
  avgTurnReduction: number;
  /** 상위 기여 항목 TOP 5 */
  topContributors: ElementContributor[];
  /** 하위 기여 항목 BOTTOM 5 */
  bottomContributors: ElementContributor[];
}

/** 개별 요소 기여도 */
export interface ElementContributor {
  /** 요소 ID */
  id: string;
  /** 요소명 */
  name: string;
  /** 획득/사용 횟수 */
  occurrences: number;
  /** 승률 기여도 */
  winRateContribution: number;
  /** 평균 효과 */
  avgEffect: number;
}

/** 요소 간 상대적 가치 비교 */
export interface ElementComparativeValue {
  /** 전투 1회 대비 가치 (1.0 = 전투 1회와 동등) */
  valuePerCombat: Record<GameElementCategory, number>;
  /** 골드 100당 가치 */
  valuePer100Gold: Record<GameElementCategory, number>;
  /** HP 10당 가치 */
  valuePer10Hp: Record<GameElementCategory, number>;
  /** 요소별 ROI (투자 대비 수익) */
  roi: Record<GameElementCategory, number>;
  /** 권장 투자 우선순위 */
  recommendedPriority: GameElementCategory[];
}

/** 전략별 요소 활용도 */
export interface StrategyElementUsage {
  /** 전략 ID */
  strategyId: string;
  /** 전략명 */
  strategyName: string;
  /** 요소별 활용 빈도 */
  usageFrequency: Record<GameElementCategory, number>;
  /** 요소별 효과 */
  elementEffectiveness: Record<GameElementCategory, number>;
  /** 최적 요소 조합 */
  optimalCombination: GameElementCategory[];
  /** 과소활용 요소 */
  underutilizedElements: GameElementCategory[];
  /** 과다활용 요소 */
  overutilizedElements: GameElementCategory[];
}

/** 요소 최적화 제안 */
export interface ElementOptimizationSuggestion {
  /** 제안 우선순위 */
  priority: number;
  /** 대상 요소 */
  targetElement: GameElementCategory;
  /** 제안 유형 */
  suggestionType: 'buff' | 'nerf' | 'rework' | 'rebalance';
  /** 제안 내용 */
  description: string;
  /** 예상 효과 */
  expectedImpact: string;
  /** 관련 데이터 */
  supportingData: {
    currentValue: number;
    targetValue: number;
    affectedItems: string[];
  };
}

/** 노드 타입별 가치 비교 */
export interface NodeTypeValueComparison {
  /** 노드 타입 */
  nodeType: string;
  /** 발생 횟수 */
  occurrences: number;
  /** 평균 골드 획득 */
  avgGoldGain: number;
  /** 평균 HP 변화 */
  avgHpChange: number;
  /** 평균 카드 획득 */
  avgCardsGained: number;
  /** 평균 상징 획득 */
  avgRelicsGained: number;
  /** 승률 기여도 */
  winRateContribution: number;
  /** 전투 1회 대비 가치 */
  combatEquivalentValue: number;
}
