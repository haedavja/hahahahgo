/**
 * @file etherTransferProcessing.ts
 * @description 에테르 전송 처리 및 애니메이션
 *
 * ## 에테르 전송
 * - 획득량 차이로 이동량 결정
 * - 사운드/시각 피드백
 */

interface TransferResult {
  nextPlayerPts: number;
  nextEnemyPts: number;
  movedPts: number;
}

interface Actions {
  setNetEtherDelta: (value: number | null) => void;
  setPlayerTransferPulse: (value: boolean) => void;
  setEnemyTransferPulse: (value: boolean) => void;
}

type CalculateEtherTransferFn = (
  playerAppliedEther: number,
  enemyAppliedEther: number,
  curPlayerPts: number,
  curEnemyPts: number,
  enemyHp: number
) => TransferResult;

/**
 * 에테르 전송 처리 및 애니메이션
 */
export function processEtherTransfer({
  playerAppliedEther,
  enemyAppliedEther,
  curPlayerPts,
  curEnemyPts,
  enemyHp,
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
  calculateEtherTransfer: CalculateEtherTransferFn;
  addLog: (msg: string) => void;
  playSound: (frequency: number, duration: number) => void;
  actions: Actions;
}): TransferResult {
  const { nextPlayerPts, nextEnemyPts, movedPts } = calculateEtherTransfer(
    playerAppliedEther,
    enemyAppliedEther,
    curPlayerPts,
    curEnemyPts,
    enemyHp
  );

  // 몬스터가 처치된 경우 로그 추가
  if (enemyHp <= 0 && curEnemyPts > 0) {
    addLog(`💠 적 잔여 에테르 회수: +${curEnemyPts} PT`);
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

  return { nextPlayerPts, nextEnemyPts, movedPts };
}
