/**
 * HandArea.tsx
 *
 * 하단 고정 손패 영역 컴포넌트
 */

import { FC, useState, MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '../../../state/gameStore';
import { hasTrait, applyTraitModifiers } from '../utils/battleUtils';
import { detectPokerCombo } from '../utils/comboDetection';
import { TraitBadgeList } from './TraitBadge';
import { CardStatsSidebar } from './CardStatsSidebar';
import { Sword, Shield } from './BattleIcons';
import { TRAITS } from '../battleData';
import { CardListPopup } from './CardPopups';
import type {
  IconProps,
  HandCardTrait as Trait,
  HandUnit as Unit,
  HandBattle as Battle,
  HandPlayer as Player,
  HandEnemy as Enemy,
  HandAction as Action,
  ComboCalculation
} from '../../../types';
import type { FC as IconFC } from 'react';

// 손패 카드 타입 (확장 속성 포함)
interface Card {
  id: string;
  name: string;
  type: string;
  actionCost: number;
  speedCost: number;
  damage?: number;
  block?: number;
  description?: string;
  traits?: string[];
  icon?: IconFC<IconProps>;
  __handUid?: string;
  __uid?: string;
  __isMainSpecial?: boolean;
  __isSubSpecial?: boolean;
  __targetUnitId?: number;
  [key: string]: unknown;
}

// X 아이콘 SVG 컴포넌트
const X: FC<IconProps> = ({ size = 24, className = "", strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// 카드 타입에 따른 CSS 클래스 반환 (공격/범용/특수)
const getCardTypeClass = (type: string): string => {
  if (type === 'attack') return 'attack';
  if (type === 'special') return 'special';
  return 'general'; // 기본값은 범용(general)
};

interface HandAreaProps {
  battle: Battle;
  player: Player | null;
  enemy: Enemy | null;
  selected: Card[];
  getSortedHand: () => Card[];
  toggle: (card: Card) => void;
  handDisabled: (card: Card) => boolean;
  showCardTraitTooltip: (card: Card, element: Element | null) => void;
  hideCardTraitTooltip: () => void;
  formatSpeedText: (speed: number) => string;
  renderNameWithBadge: (card: Card, color: string) => React.ReactNode;
  fixedOrder?: Action[];
  moveUp?: (idx: number) => void;
  moveDown?: (idx: number) => void;
  queue?: Action[];
  usedCardIndices?: number[];
  disappearingCards?: number[];
  hiddenCards?: number[];
  disabledCardIndices?: number[];
  isSimplified?: boolean;
  deck?: Card[];
  discardPile?: Card[];
  enemyUnits?: Unit[];
}

export const HandArea: FC<HandAreaProps> = ({
  battle,
  player,
  enemy,
  selected,
  getSortedHand,
  toggle,
  handDisabled,
  showCardTraitTooltip,
  hideCardTraitTooltip,
  formatSpeedText,
  renderNameWithBadge,
  fixedOrder,
  moveUp,
  moveDown,
  queue,
  usedCardIndices,
  disappearingCards,
  hiddenCards,
  disabledCardIndices,
  isSimplified,
  deck = [],
  discardPile = [],
  enemyUnits = []
}) => {
  // 타겟 유닛 정보 가져오기 헬퍼
  const getTargetUnit = (targetUnitId: number | undefined): Unit | null => {
    if (targetUnitId === undefined && targetUnitId !== 0) return null;
    return enemyUnits.find((u) => u.unitId === targetUnitId) || null;
  };
  const [showDeckPopup, setShowDeckPopup] = useState(false);
  const [showDiscardPopup, setShowDiscardPopup] = useState(false);

  const deckCount = deck.length;
  const discardCount = discardPile.length;

  if (!(battle.phase === 'select' || battle.phase === 'respond' || battle.phase === 'resolve' || (enemy && enemy.hp <= 0) || (player && player.hp <= 0))) {
    return null;
  }

  return (
    <div className="hand-area">
      <div className="hand-flags">
        {player && player.hp <= 0 && (
          <div className="hand-flag defeat">💀 패배...</div>
        )}
      </div>

      {/* 덱/무덤 팝업 - Portal로 body에 렌더링 */}
      {showDeckPopup && createPortal(
        <CardListPopup
          title="남은 덱"
          cards={deck}
          onClose={() => setShowDeckPopup(false)}
          icon="🎴"
          bgGradient="linear-gradient(135deg, #3b82f6, #1d4ed8)"
        />,
        document.body
      )}
      {showDiscardPopup && createPortal(
        <CardListPopup
          title="무덤"
          cards={discardPile}
          onClose={() => setShowDiscardPopup(false)}
          icon="🪦"
          bgGradient="linear-gradient(135deg, #6b7280, #374151)"
        />,
        document.body
      )}

      {/* 덱 카운터 - 행동력 구슬 아래 (항상 표시) */}
      <div
        onClick={() => setShowDeckPopup(true)}
        style={{
          position: 'fixed',
          left: '120px',
          bottom: '100px',
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          padding: '8px 14px',
          borderRadius: '10px',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 2px 12px rgba(59, 130, 246, 0.5)',
          cursor: 'pointer',
          transition: 'transform 0.1s, box-shadow 0.1s',
          fontSize: '14px',
          fontWeight: 'bold',
          zIndex: 1000,
          pointerEvents: 'auto'
        }}
        onMouseEnter={(e: MouseEvent<HTMLDivElement>) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.08)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.7)';
        }}
        onMouseLeave={(e: MouseEvent<HTMLDivElement>) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(59, 130, 246, 0.5)';
        }}
      >
        <span>🎴</span>
        <span>덱: {deckCount}</span>
      </div>

      {/* 무덤 카운터 - 오른쪽 하단 (항상 표시) */}
      <div
        onClick={() => setShowDiscardPopup(true)}
        style={{
          position: 'fixed',
          right: '20px',
          bottom: '20px',
          background: 'linear-gradient(135deg, #6b7280, #374151)',
          padding: '8px 14px',
          borderRadius: '10px',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 2px 12px rgba(107, 114, 128, 0.5)',
          cursor: 'pointer',
          transition: 'transform 0.1s, box-shadow 0.1s',
          fontSize: '14px',
          fontWeight: 'bold',
          zIndex: 1000,
          pointerEvents: 'auto'
        }}
        onMouseEnter={(e: MouseEvent<HTMLDivElement>) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.08)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(107, 114, 128, 0.7)';
        }}
        onMouseLeave={(e: MouseEvent<HTMLDivElement>) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(107, 114, 128, 0.5)';
        }}
      >
        <span>🪦</span>
        <span>무덤: {discardCount}</span>
      </div>

      {battle.phase === 'select' && (() => {
        // 현재 선택된 카드들의 조합 감지
        const currentCombo = detectPokerCombo(selected) as ComboCalculation | null;
        const comboCardCosts = new Set<number>();
        if (currentCombo?.bonusKeys) {
          currentCombo.bonusKeys.forEach((cost: number) => comboCardCosts.add(cost));
        }
        // 플러쉬는 모든 카드가 조합 대상
        const isFlush = currentCombo?.name === '플러쉬';

        return (
          <div className="hand-cards">
            {getSortedHand().map((c, idx) => {
              const Icon = c.icon || (c.type === 'attack' ? Sword : Shield);
              const usageCount = player?.comboUsageCount?.[c.id] || 0;
              // __handUid로 개별 카드 식별 (중복 카드 구별)
              const cardUid = c.__handUid || c.__uid;
              const selIndex = selected.findIndex((s) => (s.__handUid || s.__uid) === cardUid);
              const sel = selIndex !== -1;
              // 카드가 조합에 포함되는지 확인
              const isInCombo = sel && (isFlush || comboCardCosts.has(c.actionCost));
              const enhancedCard = applyTraitModifiers(c, { usageCount, isInCombo });
              const disabled = handDisabled(c) && !sel;
              // 카드 객체의 플래그를 사용 (같은 카드 타입이 주특기/보조특기에 각각 있을 때 구별)
              const isMainSpecial = c.__isMainSpecial;
              const isSubSpecial = c.__isSubSpecial;
              const costColor = isMainSpecial ? '#fcd34d' : isSubSpecial ? '#60a5fa' : '#fff';
              const nameColor = isMainSpecial ? '#fcd34d' : isSubSpecial ? '#7dd3fc' : '#fff';
              // 협동 특성이 있고 조합에 포함된 경우
              const hasCooperation = hasTrait(c, 'cooperation');
              const cooperationActive = hasCooperation && isInCombo;
              // 공격 카드의 타겟 유닛 정보
              const selectedCard = sel ? selected[selIndex] : null;
              const targetUnit = selectedCard?.__targetUnitId != null ? getTargetUnit(selectedCard.__targetUnitId) : null;
              return (
                <div
                  key={c.id + idx}
                  onClick={() => !disabled && toggle(enhancedCard)}
                  onMouseEnter={(e: MouseEvent<HTMLDivElement>) => {
                    const cardEl = e.currentTarget.querySelector('.game-card-large');
                    showCardTraitTooltip(c, cardEl);
                  }}
                  onMouseLeave={hideCardTraitTooltip}
                  style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative', marginLeft: idx === 0 ? '0' : '-20px' }}
                >
                  <div
                    className={`game-card-large select-phase-card ${getCardTypeClass(c.type)} ${sel ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                    style={cooperationActive ? {
                      boxShadow: '0 0 20px 4px rgba(34, 197, 94, 0.8), 0 0 40px 8px rgba(34, 197, 94, 0.4)',
                      border: '3px solid #22c55e'
                    } : {}}
                  >
                    <div className="card-cost-badge-floating" style={{ color: costColor, WebkitTextStroke: '1px #000' }}>{enhancedCard.actionCost || c.actionCost}</div>
                    {sel && <div className="selection-number">{selIndex + 1}</div>}
                    {/* 타겟 유닛 표시 (다중 적 유닛일 때 공격 카드) */}
                    {sel && targetUnit && (
                      <div style={{
                        position: 'absolute',
                        bottom: '-8px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                        color: '#fff',
                        borderRadius: '8px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        zIndex: 15,
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
                        border: '1px solid #fca5a5',
                        whiteSpace: 'nowrap',
                      }}>
                        <span>{targetUnit.emoji || '👾'}</span>
                        <span>🎯</span>
                      </div>
                    )}
                    <CardStatsSidebar card={enhancedCard} strengthBonus={player?.strength || 0} formatSpeedText={formatSpeedText} />
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'center' }}>
                      <div className="font-black text-sm" style={{ display: 'flex', alignItems: 'center' }}>
                        {renderNameWithBadge(c, nameColor)}
                      </div>
                    </div>
                    <div className="card-icon-area">
                      <Icon size={60} className="text-white opacity-80" />
                      {disabled && (
                        <div className="card-disabled-overlay">
                          <X size={80} className="text-red-500" strokeWidth={4} />
                        </div>
                      )}
                    </div>
                    <div className={`card-footer ${isSimplified ? 'simplified-footer' : ''}`}>
                      {c.traits && c.traits.length > 0 ? <TraitBadgeList traits={c.traits} /> : null}
                      <span className="card-description">{c.description || ''}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {battle.phase === 'respond' && fixedOrder && (
        <div className="hand-cards" style={{ justifyContent: 'center' }}>
          {fixedOrder.filter(a => a.actor === 'player').map((action, idx, arr) => {
            const c = action.card as unknown as Card;
            const Icon = c.icon || (c.type === 'attack' ? Sword : Shield);
            // 카드 객체의 플래그를 사용 (같은 카드 타입이 주특기/보조특기에 각각 있을 때 구별)
            const isMainSpecial = c.__isMainSpecial;
            const isSubSpecial = c.__isSubSpecial;
            const costColor = isMainSpecial ? '#fcd34d' : isSubSpecial ? '#60a5fa' : '#fff';
            const nameColor = isMainSpecial ? '#fcd34d' : isSubSpecial ? '#7dd3fc' : '#fff';
            // 타겟 유닛 정보
            const targetUnit = c.__targetUnitId != null ? getTargetUnit(c.__targetUnitId) : null;
            return (
              <div
                key={idx}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  const cardEl = e.currentTarget.querySelector('.game-card-large');
                  showCardTraitTooltip(c, cardEl);
                }}
                onMouseLeave={hideCardTraitTooltip}
                style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', position: 'relative', marginLeft: idx === 0 ? '0' : '8px' }}
              >
                <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#3b82f6', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', zIndex: 10, border: '2px solid #1e40af' }}>
                  {idx + 1}
                </div>
                {/* 타겟 유닛 표시 */}
                {targetUnit && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '-8px',
                    background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '2px 6px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    zIndex: 15,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
                    border: '1px solid #fca5a5',
                  }}>
                    <span>{targetUnit.emoji || '👾'}</span>
                    <span>🎯</span>
                  </div>
                )}
                <div className={`game-card-large respond-phase-card ${getCardTypeClass(c.type)}`}>
                  <div className="card-cost-badge-floating" style={{ color: costColor, WebkitTextStroke: '1px #000' }}>{c.actionCost}</div>
                  <CardStatsSidebar card={c} strengthBonus={player?.strength || 0} formatSpeedText={formatSpeedText} />
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'center' }}>
                    <div className="font-black text-sm" style={{ display: 'flex', alignItems: 'center' }}>
                      {renderNameWithBadge(c, nameColor)}
                    </div>
                  </div>
                  <div className="card-icon-area">
                    <Icon size={60} className="text-white opacity-80" />
                  </div>
                  <div className={`card-footer ${isSimplified ? 'simplified-footer' : ''}`}>
                    {c.traits && c.traits.length > 0 ? <TraitBadgeList traits={c.traits} /> : null}
                    <span className="card-description">{c.description || ''}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {idx > 0 && moveUp && (
                    <button onClick={() => moveUp(idx)} className="btn-enhanced text-xs" style={{ padding: '4px 12px' }}>
                      ←
                    </button>
                  )}
                  {idx < arr.length - 1 && moveDown && (
                    <button onClick={() => moveDown(idx)} className="btn-enhanced text-xs" style={{ padding: '4px 12px' }}>
                      →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {battle.phase === 'resolve' && queue && battle.queue.length > 0 && (
        <div className="hand-cards" style={{ justifyContent: 'center' }}>
          {queue.filter((a) => a.actor === 'player').map((a, i: number) => {
            const card = a.card as unknown as Card;
            const Icon = card.icon || (card.type === 'attack' ? Sword : Shield);
            const globalIndex = queue.findIndex((q) => q === a);
            const isUsed = Array.isArray(usedCardIndices) && usedCardIndices.includes(globalIndex);
            const isDisappearing = Array.isArray(disappearingCards) && disappearingCards.includes(globalIndex);
            const isHidden = Array.isArray(hiddenCards) && hiddenCards.includes(globalIndex);
            const isDisabled = Array.isArray(disabledCardIndices) && disabledCardIndices.includes(globalIndex); // 비활성화된 카드 (몬스터 사망 시)
            // 카드 객체의 플래그를 사용 (같은 카드 타입이 주특기/보조특기에 각각 있을 때 구별)
            const isMainSpecial = card.__isMainSpecial;
            const isSubSpecial = card.__isSubSpecial;
            const costColor = isMainSpecial ? '#fcd34d' : isSubSpecial ? '#60a5fa' : '#fff';
            // 타겟 유닛 정보
            const targetUnit = card.__targetUnitId != null ? getTargetUnit(card.__targetUnitId) : null;

            // 사용된 카드(hidden)는 사라지지 않고 빛만 잃음
            const isDimmed = isHidden || isDisabled;

            return (
              <div
                key={`resolve-${globalIndex}`}
                onMouseEnter={(e: MouseEvent<HTMLDivElement>) => {
                  const cardEl = e.currentTarget.querySelector('.game-card-large');
                  showCardTraitTooltip(card, cardEl);
                }}
                onMouseLeave={hideCardTraitTooltip}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  alignItems: 'center',
                  position: 'relative',
                  marginLeft: i === 0 ? '0' : '8px',
                  opacity: isDimmed ? 0.4 : 1, // 사용된/비활성화된 카드는 투명하게
                  filter: isDimmed ? 'grayscale(0.8) brightness(0.6)' : 'none', // 빛바란 효과
                  transition: 'opacity 0.3s ease, filter 0.3s ease'
                }}
              >
                <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#3b82f6', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', zIndex: 10, border: '2px solid #1e40af' }}>
                  {i + 1}
                </div>
                {/* 타겟 유닛 표시 */}
                {targetUnit && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '-8px',
                    background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '2px 6px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    zIndex: 15,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
                    border: '1px solid #fca5a5',
                  }}>
                    <span>{targetUnit.emoji || '👾'}</span>
                    <span>🎯</span>
                  </div>
                )}
                <div className={`game-card-large resolve-phase-card ${getCardTypeClass(card.type)} ${isUsed ? 'card-used' : ''}`}>
                  <div className="card-cost-badge-floating" style={{ color: costColor, WebkitTextStroke: '1px #000' }}>{card.actionCost}</div>
                  <CardStatsSidebar card={card} strengthBonus={player?.strength || 0} showCounter={true} formatSpeedText={formatSpeedText} />
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'center' }}>
                    <div className="text-white font-black text-sm" style={{ display: 'flex', alignItems: 'center' }}>
                      {renderNameWithBadge(card, '#fff')}
                    </div>
                  </div>
                  <div className="card-icon-area">
                    <Icon size={60} className="text-white opacity-80" />
                  </div>
                  <div className={`card-footer ${isSimplified ? 'simplified-footer' : ''}`}>
                    {card.traits && card.traits.length > 0 ? <TraitBadgeList traits={card.traits} /> : null}
                    <span className="card-description">{card.description || ''}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
