/**
 * turnEndRelicEffectsProcessing.js
 *
 * 턴 종료 시 상징 효과 처리 시스템
 */

/**
 * 턴 종료 상징 발동 애니메이션 재생
 * @param {Object} params - 파라미터
 * @param {Array} params.relics - 상징 ID 목록
 * @param {Object} params.RELICS - 상징 데이터
 * @param {number} params.cardsPlayedThisTurn - 이번 턴에 사용한 카드 수
 * @param {Object} params.player - 플레이어 상태
 * @param {Object} params.enemy - 적 상태
 * @param {Function} params.playSound - 사운드 재생 함수
 * @param {Object} params.actions - 상태 업데이트 함수 모음
 */
export function playTurnEndRelicAnimations({
  relics,
  RELICS,
  cardsPlayedThisTurn,
  player,
  enemy,
  playSound,
  actions
}) {
  relics.forEach(relicId => {
    const relic = RELICS[relicId];
    if (relic?.effects?.type === 'ON_TURN_END') {
      const condition = relic.effects.condition;
      if (!condition || condition({ cardsPlayedThisTurn, player, enemy })) {
        actions.setRelicActivated(relicId);
        playSound(800, 200);
        setTimeout(() => actions.setRelicActivated(null), 500);
      }
    }
  });
}

/**
 * 턴 종료 상징 효과를 다음 턴 효과에 적용
 * @param {Object} params - 파라미터
 * @param {Object} params.turnEndRelicEffects - 턴 종료 상징 효과
 * @param {Object} params.nextTurnEffects - 다음 턴 효과
 * @param {Object} params.player - 플레이어 상태
 * @param {Function} params.addLog - 로그 추가 함수
 * @param {Object} params.actions - 상태 업데이트 함수 모음
 * @returns {Object} 업데이트된 다음 턴 효과
 */
export function applyTurnEndRelicEffectsToNextTurn({
  turnEndRelicEffects,
  nextTurnEffects,
  player,
  addLog,
  actions
}) {
  const updatedNextTurnEffects = { ...nextTurnEffects };

  // 다음 턴 행동력 증가 (계약서 등)
  if (turnEndRelicEffects.energyNextTurn > 0) {
    updatedNextTurnEffects.bonusEnergy += turnEndRelicEffects.energyNextTurn;
    addLog(`📜 상징 효과: 다음턴 행동력 +${turnEndRelicEffects.energyNextTurn}`);
    console.log("[턴 종료 계약서 효과]", {
      "turnEndRelicEffects.energyNextTurn": turnEndRelicEffects.energyNextTurn,
      "updatedNextTurnEffects.bonusEnergy": updatedNextTurnEffects.bonusEnergy
    });
  }

  // 힘 증가 즉시 적용 (은화 등)
  if (turnEndRelicEffects.strength !== 0) {
    const currentStrength = player.strength || 0;
    const newStrength = currentStrength + turnEndRelicEffects.strength;
    addLog(`💪 상징 효과: 힘 ${turnEndRelicEffects.strength > 0 ? '+' : ''}${turnEndRelicEffects.strength} (총 ${newStrength})`);
    actions.setPlayer({ ...player, strength: newStrength });
  }

  return updatedNextTurnEffects;
}
