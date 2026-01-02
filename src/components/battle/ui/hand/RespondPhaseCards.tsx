/**
 * @file RespondPhaseCards.tsx
 * @description 대응 단계 카드 표시
 */

import { memo } from 'react';
import type { FC, MouseEvent } from 'react';
import { TraitBadgeList } from '../TraitBadge';
import { CardStatsSidebar } from '../CardStatsSidebar';
import { Sword, Shield } from '../BattleIcons';
import {
  ORDER_BADGE_STYLE,
  TARGET_BADGE_OTHER,
  CARD_WRAPPER_BASE,
  CARD_HEADER_STYLE,
  CARD_HEADER_INNER,
} from './handStyles';
import { getCardColors, getCardTypeClass } from './handUtils';
import type { Card, EnemyUnit } from '../../../../types';

interface Action {
  actor: string;
  card: Card;
}

interface RespondPhaseCardsProps {
  fixedOrder: Action[];
  player: { strength?: number } | null;
  fencingBonus: number;
  showCardTraitTooltip: (card: Card, element: Element | null) => void;
  hideCardTraitTooltip: () => void;
  formatSpeedText: (speed: number) => string;
  renderNameWithBadge: (card: Card, color: string) => React.ReactNode;
  getTargetUnit: (targetUnitId: number | undefined) => EnemyUnit | null;
  moveUp?: (idx: number) => void;
  moveDown?: (idx: number) => void;
  isSimplified?: boolean;
}

export const RespondPhaseCards: FC<RespondPhaseCardsProps> = memo(function RespondPhaseCards({
  fixedOrder,
  player,
  fencingBonus,
  showCardTraitTooltip,
  hideCardTraitTooltip,
  formatSpeedText,
  renderNameWithBadge,
  getTargetUnit,
  moveUp,
  moveDown,
  isSimplified,
}) {
  const playerActions = fixedOrder.filter(a => a.actor === 'player');

  return (
    <div className="hand-cards" style={{ justifyContent: 'center' }}>
      {playerActions.map((action, idx, arr) => {
        const c = action.card;
        const Icon = c.icon || (c.type === 'attack' ? Sword : Shield);
        const { costColor, nameColor } = getCardColors(c.__isMainSpecial, c.__isSubSpecial);
        const targetUnit = c.__targetUnitId != null ? getTargetUnit(c.__targetUnitId) : null;

        return (
          <div
            key={idx}
            onMouseEnter={(e: MouseEvent<HTMLDivElement>) => {
              const cardEl = e.currentTarget.querySelector('.game-card-large');
              showCardTraitTooltip(c, cardEl);
            }}
            onMouseLeave={hideCardTraitTooltip}
            style={{ ...CARD_WRAPPER_BASE, marginLeft: idx === 0 ? '0' : '8px' }}
          >
            <div style={ORDER_BADGE_STYLE}>
              {idx + 1}
            </div>
            {targetUnit && (
              <div style={TARGET_BADGE_OTHER}>
                <span>{targetUnit.emoji || String.fromCodePoint(0x1F47E)}</span>
                <span>{String.fromCodePoint(0x1F3AF)}</span>
              </div>
            )}
            <div className={`game-card-large respond-phase-card ${getCardTypeClass(c.type)}`}>
              <div className="card-cost-badge-floating" style={{ color: costColor, WebkitTextStroke: '1px #000' }}>
                {c.actionCost}
              </div>
              <CardStatsSidebar
                card={c}
                strengthBonus={player?.strength || 0}
                fencingBonus={fencingBonus}
                formatSpeedText={formatSpeedText}
              />
              <div className="card-header" style={CARD_HEADER_STYLE}>
                <div className="font-black text-sm" style={CARD_HEADER_INNER}>
                  {renderNameWithBadge(c, nameColor)}
                </div>
              </div>
              <div className="card-icon-area">
                <Icon size={60} className="text-white opacity-80" />
              </div>
              <div className={`card-footer ${isSimplified ? 'simplified-footer' : ''}`}>
                {c.traits && c.traits.length > 0 ? <TraitBadgeList traits={c.traits} /> : null}
                <span className="card-description">{c.description || ''}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {idx > 0 && moveUp && (
                <button onClick={() => moveUp(idx)} className="btn-enhanced text-xs" style={{ padding: '4px 12px' }}>
                  {String.fromCodePoint(0x2190)}
                </button>
              )}
              {idx < arr.length - 1 && moveDown && (
                <button onClick={() => moveDown(idx)} className="btn-enhanced text-xs" style={{ padding: '4px 12px' }}>
                  {String.fromCodePoint(0x2192)}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});
