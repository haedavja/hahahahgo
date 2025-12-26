/**
 * RecallSelectionModal.tsx
 *
 * 함성 (recallCard) 카드 선택 모달
 * 다음 턴에 가져올 카드를 선택하는 UI
 */

import { FC } from 'react';
import type { RecallCard as Card, RecallSelection } from '../../../types';

interface RecallSelectionModalProps {
  recallSelection: RecallSelection | null;
  onSelect: (card: Card) => void;
  onSkip: () => void;
}

export const RecallSelectionModal: FC<RecallSelectionModalProps> = ({ recallSelection, onSelect, onSkip }) => {
  if (!recallSelection) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
    }}>
      <div style={{
        background: 'rgba(8, 11, 19, 0.98)',
        border: '2px solid #fbbf24',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '800px',
        maxHeight: '80vh',
        overflow: 'auto',
      }}>
        <h2 style={{ color: '#fbbf24', marginBottom: '16px', textAlign: 'center' }}>
          📢 함성 - 다음 턴에 가져올 카드 선택
        </h2>
        <p style={{ color: '#9fb6ff', marginBottom: '20px', textAlign: 'center' }}>
          대기 카드 중 1장을 선택하면 다음 턴에 확정으로 손패에 등장합니다.
        </p>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: 'center',
          marginBottom: '20px',
        }}>
          {recallSelection.availableCards.map((card, idx) => (
            <div
              key={`recall-${card.id}-${idx}`}
              onClick={() => onSelect(card)}
              className={`game-card-large no-hover ${card.type === 'attack' ? 'attack' : 'defense'}`}
              style={{
                cursor: 'pointer',
                width: '140px',
                height: '180px',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e: MouseEvent<HTMLDivElement>) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.05)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 20px rgba(251, 191, 36, 0.6)';
              }}
              onMouseLeave={(e: MouseEvent<HTMLDivElement>) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              <div className="card-cost-badge-floating">{card.actionCost}</div>
              <div className="card-stats-sidebar">
                {(card.damage ?? 0) > 0 && <div className="card-stat-item attack">⚔️{card.damage}</div>}
                {(card.block ?? 0) > 0 && <div className="card-stat-item defense">🛡️{card.block}</div>}
                <div className="card-stat-item speed">⏱️{card.speedCost}</div>
              </div>
              <div className="card-header" style={{ textAlign: 'center' }}>
                <div className="font-black text-sm">{card.name}</div>
              </div>
              <div className="card-footer">
                <span className="card-description">{card.description || ''}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onSkip}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              borderRadius: '8px',
              border: '1px solid rgba(118, 134, 185, 0.5)',
              background: 'rgba(8, 11, 19, 0.95)',
              color: '#9fb6ff',
              cursor: 'pointer',
            }}
          >
            건너뛰기
          </button>
        </div>
      </div>
    </div>
  );
};
