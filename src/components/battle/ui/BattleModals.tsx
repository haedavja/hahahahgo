/**
 * @file BattleModals.tsx
 * @description 전투 중 표시되는 모달 컴포넌트 모음
 *
 * BattleApp.tsx에서 분리된 모달 렌더링 컴포넌트
 * - 브리치 카드 선택 모달
 * - 특성 보상 선택 모달
 * - 카드 보상 선택 모달
 * - 함성(리콜) 카드 선택 모달
 * - 런 종료 오버레이
 * - 패배 오버레이
 */

import { FC, memo, lazy, Suspense } from 'react';
import type { BreachSelection, RecallSelection, PlayerState, BattleResult } from '../../../types';
import type { RewardCard } from '../../../types';

// Lazy loaded modals for better code splitting
const BreachSelectionModal = lazy(() => import('./BreachSelectionModal').then(m => ({ default: m.BreachSelectionModal })));
const CardRewardModal = lazy(() => import('./CardRewardModal').then(m => ({ default: m.CardRewardModal })));
const RecallSelectionModal = lazy(() => import('./RecallSelectionModal').then(m => ({ default: m.RecallSelectionModal })));
const TraitRewardModal = lazy(() => import('./TraitRewardModal').then(m => ({ default: m.TraitRewardModal })));
const RunSummaryOverlay = lazy(() => import('./RunSummaryOverlay').then(m => ({ default: m.RunSummaryOverlay })));
const DefeatOverlay = lazy(() => import('./DefeatOverlay').then(m => ({ default: m.DefeatOverlay })));

/** 특성 보상 데이터 */
interface TraitRewardData {
  traits: Array<{ id: string; name: string; description: string }>;
}

/** 카드 보상 데이터 */
interface CardRewardData {
  cards: RewardCard[];
}

/**
 * BattleModals Props
 */
export interface BattleModalsProps {
  // 브리치 선택
  breachSelection: BreachSelection | null;
  onBreachSelect: (card: unknown) => void;
  playerStrength: number;

  // 특성 보상
  traitReward: TraitRewardData | null;
  onTraitSelect: (traitId: string) => void;
  onTraitSkip: () => void;

  // 카드 보상
  cardReward: CardRewardData | null;
  onRewardSelect: (card: RewardCard, idx: number) => void;
  onRewardSkip: () => void;

  // 리콜 선택
  recallSelection: RecallSelection | null;
  onRecallSelect: (card: unknown) => void;
  onRecallSkip: () => void;

  // 런 종료
  runSummary: {
    show: boolean;
    result?: BattleResult;
    onClose?: () => void;
  } | null;

  // 패배
  isDefeated: boolean;
  onDefeatConfirm: () => void;
  playerState: PlayerState;
}

/**
 * 전투 모달 컴포넌트
 *
 * 전투 중 다양한 선택 및 결과 모달을 렌더링합니다.
 * Suspense를 사용하여 코드 분할을 적용합니다.
 */
export const BattleModals: FC<BattleModalsProps> = memo(function BattleModals({
  // 브리치 선택
  breachSelection,
  onBreachSelect,
  playerStrength,

  // 특성 보상
  traitReward,
  onTraitSelect,
  onTraitSkip,

  // 카드 보상
  cardReward,
  onRewardSelect,
  onRewardSkip,

  // 리콜 선택
  recallSelection,
  onRecallSelect,
  onRecallSkip,

  // 런 종료
  runSummary,

  // 패배
  isDefeated,
  onDefeatConfirm,
  playerState,
}) {
  return (
    <>
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

        {/* 런 종료 요약 오버레이 */}
        {runSummary?.show && runSummary.result && (
          <RunSummaryOverlay
            result={runSummary.result}
            onClose={runSummary.onClose || (() => {})}
          />
        )}
      </Suspense>

      {/* 패배 오버레이 */}
      {isDefeated && (
        <Suspense fallback={null}>
          <DefeatOverlay
            player={playerState}
            onConfirm={onDefeatConfirm}
          />
        </Suspense>
      )}
    </>
  );
});

export default BattleModals;
