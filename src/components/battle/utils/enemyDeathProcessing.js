/**
 * @file enemyDeathProcessing.js
 * @description 적 사망 처리 시스템
 *
 * ## 사망 처리
 * - 남은 적 행동 스킵
 * - 사망 애니메이션
 * - 에테르 계산 트리거
 */

/**
 * 적 사망 처리
 * @param {Object} params - 파라미터
 * @param {number} params.newQIndex - 새로운 큐 인덱스
 * @param {Array} params.queue - 액션 큐
 * @param {number} params.queueLength - 큐 길이
 * @param {number} params.turnEtherAccumulated - 현재 턴 누적 에테르
 * @param {Function} params.playSound - 사운드 재생 함수
 * @param {Object} params.actions - 상태 업데이트 함수 모음
 */
export function processEnemyDeath({
  newQIndex,
  queue,
  queueLength,
  turnEtherAccumulated,
  playSound,
  actions
}) {
  // 몬스터 죽음 애니메이션 및 사운드
  actions.setEnemyHit(true);
  playSound(200, 500); // 낮은 주파수로 죽음 사운드

  // 타임라인 즉시 숨김 및 자동진행 중단
  actions.setTimelineIndicatorVisible(false);
  actions.setAutoProgress(false);

  // 남은 카드들을 비활성화 상태로 표시 (큐는 유지)
  const disabledIndices = queue.slice(newQIndex).map((_, idx) => newQIndex + idx);
  actions.setDisabledCardIndices(disabledIndices);

  // 큐 인덱스를 끝으로 이동하여 더 이상 진행되지 않도록 함
  actions.setQIndex(queueLength);

  // 에테르 계산 애니메이션은 useEffect에서 실행됨 (상태 업데이트 타이밍 보장)
  // 에테르가 없으면 버튼 표시를 위해 0으로 설정
  if (turnEtherAccumulated === 0) {
    actions.setEtherFinalValue(0);
  }
}
