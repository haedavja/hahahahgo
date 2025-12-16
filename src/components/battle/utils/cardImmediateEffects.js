/**
 * cardImmediateEffects.js
 *
 * 카드 사용 시 즉시 발동되는 특성 처리 시스템
 */

import { hasTrait } from "./battleUtils";
import { applyCardPlayedEffects } from "../../../lib/relicEffects";

/**
 * 카드 사용 시 플레이어 즉시 특성 처리
 * @param {Object} params - 처리 파라미터
 * @param {Object} params.card - 사용된 카드
 * @param {Object} params.playerState - 플레이어 상태 (수정됨)
 * @param {Object} params.nextTurnEffects - 다음 턴 효과
 * @param {Function} params.addLog - 로그 추가 함수
 * @param {Function} params.addVanishedCard - 소멸 카드 추가 함수 (선택적)
 * @returns {Object} 업데이트된 다음 턴 효과
 */
export function processImmediateCardTraits({ card, playerState, nextTurnEffects, addLog, addVanishedCard }) {
  let updatedNextTurnEffects = { ...nextTurnEffects };

  // 양날의 검 (double_edge): 사용시 1 피해
  if (hasTrait(card, 'double_edge')) {
    playerState.hp = Math.max(0, playerState.hp - 1);
    addLog(`⚠️ "양날의 검" - 플레이어가 1 피해를 입었습니다.`);
  }

  // 단련 (training): 사용 후 힘 +1
  if (hasTrait(card, 'training')) {
    playerState.strength = (playerState.strength || 0) + 1;
    addLog(`💪 "단련" - 힘이 1 증가했습니다. (현재: ${playerState.strength})`);
  }

  // 몸풀기 (warmup): 다음 턴 행동력 +2
  if (hasTrait(card, 'warmup')) {
    updatedNextTurnEffects.bonusEnergy = (updatedNextTurnEffects.bonusEnergy || 0) + 2;
    addLog(`🔥 "몸풀기" - 다음 턴 행동력 +2 예약`);
  }

  // 소멸 (vanish): 사용 후 게임에서 제외
  if (hasTrait(card, 'vanish') && addVanishedCard) {
    addVanishedCard(card.id);
    addLog(`💨 "소멸" - "${card.name}" 카드가 소멸되었습니다.`);
  }

  return updatedNextTurnEffects;
}

/**
 * 카드 사용 시 상징 효과 처리 (힐 등)
 * @param {Object} params - 처리 파라미터
 * @param {Array} params.relics - 상징 목록
 * @param {Object} params.card - 사용된 카드
 * @param {Object} params.playerState - 플레이어 상태 (수정됨)
 * @param {Object} params.enemyState - 적 상태
 * @param {Object} params.safeInitialPlayer - 안전 초기 플레이어 상태
 * @param {Function} params.addLog - 로그 추가 함수
 * @param {Function} params.setRelicActivated - 상징 활성화 설정 함수
 * @returns {boolean} 효과가 발동되었는지 여부
 */
export function processCardPlayedRelicEffects({
  relics,
  card,
  playerState,
  enemyState,
  safeInitialPlayer,
  addLog,
  setRelicActivated
}) {
  // 유령카드는 상징 효과 미적용
  if (card.isGhost) {
    return false;
  }

  const cardRelicEffects = applyCardPlayedEffects(relics, card, { player: playerState, enemy: enemyState });

  if (cardRelicEffects.heal) {
    const maxHpVal = playerState.maxHp ?? safeInitialPlayer?.maxHp ?? 100;
    const healed = Math.min(maxHpVal, (playerState.hp || 0) + cardRelicEffects.heal);
    const healDelta = healed - (playerState.hp || 0);

    if (healDelta > 0) {
      playerState.hp = healed;
      addLog(`🎭 상징 효과: 체력 +${healDelta} (불멸의 가면 등)`);
      setRelicActivated('immortalMask');
      setTimeout(() => setRelicActivated(null), 500);
      return true;
    }
  }

  return false;
}
