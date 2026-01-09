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
import { RELIC_AUDIO } from '../../../core/effects';

interface RelicProcessActions {
  setRelicActivated: (relicId: string | null) => void;
  setPlayer: (player: Combatant) => void;
  setFrozenOrder?: (count: number) => void;
}

interface TurnEndRelicEffects {
  energyNextTurn: number;
  strength: number;
  speedCostReduction: number;
  freezeEnemyTimeline: boolean;
  grantDefensiveNextTurn: number;
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
        playSound(RELIC_AUDIO.TURN_END.tone, RELIC_AUDIO.TURN_END.duration);
        setTimeout(() => actions.setRelicActivated(null), ANIMATION_TIMING.RELIC_ACTIVATION);
      }
    }
  });
}

/**
 * 턴 종료 상징 효과를 다음 턴에 적용
 * - 행동력 보너스, 힘 증가, 속도 감소, 타임라인 동결, 방어 부여 등
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

  if (turnEndRelicEffects.speedCostReduction > 0) {
    updatedNextTurnEffects.speedCostReduction = (updatedNextTurnEffects.speedCostReduction ?? 0) + turnEndRelicEffects.speedCostReduction;
    addLog(`🔔 상징 효과: 다음턴 카드 속도 -${turnEndRelicEffects.speedCostReduction}`);
  }

  // 의수/적선의금화: 적 타임라인 동결 (다음 턴 플레이어 카드 먼저 실행)
  if (turnEndRelicEffects.freezeEnemyTimeline) {
    updatedNextTurnEffects.freezeEnemyTimeline = true;
    if (actions.setFrozenOrder) {
      actions.setFrozenOrder(1);
    }
    addLog(`❄️ 상징 효과: 다음 턴 적 타임라인 동결!`);
  }

  // 방탄복: 다음 턴 방어 부여
  if (turnEndRelicEffects.grantDefensiveNextTurn > 0) {
    updatedNextTurnEffects.grantDefensiveNextTurn = (updatedNextTurnEffects.grantDefensiveNextTurn ?? 0) + turnEndRelicEffects.grantDefensiveNextTurn;
    addLog(`🛡️ 상징 효과: 다음 턴 방어 ${turnEndRelicEffects.grantDefensiveNextTurn}회 부여`);
  }

  return updatedNextTurnEffects;
}
