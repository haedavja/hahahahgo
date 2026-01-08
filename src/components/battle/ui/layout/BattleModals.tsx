/**
 * @file BattleModals.tsx
 * @description 전투 중 표시되는 모달 컴포넌트들을 통합 관리
 *
 * BattleApp.tsx에서 분리된 모달 렌더링 로직
 */

import React, { lazy, Suspense, memo } from 'react';
import type { BreachSelection, RecallSelection, Card } from '../../../../types';

// Lazy loaded modals
const BreachSelectionModal = lazy(() => import('../BreachSelectionModal').then(m => ({ default: m.BreachSelectionModal })));
const CardRewardModal = lazy(() => import('../CardRewardModal').then(m => ({ default: m.CardRewardModal })));
const RecallSelectionModal = lazy(() => import('../RecallSelectionModal').then(m => ({ default: m.RecallSelectionModal })));
const TraitRewardModal = lazy(() => import('../TraitRewardModal').then(m => ({ default: m.TraitRewardModal })));
const RunSummaryOverlay = lazy(() => import('../RunSummaryOverlay').then(m => ({ default: m.RunSummaryOverlay })));

export interface BattleModalsProps {
  // 브리치 선택
  breachSelection: BreachSelection | null;
  onBreachSelect: (card: Card) => void;
  playerStrength: number;

  // 특성 보상
  traitReward: { traits: string[] } | null;
  onTraitSelect: (trait: string) => void;
  onTraitSkip: () => void;

  // 카드 보상
  cardReward: { cards: Card[] } | null;
  onRewardSelect: (card: Card) => void;
  onRewardSkip: () => void;

  // 함성 선택
  recallSelection: RecallSelection | null;
  onRecallSelect: (card: Card) => void;
  onRecallSkip: () => void;

  // 런 요약
  postCombatOptions: { type: string } | null;
  isBoss: boolean;
  onExitToMap: () => void;
}

/**
 * 전투 모달 통합 컴포넌트
 * 모든 모달을 Suspense로 감싸서 lazy loading 지원
 */
export const BattleModals = memo(function BattleModals({
  breachSelection,
  onBreachSelect,
  playerStrength,
  traitReward,
  onTraitSelect,
  onTraitSkip,
  cardReward,
  onRewardSelect,
  onRewardSkip,
  recallSelection,
  onRecallSelect,
  onRecallSkip,
  postCombatOptions,
  isBoss,
  onExitToMap,
}: BattleModalsProps) {
  return (
    <Suspense fallback={null}>
      {/* 브리치 카드 선택 모달 */}
      {breachSelection && (
        <BreachSelectionModal
          breachSelection={breachSelection}
          onSelect={onBreachSelect}
          strengthBonus={playerStrength}
        />
      )}

      {/* 특성 보상 선택 모달 (30% 확률) */}
      {traitReward && (
        <TraitRewardModal
          traits={traitReward.traits}
          onSelect={onTraitSelect}
          onSkip={onTraitSkip}
        />
      )}

      {/* 카드 보상 선택 모달 (승리 후) */}
      {cardReward && (
        <CardRewardModal
          rewardCards={cardReward.cards}
          onSelect={onRewardSelect}
          onSkip={onRewardSkip}
        />
      )}

      {/* 함성 (recallCard) 카드 선택 모달 */}
      <RecallSelectionModal
        recallSelection={recallSelection}
        onSelect={onRecallSelect}
        onSkip={onRecallSkip}
      />

      {/* 패배/승리 시 런 요약 오버레이 */}
      {postCombatOptions?.type === 'defeat' && (
        <RunSummaryOverlay result="defeat" onExit={onExitToMap} />
      )}
      {postCombatOptions?.type === 'victory' && isBoss && (
        <RunSummaryOverlay result="victory" onExit={onExitToMap} />
      )}
    </Suspense>
  );
});
