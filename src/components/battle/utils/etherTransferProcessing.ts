/**
 * @file etherTransferProcessing.ts
 * @description 에테르 전송 처리 및 애니메이션
 *
 * ## 에테르 전송 (개편)
 * - 플레이어: 에테르 → 영혼 증가
 * - 몬스터: 에테르 → 은총 증가 (영혼 불변)
 * - 플레이어가 빼앗는 것은 몬스터 영혼에서
 * - 몬스터 보호막/은총이 영혼 피해 흡수
 */

import type {
  EtherTransferProcessResult,
  EtherTransferProcessActions,
  CalculateEtherTransferFn
} from '../../../types';
import type { MonsterGraceState } from '../../../data/monsterEther';

/**
 * 확장된 에테르 전송 결과 (은총 포함)
 */
export interface EtherTransferProcessResultWithGrace extends EtherTransferProcessResult {
  enemyGraceGain: number;
  updatedGraceState?: MonsterGraceState;
  shieldBlocked: number;
}

/**
 * 에테르 전송 처리 및 애니메이션
 */
export function processEtherTransfer({
  playerAppliedEther,
  enemyAppliedEther,
  curPlayerPts,
  curEnemyPts,
  enemyHp,
  graceState,
  calculateEtherTransfer,
  addLog,
  playSound,
  actions
}: {
  playerAppliedEther: number;
  enemyAppliedEther: number;
  curPlayerPts: number;
  curEnemyPts: number;
  enemyHp: number;
  graceState?: MonsterGraceState;
  calculateEtherTransfer: CalculateEtherTransferFn;
  addLog: (msg: string) => void;
  playSound: (frequency: number, duration: number) => void;
  actions: EtherTransferProcessActions;
}): EtherTransferProcessResultWithGrace {
  const result = calculateEtherTransfer(
    playerAppliedEther,
    enemyAppliedEther,
    curPlayerPts,
    curEnemyPts,
    enemyHp,
    graceState
  );

  const { nextPlayerPts, nextEnemyPts, movedPts } = result;
  // 은총 획득량 (새 시스템)
  const enemyGraceGain = (result as { enemyGraceGain?: number }).enemyGraceGain || 0;
  const updatedGraceState = (result as { updatedGraceState?: MonsterGraceState }).updatedGraceState;
  const shieldBlocked = (result as { shieldBlocked?: number }).shieldBlocked || 0;

  // 보호막이 영혼 피해를 막은 경우
  if (shieldBlocked > 0) {
    addLog(`🛡️ 적 보호막이 영혼 ${shieldBlocked} PT 피해 흡수!`);
  }

  // 몬스터가 처치된 경우 로그 추가
  if (enemyHp <= 0 && curEnemyPts > 0) {
    addLog(`💠 적 잔여 영혼 회수: +${curEnemyPts} PT`);
  }

  // 실제 이동된 양을 델타로 기록
  actions.setNetEtherDelta(movedPts);

  if (movedPts !== 0) {
    actions.setPlayerTransferPulse(true);
    actions.setEnemyTransferPulse(true);
    playSound(movedPts > 0 ? 900 : 600, 180);
    setTimeout(() => {
      actions.setPlayerTransferPulse(false);
      actions.setEnemyTransferPulse(false);
    }, 450);
    addLog(`🔁 에테르 이동: 플레이어 ${movedPts > 0 ? '+' : ''}${movedPts} PT`);
  }

  // 적이 은총을 획득한 경우 (영혼은 변화 없음)
  if (enemyGraceGain > 0) {
    addLog(`✨ 적 은총 획득: +${enemyGraceGain} PT (영혼 불변)`);
  }

  return { nextPlayerPts, nextEnemyPts, movedPts, enemyGraceGain, updatedGraceState, shieldBlocked };
}
