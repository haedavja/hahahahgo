/**
 * @file etherCalculationAnimation.js
 * @description 에테르 계산 애니메이션 시스템
 *
 * ## 애니메이션 시퀀스
 * 1. 합계 강조
 * 2. 콤보 배율 적용
 * 3. 디플레이션 표시
 * 4. 최종값 표시
 */

import { COMBO_MULTIPLIERS } from "./etherCalculations";
import { applyEtherDeflation } from "./etherCalculations";
import { detectPokerCombo } from "./comboDetection";

/**
 * 에테르 계산 애니메이션 시퀀스 시작
 * @param {Object} params - 파라미터
 * @param {number} params.turnEtherAccumulated - 턴 누적 에테르
 * @param {Array} params.selected - 선택된 카드 목록
 * @param {Object} params.player - 플레이어 상태
 * @param {Function} params.playSound - 사운드 재생 함수
 * @param {Object} params.actions - 상태 업데이트 함수 모음
 */
export function startEtherCalculationAnimationSequence({
  turnEtherAccumulated,
  selected,
  player,
  playSound,
  actions,
  onMultiplierConsumed
}) {
  if (turnEtherAccumulated <= 0) return;

  const pCombo = detectPokerCombo(selected);
  const playerComboMult = pCombo ? (COMBO_MULTIPLIERS[pCombo.name] || 1) : 1;
  // 에테르 증폭제 배율 적용
  const etherAmplifierMult = player.etherMultiplier || 1;
  const totalPlayerMult = playerComboMult * etherAmplifierMult;
  const playerBeforeDeflation = Math.round(turnEtherAccumulated * totalPlayerMult);

  // 디플레이션 적용
  const playerDeflation = pCombo?.name
    ? applyEtherDeflation(playerBeforeDeflation, pCombo.name, player.comboUsageCount || {})
    : { gain: playerBeforeDeflation, multiplier: 1, usageCount: 0 };

  const playerFinalEther = playerDeflation.gain;

  // 1단계: 합계 강조
  actions.setEtherCalcPhase('sum');
  setTimeout(() => {
    // 2단계: 곱셈 강조 + 명쾌한 사운드
    actions.setEtherCalcPhase('multiply');
    // 에테르 증폭 배율이 적용되었으면 상태에서 제거 (배율 갱신 시점)
    if (etherAmplifierMult > 1 && onMultiplierConsumed) {
      onMultiplierConsumed();
    }
    playSound(800, 100); // 명쾌한 사운드
    setTimeout(() => {
      // 3단계: 디플레이션 배지 애니메이션 + 저음 사운드
      if (playerDeflation.usageCount > 0) {
        actions.setEtherCalcPhase('deflation');
        playSound(200, 150); // 저음 사운드
      }
      setTimeout(() => {
        // 4단계: 최종값 표시 + 묵직한 사운드
        actions.setEtherCalcPhase('result');
        playSound(400, 200); // 묵직한 사운드
      }, playerDeflation.usageCount > 0 ? 400 : 0);
    }, 600);
  }, 400);
}
