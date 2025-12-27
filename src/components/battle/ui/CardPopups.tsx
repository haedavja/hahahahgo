/**
 * CardPopups.tsx
 *
 * 카드 팝업 관련 컴포넌트들
 * - PopupCard: 팝업용 카드 컴포넌트 (호버 시 툴팁 표시)
 * - CardListPopup: 덱/무덤 카드 목록 팝업 컴포넌트
 */

import { useState, FC, MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '../../../state/gameStore';
import { TraitBadgeList } from './TraitBadge';
import { CardStatsSidebar } from './CardStatsSidebar';
import { Sword, Shield } from './BattleIcons';
import { TRAITS } from '../battleData';
import type { PopupCard as Card, CharacterBuild } from '../../../types';

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
export const PopupCard: FC<PopupCardProps> = ({ card, count, currentBuild }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const Icon = card.icon || (card.type === 'attack' ? Sword : Shield);
  // 카드 객체의 플래그를 사용 (같은 카드 타입이 주특기/보조특기에 각각 있을 때 구별)
  const isMainSpecial = card.__isMainSpecial;
  const isSubSpecial = card.__isSubSpecial;
  const costColor = isMainSpecial ? '#fcd34d' : isSubSpecial ? '#60a5fa' : '#fff';
  const nameColor = isMainSpecial ? '#fcd34d' : isSubSpecial ? '#7dd3fc' : '#fff';

  const handleMouseEnter = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.right + 12, y: rect.top });
    setShowTooltip(true);
  };

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* 카드를 pointerEvents: none으로 감싸서 CSS 호버 완전 차단 */}
      <div style={{ pointerEvents: 'none' }}>
        <div
          className={`game-card-large ${getCardTypeClass(card.type)}`}
          style={{ cursor: 'default' }}
        >
          <div className="card-cost-badge-floating" style={{ color: costColor, WebkitTextStroke: '1px #000' }}>
            {card.actionCost}
          </div>
          {count > 1 && (
            <div style={{
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
            }}>
              ×{count}
            </div>
          )}
          <CardStatsSidebar card={card} strengthBonus={0} formatSpeedText={(speed) => `${speed}`} />
          <div className="card-header" style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="font-black text-sm" style={{ display: 'flex', alignItems: 'center', color: nameColor }}>
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
        <div style={{
          position: 'fixed',
          left: tooltipPos.x,
          top: tooltipPos.y,
          background: '#1a1a2e',
          border: '2px solid #555',
          borderRadius: '8px',
          padding: '14px',
          minWidth: '240px',
          maxWidth: '320px',
          zIndex: 200000,
          pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.7)'
        }}>
          <div style={{ fontWeight: 'bold', color: '#fff', marginBottom: '10px', fontSize: '18px' }}>
            특성
          </div>
          {card.traits.map((traitId: any) => {
            const trait = (TRAITS as any)[traitId];
            if (!trait) return null;
            const isPositive = trait.type === 'positive';
            const color = isPositive ? '#22c55e' : '#ef4444';
            return (
              <div key={traitId} style={{ marginBottom: '10px' }}>
                <div style={{ fontWeight: 'bold', color, fontSize: '17px' }}>
                  {trait.name}
                </div>
                <div style={{ color: '#aaa', fontSize: '16px', lineHeight: '1.4' }}>
                  {trait.description}
                </div>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
};

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
export const CardListPopup: FC<CardListPopupProps> = ({ title, cards, onClose, icon, bgGradient }) => {
  const currentBuild = useGameStore.getState().characterBuild;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        pointerEvents: 'auto'
      }}
      onClick={onClose}
    >
      <div
        style={{
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
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #333'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#fff'
          }}>
            <span>{icon}</span>
            <span>{title}</span>
            <span style={{
              background: bgGradient,
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '14px'
            }}>{cards.length}장</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#333',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '20px',
              padding: '8px 12px',
              borderRadius: '8px',
              pointerEvents: 'auto'
            }}
          >✕</button>
        </div>

        {cards.length === 0 ? (
          <div style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
            카드가 없습니다
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            justifyContent: 'center'
          }}>
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
};
