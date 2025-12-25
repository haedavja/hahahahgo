/**
 * @file turnEndStateUpdate.ts
 * @description 턴 종료 상태 업데이트 시스템
 *
 * ## 기능
 * - 조합 사용 카운트 업데이트
 * - 플레이어/적 턴 종료 상태 생성
 * - 에테르/디플레이션 상태 반영
 */

interface CardInfo {
  id?: string;
  [key: string]: unknown;
}

interface Action {
  actor: 'player' | 'enemy';
  card?: CardInfo;
}

interface Combo {
  name?: string;
}

interface Unit {
  block?: number;
  [key: string]: unknown;
}

interface Player {
  etherOverflow?: number;
  [key: string]: unknown;
}

interface Enemy {
  hp: number;
  units?: Unit[];
  [key: string]: unknown;
}

interface ComboUsageCount {
  [key: string]: number;
}

interface TurnEndPlayerParams {
  comboUsageCount: ComboUsageCount;
  etherPts: number;
  etherOverflow?: number;
  etherMultiplier?: number;
}

interface TurnEndEnemyParams {
  comboUsageCount: ComboUsageCount;
  etherPts: number;
}

interface VictoryConditionResult {
  isVictory: boolean;
  isEtherVictory: boolean;
  delay: number;
}

/**
 * 조합 사용 카운트 업데이트
 */
export function updateComboUsageCount(
  currentUsageCount: ComboUsageCount | null | undefined,
  combo: Combo | null | undefined,
  queue: Action[] = [],
  actorFilter: 'player' | 'enemy' = 'player'
): ComboUsageCount {
  const newUsageCount: ComboUsageCount = { ...(currentUsageCount || {}) };

  if (combo?.name) {
    newUsageCount[combo.name] = (newUsageCount[combo.name] || 0) + 1;
  }

  if (actorFilter === 'player') {
    queue.forEach(action => {
      if (action.actor === actorFilter && action.card?.id) {
        newUsageCount[action.card.id] = (newUsageCount[action.card.id] || 0) + 1;
      }
    });
  }

  return newUsageCount;
}

/**
 * 턴 종료 시 플레이어 상태 업데이트 객체 생성
 */
export function createTurnEndPlayerState(
  player: Player,
  { comboUsageCount, etherPts, etherOverflow, etherMultiplier = 1 }: TurnEndPlayerParams
): Player {
  return {
    ...player,
    block: 0,
    def: false,
    counter: 0,
    vulnMult: 1,
    vulnTurns: 0,
    etherOverdriveActive: false,
    comboUsageCount,
    etherPts: Math.max(0, etherPts),
    etherOverflow: (player.etherOverflow || 0) + (etherOverflow || 0),
    etherMultiplier
  };
}

/**
 * 턴 종료 시 적 상태 업데이트 객체 생성
 */
export function createTurnEndEnemyState(
  enemy: Enemy,
  { comboUsageCount, etherPts }: TurnEndEnemyParams
): Enemy {
  const units = enemy.units || [];
  const resetUnits = units.length > 0
    ? units.map(u => ({ ...u, block: 0 }))
    : units;

  return {
    ...enemy,
    block: 0,
    def: false,
    counter: 0,
    vulnMult: 1,
    vulnTurns: 0,
    etherOverdriveActive: false,
    comboUsageCount,
    etherPts: Math.max(0, etherPts),
    units: resetUnits
  };
}

/**
 * 승리 조건 확인
 */
export function checkVictoryCondition(enemy: Enemy, enemyEtherPts: number): VictoryConditionResult {
  const isEtherVictory = enemyEtherPts <= 0;
  const isHpVictory = enemy.hp <= 0;
  const isVictory = isHpVictory || isEtherVictory;
  const delay = isEtherVictory ? 1200 : 500;

  return {
    isVictory,
    isEtherVictory,
    delay
  };
}
