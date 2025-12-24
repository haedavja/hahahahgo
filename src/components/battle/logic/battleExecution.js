/**
 * @file battleExecution.js
 * @description 전투 실행 로직 - 메인 엔트리 포인트
 * @typedef {import('../../../types').Card} Card
 *
 * LegacyBattleApp.jsx에서 분리됨
 *
 * ## 분리된 모듈
 * - cardExecutionCore.js: 카드 실행 핵심 로직
 * - turnEndCore.js: 턴 종료 처리
 * - runAllCore.js: 전체 큐 실행
 * - multiHitExecution.js: 다중 타격 처리
 * - battleConstants.js: TIMING 상수
 */

import { hasTrait } from '../utils/battleUtils';
import { TIMING } from './battleConstants';

// 분리된 모듈 re-export
export { executeCardActionCore } from './cardExecutionCore';
export { finishTurnCore } from './turnEndCore';
export { runAllCore } from './runAllCore';
export { executeMultiHitAsync } from './multiHitExecution';

// TIMING 상수 re-export (하위 호환성)
export { TIMING };

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
