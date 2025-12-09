/**
 * turnEndEtherCalculation.js
 *
 * 턴 종료 시 에테르 최종 계산 시스템
 */

import { COMBO_MULTIPLIERS, applyEtherDeflation } from "./etherCalculations";

/**
 * 턴 종료 시 플레이어/적 에테르 최종 계산
 * @param {Object} params - 계산 파라미터
 * @param {Object} params.playerCombo - 플레이어 조합 정보
 * @param {Object} params.enemyCombo - 적 조합 정보
 * @param {number} params.turnEtherAccumulated - 이번 턴 누적 에테르
 * @param {number} params.enemyTurnEtherAccumulated - 적 턴 누적 에테르
 * @param {number} params.finalComboMultiplier - 최종 콤보 배율 (유물 포함)
 * @param {Object} params.player - 플레이어 상태
 * @param {Object} params.enemy - 적 상태
 * @returns {Object} 계산 결과
 */
export function calculateTurnEndEther({
  playerCombo,
  enemyCombo,
  turnEtherAccumulated,
  enemyTurnEtherAccumulated,
  finalComboMultiplier,
  player,
  enemy
}) {
  // 플레이어 에테르 계산
  const basePlayerComboMult = playerCombo ? (COMBO_MULTIPLIERS[playerCombo.name] || 1) : 1;
  const playerComboMult = finalComboMultiplier || basePlayerComboMult;
  const relicMultBonus = playerComboMult - basePlayerComboMult;
  const playerBeforeDeflation = Math.round(turnEtherAccumulated * playerComboMult);

  const playerDeflation = playerCombo?.name
    ? applyEtherDeflation(playerBeforeDeflation, playerCombo.name, player.comboUsageCount || {})
    : { gain: playerBeforeDeflation, multiplier: 1, usageCount: 0 };

  const playerFinalEther = playerDeflation.gain;

  // 적 에테르 계산
  const enemyComboMult = enemyCombo ? (COMBO_MULTIPLIERS[enemyCombo.name] || 1) : 1;
  const enemyBeforeDeflation = Math.round(enemyTurnEtherAccumulated * enemyComboMult);

  const enemyDeflation = enemyCombo?.name
    ? applyEtherDeflation(enemyBeforeDeflation, enemyCombo.name, enemy.comboUsageCount || {})
    : { gain: enemyBeforeDeflation, multiplier: 1, usageCount: 0 };

  const enemyFinalEther = enemyDeflation.gain;

  return {
    player: {
      baseComboMult: basePlayerComboMult,
      finalComboMult: playerComboMult,
      relicMultBonus,
      beforeDeflation: playerBeforeDeflation,
      deflation: playerDeflation,
      finalEther: playerFinalEther,
      appliedEther: playerFinalEther,
      overflow: 0
    },
    enemy: {
      comboMult: enemyComboMult,
      beforeDeflation: enemyBeforeDeflation,
      deflation: enemyDeflation,
      finalEther: enemyFinalEther,
      appliedEther: enemyFinalEther,
      overflow: 0
    }
  };
}

/**
 * 플레이어 에테르 획득 로그 메시지 생성
 * @param {Object} result - calculateTurnEndEther의 player 결과
 * @param {number} turnEtherAccumulated - 이번 턴 누적 에테르
 * @returns {string} 로그 메시지
 */
export function formatPlayerEtherLog(result, turnEtherAccumulated) {
  const { beforeDeflation, deflation, finalEther, appliedEther, relicMultBonus } = result;

  const actualTotalMultiplier = turnEtherAccumulated > 0
    ? (beforeDeflation / turnEtherAccumulated)
    : 1;

  const deflationText = deflation.usageCount > 0
    ? ` (디플레이션 -${Math.round((1 - deflation.multiplier) * 100)}%, ${deflation.usageCount}회 사용)`
    : '';

  const relicText = relicMultBonus > 0 ? ` (유물 배율 +${relicMultBonus.toFixed(2)})` : '';

  return `✴️ 에테르 획득: ${turnEtherAccumulated} × ${actualTotalMultiplier.toFixed(2)}${relicText} = ${beforeDeflation} → ${finalEther} PT${deflationText} (적용: ${appliedEther} PT)`;
}

/**
 * 적 에테르 획득 로그 메시지 생성
 * @param {Object} result - calculateTurnEndEther의 enemy 결과
 * @param {number} enemyTurnEtherAccumulated - 적 턴 누적 에테르
 * @returns {string} 로그 메시지
 */
export function formatEnemyEtherLog(result, enemyTurnEtherAccumulated) {
  const { comboMult, beforeDeflation, deflation, finalEther, appliedEther } = result;

  const deflationText = deflation.usageCount > 0
    ? ` (디플레이션: ${Math.round(deflation.multiplier * 100)}%)`
    : '';

  return `☄️ 적 에테르 획득: ${enemyTurnEtherAccumulated} × ${comboMult.toFixed(2)} = ${beforeDeflation} → ${finalEther} PT${deflationText} (적용: ${appliedEther} PT)`;
}
