/**
 * @file multi-enemy-system.ts
 * @description 다중 적 동시 전투 시스템
 *
 * ## 기능
 * - 여러 적과 동시에 전투
 * - 적별 타임라인 관리
 * - 타겟팅 시스템
 * - AOE (범위 공격) 처리
 * - 적 유닛 추가/제거
 */

import type { GameCard, GameBattleState, EnemyState, TimelineCard, TokenState } from './game-types';
import { addToken, removeToken, getTokenStacks, hasToken } from './token-system';
import { calculateAttackModifiers, calculateDamageTakenModifiers, consumeAttackTokens } from './token-system';

// ==================== 타입 정의 ====================

export interface EnemyUnit {
  /** 유닛 고유 ID */
  unitId: number;
  /** 적 타입 ID */
  enemyId: string;
  /** 적 이름 */
  name: string;
  /** 현재 HP */
  hp: number;
  /** 최대 HP */
  maxHp: number;
  /** 방어력 */
  block: number;
  /** 토큰 상태 */
  tokens: TokenState;
  /** 덱 */
  deck: string[];
  /** 턴당 카드 수 */
  cardsPerTurn: number;
  /** 이모지 */
  emoji?: string;
  /** 패시브 효과 */
  passives?: EnemyPassives;
  /** 죽었는지 여부 */
  isDead?: boolean;
}

export interface EnemyPassives {
  veilAtStart?: boolean;
  healPerTurn?: number;
  strengthPerTurn?: number;
  critBoostAtStart?: number;
  summonOnHalfHp?: boolean;
  thorns?: number;
  regeneration?: number;
}

export interface MultiEnemyState {
  /** 모든 적 유닛 */
  units: EnemyUnit[];
  /** 현재 타겟 인덱스 */
  currentTargetIndex: number;
  /** 전체 적 HP (합계) */
  totalHp: number;
  /** 전체 적 최대 HP (합계) */
  totalMaxHp: number;
  /** 살아있는 적 수 */
  aliveCount: number;
}

export interface TargetingResult {
  /** 타겟 유닛들 */
  targets: EnemyUnit[];
  /** 타겟 인덱스들 */
  targetIndices: number[];
  /** 타겟팅 방식 */
  method: TargetingMethod;
}

export type TargetingMethod =
  | 'single'      // 단일 대상
  | 'all'         // 모든 적
  | 'random'      // 무작위
  | 'lowest_hp'   // HP 가장 낮은 적
  | 'highest_hp'  // HP 가장 높은 적
  | 'front'       // 맨 앞 적
  | 'back';       // 맨 뒤 적

export interface DamageDistribution {
  /** 유닛별 피해 */
  damagePerUnit: Map<number, number>;
  /** 총 피해 */
  totalDamage: number;
  /** 처치된 유닛 */
  killedUnits: number[];
}

// ==================== 다중 적 상태 관리 ====================

/**
 * 다중 적 상태 생성
 */
export function createMultiEnemyState(enemies: EnemyState[]): MultiEnemyState {
  const units: EnemyUnit[] = enemies.map((enemy, index) => ({
    unitId: index,
    enemyId: enemy.id,
    name: enemy.name,
    hp: enemy.hp,
    maxHp: enemy.maxHp,
    block: enemy.block || 0,
    tokens: enemy.tokens || {},
    deck: enemy.deck || [],
    cardsPerTurn: enemy.cardsPerTurn || 2,
    emoji: enemy.emoji,
    passives: enemy.passives,
    isDead: false,
  }));

  return {
    units,
    currentTargetIndex: 0,
    totalHp: units.reduce((sum, u) => sum + u.hp, 0),
    totalMaxHp: units.reduce((sum, u) => sum + u.maxHp, 0),
    aliveCount: units.length,
  };
}

/**
 * 단일 적을 다중 적 상태로 변환
 */
export function convertToMultiEnemy(enemy: EnemyState): MultiEnemyState {
  return createMultiEnemyState([enemy]);
}

/**
 * 적 유닛 추가
 */
export function addEnemyUnit(
  state: MultiEnemyState,
  enemy: Omit<EnemyUnit, 'unitId'>
): MultiEnemyState {
  const newUnitId = Math.max(...state.units.map(u => u.unitId), -1) + 1;
  const newUnit: EnemyUnit = {
    ...enemy,
    unitId: newUnitId,
    isDead: false,
  };

  const units = [...state.units, newUnit];

  return {
    ...state,
    units,
    totalHp: units.filter(u => !u.isDead).reduce((sum, u) => sum + u.hp, 0),
    totalMaxHp: units.reduce((sum, u) => sum + u.maxHp, 0),
    aliveCount: units.filter(u => !u.isDead).length,
  };
}

/**
 * 적 유닛 제거 (처치)
 */
export function removeEnemyUnit(
  state: MultiEnemyState,
  unitId: number
): MultiEnemyState {
  const units = state.units.map(u =>
    u.unitId === unitId ? { ...u, isDead: true, hp: 0 } : u
  );

  const aliveUnits = units.filter(u => !u.isDead);

  // 타겟 조정
  let newTargetIndex = state.currentTargetIndex;
  if (aliveUnits.length > 0) {
    // 현재 타겟이 죽었으면 다음 살아있는 적으로 변경
    const currentTarget = units[state.currentTargetIndex];
    if (currentTarget?.isDead) {
      newTargetIndex = units.findIndex(u => !u.isDead);
      if (newTargetIndex === -1) newTargetIndex = 0;
    }
  }

  return {
    ...state,
    units,
    currentTargetIndex: newTargetIndex,
    totalHp: aliveUnits.reduce((sum, u) => sum + u.hp, 0),
    totalMaxHp: units.reduce((sum, u) => sum + u.maxHp, 0),
    aliveCount: aliveUnits.length,
  };
}

/**
 * 상태 업데이트
 */
export function updateMultiEnemyState(state: MultiEnemyState): MultiEnemyState {
  const aliveUnits = state.units.filter(u => !u.isDead && u.hp > 0);

  // 죽은 유닛 마킹
  const units = state.units.map(u => ({
    ...u,
    isDead: u.isDead || u.hp <= 0,
  }));

  return {
    ...state,
    units,
    totalHp: aliveUnits.reduce((sum, u) => sum + Math.max(0, u.hp), 0),
    aliveCount: aliveUnits.length,
  };
}

// ==================== 타겟팅 시스템 ====================

/**
 * 타겟 선택
 */
export function selectTargets(
  state: MultiEnemyState,
  card: GameCard,
  method?: TargetingMethod
): TargetingResult {
  const aliveUnits = state.units.filter(u => !u.isDead && u.hp > 0);

  if (aliveUnits.length === 0) {
    return { targets: [], targetIndices: [], method: 'single' };
  }

  // 카드에 지정된 타겟팅 방식 확인
  const targetingMethod = method || getCardTargetingMethod(card);

  switch (targetingMethod) {
    case 'all':
      return {
        targets: aliveUnits,
        targetIndices: aliveUnits.map(u => u.unitId),
        method: 'all',
      };

    case 'random':
      const randomUnit = aliveUnits[Math.floor(Math.random() * aliveUnits.length)];
      return {
        targets: [randomUnit],
        targetIndices: [randomUnit.unitId],
        method: 'random',
      };

    case 'lowest_hp':
      const lowestHp = aliveUnits.reduce((min, u) => u.hp < min.hp ? u : min);
      return {
        targets: [lowestHp],
        targetIndices: [lowestHp.unitId],
        method: 'lowest_hp',
      };

    case 'highest_hp':
      const highestHp = aliveUnits.reduce((max, u) => u.hp > max.hp ? u : max);
      return {
        targets: [highestHp],
        targetIndices: [highestHp.unitId],
        method: 'highest_hp',
      };

    case 'front':
      return {
        targets: [aliveUnits[0]],
        targetIndices: [aliveUnits[0].unitId],
        method: 'front',
      };

    case 'back':
      const lastUnit = aliveUnits[aliveUnits.length - 1];
      return {
        targets: [lastUnit],
        targetIndices: [lastUnit.unitId],
        method: 'back',
      };

    case 'single':
    default:
      // 현재 타겟
      const currentTarget = aliveUnits.find(u => u.unitId === state.currentTargetIndex)
        || aliveUnits[0];
      return {
        targets: [currentTarget],
        targetIndices: [currentTarget.unitId],
        method: 'single',
      };
  }
}

/**
 * 카드의 타겟팅 방식 결정
 */
function getCardTargetingMethod(card: GameCard): TargetingMethod {
  // AOE 카드
  if (card.traits?.includes('aoe') || card.special?.includes('aoeAttack')) {
    return 'all';
  }

  // 스프레드 샷
  if (card.special?.includes('spreadShot')) {
    return 'all';
  }

  // 무작위 타겟
  if (card.traits?.includes('random_target')) {
    return 'random';
  }

  // 처형 (HP 낮은 적 우선)
  if (card.special?.includes('violentMort')) {
    return 'lowest_hp';
  }

  return 'single';
}

/**
 * 타겟 변경
 */
export function changeTarget(
  state: MultiEnemyState,
  direction: 'next' | 'prev' | number
): MultiEnemyState {
  const aliveUnits = state.units.filter(u => !u.isDead);
  if (aliveUnits.length <= 1) return state;

  let newIndex: number;

  if (typeof direction === 'number') {
    // 직접 인덱스 지정
    const targetUnit = state.units.find(u => u.unitId === direction && !u.isDead);
    newIndex = targetUnit ? direction : state.currentTargetIndex;
  } else {
    // 이전/다음
    const currentAliveIndex = aliveUnits.findIndex(u => u.unitId === state.currentTargetIndex);
    const delta = direction === 'next' ? 1 : -1;
    const nextAliveIndex = (currentAliveIndex + delta + aliveUnits.length) % aliveUnits.length;
    newIndex = aliveUnits[nextAliveIndex].unitId;
  }

  return {
    ...state,
    currentTargetIndex: newIndex,
  };
}

// ==================== 피해 처리 ====================

/**
 * 다중 적에게 피해 분배
 */
export function distributeDamage(
  state: MultiEnemyState,
  card: GameCard,
  baseDamage: number,
  attackerTokens: TokenState
): DamageDistribution {
  const targets = selectTargets(state, card);
  const damagePerUnit = new Map<number, number>();
  const killedUnits: number[] = [];
  let totalDamage = 0;

  // 공격자 수정자 계산
  const attackMods = calculateAttackModifiers(attackerTokens);
  const modifiedDamage = Math.floor(baseDamage * attackMods.attackMultiplier + attackMods.damageBonus);

  for (const target of targets.targets) {
    // 대상별 수정자 계산
    const defenseMods = calculateDamageTakenModifiers(target.tokens);

    // 방어력 계산
    let finalDamage = modifiedDamage;

    // 방어력 무시 체크
    if (!attackMods.ignoreBlock && target.block > 0) {
      const blockedDamage = Math.min(target.block, finalDamage);
      target.block -= blockedDamage;
      finalDamage -= blockedDamage;
    }

    // 피해 증폭/감소
    finalDamage = Math.floor(finalDamage * defenseMods.damageMultiplier);
    finalDamage = Math.max(0, finalDamage - defenseMods.damageReduction);

    // 피해 적용
    target.hp -= finalDamage;
    damagePerUnit.set(target.unitId, finalDamage);
    totalDamage += finalDamage;

    // 처치 체크
    if (target.hp <= 0) {
      target.isDead = true;
      killedUnits.push(target.unitId);
    }

    // 가시 반격
    if (target.passives?.thorns) {
      // 반사 피해는 별도로 처리해야 함
    }
  }

  return {
    damagePerUnit,
    totalDamage,
    killedUnits,
  };
}

/**
 * 단일 유닛에게 피해
 */
export function damageUnit(
  state: MultiEnemyState,
  unitId: number,
  damage: number,
  ignoreBlock: boolean = false
): { actualDamage: number; killed: boolean } {
  const unit = state.units.find(u => u.unitId === unitId);
  if (!unit || unit.isDead) {
    return { actualDamage: 0, killed: false };
  }

  let actualDamage = damage;

  // 방어력 처리
  if (!ignoreBlock && unit.block > 0) {
    const blocked = Math.min(unit.block, damage);
    unit.block -= blocked;
    actualDamage -= blocked;
  }

  // HP 감소
  unit.hp -= actualDamage;
  const killed = unit.hp <= 0;

  if (killed) {
    unit.isDead = true;
    unit.hp = 0;
  }

  return { actualDamage, killed };
}

/**
 * 단일 유닛 회복
 */
export function healUnit(
  state: MultiEnemyState,
  unitId: number,
  amount: number
): number {
  const unit = state.units.find(u => u.unitId === unitId);
  if (!unit || unit.isDead) {
    return 0;
  }

  const healAmount = Math.min(amount, unit.maxHp - unit.hp);
  unit.hp += healAmount;

  return healAmount;
}

// ==================== 턴 처리 ====================

/**
 * 모든 적 턴 시작 처리
 */
export function processEnemyTurnStart(state: MultiEnemyState): string[] {
  const effects: string[] = [];

  for (const unit of state.units) {
    if (unit.isDead) continue;

    // 재생
    if (unit.passives?.regeneration) {
      const healed = healUnit(state, unit.unitId, unit.passives.regeneration);
      if (healed > 0) {
        effects.push(`${unit.name}: 재생 ${healed}`);
      }
    }

    // 힘 증가
    if (unit.passives?.strengthPerTurn) {
      unit.tokens = addToken(unit.tokens, 'strength', unit.passives.strengthPerTurn);
      effects.push(`${unit.name}: 힘 +${unit.passives.strengthPerTurn}`);
    }

    // 턴 시작 회복
    if (unit.passives?.healPerTurn) {
      const healed = healUnit(state, unit.unitId, unit.passives.healPerTurn);
      if (healed > 0) {
        effects.push(`${unit.name}: 회복 ${healed}`);
      }
    }
  }

  return effects;
}

/**
 * 모든 적 카드 선택
 */
export function selectAllEnemyCards(
  state: MultiEnemyState,
  cardLibrary: Record<string, GameCard>
): Map<number, string[]> {
  const cardsByUnit = new Map<number, string[]>();

  for (const unit of state.units) {
    if (unit.isDead) continue;

    const selectedCards: string[] = [];
    const availableDeck = [...unit.deck];

    for (let i = 0; i < unit.cardsPerTurn && availableDeck.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableDeck.length);
      selectedCards.push(availableDeck.splice(randomIndex, 1)[0]);
    }

    cardsByUnit.set(unit.unitId, selectedCards);
  }

  return cardsByUnit;
}

/**
 * 모든 적 카드를 타임라인에 배치
 */
export function placeAllEnemyCardsOnTimeline(
  timeline: TimelineCard[],
  cardsByUnit: Map<number, string[]>,
  cardLibrary: Record<string, GameCard>
): TimelineCard[] {
  const newTimeline = [...timeline];

  for (const [unitId, cardIds] of cardsByUnit) {
    for (const cardId of cardIds) {
      const card = cardLibrary[cardId];
      const speedCost = card?.speedCost || 5;

      // 약간의 변동 추가
      const variance = Math.floor(Math.random() * 3) - 1;
      const position = Math.max(1, Math.min(29, speedCost + variance));

      newTimeline.push({
        cardId,
        owner: 'enemy',
        ownerUnitId: unitId,
        position,
        executed: false,
        crossed: false,
      });
    }
  }

  // 위치순 정렬
  newTimeline.sort((a, b) => a.position - b.position);

  return newTimeline;
}

// ==================== 유틸리티 ====================

/**
 * 모든 적이 죽었는지 확인
 */
export function areAllEnemiesDead(state: MultiEnemyState): boolean {
  return state.units.every(u => u.isDead || u.hp <= 0);
}

/**
 * 살아있는 적 수 반환
 */
export function getAliveEnemyCount(state: MultiEnemyState): number {
  return state.units.filter(u => !u.isDead && u.hp > 0).length;
}

/**
 * 전체 적 HP 합계
 */
export function getTotalEnemyHp(state: MultiEnemyState): number {
  return state.units
    .filter(u => !u.isDead)
    .reduce((sum, u) => sum + Math.max(0, u.hp), 0);
}

/**
 * 적 상태 요약
 */
export function summarizeEnemyState(state: MultiEnemyState): string {
  const alive = state.units.filter(u => !u.isDead);
  if (alive.length === 0) return '모든 적 처치';

  return alive.map(u => `${u.emoji || '👤'}${u.name}(${u.hp}/${u.maxHp})`).join(' ');
}

/**
 * MultiEnemyState를 EnemyState로 변환 (호환성)
 */
export function toSingleEnemyState(state: MultiEnemyState): EnemyState {
  const mainUnit = state.units.find(u => !u.isDead) || state.units[0];

  return {
    id: mainUnit?.enemyId || 'unknown',
    name: mainUnit?.name || 'Unknown',
    hp: state.totalHp,
    maxHp: state.totalMaxHp,
    block: mainUnit?.block || 0,
    tokens: mainUnit?.tokens || {},
    deck: mainUnit?.deck || [],
    cardsPerTurn: mainUnit?.cardsPerTurn || 2,
    emoji: mainUnit?.emoji,
    passives: mainUnit?.passives,
    units: state.units,
  };
}
