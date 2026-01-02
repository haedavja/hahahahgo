/**
 * @file CardSelectionGrid.tsx
 * @description 카드 선택 그리드 (보유 카드 목록)
 */

import { memo } from 'react';
import type { FC } from 'react';
import { TraitBadgeList } from '../../../battle/ui/TraitBadge';
import { Sword, Shield } from '../../../battle/ui/BattleIcons';
import {
  getEnhancementColor,
  getEnhancementLabel,
} from '../../../../lib/cardEnhancementUtils';
import { rarityColors, rarityLabels } from './cardGrowthStyles';
import type { CardGrowthState } from '../../../../state/slices/types';
import type { CardData } from '../../../common/card';

interface CardSelectionGridProps {
  cards: CardData[];
  selectedCardId: string | null;
  getCardGrowthState: (cardId: string) => CardGrowthState;
  onSelectCard: (cardId: string) => void;
}

export const CardSelectionGrid: FC<CardSelectionGridProps> = memo(function CardSelectionGrid({
  cards,
  selectedCardId,
  getCardGrowthState,
  onSelectCard,
}) {
  if (cards.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        color: '#64748b',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🃏</div>
        <div style={{ fontSize: '1.1rem' }}>보유한 카드가 없습니다</div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
      justifyContent: 'center',
    }}>
      {cards.map((card) => {
        const growth = getCardGrowthState(card.id);
        const isSelected = card.id === selectedCardId;
        const isMaxed = growth.rarity === 'legendary' && growth.enhancementLevel >= 5;
        const Icon = card.icon || (card.type === 'attack' ? Sword : Shield);

        return (
          <div
            key={card.id}
            onClick={() => !isMaxed && onSelectCard(card.id)}
            style={{
              transform: 'scale(1)',
              cursor: isMaxed ? 'not-allowed' : 'pointer',
              opacity: isMaxed ? 0.5 : 1,
            }}
          >
            <div
              className={`game-card-large no-hover ${card.type === 'attack' ? 'attack' : 'defense'}`}
              style={{
                boxShadow: isSelected
                  ? '0 0 20px rgba(251, 191, 36, 0.6)'
                  : '0 2px 12px rgba(0, 0, 0, 0.4)',
                border: isSelected
                  ? '3px solid #fbbf24'
                  : '2px solid #334155',
                transition: 'all 0.15s',
              }}
            >
              <div className="card-cost-badge-floating" style={{
                color: '#fff',
                WebkitTextStroke: '1px #000'
              }}>
                {card.actionCost}
              </div>
              {/* 강화 레벨 배지 */}
              {(growth.enhancementLevel || 0) > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '4px',
                  right: '8px',
                  padding: '2px 8px',
                  background: getEnhancementColor(growth.enhancementLevel || 0),
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#0f172a',
                  zIndex: 10,
                }}>
                  {getEnhancementLabel(growth.enhancementLevel || 0)}
                </div>
              )}
              {/* 희귀도 배지 */}
              {growth.rarity !== 'common' && (
                <div style={{
                  position: 'absolute',
                  bottom: '4px',
                  right: '4px',
                  padding: '2px 6px',
                  background: rarityColors[growth.rarity],
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#0f172a',
                  zIndex: 10,
                }}>
                  {rarityLabels[growth.rarity]}
                </div>
              )}
              <div className="card-stats-sidebar">
                {card.damage != null && card.damage > 0 && (
                  <div className="card-stat-item attack">
                    ⚔️{card.damage}{card.hits ? `×${card.hits}` : ''}
                  </div>
                )}
                {card.block != null && card.block > 0 && (
                  <div className="card-stat-item defense">🛡️{card.block}</div>
                )}
                <div className="card-stat-item speed">⏱️{card.speedCost}</div>
              </div>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'center' }}>
                <div className="font-black text-sm" style={{ color: '#fff' }}>
                  {card.name}
                </div>
              </div>
              <div className="card-icon-area">
                <Icon size={50} className="text-white opacity-80" />
              </div>
              <div className="card-footer">
                {growth.traits && growth.traits.length > 0 && (
                  <TraitBadgeList traits={growth.traits} />
                )}
                <span className="card-description">{card.description || ''}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});
