/**
 * @file useDamagePreview.js
 * @description 피해 미리보기 계산 훅
 * @typedef {import('../../../types').Card} Card
 *
 * ## 기능
 * - 예상 피해량 계산 (시뮬레이션 기반)
 * - 치명/과잉 피해 판정
 * - 다중 유닛별 피해량 계산
 * - 피해 예측 사운드 효과
 *
 * @typedef {Object} PreviewDamageResult
 * @property {number} value - 총 예상 피해량
 * @property {boolean} lethal - 치명타 여부 (적 HP 초과)
 * @property {boolean} overkill - 과잉 여부 (적 최대 HP 초과)
 * @property {Object} perUnitPreview - 유닛별 피해 미리보기
 */

import { useMemo, useEffect, useRef } from 'react';
import { simulatePreview } from '../utils/battleSimulation';

/**
 * 피해 미리보기 계산 훅
 * @param {Object} params
 * @param {string} params.battlePhase - 현재 페이즈
 * @param {Object} params.player - 플레이어 상태
 * @param {Object} params.enemy - 적 상태
 * @param {Object[]} params.fixedOrder - 고정 순서
 * @param {Object[]} params.playerTimeline - 플레이어 타임라인
 * @param {boolean} params.willOverdrive - 폭주 예정 여부
 * @param {Object} params.enemyPlan - 적 행동 계획
 * @param {Object|null} params.targetUnit - 타겟 유닛
 * @param {boolean} params.hasMultipleUnits - 다중 유닛 여부
 * @param {Object[]} params.enemyUnits - 적 유닛 배열
 * @param {number} params.selectedTargetUnit - 선택된 타겟 유닛 ID
 * @param {Object} params.actions - 상태 업데이트 액션
 * @param {Function} params.playSound - 사운드 재생
 * @returns {PreviewDamageResult}
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
}: any) {
  const lethalSoundRef = useRef(false);
  const overkillSoundRef = useRef(false);
  const prevPreviewRef = useRef<{ value: number; lethal: boolean; overkill: boolean } | null>(null);

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
    let perUnitPreview: any = {};
    if (hasMultipleUnits && enemyUnits.length > 0) {
      const boost = willOverdrive ? 2 : 1;
      const strengthBonus = player.strength || 0;
      const perUnitDamage: any = {};

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
        const unit = enemyUnits.find((u: any) => u.unitId === unitId);
        const damageNum = Number(damage);
        if (unit && damageNum > 0) {
          const unitBlock = unit.block || 0;
          const effectiveDamage = Math.max(0, damageNum - unitBlock);
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
    const prev = prevPreviewRef.current;

    // 값이 실제로 변경된 경우에만 상태 업데이트 (무한 루프 방지)
    if (!prev || prev.value !== value || prev.lethal !== lethal || prev.overkill !== overkill) {
      prevPreviewRef.current = { value, lethal, overkill };
      actions.setPreviewDamage({ value, lethal, overkill });
      actions.setPerUnitPreviewDamage(perUnitPreview);
    }

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
