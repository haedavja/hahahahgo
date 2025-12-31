/**
 * @file SelectPhaseCards.tsx
 * @description 선택 단계 카드 표시
 */

import { memo, useMemo } from 'react';
import type { FC, MouseEvent } from 'react';
import { hasTrait, applyTraitModifiers } from '../../utils/battleUtils';
import { detectPokerCombo } from '../../utils/comboDetection';
import { TraitBadgeList } from '../TraitBadge';
import { CardStatsSidebar } from '../CardStatsSidebar';
import { Sword, Shield } from '../BattleIcons';
import {
  COOPERATION_ACTIVE_STYLE,
  TARGET_BADGE_SELECT,
  CARD_WRAPPER_BASE,
  CARD_HEADER_STYLE,
  CARD_HEADER_INNER,
  CARD_COLORS,
} from './handStyles';
import { getCardColors, getCardTypeClass, XIcon } from './handUtils';
import type { Card, EnemyUnit, ComboCalculation } from '../../../../types';

interface SelectPhaseCardsProps {
  hand: Card[];
  selected: Card[];
  player: { strength?: number; comboUsageCount?: Record<string, number> } | null;
  fencingBonus: number;
  toggle: (card: Card) => void;
  handDisabled: (card: Card) => boolean;
  showCardTraitTooltip: (card: Card, element: Element | null) => void;
  hideCardTraitTooltip: () => void;
  formatSpeedText: (speed: number) => string;
  renderNameWithBadge: (card: Card, color: string) => React.ReactNode;
  getTargetUnit: (targetUnitId: number | undefined) => EnemyUnit | null;
  isSimplified?: boolean;
}

export const SelectPhaseCards: FC<SelectPhaseCardsProps> = memo(function SelectPhaseCards({
  hand,
  selected,
  player,
  fencingBonus,
  toggle,
  handDisabled,
  showCardTraitTooltip,
  hideCardTraitTooltip,
  formatSpeedText,
  renderNameWithBadge,
  getTargetUnit,
  isSimplified,
}) {
  // 조합 감지
  const { comboCardCosts, isFlush } = useMemo(() => {
    const currentCombo = detectPokerCombo(selected) as ComboCalculation | null;
    const costs = new Set<number>();
    if (currentCombo?.bonusKeys) {
      currentCombo.bonusKeys.forEach((cost: number) => costs.add(cost));
    }
    return {
      comboCardCosts: costs,
      isFlush: currentCombo?.name === '플러쉬',
    };
  }, [selected]);

  return (
    <div className="hand-cards">
      {hand.map((c, idx) => {
        const Icon = c.icon || (c.type === 'attack' ? Sword : Shield);
        const usageCount = player?.comboUsageCount?.[c.id] || 0;
        const cardUid = c.__handUid || c.__uid;
        const selIndex = selected.findIndex((s) => (s.__handUid || s.__uid) === cardUid);
        const sel = selIndex !== -1;
        const isInCombo = sel && (isFlush || comboCardCosts.has(c.actionCost));
        const enhancedCard = applyTraitModifiers(c, { usageCount, isInCombo });
        const disabled = handDisabled(c) && !sel;
        const { costColor, nameColor } = getCardColors(c.__isMainSpecial, c.__isSubSpecial);
        const hasCooperation = hasTrait(c, 'cooperation');
        const cooperationActive = hasCooperation && isInCombo;
        const selectedCard = sel ? selected[selIndex] : null;
        const targetUnit = selectedCard?.__targetUnitId != null ? getTargetUnit(selectedCard.__targetUnitId) : null;

        return (
          <div
            key={c.id + idx}
            onClick={() => !disabled && toggle(enhancedCard)}
            onMouseEnter={(e: MouseEvent<HTMLDivElement>) => {
              const cardEl = e.currentTarget.querySelector('.game-card-large');
              showCardTraitTooltip(c, cardEl);
            }}
            onMouseLeave={hideCardTraitTooltip}
            style={{ ...CARD_WRAPPER_BASE, cursor: disabled ? 'not-allowed' : 'pointer', marginLeft: idx === 0 ? '0' : '-20px' }}
          >
            <div
              className={`game-card-large select-phase-card ${getCardTypeClass(c.type)} ${sel ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
              style={cooperationActive ? COOPERATION_ACTIVE_STYLE : undefined}
            >
              <div className="card-cost-badge-floating" style={{ color: costColor, WebkitTextStroke: '1px #000' }}>
                {enhancedCard.actionCost || c.actionCost}
              </div>
              {sel && <div className="selection-number">{selIndex + 1}</div>}
              {sel && targetUnit && (
                <div style={TARGET_BADGE_SELECT}>
                  <span>{targetUnit.emoji || String.fromCodePoint(0x1F47E)}</span>
                  <span>{String.fromCodePoint(0x1F3AF)}</span>
                </div>
              )}
              <CardStatsSidebar
                card={enhancedCard}
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
                {disabled && (
                  <div className="card-disabled-overlay">
                    <XIcon size={80} className="text-red-500" strokeWidth={4} />
                  </div>
                )}
              </div>
              <div className={`card-footer ${isSimplified ? 'simplified-footer' : ''}`}>
                {c.traits && c.traits.length > 0 ? <TraitBadgeList traits={c.traits} /> : null}
                <span className="card-description">{c.description || ''}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});
