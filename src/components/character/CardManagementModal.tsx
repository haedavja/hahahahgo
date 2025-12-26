/**
 * CardManagementModal.tsx
 *
 * 카드 관리 모달 컴포넌트
 * CharacterSheet에서 분리됨
 */

import { FC, MouseEvent } from 'react';
import { CARDS } from "../battle/battleData";
import { TraitBadgeList } from "../battle/ui/TraitBadge";
import { Sword, Shield } from "../battle/ui/BattleIcons";
import type { ModalCard as Card } from '../../types';

interface SelectedCardsProps {
  cards: string[];
  specialMode: 'main' | 'sub';
  onCardRemove: (cardId: string) => void;
}

/**
 * 선택된 카드 표시 컴포넌트
 */
const SelectedCards: FC<SelectedCardsProps> = ({ cards, specialMode, onCardRemove }) => {
  const isMainSpecial = specialMode === 'main';
  const borderColor = isMainSpecial ? '#f5d76e' : '#7dd3fc';

  return (
    <div style={{ marginBottom: '20px' }}>
      <h3 style={{
        fontSize: '14px',
        color: isMainSpecial ? '#f5d76e' : '#7dd3fc',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        {isMainSpecial ? '⭐ 선택된 주특기' : '💠 선택된 보조특기'}
        <span style={{ opacity: 0.7, fontWeight: 'normal' }}>
          ({cards.length}장)
        </span>
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', minHeight: '230px', alignItems: 'flex-start' }}>
        {cards.map((cardId, idx) => {
          const card = (CARDS as Card[]).find(c => c.id === cardId);
          if (!card) return null;
          const Icon = card.type === 'attack' ? Sword : Shield;
          return (
            <div
              key={`selected-${cardId}-${idx}`}
              style={{ transform: 'scale(1.1)', transformOrigin: 'top left', width: '170px', height: '220px' }}
            >
              <div
                onClick={() => onCardRemove(cardId)}
                className={`game-card-large no-hover ${card.type === 'attack' ? 'attack' : 'defense'}`}
                style={{
                  cursor: 'pointer',
                  boxShadow: `0 0 15px ${borderColor}40`,
                  border: `2px solid ${borderColor}`,
                }}
                title="클릭하여 제거"
              >
                <div className="card-cost-badge-floating" style={{
                  color: isMainSpecial ? '#fcd34d' : '#60a5fa',
                  WebkitTextStroke: '1px #000'
                }}>
                  {card.actionCost}
                </div>
                <div className="card-stats-sidebar">
                  {card.damage != null && card.damage > 0 && (
                    <div className="card-stat-item attack">⚔️{card.damage}{card.hits ? `×${card.hits}` : ''}</div>
                  )}
                  {card.block != null && card.block > 0 && (
                    <div className="card-stat-item defense">🛡️{card.block}</div>
                  )}
                  <div className="card-stat-item speed">⏱️{card.speedCost}</div>
                </div>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'center' }}>
                  <div className="font-black text-sm" style={{ color: isMainSpecial ? '#fcd34d' : '#7dd3fc' }}>
                    {card.name}
                  </div>
                </div>
                <div className="card-icon-area">
                  <Icon size={50} className="text-white opacity-80" />
                </div>
                <div className="card-footer">
                  {card.traits && card.traits.length > 0 && <TraitBadgeList traits={card.traits} />}
                  <span className="card-description">{card.description || ''}</span>
                </div>
              </div>
            </div>
          );
        })}
        {cards.length === 0 && (
          <span style={{ color: '#6b7280', fontSize: '13px', padding: '40px 0' }}>선택된 카드가 없습니다</span>
        )}
      </div>
    </div>
  );
};

interface CardItemProps {
  card: Card;
  displayKey?: string;
  cardType?: string;
  onCardClick: (cardId: string, isRightClick: boolean) => void;
}

/**
 * 카드 아이템 컴포넌트
 */
const CardItem: FC<CardItemProps> = ({ card, displayKey, cardType, onCardClick }) => {
  const Icon = card.type === 'attack' ? Sword : Shield;
  const isMainSpecial = cardType === 'main';
  const isSubSpecial = cardType === 'sub';
  const isOwnedOnly = cardType === 'owned';

  let borderStyle: Record<string, string> = {};
  if (isMainSpecial) {
    borderStyle = { border: '2px solid #f5d76e', boxShadow: '0 0 10px rgba(245, 215, 110, 0.4)' };
  } else if (isSubSpecial) {
    borderStyle = { border: '2px solid #7dd3fc', boxShadow: '0 0 10px rgba(125, 211, 252, 0.4)' };
  } else if (isOwnedOnly) {
    borderStyle = { border: '2px solid #64748b', boxShadow: '0 0 10px rgba(100, 116, 139, 0.4)' };
  }

  return (
    <div
      key={displayKey || card.id}
      style={{ transform: 'scale(1.05)', transformOrigin: 'top left', width: '162px', height: '210px' }}
    >
      <div
        onClick={() => onCardClick(card.id, false)}
        onContextMenu={(e: MouseEvent<HTMLDivElement>) => {
          e.preventDefault();
          onCardClick(card.id, true);
        }}
        className={`game-card-large no-hover ${card.type === 'attack' ? 'attack' : 'defense'}`}
        style={{
          cursor: 'pointer',
          ...borderStyle,
        }}
      >
        <div className="card-cost-badge-floating" style={{
          color: isMainSpecial ? '#fcd34d' : isSubSpecial ? '#60a5fa' : isOwnedOnly ? '#94a3b8' : '#fff',
          WebkitTextStroke: '1px #000'
        }}>
          {card.actionCost}
        </div>
        {(isMainSpecial || isSubSpecial || isOwnedOnly) && (
          <div style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: isMainSpecial ? '#f5d76e' : isSubSpecial ? '#7dd3fc' : '#64748b',
            color: isOwnedOnly ? '#fff' : '#000',
            padding: '2px 6px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 700,
            zIndex: 10,
          }}>
            {isMainSpecial ? '⭐' : isSubSpecial ? '💠' : '⏳'}
          </div>
        )}
        <div className="card-stats-sidebar">
          {card.damage != null && card.damage > 0 && (
            <div className="card-stat-item attack">⚔️{card.damage}{card.hits ? `×${card.hits}` : ''}</div>
          )}
          {card.block != null && card.block > 0 && (
            <div className="card-stat-item defense">🛡️{card.block}</div>
          )}
          <div className="card-stat-item speed">⏱️{card.speedCost}</div>
        </div>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="font-black text-sm" style={{
            color: isMainSpecial ? '#fcd34d' : isSubSpecial ? '#7dd3fc' : isOwnedOnly ? '#94a3b8' : '#fff'
          }}>
            {card.name}
          </div>
        </div>
        <div className="card-icon-area">
          <Icon size={50} className="text-white opacity-80" />
        </div>
        <div className="card-footer">
          {card.traits && card.traits.length > 0 && <TraitBadgeList traits={card.traits} />}
          <span className="card-description">{card.description || ''}</span>
        </div>
      </div>
    </div>
  );
};

interface CardManagementModalProps {
  onClose: () => void;
  specialMode: 'main' | 'sub';
  setSpecialMode: (mode: 'main' | 'sub') => void;
  mainSpecials: string[];
  subSpecials: string[];
  maxMainSlots: number;
  maxSubSlots: number;
  displayedCards: Card[];
  showAllCards: boolean;
  onCardClick: (cardId: string, isRightClick: boolean) => void;
}

/**
 * 카드 관리 모달
 */
export const CardManagementModal: FC<CardManagementModalProps> = ({
  onClose,
  specialMode,
  setSpecialMode,
  mainSpecials,
  subSpecials,
  maxMainSlots,
  maxSubSlots,
  displayedCards,
  showAllCards,
  onCardClick,
}) => {
  const getModeButtonStyle = (mode: 'main' | 'sub'): Record<string, unknown> => ({
    flex: 1,
    padding: "8px 12px",
    fontSize: "14px",
    borderRadius: "8px",
    border: "1px solid rgba(118, 134, 185, 0.5)",
    marginRight: mode === "main" ? "8px" : "0",
    background:
      specialMode === mode
        ? mode === "main"
          ? "linear-gradient(135deg, #f5d76e, #c9a64a)"
          : "linear-gradient(135deg, #7dd3fc, #2b6fbf)"
        : "rgba(8, 11, 19, 0.95)",
    color: specialMode === mode ? "#000" : "#9fb6ff",
    fontWeight: specialMode === mode ? 700 : 500,
    cursor: "pointer",
    transition: "all 0.2s ease",
  });

  const selectedCards = specialMode === 'main' ? mainSpecials : subSpecials;

  const handleCardRemove = (cardId: string): void => {
    onCardClick(cardId, true);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        style={{
          width: '900px',
          maxHeight: '90vh',
          background: 'rgba(8, 11, 19, 0.98)',
          borderRadius: '16px',
          border: '2px solid #22c55e',
          boxShadow: '0 0 40px rgba(34, 197, 94, 0.3)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', margin: 0, color: '#22c55e' }}>🃏 카드 관리</h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid rgba(118, 134, 185, 0.5)',
              background: 'rgba(8, 11, 19, 0.95)',
              color: '#fca5a5',
              cursor: 'pointer',
            }}
          >
            닫기
          </button>
        </div>

        {/* 슬롯 현황 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '10px 16px',
          marginBottom: '12px',
          background: 'rgba(5, 8, 13, 0.92)',
          borderRadius: '8px',
          border: '1px solid rgba(118, 134, 185, 0.4)',
        }}>
          <span style={{ color: '#9fb6ff', fontSize: '14px' }}>
            주특기: <b style={{ color: '#f5d76e' }}>{mainSpecials.length} / {maxMainSlots}</b>
          </span>
          <span style={{ color: '#9fb6ff', fontSize: '14px' }}>
            보조특기: <b style={{ color: '#7dd3fc' }}>{subSpecials.length} / {maxSubSlots}</b>
          </span>
        </div>

        {/* 모드 선택 버튼 */}
        <div style={{ display: 'flex', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setSpecialMode('main')}
            style={getModeButtonStyle('main') as React.CSSProperties}
          >
            ⭐ 주특기 선택 모드
          </button>
          <button
            type="button"
            onClick={() => setSpecialMode('sub')}
            style={getModeButtonStyle('sub') as React.CSSProperties}
          >
            💠 보조특기 선택 모드
          </button>
        </div>

        {/* 선택 안내 */}
        <div style={{
          fontSize: '12px',
          color: '#9ca3af',
          marginBottom: '12px',
          padding: '8px 12px',
          background: 'rgba(100, 116, 139, 0.1)',
          borderRadius: '6px',
        }}>
          💡 좌클릭: 카드 추가 | 우클릭: 카드 제거
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* 선택된 카드 */}
          <SelectedCards
            cards={selectedCards}
            specialMode={specialMode}
            onCardRemove={handleCardRemove}
          />

          {/* 카드 목록 */}
          <h3 style={{ fontSize: '14px', color: '#9fb6ff', marginBottom: '12px' }}>
            📜 {showAllCards ? '전체 카드 목록' : '보유 카드 목록'}
            {!showAllCards && displayedCards.length === 0 && (
              <span style={{ color: '#64748b', fontWeight: 'normal', marginLeft: '8px' }}>(보유 카드 없음)</span>
            )}
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {displayedCards.map((c) => (
              <CardItem
                key={c._displayKey || c.id}
                card={c}
                displayKey={c._displayKey}
                cardType={c._type}
                onCardClick={onCardClick}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
