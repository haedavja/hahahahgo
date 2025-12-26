/**
 * RestModal.jsx
 * 휴식/각성 모달 컴포넌트
 */

import { useState } from 'react';
import { CARDS } from '../../battle/battleData';
import { CARD_ETHER_BY_RARITY } from '../../battle/utils/etherCalculations';

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
  closeRest,
  awakenAtRest,
  healAtRest,
  upgradeCardRarity,
  formEgo,
}) {
  const [egoFormMode, setEgoFormMode] = useState(false);
  const [selectedTraitsForEgo, setSelectedTraitsForEgo] = useState([]);

  return (
    <div className="event-modal-overlay" onClick={closeRest}>
      <div className="event-modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h3>휴식 · 각성</h3>
          <small>기억 100 소모 시 각성, 체력 회복 또는 카드 강화 선택</small>
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
              <RestUpgradePanel cardUpgrades={cardUpgrades} onUpgrade={upgradeCardRarity} />
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
}) {
  const selectedTraitNames = selectedTraitsForEgo.map(idx => playerTraits[idx]);
  const traitCounts = selectedTraitNames.reduce((acc, t) => {
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {} as any);

  let previewEgo = null;
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
  const effectSummary = {} as any;
  for (const trait of selectedTraitNames) {
    const desc = (TRAIT_EFFECT_DESC as any)[trait];
    if (desc) {
      effectSummary[desc] = (effectSummary[desc] || 0) + 1;
    }
  }
  const effectText = Object.entries(effectSummary)
    .map(([effect, count]) => {
      const match = effect.match(/(.+?)([+-]?\d+)/);
      if (match) {
        return `${match[1]}${parseInt(match[2]) * (count as any) > 0 ? '+' : ''}${parseInt(match[2]) * (count as any)}`;
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
                  setSelectedTraitsForEgo(prev => prev.filter(i => i !== idx));
                } else if (canSelect) {
                  setSelectedTraitsForEgo(prev => [...prev, idx]);
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
                성찰: 매 턴 확률로 {REFLECTION_DESC[previewEgo]}
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
            const traitsToConsume = selectedTraitsForEgo.map(idx => playerTraits[idx]);
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

function RestUpgradePanel({ cardUpgrades, onUpgrade }) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const cards = CARDS || [];
  const rarityOrder = ['common', 'rare', 'special', 'legendary'];
  const rarityLabel = {
    common: '일반',
    rare: '희귀',
    special: '특별',
    legendary: '전설',
  };
  const rarityBadge = {
    common: null,
    rare: { color: '#60a5fa', label: '희귀' },
    special: { color: '#34d399', label: '특별' },
    legendary: { color: '#fbbf24', label: '전설' },
  };

  const getNextRarity = (card) => {
    const current = cardUpgrades[card.id] || card.rarity || 'common';
    const idx = rarityOrder.indexOf(current);
    if (idx === -1 || idx >= rarityOrder.length - 1) return null;
    return rarityOrder[idx + 1];
  };

  const handleUpgrade = () => {
    const card = cards.find((c) => c.id === selectedCard);
    if (!card) return;
    const next = getNextRarity(card);
    if (!next) return;
    onUpgrade(card.id);
  };

  const selected = cards.find((c) => c.id === selectedCard);
  const currentRarity = selected ? (cardUpgrades[selected.id] || (selected as any).rarity || 'common') : null;
  const nextRarity = selected ? getNextRarity(selected) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ fontWeight: 700 }}>카드 강화</div>
      <button className="btn" onClick={() => setShowModal(true)}>
        카드 선택
      </button>
      {selected && (
        <div style={{ fontSize: "13px", color: "#9ca3af" }}>
          현재 등급: {rarityLabel[currentRarity]} {nextRarity ? `→ 다음: ${rarityLabel[nextRarity]}` : '(최고 등급)'}
        </div>
      )}
      <button
        className="btn"
        onClick={handleUpgrade}
        disabled={!selected || !nextRarity}
      >
        강화하기
      </button>

      {showModal && (
        <div className="event-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="event-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "640px" }}>
            <header>
              <h3>강화할 카드 선택</h3>
            </header>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", maxHeight: "400px", overflowY: "auto" }}>
              {cards.map((card) => {
                const current = cardUpgrades[card.id] || (card as any).rarity || 'common';
                const badge = rarityBadge[current];
                return (
                  <button
                    key={card.id}
                    className="choice-card"
                    style={{
                      textAlign: "left",
                      borderColor: selectedCard === card.id ? "#fbbf24" : "rgba(148,163,184,0.4)",
                      boxShadow: selectedCard === card.id ? "0 0 10px rgba(251,191,36,0.6)" : "none"
                    }}
                    onClick={() => setSelectedCard(card.id)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong>{card.name}</strong>
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
                    <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
                      {card.description || ''}
                    </div>
                    <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "6px" }}>
                      행동력 {card.actionCost} · 속도 {card.speedCost} · 에테르 {CARD_ETHER_BY_RARITY[current]}
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button className="btn" onClick={() => setShowModal(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
