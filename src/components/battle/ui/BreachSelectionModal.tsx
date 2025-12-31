/**
 * BreachSelectionModal.tsx
 *
 * 브리치 카드 발동 시 3장 중 1장을 선택하는 모달
 * 최적화: React.memo + useMemo
 */

import { FC, memo, useMemo, useCallback } from 'react';
import { Sword, Shield } from './BattleIcons';
import type { BreachCard as Card, BreachSelection } from '../../../types';

interface BreachSelectionModalProps {
  breachSelection: BreachSelection | null;
  onSelect: (card: Card, idx: number) => void;
  strengthBonus?: number;
}

export const BreachSelectionModal: FC<BreachSelectionModalProps> = memo(({
  breachSelection,
  onSelect,
  strengthBonus = 0
}) => {
  // 텍스트 콘텐츠 메모이제이션
  const { title, desc, note, insertSp } = useMemo(() => {
    if (!breachSelection) return { title: '', desc: '', note: '', insertSp: 0 };

    const { cards, breachSp, breachCard, sourceCardName, isLastChain } = breachSelection;
    const sp = breachSp + (breachCard?.breachSpOffset || 3);
    const isFleche = sourceCardName && sourceCardName !== '브리치';

    return {
      insertSp: sp,
      title: isFleche ? `⚔️ ${sourceCardName} - 카드 선택` : '👻 브리치 - 카드 선택',
      desc: isFleche
        ? `피해 성공! ${cards.length}장 중 1장을 선택하세요. 선택한 카드는 타임라인 ${sp} 위치에 유령카드로 삽입됩니다.`
        : `아래 3장 중 1장을 선택하세요. 선택한 카드는 타임라인 ${sp} 위치에 유령카드로 삽입됩니다.`,
      note: isFleche
        ? isLastChain
          ? '⚠️ 마지막 연쇄! 이번 카드가 피해를 입혀도 더 이상 창조되지 않습니다.'
          : '💨 유령카드로 즉시 발동! 피해 성공 시 다시 창조됩니다.'
        : '💨 유령카드: 힘 보너스만 적용, 콤보/아이템/상징 효과 미적용'
    };
  }, [breachSelection]);

  if (!breachSelection) return null;

  return (
    <div className="breach-modal-overlay">
      <div className="breach-modal">
        <div className="breach-modal-header">
          <h2>{title}</h2>
          <p>{desc}</p>
          <p className="breach-ghost-note">{note}</p>
        </div>

        <div className="breach-card-options">
          {cards.map((card, idx) => {
            const Icon = card.icon || (card.type === 'attack' ? Sword : Shield);
            const isAttack = card.type === 'attack';
            const displayDamage = isAttack ? (card.damage || 0) + strengthBonus : 0;
            const displayBlock = !isAttack ? (card.block || 0) + strengthBonus : 0;

            return (
              <div
                key={`breach-option-${idx}`}
                className={`breach-card-option ${isAttack ? 'attack' : 'defense'}`}
                onClick={() => onSelect(card, idx)}
              >
                <div className="breach-card-cost">{card.actionCost}</div>
                <div className="breach-card-name">{card.name}</div>
                <div className="breach-card-icon">
                  <Icon size={48} className="text-white" />
                </div>
                <div className="breach-card-stats">
                  {isAttack ? (
                    <span className="stat-damage">⚔️ {displayDamage}{card.hits && card.hits > 1 ? ` x${card.hits}` : ''}</span>
                  ) : (
                    <span className="stat-block">🛡️ {displayBlock}</span>
                  )}
                  <span className="stat-speed">⏱️ {card.speedCost}</span>
                </div>
                <div className="breach-card-desc">{card.description}</div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .breach-modal-overlay {
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
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .breach-modal {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border: 2px solid #8b5cf6;
          border-radius: 16px;
          padding: 24px;
          max-width: 800px;
          width: 90%;
          box-shadow: 0 0 40px rgba(139, 92, 246, 0.4);
        }

        .breach-modal-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .breach-modal-header h2 {
          color: #a78bfa;
          font-size: 1.5rem;
          margin: 0 0 8px 0;
        }

        .breach-modal-header p {
          color: #94a3b8;
          margin: 4px 0;
          font-size: 0.9rem;
        }

        .breach-ghost-note {
          color: #60a5fa !important;
          font-size: 0.8rem !important;
          background: rgba(96, 165, 250, 0.1);
          padding: 8px 12px;
          border-radius: 8px;
          margin-top: 12px !important;
        }

        .breach-card-options {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .breach-card-option {
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

        .breach-card-option.attack {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(185, 28, 28, 0.3) 100%);
          border: 2px solid #ef4444;
        }

        .breach-card-option.defense {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(29, 78, 216, 0.3) 100%);
          border: 2px solid #3b82f6;
        }

        .breach-card-option:hover {
          transform: translateY(-8px) scale(1.05);
          box-shadow: 0 12px 30px rgba(139, 92, 246, 0.4);
        }

        .breach-card-option.attack:hover {
          border-color: #f87171;
          box-shadow: 0 12px 30px rgba(239, 68, 68, 0.4);
        }

        .breach-card-option.defense:hover {
          border-color: #60a5fa;
          box-shadow: 0 12px 30px rgba(59, 130, 246, 0.4);
        }

        .breach-card-cost {
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

        .breach-card-name {
          font-weight: bold;
          color: #fff;
          font-size: 1.1rem;
          text-align: center;
        }

        .breach-card-icon {
          padding: 12px;
          opacity: 0.8;
        }

        .breach-card-stats {
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

        .breach-card-desc {
          font-size: 0.75rem;
          color: #94a3b8;
          text-align: center;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
});
