/**
 * RecallSelectionModal.tsx
 *
 * 함성 (recallCard) 카드 선택 모달
 * 다음 턴에 가져올 카드를 선택하는 UI
 * 최적화: React.memo + 스타일 상수 추출 + useCallback
 */

import { FC, MouseEvent, memo, useCallback } from 'react';
import type { CSSProperties } from 'react';
import type { RecallCard as Card, RecallSelection } from '../../../types';

// =====================
// 스타일 상수
// =====================

const OVERLAY_STYLE: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.85)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10000
};

const MODAL_CONTAINER_STYLE: CSSProperties = {
  background: 'rgba(8, 11, 19, 0.98)',
  border: '2px solid #fbbf24',
  borderRadius: '16px',
  padding: '24px',
  maxWidth: '800px',
  maxHeight: '80vh',
  overflow: 'auto'
};

const TITLE_STYLE: CSSProperties = {
  color: '#fbbf24',
  marginBottom: '16px',
  textAlign: 'center'
};

const DESC_STYLE: CSSProperties = {
  color: '#9fb6ff',
  marginBottom: '20px',
  textAlign: 'center'
};

const CARDS_CONTAINER_STYLE: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px',
  justifyContent: 'center',
  marginBottom: '20px'
};

const CARD_BASE_STYLE: CSSProperties = {
  cursor: 'pointer',
  width: '140px',
  height: '180px',
  transition: 'transform 0.2s, box-shadow 0.2s'
};

const CARD_HEADER_STYLE: CSSProperties = {
  textAlign: 'center'
};

const BUTTON_CONTAINER_STYLE: CSSProperties = {
  textAlign: 'center'
};

const SKIP_BUTTON_STYLE: CSSProperties = {
  padding: '10px 24px',
  fontSize: '14px',
  borderRadius: '8px',
  border: '1px solid rgba(118, 134, 185, 0.5)',
  background: 'rgba(8, 11, 19, 0.95)',
  color: '#9fb6ff',
  cursor: 'pointer'
};

interface RecallSelectionModalProps {
  recallSelection: RecallSelection | null;
  onSelect: (card: Card) => void;
  onSkip: () => void;
}

export const RecallSelectionModal: FC<RecallSelectionModalProps> = memo(({ recallSelection, onSelect, onSkip }) => {
  // 호버 핸들러 메모이제이션
  const handleMouseEnter = useCallback((e: MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'scale(1.05)';
    e.currentTarget.style.boxShadow = '0 0 20px rgba(251, 191, 36, 0.6)';
  }, []);

  const handleMouseLeave = useCallback((e: MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.boxShadow = 'none';
  }, []);

  if (!recallSelection) return null;

  return (
    <div className="modal-overlay" style={OVERLAY_STYLE}>
      <div style={MODAL_CONTAINER_STYLE}>
        <h2 style={TITLE_STYLE}>
          📢 함성 - 다음 턴에 가져올 카드 선택
        </h2>
        <p style={DESC_STYLE}>
          대기 카드 중 1장을 선택하면 다음 턴에 확정으로 손패에 등장합니다.
        </p>
        <div style={CARDS_CONTAINER_STYLE}>
          {recallSelection.availableCards.map((card, idx) => (
            <div
              key={`recall-${card.id}-${idx}`}
              onClick={() => onSelect(card)}
              className={`game-card-large no-hover ${card.type === 'attack' ? 'attack' : 'defense'}`}
              style={CARD_BASE_STYLE}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className="card-cost-badge-floating">{card.actionCost}</div>
              <div className="card-stats-sidebar">
                {(card.damage ?? 0) > 0 && <div className="card-stat-item attack">⚔️{card.damage}</div>}
                {(card.block ?? 0) > 0 && <div className="card-stat-item defense">🛡️{card.block}</div>}
                <div className="card-stat-item speed">⏱️{card.speedCost}</div>
              </div>
              <div className="card-header" style={CARD_HEADER_STYLE}>
                <div className="font-black text-sm">{card.name}</div>
              </div>
              <div className="card-footer">
                <span className="card-description">{card.description || ''}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={BUTTON_CONTAINER_STYLE}>
          <button onClick={onSkip} style={SKIP_BUTTON_STYLE}>
            건너뛰기
          </button>
        </div>
      </div>
    </div>
  );
});
