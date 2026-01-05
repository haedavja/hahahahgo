/**
 * CardPopups.tsx
 *
 * 카드 팝업 관련 컴포넌트들
 * - PopupCard: 팝업용 카드 컴포넌트 (호버 시 툴팁 표시)
 * - CardListPopup: 덱/무덤 카드 목록 팝업 컴포넌트
 * 최적화: React.memo + 스타일 상수 추출 + useCallback
 */

import { useState, FC, MouseEvent, memo, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '../../../state/gameStore';
import { TraitBadgeList } from './TraitBadge';
import { CardStatsSidebar } from './CardStatsSidebar';
import { Sword, Shield } from './BattleIcons';
import { TRAITS } from '../battleData';
import type { PopupCard as Card, CharacterBuild } from '../../../types';
import { Z_INDEX } from './constants/layout';

// =====================
// 스타일 상수
// =====================

const CARD_WRAPPER_STYLE: CSSProperties = {
  position: 'relative'
};

const POINTER_NONE_STYLE: CSSProperties = {
  pointerEvents: 'none'
};

// 단순 변환 함수 - 모듈 레벨에서 정의하여 불필요한 useCallback 제거
const formatSpeedText = (speed: number): string => `${speed}`;

const COUNT_BADGE_STYLE: CSSProperties = {
  position: 'absolute',
  top: '-8px',
  right: '-8px',
  background: '#ef4444',
  color: '#fff',
  borderRadius: '50%',
  width: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '12px',
  fontWeight: 'bold',
  zIndex: 10
};

const CARD_HEADER_STYLE: CSSProperties = {
  display: 'flex',
  justifyContent: 'center'
};

const CARD_NAME_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center'
};

const TOOLTIP_STYLE: CSSProperties = {
  position: 'fixed',
  background: '#1a1a2e',
  border: '2px solid #555',
  borderRadius: '8px',
  padding: '14px',
  minWidth: '240px',
  maxWidth: '320px',
  zIndex: Z_INDEX.POPUP_CRITICAL + 100000, // 카드 툴팁은 항상 최상위
  pointerEvents: 'none',
  boxShadow: '0 4px 16px rgba(0,0,0,0.7)'
};

const TOOLTIP_TITLE_STYLE: CSSProperties = {
  fontWeight: 'bold',
  color: '#fff',
  marginBottom: '10px',
  fontSize: '18px'
};

const OVERLAY_STYLE: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.95)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: Z_INDEX.POPUP_CRITICAL,
  pointerEvents: 'auto'
};

const POPUP_CONTAINER_STYLE: CSSProperties = {
  background: '#1a1a2e',
  borderRadius: '16px',
  padding: '20px',
  minWidth: '320px',
  maxWidth: '90vw',
  maxHeight: '85vh',
  overflow: 'auto',
  border: '2px solid #444',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 1)',
  pointerEvents: 'auto'
};

const POPUP_HEADER_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '16px',
  paddingBottom: '12px',
  borderBottom: '1px solid #333'
};

const POPUP_TITLE_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#fff'
};

const CLOSE_BUTTON_STYLE: CSSProperties = {
  background: '#333',
  border: 'none',
  color: '#fff',
  cursor: 'pointer',
  fontSize: '20px',
  padding: '8px 12px',
  borderRadius: '8px',
  pointerEvents: 'auto'
};

const EMPTY_MESSAGE_STYLE: CSSProperties = {
  color: '#666',
  textAlign: 'center',
  padding: '20px'
};

const CARD_GRID_STYLE: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px',
  justifyContent: 'center'
};

// 카드 타입에 따른 CSS 클래스 반환 (공격/범용/특수)
const getCardTypeClass = (type: string): string => {
  if (type === 'attack') return 'attack';
  if (type === 'special') return 'special';
  return 'general';
};

interface PopupCardProps {
  card: Card;
  count: number;
  currentBuild?: CharacterBuild;
}

/**
 * 팝업용 카드 컴포넌트 (호버 시 툴팁 표시)
 */
export const PopupCard: FC<PopupCardProps> = memo(({ card, count, currentBuild }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // 아이콘 메모이제이션
  const Icon = useMemo(() => card.icon || (card.type === 'attack' ? Sword : Shield), [card.icon, card.type]);

  // 색상 계산 메모이제이션
  const { costColor, nameColor } = useMemo(() => {
    const isMainSpecial = card.__isMainSpecial;
    const isSubSpecial = card.__isSubSpecial;
    return {
      costColor: isMainSpecial ? '#fcd34d' : isSubSpecial ? '#60a5fa' : '#fff',
      nameColor: isMainSpecial ? '#fcd34d' : isSubSpecial ? '#7dd3fc' : '#fff'
    };
  }, [card.__isMainSpecial, card.__isSubSpecial]);

  const handleMouseEnter = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.right + 12, y: rect.top });
    setShowTooltip(true);
  }, []);

  const handleMouseLeave = useCallback(() => setShowTooltip(false), []);

  // 툴팁 스타일 메모이제이션
  const tooltipStyle = useMemo((): CSSProperties => ({
    ...TOOLTIP_STYLE,
    left: tooltipPos.x,
    top: tooltipPos.y
  }), [tooltipPos.x, tooltipPos.y]);

  // 특성 목록 렌더링 메모이제이션
  const traitElements = useMemo(() => {
    if (!card.traits || card.traits.length === 0) return null;
    return card.traits.map((traitId: string) => {
      const trait = TRAITS[traitId as keyof typeof TRAITS];
      if (!trait) return null;
      const isPositive = trait.type === 'positive';
      const color = isPositive ? '#22c55e' : '#ef4444';
      return (
        <div key={traitId} style={{ marginBottom: '10px' }}>
          <div style={{ fontWeight: 'bold', color, fontSize: '17px' }}>
            {trait.name}
          </div>
          <div style={{ color: '#aaa', fontSize: '16px', lineHeight: 1.4 }}>
            {trait.description}
          </div>
        </div>
      );
    });
  }, [card.traits]);

  return (
    <div
      style={CARD_WRAPPER_STYLE}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 카드를 pointerEvents: none으로 감싸서 CSS 호버 완전 차단 */}
      <div style={POINTER_NONE_STYLE}>
        <div
          className={`game-card-large ${getCardTypeClass(card.type)}`}
          style={{ cursor: 'default' }}
        >
          <div className="card-cost-badge-floating" style={{ color: costColor, WebkitTextStroke: '1px #000' }}>
            {card.actionCost}
          </div>
          {count > 1 && (
            <div style={COUNT_BADGE_STYLE}>
              ×{count}
            </div>
          )}
          <CardStatsSidebar card={card} strengthBonus={0} formatSpeedText={formatSpeedText} />
          <div className="card-header" style={CARD_HEADER_STYLE}>
            <div className="font-black text-sm" style={{ ...CARD_NAME_STYLE, color: nameColor }}>
              {card.name}
            </div>
          </div>
          <div className="card-icon-area">
            <Icon size={60} className="text-white opacity-80" />
          </div>
          <div className="card-footer">
            {card.traits && card.traits.length > 0 ? <TraitBadgeList traits={card.traits} /> : null}
            <span className="card-description">{card.description || ''}</span>
          </div>
        </div>
      </div>

      {/* 특성 툴팁 - Portal로 body에 렌더링하여 잘림 방지 */}
      {showTooltip && card.traits && card.traits.length > 0 && createPortal(
        <div style={tooltipStyle}>
          <div style={TOOLTIP_TITLE_STYLE}>
            특성
          </div>
          {traitElements}
        </div>,
        document.body
      )}
    </div>
  );
});

interface CardListPopupProps {
  title: string;
  cards: Card[];
  onClose: () => void;
  icon: string;
  bgGradient: string;
}

/**
 * 덱/무덤 카드 목록 팝업 컴포넌트
 */
export const CardListPopup: FC<CardListPopupProps> = memo(({ title, cards, onClose, icon, bgGradient }) => {
  const currentBuild = useGameStore.getState().characterBuild;

  // 카운트 배지 스타일 메모이제이션
  const countBadgeStyle = useMemo((): CSSProperties => ({
    background: bgGradient,
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '14px'
  }), [bgGradient]);

  // 팝업 내부 클릭 핸들러
  const handleInnerClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  }, []);

  return (
    <div style={OVERLAY_STYLE} onClick={onClose}>
      <div style={POPUP_CONTAINER_STYLE} onClick={handleInnerClick}>
        <div style={POPUP_HEADER_STYLE}>
          <div style={POPUP_TITLE_STYLE}>
            <span>{icon}</span>
            <span>{title}</span>
            <span style={countBadgeStyle}>{cards.length}장</span>
          </div>
          <button onClick={onClose} style={CLOSE_BUTTON_STYLE}>✕</button>
        </div>

        {cards.length === 0 ? (
          <div style={EMPTY_MESSAGE_STYLE}>
            카드가 없습니다
          </div>
        ) : (
          <div style={CARD_GRID_STYLE}>
            {cards.map((card, idx) => (
              <PopupCard
                key={card.id + idx + (card.__uid || '')}
                card={card}
                count={1}
                currentBuild={currentBuild}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
