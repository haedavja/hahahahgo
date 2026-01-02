/**
 * @file adapters.ts
 * @description 게임/시뮬레이터 타입 변환 어댑터
 *
 * 게임과 시뮬레이터 간의 타입 차이를 변환하는 유틸리티 함수들입니다.
 */

import type {
  BasePlayerState,
  BaseEnemyState,
  GameCard,
  TokenState,
  BattleResult,
  TimelineCard,
  EnemyUnit,
  EnemyPassives,
  CombatantState,
} from './shared';

// ==================== 게임 → 시뮬레이터 변환 ====================

/**
 * 게임 플레이어 상태를 시뮬레이터용으로 변환
 */
export function toSimulatorPlayer(gamePlayer: {
  hp: number;
  maxHp: number;
  block?: number;
  energy?: number;
  maxEnergy?: number;
  strength?: number;
  agility?: number;
  insight?: number;
  tokens?: TokenState;
  hand?: string[];
  deck?: string[];
  discard?: string[];
  relics?: string[];
  ether?: number;
  maxSpeed?: number;
}): BasePlayerState {
  return {
    hp: gamePlayer.hp,
    maxHp: gamePlayer.maxHp,
    block: gamePlayer.block ?? 0,
    energy: gamePlayer.energy ?? 3,
    maxEnergy: gamePlayer.maxEnergy ?? 3,
    strength: gamePlayer.strength ?? 0,
    agility: gamePlayer.agility ?? 0,
    insight: gamePlayer.insight ?? 0,
    tokens: gamePlayer.tokens ?? {},
    hand: gamePlayer.hand ?? [],
    deck: gamePlayer.deck ?? [],
    discard: gamePlayer.discard ?? [],
    relics: gamePlayer.relics ?? [],
    ether: gamePlayer.ether ?? 0,
    maxSpeed: gamePlayer.maxSpeed ?? 30,
  };
}

/**
 * 게임 적 상태를 시뮬레이터용으로 변환
 */
export function toSimulatorEnemy(gameEnemy: {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  block?: number;
  tokens?: TokenState;
  maxSpeed?: number;
  cardsPerTurn?: number;
  deck?: string[];
  emoji?: string;
  tier?: number;
  isBoss?: boolean;
  description?: string;
  passives?: EnemyPassives;
  units?: EnemyUnit[];
}): BaseEnemyState & { passives?: EnemyPassives; units?: EnemyUnit[] } {
  return {
    id: gameEnemy.id,
    name: gameEnemy.name,
    hp: gameEnemy.hp,
    maxHp: gameEnemy.maxHp,
    block: gameEnemy.block ?? 0,
    tokens: gameEnemy.tokens ?? {},
    maxSpeed: gameEnemy.maxSpeed ?? 30,
    cardsPerTurn: gameEnemy.cardsPerTurn ?? 1,
    deck: gameEnemy.deck ?? [],
    emoji: gameEnemy.emoji,
    tier: gameEnemy.tier,
    isBoss: gameEnemy.isBoss,
    description: gameEnemy.description,
    passives: gameEnemy.passives,
    units: gameEnemy.units,
  };
}

/**
 * 게임 카드를 시뮬레이터용으로 변환
 */
export function toSimulatorCard(gameCard: GameCard): GameCard {
  // 게임 카드와 시뮬레이터 카드는 동일한 구조
  return { ...gameCard };
}

/**
 * 게임 타임라인 아이템을 시뮬레이터용으로 변환
 */
export function toSimulatorTimelineCard(item: {
  cardId?: string;
  id?: string;
  owner?: 'player' | 'enemy';
  actor?: 'player' | 'enemy';
  position?: number;
  sp?: number;
  speed?: number;
  crossed?: boolean;
  executed?: boolean;
}): TimelineCard {
  return {
    cardId: item.cardId ?? item.id ?? '',
    owner: item.owner ?? item.actor ?? 'player',
    position: item.position ?? item.sp ?? item.speed ?? 0,
    sp: item.sp ?? item.position ?? item.speed ?? 0,
    crossed: item.crossed,
    executed: item.executed,
  };
}

// ==================== 시뮬레이터 → 게임 변환 ====================

/**
 * 시뮬레이터 전투 결과를 게임 형식으로 변환
 */
export function toGameBattleResult(simResult: BattleResult): {
  victory: boolean;
  turns: number;
  playerHp: number;
  enemyHp: number;
  etherGained: number;
  battleLog: string[];
} {
  return {
    victory: simResult.winner === 'player',
    turns: simResult.turns,
    playerHp: simResult.playerFinalHp,
    enemyHp: simResult.enemyFinalHp,
    etherGained: simResult.etherGained,
    battleLog: simResult.battleLog,
  };
}

/**
 * 시뮬레이터 전투 참여자를 게임 형식으로 변환
 */
export function toGameCombatant(simCombatant: CombatantState): {
  hp: number;
  maxHp: number;
  block: number;
  tokens: TokenState;
} {
  return {
    hp: simCombatant.hp,
    maxHp: simCombatant.maxHp,
    block: simCombatant.block,
    tokens: { ...simCombatant.tokens },
  };
}

// ==================== 유틸리티 함수 ====================

/**
 * 토큰 상태 깊은 복사
 */
export function cloneTokenState(tokens: TokenState): TokenState {
  return { ...tokens };
}

/**
 * 전투 결과가 승리인지 확인
 */
export function isVictory(result: BattleResult): boolean {
  return result.winner === 'player' || result.victory === true;
}

/**
 * 적 유닛이 살아있는지 확인
 */
export function isUnitAlive(unit: EnemyUnit): boolean {
  return unit.hp > 0;
}

/**
 * 적 유닛 목록에서 살아있는 유닛만 필터링
 */
export function getAliveUnits(units: EnemyUnit[]): EnemyUnit[] {
  return units.filter(isUnitAlive);
}

/**
 * 토큰 스택 적용 (음수 방지)
 */
export function applyTokenStacks(
  tokens: TokenState,
  tokenId: string,
  stacks: number
): TokenState {
  const current = tokens[tokenId] ?? 0;
  const newValue = Math.max(0, current + stacks);

  if (newValue === 0) {
    const result = { ...tokens };
    delete result[tokenId];
    return result;
  }

  return {
    ...tokens,
    [tokenId]: newValue,
  };
}

/**
 * 토큰이 있는지 확인
 */
export function hasToken(tokens: TokenState, tokenId: string): boolean {
  return (tokens[tokenId] ?? 0) > 0;
}

/**
 * 토큰 스택 가져오기
 */
export function getTokenStacks(tokens: TokenState, tokenId: string): number {
  return tokens[tokenId] ?? 0;
}

// ==================== 밸리데이션 ====================

/**
 * 유효한 카드 ID인지 확인
 */
export function isValidCardId(cardId: string | undefined | null): cardId is string {
  return typeof cardId === 'string' && cardId.length > 0;
}

/**
 * 유효한 적 ID인지 확인
 */
export function isValidEnemyId(enemyId: string | undefined | null): enemyId is string {
  return typeof enemyId === 'string' && enemyId.length > 0;
}

/**
 * 유효한 전투 결과인지 확인
 */
export function isValidBattleResult(result: unknown): result is BattleResult {
  if (!result || typeof result !== 'object') return false;
  const r = result as Record<string, unknown>;
  return (
    (r.winner === 'player' || r.winner === 'enemy' || r.winner === 'draw') &&
    typeof r.turns === 'number' &&
    typeof r.playerFinalHp === 'number' &&
    typeof r.enemyFinalHp === 'number'
  );
}

// ==================== 기본값 생성 ====================

/**
 * 기본 플레이어 상태 생성
 */
export function createDefaultPlayerState(overrides?: Partial<BasePlayerState>): BasePlayerState {
  return {
    hp: 100,
    maxHp: 100,
    block: 0,
    energy: 3,
    maxEnergy: 3,
    strength: 0,
    agility: 0,
    insight: 0,
    tokens: {},
    hand: [],
    deck: [],
    discard: [],
    relics: [],
    ether: 0,
    maxSpeed: 30,
    ...overrides,
  };
}

/**
 * 기본 적 상태 생성
 */
export function createDefaultEnemyState(
  id: string,
  name: string,
  overrides?: Partial<BaseEnemyState>
): BaseEnemyState {
  return {
    id,
    name,
    hp: 50,
    maxHp: 50,
    block: 0,
    tokens: {},
    maxSpeed: 30,
    cardsPerTurn: 1,
    deck: [],
    ...overrides,
  };
}

/**
 * 빈 전투 결과 생성
 */
export function createEmptyBattleResult(): BattleResult {
  return {
    winner: 'draw',
    victory: false,
    turns: 0,
    playerDamageDealt: 0,
    enemyDamageDealt: 0,
    playerFinalHp: 0,
    enemyFinalHp: 0,
    etherGained: 0,
    goldChange: 0,
    battleLog: [],
    events: [],
    cardUsage: {},
    comboStats: {},
    tokenStats: {},
    timeline: [],
  };
}
