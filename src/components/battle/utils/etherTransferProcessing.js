/**
 * etherTransferProcessing.js
 *
 * 에테르 전송 처리 및 애니메이션 시스템
 */

/**
 * 에테르 전송 처리 및 애니메이션
 * @param {Object} params - 파라미터
 * @param {number} params.playerAppliedEther - 플레이어 적용 에테르
 * @param {number} params.enemyAppliedEther - 적 적용 에테르
 * @param {number} params.curPlayerPts - 현재 플레이어 PT
 * @param {number} params.curEnemyPts - 현재 적 PT
 * @param {number} params.enemyHp - 적 HP
 * @param {Function} params.calculateEtherTransfer - 에테르 전송 계산 함수
 * @param {Function} params.addLog - 로그 추가 함수
 * @param {Function} params.playSound - 사운드 재생 함수
 * @param {Object} params.actions - 상태 업데이트 함수 모음
 * @returns {Object} { nextPlayerPts, nextEnemyPts, movedPts }
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
}) {
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
