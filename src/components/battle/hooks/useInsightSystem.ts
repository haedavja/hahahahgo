/**
 * @file useInsightSystem.js
 * @description 통찰 시스템 훅
 *
 * ## 통찰 레벨
 * - 레벨 0: 적 정보 숨김
 * - 레벨 1: 적 일부 공개 (2장)
 * - 레벨 2+: 적 전체 공개
 *
 * ## 통찰 감소 요소
 * - 적 shroud (통찰 차단)
 * - 유닛별 장막 토큰
 * - 개발자 모드 감쇠
 *
 * @typedef {Object} InsightReveal
 * @property {boolean} visible - 공개 여부
 * @property {number} level - 통찰 레벨
 */

import { useMemo, useEffect, useRef } from 'react';
import { calculateEffectiveInsight, getInsightRevealLevel, playInsightSound } from '../utils/insightSystem';
import type { UseInsightSystemParams } from '../../../types/hooks';
import type { InsightUnit } from '../../../types';

/**
 * 통찰 시스템 훅
 * @param {Object} params
 * @param {number} params.playerInsight - 플레이어 통찰 스탯
 * @param {number} params.playerInsightPenalty - 통찰 페널티
 * @param {number} params.enemyShroud - 적 shroud 값
 * @param {Object[]} params.enemyUnits - 적 유닛 배열
 * @param {Card[]} params.enemyPlanActions - 적 행동 계획
 * @param {string} params.battlePhase - 현재 페이즈
 * @param {number} params.devDulledLevel - 개발자 감쇠 레벨
 * @param {Function} params.playSound - 사운드 재생
 * @param {Object} params.actions - 상태 업데이트 액션
 * @returns {{effectiveInsight: number, insightReveal: InsightReveal}}
 */
export function useInsightSystem({
  playerInsight,
  playerInsightPenalty,
  enemyShroud,
  enemyUnits,
  enemyPlanActions,
  battlePhase,
  devDulledLevel,
  actions
}: UseInsightSystemParams) {
  const prevInsightRef = useRef(playerInsight || 0);
  const insightBadgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insightAnimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevRevealLevelRef = useRef(0);

  // 유효 통찰 계산
  const effectiveInsight = useMemo(() => {
    return calculateEffectiveInsight(playerInsight, enemyShroud);
  }, [playerInsight, enemyShroud]);

  // 통찰 레벨: insight - shroud - insightPenalty (-3 ~ +3)
  const insightLevel = useMemo(() => {
    const shroud = enemyShroud || 0;
    const insight = playerInsight || 0;
    const insightPenalty = playerInsightPenalty || 0;
    const base = Math.max(-3, Math.min(3, insight - shroud - insightPenalty));
    if (devDulledLevel !== null && devDulledLevel !== undefined) {
      return Math.max(-3, Math.min(3, -devDulledLevel));
    }
    return base;
  }, [playerInsight, playerInsightPenalty, enemyShroud, devDulledLevel]);

  // 하위 호환성을 위한 dulledLevel (우둔 레벨만, 0~3)
  const dulledLevel = Math.max(0, -insightLevel);

  // 통찰 공개 정보
  const insightReveal = useMemo(() => {
    if (battlePhase !== 'select') return { level: 0, visible: false };
    const units = (enemyUnits || []) as InsightUnit[];
    return getInsightRevealLevel(effectiveInsight, enemyPlanActions, units);
  }, [effectiveInsight, enemyPlanActions, battlePhase, enemyUnits]);

  // 통찰 수치 변화 시 배지/연출 트리거
  useEffect(() => {
    const prev = prevInsightRef.current || 0;
    const curr = playerInsight || 0;
    if (curr === prev) return;
    const dir = curr > prev ? 'up' : 'down';
    prevInsightRef.current = curr;
    if (insightBadgeTimerRef.current) clearTimeout(insightBadgeTimerRef.current);
    actions.setInsightBadge({
      level: curr,
      dir,
      show: true,
      key: Date.now(),
    });
    playInsightSound(curr > 0 ? Math.min(curr, 3) : 1);
    insightBadgeTimerRef.current = setTimeout(() => {
      actions.setInsightBadge((b) => ({ ...b, show: false }));
    }, 1400);
  }, [playerInsight, actions]);

  // 통찰 레벨별 타임라인 연출 트리거
  useEffect(() => {
    if (battlePhase !== 'select' && battlePhase !== 'respond' && battlePhase !== 'resolve') {
      actions.setInsightAnimLevel(0);
      actions.setHoveredEnemyAction(null);
      return;
    }
    const lvl = battlePhase === 'select' ? (insightReveal?.level || 0) : (effectiveInsight || 0);
    const prev = prevRevealLevelRef.current || 0;
    if (lvl === prev) return;
    prevRevealLevelRef.current = lvl;
    if (insightAnimTimerRef.current) clearTimeout(insightAnimTimerRef.current);
    if (lvl > 0) {
      actions.setInsightAnimLevel(lvl);
      actions.setInsightAnimPulseKey((k: number) => k + 1);
      playInsightSound(Math.min(lvl, 3));
      insightAnimTimerRef.current = setTimeout(() => actions.setInsightAnimLevel(0), 1200);
    } else {
      actions.setInsightAnimLevel(0);
    }
  }, [insightReveal?.level, battlePhase, effectiveInsight, actions]);

  return {
    effectiveInsight,
    insightLevel,
    dulledLevel,
    insightReveal
  };
}
