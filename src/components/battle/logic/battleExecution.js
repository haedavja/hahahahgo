/**
 * battleExecution.js
 *
 * 전투 실행 로직 - 메인 엔트리 포인트
 * LegacyBattleApp.jsx에서 분리됨
 *
 * 분리된 모듈:
 * - cardExecutionCore.js: executeCardActionCore
 * - turnEndCore.js: finishTurnCore
 * - runAllCore.js: runAllCore
 * - multiHitExecution.js: executeMultiHitAsync
 */

import { hasTrait } from '../utils/battleUtils';

// 분리된 모듈 re-export
export { executeCardActionCore } from './cardExecutionCore';
export { finishTurnCore } from './turnEndCore';
export { runAllCore } from './runAllCore';
export { executeMultiHitAsync } from './multiHitExecution';

// =====================
// 타이밍 상수 (밀리초)
// =====================
export const TIMING = {
  // stepOnce 타이밍
  CARD_EXECUTION_DELAY: 250,      // 시곗바늘 이동 후 카드 발동 대기
  CARD_SHAKE_DURATION: 200,       // 카드 흔들림 애니메이션
  CARD_FADEOUT_DELAY: 150,        // 마지막 카드 페이드아웃
  CARD_DISAPPEAR_START: 150,      // 카드 소멸 시작
  CARD_DISAPPEAR_DURATION: 300,   // 카드 소멸 애니메이션

  // 자동진행 타이밍
  AUTO_PROGRESS_DELAY: 450,       // 다음 카드로 넘어가는 대기 시간

  // 다중 타격 타이밍
  MULTI_HIT_DELAY: 100,           // 연속 타격 사이 딜레이 (100ms)

  // 에테르 계산 타이밍
  ETHER_CALC_START_DELAY: 400,    // 에테르 계산 시작 딜레이
  ETHER_MULTIPLY_DELAY: 600,      // 배율 적용 딜레이
  ETHER_DEFLATION_DELAY: 400,     // 디플레이션 딜레이
};

// =====================
// stepOnce 애니메이션 처리
// =====================
export function createStepOnceAnimations(params) {
  const {
    currentQIndex,
    queueLength,
    action,
    battleRef,
    actions,
    escapeUsedThisTurnRef,
  } = params;

  return {
    // 카드 실행 애니메이션 시작
    startExecution: () => {
      actions.setExecutingCardIndex(currentQIndex);
    },

    // 카드 실행 완료 후 처리
    finishExecution: () => {
      actions.setExecutingCardIndex(null);
      const currentBattle = battleRef.current;
      const currentUsedIndices = currentBattle.usedCardIndices || [];
      actions.setUsedCardIndices([...currentUsedIndices, currentQIndex]);
    },

    // 마지막 카드 페이드아웃
    handleLastCard: () => {
      if (currentQIndex >= queueLength - 1) {
        setTimeout(() => {
          actions.setTimelineIndicatorVisible(false);
        }, TIMING.CARD_FADEOUT_DELAY);
      }
    },

    // 플레이어 카드 소멸 처리
    handlePlayerCardDisappear: () => {
      if (action.actor !== 'player') return;

      if (hasTrait(action.card, 'escape')) {
        escapeUsedThisTurnRef.current = new Set([...escapeUsedThisTurnRef.current, action.card.id]);
      }

      setTimeout(() => {
        const currentBattle = battleRef.current;
        const currentDisappearing = currentBattle.disappearingCards || [];
        actions.setDisappearingCards([...currentDisappearing, currentQIndex]);

        setTimeout(() => {
          const currentBattle = battleRef.current;
          const currentHidden = currentBattle.hiddenCards || [];
          const currentDisappearing2 = currentBattle.disappearingCards || [];
          actions.setHiddenCards([...currentHidden, currentQIndex]);
          actions.setDisappearingCards(currentDisappearing2.filter(i => i !== currentQIndex));
        }, TIMING.CARD_DISAPPEAR_DURATION);
      }, TIMING.CARD_DISAPPEAR_START);
    },
  };
}
