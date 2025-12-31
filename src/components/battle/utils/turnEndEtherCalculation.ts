/**
 * @file turnEndEtherCalculation.ts
 * @description 턴 종료 에테르 최종 계산 시스템
 */

import type {
  TurnEndEtherResult,
  PlayerEtherResult,
  EnemyEtherResult,
  CalculateTurnEndEtherParams
} from '../../../types';
import { COMBO_MULTIPLIERS, applyEtherDeflation } from "./etherCalculations";
import { getAllTokens } from "../../../lib/tokenUtils";

/**
 * 턴 종료 시 플레이어와 적의 에테르를 최종 계산
 * - 콤보 배율, 상징 배율, 디플레이션 적용
 */
export function calculateTurnEndEther({
  playerCombo,
  enemyCombo,
  turnEtherAccumulated,
  enemyTurnEtherAccumulated,
  finalComboMultiplier,
  player,
  enemy
}: CalculateTurnEndEtherParams): TurnEndEtherResult {
  const basePlayerComboMult = playerCombo ? (COMBO_MULTIPLIERS[playerCombo.name || ''] || 1) : 1;
  const playerComboMult = finalComboMultiplier || basePlayerComboMult;
  const relicMultBonus = playerComboMult - basePlayerComboMult;
  const etherAmplifierMult = player.etherMultiplier || 1;
  const totalPlayerMult = playerComboMult * etherAmplifierMult;
  const playerBeforeDeflation = Math.round(turnEtherAccumulated * totalPlayerMult);

  const playerDeflation = playerCombo?.name
    ? applyEtherDeflation(playerBeforeDeflation, playerCombo.name, player.comboUsageCount || {})
    : { gain: playerBeforeDeflation, multiplier: 1, usageCount: 0 };

  const playerFinalEther = playerDeflation.gain;

  const enemyComboMult = enemyCombo ? (COMBO_MULTIPLIERS[enemyCombo.name || ''] || 1) : 1;
  const enemyBeforeDeflation = Math.round(enemyTurnEtherAccumulated * enemyComboMult);

  const enemyDeflation = enemyCombo?.name
    ? applyEtherDeflation(enemyBeforeDeflation, enemyCombo.name, enemy.comboUsageCount || {})
    : { gain: enemyBeforeDeflation, multiplier: 1, usageCount: 0 };

  const enemyTokens = getAllTokens(enemy);
  const hasHalfEther = enemyTokens.some((t: { id: string }) => t.id === 'half_ether');
  const halfEtherMult = hasHalfEther ? 0.5 : 1;
  const enemyFinalEther = Math.floor(enemyDeflation.gain * halfEtherMult);

  return {
    player: {
      baseComboMult: basePlayerComboMult,
      finalComboMult: playerComboMult,
      relicMultBonus,
      etherAmplifierMult,
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
      halfEtherMult,
      finalEther: enemyFinalEther,
      appliedEther: enemyFinalEther,
      overflow: 0
    }
  };
}

/**
 * 플레이어 에테르 획득 로그 포맷팅
 */
export function formatPlayerEtherLog(result: PlayerEtherResult, turnEtherAccumulated: number): string {
  const { beforeDeflation, deflation, finalEther, appliedEther, relicMultBonus, etherAmplifierMult = 1 } = result;

  const actualTotalMultiplier = turnEtherAccumulated > 0
    ? (beforeDeflation / turnEtherAccumulated)
    : 1;

  const deflationText = deflation.usageCount > 0
    ? ` (디플레이션 -${Math.round((1 - deflation.multiplier) * 100)}%, ${deflation.usageCount}회 사용)`
    : '';

  const relicText = relicMultBonus > 0 ? ` (상징 배율 +${relicMultBonus.toFixed(2)})` : '';
  const amplifierText = etherAmplifierMult > 1 ? ` (증폭 ×${etherAmplifierMult})` : '';

  return `✴️ 에테르 획득: ${turnEtherAccumulated} × ${actualTotalMultiplier.toFixed(2)}${relicText}${amplifierText} = ${beforeDeflation} → ${finalEther} PT${deflationText} (적용: ${appliedEther} PT)`;
}

/**
 * 적 에테르 획득 로그 포맷팅
 */
export function formatEnemyEtherLog(result: EnemyEtherResult, enemyTurnEtherAccumulated: number): string {
  const { comboMult, beforeDeflation, deflation, finalEther, appliedEther, halfEtherMult = 1 } = result;

  // 플레이어와 동일한 포맷 (감소율 표시)
  const deflationText = deflation.usageCount > 0
    ? ` (디플레이션 -${Math.round((1 - deflation.multiplier) * 100)}%, ${deflation.usageCount}회 사용)`
    : '';

  const halfEtherText = halfEtherMult < 1
    ? ` [에테르 감소 ×${halfEtherMult}]`
    : '';

  return `☄️ 적 에테르 획득: ${enemyTurnEtherAccumulated} × ${comboMult.toFixed(2)} = ${beforeDeflation} → ${finalEther} PT${deflationText}${halfEtherText} (적용: ${appliedEther} PT)`;
}
