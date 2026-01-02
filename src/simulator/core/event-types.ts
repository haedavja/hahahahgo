/**
 * @file event-types.ts
 * @description 타입 안전한 전투 이벤트 시스템
 *
 * 구별된 유니온 타입을 사용하여 각 이벤트 타입에 맞는 데이터 구조를 강제합니다.
 * 이를 통해 컴파일 타임에 이벤트 데이터 오류를 잡을 수 있습니다.
 */

// ==================== 기본 이벤트 타입 ====================

export type BattleEventType =
  | 'battle_start'
  | 'turn_start'
  | 'card_select'
  | 'card_respond'
  | 'timeline_resolve'
  | 'card_execute'
  | 'damage_dealt'
  | 'block_gained'
  | 'heal'
  | 'token_applied'
  | 'token_removed'
  | 'counter_triggered'
  | 'counter_shot_triggered'
  | 'cross_triggered'
  | 'chain_triggered'
  | 'special_triggered'
  | 'combo_triggered'
  | 'relic_triggered'
  | 'card_drawn'
  | 'card_discarded'
  | 'card_exhausted'
  | 'ether_changed'
  | 'turn_end'
  | 'battle_end';

// ==================== 액터 타입 ====================

export type Actor = 'player' | 'enemy';
export type EventActor = Actor | 'system';

// ==================== 개별 이벤트 데이터 타입 ====================

export interface BattleStartData {
  playerDeck: string[];
  playerRelics: string[];
  enemyId: string;
  enemyName: string;
  playerMaxHp: number;
  enemyMaxHp: number;
}

export interface TurnStartData {
  turn: number;
  playerHp: number;
  enemyHp: number;
  playerEnergy: number;
  handSize: number;
}

export interface CardSelectData {
  selectedCards: string[];
  handBefore: string[];
  energy: number;
}

export interface CardRespondData {
  selectedCards: string[];
  respondingTo: string[];
}

export interface TimelineResolveData {
  timeline: Array<{
    cardId: string;
    owner: Actor;
    speed: number;
  }>;
}

export interface CardExecuteData {
  cardId: string;
  owner: Actor;
  speed: number;
  isCounter?: boolean;
  isCross?: boolean;
  isChain?: boolean;
}

export interface DamageDealtData {
  source: Actor;
  target: Actor;
  cardId: string;
  rawDamage: number;
  actualDamage: number;
  blocked: number;
  isCritical?: boolean;
  isVulnerable?: boolean;
}

export interface BlockGainedData {
  actor: Actor;
  cardId: string;
  amount: number;
  totalBlock: number;
}

export interface HealData {
  actor: Actor;
  source: string;
  amount: number;
  hpBefore: number;
  hpAfter: number;
}

export interface TokenAppliedData {
  actor: Actor;
  target: Actor;
  tokenId: string;
  tokenName: string;
  stacks: number;
  totalStacks: number;
  source?: string;
}

export interface TokenRemovedData {
  actor: Actor;
  tokenId: string;
  tokenName: string;
  stacksRemoved: number;
  remainingStacks: number;
  reason: 'expired' | 'consumed' | 'cleansed' | 'replaced';
}

export interface CounterTriggeredData {
  actor: Actor;
  cardId: string;
  triggerCardId: string;
  damage: number;
}

export interface CounterShotTriggeredData {
  actor: Actor;
  cardId: string;
  triggerCardId: string;
  damage: number;
  range: number;
}

export interface CrossTriggeredData {
  actor: Actor;
  cardId: string;
  crossPartner: string;
  bonusEffect: string;
}

export interface ChainTriggeredData {
  actor: Actor;
  cardId: string;
  chainFrom: string;
  bonusEffect: string;
}

export interface SpecialTriggeredData {
  actor: Actor;
  cardId: string;
  specialName: string;
  effect: string;
}

export interface ComboTriggeredData {
  actor: Actor;
  comboName: string;
  cards: string[];
  bonusDamage: number;
  bonusEffect?: string;
}

export interface RelicTriggeredData {
  actor: Actor;
  relicId: string;
  relicName: string;
  effect: string;
  value?: number;
}

export interface CardDrawnData {
  actor: Actor;
  cards: string[];
  deckRemaining: number;
  handSize: number;
}

export interface CardDiscardedData {
  actor: Actor;
  cards: string[];
  reason: 'end_turn' | 'effect' | 'overflow';
}

export interface CardExhaustedData {
  actor: Actor;
  cardId: string;
  reason: 'innate' | 'effect' | 'cost';
}

export interface EtherChangedData {
  actor: Actor;
  change: number;
  total: number;
  source: string;
}

export interface TurnEndData {
  turn: number;
  playerHp: number;
  enemyHp: number;
  tokensExpired: Array<{ actor: Actor; tokenId: string }>;
}

export interface BattleEndData {
  winner: 'player' | 'enemy' | 'draw';
  turns: number;
  playerFinalHp: number;
  enemyFinalHp: number;
  totalPlayerDamage: number;
  totalEnemyDamage: number;
  etherGained?: number;
  goldChange?: number;
}

// ==================== 구별된 유니온 이벤트 타입 ====================

export interface BaseBattleEvent {
  turn: number;
  timestamp?: number;
  message?: string;
}

export interface BattleStartEvent extends BaseBattleEvent {
  type: 'battle_start';
  data: BattleStartData;
}

export interface TurnStartEvent extends BaseBattleEvent {
  type: 'turn_start';
  data: TurnStartData;
}

export interface CardSelectEvent extends BaseBattleEvent {
  type: 'card_select';
  actor: Actor;
  data: CardSelectData;
}

export interface CardRespondEvent extends BaseBattleEvent {
  type: 'card_respond';
  actor: Actor;
  data: CardRespondData;
}

export interface TimelineResolveEvent extends BaseBattleEvent {
  type: 'timeline_resolve';
  data: TimelineResolveData;
}

export interface CardExecuteEvent extends BaseBattleEvent {
  type: 'card_execute';
  actor: Actor;
  cardId: string;
  data: CardExecuteData;
}

export interface DamageDealtEvent extends BaseBattleEvent {
  type: 'damage_dealt';
  actor: Actor;
  cardId: string;
  value: number;
  data: DamageDealtData;
}

export interface BlockGainedEvent extends BaseBattleEvent {
  type: 'block_gained';
  actor: Actor;
  cardId: string;
  value: number;
  data: BlockGainedData;
}

export interface HealEvent extends BaseBattleEvent {
  type: 'heal';
  actor: Actor;
  value: number;
  data: HealData;
}

export interface TokenAppliedEvent extends BaseBattleEvent {
  type: 'token_applied';
  actor: Actor;
  data: TokenAppliedData;
}

export interface TokenRemovedEvent extends BaseBattleEvent {
  type: 'token_removed';
  actor: Actor;
  data: TokenRemovedData;
}

export interface CounterTriggeredEvent extends BaseBattleEvent {
  type: 'counter_triggered';
  actor: Actor;
  cardId: string;
  data: CounterTriggeredData;
}

export interface CounterShotTriggeredEvent extends BaseBattleEvent {
  type: 'counter_shot_triggered';
  actor: Actor;
  cardId: string;
  data: CounterShotTriggeredData;
}

export interface CrossTriggeredEvent extends BaseBattleEvent {
  type: 'cross_triggered';
  actor: Actor;
  cardId: string;
  data: CrossTriggeredData;
}

export interface ChainTriggeredEvent extends BaseBattleEvent {
  type: 'chain_triggered';
  actor: Actor;
  cardId: string;
  data: ChainTriggeredData;
}

export interface SpecialTriggeredEvent extends BaseBattleEvent {
  type: 'special_triggered';
  actor: Actor;
  cardId: string;
  data: SpecialTriggeredData;
}

export interface ComboTriggeredEvent extends BaseBattleEvent {
  type: 'combo_triggered';
  actor: Actor;
  data: ComboTriggeredData;
}

export interface RelicTriggeredEvent extends BaseBattleEvent {
  type: 'relic_triggered';
  actor: Actor;
  data: RelicTriggeredData;
}

export interface CardDrawnEvent extends BaseBattleEvent {
  type: 'card_drawn';
  actor: Actor;
  data: CardDrawnData;
}

export interface CardDiscardedEvent extends BaseBattleEvent {
  type: 'card_discarded';
  actor: Actor;
  data: CardDiscardedData;
}

export interface CardExhaustedEvent extends BaseBattleEvent {
  type: 'card_exhausted';
  actor: Actor;
  cardId: string;
  data: CardExhaustedData;
}

export interface EtherChangedEvent extends BaseBattleEvent {
  type: 'ether_changed';
  actor: Actor;
  value: number;
  data: EtherChangedData;
}

export interface TurnEndEvent extends BaseBattleEvent {
  type: 'turn_end';
  data: TurnEndData;
}

export interface BattleEndEvent extends BaseBattleEvent {
  type: 'battle_end';
  data: BattleEndData;
}

// ==================== 통합 이벤트 유니온 타입 ====================

export type TypedBattleEvent =
  | BattleStartEvent
  | TurnStartEvent
  | CardSelectEvent
  | CardRespondEvent
  | TimelineResolveEvent
  | CardExecuteEvent
  | DamageDealtEvent
  | BlockGainedEvent
  | HealEvent
  | TokenAppliedEvent
  | TokenRemovedEvent
  | CounterTriggeredEvent
  | CounterShotTriggeredEvent
  | CrossTriggeredEvent
  | ChainTriggeredEvent
  | SpecialTriggeredEvent
  | ComboTriggeredEvent
  | RelicTriggeredEvent
  | CardDrawnEvent
  | CardDiscardedEvent
  | CardExhaustedEvent
  | EtherChangedEvent
  | TurnEndEvent
  | BattleEndEvent;

// ==================== 타입 가드 ====================

export function isBattleStartEvent(event: TypedBattleEvent): event is BattleStartEvent {
  return event.type === 'battle_start';
}

export function isTurnStartEvent(event: TypedBattleEvent): event is TurnStartEvent {
  return event.type === 'turn_start';
}

export function isDamageDealtEvent(event: TypedBattleEvent): event is DamageDealtEvent {
  return event.type === 'damage_dealt';
}

export function isTokenAppliedEvent(event: TypedBattleEvent): event is TokenAppliedEvent {
  return event.type === 'token_applied';
}

export function isTokenRemovedEvent(event: TypedBattleEvent): event is TokenRemovedEvent {
  return event.type === 'token_removed';
}

export function isCardExecuteEvent(event: TypedBattleEvent): event is CardExecuteEvent {
  return event.type === 'card_execute';
}

export function isComboTriggeredEvent(event: TypedBattleEvent): event is ComboTriggeredEvent {
  return event.type === 'combo_triggered';
}

export function isRelicTriggeredEvent(event: TypedBattleEvent): event is RelicTriggeredEvent {
  return event.type === 'relic_triggered';
}

export function isBattleEndEvent(event: TypedBattleEvent): event is BattleEndEvent {
  return event.type === 'battle_end';
}

// ==================== 이벤트 생성 헬퍼 ====================

export function createBattleStartEvent(turn: number, data: BattleStartData): BattleStartEvent {
  return { type: 'battle_start', turn, data };
}

export function createTurnStartEvent(turn: number, data: TurnStartData): TurnStartEvent {
  return { type: 'turn_start', turn, data };
}

export function createDamageDealtEvent(
  turn: number,
  actor: Actor,
  cardId: string,
  value: number,
  data: DamageDealtData
): DamageDealtEvent {
  return { type: 'damage_dealt', turn, actor, cardId, value, data };
}

export function createBlockGainedEvent(
  turn: number,
  actor: Actor,
  cardId: string,
  value: number,
  data: BlockGainedData
): BlockGainedEvent {
  return { type: 'block_gained', turn, actor, cardId, value, data };
}

export function createTokenAppliedEvent(
  turn: number,
  actor: Actor,
  data: TokenAppliedData
): TokenAppliedEvent {
  return { type: 'token_applied', turn, actor, data };
}

export function createBattleEndEvent(turn: number, data: BattleEndData): BattleEndEvent {
  return { type: 'battle_end', turn, data };
}

// ==================== 이벤트 필터링 유틸리티 ====================

export function filterEventsByType<T extends TypedBattleEvent['type']>(
  events: TypedBattleEvent[],
  type: T
): Extract<TypedBattleEvent, { type: T }>[] {
  return events.filter((e): e is Extract<TypedBattleEvent, { type: T }> => e.type === type);
}

export function filterEventsByActor(
  events: TypedBattleEvent[],
  actor: Actor
): TypedBattleEvent[] {
  return events.filter((e) => 'actor' in e && e.actor === actor);
}

export function filterEventsByTurn(
  events: TypedBattleEvent[],
  turn: number
): TypedBattleEvent[] {
  return events.filter((e) => e.turn === turn);
}

// ==================== 이벤트 통계 유틸리티 ====================

export function sumDamageDealt(events: TypedBattleEvent[], actor?: Actor): number {
  return filterEventsByType(events, 'damage_dealt')
    .filter((e) => !actor || e.actor === actor)
    .reduce((sum, e) => sum + e.value, 0);
}

export function countCardsPlayed(events: TypedBattleEvent[], actor?: Actor): number {
  return filterEventsByType(events, 'card_execute')
    .filter((e) => !actor || e.actor === actor)
    .length;
}

export function getUniqueCardsUsed(events: TypedBattleEvent[], actor?: Actor): string[] {
  const cardEvents = filterEventsByType(events, 'card_execute')
    .filter((e) => !actor || e.actor === actor);
  return [...new Set(cardEvents.map((e) => e.cardId))];
}

export function countTokensApplied(events: TypedBattleEvent[], tokenId?: string): number {
  return filterEventsByType(events, 'token_applied')
    .filter((e) => !tokenId || e.data.tokenId === tokenId)
    .length;
}

// ==================== 호환성 레이어 ====================

/**
 * 기존 BattleEvent 형식과의 호환성을 위한 변환 함수
 */
export interface LegacyBattleEvent {
  type: BattleEventType;
  turn: number;
  actor?: Actor;
  cardId?: string;
  value?: number;
  data?: Record<string, unknown>;
  message?: string;
}

export function toLegacyEvent(event: TypedBattleEvent): LegacyBattleEvent {
  const legacy: LegacyBattleEvent = {
    type: event.type,
    turn: event.turn,
    message: event.message,
  };

  if ('actor' in event) {
    legacy.actor = event.actor;
  }
  if ('cardId' in event) {
    legacy.cardId = event.cardId;
  }
  if ('value' in event) {
    legacy.value = event.value;
  }
  if ('data' in event) {
    legacy.data = event.data as Record<string, unknown>;
  }

  return legacy;
}

export function fromLegacyEvent(legacy: LegacyBattleEvent): TypedBattleEvent | null {
  // 기존 이벤트를 새 형식으로 변환 (가능한 경우)
  // 완전한 변환은 불가능하므로 기본 구조만 유지
  const base = { turn: legacy.turn, message: legacy.message };

  switch (legacy.type) {
    case 'battle_start':
      return {
        type: 'battle_start',
        ...base,
        data: legacy.data as BattleStartData,
      };
    case 'battle_end':
      return {
        type: 'battle_end',
        ...base,
        data: legacy.data as BattleEndData,
      };
    case 'damage_dealt':
      return {
        type: 'damage_dealt',
        ...base,
        actor: legacy.actor || 'player',
        cardId: legacy.cardId || '',
        value: legacy.value || 0,
        data: legacy.data as DamageDealtData,
      };
    // 기타 타입들은 필요에 따라 추가
    default:
      return null;
  }
}
