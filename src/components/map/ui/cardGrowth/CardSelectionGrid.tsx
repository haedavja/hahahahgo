/**
 * @file CardSelectionGrid.tsx
 * @description 카드 선택 그리드 (보유 카드 목록)
 */

import { memo, useMemo } from 'react';
import type { FC, CSSProperties } from 'react';
import { TraitBadgeList } from '../../../battle/ui/TraitBadge';
import { Sword, Shield } from '../../../battle/ui/BattleIcons';
import {
  getEnhancementColor,
  getEnhancementLabel,
} from '../../../../lib/cardEnhancementUtils';
import { rarityColors, rarityLabels } from './cardGrowthStyles';
import type { CardGrowthState } from '../../../../state/slices/types';
import type { CardData } from '../../../common/card';

// 정적 스타일 - 컴포넌트 외부에서 한 번만 생성
const emptyContainerStyle: CSSProperties = {
  textAlign: 'center',
  padding: '60px 20px',
  color: '#64748b',
};

const emptyIconStyle: CSSProperties = {
  fontSize: '3rem',
  marginBottom: '16px',
};

const emptyTextStyle: CSSProperties = {
  fontSize: '1.1rem',
};

const gridContainerStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px',
  justifyContent: 'center',
};

const costBadgeStyle: CSSProperties = {
  color: '#fff',
  WebkitTextStroke: '1px #000',
};

const cardHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
};

const cardNameStyle: CSSProperties = {
  color: '#fff',
};

interface CardSelectionGridProps {
  cards: CardData[];
  selectedCardId: string | null;
  getCardGrowthState: (cardId: string) => CardGrowthState;
  onSelectCard: (cardId: string) => void;
}

// 동적 스타일 헬퍼 함수 - 객체 재생성 최소화
const getCardWrapperStyle = (isMaxed: boolean): CSSProperties => ({
  transform: 'scale(1)',
  cursor: isMaxed ? 'not-allowed' : 'pointer',
  opacity: isMaxed ? 0.5 : 1,
});

const getCardBoxStyle = (isSelected: boolean): CSSProperties => ({
  boxShadow: isSelected
    ? '0 0 20px rgba(251, 191, 36, 0.6)'
    : '0 2px 12px rgba(0, 0, 0, 0.4)',
  border: isSelected
    ? '3px solid #fbbf24'
    : '2px solid #334155',
  transition: 'all 0.15s',
});

const getEnhancementBadgeStyle = (level: number): CSSProperties => ({
  position: 'absolute',
  top: '4px',
  right: '8px',
  padding: '2px 8px',
  background: getEnhancementColor(level),
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: 700,
  color: '#0f172a',
  zIndex: 10,
});

const getRarityBadgeStyle = (rarity: string): CSSProperties => ({
  position: 'absolute',
  bottom: '4px',
  right: '4px',
  padding: '2px 6px',
  background: rarityColors[rarity as keyof typeof rarityColors],
  borderRadius: '4px',
  fontSize: '10px',
  fontWeight: 700,
  color: '#0f172a',
  zIndex: 10,
});

export const CardSelectionGrid: FC<CardSelectionGridProps> = memo(function CardSelectionGrid({
  cards,
  selectedCardId,
  getCardGrowthState,
  onSelectCard,
}) {
  // 선택된 카드와 최대 강화 상태에 대한 스타일 캐시
  const selectedStyle = useMemo(() => getCardBoxStyle(true), []);
  const unselectedStyle = useMemo(() => getCardBoxStyle(false), []);
  const maxedWrapperStyle = useMemo(() => getCardWrapperStyle(true), []);
  const normalWrapperStyle = useMemo(() => getCardWrapperStyle(false), []);

  if (cards.length === 0) {
    return (
      <div style={emptyContainerStyle}>
        <div style={emptyIconStyle}>🃏</div>
        <div style={emptyTextStyle}>보유한 카드가 없습니다</div>
      </div>
    );
  }

  return (
    <div style={gridContainerStyle}>
      {cards.map((card) => {
        const growth = getCardGrowthState(card.id);
        const isSelected = card.id === selectedCardId;
        const isMaxed = growth.rarity === 'legendary' && growth.enhancementLevel >= 5;
        const Icon = card.icon || (card.type === 'attack' ? Sword : Shield);

        return (
          <div
            key={card.id}
            onClick={() => !isMaxed && onSelectCard(card.id)}
            style={isMaxed ? maxedWrapperStyle : normalWrapperStyle}
          >
            <div
              className={`game-card-large no-hover ${card.type === 'attack' ? 'attack' : 'defense'}`}
              style={isSelected ? selectedStyle : unselectedStyle}
            >
              <div className="card-cost-badge-floating" style={costBadgeStyle}>
                {card.actionCost}
              </div>
              {/* 강화 레벨 배지 */}
              {(growth.enhancementLevel || 0) > 0 && (
                <div style={getEnhancementBadgeStyle(growth.enhancementLevel || 0)}>
                  {getEnhancementLabel(growth.enhancementLevel || 0)}
                </div>
              )}
              {/* 희귀도 배지 */}
              {growth.rarity !== 'common' && (
                <div style={getRarityBadgeStyle(growth.rarity)}>
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
              <div className="card-header" style={cardHeaderStyle}>
                <div className="font-black text-sm" style={cardNameStyle}>
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
