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

import { useState, memo, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { CARDS, TRAITS } from '../../battle/battleData';
import { CARD_ETHER_BY_RARITY } from '../../battle/utils/etherCalculations';
import { generateSpecializationOptions, type SpecializationOption } from '../../../lib/specializationUtils';
import type { CardGrowthState } from '../../../state/slices/types';
import {
  getNextEnhancementPreview,
  getAllEnhancementLevels,
  getEnhancementColor,
  getEnhancementLabel,
  isEnhanceable,
  calculateEnhancedStats,
} from '../../../lib/cardEnhancementUtils';
import { CardGrowthModal } from './CardGrowthModal';
import { GrowthPyramidModal } from '../../growth/GrowthPyramidModal';

// 자아 형성 규칙 - 레거시 (새 성장 시스템으로 대체됨)
// 새 시스템: 개성 → 에토스/파토스 → 자아(총잡이/검잡이) → 로고스

const TRAIT_EFFECT_DESC = {
  '용맹함': '힘 +1',
  '굳건함': '체력 +10',
  '냉철함': '통찰 +1',
  '철저함': '보조슬롯 +1',
  '열정적': '속도 +5',
  '활력적': '행동력 +1',
};

// REFLECTION_DESC 제거됨 - 새 성장 시스템으로 대체

// 강화/특화 비용 (휴식 노드에서는 무료)
const ENHANCEMENT_COST: Record<number, number> = {
  1: 0,  // 0→1강 (무료)
  2: 0,  // 1→2강 (무료)
  3: 0,  // 2→3강 (무료)
  4: 0,  // 3→4강 (무료)
  5: 0,  // 4→5강 (무료)
};

const SPECIALIZATION_COST = 0; // 특화 비용 (무료)

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

  return (
    <div className="event-modal-overlay" onClick={closeRest}>
      <div className="event-modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h3>휴식 · 각성</h3>
          <small>기억 100 소모 시 각성, 체력 회복 또는 카드 성장 선택</small>
        </header>
        <p>기억 보유량: {memoryValue} / 100 · 체력 {playerHp}/{maxHp}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginTop: "12px" }}>
          <div className="choice-card">
            <strong>전사</strong>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button className="btn" disabled={!canAwaken} onClick={() => awakenAtRest("brave")}>용맹(+힘1)</button>
              <button className="btn" disabled={!canAwaken} onClick={() => awakenAtRest("sturdy")}>굳건(+체력10)</button>
            </div>
          </div>
          <div className="choice-card">
            <strong>현자</strong>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button className="btn" disabled={!canAwaken} onClick={() => awakenAtRest("cold")}>냉철(+통찰1)</button>
              <button className="btn" disabled={!canAwaken} onClick={() => awakenAtRest("thorough")}>철저(+보조슬롯1)</button>
            </div>
          </div>
          <div className="choice-card">
            <strong>영웅</strong>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button className="btn" disabled={!canAwaken} onClick={() => awakenAtRest("passionate")}>열정(+속도5)</button>
              <button className="btn" disabled={!canAwaken} onClick={() => awakenAtRest("lively")}>활력(+행동력1)</button>
            </div>
          </div>
          <div className="choice-card">
            <strong>신앙</strong>
            <div style={{ marginTop: "8px" }}>
              <button className="btn" disabled={!canAwaken} onClick={() => awakenAtRest("random")}>랜덤 개성</button>
            </div>
          </div>
          <div className="choice-card">
            <strong>휴식</strong>
            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                className="btn"
                onClick={() => {
                  const heal = Math.max(1, Math.round((maxHp || 0) * 0.3));
                  healAtRest(heal);
                  closeRest();
                }}
              >
                체력 회복 (+30% 최대체력)
              </button>
              <button
                className="btn"
                onClick={() => setShowCardGrowthModal(true)}
                disabled={cardGrowthUsed}
                style={{
                  background: cardGrowthUsed
                    ? 'rgba(71, 85, 105, 0.3)'
                    : 'linear-gradient(135deg, rgba(96, 165, 250, 0.2), rgba(134, 239, 172, 0.2))',
                  border: cardGrowthUsed ? '1px solid rgba(71, 85, 105, 0.3)' : '1px solid rgba(96, 165, 250, 0.4)',
                  opacity: cardGrowthUsed ? 0.5 : 1,
                }}
              >
                {cardGrowthUsed ? '✓ 카드 승급 완료' : '🎴 카드 승급 (강화/특화)'}
              </button>
            </div>
          </div>
          <div className="choice-card">
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
              >
                피라미드 성장
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
          <button className="btn" onClick={() => closeRest()}>닫기</button>
        </div>
      </div>

      {/* 카드 승급 모달 */}
      <CardGrowthModal
        isOpen={showCardGrowthModal}
        onClose={() => setShowCardGrowthModal(false)}
        cardGrowth={cardGrowth}
        onEnhance={(cardId) => {
          enhanceCard(cardId);
          setCardGrowthUsed(true);
        }}
        onSpecialize={(cardId, traits) => {
          specializeCard(cardId, traits);
          setCardGrowthUsed(true);
        }}
        ownedCards={ownedCards}
        isRestNode={true}
      />

      {/* 피라미드 성장 모달 */}
      <GrowthPyramidModal
        isOpen={showPyramidModal}
        onClose={() => setShowPyramidModal(false)}
      />
    </div>
  );
}

// EgoFormPanel 제거됨 - 새 성장 시스템(피라미드)으로 대체

/** 카드 성장 통계 계산 */
function calculateGrowthStats(cardGrowth: Record<string, CardGrowthState>) {
  const stats = {
    totalCards: 0,
    enhancedCards: 0,
    specializedCards: 0,
    totalEnhancementLevels: 0,
    totalSpecializations: 0,
    totalTraits: 0,
    rarityBreakdown: { common: 0, rare: 0, special: 0, legendary: 0 } as Record<string, number>,
    maxEnhancementLevel: 0,
  };

  for (const [_cardId, growth] of Object.entries(cardGrowth)) {
    stats.totalCards++;

    if (growth.enhancementLevel && growth.enhancementLevel > 0) {
      stats.enhancedCards++;
      stats.totalEnhancementLevels += growth.enhancementLevel;
      stats.maxEnhancementLevel = Math.max(stats.maxEnhancementLevel, growth.enhancementLevel);
    }

    if (growth.specializationCount && growth.specializationCount > 0) {
      stats.specializedCards++;
      stats.totalSpecializations += growth.specializationCount;
    }

    if (growth.traits) {
      stats.totalTraits += growth.traits.length;
    }

    stats.rarityBreakdown[growth.rarity || 'common']++;
  }

  return stats;
}

/** 카드 성장 통계 패널 */
const GrowthStatsPanel = memo(function GrowthStatsPanel({ cardGrowth }: { cardGrowth: Record<string, CardGrowthState> }) {
  const [expanded, setExpanded] = useState(false);
  const stats = calculateGrowthStats(cardGrowth);

  if (stats.totalCards === 0) {
    return null;
  }

  return (
    <div style={{
      marginBottom: "10px",
      padding: "8px 10px",
      background: "rgba(96, 165, 250, 0.08)",
      borderRadius: "6px",
      border: "1px solid rgba(96, 165, 250, 0.2)",
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: "#e2e8f0",
        }}
      >
        <span style={{ fontSize: "12px", fontWeight: 600, color: "#60a5fa" }}>
          📊 성장 현황
        </span>
        <span style={{ fontSize: "11px", color: "#9ca3af" }}>
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {/* 요약 (항상 표시) */}
      <div style={{
        display: "flex",
        gap: "12px",
        marginTop: "6px",
        fontSize: "11px",
        color: "#9ca3af",
      }}>
        <span>강화 <span style={{ color: "#60a5fa", fontWeight: 600 }}>{stats.enhancedCards}</span>장</span>
        <span>특화 <span style={{ color: "#86efac", fontWeight: 600 }}>{stats.specializedCards}</span>장</span>
        {stats.rarityBreakdown.legendary > 0 && (
          <span style={{ color: "#fbbf24" }}>★ 전설 {stats.rarityBreakdown.legendary}</span>
        )}
      </div>

      {/* 상세 정보 (확장 시) */}
      {expanded && (
        <div style={{
          marginTop: "10px",
          paddingTop: "10px",
          borderTop: "1px solid rgba(96, 165, 250, 0.15)",
        }}>
          {/* 강화 통계 */}
          <div style={{ marginBottom: "8px" }}>
            <div style={{ fontSize: "11px", color: "#60a5fa", fontWeight: 600, marginBottom: "4px" }}>
              ⚔️ 강화
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <StatMini label="총 강화" value={`+${stats.totalEnhancementLevels}`} color="#60a5fa" />
              <StatMini label="최고 레벨" value={`+${stats.maxEnhancementLevel}`} color="#a78bfa" />
            </div>
          </div>

          {/* 특화 통계 */}
          <div style={{ marginBottom: "8px" }}>
            <div style={{ fontSize: "11px", color: "#86efac", fontWeight: 600, marginBottom: "4px" }}>
              ✨ 특화
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <StatMini label="총 특화" value={`${stats.totalSpecializations}회`} color="#86efac" />
              <StatMini label="부여 특성" value={`${stats.totalTraits}개`} color="#34d399" />
            </div>
          </div>

          {/* 등급 분포 */}
          <div>
            <div style={{ fontSize: "11px", color: "#fbbf24", fontWeight: 600, marginBottom: "4px" }}>
              🏆 등급 분포
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {stats.rarityBreakdown.legendary > 0 && (
                <StatMini label="전설" value={stats.rarityBreakdown.legendary.toString()} color="#fbbf24" />
              )}
              {stats.rarityBreakdown.special > 0 && (
                <StatMini label="특별" value={stats.rarityBreakdown.special.toString()} color="#34d399" />
              )}
              {stats.rarityBreakdown.rare > 0 && (
                <StatMini label="희귀" value={stats.rarityBreakdown.rare.toString()} color="#60a5fa" />
              )}
              <StatMini label="일반" value={stats.rarityBreakdown.common.toString()} color="#9ca3af" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

/** 미니 스탯 표시 컴포넌트 */
const StatMini = memo(function StatMini({ label, value, color }: { label: string; value: string; color: string }) {
  const style: CSSProperties = {
    fontSize: "10px",
    padding: "2px 6px",
    borderRadius: "4px",
    background: `${color}15`,
    color: color,
    border: `1px solid ${color}30`,
  };
  return (
    <span style={style}>
      {label}: <span style={{ fontWeight: 700 }}>{value}</span>
    </span>
  );
});

/** 성공 알림 타입 */
interface GrowthNotification {
  message: string;
  type: 'enhance' | 'specialize' | 'promotion';
  cardName: string;
}

/** 카드 성장 패널 (강화/특화) */
function CardGrowthPanel({
  cardGrowth,
  gold,
  onEnhance,
  onSpecialize,
  spendGold,
}: {
  cardGrowth: Record<string, CardGrowthState>;
  gold: number;
  onEnhance: (cardId: string) => void;
  onSpecialize: (cardId: string, selectedTraits: string[]) => void;
  spendGold: (amount: number) => void;
}) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [growthMode, setGrowthMode] = useState<'select' | 'enhance' | 'specialize'>('select');
  const [specOptions, setSpecOptions] = useState<SpecializationOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<SpecializationOption | null>(null);
  const [notification, setNotification] = useState<GrowthNotification | null>(null);
  const [animateCard, setAnimateCard] = useState(false);

  const cards = CARDS || [];

  const rarityLabel: Record<string, string> = {
    common: '일반',
    rare: '희귀',
    special: '특별',
    legendary: '전설',
  };

  const rarityBadge: Record<string, { color: string; label: string } | null> = {
    common: null,
    rare: { color: '#60a5fa', label: '희귀' },
    special: { color: '#34d399', label: '특별' },
    legendary: { color: '#fbbf24', label: '전설' },
  };

  const getCardGrowthState = (cardId: string): CardGrowthState => {
    return cardGrowth[cardId] || { rarity: 'common', growthCount: 0, enhancementLevel: 0, specializationCount: 0, traits: [] };
  };

  const getNextPromotionInfo = (growth: CardGrowthState) => {
    const { growthCount, rarity } = growth;
    if (rarity === 'legendary') return null;
    if (growthCount < 1) return { target: '희귀', remaining: 1 - growthCount };
    if (growthCount < 3) return { target: '특별', remaining: 3 - growthCount };
    if (growthCount < 5) return { target: '전설', remaining: 5 - growthCount };
    return null;
  };

  const handleSelectCard = (cardId: string) => {
    setSelectedCard(cardId);
    setShowCardModal(false);
    setGrowthMode('select');
  };

  const handleStartSpecialize = () => {
    if (!selectedCard) return;
    const growth = getCardGrowthState(selectedCard);
    const options = generateSpecializationOptions(growth.traits);
    setSpecOptions(options);
    setSelectedOption(null);
    setGrowthMode('specialize');
  };

  // 현재 선택된 카드의 강화 비용 계산
  const getEnhancementCost = (cardId: string): number => {
    const growth = getCardGrowthState(cardId);
    const nextLevel = (growth.enhancementLevel || 0) + 1;
    return ENHANCEMENT_COST[nextLevel] || 0;
  };

  // 알림 표시 헬퍼
  const showNotification = (notif: GrowthNotification) => {
    setNotification(notif);
    setAnimateCard(true);
    // 3초 후 알림 숨김
    setTimeout(() => {
      setNotification(null);
      setAnimateCard(false);
    }, 3000);
  };

  const handleConfirmEnhance = () => {
    if (!selectedCard) return;
    const cost = getEnhancementCost(selectedCard);
    if (gold < cost) return; // 골드 부족

    const cardName = cards.find(c => c.id === selectedCard)?.name || selectedCard;
    const currentLevel = getCardGrowthState(selectedCard).enhancementLevel || 0;
    const newLevel = currentLevel + 1;

    spendGold(cost);
    onEnhance(selectedCard);

    // 성공 알림
    showNotification({
      message: `+${newLevel} 강화 성공!`,
      type: 'enhance',
      cardName,
    });

    setGrowthMode('select');
  };

  const handleConfirmSpecialize = () => {
    if (!selectedCard || !selectedOption) return;
    if (gold < SPECIALIZATION_COST) return; // 골드 부족

    const cardName = cards.find(c => c.id === selectedCard)?.name || selectedCard;
    const traitNames = selectedOption.traits.map(t => t.name).join(', ');

    spendGold(SPECIALIZATION_COST);
    const traitIds = selectedOption.traits.map(t => t.id);
    onSpecialize(selectedCard, traitIds);

    // 성공 알림
    showNotification({
      message: `특화 성공! [${traitNames}]`,
      type: 'specialize',
      cardName,
    });

    setGrowthMode('select');
    setSelectedOption(null);
  };

  const selected = cards.find((c) => c.id === selectedCard);
  const selectedGrowth = selectedCard ? getCardGrowthState(selectedCard) : null;
  const promotionInfo = selectedGrowth ? getNextPromotionInfo(selectedGrowth) : null;

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

      <button className="btn" onClick={() => setShowCardModal(true)}>
        카드 선택
      </button>

      {selected && selectedGrowth && (
        <div style={{ fontSize: "13px", color: "#9ca3af" }}>
          <div>{selected.name} - {rarityLabel[selectedGrowth.rarity]} ({selectedGrowth.growthCount}/5)</div>
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
          <button className="btn" onClick={() => setGrowthMode('enhance')}>
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
          onCancel={() => setGrowthMode('select')}
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
            <button className="btn" onClick={() => setGrowthMode('select')}>취소</button>
          </div>
        </div>
      )}

      {/* 카드 선택 모달 */}
      {showCardModal && (
        <div className="event-modal-overlay" onClick={() => setShowCardModal(false)}>
          <div className="event-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px" }}>
            <header>
              <h3>성장시킬 카드 선택</h3>
              <small>강화: 스탯 향상 / 특화: 특성 부여</small>
            </header>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", maxHeight: "400px", overflowY: "auto" }}>
              {cards.map((card) => {
                const growth = getCardGrowthState(card.id);
                const badge = rarityBadge[growth.rarity];
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
              <button className="btn" onClick={() => setShowCardModal(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 강화 미리보기 패널 */
function EnhancePreviewPanel({
  cardId,
  cardName,
  currentLevel,
  gold,
  cost,
  onConfirm,
  onCancel,
}: {
  cardId: string;
  cardName: string;
  currentLevel: number;
  gold: number;
  cost: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const nextPreview = getNextEnhancementPreview(cardId, currentLevel);
  const allLevels = getAllEnhancementLevels(cardId);
  const canEnhance = isEnhanceable(cardId) && currentLevel < 5;
  const canAfford = gold >= cost;

  // 현재 누적 스탯
  const currentStats = currentLevel > 0 ? calculateEnhancedStats(cardId, currentLevel) : null;
  // 다음 레벨 누적 스탯
  const nextStats = canEnhance ? calculateEnhancedStats(cardId, currentLevel + 1) : null;

  return (
    <div style={{ padding: "12px", background: "rgba(96, 165, 250, 0.1)", borderRadius: "8px", border: "1px solid rgba(96, 165, 250, 0.3)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div style={{ fontWeight: 700, color: "#60a5fa" }}>⚔️ 강화</div>
        {currentLevel > 0 && (
          <span style={{
            fontSize: "12px",
            padding: "2px 8px",
            borderRadius: "4px",
            background: getEnhancementColor(currentLevel),
            color: "#0f172a",
            fontWeight: 700,
          }}>
            현재 {getEnhancementLabel(currentLevel)}
          </span>
        )}
      </div>

      {/* 카드가 강화 가능한 경우 */}
      {canEnhance && nextPreview ? (
        <>
          {/* 다음 강화 효과 */}
          <div style={{
            padding: "10px",
            background: "rgba(15, 23, 42, 0.8)",
            borderRadius: "6px",
            marginBottom: "10px",
            border: nextPreview.isMilestone ? "1px solid rgba(251, 191, 36, 0.5)" : "1px solid rgba(71, 85, 105, 0.5)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "13px", color: "#9ca3af" }}>
                {cardName} → {getEnhancementLabel(nextPreview.level)}
              </span>
              {(nextPreview.level === 1 || nextPreview.level === 3 || nextPreview.level === 5) && (
                <span style={{
                  fontSize: "11px",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: nextPreview.level === 5 ? "rgba(251, 191, 36, 0.2)" : nextPreview.level === 3 ? "rgba(167, 139, 250, 0.2)" : "rgba(96, 165, 250, 0.2)",
                  color: nextPreview.level === 5 ? "#fbbf24" : nextPreview.level === 3 ? "#a78bfa" : "#60a5fa",
                  border: nextPreview.level === 5 ? "1px solid rgba(251, 191, 36, 0.4)" : nextPreview.level === 3 ? "1px solid rgba(167, 139, 250, 0.4)" : "1px solid rgba(96, 165, 250, 0.4)"
                }}>
                  {nextPreview.level === 1 ? '희귀 등급' : nextPreview.level === 3 ? '특별 등급' : '전설 등급'}
                </span>
              )}
            </div>
            <div style={{
              fontSize: "14px",
              color: getEnhancementColor(nextPreview.level),
              fontWeight: 600
            }}>
              {nextPreview.description}
            </div>
          </div>

          {/* 누적 스탯 변화 미리보기 */}
          {nextStats && (
            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "6px" }}>총 누적 효과:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {nextStats.damageBonus > 0 && (
                  <StatBadge label="피해" value={`+${nextStats.damageBonus}`} color="#f87171" />
                )}
                {nextStats.blockBonus > 0 && (
                  <StatBadge label="방어" value={`+${nextStats.blockBonus}`} color="#60a5fa" />
                )}
                {nextStats.speedCostReduction > 0 && (
                  <StatBadge label="속도" value={`-${nextStats.speedCostReduction}`} color="#4ade80" />
                )}
                {nextStats.actionCostReduction > 0 && (
                  <StatBadge label="행동력" value={`-${nextStats.actionCostReduction}`} color="#fbbf24" />
                )}
                {nextStats.hitsBonus > 0 && (
                  <StatBadge label="타격" value={`+${nextStats.hitsBonus}`} color="#f472b6" />
                )}
                {nextStats.specialEffects.length > 0 && (
                  <span style={{
                    fontSize: "11px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: "rgba(167, 139, 250, 0.2)",
                    color: "#a78bfa",
                    border: "1px solid rgba(167, 139, 250, 0.4)"
                  }}>
                    ✨ 특수효과 {nextStats.specialEffects.length}개
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 전체 강화 단계 표시 */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "6px" }}>강화 진행:</div>
            <div style={{ display: "flex", gap: "4px" }}>
              {allLevels.map((level) => (
                <div
                  key={level.level}
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: 700,
                    background: level.level <= currentLevel
                      ? getEnhancementColor(level.level)
                      : level.level === currentLevel + 1
                        ? "rgba(96, 165, 250, 0.3)"
                        : "rgba(71, 85, 105, 0.3)",
                    color: level.level <= currentLevel ? "#0f172a" : "#9ca3af",
                    border: level.isMilestone
                      ? "2px solid rgba(251, 191, 36, 0.6)"
                      : "1px solid rgba(71, 85, 105, 0.5)",
                  }}
                  title={level.description}
                >
                  {level.level}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : !canEnhance ? (
        <div style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "10px" }}>
          {currentLevel >= 5 ? "최대 강화에 도달했습니다." : "이 카드는 강화할 수 없습니다."}
        </div>
      ) : null}

      {/* 비용 표시 */}
      {canEnhance && (
        <div style={{
          marginBottom: "10px",
          padding: "8px",
          background: canAfford ? "rgba(251, 191, 36, 0.1)" : "rgba(239, 68, 68, 0.1)",
          borderRadius: "6px",
          border: canAfford ? "1px solid rgba(251, 191, 36, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span style={{ fontSize: "13px", color: "#9ca3af" }}>강화 비용:</span>
          <span style={{
            fontSize: "14px",
            fontWeight: 700,
            color: canAfford ? "#fbbf24" : "#ef4444"
          }}>
            💰 {cost} (보유: {gold})
          </span>
        </div>
      )}

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          className="btn"
          onClick={onConfirm}
          disabled={!canEnhance || !canAfford}
          style={{
            background: canEnhance && canAfford ? "rgba(96, 165, 250, 0.2)" : undefined,
            opacity: !canAfford ? 0.5 : 1
          }}
        >
          {canAfford ? "강화 확정" : "골드 부족"}
        </button>
        <button className="btn" onClick={onCancel}>취소</button>
      </div>
    </div>
  );
}

/** 스탯 뱃지 컴포넌트 */
const StatBadge = memo(function StatBadge({ label, value, color }: { label: string; value: string; color: string }) {
  const style: CSSProperties = {
    fontSize: "11px",
    padding: "2px 6px",
    borderRadius: "4px",
    background: `${color}20`,
    color: color,
    border: `1px solid ${color}40`
  };
  return (
    <span style={style}>
      {label} {value}
    </span>
  );
});
