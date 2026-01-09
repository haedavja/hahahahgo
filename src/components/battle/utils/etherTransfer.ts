/**
 * @file etherTransfer.ts
 * @description 에테르 이동 계산 시스템
 *
 * ## 에테르 이동 규칙 (개편)
 * - 플레이어 에테르: 영혼 (승리 조건, 오버드라이브)
 * - 몬스터 에테르: 은총 (기원 발동용, 영혼 보호)
 *
 * ## 핵심 변경
 * - 몬스터는 에테르 획득해도 영혼(etherPts) 증가 안 함
 * - 플레이어가 빼앗는 것은 몬스터 영혼에서 빼앗음
 * - 몬스터는 플레이어 에테르 뺏기 불가
 * - 몬스터 영혼 보호막/은총이 영혼 피해 흡수
 */

import type { EtherTransferResult } from '../../../types';
import type { MonsterGraceState } from '../../../data/monsterEther';
import { checkSoulShield } from '../../../data/monsterEther';

// Re-export for backwards compatibility
export type { EtherTransferResult } from '../../../types';

/**
 * 에테르 이동 결과 (은총 포함)
 */
export interface EtherTransferResultWithGrace extends EtherTransferResult {
  /** 적이 획득한 은총 */
  enemyGraceGain: number;
  /** 업데이트된 은총 상태 (보호막 소모 시) */
  updatedGraceState?: MonsterGraceState;
  /** 보호막이 막은 피해량 */
  shieldBlocked: number;
  /** 적 에테르 0 이후 초과 피해량 (오버킬 보너스용) */
  overkillEther: number;
}

/**
 * 에테르 이동량 계산 (플레이어 ↔ 적)
 *
 * 개편된 규칙:
 * - 적이 에테르 획득해도 영혼(etherPts) 증가 안 함 → 은총으로만
 * - 플레이어가 빼앗는 것은 적 영혼에서
 * - 적은 플레이어 에테르 뺏기 불가
 * - 영혼 보호막/은총이 영혼 피해 흡수
 *
 * @param playerAppliedEther - 플레이어가 획득한 에테르
 * @param enemyAppliedEther - 적이 획득한 에테르 (→ 은총으로 전환)
 * @param currentPlayerPts - 현재 플레이어 에테르
 * @param currentEnemyPts - 현재 적 에테르 (영혼)
 * @param enemyHp - 적의 현재 체력
 * @param graceState - 적의 은총 상태 (optional, 보호막 체크용)
 * @returns { nextPlayerPts, nextEnemyPts, movedPts, enemyGraceGain, updatedGraceState, shieldBlocked }
 */
export function calculateEtherTransfer(
  playerAppliedEther: number,
  enemyAppliedEther: number,
  currentPlayerPts: number,
  currentEnemyPts: number,
  enemyHp: number,
  graceState?: MonsterGraceState
): EtherTransferResultWithGrace {
  const netTransfer = playerAppliedEther - enemyAppliedEther;
  let nextPlayerPts = currentPlayerPts;
  let nextEnemyPts = currentEnemyPts;
  let movedPts = 0;
  let enemyGraceGain = 0;
  let updatedGraceState = graceState;
  let shieldBlocked = 0;
  let overkillEther = 0;

  if (netTransfer > 0) {
    // 플레이어가 더 많이 획득 → 적의 영혼에서 빼앗기
    let soulDamage = Math.min(netTransfer, currentEnemyPts);

    // 영혼 보호막/은총 체크
    if (graceState && soulDamage > 0) {
      const [remainingDamage, newGraceState] = checkSoulShield(graceState, soulDamage);
      shieldBlocked = soulDamage - remainingDamage;
      soulDamage = remainingDamage;
      updatedGraceState = newGraceState;
    }

    movedPts += soulDamage;
    nextPlayerPts += soulDamage;
    nextEnemyPts = Math.max(0, currentEnemyPts - soulDamage);

    // 오버킬 계산: 적 에테르가 0이 된 후 남은 초과분
    // (보호막에 막힌 피해는 제외하고, 실제로 적 영혼을 0으로 만든 뒤의 초과분만 계산)
    if (nextEnemyPts === 0) {
      const actualSoulDamageNeeded = currentEnemyPts; // 적 영혼을 0으로 만드는 데 필요한 양
      const totalDamageDealt = netTransfer - shieldBlocked; // 보호막 제외 실제 피해
      overkillEther = Math.max(0, totalDamageDealt - actualSoulDamageNeeded);
    }
  } else if (netTransfer < 0) {
    // 적이 더 많이 획득 → 은총으로만 증가, 영혼(etherPts) 변화 없음
    // 플레이어 에테르 뺏기 불가
    enemyGraceGain = Math.abs(netTransfer);
    // nextEnemyPts는 변경하지 않음 (영혼 불변)
    // movedPts는 0 유지
  }

  // 몬스터가 처치된 경우: 남은 영혼만 플레이어에게 이전 (은총은 이전 안 함)
  if (enemyHp <= 0 && nextEnemyPts > 0) {
    movedPts += nextEnemyPts;
    nextPlayerPts += nextEnemyPts;
    nextEnemyPts = 0;
  }

  return {
    nextPlayerPts: Math.max(0, nextPlayerPts),
    nextEnemyPts: Math.max(0, nextEnemyPts),
    movedPts,
    enemyGraceGain,
    updatedGraceState,
    shieldBlocked,
    overkillEther
  };
}
