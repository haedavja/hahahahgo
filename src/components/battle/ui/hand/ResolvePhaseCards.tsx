/**
 * @file ResolvePhaseCards.tsx
 * @description 진행 단계 카드 표시
 */

import { memo, useMemo } from 'react';
import type { FC, MouseEvent } from 'react';
import { TraitBadgeList } from '../TraitBadge';
import { CardStatsSidebar } from '../CardStatsSidebar';
import { Sword, Shield } from '../BattleIcons';
import {
  ORDER_BADGE_STYLE,
  TARGET_BADGE_OTHER,
  CARD_WRAPPER_NORMAL_FIRST,
  CARD_WRAPPER_NORMAL,
  CARD_WRAPPER_DIMMED_FIRST,
  CARD_WRAPPER_DIMMED,
  CARD_HEADER_STYLE,
  CARD_HEADER_INNER,
  CARD_COLORS,
} from './handStyles';
import { getCardColors, getCardTypeClass } from './handUtils';
import type { Card, EnemyUnit } from '../../../../types';

interface Action {
  actor: string;
  card: Card;
}

interface ResolvePhaseCardsProps {
  queue: Action[];
  player: { strength?: number } | null;
  fencingBonus: number;
  usedCardIndices?: number[];
  disappearingCards?: number[];
  hiddenCards?: number[];
  disabledCardIndices?: number[];
  showCardTraitTooltip: (card: Card, element: Element | null) => void;
  hideCardTraitTooltip: () => void;
  formatSpeedText: (speed: number) => string;
  renderNameWithBadge: (card: Card, color: string) => React.ReactNode;
  getTargetUnit: (targetUnitId: number | undefined) => EnemyUnit | null;
  isSimplified?: boolean;
}

export const ResolvePhaseCards: FC<ResolvePhaseCardsProps> = memo(function ResolvePhaseCards({
  queue,
  player,
  fencingBonus,
  usedCardIndices = [],
  disappearingCards = [],
  hiddenCards = [],
  disabledCardIndices = [],
  showCardTraitTooltip,
  hideCardTraitTooltip,
  formatSpeedText,
  renderNameWithBadge,
  getTargetUnit,
  isSimplified,
}) {
  // O(n²) → O(1) 최적화: 배열 includes를 Set 조회로 변경
  const usedSet = useMemo(() => new Set(usedCardIndices), [usedCardIndices]);
  const disappearingSet = useMemo(() => new Set(disappearingCards), [disappearingCards]);
  const hiddenSet = useMemo(() => new Set(hiddenCards), [hiddenCards]);
  const disabledSet = useMemo(() => new Set(disabledCardIndices), [disabledCardIndices]);

  // playerActions와 globalIndex를 사전 계산
  const playerActionsWithIndex = useMemo(() => {
    const result: Array<{ action: typeof queue[0]; globalIndex: number }> = [];
    for (let i = 0; i < queue.length; i++) {
      if (queue[i].actor === 'player') {
        result.push({ action: queue[i], globalIndex: i });
      }
    }
    return result;
  }, [queue]);

  return (
    <div className="hand-cards" style={{ justifyContent: 'center' }}>
      {playerActionsWithIndex.map(({ action: a, globalIndex }, i) => {
        const card = a.card;
        const Icon = card.icon || (card.type === 'attack' ? Sword : Shield);
        const isUsed = usedSet.has(globalIndex);
        const isDisappearing = disappearingSet.has(globalIndex);
        const isHidden = hiddenSet.has(globalIndex);
        const isDisabled = disabledSet.has(globalIndex);
        const { costColor } = getCardColors(card.__isMainSpecial, card.__isSubSpecial);
        const targetUnit = card.__targetUnitId != null ? getTargetUnit(card.__targetUnitId) : null;
        const isDimmed = isHidden || isDisabled;

        return (
          <div
            key={`resolve-${globalIndex}`}
            onMouseEnter={(e: MouseEvent<HTMLDivElement>) => {
              const cardEl = e.currentTarget.querySelector('.game-card-large');
              showCardTraitTooltip(card, cardEl);
            }}
            onMouseLeave={hideCardTraitTooltip}
            style={
              isDimmed
                ? (i === 0 ? CARD_WRAPPER_DIMMED_FIRST : CARD_WRAPPER_DIMMED)
                : (i === 0 ? CARD_WRAPPER_NORMAL_FIRST : CARD_WRAPPER_NORMAL)
            }
          >
            <div style={ORDER_BADGE_STYLE}>
              {i + 1}
            </div>
            {targetUnit && (
              <div style={TARGET_BADGE_OTHER}>
                <span>{targetUnit.emoji || String.fromCodePoint(0x1F47E)}</span>
                <span>{String.fromCodePoint(0x1F3AF)}</span>
              </div>
            )}
            <div className={`game-card-large resolve-phase-card ${getCardTypeClass(card.type)} ${isUsed ? 'card-used' : ''}`}>
              <div className="card-cost-badge-floating" style={{ color: costColor, WebkitTextStroke: '1px #000' }}>
                {card.actionCost}
              </div>
              <CardStatsSidebar
                card={card}
                strengthBonus={player?.strength || 0}
                fencingBonus={fencingBonus}
                showCounter={true}
                formatSpeedText={formatSpeedText}
              />
              <div className="card-header" style={CARD_HEADER_STYLE}>
                <div className="text-white font-black text-sm" style={CARD_HEADER_INNER}>
                  {renderNameWithBadge(card, CARD_COLORS.DEFAULT)}
                </div>
              </div>
              <div className="card-icon-area">
                <Icon size={60} className="text-white opacity-80" />
              </div>
              <div className={`card-footer ${isSimplified ? 'simplified-footer' : ''}`}>
                {card.traits && card.traits.length > 0 ? <TraitBadgeList traits={card.traits} /> : null}
                <span className="card-description">{card.description || ''}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});
