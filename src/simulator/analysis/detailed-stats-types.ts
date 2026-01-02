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
  /** 스탯별 투자 횟수 */
  statInvestments: Record<string, number>;
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
  /** 기록 통계 */
  recordStats: RecordStats;
  /** 난이도별 통계 (Hades Heat 스타일) */
  difficultyStats: Map<number, DifficultyStats>;
  /** 최근 런 진행 기록 (최대 10개) */
  recentRunProgressions: RunProgressionStats[];
  /** 전체 카드 선택 기록 (분석용) */
  allCardChoices: CardChoiceContext[];
}
