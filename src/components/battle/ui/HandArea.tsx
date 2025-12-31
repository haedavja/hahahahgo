/**
 * HandArea.tsx
 *
 * 하단 고정 손패 영역 컴포넌트
 * 최적화: 인라인 스타일 상수 추출, useCallback 적용
 */

import { FC, useState, MouseEvent, memo, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '../../../state/gameStore';
import { hasTrait, applyTraitModifiers } from '../utils/battleUtils';
import { detectPokerCombo } from '../utils/comboDetection';
import { TraitBadgeList } from './TraitBadge';
import { CardStatsSidebar } from './CardStatsSidebar';
import { Sword, Shield } from './BattleIcons';
import { TRAITS } from '../battleData';
import { getTokenStacks } from '../../../lib/tokenUtils';
import { CardListPopup } from './CardPopups';
import type {
  IconProps,
  HandCardTrait as Trait,
  EnemyUnit as Unit,
  HandBattle as Battle,
  HandPlayer as Player,
  HandEnemy as Enemy,
  HandAction as Action,
  ComboCalculation,
  Card
} from '../../../types';
import type { CSSProperties } from 'react';

// =====================
// 스타일 상수 (컴포넌트 외부에서 정의하여 재생성 방지)
// =====================

/** 카드 색상 상수 */
const CARD_COLORS = {
  MAIN_SPECIAL: '#fcd34d',
  SUB_SPECIAL: '#60a5fa',
  SUB_SPECIAL_NAME: '#7dd3fc',
  DEFAULT: '#fff',
} as const;

/** 협동 활성화 스타일 */
const COOPERATION_ACTIVE_STYLE: CSSProperties = {
  boxShadow: '0 0 20px 4px rgba(34, 197, 94, 0.8), 0 0 40px 8px rgba(34, 197, 94, 0.4)',
  border: '3px solid #22c55e'
};

/** 타겟 유닛 배지 기본 스타일 */
const TARGET_BADGE_BASE: CSSProperties = {
  background: 'linear-gradient(135deg, #dc2626, #991b1b)',
  color: '#fff',
  borderRadius: '8px',
  fontSize: '11px',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  zIndex: 15,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
  border: '1px solid #fca5a5',
};

/** 타겟 유닛 배지 스타일 (select phase) */
const TARGET_BADGE_SELECT: CSSProperties = {
  ...TARGET_BADGE_BASE,
  position: 'absolute',
  bottom: '-8px',
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '2px 8px',
  gap: '4px',
  whiteSpace: 'nowrap',
};

/** 타겟 유닛 배지 스타일 (respond/resolve phase) */
const TARGET_BADGE_OTHER: CSSProperties = {
  ...TARGET_BADGE_BASE,
  position: 'absolute',
  top: '-12px',
  right: '-8px',
  padding: '2px 6px',
  gap: '2px',
};

/** 순서 번호 배지 스타일 */
const ORDER_BADGE_STYLE: CSSProperties = {
  position: 'absolute',
  top: '-12px',
  left: '50%',
  transform: 'translateX(-50%)',
  background: '#3b82f6',
  color: '#fff',
  borderRadius: '50%',
  width: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold',
  fontSize: '14px',
  zIndex: 10,
  border: '2px solid #1e40af'
};

/** 카드 래퍼 기본 스타일 */
const CARD_WRAPPER_BASE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  alignItems: 'center',
  position: 'relative',
};

/** 카드 헤더 스타일 */
const CARD_HEADER_STYLE: CSSProperties = {
  display: 'flex',
  justifyContent: 'center'
};

/** 카드 헤더 내부 스타일 */
const CARD_HEADER_INNER: CSSProperties = {
  display: 'flex',
  alignItems: 'center'
};

/** 덱/무덤 카운터 공통 스타일 */
const COUNTER_BASE: CSSProperties = {
  position: 'fixed',
  padding: '8px 14px',
  borderRadius: '10px',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  cursor: 'pointer',
  transition: 'transform 0.1s, box-shadow 0.1s',
  fontSize: '14px',
  fontWeight: 'bold',
  zIndex: 1000,
  pointerEvents: 'auto',
};

// =====================
// 헬퍼 함수
// =====================

/** 카드 색상 결정 */
const getCardColors = (isMainSpecial?: boolean, isSubSpecial?: boolean) => ({
  costColor: isMainSpecial ? CARD_COLORS.MAIN_SPECIAL : isSubSpecial ? CARD_COLORS.SUB_SPECIAL : CARD_COLORS.DEFAULT,
  nameColor: isMainSpecial ? CARD_COLORS.MAIN_SPECIAL : isSubSpecial ? CARD_COLORS.SUB_SPECIAL_NAME : CARD_COLORS.DEFAULT,
});

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
  return 'general';
};

// 레이아웃 상수
const LAYOUT = {
  DECK_COUNTER: { left: '120px', bottom: '100px' },
  DISCARD_COUNTER: { right: '20px', bottom: '20px' },
} as const;

// 호버 이펙트 생성 함수
const createHoverHandlers = (shadowColor: string) => ({
  onMouseEnter: (e: MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'scale(1.08)';
    e.currentTarget.style.boxShadow = `0 4px 16px ${shadowColor.replace('0.5', '0.7')}`;
  },
  onMouseLeave: (e: MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.boxShadow = `0 2px 12px ${shadowColor}`;
  },
});

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

export const HandArea: FC<HandAreaProps> = memo(({
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
  // 타겟 유닛 정보 가져오기 헬퍼 (useCallback으로 메모이제이션)
  const getTargetUnit = useCallback((targetUnitId: number | undefined): Unit | null => {
    if (targetUnitId === undefined && targetUnitId !== 0) return null;
    return enemyUnits.find((u) => u.unitId === targetUnitId) || null;
  }, [enemyUnits]);

  // 날 세우기 보너스 (sharpened_blade 토큰 스택)
  const fencingBonus = useMemo(() => {
    if (!player) return 0;
    return getTokenStacks(player as any, 'sharpened_blade');
  }, [player]);

  const [showDeckPopup, setShowDeckPopup] = useState(false);
  const [showDiscardPopup, setShowDiscardPopup] = useState(false);

  // 팝업 토글 핸들러 (useCallback)
  const openDeckPopup = useCallback(() => setShowDeckPopup(true), []);
  const closeDeckPopup = useCallback(() => setShowDeckPopup(false), []);
  const openDiscardPopup = useCallback(() => setShowDiscardPopup(true), []);
  const closeDiscardPopup = useCallback(() => setShowDiscardPopup(false), []);

  // phase 체크 조건 (useMemo)
  const shouldShowHand = useMemo(() => (
    battle.phase === 'select' ||
    battle.phase === 'respond' ||
    battle.phase === 'resolve' ||
    (enemy && enemy.hp <= 0) ||
    (player && player.hp <= 0)
  ), [battle.phase, enemy, player]);

  const deckCount = deck.length;
  const discardCount = discardPile.length;

  if (!shouldShowHand) {
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
          onClose={closeDeckPopup}
          icon="🎴"
          bgGradient="linear-gradient(135deg, #3b82f6, #1d4ed8)"
        />,
        document.body
      )}
      {showDiscardPopup && createPortal(
        <CardListPopup
          title="무덤"
          cards={discardPile}
          onClose={closeDiscardPopup}
          icon="🪦"
          bgGradient="linear-gradient(135deg, #6b7280, #374151)"
        />,
        document.body
      )}

      {/* 덱 카운터 - 행동력 구슬 아래 (항상 표시) */}
      <div
        onClick={openDeckPopup}
        style={{
          ...COUNTER_BASE,
          ...LAYOUT.DECK_COUNTER,
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          boxShadow: '0 2px 12px rgba(59, 130, 246, 0.5)',
        }}
        {...createHoverHandlers('rgba(59, 130, 246, 0.5)')}
      >
        <span>🎴</span>
        <span>덱: {deckCount}</span>
      </div>

      {/* 무덤 카운터 - 오른쪽 하단 (항상 표시) */}
      <div
        onClick={openDiscardPopup}
        style={{
          ...COUNTER_BASE,
          ...LAYOUT.DISCARD_COUNTER,
          background: 'linear-gradient(135deg, #6b7280, #374151)',
          boxShadow: '0 2px 12px rgba(107, 114, 128, 0.5)',
        }}
        {...createHoverHandlers('rgba(107, 114, 128, 0.5)')}
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
              // 카드 색상 결정 (상수 사용)
              const { costColor, nameColor } = getCardColors(c.__isMainSpecial, c.__isSubSpecial);
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
                  style={{ ...CARD_WRAPPER_BASE, cursor: disabled ? 'not-allowed' : 'pointer', marginLeft: idx === 0 ? '0' : '-20px' }}
                >
                  <div
                    className={`game-card-large select-phase-card ${getCardTypeClass(c.type)} ${sel ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                    style={cooperationActive ? COOPERATION_ACTIVE_STYLE : undefined}
                  >
                    <div className="card-cost-badge-floating" style={{ color: costColor, WebkitTextStroke: '1px #000' }}>{enhancedCard.actionCost || c.actionCost}</div>
                    {sel && <div className="selection-number">{selIndex + 1}</div>}
                    {/* 타겟 유닛 표시 (다중 적 유닛일 때 공격 카드) */}
                    {sel && targetUnit && (
                      <div style={TARGET_BADGE_SELECT}>
                        <span>{targetUnit.emoji || '👾'}</span>
                        <span>🎯</span>
                      </div>
                    )}
                    <CardStatsSidebar card={enhancedCard} strengthBonus={player?.strength || 0} fencingBonus={fencingBonus} formatSpeedText={formatSpeedText} />
                    <div className="card-header" style={CARD_HEADER_STYLE}>
                      <div className="font-black text-sm" style={CARD_HEADER_INNER}>
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
            const c = action.card;
            const Icon = c.icon || (c.type === 'attack' ? Sword : Shield);
            // 카드 색상 결정 (상수 사용)
            const { costColor, nameColor } = getCardColors(c.__isMainSpecial, c.__isSubSpecial);
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
                style={{ ...CARD_WRAPPER_BASE, marginLeft: idx === 0 ? '0' : '8px' }}
              >
                <div style={ORDER_BADGE_STYLE}>
                  {idx + 1}
                </div>
                {/* 타겟 유닛 표시 */}
                {targetUnit && (
                  <div style={TARGET_BADGE_OTHER}>
                    <span>{targetUnit.emoji || '👾'}</span>
                    <span>🎯</span>
                  </div>
                )}
                <div className={`game-card-large respond-phase-card ${getCardTypeClass(c.type)}`}>
                  <div className="card-cost-badge-floating" style={{ color: costColor, WebkitTextStroke: '1px #000' }}>{c.actionCost}</div>
                  <CardStatsSidebar card={c} strengthBonus={player?.strength || 0} fencingBonus={fencingBonus} formatSpeedText={formatSpeedText} />
                  <div className="card-header" style={CARD_HEADER_STYLE}>
                    <div className="font-black text-sm" style={CARD_HEADER_INNER}>
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
            const card = a.card;
            const Icon = card.icon || (card.type === 'attack' ? Sword : Shield);
            const globalIndex = queue.findIndex((q) => q === a);
            const isUsed = Array.isArray(usedCardIndices) && usedCardIndices.includes(globalIndex);
            const isDisappearing = Array.isArray(disappearingCards) && disappearingCards.includes(globalIndex);
            const isHidden = Array.isArray(hiddenCards) && hiddenCards.includes(globalIndex);
            const isDisabled = Array.isArray(disabledCardIndices) && disabledCardIndices.includes(globalIndex);
            // 카드 색상 결정 (상수 사용)
            const { costColor } = getCardColors(card.__isMainSpecial, card.__isSubSpecial);
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
                  ...CARD_WRAPPER_BASE,
                  marginLeft: i === 0 ? '0' : '8px',
                  opacity: isDimmed ? 0.4 : 1,
                  filter: isDimmed ? 'grayscale(0.8) brightness(0.6)' : 'none',
                  transition: 'opacity 0.3s ease, filter 0.3s ease'
                }}
              >
                <div style={ORDER_BADGE_STYLE}>
                  {i + 1}
                </div>
                {/* 타겟 유닛 표시 */}
                {targetUnit && (
                  <div style={TARGET_BADGE_OTHER}>
                    <span>{targetUnit.emoji || '👾'}</span>
                    <span>🎯</span>
                  </div>
                )}
                <div className={`game-card-large resolve-phase-card ${getCardTypeClass(card.type)} ${isUsed ? 'card-used' : ''}`}>
                  <div className="card-cost-badge-floating" style={{ color: costColor, WebkitTextStroke: '1px #000' }}>{card.actionCost}</div>
                  <CardStatsSidebar card={card} strengthBonus={player?.strength || 0} fencingBonus={fencingBonus} showCounter={true} formatSpeedText={formatSpeedText} />
                  <div className="card-header" style={CARD_HEADER_STYLE}>
                    <div className="text-white font-black text-sm" style={CARD_HEADER_INNER}>
                      {renderNameWithBadge(card, CARD_COLORS.DEFAULT)}
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
});
