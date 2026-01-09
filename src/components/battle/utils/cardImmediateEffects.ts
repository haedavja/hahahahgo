/**
 * @file cardImmediateEffects.ts
 * @description 카드 즉시 발동 특성 처리
 */

import type { Card, NextTurnEffects } from '../../../types';
import type { AddLogFn } from '../../../types/hooks';
import { ANIMATION_TIMING } from '../ui/constants/layout';

import { hasTrait } from "./battleUtils";
import { executeCardPlayedEffects, executeCardExhaustEffects } from "../../../core/effects";
import { getDefenseBackfireDamage } from '../../../lib/anomalyEffectUtils';

interface PlayerState {
  hp?: number;
  maxHp?: number;
  strength?: number;
  gold?: number;
  [key: string]: unknown;
}

interface EnemyState {
  [key: string]: unknown;
}

interface ProcessImmediateCardTraitsParams {
  card: Card;
  playerState: PlayerState;
  nextTurnEffects: NextTurnEffects;
  addLog: AddLogFn;
  addVanishedCard?: (cardId: string) => void;
  relics?: string[];
  setEtherPts?: (pts: number) => void;
  etherPts?: number;
}

interface ProcessCardPlayedRelicEffectsParams {
  relics: string[];
  card: Card;
  playerState: PlayerState;
  enemyState: EnemyState;
  safeInitialPlayer?: { maxHp?: number; [key: string]: unknown };
  addLog: AddLogFn;
  setRelicActivated: (id: string | null) => void;
}

/**
 * 카드의 즉시 발동 특성 처리
 * - 양날의 검, 단련, 몸풀기, 소멸 등
 */
export function processImmediateCardTraits({
  card,
  playerState,
  nextTurnEffects,
  addLog,
  addVanishedCard,
  relics,
  setEtherPts,
  etherPts
}: ProcessImmediateCardTraitsParams): NextTurnEffects {
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

    // ON_CARD_EXHAUST 상징 효과 처리 (영혼의용광로)
    if (relics && relics.length > 0 && setEtherPts && etherPts !== undefined) {
      const exhaustEffects = executeCardExhaustEffects(relics);
      if (exhaustEffects.etherGain && exhaustEffects.etherGain > 0) {
        setEtherPts(etherPts + exhaustEffects.etherGain);
        addLog(`🔥 영혼의용광로: 에테르 +${exhaustEffects.etherGain} (카드 소멸)`);
      }
    }
  }

  if (hasTrait(card, 'robber')) {
    const goldLoss = 10;
    playerState.gold = Math.max(0, (playerState.gold || 0) - goldLoss);
    addLog(`💰 "날강도" - ${goldLoss} 골드를 잃었습니다. (현재: ${playerState.gold})`);
  }

  // 이변: 역류 (DEFENSE_BACKFIRE) - 방어 카드 사용 시 자해
  if (card.type === 'defense') {
    const backfireDamage = getDefenseBackfireDamage(playerState);
    if (backfireDamage > 0) {
      playerState.hp = Math.max(0, (playerState.hp || 0) - backfireDamage);
      addLog(`🌀 이변 "역류" - 방어 카드 사용! ${backfireDamage} 피해 (체력: ${playerState.hp})`);
    }
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
  enemyState: _enemyState,
  safeInitialPlayer,
  addLog,
  setRelicActivated
}: ProcessCardPlayedRelicEffectsParams): boolean {
  if (card.isGhost) {
    return false;
  }

  const cardRelicEffects = executeCardPlayedEffects(relics, card.id);

  if (cardRelicEffects.heal && cardRelicEffects.heal > 0) {
    const maxHpVal = playerState.maxHp ?? safeInitialPlayer?.maxHp ?? 100;
    const healed = Math.min(maxHpVal, (playerState.hp || 0) + cardRelicEffects.heal);
    const healDelta = healed - (playerState.hp || 0);

    if (healDelta > 0) {
      playerState.hp = healed;
      addLog(`🎭 상징 효과: 체력 +${healDelta} (불멸의 가면 등)`);
      setRelicActivated('immortalMask');
      setTimeout(() => setRelicActivated(null), ANIMATION_TIMING.RELIC_ACTIVATION);
      return true;
    }
  }

  return false;
}
