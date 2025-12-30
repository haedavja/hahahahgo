/**
 * @file useCardTooltip.js
 * @description 카드 툴팁 관리 훅
 * @typedef {import('../../../types').Card} Card
 *
 * ## 기능
 * - 카드 호버 시 특성 툴팁 표시
 * - 페이즈 변경 시 툴팁 자동 정리
 * - 지연 표시 (300ms)로 깜빡임 방지
 */

import { useRef, useCallback, useEffect } from 'react';
import type { UseCardTooltipParams } from '../../../types/hooks';
import type { Card } from '../../../types';

/**
 * 카드 툴팁 관리 훅
 * @param {Object} params
 * @param {Object|null} params.hoveredCard - 호버된 카드 정보
 * @param {string} params.battlePhase - 현재 페이즈
 * @param {Object} params.actions - 상태 업데이트 액션
 * @returns {{showCardTraitTooltip: Function, hideCardTraitTooltip: Function}}
 */
export function useCardTooltip({ hoveredCard, battlePhase, actions }: UseCardTooltipParams) {
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredCardRef = useRef<{ card: Card, x: number, y: number } | null>(null);

  // hoveredCard 상태를 ref로 유지 (타이머 콜백에서 참조)
  useEffect(() => {
    hoveredCardRef.current = hoveredCard as { card: Card, x: number, y: number } | null;
  }, [hoveredCard]);

  // 페이즈 변경 시 툴팁 정리 (카드가 사라질 때 툴팁이 남는 문제 방지)
  useEffect(() => {
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
    actions.setHoveredCard(null);
    actions.setTooltipVisible(false);
  }, [battlePhase, actions]);

  const showCardTraitTooltip = useCallback((card: Card, cardElement: HTMLElement) => {
    const hasTraits = card?.traits && card.traits.length > 0;
    const cardWithTokens = card as Card & { appliedTokens?: Array<{ id: string; stacks?: number; target?: string }> };
    const hasAppliedTokens = cardWithTokens?.appliedTokens && cardWithTokens.appliedTokens.length > 0;
    if ((!hasTraits && !hasAppliedTokens) || !cardElement) return;

    const updatePos = () => {
      // 요소가 DOM에 있고 보이는지 확인
      if (!cardElement || !document.body.contains(cardElement)) {
        actions.setHoveredCard(null);
        actions.setTooltipVisible(false);
        return false;
      }
      const rect = cardElement.getBoundingClientRect();
      // 유효한 위치인지 확인 (요소가 보이지 않으면 0, 0)
      if (rect.width === 0 && rect.height === 0) {
        actions.setHoveredCard(null);
        actions.setTooltipVisible(false);
        return false;
      }
      actions.setHoveredCard({ card, x: rect.right + 16, y: Math.max(10, rect.top) });
      return true;
    };

    if (!updatePos()) return;
    actions.setTooltipVisible(false);
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    tooltipTimerRef.current = setTimeout(() => {
      if (hoveredCardRef.current?.card?.id !== card.id) return;
      if (!updatePos()) return; // 위치 재측정 후 표시
      requestAnimationFrame(() => {
        if (hoveredCardRef.current?.card?.id !== card.id) return;
        actions.setTooltipVisible(true);
      });
    }, 300);
  }, [actions]);

  const hideCardTraitTooltip = useCallback(() => {
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
    actions.setHoveredCard(null);
    actions.setTooltipVisible(false);
  }, [actions]);

  return {
    showCardTraitTooltip,
    hideCardTraitTooltip
  };
}
