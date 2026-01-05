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

/** 토큰이 있는 엔티티 생성 */
export function createEntityWithTokens(
  tokens: Partial<TokenState>,
  entityOverrides: Partial<TokenEntity> = {},
  stats: { strength?: number; agility?: number; insight?: number } = {}
): TokenEntity {
  return createEntity(
    {
      ...entityOverrides,
      tokens: createTokenState(tokens),
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
