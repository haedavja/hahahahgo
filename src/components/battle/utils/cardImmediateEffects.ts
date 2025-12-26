/**
 * @file cardImmediateEffects.ts
 * @description 카드 즉시 발동 특성 처리
 */

import type {
} from '../../../types';

type ImmediateNextTurnEffects = any;
type ProcessImmediateCardTraitsParams = any;
type ProcessCardPlayedRelicEffectsParams = any;

import { hasTrait } from "./battleUtils";
import { applyCardPlayedEffects } from "../../../lib/relicEffects";

/**
 * 카드의 즉시 발동 특성 처리
 * - 양날의 검, 단련, 몸풀기, 소멸 등
 */
export function processImmediateCardTraits({
  card,
  playerState,
  nextTurnEffects,
  addLog,
  addVanishedCard
}: ProcessImmediateCardTraitsParams): ImmediateNextTurnEffects {
  const updatedNextTurnEffects = { ...nextTurnEffects };

  if (hasTrait(card, 'double_edge')) {
    playerState.hp = Math.max(0, (playerState.hp || 0) - 1);
    addLog(`⚠️ "양날의 검" - 플레이어가 1 피해를 입었습니다.`);
  }

  if (hasTrait(card, 'training')) {
    playerState.strength = (playerState.strength || 0) + 1;
    addLog(`💪 "단련" - 힘이 1 증가했습니다. (현재: ${playerState.strength})`);
  }

  if (hasTrait(card, 'warmup')) {
    updatedNextTurnEffects.bonusEnergy = (updatedNextTurnEffects.bonusEnergy || 0) + 2;
    addLog(`🔥 "몸풀기" - 다음 턴 행동력 +2 예약`);
  }

  if (hasTrait(card, 'vanish') && addVanishedCard && card.id) {
    addVanishedCard(card.id);
    addLog(`💨 "소멸" - "${card.name}" 카드가 소멸되었습니다.`);
  }

  return updatedNextTurnEffects;
}

/**
 * 카드 사용 시 상징 효과 처리
 * - 불멸의 가면 등 카드 사용 트리거 효과
 */
export function processCardPlayedRelicEffects({
  relics,
  card,
  playerState,
  enemyState,
  safeInitialPlayer,
  addLog,
  setRelicActivated
}: ProcessCardPlayedRelicEffectsParams): boolean {
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
