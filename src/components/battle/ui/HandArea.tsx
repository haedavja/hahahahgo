/**
 * HandArea.tsx
 *
 * 하단 고정 손패 영역 컴포넌트
 * 리팩토링: 페이즈별 카드 컴포넌트 분리
 */

import { FC, memo, useMemo, useCallback } from 'react';
import { getTokenStacks } from '../../../lib/tokenUtils';
import {
  DeckDiscardCounter,
  SelectPhaseCards,
  RespondPhaseCards,
  ResolvePhaseCards,
} from './hand';
import type {
  EnemyUnit as Unit,
  HandBattle as Battle,
  HandPlayer as Player,
  HandEnemy as Enemy,
  HandAction as Action,
  Card
} from '../../../types';

interface HandAreaProps {
  battle: Battle;
  player: Player | null;
  enemy: Enemy | null;
  selected: Card[];
  getSortedHand: () => Card[];
  toggle: (card: Card) => void;
  handDisabled: (card: Card) => boolean;
  showCardTraitTooltip: (card: Card, element: Element | null) => void;
  hideCardTraitTooltip: () => void;
  formatSpeedText: (speed: number) => string;
  renderNameWithBadge: (card: Card, color: string) => React.ReactNode;
  fixedOrder?: Action[];
  moveUp?: (idx: number) => void;
  moveDown?: (idx: number) => void;
  queue?: Action[];
  usedCardIndices?: number[];
  disappearingCards?: number[];
  hiddenCards?: number[];
  disabledCardIndices?: number[];
  isSimplified?: boolean;
  deck?: Card[];
  discardPile?: Card[];
  enemyUnits?: Unit[];
}

export const HandArea: FC<HandAreaProps> = memo(({
  battle,
  player,
  enemy,
  selected,
  getSortedHand,
  toggle,
  handDisabled,
  showCardTraitTooltip,
  hideCardTraitTooltip,
  formatSpeedText,
  renderNameWithBadge,
  fixedOrder,
  moveUp,
  moveDown,
  queue,
  usedCardIndices,
  disappearingCards,
  hiddenCards,
  disabledCardIndices,
  isSimplified,
  deck = [],
  discardPile = [],
  enemyUnits = []
}) => {
  // 타겟 유닛 정보 가져오기
  const getTargetUnit = useCallback((targetUnitId: number | undefined): Unit | null => {
    if (targetUnitId === undefined && targetUnitId !== 0) return null;
    return enemyUnits.find((u) => u.unitId === targetUnitId) || null;
  }, [enemyUnits]);

  // 날 세우기 보너스
  const fencingBonus = useMemo(() => {
    if (!player) return 0;
    return getTokenStacks(player as any, 'sharpened_blade');
  }, [player]);

  // phase 체크 조건
  const shouldShowHand = useMemo(() => (
    battle.phase === 'select' ||
    battle.phase === 'respond' ||
    battle.phase === 'resolve' ||
    (enemy && enemy.hp <= 0) ||
    (player && player.hp <= 0)
  ), [battle.phase, enemy, player]);

  if (!shouldShowHand) {
    return null;
  }

  return (
    <div className="hand-area">
      {/* 패배 플래그 */}
      <div className="hand-flags">
        {player && player.hp <= 0 && (
          <div className="hand-flag defeat">{String.fromCodePoint(0x1F480)} 패배...</div>
        )}
      </div>

      {/* 덱/무덤 카운터 */}
      <DeckDiscardCounter deck={deck} discardPile={discardPile} />

      {/* 선택 단계 */}
      {battle.phase === 'select' && (
        <SelectPhaseCards
          hand={getSortedHand()}
          selected={selected}
          player={player}
          fencingBonus={fencingBonus}
          toggle={toggle}
          handDisabled={handDisabled}
          showCardTraitTooltip={showCardTraitTooltip}
          hideCardTraitTooltip={hideCardTraitTooltip}
          formatSpeedText={formatSpeedText}
          renderNameWithBadge={renderNameWithBadge}
          getTargetUnit={getTargetUnit}
          isSimplified={isSimplified}
        />
      )}

      {/* 대응 단계 */}
      {battle.phase === 'respond' && fixedOrder && (
        <RespondPhaseCards
          fixedOrder={fixedOrder}
          player={player}
          fencingBonus={fencingBonus}
          showCardTraitTooltip={showCardTraitTooltip}
          hideCardTraitTooltip={hideCardTraitTooltip}
          formatSpeedText={formatSpeedText}
          renderNameWithBadge={renderNameWithBadge}
          getTargetUnit={getTargetUnit}
          moveUp={moveUp}
          moveDown={moveDown}
          isSimplified={isSimplified}
        />
      )}

      {/* 진행 단계 */}
      {battle.phase === 'resolve' && queue && battle.queue.length > 0 && (
        <ResolvePhaseCards
          queue={queue}
          player={player}
          fencingBonus={fencingBonus}
          usedCardIndices={usedCardIndices}
          disappearingCards={disappearingCards}
          hiddenCards={hiddenCards}
          disabledCardIndices={disabledCardIndices}
          showCardTraitTooltip={showCardTraitTooltip}
          hideCardTraitTooltip={hideCardTraitTooltip}
          formatSpeedText={formatSpeedText}
          renderNameWithBadge={renderNameWithBadge}
          getTargetUnit={getTargetUnit}
          isSimplified={isSimplified}
        />
      )}
    </div>
  );
});
