/**
 * @file useBattleTimelines.js
 * @description 전투 타임라인 계산 훅
 * @typedef {import('../../../types').Card} Card
 *
 * ## 타임라인 계산
 * - select: 선택 카드로 속도 계산
 * - respond: 고정 순서 사용
 * - resolve: 실행 큐 사용
 *
 * ## 통찰 연동
 * - 레벨 0: 적 숨김
 * - 레벨 1: 적 2장만
 * - 레벨 2+: 적 전체
 *
 * @typedef {Object} TimelineItem
 * @property {'player'|'enemy'} actor - 행동 주체
 * @property {Card} card - 카드 정보
 * @property {number} sp - 속도 포인트
 * @property {number} idx - 인덱스
 */

import { useMemo } from 'react';
import { detectPokerCombo } from '../utils/comboDetection';
import { applyTraitModifiers } from '../utils/battleUtils';
import { applyAgility } from '../../../lib/agilityUtils';

/**
 * 전투 타임라인 계산 훅
 * @param {Object} params
 * @param {string} params.battlePhase - 현재 페이즈
 * @param {Card[]} params.battleSelected - 전투 선택 카드
 * @param {TimelineItem[]} params.fixedOrder - 고정 순서
 * @param {TimelineItem[]} params.battleQueue - 실행 큐
 * @param {Object} params.playerComboUsageCount - 콤보 사용 횟수
 * @param {number} params.effectiveAgility - 유효 민첩
 * @param {Card[]} params.enemyPlanActions - 적 행동 계획
 * @param {Object} params.insightReveal - 통찰 정보
 * @param {Card[]} params.selected - 선택된 카드
 * @returns {{playerTimeline: TimelineItem[], enemyTimeline: TimelineItem[]}}
 */
export function useBattleTimelines({
  battlePhase,
  battleSelected,
  fixedOrder,
  battleQueue,
  playerComboUsageCount,
  effectiveAgility,
  enemyPlanActions,
  insightReveal,
  selected
}) {
  // 플레이어 타임라인 계산
  const playerTimeline = useMemo(() => {
    if (battlePhase === 'select') {
      // 현재 선택된 카드들의 조합 감지
      const currentCombo = detectPokerCombo(selected);
      const comboCardCosts = new Set();
      if (currentCombo?.bonusKeys) {
        currentCombo.bonusKeys.forEach(cost => comboCardCosts.add(cost));
      }
      const isFlush = currentCombo?.name === '플러쉬';

      let ps = 0;
      return battleSelected.map((c, idx) => {
        // 카드가 조합에 포함되는지 확인
        const isInCombo = isFlush || comboCardCosts.has(c.actionCost);
        const usageCount = playerComboUsageCount?.[c.id] || 0;
        const enhancedCard = applyTraitModifiers(c, {
          usageCount,
          isInCombo,
        });
        const finalSpeed = applyAgility(enhancedCard.speedCost, effectiveAgility);
        ps += finalSpeed;
        return { actor: 'player', card: enhancedCard, sp: ps, idx, finalSpeed };
      });
    }
    if (battlePhase === 'respond' && fixedOrder) {
      return fixedOrder.filter(x => x.actor === 'player');
    }
    if (battlePhase === 'resolve') {
      return battleQueue.filter(x => x.actor === 'player');
    }
    return [];
  }, [battlePhase, battleSelected, fixedOrder, battleQueue, playerComboUsageCount, effectiveAgility, selected]);

  // 적 타임라인 계산
  const enemyTimeline = useMemo(() => {
    // 선택 단계에서는 통찰이 없으면 적 타임라인을 숨긴다
    if (battlePhase === 'select') {
      const actions = enemyPlanActions || [];
      if (!actions.length) return [];
      if (!insightReveal || !insightReveal.visible || (insightReveal.level || 0) === 0) return [];
      const level = insightReveal.level || 0;
      const limited = level === 1 ? actions.slice(0, 2) : actions;
      let sp = 0;
      return limited.map((card, idx) => {
        sp += card.speedCost || 0;
        return { actor: 'enemy', card, sp, idx };
      });
    }
    if (battlePhase === 'respond' && fixedOrder) {
      return fixedOrder.filter(x => x.actor === 'enemy');
    }
    if (battlePhase === 'resolve') {
      return battleQueue.filter(x => x.actor === 'enemy');
    }
    return [];
  }, [battlePhase, fixedOrder, battleQueue, enemyPlanActions, insightReveal]);

  return { playerTimeline, enemyTimeline };
}
