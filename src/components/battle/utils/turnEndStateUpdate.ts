/**
 * @file turnEndStateUpdate.ts
 * @description 턴 종료 상태 업데이트 시스템
 *
 * ## 기능
 * - 조합 사용 카운트 업데이트
 * - 플레이어/적 턴 종료 상태 생성
 * - 에테르/디플레이션 상태 반영
 */

import type {
  ComboUsageCount,
  VictoryCheckResult
} from '../../../types';
import type { Card } from '../../../types/core';
import type {
  BattleAction,
  PlayerBattleState,
  EnemyUnit
} from '../../../types/combat';

// Parameter types for turn end state updates
interface TurnEndPlayerParams {
  comboUsageCount: ComboUsageCount;
  etherPts: number;
  etherOverflow?: number;
  etherMultiplier?: number;
  hasVigilance?: boolean;
}

interface TurnEndEnemyParams {
  comboUsageCount: ComboUsageCount;
  etherPts: number;
}

/**
 * 조합 사용 카운트 업데이트
 */
export function updateComboUsageCount(
  currentUsageCount: ComboUsageCount | null | undefined,
  combo: { name?: string } | null | undefined,
  queue: BattleAction[] = [],
  actorFilter: 'player' | 'enemy' = 'player'
): ComboUsageCount {
  const newUsageCount: ComboUsageCount = { ...(currentUsageCount || {}) };

  if (combo?.name) {
    newUsageCount[combo.name] = (newUsageCount[combo.name] || 0) + 1;
  }

  if (actorFilter === 'player') {
    queue.forEach((action: BattleAction) => {
      if (action.actor === actorFilter && action.card?.id) {
        newUsageCount[action.card.id] = (newUsageCount[action.card.id] || 0) + 1;
      }
    });
  }

  return newUsageCount;
}

/**
 * 턴 종료 시 플레이어 상태 업데이트 객체 생성
 * @param hasVigilance - 경계 토큰 보유 여부 (턴 토큰 제거 전에 확인해야 함)
 */
export function createTurnEndPlayerState(
  player: PlayerBattleState,
  { comboUsageCount, etherPts, etherOverflow, etherMultiplier = 1, hasVigilance = false }: TurnEndPlayerParams
): PlayerBattleState {
  // 경계 토큰이 있었으면 방어력 유지
  const retainedBlock = hasVigilance ? (player.block || 0) : 0;

  return {
    ...player,
    block: retainedBlock,
    def: retainedBlock > 0,
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
  enemy: EnemyUnit,
  { comboUsageCount, etherPts }: TurnEndEnemyParams
): EnemyUnit {
  const units = enemy.units || [];
  const resetUnits = units.length > 0
    ? units.map((u: EnemyUnit) => ({ ...u, block: 0 }))
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
 * 영혼파괴 효과 타입
 */
type SoulBreakEffect = 'death' | 'stun' | 'weaken';

/**
 * 승리 조건 확인
 * @param enemy - 적 상태 (hp, onSoulBreak, soulBroken 포함)
 * @param enemyEtherPts - 적 에테르 포인트
 */
export function checkVictoryCondition(
  enemy: { hp: number; onSoulBreak?: SoulBreakEffect; soulBroken?: boolean },
  enemyEtherPts: number
): VictoryCheckResult {
  const isHpVictory = enemy.hp <= 0;
  const etherDepleted = enemyEtherPts <= 0;
  const soulBreakEffect = enemy.onSoulBreak || 'stun';  // 기본값: stun
  const alreadySoulBroken = enemy.soulBroken || false;

  // HP 승리
  if (isHpVictory) {
    return {
      isVictory: true,
      isEtherVictory: false,
      delay: 500
    };
  }

  // 에테르가 고갈된 경우
  if (etherDepleted) {
    // 이미 영혼이 파괴된 상태면 추가 효과 없음 (전투 계속)
    if (alreadySoulBroken) {
      return {
        isVictory: false,
        isEtherVictory: false,
        delay: 0
      };
    }

    // 영혼파괴 효과에 따라 분기
    switch (soulBreakEffect) {
      case 'death':
        // 영혼 의존 존재: 즉시 사망 (에테르 승리)
        return {
          isVictory: true,
          isEtherVictory: true,
          delay: 1200,
          soulBreakEffect: 'death',
          shouldApplySoulBreak: true
        };

      case 'stun':
        // 인간형/야수형: 1턴 기절 (전투 계속)
        return {
          isVictory: false,
          isEtherVictory: false,
          delay: 800,
          soulBreakEffect: 'stun',
          shouldApplySoulBreak: true
        };

      case 'weaken':
        // 변이체: 2턴 쇠약 (전투 계속)
        return {
          isVictory: false,
          isEtherVictory: false,
          delay: 800,
          soulBreakEffect: 'weaken',
          shouldApplySoulBreak: true
        };

      default:
        return {
          isVictory: false,
          isEtherVictory: false,
          delay: 0
        };
    }
  }

  // 승리 조건 없음
  return {
    isVictory: false,
    isEtherVictory: false,
    delay: 0
  };
}
