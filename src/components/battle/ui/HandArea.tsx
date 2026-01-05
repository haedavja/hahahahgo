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
  Card,
  TokenEntity
} from '../../../types';

/**
 * 손패 영역 컴포넌트 Props
 *
 * 화면 하단에 플레이어의 손패 카드들을 표시합니다.
 * 전투 단계(select/respond/resolve)에 따라 다른 UI를 렌더링합니다.
 */
interface HandAreaProps {
  /** 현재 전투 상태 (phase, queue 등) */
  battle: Battle;
  /** 플레이어 상태 (토큰, HP 등) */
  player: Player | null;
  /** 적 상태 (HP 체크용) */
  enemy: Enemy | null;
  /** 선택된 카드 목록 */
  selected: Card[];
  /** 정렬된 손패 반환 함수 */
  getSortedHand: () => Card[];
  /** 카드 선택/해제 토글 함수 */
  toggle: (card: Card) => void;
  /** 카드 비활성화 여부 체크 함수 */
  handDisabled: (card: Card) => boolean;
  /** 카드 특성 툴팁 표시 함수 */
  showCardTraitTooltip: (card: Card, element: Element | null) => void;
  /** 카드 특성 툴팁 숨김 함수 */
  hideCardTraitTooltip: () => void;
  /** 속도 텍스트 포맷 함수 */
  formatSpeedText: (speed: number) => string;
  /** 카드 이름 + 배지 렌더링 함수 */
  renderNameWithBadge: (card: Card, color: string) => React.ReactNode;
  /** 대응 단계 고정 순서 (respond 단계용) */
  fixedOrder?: Action[];
  /** 카드 순서 위로 이동 (respond 단계용) */
  moveUp?: (idx: number) => void;
  /** 카드 순서 아래로 이동 (respond 단계용) */
  moveDown?: (idx: number) => void;
  /** 실행 큐 (resolve 단계용) */
  queue?: Action[];
  /** 사용된 카드 인덱스 목록 (빛 바래짐 효과) */
  usedCardIndices?: number[];
  /** 사라지는 중인 카드 인덱스 목록 */
  disappearingCards?: number[];
  /** 숨겨진 카드 인덱스 목록 */
  hiddenCards?: number[];
  /** 비활성화된 카드 인덱스 목록 */
  disabledCardIndices?: number[];
  /** 간략 모드 여부 */
  isSimplified?: boolean;
  /** 덱 카드 목록 */
  deck?: Card[];
  /** 버린 카드 더미 */
  discardPile?: Card[];
  /** 적 유닛 목록 (다중 유닛 타겟팅용) */
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
  // O(1) 조회를 위한 unitId → unit 맵 (최적화: find O(n) → Map O(1))
  const enemyUnitMap = useMemo(() => {
    const map = new Map<number, Unit>();
    enemyUnits.forEach(u => map.set(u.unitId, u));
    return map;
  }, [enemyUnits]);

  // 타겟 유닛 정보 가져오기
  const getTargetUnit = useCallback((targetUnitId: number | undefined): Unit | null => {
    if (targetUnitId === undefined && targetUnitId !== 0) return null;
    return enemyUnitMap.get(targetUnitId) ?? null;
  }, [enemyUnitMap]);

  // 날 세우기 보너스
  const fencingBonus = useMemo(() => {
    if (!player) return 0;
    return getTokenStacks(player as TokenEntity, 'sharpened_blade');
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
    <div className="hand-area" data-testid="hand-area">
      {/* 패배 플래그 */}
      <div className="hand-flags">
        {player && player.hp <= 0 && (
          <div className="hand-flag defeat" data-testid="defeat-flag">{String.fromCodePoint(0x1F480)} 패배...</div>
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
