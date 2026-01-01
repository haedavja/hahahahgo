/**
 * RestModal.tsx
 * 휴식/각성 모달 컴포넌트
 *
 * 카드 성장 시스템:
 * - 강화: 스탯 향상 (데미지, 방어력, 속도 등)
 * - 특화: 랜덤 5개 특성 중 선택하여 부여
 * - 승격: 성장 횟수에 따른 등급 상승 (1회→희귀, 3회→특별, 5회→전설)
 *
 * 최적화: React.memo 적용
 */

import { useState, memo, useCallback, useMemo, lazy, Suspense } from 'react';
import { CARDS, TRAITS } from '../../battle/battleData';
import { CARD_ETHER_BY_RARITY } from '../../battle/utils/etherCalculations';
import { generateSpecializationOptions, type SpecializationOption } from '../../../lib/specializationUtils';
import type { CardGrowthState } from '../../../state/slices/types';
import {
  getEnhancementColor,
  getEnhancementLabel,
  isEnhanceable,
} from '../../../lib/cardEnhancementUtils';
// Lazy loading for heavy modals
const CardGrowthModal = lazy(() => import('./CardGrowthModal').then(m => ({ default: m.CardGrowthModal })));
const GrowthPyramidModal = lazy(() => import('../../growth/GrowthPyramidModal').then(m => ({ default: m.GrowthPyramidModal })));

// 분리된 컴포넌트들
import {
  TRAIT_EFFECT_DESC,
  ENHANCEMENT_COST,
  SPECIALIZATION_COST,
  RARITY_LABEL,
  RARITY_BADGE,
  type GrowthNotification,
} from './rest/restConstants';
import { GrowthStatsPanel } from './rest/GrowthStatsPanel';
import { EnhancePreviewPanel, StatBadge } from './rest/EnhancePreviewPanel';

export function RestModal({
  memoryValue,
  playerHp,
  maxHp,
  canAwaken,
  playerTraits,
  cardUpgrades,
  cardGrowth,
  gold,
  ownedCards,
  closeRest,
  awakenAtRest,
  healAtRest,
  upgradeCardRarity,
  enhanceCard,
  specializeCard,
  spendGold,
}: {
  memoryValue: number;
  playerHp: number;
  maxHp: number;
  canAwaken: boolean;
  playerTraits: string[];
  ownedCards: string[];
  cardUpgrades: Record<string, string>;
  cardGrowth: Record<string, CardGrowthState>;
  gold: number;
  closeRest: () => void;
  awakenAtRest: (type: string) => void;
  healAtRest: (amount: number) => void;
  upgradeCardRarity: (cardId: string) => void;
  enhanceCard: (cardId: string) => void;
  specializeCard: (cardId: string, selectedTraits: string[]) => void;
  spendGold: (amount: number) => void;
}) {
  const [showCardGrowthModal, setShowCardGrowthModal] = useState(false);
  const [showPyramidModal, setShowPyramidModal] = useState(false);
  const [cardGrowthUsed, setCardGrowthUsed] = useState(false);

  // 핸들러 메모이제이션
  const handleStopPropagation = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);
  const handleAwakenBrave = useCallback(() => awakenAtRest("brave"), [awakenAtRest]);
  const handleAwakenSturdy = useCallback(() => awakenAtRest("sturdy"), [awakenAtRest]);
  const handleAwakenCold = useCallback(() => awakenAtRest("cold"), [awakenAtRest]);
  const handleAwakenThorough = useCallback(() => awakenAtRest("thorough"), [awakenAtRest]);
  const handleAwakenPassionate = useCallback(() => awakenAtRest("passionate"), [awakenAtRest]);
  const handleAwakenLively = useCallback(() => awakenAtRest("lively"), [awakenAtRest]);
  const handleAwakenRandom = useCallback(() => awakenAtRest("random"), [awakenAtRest]);

  const handleHeal = useCallback(() => {
    const heal = Math.max(1, Math.round((maxHp || 0) * 0.3));
    healAtRest(heal);
    closeRest();
  }, [maxHp, healAtRest, closeRest]);

  const handleOpenCardGrowth = useCallback(() => setShowCardGrowthModal(true), []);

  const handleCloseCardGrowthModal = useCallback(() => setShowCardGrowthModal(false), []);

  const handleEnhanceCard = useCallback((cardId: string) => {
    enhanceCard(cardId);
    setCardGrowthUsed(true);
  }, [enhanceCard]);

  const handleSpecializeCard = useCallback((cardId: string, traits: string[]) => {
    specializeCard(cardId, traits);
    setCardGrowthUsed(true);
  }, [specializeCard]);

  // 스타일 메모이제이션
  const cardGrowthBtnStyle = useMemo(() => ({
    background: cardGrowthUsed
      ? 'rgba(71, 85, 105, 0.3)'
      : 'linear-gradient(135deg, rgba(96, 165, 250, 0.2), rgba(134, 239, 172, 0.2))',
    border: cardGrowthUsed ? '1px solid rgba(71, 85, 105, 0.3)' : '1px solid rgba(96, 165, 250, 0.4)',
    opacity: cardGrowthUsed ? 0.5 : 1,
  }), [cardGrowthUsed]);

  return (
    <div className="event-modal-overlay" onClick={closeRest} data-testid="rest-modal-overlay">
      <div className="event-modal" onClick={handleStopPropagation} data-testid="rest-modal">
        <header data-testid="rest-modal-header">
          <h3>휴식 · 각성</h3>
          <small>기억 100 소모 시 각성, 체력 회복 또는 카드 성장 선택</small>
        </header>
        <p>기억 보유량: {memoryValue} / 100 · 체력 {playerHp}/{maxHp}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginTop: "12px" }} data-testid="rest-choices">
          <div className="choice-card" data-testid="rest-choice-warrior">
            <strong>전사</strong>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button className="btn" disabled={!canAwaken} onClick={handleAwakenBrave} data-testid="rest-btn-brave">용맹(+힘1)</button>
              <button className="btn" disabled={!canAwaken} onClick={handleAwakenSturdy} data-testid="rest-btn-sturdy">굳건(+체력10)</button>
            </div>
          </div>
          <div className="choice-card" data-testid="rest-choice-sage">
            <strong>현자</strong>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button className="btn" disabled={!canAwaken} onClick={handleAwakenCold} data-testid="rest-btn-cold">냉철(+통찰1)</button>
              <button className="btn" disabled={!canAwaken} onClick={handleAwakenThorough} data-testid="rest-btn-thorough">철저(+보조슬롯1)</button>
            </div>
          </div>
          <div className="choice-card" data-testid="rest-choice-hero">
            <strong>영웅</strong>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button className="btn" disabled={!canAwaken} onClick={handleAwakenPassionate} data-testid="rest-btn-passionate">열정(+속도5)</button>
              <button className="btn" disabled={!canAwaken} onClick={handleAwakenLively} data-testid="rest-btn-lively">활력(+행동력1)</button>
            </div>
          </div>
          <div className="choice-card" data-testid="rest-choice-faith">
            <strong>신앙</strong>
            <div style={{ marginTop: "8px" }}>
              <button className="btn" disabled={!canAwaken} onClick={handleAwakenRandom} data-testid="rest-btn-random">랜덤 개성</button>
            </div>
          </div>
          <div className="choice-card" data-testid="rest-choice-rest">
            <strong>휴식</strong>
            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <button className="btn" onClick={handleHeal} data-testid="rest-btn-heal">
                체력 회복 (+30% 최대체력)
              </button>
              <button
                className="btn"
                onClick={handleOpenCardGrowth}
                disabled={cardGrowthUsed}
                style={cardGrowthBtnStyle}
                data-testid="rest-btn-card-growth"
              >
                {cardGrowthUsed ? '✓ 카드 승급 완료' : '🎴 카드 승급 (강화/특화)'}
              </button>
            </div>
          </div>
          <div className="choice-card" data-testid="rest-choice-growth">
            <strong>성장 시스템</strong>
            <div style={{ marginTop: "8px" }}>
              <p style={{ fontSize: "12px", color: "#888", marginBottom: "8px" }}>
                개성 보유: {playerTraits.length}개
              </p>
              <button
                className="btn"
                onClick={() => setShowPyramidModal(true)}
                style={{
                  background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(244, 114, 182, 0.2))',
                  border: '1px solid rgba(251, 191, 36, 0.4)',
                }}
                data-testid="rest-btn-pyramid"
              >
                피라미드 성장
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
          <button className="btn" onClick={() => closeRest()} data-testid="rest-close-btn">닫기</button>
        </div>
      </div>

      {/* 카드 승급 모달 */}
      {showCardGrowthModal && (
        <Suspense fallback={null}>
          <CardGrowthModal
            isOpen={showCardGrowthModal}
            onClose={handleCloseCardGrowthModal}
            cardGrowth={cardGrowth}
            onEnhance={handleEnhanceCard}
            onSpecialize={handleSpecializeCard}
            ownedCards={ownedCards}
            isRestNode={true}
          />
        </Suspense>
      )}

      {/* 피라미드 성장 모달 */}
      {showPyramidModal && (
        <Suspense fallback={null}>
          <GrowthPyramidModal
            isOpen={showPyramidModal}
            onClose={() => setShowPyramidModal(false)}
          />
        </Suspense>
      )}
    </div>
  );
}

// EgoFormPanel 제거됨 - 새 성장 시스템(피라미드)으로 대체

interface CardGrowthPanelProps {
  cardGrowth: Record<string, CardGrowthState>;
  gold: number;
  onEnhance: (cardId: string) => void;
  onSpecialize: (cardId: string, selectedTraits: string[]) => void;
  spendGold: (amount: number) => void;
}

/** 카드 성장 패널 (강화/특화) */
const CardGrowthPanel = memo(function CardGrowthPanel({
  cardGrowth,
  gold,
  onEnhance,
  onSpecialize,
  spendGold,
}: CardGrowthPanelProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [growthMode, setGrowthMode] = useState<'select' | 'enhance' | 'specialize'>('select');
  const [specOptions, setSpecOptions] = useState<SpecializationOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<SpecializationOption | null>(null);
  const [notification, setNotification] = useState<GrowthNotification | null>(null);

  const cards = useMemo(() => CARDS || [], []);

  const getCardGrowthState = useCallback((cardId: string): CardGrowthState => {
    return cardGrowth[cardId] || { rarity: 'common', growthCount: 0, enhancementLevel: 0, specializationCount: 0, traits: [] };
  }, [cardGrowth]);

  const getNextPromotionInfo = useCallback((growth: CardGrowthState) => {
    const { growthCount, rarity } = growth;
    if (rarity === 'legendary') return null;
    if (growthCount < 1) return { target: '희귀', remaining: 1 - growthCount };
    if (growthCount < 3) return { target: '특별', remaining: 3 - growthCount };
    if (growthCount < 5) return { target: '전설', remaining: 5 - growthCount };
    return null;
  }, []);

  const handleSelectCard = useCallback((cardId: string) => {
    setSelectedCard(cardId);
    setShowCardModal(false);
    setGrowthMode('select');
  }, []);

  const handleStartSpecialize = useCallback(() => {
    if (!selectedCard) return;
    const growth = getCardGrowthState(selectedCard);
    const options = generateSpecializationOptions(growth.traits);
    setSpecOptions(options);
    setSelectedOption(null);
    setGrowthMode('specialize');
  }, [selectedCard, getCardGrowthState]);

  // 현재 선택된 카드의 강화 비용 계산
  const getEnhancementCost = useCallback((cardId: string): number => {
    const growth = getCardGrowthState(cardId);
    const nextLevel = (growth.enhancementLevel || 0) + 1;
    return ENHANCEMENT_COST[nextLevel] || 0;
  }, [getCardGrowthState]);

  // 알림 표시 헬퍼
  const showNotificationHelper = useCallback((notif: GrowthNotification) => {
    setNotification(notif);
    // 3초 후 알림 숨김
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  }, []);

  const handleConfirmEnhance = useCallback(() => {
    if (!selectedCard) return;
    const cost = getEnhancementCost(selectedCard);
    if (gold < cost) return; // 골드 부족

    const cardName = cards.find(c => c.id === selectedCard)?.name || selectedCard;
    const currentLevel = getCardGrowthState(selectedCard).enhancementLevel || 0;
    const newLevel = currentLevel + 1;

    spendGold(cost);
    onEnhance(selectedCard);

    // 성공 알림
    showNotificationHelper({
      message: `+${newLevel} 강화 성공!`,
      type: 'enhance',
      cardName,
    });

    setGrowthMode('select');
  }, [selectedCard, getEnhancementCost, gold, cards, getCardGrowthState, spendGold, onEnhance, showNotificationHelper]);

  const handleConfirmSpecialize = useCallback(() => {
    if (!selectedCard || !selectedOption) return;
    if (gold < SPECIALIZATION_COST) return; // 골드 부족

    const cardName = cards.find(c => c.id === selectedCard)?.name || selectedCard;
    const traitNames = selectedOption.traits.map(t => t.name).join(', ');

    spendGold(SPECIALIZATION_COST);
    const traitIds = selectedOption.traits.map(t => t.id);
    onSpecialize(selectedCard, traitIds);

    // 성공 알림
    showNotificationHelper({
      message: `특화 성공! [${traitNames}]`,
      type: 'specialize',
      cardName,
    });

    setGrowthMode('select');
    setSelectedOption(null);
  }, [selectedCard, selectedOption, gold, cards, spendGold, onSpecialize, showNotificationHelper]);

  const selected = useMemo(() => cards.find((c) => c.id === selectedCard), [cards, selectedCard]);
  const selectedGrowth = useMemo(() => selectedCard ? getCardGrowthState(selectedCard) : null, [selectedCard, getCardGrowthState]);
  const promotionInfo = useMemo(() => selectedGrowth ? getNextPromotionInfo(selectedGrowth) : null, [selectedGrowth, getNextPromotionInfo]);

  const handleOpenCardModal = useCallback(() => setShowCardModal(true), []);
  const handleCloseCardModal = useCallback(() => setShowCardModal(false), []);
  const handleSetGrowthModeEnhance = useCallback(() => setGrowthMode('enhance'), []);
  const handleSetGrowthModeSelect = useCallback(() => setGrowthMode('select'), []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ fontWeight: 700 }}>카드 성장</div>

      {/* 성공 알림 */}
      {notification && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: notification.type === 'enhance'
              ? 'rgba(96, 165, 250, 0.2)'
              : notification.type === 'specialize'
                ? 'rgba(134, 239, 172, 0.2)'
                : 'rgba(251, 191, 36, 0.2)',
            border: `1px solid ${
              notification.type === 'enhance'
                ? '#60a5fa'
                : notification.type === 'specialize'
                  ? '#86efac'
                  : '#fbbf24'
            }`,
            color: notification.type === 'enhance'
              ? '#93c5fd'
              : notification.type === 'specialize'
                ? '#86efac'
                : '#fde68a',
            fontWeight: 600,
            textAlign: 'center',
            animation: 'fadeInScale 0.3s ease-out',
          }}
        >
          <div style={{ fontSize: '14px', marginBottom: '2px' }}>
            {notification.type === 'enhance' ? '⚔️' : notification.type === 'specialize' ? '✨' : '🏆'} {notification.cardName}
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700 }}>
            {notification.message}
          </div>
        </div>
      )}

      {/* 성장 통계 패널 */}
      <GrowthStatsPanel cardGrowth={cardGrowth} />

      <button className="btn" onClick={handleOpenCardModal}>
        카드 선택
      </button>

      {selected && selectedGrowth && (
        <div style={{ fontSize: "13px", color: "#9ca3af" }}>
          <div>{selected.name} - {RARITY_LABEL[selectedGrowth.rarity]} ({selectedGrowth.growthCount}/5)</div>
          {promotionInfo && (
            <div style={{ color: "#86efac" }}>
              다음 승격: {promotionInfo.target} (성장 {promotionInfo.remaining}회 필요)
            </div>
          )}
          {selectedGrowth.traits.length > 0 && (
            <div style={{ marginTop: "4px" }}>
              특성: {selectedGrowth.traits.map(tid => {
                const t = TRAITS[tid as keyof typeof TRAITS];
                return t ? `${t.type === 'positive' ? '+' : '-'}${t.name}` : tid;
              }).join(', ')}
            </div>
          )}
        </div>
      )}

      {selected && selectedGrowth && selectedGrowth.rarity !== 'legendary' && growthMode === 'select' && (
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn" onClick={handleSetGrowthModeEnhance}>
            강화
          </button>
          <button className="btn" onClick={handleStartSpecialize}>
            특화
          </button>
        </div>
      )}

      {/* 강화 확인 */}
      {growthMode === 'enhance' && selected && selectedGrowth && (
        <EnhancePreviewPanel
          cardId={selected.id}
          cardName={selected.name}
          currentLevel={selectedGrowth.enhancementLevel || 0}
          gold={gold}
          cost={getEnhancementCost(selected.id)}
          onConfirm={handleConfirmEnhance}
          onCancel={handleSetGrowthModeSelect}
        />
      )}

      {/* 특화 선택 */}
      {growthMode === 'specialize' && selected && (
        <div style={{ padding: "10px", background: "rgba(134, 239, 172, 0.1)", borderRadius: "8px", border: "1px solid rgba(134, 239, 172, 0.3)" }}>
          <div style={{ fontWeight: 700, color: "#86efac", marginBottom: "8px" }}>✨ 특화 - 특성 선택</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
            {specOptions.map((option, idx) => (
              <button
                key={option.id}
                className="choice-card"
                style={{
                  textAlign: "left",
                  padding: "8px 12px",
                  borderColor: selectedOption?.id === option.id ? "#86efac" : "rgba(148,163,184,0.4)",
                  boxShadow: selectedOption?.id === option.id ? "0 0 8px rgba(134, 239, 172, 0.5)" : "none",
                }}
                onClick={() => setSelectedOption(option)}
              >
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {option.traits.map((trait) => (
                    <span
                      key={trait.id}
                      style={{
                        fontSize: "12px",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        background: trait.type === 'positive' ? "rgba(134, 239, 172, 0.2)" : "rgba(248, 113, 113, 0.2)",
                        color: trait.type === 'positive' ? "#86efac" : "#f87171",
                        border: `1px solid ${trait.type === 'positive' ? "rgba(134, 239, 172, 0.4)" : "rgba(248, 113, 113, 0.4)"}`,
                      }}
                    >
                      {trait.type === 'positive' ? '+' : '-'}{trait.name} ({'★'.repeat(trait.weight)})
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
                  {option.traits.map(t => t.description).join(' / ')}
                </div>
              </button>
            ))}
          </div>
          {/* 특화 비용 표시 */}
          <div style={{
            marginTop: "10px",
            marginBottom: "10px",
            padding: "8px",
            background: gold >= SPECIALIZATION_COST ? "rgba(251, 191, 36, 0.1)" : "rgba(239, 68, 68, 0.1)",
            borderRadius: "6px",
            border: gold >= SPECIALIZATION_COST ? "1px solid rgba(251, 191, 36, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span style={{ fontSize: "13px", color: "#9ca3af" }}>특화 비용:</span>
            <span style={{
              fontSize: "14px",
              fontWeight: 700,
              color: gold >= SPECIALIZATION_COST ? "#fbbf24" : "#ef4444"
            }}>
              💰 {SPECIALIZATION_COST} (보유: {gold})
            </span>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="btn"
              onClick={handleConfirmSpecialize}
              disabled={!selectedOption || gold < SPECIALIZATION_COST}
              style={{
                background: selectedOption && gold >= SPECIALIZATION_COST ? "rgba(134, 239, 172, 0.2)" : undefined,
                opacity: gold < SPECIALIZATION_COST ? 0.5 : 1
              }}
            >
              {gold >= SPECIALIZATION_COST ? "특화 확정" : "골드 부족"}
            </button>
            <button className="btn" onClick={handleSetGrowthModeSelect}>취소</button>
          </div>
        </div>
      )}

      {/* 카드 선택 모달 */}
      {showCardModal && (
        <div className="event-modal-overlay" onClick={handleCloseCardModal}>
          <div className="event-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px" }}>
            <header>
              <h3>성장시킬 카드 선택</h3>
              <small>강화: 스탯 향상 / 특화: 특성 부여</small>
            </header>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", maxHeight: "400px", overflowY: "auto" }}>
              {cards.map((card) => {
                const growth = getCardGrowthState(card.id);
                const badge = RARITY_BADGE[growth.rarity];
                const isMaxLevel = growth.rarity === 'legendary';
                return (
                  <button
                    key={card.id}
                    className="choice-card"
                    disabled={isMaxLevel}
                    style={{
                      textAlign: "left",
                      borderColor: selectedCard === card.id ? "#fbbf24" : "rgba(148,163,184,0.4)",
                      boxShadow: selectedCard === card.id ? "0 0 10px rgba(251,191,36,0.6)" : "none",
                      opacity: isMaxLevel ? 0.5 : 1,
                    }}
                    onClick={() => handleSelectCard(card.id)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <strong>{card.name}</strong>
                        {(growth.enhancementLevel || 0) > 0 && (
                          <span style={{
                            fontSize: "10px",
                            padding: "1px 4px",
                            borderRadius: "3px",
                            background: getEnhancementColor(growth.enhancementLevel || 0),
                            color: "#0f172a",
                            fontWeight: 700,
                          }}>
                            {getEnhancementLabel(growth.enhancementLevel || 0)}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                          {growth.growthCount}/5
                        </span>
                        {badge && (
                          <span style={{
                            fontSize: "11px",
                            padding: "2px 6px",
                            borderRadius: "6px",
                            background: badge.color,
                            color: "#0f172a",
                            fontWeight: 800
                          }}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
                      {card.description || ''}
                    </div>
                    {growth.traits.length > 0 && (
                      <div style={{ fontSize: "11px", color: "#86efac", marginTop: "4px" }}>
                        {growth.traits.slice(0, 3).map(tid => {
                          const t = TRAITS[tid as keyof typeof TRAITS];
                          return t ? t.name : tid;
                        }).join(', ')}{growth.traits.length > 3 ? ` +${growth.traits.length - 3}` : ''}
                      </div>
                    )}
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                      행동력 {card.actionCost} · 속도 {card.speedCost} · 에테르 {CARD_ETHER_BY_RARITY[growth.rarity]}
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button className="btn" onClick={handleCloseCardModal}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
