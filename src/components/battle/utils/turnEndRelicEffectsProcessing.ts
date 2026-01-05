/**
 * @file turnEndRelicEffectsProcessing.ts
 * @description 턴 종료 상징 효과 처리
 */

import type {
  UIRelicsMap,
  Combatant,
  NextTurnEffects
} from '../../../types';
import { ANIMATION_TIMING } from '../ui/constants/layout';

interface RelicProcessActions {
  setRelicActivated: (relicId: string | null) => void;
  setPlayer: (player: Combatant) => void;
}

interface TurnEndRelicEffects {
  energyNextTurn: number;
  strength: number;
}

interface PlayTurnEndRelicAnimationsParams {
  relics: string[];
  RELICS: UIRelicsMap;
  cardsPlayedThisTurn: number;
  player: Combatant;
  enemy: Combatant;
  playSound: (frequency: number, duration: number) => void;
  actions: RelicProcessActions;
}

interface ApplyTurnEndRelicEffectsParams {
  turnEndRelicEffects: TurnEndRelicEffects;
  nextTurnEffects: NextTurnEffects;
  player: Combatant;
  addLog: (message: string) => void;
  actions: RelicProcessActions;
}

/**
 * 턴 종료 시 상징 애니메이션 재생
 * - ON_TURN_END 타입 상징의 조건 확인 및 활성화
 */
export function playTurnEndRelicAnimations({
  relics,
  RELICS,
  cardsPlayedThisTurn,
  player,
  enemy,
  playSound,
  actions
}: PlayTurnEndRelicAnimationsParams): void {
  relics.forEach(relicId => {
    const relic = RELICS[relicId];
    const relicEffects = relic?.effects as { type?: string; condition?: (ctx: { cardsPlayedThisTurn: number; player: Combatant; enemy: Combatant }) => boolean };
    if (relicEffects?.type === 'ON_TURN_END') {
      const condition = relicEffects.condition;
      if (!condition || condition({ cardsPlayedThisTurn, player, enemy })) {
        actions.setRelicActivated(relicId);
        playSound(800, 200);
        setTimeout(() => actions.setRelicActivated(null), ANIMATION_TIMING.RELIC_ACTIVATION);
      }
    }
  });
}

/**
 * 턴 종료 상징 효과를 다음 턴에 적용
 * - 행동력 보너스, 힘 증가 등
 */
export function applyTurnEndRelicEffectsToNextTurn({
  turnEndRelicEffects,
  nextTurnEffects,
  player,
  addLog,
  actions
}: ApplyTurnEndRelicEffectsParams): NextTurnEffects {
  const updatedNextTurnEffects = { ...nextTurnEffects };

  if (turnEndRelicEffects.energyNextTurn > 0) {
    updatedNextTurnEffects.bonusEnergy = (updatedNextTurnEffects.bonusEnergy ?? 0) + turnEndRelicEffects.energyNextTurn;
    addLog(`📜 상징 효과: 다음턴 행동력 +${turnEndRelicEffects.energyNextTurn}`);
  }

  if (turnEndRelicEffects.strength !== 0) {
    const currentStrength = player.strength || 0;
    const newStrength = currentStrength + turnEndRelicEffects.strength;
    addLog(`💪 상징 효과: 힘 ${turnEndRelicEffects.strength > 0 ? '+' : ''}${turnEndRelicEffects.strength} (총 ${newStrength})`);
    actions.setPlayer({ ...player, strength: newStrength });
  }

  return updatedNextTurnEffects;
}
