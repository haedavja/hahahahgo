/**
 * CardManagementModal.tsx
 *
 * 카드 관리 모달 컴포넌트
 * CharacterSheet에서 분리됨
 * 최적화: React.memo + 스타일 상수 추출 + useCallback
 */

import { FC, MouseEvent, memo, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { CARDS } from "../battle/battleData";
import { TraitBadgeList } from "../battle/ui/TraitBadge";
import { Sword, Shield } from "../battle/ui/BattleIcons";
import type { ModalCard as Card } from '../../types';

// =====================
// 스타일 상수
// =====================

const OVERLAY_STYLE: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10001
};

const MODAL_CONTAINER_STYLE: CSSProperties = {
  width: '900px',
  maxHeight: '90vh',
  background: 'rgba(8, 11, 19, 0.98)',
  borderRadius: '16px',
  border: '2px solid #22c55e',
  boxShadow: '0 0 40px rgba(34, 197, 94, 0.3)',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column'
};

const HEADER_STYLE: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '16px'
};

const TITLE_STYLE: CSSProperties = {
  fontSize: '20px',
  margin: 0,
  color: '#22c55e'
};

const CLOSE_BUTTON_STYLE: CSSProperties = {
  padding: '6px 12px',
  fontSize: '13px',
  borderRadius: '8px',
  border: '1px solid rgba(118, 134, 185, 0.5)',
  background: 'rgba(8, 11, 19, 0.95)',
  color: '#fca5a5',
  cursor: 'pointer'
};

const SLOT_STATUS_STYLE: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '10px 16px',
  marginBottom: '12px',
  background: 'rgba(5, 8, 13, 0.92)',
  borderRadius: '8px',
  border: '1px solid rgba(118, 134, 185, 0.4)'
};

const SLOT_TEXT_STYLE: CSSProperties = {
  color: '#9fb6ff',
  fontSize: '14px'
};

const MODE_BUTTONS_STYLE: CSSProperties = {
  display: 'flex',
  marginBottom: '16px'
};

const HINT_STYLE: CSSProperties = {
  fontSize: '12px',
  color: '#9ca3af',
  marginBottom: '12px',
  padding: '8px 12px',
  background: 'rgba(100, 116, 139, 0.1)',
  borderRadius: '6px'
};

const CARDS_LIST_TITLE_STYLE: CSSProperties = {
  fontSize: '14px',
  color: '#9fb6ff',
  marginBottom: '12px'
};

const CARDS_GRID_STYLE: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px'
};

const SELECTED_SECTION_STYLE: CSSProperties = {
  marginBottom: '20px'
};

const SELECTED_CARDS_CONTAINER_STYLE: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px',
  minHeight: '230px',
  alignItems: 'flex-start'
};

const EMPTY_CARDS_STYLE: CSSProperties = {
  color: '#6b7280',
  fontSize: '13px',
  padding: '40px 0'
};

const CARD_SCALE_STYLE: CSSProperties = {
  transform: 'scale(1.1)',
  transformOrigin: 'top left',
  width: '170px',
  height: '220px'
};

const CARD_ITEM_SCALE_STYLE: CSSProperties = {
  transform: 'scale(1.05)',
  transformOrigin: 'top left',
  width: '162px',
  height: '210px'
};

const CARD_HEADER_STYLE: CSSProperties = {
  display: 'flex',
  justifyContent: 'center'
};

const SCROLLABLE_CONTAINER_STYLE: CSSProperties = {
  overflowY: 'auto',
  flex: 1
};

const SPECIAL_BADGE_BASE_STYLE: CSSProperties = {
  position: 'absolute',
  top: '-4px',
  right: '-4px',
  padding: '2px 6px',
  borderRadius: '10px',
  fontSize: '11px',
  fontWeight: 700,
  zIndex: 10
};

const COST_BADGE_STROKE_STYLE: CSSProperties = {
  WebkitTextStroke: '1px #000'
};

const NO_OWNED_TEXT_STYLE: CSSProperties = {
  color: '#64748b',
  fontWeight: 'normal',
  marginLeft: '8px'
};

interface SelectedCardsProps {
  cards: string[];
  specialMode: 'main' | 'sub';
  onCardRemove: (cardId: string) => void;
}

/**
 * 선택된 카드 표시 컴포넌트
 */
const SelectedCards: FC<SelectedCardsProps> = memo(({ cards, specialMode, onCardRemove }) => {
  const isMainSpecial = specialMode === 'main';
  const borderColor = isMainSpecial ? '#f5d76e' : '#7dd3fc';

  const titleStyle = useMemo((): CSSProperties => ({
    fontSize: '14px',
    color: isMainSpecial ? '#f5d76e' : '#7dd3fc',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }), [isMainSpecial]);

  const cardStyle = useCallback((bColor: string): CSSProperties => ({
    cursor: 'pointer',
    boxShadow: `0 0 15px ${bColor}40`,
    border: `2px solid ${bColor}`
  }), []);

  const costBadgeStyle = useMemo((): CSSProperties => ({
    ...COST_BADGE_STROKE_STYLE,
    color: isMainSpecial ? '#fcd34d' : '#60a5fa'
  }), [isMainSpecial]);

  const nameStyle = useMemo((): CSSProperties => ({
    color: isMainSpecial ? '#fcd34d' : '#7dd3fc'
  }), [isMainSpecial]);

  return (
    <div style={SELECTED_SECTION_STYLE}>
      <h3 style={titleStyle}>
        {isMainSpecial ? '⭐ 선택된 주특기' : '💠 선택된 보조특기'}
        <span style={{ opacity: 0.7, fontWeight: 'normal' }}>
          ({cards.length}장)
        </span>
      </h3>
      <div style={SELECTED_CARDS_CONTAINER_STYLE}>
        {cards.map((cardId, idx) => {
          const card = (CARDS as Card[]).find(c => c.id === cardId);
          if (!card) return null;
          const Icon = card.type === 'attack' ? Sword : Shield;
          return (
            <div
              key={`selected-${cardId}-${idx}`}
              style={CARD_SCALE_STYLE}
            >
              <div
                onClick={() => onCardRemove(cardId)}
                className={`game-card-large no-hover ${card.type === 'attack' ? 'attack' : 'defense'}`}
                style={cardStyle(borderColor)}
                title="클릭하여 제거"
              >
                <div className="card-cost-badge-floating" style={costBadgeStyle}>
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
                <div className="card-header" style={CARD_HEADER_STYLE}>
                  <div className="font-black text-sm" style={nameStyle}>
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
          <span style={EMPTY_CARDS_STYLE}>선택된 카드가 없습니다</span>
        )}
      </div>
    </div>
  );
});

interface CardItemProps {
  card: Card;
  displayKey?: string;
  cardType?: string;
  onCardClick: (cardId: string, isRightClick: boolean) => void;
}

/**
 * 카드 아이템 컴포넌트
 */
const CardItem: FC<CardItemProps> = memo(({ card, displayKey, cardType, onCardClick }) => {
  const Icon = card.type === 'attack' ? Sword : Shield;
  const isMainSpecial = cardType === 'main';
  const isSubSpecial = cardType === 'sub';
  const isOwnedOnly = cardType === 'owned';

  const borderStyle = useMemo((): CSSProperties => {
    if (isMainSpecial) {
      return { border: '2px solid #f5d76e', boxShadow: '0 0 10px rgba(245, 215, 110, 0.4)' };
    } else if (isSubSpecial) {
      return { border: '2px solid #7dd3fc', boxShadow: '0 0 10px rgba(125, 211, 252, 0.4)' };
    } else if (isOwnedOnly) {
      return { border: '2px solid #64748b', boxShadow: '0 0 10px rgba(100, 116, 139, 0.4)' };
    }
    return {};
  }, [isMainSpecial, isSubSpecial, isOwnedOnly]);

  const cardContainerStyle = useMemo((): CSSProperties => ({
    cursor: 'pointer',
    ...borderStyle
  }), [borderStyle]);

  const costBadgeStyle = useMemo((): CSSProperties => ({
    ...COST_BADGE_STROKE_STYLE,
    color: isMainSpecial ? '#fcd34d' : isSubSpecial ? '#60a5fa' : isOwnedOnly ? '#94a3b8' : '#fff'
  }), [isMainSpecial, isSubSpecial, isOwnedOnly]);

  const badgeStyle = useMemo((): CSSProperties => ({
    ...SPECIAL_BADGE_BASE_STYLE,
    background: isMainSpecial ? '#f5d76e' : isSubSpecial ? '#7dd3fc' : '#64748b',
    color: isOwnedOnly ? '#fff' : '#000'
  }), [isMainSpecial, isSubSpecial, isOwnedOnly]);

  const nameStyle = useMemo((): CSSProperties => ({
    color: isMainSpecial ? '#fcd34d' : isSubSpecial ? '#7dd3fc' : isOwnedOnly ? '#94a3b8' : '#fff'
  }), [isMainSpecial, isSubSpecial, isOwnedOnly]);

  const handleClick = useCallback(() => {
    onCardClick(card.id, false);
  }, [card.id, onCardClick]);

  const handleContextMenu = useCallback((e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    onCardClick(card.id, true);
  }, [card.id, onCardClick]);

  return (
    <div
      key={displayKey || card.id}
      style={CARD_ITEM_SCALE_STYLE}
    >
      <div
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={`game-card-large no-hover ${card.type === 'attack' ? 'attack' : 'defense'}`}
        style={cardContainerStyle}
      >
        <div className="card-cost-badge-floating" style={costBadgeStyle}>
          {card.actionCost}
        </div>
        {(isMainSpecial || isSubSpecial || isOwnedOnly) && (
          <div style={badgeStyle}>
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
        <div className="card-header" style={CARD_HEADER_STYLE}>
          <div className="font-black text-sm" style={nameStyle}>
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
});

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
export const CardManagementModal: FC<CardManagementModalProps> = memo(({
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
  const getModeButtonStyle = useCallback((mode: 'main' | 'sub'): CSSProperties => ({
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
  }), [specialMode]);

  const selectedCards = specialMode === 'main' ? mainSpecials : subSpecials;

  const handleCardRemove = useCallback((cardId: string): void => {
    onCardClick(cardId, true);
  }, [onCardClick]);

  const handleOverlayClick = useCallback((e: MouseEvent<HTMLDivElement>): void => {
    e.stopPropagation();
  }, []);

  const handleSetMainMode = useCallback(() => setSpecialMode('main'), [setSpecialMode]);
  const handleSetSubMode = useCallback(() => setSpecialMode('sub'), [setSpecialMode]);

  const mainButtonStyle = useMemo(() => getModeButtonStyle('main'), [getModeButtonStyle]);
  const subButtonStyle = useMemo(() => getModeButtonStyle('sub'), [getModeButtonStyle]);

  return (
    <div style={OVERLAY_STYLE} onClick={onClose}>
      <div onClick={handleOverlayClick} style={MODAL_CONTAINER_STYLE}>
        <div style={HEADER_STYLE}>
          <h2 style={TITLE_STYLE}>🃏 카드 관리</h2>
          <button type="button" onClick={onClose} style={CLOSE_BUTTON_STYLE}>
            닫기
          </button>
        </div>

        {/* 슬롯 현황 */}
        <div style={SLOT_STATUS_STYLE}>
          <span style={SLOT_TEXT_STYLE}>
            주특기: <b style={{ color: '#f5d76e' }}>{mainSpecials.length} / {maxMainSlots}</b>
          </span>
          <span style={SLOT_TEXT_STYLE}>
            보조특기: <b style={{ color: '#7dd3fc' }}>{subSpecials.length} / {maxSubSlots}</b>
          </span>
        </div>

        {/* 모드 선택 버튼 */}
        <div style={MODE_BUTTONS_STYLE}>
          <button type="button" onClick={handleSetMainMode} style={mainButtonStyle}>
            ⭐ 주특기 선택 모드
          </button>
          <button type="button" onClick={handleSetSubMode} style={subButtonStyle}>
            💠 보조특기 선택 모드
          </button>
        </div>

        {/* 선택 안내 */}
        <div style={HINT_STYLE}>
          💡 좌클릭: 카드 추가 | 우클릭: 카드 제거
        </div>

        <div style={SCROLLABLE_CONTAINER_STYLE}>
          {/* 선택된 카드 */}
          <SelectedCards
            cards={selectedCards}
            specialMode={specialMode}
            onCardRemove={handleCardRemove}
          />

          {/* 카드 목록 */}
          <h3 style={CARDS_LIST_TITLE_STYLE}>
            📜 {showAllCards ? '전체 카드 목록' : '보유 카드 목록'}
            {!showAllCards && displayedCards.length === 0 && (
              <span style={NO_OWNED_TEXT_STYLE}>(보유 카드 없음)</span>
            )}
          </h3>
          <div style={CARDS_GRID_STYLE}>
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
});
