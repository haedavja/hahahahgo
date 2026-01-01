/**
 * 타입 가드 함수들
 *
 * `as` 캐스팅 대신 런타임 타입 검증을 제공합니다.
 */

import type {
  Card,
  CardType,
  CardRarity,
  TokenState,
  TokenInstance,
  Resources,
} from './core';

import type {
  Combatant,
  PlayerBattleState,
  EnemyUnit,
  BattleEvent,
} from './combat';

// ==================== 기본 타입 가드 ====================

/** null/undefined 체크 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/** 문자열 체크 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/** 숫자 체크 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

/** 객체 체크 (null 제외) */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 배열 체크 */
export function isArray<T>(value: unknown, itemGuard?: (item: unknown) => item is T): value is T[] {
  if (!Array.isArray(value)) return false;
  if (itemGuard) return value.every(itemGuard);
  return true;
}

// ==================== 카드 타입 가드 ====================

/** CardType 리터럴 유니온 가드 */
const CARD_TYPES = ['attack', 'defense', 'general', 'support', 'move', 'reaction'] as const;
export function isCardType(value: unknown): value is CardType {
  return isString(value) && (CARD_TYPES as readonly string[]).includes(value);
}

/** CardRarity 리터럴 유니온 가드 */
const CARD_RARITIES = ['common', 'rare', 'special', 'legendary'] as const;
export function isCardRarity(value: unknown): value is CardRarity {
  return isString(value) && (CARD_RARITIES as readonly string[]).includes(value);
}

/** Card 타입 가드 */
export function isCard(value: unknown): value is Card {
  if (!isObject(value)) return false;
  return (
    isString(value.id) &&
    isString(value.name) &&
    isCardType(value.type) &&
    isNumber(value.speedCost) &&
    isNumber(value.actionCost)
  );
}

/** 부분적 Card 체크 (필수 필드만) */
export function isPartialCard(value: unknown): value is Partial<Card> & { id: string } {
  if (!isObject(value)) return false;
  return isString(value.id);
}

// ==================== 토큰 타입 가드 ====================

/** TokenInstance 가드 */
export function isTokenInstance(value: unknown): value is TokenInstance {
  if (!isObject(value)) return false;
  return isString(value.id) && (value.stacks === undefined || isNumber(value.stacks));
}

/** TokenState 가드 */
export function isTokenState(value: unknown): value is TokenState {
  if (!isObject(value)) return false;
  const { usage, turn, permanent } = value as Record<string, unknown>;
  return (
    isArray(usage, isTokenInstance) &&
    isArray(turn, isTokenInstance) &&
    isArray(permanent, isTokenInstance)
  );
}

/** 빈 TokenState 생성 */
export function createEmptyTokenState(): TokenState {
  return { usage: [], turn: [], permanent: [] };
}

// ==================== 전투 참여자 타입 가드 ====================

/** Combatant 기본 가드 */
export function isCombatant(value: unknown): value is Combatant {
  if (!isObject(value)) return false;
  return (
    isNumber(value.hp) &&
    isNumber(value.maxHp) &&
    isNumber(value.block) &&
    isTokenState(value.tokens)
  );
}

/** PlayerBattleState 가드 */
export function isPlayerBattleState(value: unknown): value is PlayerBattleState {
  if (!isCombatant(value)) return false;
  return isNumber((value as Record<string, unknown>).energy);
}

/** EnemyUnit 가드 */
export function isEnemyUnit(value: unknown): value is EnemyUnit {
  if (!isCombatant(value)) return false;
  // EnemyUnit은 name 필드를 가질 수 있음
  return true;
}

// ==================== 이벤트 타입 가드 ====================

/** BattleEvent 가드 */
export function isBattleEvent(value: unknown): value is BattleEvent {
  if (!isObject(value)) return false;
  return isString(value.actor) && isString(value.msg);
}

// ==================== 리소스 타입 가드 ====================

/** Resources 가드 */
export function isResources(value: unknown): value is Resources {
  if (!isObject(value)) return false;
  // Resources는 모든 필드가 선택적이므로 객체이기만 하면 됨
  return true;
}

// ==================== 안전한 속성 접근 ====================

/** 안전한 숫자 속성 접근 */
export function getNumber(obj: unknown, key: string, defaultValue = 0): number {
  if (!isObject(obj)) return defaultValue;
  const value = obj[key];
  return isNumber(value) ? value : defaultValue;
}

/** 안전한 문자열 속성 접근 */
export function getString(obj: unknown, key: string, defaultValue = ''): string {
  if (!isObject(obj)) return defaultValue;
  const value = obj[key];
  return isString(value) ? value : defaultValue;
}

/** 안전한 배열 속성 접근 */
export function getArray<T>(obj: unknown, key: string, defaultValue: T[] = []): T[] {
  if (!isObject(obj)) return defaultValue;
  const value = obj[key];
  return Array.isArray(value) ? value : defaultValue;
}

/** 안전한 객체 속성 접근 */
export function getObject(obj: unknown, key: string, defaultValue: Record<string, unknown> = {}): Record<string, unknown> {
  if (!isObject(obj)) return defaultValue;
  const value = obj[key];
  return isObject(value) ? value : defaultValue;
}

// ==================== 유틸리티 타입 가드 ====================

/** actor가 'player'인지 확인 */
export function isPlayerActor(actor: string): actor is 'player' {
  return actor === 'player';
}

/** actor가 'enemy'인지 확인 */
export function isEnemyActor(actor: string): actor is 'enemy' {
  return actor === 'enemy';
}

/** 특성(trait) 확인 */
export function hasTrait(card: unknown, traitId: string): boolean {
  if (!isObject(card)) return false;
  const traits = card.traits;
  return Array.isArray(traits) && traits.includes(traitId);
}

/** speedCost 안전 접근 */
export function getSpeedCost(card: unknown): number {
  if (!isObject(card)) return 4;
  const original = card.originalSpeedCost;
  if (isNumber(original)) return original;
  const speed = card.speedCost;
  return isNumber(speed) ? speed : 4;
}

/** leisurePosition 안전 접근 */
export function getLeisurePosition(card: unknown): number | undefined {
  if (!isObject(card)) return undefined;
  const pos = card.leisurePosition;
  return isNumber(pos) ? pos : undefined;
}

/** strainOffset 안전 접근 */
export function getStrainOffset(card: unknown): number {
  if (!isObject(card)) return 0;
  const offset = card.strainOffset;
  return isNumber(offset) ? offset : 0;
}
