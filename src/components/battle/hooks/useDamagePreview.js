import { useMemo, useEffect, useRef } from 'react';
import { simulatePreview } from '../utils/battleSimulation';

/**
 * 피해 미리보기 계산 및 사운드 효과 훅
 * LegacyBattleApp에서 분리된 피해 미리보기 로직
 */
export function useDamagePreview({
  battlePhase,
  player,
  enemy,
  fixedOrder,
  playerTimeline,
  willOverdrive,
  enemyPlan,
  targetUnit,
  hasMultipleUnits,
  enemyUnits,
  selectedTargetUnit,
  actions,
  playSound
}) {
  const lethalSoundRef = useRef(false);
  const overkillSoundRef = useRef(false);

  // 예상 피해량 계산 (useMemo로 최적화)
  const previewDamageResult = useMemo(() => {
    if (!(battlePhase === 'select' || battlePhase === 'respond') || !enemy) {
      return { value: 0, lethal: false, overkill: false, perUnitPreview: {} };
    }
    const order = (fixedOrder && fixedOrder.length > 0) ? fixedOrder : playerTimeline;
    if (!order || order.length === 0) {
      return { value: 0, lethal: false, overkill: false, perUnitPreview: {} };
    }
    const sim = simulatePreview({
      player,
      enemy,
      fixedOrder: order,
      willOverdrive,
      enemyMode: enemyPlan.mode,
      enemyActions: enemyPlan.actions,
    }) || { pDealt: 0 };
    const value = sim.pDealt || 0;

    // 다중 유닛: 타겟 유닛의 HP로 치명/과잉 판정
    const targetHp = targetUnit ? targetUnit.hp : enemy.hp;
    const targetMaxHp = targetUnit ? targetUnit.maxHp : enemy.maxHp;
    const lethal = value > targetHp;
    const overkill = value > targetMaxHp;

    // 유닛별 피해량 계산 (다중 유닛 시스템용)
    let perUnitPreview = {};
    if (hasMultipleUnits && enemyUnits.length > 0) {
      const boost = willOverdrive ? 2 : 1;
      const strengthBonus = player.strength || 0;
      const perUnitDamage = {};

      // 플레이어 공격 카드의 피해량을 타겟 유닛별로 합산
      for (const step of order) {
        if (step.actor === 'player' && step.card.type === 'attack') {
          const card = step.card;
          const targetId = card.__targetUnitId ?? selectedTargetUnit ?? 0;
          const hits = card.hits || 1;
          const baseDamage = ((card.damage || 0) + strengthBonus) * boost * hits;

          if (!perUnitDamage[targetId]) {
            perUnitDamage[targetId] = 0;
          }
          perUnitDamage[targetId] += baseDamage;
        }
      }

      // 각 유닛별 치명/과잉 판정
      for (const [unitIdStr, damage] of Object.entries(perUnitDamage)) {
        const unitId = parseInt(unitIdStr, 10);
        const unit = enemyUnits.find(u => u.unitId === unitId);
        if (unit && damage > 0) {
          const unitBlock = unit.block || 0;
          const effectiveDamage = Math.max(0, damage - unitBlock);
          perUnitPreview[unitId] = {
            value: damage,
            effectiveDamage,
            lethal: effectiveDamage >= unit.hp,
            overkill: effectiveDamage >= unit.maxHp,
          };
        }
      }
    }

    return { value, lethal, overkill, perUnitPreview };
  }, [
    battlePhase,
    player?.strength, player?.hp, player?.block, player?.tokens,
    enemy?.hp, enemy?.maxHp, enemy?.block,
    fixedOrder, playerTimeline,
    willOverdrive,
    enemyPlan?.mode, enemyPlan?.actions,
    targetUnit?.hp, targetUnit?.maxHp,
    hasMultipleUnits, enemyUnits,
    selectedTargetUnit
  ]);

  // 피해 미리보기 상태 업데이트 및 사운드 효과
  useEffect(() => {
    const { value, lethal, overkill, perUnitPreview } = previewDamageResult;
    actions.setPreviewDamage({ value, lethal, overkill });
    actions.setPerUnitPreviewDamage(perUnitPreview);

    if (overkill && !overkillSoundRef.current) {
      playSound(1600, 260);
      overkillSoundRef.current = true;
      lethalSoundRef.current = true;
    } else if (lethal && !lethalSoundRef.current) {
      playSound(1200, 200);
      lethalSoundRef.current = true;
    } else if (!lethal) {
      lethalSoundRef.current = false;
      overkillSoundRef.current = false;
    }
  }, [previewDamageResult, actions, playSound]);

  return previewDamageResult;
}
