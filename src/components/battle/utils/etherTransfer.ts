/**
 * @file etherTransfer.ts
 * @description 에테르 이동 계산 시스템
 *
 * ## 에테르 이동 규칙
 * - 플레이어/적 획득량 차이로 이동량 결정
 * - 적이 죽으면 에테르 이동 없음
 * - 최대 이동량 제한 (현재 보유량)
 */

import type { EtherTransferResult } from '../../../types';

// Re-export for backwards compatibility
export type { EtherTransferResult } from '../../../types';

/**
 * 에테르 이동량 계산 (플레이어 ↔ 적)
 * @param playerAppliedEther - 플레이어가 획득한 에테르
 * @param enemyAppliedEther - 적이 획득한 에테르
 * @param currentPlayerPts - 현재 플레이어 에테르
 * @param currentEnemyPts - 현재 적 에테르
 * @param enemyHp - 적의 현재 체력
 * @returns { nextPlayerPts, nextEnemyPts, movedPts }
 */
export function calculateEtherTransfer(
  playerAppliedEther: number,
  enemyAppliedEther: number,
  currentPlayerPts: number,
  currentEnemyPts: number,
  enemyHp: number
): EtherTransferResult {
  const netTransfer = playerAppliedEther - enemyAppliedEther;
  let nextPlayerPts = currentPlayerPts;
  let nextEnemyPts = currentEnemyPts;
  let movedPts = 0;

  if (netTransfer > 0) {
    // 플레이어가 더 많이 획득 → 적에게서 빼앗기
    const move = Math.min(netTransfer, currentEnemyPts);
    movedPts += move;
    nextPlayerPts += move;
    nextEnemyPts = Math.max(0, currentEnemyPts - move);
  } else if (netTransfer < 0) {
    // 적이 더 많이 획득 → 적은 에테르를 획득하지만 플레이어에게서 빼앗지 않음
    // (몬스터는 플레이어의 에테르를 빼앗을 수 없음)
    // 적은 자체적으로 에테르를 획득하되, 플레이어 에테르는 감소하지 않음
    nextEnemyPts += Math.abs(netTransfer);
    // movedPts는 0 유지 (이동 없음)
  }

  // 몬스터가 처치된 경우: 남은 에테르 전부 플레이어에게 이전
  if (enemyHp <= 0 && nextEnemyPts > 0) {
    movedPts += nextEnemyPts;
    nextPlayerPts += nextEnemyPts;
    nextEnemyPts = 0;
  }

  return {
    nextPlayerPts: Math.max(0, nextPlayerPts),
    nextEnemyPts: Math.max(0, nextEnemyPts),
    movedPts
  };
}
