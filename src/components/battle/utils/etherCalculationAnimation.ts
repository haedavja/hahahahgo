/**
 * @file etherCalculationAnimation.ts
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
import { ETHER_AUDIO } from '../../../core/effects';
import type {
  EtherAnimCard as Card,
  EtherAnimPlayer as Player,
  AnimEtherCalcPhase as EtherCalcPhase,
  EtherCalcAnimActions as Actions
} from '../../../types';

/**
 * 에테르 계산 애니메이션 시퀀스 시작
 */
export function startEtherCalculationAnimationSequence({
  turnEtherAccumulated,
  selected,
  player,
  playSound,
  actions,
  onMultiplierConsumed
}: {
  turnEtherAccumulated: number;
  selected: Card[];
  player: Player;
  playSound: (frequency: number, duration: number) => void;
  actions: Actions;
  onMultiplierConsumed?: () => void;
}): void {
  if (turnEtherAccumulated <= 0) return;

  const pCombo = detectPokerCombo(selected);
  const playerComboMult = pCombo ? (COMBO_MULTIPLIERS[pCombo.name] || 1) : 1;
  const etherAmplifierMult = player.etherMultiplier || 1;
  const totalPlayerMult = playerComboMult * etherAmplifierMult;
  const playerBeforeDeflation = Math.round(turnEtherAccumulated * totalPlayerMult);

  const playerDeflation = pCombo?.name
    ? applyEtherDeflation(playerBeforeDeflation, pCombo.name, player.comboUsageCount || {})
    : { gain: playerBeforeDeflation, multiplier: 1, usageCount: 0 };

  const playerFinalEther = playerDeflation.gain;

  // 1단계: 합계 강조
  actions.setEtherCalcPhase('sum');
  setTimeout(() => {
    // 2단계: 곱셈 강조 + 명쾌한 사운드
    actions.setEtherCalcPhase('multiply');
    if (etherAmplifierMult > 1 && onMultiplierConsumed) {
      onMultiplierConsumed();
    }
    playSound(ETHER_AUDIO.GAIN.tone, ETHER_AUDIO.GAIN.duration);
    setTimeout(() => {
      // 3단계: 디플레이션 배지 애니메이션 + 저음 사운드
      if (playerDeflation.usageCount > 0) {
        actions.setEtherCalcPhase('deflation');
        playSound(ETHER_AUDIO.LOSS.tone, ETHER_AUDIO.LOSS.duration);
      }
      setTimeout(() => {
        // 4단계: 최종값 표시 + 묵직한 사운드
        actions.setEtherCalcPhase('result');
        playSound(ETHER_AUDIO.TRANSFER.tone, ETHER_AUDIO.TRANSFER.duration);
      }, playerDeflation.usageCount > 0 ? 400 : 0);
    }, 600);
  }, 400);
}
