/**
 * @file types.ts
 * @description 시뮬레이터 코어 타입 정의
 */

// ==================== 엔티티 타입 ====================

export interface TokenState {
  [key: string]: number;
}

export interface SimEntity {
  hp: number;
  maxHp: number;
  block: number;
  strength: number;
  etherPts: number;
  tokens: TokenState;
  def?: boolean;
  counter?: number;
  vulnMult?: number;
  etherOverdriveActive?: boolean;
}

export interface SimPlayerState extends SimEntity {
  deck: string[];
  hand: string[];
  discard: string[];
  energy: number;
  maxEnergy: number;
  relics: string[];
  // 추가 상태
  speed?: number;
  dexterity?: number;
  exhaust?: string[];
  agility?: number;
}

export interface SimEnemyState extends SimEntity {
  id: string;
  name: string;
  deck: string[];
  cardsPerTurn: number;
  // 추가 상태
  speed?: number;
  dexterity?: number;
  agility?: number;
}

// ==================== 전투 결과 ====================

/** 효과값 추적 (토큰/아이템/상징 등의 실제 효과 기록) */
export interface EffectValueRecord {
  count: number;
  totalDamage: number;
  totalBlock: number;
  totalHealing: number;
  totalEther: number;
  otherEffects: Record<string, number>;
}

export interface BattleResult {
  winner: 'player' | 'enemy' | 'draw';
  turns: number;
  playerDamageDealt: number;
  enemyDamageDealt: number;
  playerFinalHp: number;
  enemyFinalHp: number;
  etherGained?: number;
  battleLog: string[];
  cardUsage: Record<string, number>;
  comboStats: Record<string, number>;
  tokenStats?: Record<string, number>;
  tokenEffectStats?: Record<string, EffectValueRecord>;
  itemEffectStats?: Record<string, EffectValueRecord>;
  relicEffectStats?: Record<string, EffectValueRecord>;
  events?: unknown[];
  timeline?: unknown[];
  goldChange?: number;
  victory?: boolean;
  battleId?: string;
  enemyId?: string;
  // 호환성 별칭
  totalDamageDealt?: number;
  playerHealth?: number;
  enemyHealth?: number;
  log?: string[];
}

export interface SimulationConfig {
  battles: number;
  maxTurns: number;
  enemyIds: string[];
  playerDeck: string[];
  playerRelics?: string[];
  playerStats?: {
    hp?: number;
    maxHp?: number;
    energy?: number;
  };
  anomalyId?: string;
  anomalyLevel?: number;
  verbose?: boolean;
}

export interface SimulationResult {
  config: SimulationConfig;
  results: BattleResult[];
  summary: SimulationSummary;
  timestamp: number;
  duration: number;
}

export interface SimulationSummary {
  totalBattles: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  avgTurns: number;
  avgPlayerDamage: number;
  avgEnemyDamage: number;
  cardEfficiency: Record<string, { uses: number; avgDamage: number }>;
  topCards?: Array<{ id: string; cardId?: string; uses: number; count?: number; avgDamage: number }>;
  avgEtherGained?: number;
  tokenUsage?: Record<string, number>;
}

// ==================== Worker 메시지 ====================

export interface WorkerTask {
  id: string;
  type: 'battle' | 'batch' | 'analysis';
  config: SimulationConfig;
  batchSize?: number;
}

export interface WorkerResult {
  id: string;
  type: 'battle' | 'batch' | 'analysis';
  results: BattleResult[];
  error?: string;
  duration: number;
}

export interface WorkerMessage {
  type: 'task' | 'result' | 'progress' | 'error' | 'ready';
  payload: WorkerTask | WorkerResult | ProgressUpdate | string;
}

export interface ProgressUpdate {
  taskId: string;
  completed: number;
  total: number;
  eta?: number;
}

// ==================== 분석 타입 ====================

export interface BalanceAnalysis {
  cardId: string;
  currentStats: CardStats;
  suggestedChanges: BalanceChange[];
  expectedWinRateChange: number;
}

export interface CardStats {
  attack?: number;
  defense?: number;
  cost?: number;
  special?: Record<string, number>;
}

export interface BalanceChange {
  stat: string;
  currentValue: number;
  suggestedValue: number;
  confidence: number;
  reason: string;
}

export interface ABTestConfig {
  name: string;
  description: string;
  controlConfig: SimulationConfig;
  variantConfig: SimulationConfig;
  sampleSize: number;
}

export interface ABTestResult {
  config: ABTestConfig;
  controlResults: SimulationSummary;
  variantResults: SimulationSummary;
  significance: number;
  winner: 'control' | 'variant' | 'inconclusive';
  recommendation: string;
}

// ==================== MCTS 타입 ====================

export interface MCTSNode {
  state: GameState;
  parent: MCTSNode | null;
  children: MCTSNode[];
  action: string | null;
  visits: number;
  value: number;
  untriedActions: string[];
}

export interface GameState {
  player: SimPlayerState;
  enemy: SimEnemyState;
  turn: number;
  phase: 'select' | 'respond' | 'resolve' | 'action' | 'end';
  timeline: TimelineCard[];
}

export interface TimelineCard {
  id: string;
  cardId: string;
  owner: 'player' | 'enemy';
  position: number;
}

// ==================== 영속성 타입 ====================

export interface HistoryEntry {
  id: string;
  timestamp: number;
  config: SimulationConfig;
  summary: SimulationSummary;
  tags?: string[];
  notes?: string;
}

export interface QueryOptions {
  startDate?: number;
  endDate?: number;
  tags?: string[];
  enemyIds?: string[];
  minWinRate?: number;
  maxWinRate?: number;
  limit?: number;
  offset?: number;
}

// ==================== 대시보드 타입 ====================

export interface DashboardState {
  activeSimulations: SimulationProgress[];
  recentResults: SimulationResult[];
  systemStats: SystemStats;
}

export interface SimulationProgress {
  id: string;
  config: SimulationConfig;
  progress: number;
  startTime: number;
  estimatedEnd?: number;
}

export interface SystemStats {
  cpuUsage: number;
  memoryUsage: number;
  activeWorkers: number;
  totalSimulations: number;
  avgSimulationTime: number;
}

// ==================== CI/CD 타입 ====================

export interface BalanceCheckResult {
  passed: boolean;
  warnings: BalanceWarning[];
  errors: BalanceError[];
  report: string;
}

export interface BalanceWarning {
  type: 'winrate_shift' | 'card_dominance' | 'enemy_too_easy' | 'enemy_too_hard';
  message: string;
  severity: 'low' | 'medium' | 'high';
  details: Record<string, unknown>;
}

export interface BalanceError {
  type: 'critical_imbalance' | 'broken_mechanic' | 'infinite_loop';
  message: string;
  details: Record<string, unknown>;
}
