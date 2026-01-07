/**
 * @file factories.ts
 * @description 테스트용 팩토리 함수
 *
 * ## 사용법
 * ```ts
 * import { createCard, createEntity, createTokenState } from '../test/factories';
 *
 * const card = createCard({ damage: 10 });
 * const entity = createEntity({ strength: 5 });
 * ```
 */

import type {
  Card,
  CardType,
  CardRarity,
  TokenState,
  TokenInstance,
  TokenEntity,
  TokenEffect,
  TokenType,
  Resources,
} from '../types/core';

// ==================== 카드 팩토리 ====================

/** 카드 기본값 */
const DEFAULT_CARD: Card = {
  id: 'test-card',
  name: 'Test Card',
  type: 'attack',
  speedCost: 5,
  actionCost: 1,
  description: 'A test card',
};

/** 카드 생성 */
export function createCard(overrides: Partial<Card> = {}): Card {
  return {
    ...DEFAULT_CARD,
    ...overrides,
  };
}

/** 공격 카드 생성 */
export function createAttackCard(overrides: Partial<Card> = {}): Card {
  return createCard({
    type: 'attack',
    damage: 10,
    ...overrides,
  });
}

/** 방어 카드 생성 */
export function createDefenseCard(overrides: Partial<Card> = {}): Card {
  return createCard({
    type: 'defense',
    block: 10,
    ...overrides,
  });
}

/** 지원 카드 생성 */
export function createSupportCard(overrides: Partial<Card> = {}): Card {
  return createCard({
    type: 'support',
    ...overrides,
  });
}

// ==================== 토큰 팩토리 ====================

/** 토큰 인스턴스 기본값 */
const DEFAULT_TOKEN_INSTANCE: TokenInstance = {
  id: 'test-token',
  stacks: 1,
};

/** 토큰 인스턴스 생성 */
export function createTokenInstance(overrides: Partial<TokenInstance> = {}): TokenInstance {
  return {
    ...DEFAULT_TOKEN_INSTANCE,
    ...overrides,
  };
}

/** 토큰 효과 페이로드 (테스트용) */
export interface TestTokenPayload extends TokenInstance {
  durationType?: TokenType;
  name?: string;
  effect?: TokenEffect;
}

/** 토큰 효과 포함 토큰 생성 */
export function createTokenWithEffect(overrides: Partial<TestTokenPayload> = {}): TestTokenPayload {
  return {
    id: 'test-token',
    stacks: 1,
    durationType: 'turn',
    effect: { type: 'ATTACK_BOOST', value: 0.5 },
    ...overrides,
  };
}

/** 빈 토큰 상태 생성 */
export function createEmptyTokenState(): TokenState {
  return {
    usage: [],
    turn: [],
    permanent: [],
  };
}

/** 토큰 상태 생성 */
export function createTokenState(
  overrides: Partial<TokenState> = {}
): TokenState {
  return {
    usage: [],
    turn: [],
    permanent: [],
    ...overrides,
  };
}

// ==================== 엔티티 팩토리 ====================

/** 엔티티 기본값 */
const DEFAULT_ENTITY: TokenEntity = {
  hp: 100,
  maxHp: 100,
  block: 0,
  tokens: createEmptyTokenState(),
};

/** 엔티티 생성 */
export function createEntity(
  overrides: Partial<TokenEntity> = {},
  stats: { strength?: number; agility?: number; insight?: number } = {}
): TokenEntity {
  return {
    ...DEFAULT_ENTITY,
    ...stats,
    ...overrides,
    tokens: overrides.tokens ?? createEmptyTokenState(),
  };
}

/** 플레이어 엔티티 생성 */
export function createPlayerEntity(
  overrides: Partial<TokenEntity> = {}
): TokenEntity {
  return createEntity({
    hp: 100,
    maxHp: 100,
    energy: 3,
    maxEnergy: 3,
    ...overrides,
  });
}

/** 적 엔티티 생성 */
export function createEnemyEntity(
  overrides: Partial<TokenEntity> = {}
): TokenEntity {
  return createEntity({
    hp: 50,
    maxHp: 50,
    ...overrides,
  });
}

/** 토큰이 있는 엔티티 생성 (TestTokenPayload의 effect 속성도 보존) */
export function createEntityWithTokens(
  tokens: Partial<{
    usage: Array<TokenInstance | TestTokenPayload>;
    turn: Array<TokenInstance | TestTokenPayload>;
    permanent: Array<TokenInstance | TestTokenPayload>;
  }>,
  entityOverrides: Partial<TokenEntity> = {},
  stats: { strength?: number; agility?: number; insight?: number } = {}
): TokenEntity {
  // TestTokenPayload의 모든 속성을 보존하면서 TokenInstance로 캐스팅
  const normalizedTokens: TokenState = {
    usage: (tokens.usage || []) as TokenInstance[],
    turn: (tokens.turn || []) as TokenInstance[],
    permanent: (tokens.permanent || []) as TokenInstance[],
  };

  return createEntity(
    {
      ...entityOverrides,
      tokens: normalizedTokens,
    },
    stats
  );
}

// ==================== 자원 팩토리 ====================

/** 자원 기본값 */
const DEFAULT_RESOURCES: Resources = {
  gold: 100,
  intel: 0,
  loot: 0,
  material: 0,
  etherPts: 0,
  memory: 0,
};

/** 자원 생성 */
export function createResources(overrides: Partial<Resources> = {}): Resources {
  return {
    ...DEFAULT_RESOURCES,
    ...overrides,
  };
}

// ==================== 전투 관련 팩토리 ====================

/** 타임라인 엔트리 타입 */
export interface TimelineEntry {
  actor: 'player' | 'enemy';
  sp: number;
  idx: number;
  card: Card;
  originalSpeed: number;
  finalSpeed: number;
}

/** 타임라인 엔트리 생성 */
export function createTimelineEntry(
  overrides: Partial<TimelineEntry> = {}
): TimelineEntry {
  const card = overrides.card ?? createCard();
  return {
    actor: 'player',
    sp: card.speedCost,
    idx: 0,
    card,
    originalSpeed: card.speedCost,
    finalSpeed: card.speedCost,
    ...overrides,
  };
}

/** 소모된 토큰 정보 */
export interface ConsumedTokenInfo {
  id: string;
  type: TokenType;
}

/** 소모된 토큰 생성 */
export function createConsumedToken(
  id: string,
  type: TokenType = 'usage'
): ConsumedTokenInfo {
  return { id, type };
}

// ==================== 헬퍼 함수 ====================

/** 공격력 증가 토큰 생성 (턴 지속, TOKENS의 'attack' 사용) */
export function createAttackBoostToken(
  stacks: number = 1,
  value: number = 0.5
): TestTokenPayload {
  return createTokenWithEffect({
    id: 'attack',
    stacks,
    durationType: 'turn',
    effect: { type: 'ATTACK_BOOST', value },
  });
}

/** 공격력 감소 토큰 생성 */
export function createAttackPenaltyToken(
  stacks: number = 1,
  value: number = 0.3
): TestTokenPayload {
  return createTokenWithEffect({
    id: 'dull',
    stacks,
    durationType: 'turn',
    effect: { type: 'ATTACK_PENALTY', value },
  });
}

/** 방어력 증가 토큰 생성 (턴 지속, TOKENS의 'defense' 사용) */
export function createDefenseBoostToken(
  stacks: number = 1,
  value: number = 0.5
): TestTokenPayload {
  return createTokenWithEffect({
    id: 'defense',
    stacks,
    durationType: 'turn',
    effect: { type: 'DEFENSE_BOOST', value },
  });
}

/** 방어력 감소 토큰 생성 */
export function createDefensePenaltyToken(
  stacks: number = 1,
  value: number = 0.4
): TestTokenPayload {
  return createTokenWithEffect({
    id: 'shaken',
    stacks,
    durationType: 'turn',
    effect: { type: 'DEFENSE_PENALTY', value },
  });
}

/** 회피 토큰 생성 */
export function createDodgeToken(
  stacks: number = 1,
  value: number = 0.5
): TestTokenPayload {
  return createTokenWithEffect({
    id: 'dodge',
    stacks,
    durationType: 'usage',
    name: '회피',
    effect: { type: 'DODGE', value },
  });
}

/** 반격 토큰 생성 */
export function createCounterToken(
  stacks: number = 1,
  value: number = 5
): TestTokenPayload {
  return createTokenWithEffect({
    id: 'counter',
    stacks,
    durationType: 'usage',
    name: '반격',
    effect: { type: 'COUNTER', value },
  });
}

/** 부활 토큰 생성 */
export function createReviveToken(
  stacks: number = 1,
  value: number = 0.5
): TestTokenPayload {
  return createTokenWithEffect({
    id: 'revive',
    stacks,
    durationType: 'usage',
    name: '부활',
    effect: { type: 'REVIVE', value },
  });
}

/** 힘 토큰 생성 */
export function createStrengthToken(
  stacks: number = 1,
  value: number = 3
): TestTokenPayload {
  return createTokenWithEffect({
    id: 'strength',
    stacks,
    durationType: 'turn',
    effect: { type: 'STRENGTH', value },
  });
}

/** 민첩 토큰 생성 */
export function createAgilityToken(
  stacks: number = 1,
  value: number = 2
): TestTokenPayload {
  return createTokenWithEffect({
    id: 'agility',
    stacks,
    durationType: 'turn',
    effect: { type: 'AGILITY', value },
  });
}

// ==================== 빌더 패턴 ====================

/** 카드 빌더 */
export class CardBuilder {
  private card: Card;

  constructor() {
    this.card = { ...DEFAULT_CARD };
  }

  id(id: string): this {
    this.card.id = id;
    return this;
  }

  name(name: string): this {
    this.card.name = name;
    return this;
  }

  type(type: CardType): this {
    this.card.type = type;
    return this;
  }

  damage(damage: number): this {
    this.card.damage = damage;
    return this;
  }

  block(block: number): this {
    this.card.block = block;
    return this;
  }

  defense(defense: number): this {
    this.card.defense = defense;
    return this;
  }

  speedCost(speedCost: number): this {
    this.card.speedCost = speedCost;
    return this;
  }

  actionCost(actionCost: number): this {
    this.card.actionCost = actionCost;
    return this;
  }

  rarity(rarity: CardRarity): this {
    this.card.rarity = rarity;
    return this;
  }

  traits(traits: Card['traits']): this {
    this.card.traits = traits;
    return this;
  }

  special(special: string): this {
    this.card.special = special;
    return this;
  }

  build(): Card {
    return { ...this.card };
  }
}

/** 엔티티 빌더 */
export class EntityBuilder {
  private entity: TokenEntity;

  constructor() {
    this.entity = { ...DEFAULT_ENTITY, tokens: createEmptyTokenState() };
  }

  hp(hp: number): this {
    this.entity.hp = hp;
    return this;
  }

  maxHp(maxHp: number): this {
    this.entity.maxHp = maxHp;
    return this;
  }

  block(block: number): this {
    this.entity.block = block;
    return this;
  }

  strength(strength: number): this {
    this.entity.strength = strength;
    return this;
  }

  agility(agility: number): this {
    this.entity.agility = agility;
    return this;
  }

  insight(insight: number): this {
    this.entity.insight = insight;
    return this;
  }

  energy(energy: number): this {
    this.entity.energy = energy;
    return this;
  }

  maxEnergy(maxEnergy: number): this {
    this.entity.maxEnergy = maxEnergy;
    return this;
  }

  tokens(tokens: TokenState): this {
    this.entity.tokens = tokens;
    return this;
  }

  addUsageToken(token: TestTokenPayload): this {
    this.entity.tokens = this.entity.tokens ?? createEmptyTokenState();
    this.entity.tokens.usage!.push(token as TokenInstance);
    return this;
  }

  addTurnToken(token: TestTokenPayload): this {
    this.entity.tokens = this.entity.tokens ?? createEmptyTokenState();
    this.entity.tokens.turn!.push(token as TokenInstance);
    return this;
  }

  addPermanentToken(token: TestTokenPayload): this {
    this.entity.tokens = this.entity.tokens ?? createEmptyTokenState();
    this.entity.tokens.permanent!.push(token as TokenInstance);
    return this;
  }

  build(): TokenEntity {
    return { ...this.entity };
  }
}

/** 카드 빌더 시작 */
export function cardBuilder(): CardBuilder {
  return new CardBuilder();
}

/** 엔티티 빌더 시작 */
export function entityBuilder(): EntityBuilder {
  return new EntityBuilder();
}

// ==================== 전투 컨텍스트 팩토리 ====================

/** 전투 컨텍스트 */
export interface BattleContext {
  playerAttackCards?: Card[];
  enemyAttackCards?: Card[];
  [key: string]: unknown;
}

/** 전투 컨텍스트 생성 */
export function createBattleContext(overrides: Partial<BattleContext> = {}): BattleContext {
  return {
    playerAttackCards: [],
    enemyAttackCards: [],
    ...overrides,
  };
}

/** 공격자/방어자 쌍 생성 */
export function createCombatPair(
  attackerOverrides: Partial<TokenEntity> = {},
  defenderOverrides: Partial<TokenEntity> = {}
): { attacker: TokenEntity; defender: TokenEntity } {
  return {
    attacker: createEntity(attackerOverrides),
    defender: createEntity(defenderOverrides),
  };
}

/** 플레이어/적 쌍 생성 */
export function createPlayerEnemyPair(
  playerOverrides: Partial<TokenEntity> = {},
  enemyOverrides: Partial<TokenEntity> = {}
): { player: TokenEntity; enemy: TokenEntity } {
  return {
    player: createPlayerEntity(playerOverrides),
    enemy: createEnemyEntity(enemyOverrides),
  };
}

// ==================== 특수 카드 팩토리 ====================

/** 스페셜 카드 생성 */
export function createSpecialCard(special: string, overrides: Partial<Card> = {}): Card {
  return createCard({
    special,
    type: 'attack',
    damage: 10,
    ...overrides,
  });
}

/** 트레이트 카드 생성 */
export function createTraitCard(traits: Card['traits'], overrides: Partial<Card> = {}): Card {
  return createCard({
    traits,
    ...overrides,
  });
}

// ==================== 타임라인 팩토리 ====================

/** 타임라인 배열 생성 */
export function createTimeline(
  entries: Array<{
    actor?: 'player' | 'enemy';
    sp?: number;
    idx?: number;
    card?: Partial<Card>;
  }>
): TimelineEntry[] {
  return entries.map((entry, index) => {
    const card = createCard(entry.card || {});
    return {
      actor: entry.actor ?? 'player',
      sp: entry.sp ?? card.speedCost,
      idx: entry.idx ?? index,
      card,
      originalSpeed: card.speedCost,
      finalSpeed: entry.sp ?? card.speedCost,
    };
  });
}

/** 플레이어 타임라인 엔트리 생성 */
export function createPlayerTimelineEntry(cardOverrides: Partial<Card> = {}): TimelineEntry {
  return createTimelineEntry({
    actor: 'player',
    card: createCard(cardOverrides),
  });
}

/** 적 타임라인 엔트리 생성 */
export function createEnemyTimelineEntry(cardOverrides: Partial<Card> = {}): TimelineEntry {
  return createTimelineEntry({
    actor: 'enemy',
    card: createCard(cardOverrides),
  });
}

// ==================== 전투 테스트용 팩토리 ====================

/**
 * 전투 테스트용 Combatant (공격자/방어자) 타입
 * cardSpecialEffects 등에서 사용
 */
export interface TestCombatant {
  hp: number;
  maxHp?: number;
  block?: number;
  def?: boolean;
  counter?: number;
  vulnMult?: number;
  strength?: number;
  agility?: number;
  insight?: number;
  energy?: number;
  tokens?: TokenState;
  etherPts?: number;
  etherCapacity?: number;
}

/** 전투 테스트용 Combatant 기본값 */
const DEFAULT_COMBATANT: TestCombatant = {
  hp: 100,
  maxHp: 100,
  block: 0,
  tokens: { usage: [], turn: [], permanent: [] },
};

/** 전투 테스트용 Combatant 생성 */
export function createCombatant(overrides: Partial<TestCombatant> = {}): TestCombatant {
  return {
    ...DEFAULT_COMBATANT,
    ...overrides,
    tokens: overrides.tokens ?? { usage: [], turn: [], permanent: [] },
  };
}

/** 전투 테스트용 공격자 생성 */
export function createAttacker(overrides: Partial<TestCombatant> = {}): TestCombatant {
  return createCombatant(overrides);
}

/** 전투 테스트용 방어자 생성 */
export function createDefender(overrides: Partial<TestCombatant> = {}): TestCombatant {
  return createCombatant(overrides);
}

/**
 * 전투 컨텍스트 (battleContext) 타입
 */
export interface TestBattleContext {
  playerAttackCards?: Array<{ id: string; [key: string]: unknown }>;
  enemyAttackCards?: Array<{ id: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

/** 전투 컨텍스트 생성 (확장) */
export function createTestBattleContext(overrides: Partial<TestBattleContext> = {}): TestBattleContext {
  return {
    playerAttackCards: [],
    enemyAttackCards: [],
    ...overrides,
  };
}

/**
 * HandAction (큐 아이템) 타입
 */
export interface TestHandAction {
  id?: string;
  cardId?: string;
  speed?: number;
  owner?: 'player' | 'enemy';
  card?: Partial<Card>;
  [key: string]: unknown;
}

/** HandAction 생성 */
export function createHandAction(overrides: Partial<TestHandAction> = {}): TestHandAction {
  return {
    id: 'action-1',
    cardId: 'strike',
    speed: 5,
    owner: 'player',
    ...overrides,
  };
}

/** 플레이어 HandAction 배열 생성 */
export function createPlayerActions(actions: Array<Partial<TestHandAction>> = []): TestHandAction[] {
  return actions.map((a, i) => createHandAction({
    id: `player-action-${i}`,
    owner: 'player',
    ...a,
  }));
}

/** 적 HandAction 배열 생성 */
export function createEnemyActions(actions: Array<Partial<TestHandAction>> = []): TestHandAction[] {
  return actions.map((a, i) => createHandAction({
    id: `enemy-action-${i}`,
    owner: 'enemy',
    ...a,
  }));
}

// ==================== 적 AI 테스트용 팩토리 ====================

/**
 * 적 객체 타입 (decideEnemyMode 등에서 사용)
 */
export interface TestEnemyObj {
  id: string;
  deck?: string[];
  [key: string]: unknown;
}

/** 적 객체 생성 */
export function createEnemyObj(overrides: Partial<TestEnemyObj> = {}): TestEnemyObj {
  return {
    id: 'test-enemy',
    deck: [],
    ...overrides,
  };
}

/**
 * 적 AI 모드 타입
 */
export interface TestEnemyMode {
  key: 'aggro' | 'turtle' | 'balanced';
  name: string;
  prefer: string;
}

/** 적 AI 모드 생성 */
export function createEnemyMode(overrides: Partial<TestEnemyMode> = {}): TestEnemyMode {
  return {
    key: 'balanced',
    name: '균형',
    prefer: 'balanced',
    ...overrides,
  };
}

/**
 * 적 유닛 타입 (다중 유닛 전투용)
 */
export interface TestEnemyUnit {
  unitId: number;
  hp: number;
  maxHp?: number;
  deck: string[];
  [key: string]: unknown;
}

/** 적 유닛 생성 */
export function createEnemyUnit(overrides: Partial<TestEnemyUnit> = {}): TestEnemyUnit {
  return {
    unitId: 1,
    hp: 50,
    maxHp: 50,
    deck: [],
    ...overrides,
  };
}

/** 적 유닛 배열 생성 */
export function createEnemyUnits(units: Array<Partial<TestEnemyUnit>> = []): TestEnemyUnit[] {
  return units.map((u, i) => createEnemyUnit({
    unitId: i + 1,
    ...u,
  }));
}

/**
 * 적 카드 타입 (actionCost, speedCost 포함)
 */
export interface TestEnemyCard extends Card {
  actionCost: number;
  speedCost: number;
  hits?: number;
}

/** 적 카드 생성 (AI 테스트용) */
export function createEnemyAICard(
  id: string,
  type: CardType,
  actionCost: number,
  speedCost: number,
  damage = 0,
  block = 0
): TestEnemyCard {
  return {
    id,
    name: id,
    type,
    actionCost,
    speedCost,
    damage,
    block,
    hits: 1,
    description: '',
  };
}

/**
 * 적 행동 타입 (generateEnemyActions 결과)
 */
export interface TestEnemyAction {
  id: string;
  damage?: number;
  block?: number;
  type?: CardType;
  speedCost?: number;
  isGhost?: boolean;
  createdBy?: string;
  __sourceUnitId?: number;
  [key: string]: unknown;
}

/** 적 행동 생성 */
export function createEnemyAction(overrides: Partial<TestEnemyAction> = {}): TestEnemyAction {
  return {
    id: 'test-action',
    damage: 10,
    type: 'attack',
    speedCost: 5,
    ...overrides,
  };
}

// ==================== 전투 손패 팩토리 ====================

/**
 * 전투 손패 카드 타입 (computeBattlePlan 등에서 사용)
 */
export interface TestBattleHandCard {
  id: string;
  cardId: string;
  speed: number;
  owner: 'player' | 'enemy';
  [key: string]: unknown;
}

/** 플레이어 손패 카드 생성 */
export function createPlayerHandCard(overrides: Partial<TestBattleHandCard> = {}): TestBattleHandCard {
  return {
    id: 'player-card-1',
    cardId: 'strike',
    speed: 5,
    owner: 'player',
    ...overrides,
  };
}

/** 적 손패 카드 생성 */
export function createEnemyHandCard(overrides: Partial<TestBattleHandCard> = {}): TestBattleHandCard {
  return {
    id: 'enemy-card-1',
    cardId: 'attack',
    speed: 4,
    owner: 'enemy',
    ...overrides,
  };
}

/** 플레이어 손패 배열 생성 */
export function createPlayerHandCards(cards: Array<Partial<TestBattleHandCard>> = []): TestBattleHandCard[] {
  return cards.map((c, i) => createPlayerHandCard({
    id: `player-card-${i + 1}`,
    ...c,
  }));
}

/** 적 손패 배열 생성 */
export function createEnemyHandCards(cards: Array<Partial<TestBattleHandCard>> = []): TestBattleHandCard[] {
  return cards.map((c, i) => createEnemyHandCard({
    id: `enemy-card-${i + 1}`,
    ...c,
  }));
}

// ==================== 즉시 효과 테스트용 팩토리 ====================

/**
 * 플레이어 상태 (카드 즉시 효과 처리용)
 */
export interface TestPlayerState {
  hp?: number;
  maxHp?: number;
  strength?: number;
  gold?: number;
  energy?: number;
  [key: string]: unknown;
}

/** 플레이어 상태 생성 (즉시 효과 테스트용) */
export function createPlayerState(overrides: Partial<TestPlayerState> = {}): TestPlayerState {
  return {
    hp: 100,
    maxHp: 100,
    strength: 0,
    ...overrides,
  };
}

/**
 * 적 상태 (즉시 효과 처리용)
 */
export interface TestEnemyState {
  hp?: number;
  maxHp?: number;
  [key: string]: unknown;
}

/** 적 상태 생성 (즉시 효과 테스트용) */
export function createEnemyState(overrides: Partial<TestEnemyState> = {}): TestEnemyState {
  return {
    hp: 50,
    maxHp: 50,
    ...overrides,
  };
}

/**
 * NextTurnEffects 타입
 */
export interface TestNextTurnEffects {
  bonusEnergy?: number;
  [key: string]: unknown;
}

/** NextTurnEffects 생성 */
export function createNextTurnEffects(overrides: Partial<TestNextTurnEffects> = {}): TestNextTurnEffects {
  return {
    bonusEnergy: 0,
    ...overrides,
  };
}

/**
 * processImmediateCardTraits 파라미터 타입
 */
export interface TestImmediateCardTraitsParams {
  card: Card | { name?: string; id?: string; traits?: string[]; isGhost?: boolean; type?: string; [key: string]: unknown };
  playerState: TestPlayerState;
  nextTurnEffects: TestNextTurnEffects;
  addLog: (msg: string) => void;
  addVanishedCard?: (cardId: string) => void;
}

/** processImmediateCardTraits 파라미터 생성 */
export function createImmediateCardTraitsParams(
  overrides: Partial<TestImmediateCardTraitsParams> = {}
): TestImmediateCardTraitsParams {
  return {
    card: createCard(),
    playerState: createPlayerState(),
    nextTurnEffects: createNextTurnEffects(),
    addLog: () => {},
    ...overrides,
  };
}

/**
 * SafeInitialPlayer 타입
 */
export interface TestSafeInitialPlayer {
  maxHp?: number;
  [key: string]: unknown;
}

/** SafeInitialPlayer 생성 */
export function createSafeInitialPlayer(overrides: Partial<TestSafeInitialPlayer> = {}): TestSafeInitialPlayer {
  return {
    maxHp: 100,
    ...overrides,
  };
}

/**
 * processCardPlayedRelicEffects 파라미터 타입
 */
export interface TestCardPlayedRelicEffectsParams {
  relics: string[];
  card: Card | { name?: string; isGhost?: boolean; [key: string]: unknown };
  playerState: TestPlayerState;
  enemyState: TestEnemyState;
  safeInitialPlayer: TestSafeInitialPlayer | null;
  addLog: (msg: string) => void;
  setRelicActivated: (id: string | null) => void;
}

/** processCardPlayedRelicEffects 파라미터 생성 */
export function createCardPlayedRelicEffectsParams(
  overrides: Partial<TestCardPlayedRelicEffectsParams> = {}
): TestCardPlayedRelicEffectsParams {
  return {
    relics: [],
    card: createCard(),
    playerState: createPlayerState(),
    enemyState: createEnemyState(),
    safeInitialPlayer: createSafeInitialPlayer(),
    addLog: () => {},
    setRelicActivated: () => {},
    ...overrides,
  };
}

/**
 * 트레이트가 있는 카드 생성 (간편 팩토리)
 */
export function createCardWithTraits(
  traits: string[],
  overrides: Partial<Card> = {}
): Card {
  return createCard({
    traits: traits as Card['traits'],
    ...overrides,
  });
}

/**
 * 유령 카드 생성 (간편 팩토리)
 */
export function createGhostCard(overrides: Partial<Card & { isGhost: boolean }> = {}): Card & { isGhost: boolean } {
  return {
    ...createCard(overrides),
    isGhost: true,
    ...overrides,
  };
}

// ==================== 공격 후 효과 테스트용 팩토리 ====================

/**
 * Special 효과용 전투 컨텍스트
 */
export interface TestSpecialBattleContext {
  isLastCard?: boolean;
  unusedAttackCards?: number;
  blockDestroyed?: number;
  isCritical?: boolean;
  currentTurn?: number;
  currentSp?: number;
  [key: string]: unknown;
}

/** Special 효과용 전투 컨텍스트 생성 */
export function createSpecialBattleContext(overrides: Partial<TestSpecialBattleContext> = {}): TestSpecialBattleContext {
  return {
    isLastCard: false,
    unusedAttackCards: 0,
    blockDestroyed: 0,
    isCritical: false,
    ...overrides,
  };
}

/**
 * Special 효과용 Actor (공격자/방어자)
 */
export interface TestSpecialActor {
  hp: number;
  maxHp?: number;
  block?: number;
  def?: boolean;
  tokens?: TokenState;
  vulnMult?: number;
  _persistentStrikeDamage?: number;
  [key: string]: unknown;
}

/** Special 효과용 Actor 생성 */
export function createSpecialActor(overrides: Partial<TestSpecialActor> = {}): TestSpecialActor {
  return {
    hp: 100,
    maxHp: 100,
    block: 0,
    def: false,
    tokens: { usage: [], turn: [], permanent: [] },
    ...overrides,
  };
}

/**
 * processPostAttackSpecials 파라미터 타입
 */
export interface TestPostAttackSpecialsParams {
  card: Card & { _applyBurn?: boolean };
  attacker: TestSpecialActor;
  defender: TestSpecialActor;
  attackerName: 'player' | 'enemy';
  damageDealt: number;
  battleContext?: TestSpecialBattleContext;
}

/** processPostAttackSpecials 파라미터 생성 */
export function createPostAttackSpecialsParams(
  overrides: Partial<TestPostAttackSpecialsParams> = {}
): TestPostAttackSpecialsParams {
  return {
    card: createCard({ damage: 10 }),
    attacker: createSpecialActor(),
    defender: createSpecialActor(),
    attackerName: 'player',
    damageDealt: 10,
    battleContext: createSpecialBattleContext(),
    ...overrides,
  };
}

/**
 * 특수 효과가 있는 카드 생성 (special 필드 포함)
 */
export function createSpecialEffectCard(
  special: string,
  overrides: Partial<Card & { _applyBurn?: boolean; hits?: number }> = {}
): Card & { _applyBurn?: boolean; hits?: number } {
  return {
    ...createCard({ damage: 10 }),
    special,
    ...overrides,
  };
}

// ==================== 턴 종료 상징 효과 테스트용 팩토리 ====================

/**
 * 상징 효과 타입
 */
export interface TestRelicEffect {
  type: 'ON_TURN_END' | 'PASSIVE' | 'ON_CARD_PLAYED' | string;
  condition?: (ctx: { cardsPlayedThisTurn: number; player: TestCombatant; enemy: TestCombatant }) => boolean;
  [key: string]: unknown;
}

/**
 * 상징 정의 타입
 */
export interface TestRelicDef {
  effects: TestRelicEffect;
  [key: string]: unknown;
}

/**
 * 상징 맵 타입 (RELICS)
 */
export interface TestRelicsMap {
  [relicId: string]: TestRelicDef;
}

/** 상징 효과 생성 */
export function createRelicEffect(
  type: TestRelicEffect['type'],
  overrides: Partial<TestRelicEffect> = {}
): TestRelicEffect {
  return {
    type,
    ...overrides,
  };
}

/** 상징 정의 생성 */
export function createRelicDef(
  effectType: TestRelicEffect['type'],
  overrides: Partial<TestRelicDef> = {}
): TestRelicDef {
  return {
    effects: createRelicEffect(effectType),
    ...overrides,
  };
}

/** 상징 맵 생성 */
export function createRelicsMap(relics: Record<string, TestRelicDef>): TestRelicsMap {
  return relics;
}

/**
 * 턴 종료 상징 효과 타입
 */
export interface TestTurnEndRelicEffects {
  energyNextTurn: number;
  strength: number;
}

/** 턴 종료 상징 효과 생성 */
export function createTurnEndRelicEffects(
  overrides: Partial<TestTurnEndRelicEffects> = {}
): TestTurnEndRelicEffects {
  return {
    energyNextTurn: 0,
    strength: 0,
    ...overrides,
  };
}

/**
 * 상징 처리 액션 타입
 */
export interface TestRelicProcessActions {
  setRelicActivated: (relicId: string | null) => void;
  setPlayer: (player: TestCombatant) => void;
}

/** 상징 처리 액션 생성 (vi.fn() 포함) */
export function createRelicProcessActions(
  overrides: Partial<TestRelicProcessActions> = {}
): TestRelicProcessActions {
  return {
    setRelicActivated: () => {},
    setPlayer: () => {},
    ...overrides,
  };
}

/**
 * playTurnEndRelicAnimations 파라미터 타입
 */
export interface TestPlayTurnEndRelicAnimationsParams {
  relics: string[];
  RELICS: TestRelicsMap;
  cardsPlayedThisTurn: number;
  player: TestCombatant;
  enemy: TestCombatant;
  playSound: (frequency: number, duration: number) => void;
  actions: TestRelicProcessActions;
}

/** playTurnEndRelicAnimations 파라미터 생성 */
export function createPlayTurnEndRelicAnimationsParams(
  overrides: Partial<TestPlayTurnEndRelicAnimationsParams> = {}
): TestPlayTurnEndRelicAnimationsParams {
  return {
    relics: [],
    RELICS: {},
    cardsPlayedThisTurn: 0,
    player: createCombatant(),
    enemy: createCombatant(),
    playSound: () => {},
    actions: createRelicProcessActions(),
    ...overrides,
  };
}

/**
 * applyTurnEndRelicEffectsToNextTurn 파라미터 타입
 */
export interface TestApplyTurnEndRelicEffectsParams {
  turnEndRelicEffects: TestTurnEndRelicEffects;
  nextTurnEffects: TestNextTurnEffects;
  player: TestCombatant;
  addLog: (message: string) => void;
  actions: TestRelicProcessActions;
}

/** applyTurnEndRelicEffectsToNextTurn 파라미터 생성 */
export function createApplyTurnEndRelicEffectsParams(
  overrides: Partial<TestApplyTurnEndRelicEffectsParams> = {}
): TestApplyTurnEndRelicEffectsParams {
  return {
    turnEndRelicEffects: createTurnEndRelicEffects(),
    nextTurnEffects: createNextTurnEffects(),
    player: createCombatant(),
    addLog: () => {},
    actions: createRelicProcessActions(),
    ...overrides,
  };
}

// ==================== 이변(Anomaly) 테스트용 팩토리 ====================

/**
 * 이변 효과 타입
 */
export interface TestAnomalyEffect {
  type: 'ETHER_BAN' | 'ENERGY_REDUCTION' | 'SPEED_REDUCTION' | 'DRAW_REDUCTION' | 'INSIGHT_REDUCTION' | string;
  value?: number;
  description: string;
}

/**
 * 이변 정의 타입
 */
export interface TestAnomaly {
  id?: string;
  name: string;
  emoji: string;
  color?: string;
  description?: string;
  getEffect: (level: number) => TestAnomalyEffect;
}

/**
 * 활성 이변 타입 (레벨 포함)
 */
export interface TestActiveAnomaly {
  anomaly: TestAnomaly;
  level: number;
}

/**
 * 강제 이변 설정 타입 (개발자 모드용)
 */
export interface TestForcedAnomaly {
  anomalyId: string;
  level: number;
}

/** 이변 효과 생성 */
export function createAnomalyEffect(
  type: TestAnomalyEffect['type'],
  overrides: Partial<TestAnomalyEffect> = {}
): TestAnomalyEffect {
  return {
    type,
    description: `${type} effect`,
    ...overrides,
  };
}

/** 이변 정의 생성 */
export function createAnomaly(overrides: Partial<TestAnomaly> = {}): TestAnomaly {
  return {
    id: 'test_anomaly',
    name: 'Test Anomaly',
    emoji: '🌀',
    color: '#ff0000',
    description: 'Test description',
    getEffect: () => createAnomalyEffect('ETHER_BAN'),
    ...overrides,
  };
}

/** 활성 이변 생성 */
export function createActiveAnomaly(
  level: number = 1,
  anomalyOverrides: Partial<TestAnomaly> = {}
): TestActiveAnomaly {
  return {
    anomaly: createAnomaly(anomalyOverrides),
    level,
  };
}

/** 강제 이변 설정 생성 */
export function createForcedAnomaly(
  anomalyId: string,
  level: number = 1
): TestForcedAnomaly {
  return {
    anomalyId,
    level,
  };
}

/**
 * 플레이어 상태 (이변 효과 적용용)
 */
export interface TestAnomalyPlayer {
  hp: number;
  maxHp?: number;
  etherBan?: boolean;
  energyPenalty?: number;
  speedPenalty?: number;
  drawPenalty?: number;
  insightPenalty?: number;
  [key: string]: unknown;
}

/** 이변 플레이어 상태 생성 */
export function createAnomalyPlayer(overrides: Partial<TestAnomalyPlayer> = {}): TestAnomalyPlayer {
  return {
    hp: 100,
    maxHp: 100,
    ...overrides,
  };
}

/**
 * 적 상태 (이변 효과용)
 */
export interface TestAnomalyEnemy {
  hp?: number;
  maxHp?: number;
  [key: string]: unknown;
}

/** 이변 적 상태 생성 */
export function createAnomalyEnemy(overrides: Partial<TestAnomalyEnemy> = {}): TestAnomalyEnemy {
  return {
    hp: 50,
    maxHp: 50,
    ...overrides,
  };
}

// ==================== 던전 선택지 테스트용 팩토리 ====================

/**
 * 선택지 요구 조건 타입
 */
export interface TestChoiceRequirements {
  item?: string;
  strength?: number;
  agility?: number;
  insight?: number;
  [key: string]: unknown;
}

/**
 * 스케일링 요구 조건 타입
 */
export interface TestScalingRequirement {
  stat: 'strength' | 'agility' | 'insight';
  baseValue: number;
  increment: number;
}

/**
 * 선택지 결과 타입
 */
export interface TestChoiceOutcome {
  type: 'success' | 'failure' | 'in_progress';
  text: string;
  effect?: {
    gold?: number;
    hp?: number;
    [key: string]: unknown;
  };
}

/**
 * 특수 선택지 오버라이드 타입
 */
export interface TestSpecialOverride {
  requiredSpecial: string;
  text: string;
  outcome?: TestChoiceOutcome;
}

/**
 * 던전 선택지 타입
 */
export interface TestDungeonChoice {
  text: string;
  repeatable?: boolean;
  maxAttempts?: number;
  warningAtAttempt?: number;
  warningText?: string;
  progressText?: string[];
  requirements?: TestChoiceRequirements;
  scalingRequirement?: TestScalingRequirement;
  specialOverrides?: TestSpecialOverride[];
  outcomes?: {
    success?: TestChoiceOutcome;
    failure?: TestChoiceOutcome;
  };
}

/**
 * 선택지 상태 타입
 */
export interface TestChoiceState {
  completed?: boolean;
  attempts?: number;
}

/**
 * 캐릭터 스탯 타입
 */
export interface TestCharacterStats {
  strength?: number;
  agility?: number;
  insight?: number;
}

/**
 * 캐릭터 인벤토리 타입
 */
export interface TestCharacterInventory {
  items?: string[];
}

/** 던전 선택지 생성 */
export function createDungeonChoice(overrides: Partial<TestDungeonChoice> = {}): TestDungeonChoice {
  return {
    text: 'Test choice',
    ...overrides,
  };
}

/** 선택지 상태 생성 */
export function createChoiceState(overrides: Partial<TestChoiceState> = {}): TestChoiceState {
  return {
    completed: false,
    attempts: 0,
    ...overrides,
  };
}

/** 캐릭터 스탯 생성 */
export function createCharacterStats(overrides: Partial<TestCharacterStats> = {}): TestCharacterStats {
  return {
    strength: 5,
    agility: 5,
    insight: 3,
    ...overrides,
  };
}

/** 캐릭터 인벤토리 생성 */
export function createCharacterInventory(overrides: Partial<TestCharacterInventory> = {}): TestCharacterInventory {
  return {
    items: [],
    ...overrides,
  };
}

/** 특수 선택지 오버라이드 생성 */
export function createSpecialOverride(
  requiredSpecial: string,
  text: string,
  overrides: Partial<TestSpecialOverride> = {}
): TestSpecialOverride {
  return {
    requiredSpecial,
    text,
    ...overrides,
  };
}

/** 선택지 결과 생성 */
export function createChoiceOutcome(
  type: TestChoiceOutcome['type'],
  text: string,
  effect?: TestChoiceOutcome['effect']
): TestChoiceOutcome {
  return {
    type,
    text,
    ...(effect && { effect }),
  };
}
