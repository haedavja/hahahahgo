/**
 * CardRewardModal.tsx
 *
 * 전투 승리 후 3장 중 1장을 선택해 덱에 추가하는 모달
 * 최적화: React.memo, useMemo, useCallback
 */

import { FC, memo, useMemo, useCallback, useEffect } from 'react';
import { Sword, Shield } from './BattleIcons';
import type { RewardCard as Card } from '../../../types';

/** 카드 타입에 따른 아이콘 반환 */
const getCardIcon = (card: Card) => card.icon || (card.type === 'attack' ? Sword : Shield);

interface CardRewardModalProps {
  rewardCards: Card[] | null;
  onSelect: (card: Card, idx: number) => void;
  onSkip: () => void;
}

export const CardRewardModal: FC<CardRewardModalProps> = memo(({
  rewardCards,
  onSelect,
  onSkip
}) => {
  // Escape 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSkip]);

  // 카드 아이콘 메모이제이션
  const cardIcons = useMemo(() => {
    if (!rewardCards) return [];
    return rewardCards.map(getCardIcon);
  }, [rewardCards]);

  // 클릭 핸들러 메모이제이션
  const handleCardClick = useCallback((card: Card, idx: number) => {
    onSelect(card, idx);
  }, [onSelect]);

  if (!rewardCards || rewardCards.length === 0) return null;

  return (
    <div
      className="reward-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reward-modal-title"
    >
      <div className="reward-modal">
        <div className="reward-modal-header">
          <h2 id="reward-modal-title">🎁 카드 보상</h2>
          <p>아래 3장 중 1장을 선택하여 덱에 추가하세요.</p>
        </div>

        <div className="reward-card-options" role="listbox" aria-label="카드 선택">
          {rewardCards.map((card, idx) => {
            const Icon = cardIcons[idx];
            const isAttack = card.type === 'attack';

            return (
              <div
                key={`reward-option-${idx}`}
                className={`reward-card-option ${isAttack ? 'attack' : 'defense'}`}
                onClick={() => handleCardClick(card, idx)}
                role="option"
                aria-label={`${card.name} - ${isAttack ? '공격' : '방어'} 카드`}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleCardClick(card, idx)}
              >
                <div className="reward-card-cost" aria-label={`행동력 ${card.actionCost}`}>{card.actionCost}</div>
                <div className="reward-card-name">{card.name}</div>
                <div className="reward-card-icon">
                  <Icon size={48} className="text-white" />
                </div>
                <div className="reward-card-stats">
                  {isAttack ? (
                    <span className="stat-damage">⚔️ {card.damage || 0}{card.hits && card.hits > 1 ? ` x${card.hits}` : ''}</span>
                  ) : (
                    <span className="stat-block">🛡️ {card.block || 0}</span>
                  )}
                  <span className="stat-speed">⏱️ {card.speedCost}</span>
                </div>
                <div className="reward-card-desc">{card.description}</div>
              </div>
            );
          })}
        </div>

        <div className="reward-skip-section">
          <button
            className="reward-skip-btn"
            onClick={onSkip}
            aria-label="카드 보상 건너뛰기"
          >
            건너뛰기
          </button>
        </div>
      </div>

      <style>{`
        .reward-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .reward-modal {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border: 2px solid #fbbf24;
          border-radius: 16px;
          padding: 24px;
          max-width: 800px;
          width: 90%;
          box-shadow: 0 0 40px rgba(251, 191, 36, 0.4);
        }

        .reward-modal-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .reward-modal-header h2 {
          color: #fbbf24;
          font-size: 1.5rem;
          margin: 0 0 8px 0;
        }

        .reward-modal-header p {
          color: #94a3b8;
          margin: 4px 0;
          font-size: 0.9rem;
        }

        .reward-card-options {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .reward-card-option {
          width: 200px;
          padding: 16px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .reward-card-option.attack {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(185, 28, 28, 0.3) 100%);
          border: 2px solid #ef4444;
        }

        .reward-card-option.defense {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(29, 78, 216, 0.3) 100%);
          border: 2px solid #3b82f6;
        }

        .reward-card-option:hover {
          transform: translateY(-8px) scale(1.05);
          box-shadow: 0 12px 30px rgba(251, 191, 36, 0.4);
        }

        .reward-card-option.attack:hover {
          border-color: #f87171;
          box-shadow: 0 12px 30px rgba(239, 68, 68, 0.4);
        }

        .reward-card-option.defense:hover {
          border-color: #60a5fa;
          box-shadow: 0 12px 30px rgba(59, 130, 246, 0.4);
        }

        .reward-card-cost {
          position: absolute;
          top: -8px;
          left: -8px;
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: #000;
          font-size: 1rem;
          box-shadow: 0 2px 8px rgba(251, 191, 36, 0.4);
        }

        .reward-card-name {
          font-weight: bold;
          color: #fff;
          font-size: 1.1rem;
          text-align: center;
        }

        .reward-card-icon {
          padding: 12px;
          opacity: 0.8;
        }

        .reward-card-stats {
          display: flex;
          gap: 12px;
          font-size: 0.9rem;
        }

        .stat-damage {
          color: #f87171;
        }

        .stat-block {
          color: #60a5fa;
        }

        .stat-speed {
          color: #fbbf24;
        }

        .reward-card-desc {
          font-size: 0.75rem;
          color: #94a3b8;
          text-align: center;
          line-height: 1.4;
        }

        .reward-skip-section {
          display: flex;
          justify-content: center;
          margin-top: 24px;
        }

        .reward-skip-btn {
          background: transparent;
          border: 1px solid #64748b;
          color: #94a3b8;
          padding: 8px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s ease;
        }

        .reward-skip-btn:hover {
          border-color: #94a3b8;
          color: #e2e8f0;
          background: rgba(100, 116, 139, 0.2);
        }
      `}</style>
    </div>
  );
});
