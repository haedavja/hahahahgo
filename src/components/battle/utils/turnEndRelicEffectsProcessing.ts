/**
 * @file turnEndRelicEffectsProcessing.ts
 * @description 턴 종료 상징 효과 처리
 */

interface RelicData {
  effects?: {
    type?: string;
    condition?: (params: { cardsPlayedThisTurn: number; player: Player; enemy: Enemy }) => boolean;
  };
  [key: string]: unknown;
}

interface RelicsMap {
  [key: string]: RelicData;
}

interface Player {
  strength?: number;
  [key: string]: unknown;
}

interface Enemy {
  [key: string]: unknown;
}

interface Actions {
  setRelicActivated: (id: string | null) => void;
  setPlayer: (player: Player) => void;
}

interface TurnEndRelicEffects {
  energyNextTurn: number;
  strength: number;
}

interface NextTurnEffects {
  bonusEnergy: number;
  [key: string]: unknown;
}

interface PlayTurnEndRelicAnimationsParams {
  relics: string[];
  RELICS: RelicsMap;
  cardsPlayedThisTurn: number;
  player: Player;
  enemy: Enemy;
  playSound: (freq: number, duration: number) => void;
  actions: Actions;
}

interface ApplyTurnEndRelicEffectsParams {
  turnEndRelicEffects: TurnEndRelicEffects;
  nextTurnEffects: NextTurnEffects;
  player: Player;
  addLog: (msg: string) => void;
  actions: Actions;
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
    updatedNextTurnEffects.bonusEnergy += turnEndRelicEffects.energyNextTurn;
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
