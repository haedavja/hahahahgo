/**
 * RestModal.tsx
 * 휴식/각성 모달 컴포넌트
 *
 * 카드 성장 시스템:
 * - 강화: 스탯 향상 (데미지, 방어력, 속도 등)
 * - 특화: 랜덤 5개 특성 중 선택하여 부여
 * - 승격: 성장 횟수에 따른 등급 상승 (1회→희귀, 3회→특별, 5회→전설)
 */

import { useState } from 'react';
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

// 자아 형성 규칙
const EGO_RULES = [
  { ego: '헌신', parts: ['열정적', '용맹함'], emoji: '💪' },
  { ego: '지략', parts: ['냉철함', '용맹함'], emoji: '🧠' },
  { ego: '추격', parts: ['철저함', '용맹함'], emoji: '💨' },
  { ego: '역동', parts: ['활력적', '용맹함'], emoji: '🌟' },
  { ego: '결의', parts: ['굳건함', '냉철함'], emoji: '❤️' },
  { ego: '추진', parts: ['굳건함', '활력적'], emoji: '💪' },
  { ego: '신념', parts: ['굳건함', '열정적'], emoji: '✨' },
  { ego: '완성', parts: ['굳건함', '철저함'], emoji: '💎' },
  { ego: '분석', parts: ['냉철함', '열정적'], emoji: '👁️' },
  { ego: '실행', parts: ['냉철함', '철저함'], emoji: '⏱️' },
  { ego: '정열', parts: ['활력적', '열정적'], emoji: '🔥' },
  { ego: '지배', parts: ['활력적', '철저함'], emoji: '❄️' },
];

const TRAIT_EFFECT_DESC = {
  '용맹함': '힘 +1',
  '굳건함': '체력 +10',
  '냉철함': '통찰 +1',
  '철저함': '보조슬롯 +1',
  '열정적': '속도 +5',
  '활력적': '행동력 +1',
};

const REFLECTION_DESC = {
  '헌신': '공세 획득',
  '지략': '수세 획득',
  '추격': '흐릿함 획득',
  '역동': '행동력 +1',
  '결의': '체력 2% 회복',
  '추진': '힘 +1',
  '신념': '면역 +1',
  '완성': '에테르 1.5배',
  '분석': '통찰 +1',
  '실행': '타임라인 +5',
  '정열': '민첩 +1',
  '지배': '적 동결',
};

export function RestModal({
  memoryValue,
  playerHp,
  maxHp,
  canAwaken,
  playerTraits,
  canFormEgo,
  cardUpgrades,
  cardGrowth,
  closeRest,
  awakenAtRest,
  healAtRest,
  upgradeCardRarity,
  enhanceCard,
  specializeCard,
  formEgo,
}: {
  memoryValue: number;
  playerHp: number;
  maxHp: number;
  canAwaken: boolean;
  playerTraits: string[];
  canFormEgo: boolean;
  cardUpgrades: Record<string, string>;
  cardGrowth: Record<string, CardGrowthState>;
  closeRest: () => void;
  awakenAtRest: (type: string) => void;
  healAtRest: (amount: number) => void;
  upgradeCardRarity: (cardId: string) => void;
  enhanceCard: (cardId: string) => void;
  specializeCard: (cardId: string, selectedTraits: string[]) => void;
  formEgo: (traits: string[]) => void;
}) {
  const [egoFormMode, setEgoFormMode] = useState(false);
  const [selectedTraitsForEgo, setSelectedTraitsForEgo] = useState<number[]>([]);

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
              <CardGrowthPanel
                cardGrowth={cardGrowth}
                onEnhance={enhanceCard}
                onSpecialize={specializeCard}
              />
            </div>
          </div>
          <div className="choice-card">
            <strong>자아 형성</strong>
            <div style={{ marginTop: "8px" }}>
              <button
                className="btn"
                disabled={!canFormEgo}
                onClick={() => {
                  setEgoFormMode(true);
                  setSelectedTraitsForEgo([]);
                }}
              >
                {canFormEgo ? `개성 5개 소모 (보유: ${playerTraits.length}개)` : `개성 부족 (${playerTraits.length}/5)`}
              </button>
            </div>
          </div>
        </div>

        {/* 자아 형성 모드 */}
        {egoFormMode && (
          <EgoFormPanel
            playerTraits={playerTraits}
            selectedTraitsForEgo={selectedTraitsForEgo}
            setSelectedTraitsForEgo={setSelectedTraitsForEgo}
            formEgo={formEgo}
            setEgoFormMode={setEgoFormMode}
          />
        )}

        <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
          <button className="btn" onClick={() => { closeRest(); setEgoFormMode(false); setSelectedTraitsForEgo([]); }}>닫기</button>
        </div>
      </div>
    </div>
  );
}

function EgoFormPanel({
  playerTraits,
  selectedTraitsForEgo,
  setSelectedTraitsForEgo,
  formEgo,
  setEgoFormMode,
}: {
  playerTraits: string[];
  selectedTraitsForEgo: number[];
  setSelectedTraitsForEgo: React.Dispatch<React.SetStateAction<number[]>>;
  formEgo: (traits: string[]) => void;
  setEgoFormMode: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const selectedTraitNames = selectedTraitsForEgo.map((idx) => playerTraits[idx]);
  const traitCounts: Record<string, number> = selectedTraitNames.reduce((acc: Record<string, number>, t) => {
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  let previewEgo: string | null = null;
  let previewEmoji = '';
  let bestScore = 0;
  for (const { ego, parts, emoji } of EGO_RULES) {
    const score = (traitCounts[parts[0]] || 0) + (traitCounts[parts[1]] || 0);
    if (score > bestScore) {
      bestScore = score;
      previewEgo = ego;
      previewEmoji = emoji;
    }
  }

  // 효과 합산
  const effectSummary: Record<string, number> = {};
  for (const trait of selectedTraitNames) {
    const desc = (TRAIT_EFFECT_DESC as Record<string, string>)[trait];
    if (desc) {
      effectSummary[desc] = (effectSummary[desc] || 0) + 1;
    }
  }
  const effectText = Object.entries(effectSummary)
    .map(([effect, count]) => {
      const match = effect.match(/(.+?)([+-]?\d+)/);
      if (match) {
        return `${match[1]}${parseInt(match[2]) * (count as number) > 0 ? '+' : ''}${parseInt(match[2]) * (count as number)}`;
      }
      return `${effect} x${count}`;
    })
    .join(', ');

  return (
    <div style={{ marginTop: "16px", padding: "12px", background: "rgba(253, 230, 138, 0.1)", borderRadius: "8px", border: "1px solid rgba(253, 230, 138, 0.3)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <strong style={{ color: "#fde68a" }}>✨ 자아 형성 - 개성 5개 선택</strong>
        <span style={{ color: "#9ca3af" }}>선택: {selectedTraitsForEgo.length}/5</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
        {playerTraits.map((trait, idx) => {
          const isSelected = selectedTraitsForEgo.includes(idx);
          const canSelect = !isSelected && selectedTraitsForEgo.length < 5;
          return (
            <button
              key={idx}
              className="btn"
              style={{
                background: isSelected ? "rgba(253, 230, 138, 0.3)" : "rgba(30, 41, 59, 0.8)",
                border: isSelected ? "2px solid #fde68a" : "1px solid #475569",
                color: isSelected ? "#fde68a" : "#e2e8f0",
                opacity: canSelect || isSelected ? 1 : 0.5,
              }}
              onClick={() => {
                if (isSelected) {
                  setSelectedTraitsForEgo((prev) => prev.filter((i) => i !== idx));
                } else if (canSelect) {
                  setSelectedTraitsForEgo((prev) => [...prev, idx]);
                }
              }}
            >
              {trait}
            </button>
          );
        })}
      </div>

      {/* 자아 미리보기 */}
      {selectedTraitsForEgo.length > 0 && (
        <div style={{
          marginBottom: "12px",
          padding: "10px",
          background: "rgba(15, 23, 42, 0.8)",
          borderRadius: "6px",
          border: previewEgo ? "1px solid rgba(134, 239, 172, 0.3)" : "1px solid rgba(100, 116, 139, 0.3)"
        }}>
          <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "4px" }}>미리보기</div>
          {previewEgo ? (
            <>
              <div style={{ fontSize: "16px", color: "#fde68a", fontWeight: "bold" }}>
                {previewEmoji} {previewEgo}
              </div>
              <div style={{ fontSize: "13px", color: "#86efac", marginTop: "4px" }}>
                효과: {effectText || '없음'}
              </div>
              <div style={{ fontSize: "13px", color: "#7dd3fc", marginTop: "2px" }}>
                성찰: 매 턴 확률로 {REFLECTION_DESC[previewEgo as keyof typeof REFLECTION_DESC]}
              </div>
            </>
          ) : (
            <div style={{ fontSize: "14px", color: "#fbbf24" }}>
              조합에 해당하는 자아 없음 (기본: 각성)
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          className="btn"
          disabled={selectedTraitsForEgo.length !== 5}
          onClick={() => {
            const traitsToConsume = selectedTraitsForEgo.map((idx) => playerTraits[idx]);
            formEgo(traitsToConsume);
            setEgoFormMode(false);
            setSelectedTraitsForEgo([]);
          }}
          style={{ background: selectedTraitsForEgo.length === 5 ? "rgba(134, 239, 172, 0.2)" : undefined }}
        >
          자아 형성
        </button>
        <button
          className="btn"
          onClick={() => {
            setEgoFormMode(false);
            setSelectedTraitsForEgo([]);
          }}
        >
          취소
        </button>
      </div>
    </div>
  );
}

/** 카드 성장 패널 (강화/특화) */
function CardGrowthPanel({
  cardGrowth,
  onEnhance,
  onSpecialize,
}: {
  cardGrowth: Record<string, CardGrowthState>;
  onEnhance: (cardId: string) => void;
  onSpecialize: (cardId: string, selectedTraits: string[]) => void;
}) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [growthMode, setGrowthMode] = useState<'select' | 'enhance' | 'specialize'>('select');
  const [specOptions, setSpecOptions] = useState<SpecializationOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<SpecializationOption | null>(null);

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

  const handleConfirmEnhance = () => {
    if (!selectedCard) return;
    onEnhance(selectedCard);
    setGrowthMode('select');
  };

  const handleConfirmSpecialize = () => {
    if (!selectedCard || !selectedOption) return;
    const traitIds = selectedOption.traits.map(t => t.id);
    onSpecialize(selectedCard, traitIds);
    setGrowthMode('select');
    setSelectedOption(null);
  };

  const selected = cards.find((c) => c.id === selectedCard);
  const selectedGrowth = selectedCard ? getCardGrowthState(selectedCard) : null;
  const promotionInfo = selectedGrowth ? getNextPromotionInfo(selectedGrowth) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ fontWeight: 700 }}>카드 성장</div>
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
          <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
            <button
              className="btn"
              onClick={handleConfirmSpecialize}
              disabled={!selectedOption}
              style={{ background: selectedOption ? "rgba(134, 239, 172, 0.2)" : undefined }}
            >
              특화 확정
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
  onConfirm,
  onCancel,
}: {
  cardId: string;
  cardName: string;
  currentLevel: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const nextPreview = getNextEnhancementPreview(cardId, currentLevel);
  const allLevels = getAllEnhancementLevels(cardId);
  const canEnhance = isEnhanceable(cardId) && currentLevel < 5;

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
              {nextPreview.isMilestone && (
                <span style={{
                  fontSize: "11px",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: "rgba(251, 191, 36, 0.2)",
                  color: "#fbbf24",
                  border: "1px solid rgba(251, 191, 36, 0.4)"
                }}>
                  ★ 마일스톤
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

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          className="btn"
          onClick={onConfirm}
          disabled={!canEnhance}
          style={{ background: canEnhance ? "rgba(96, 165, 250, 0.2)" : undefined }}
        >
          강화 확정
        </button>
        <button className="btn" onClick={onCancel}>취소</button>
      </div>
    </div>
  );
}

/** 스탯 뱃지 컴포넌트 */
function StatBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span style={{
      fontSize: "11px",
      padding: "2px 6px",
      borderRadius: "4px",
      background: `${color}20`,
      color: color,
      border: `1px solid ${color}40`
    }}>
      {label} {value}
    </span>
  );
}
