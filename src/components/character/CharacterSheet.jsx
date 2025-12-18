import { useState, useEffect, useRef, useMemo } from "react";
import { useGameStore } from "../../state/gameStore";
import { CARDS, TRAITS } from "../battle/battleData";
import { calculatePassiveEffects } from "../../lib/relicEffects";
import { getReflectionsByEgos, getTraitCountBonus, REFLECTIONS } from "../../data/reflections";
import { TraitBadgeList } from "../battle/ui/TraitBadge.jsx";
import { Sword, Shield } from "../battle/ui/BattleIcons";

const TRAIT_EFFECTS = {
  용맹함: { label: "힘", value: 1 },
  굳건함: { label: "최대 체력", value: 10 },
  냉철함: { label: "통찰", value: 1 },
  철저함: { label: "보조 슬롯", value: 1 },
  열정적: { label: "최대 속도", value: 5 },
  활력적: { label: "행동력", value: 1 },
};

// 모든 카드를 사용 가능하도록 변경
const availableCards = CARDS.map((card, index) => ({
  id: card.id,
  slot: index + 1,
  name: card.name,
  type: card.type,
  speed: card.speedCost,
  ap: card.actionCost,
  desc: `${card.damage ? `공격력 ${card.damage}${card.hits ? ` x${card.hits}` : ''}` : ''}${card.block ? `방어력 ${card.block}` : ''}${card.counter !== undefined ? ` 반격 ${card.counter}` : ''}`,
  traits: card.traits || [],
  description: card.description,
}));

export function CharacterSheet({ onClose, showAllCards = false }) {
  const characterBuild = useGameStore((state) => state.characterBuild);
  const updateCharacterBuild = useGameStore((state) => state.updateCharacterBuild);
  const playerHp = useGameStore((state) => state.playerHp);
  const maxHp = useGameStore((state) => state.maxHp);
  const playerStrength = useGameStore((state) => state.playerStrength);
  const playerAgility = useGameStore((state) => state.playerAgility);
  const playerEnergyBonus = useGameStore((state) => state.playerEnergyBonus || 0);
  const playerMaxSpeedBonus = useGameStore((state) => state.playerMaxSpeedBonus || 0);
  const extraSubSpecialSlots = useGameStore((state) => state.extraSubSpecialSlots || 0);
  const playerInsight = useGameStore((state) => state.playerInsight || 0);
  const playerTraits = useGameStore((state) => state.playerTraits ?? []);
  const playerEgos = useGameStore((state) => state.playerEgos ?? []);
  const relics = useGameStore((state) => state.relics);

  // 상징 패시브 효과 계산
  const passiveEffects = useMemo(() => {
    return calculatePassiveEffects(relics || []);
  }, [relics]);

  // 활성화된 성찰 및 확률 계산 (획득한 자아 기준)
  const activeReflectionsInfo = useMemo(() => {
    if (!playerEgos || playerEgos.length === 0) return [];
    // 획득한 자아에 해당하는 성찰만 가져옴
    const activeReflections = getReflectionsByEgos(playerEgos);
    const probabilityBonus = getTraitCountBonus(playerTraits.length);

    return activeReflections.map(r => ({
      ...r,
      finalProbability: Math.min(1, r.probability + probabilityBonus)
    }));
  }, [playerTraits, playerEgos]);

  // 현재 스탯
  const currentHp = playerHp;
  const baseEnergy = 6 + playerEnergyBonus;
  const currentEnergy = baseEnergy;
  const maxEnergy = baseEnergy + passiveEffects.maxEnergy;
  const speed = 30 + playerMaxSpeedBonus;
  const power = playerStrength || 0;
  const agility = playerAgility || 0;

  // 슬롯 제한 (상징 효과 반영)
  const maxMainSlots = 3 + passiveEffects.mainSpecialSlots;
  const maxSubSlots = 5 + passiveEffects.subSpecialSlots + extraSubSpecialSlots;

  const traitCounts = useMemo(() => {
    return (playerTraits || []).reduce((acc, t) => {
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});
  }, [playerTraits]);

  const formatTraitEffect = (traitId, count) => {
    const effect = TRAIT_EFFECTS[traitId];
    if (!effect) return count > 1 ? `${traitId} (x${count})` : traitId;
    const total = effect.value * count;
    return `${traitId} ${count > 1 ? `(x${count})` : ""} (${effect.label} +${total})`;
  };

  const [specialMode, setSpecialMode] = useState("main");
  // cardId로 선택 상태 관리 - 초기화는 한 번만
  const [mainSpecials, setMainSpecials] = useState([]);
  const [subSpecials, setSubSpecials] = useState([]);
  const [initialized, setInitialized] = useState(false);

  // 툴팁 상태
  const [hoveredTrait, setHoveredTrait] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showEgoTooltip, setShowEgoTooltip] = useState(false);
  const [egoTooltipPosition, setEgoTooltipPosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showCardTooltip, setShowCardTooltip] = useState(false);
  const cardTooltipTimerRef = useRef(null);

  // 보유 카드 목록 모달
  const [showOwnedCards, setShowOwnedCards] = useState(false);

  // 컴포넌트 마운트 시 한 번만 스토어에서 로드
  useEffect(() => {
    if (!initialized && characterBuild) {
      setMainSpecials(characterBuild.mainSpecials || []);
      setSubSpecials(characterBuild.subSpecials || []);
      setInitialized(true);
    }
  }, [initialized, characterBuild]);

  // 선택 사항이 변경될 때마다 게임 스토어에 저장
  useEffect(() => {
    if (initialized) {
      updateCharacterBuild(mainSpecials, subSpecials);
    }
  }, [mainSpecials, subSpecials, initialized, updateCharacterBuild]);

  // 카드 개수 카운트 헬퍼
  const getCardCount = (cardId, list) => list.filter(id => id === cardId).length;

  // 대기 카드 (상점 구매 등)
  const ownedCards = characterBuild?.ownedCards || [];

  // 표시할 카드 목록 (showAllCards가 false면 소유 카드만, 중복 포함)
  const displayedCards = useMemo(() => {
    if (showAllCards) {
      return availableCards.map((card, idx) => ({ ...card, _displayKey: `all_${card.id}_${idx}` }));
    }
    // 각 카드를 개별 인스턴스로 표시 (중복 포함)
    const result = [];
    // 주특기 카드들
    mainSpecials.forEach((cardId, idx) => {
      const card = CARDS.find(c => c.id === cardId);
      if (card) result.push({ ...card, _displayKey: `main_${cardId}_${idx}`, _type: 'main' });
    });
    // 보조특기 카드들
    subSpecials.forEach((cardId, idx) => {
      const card = CARDS.find(c => c.id === cardId);
      if (card) result.push({ ...card, _displayKey: `sub_${cardId}_${idx}`, _type: 'sub' });
    });
    // 대기 카드들 (주특기/보조특기에 배치된 수를 제외한 나머지)
    // 각 카드별 사용된 수 계산
    const usedCounts = {};
    [...mainSpecials, ...subSpecials].forEach(cardId => {
      usedCounts[cardId] = (usedCounts[cardId] || 0) + 1;
    });
    // 보유 카드에서 사용된 수만큼 제외하고 나머지 표시
    const shownCounts = {};
    ownedCards.forEach((cardId, idx) => {
      shownCounts[cardId] = (shownCounts[cardId] || 0) + 1;
      const used = usedCounts[cardId] || 0;
      // 이미 표시된 수가 (보유 수 - 사용 수)보다 적으면 표시
      if (shownCounts[cardId] <= (ownedCards.filter(id => id === cardId).length - used)) {
        const card = CARDS.find(c => c.id === cardId);
        if (card) result.push({ ...card, _displayKey: `owned_${cardId}_${idx}`, _type: 'owned' });
      }
    });
    return result;
  }, [showAllCards, mainSpecials, subSpecials, ownedCards]);

  const getCardStyle = (cardId) => {
    const mainCount = getCardCount(cardId, mainSpecials);
    const subCount = getCardCount(cardId, subSpecials);
    const isMain = mainCount > 0;
    const isSub = subCount > 0;

    let borderColor = "rgba(118, 134, 185, 0.4)";
    let boxShadow = "none";
    let background = "rgba(8, 11, 19, 0.95)";

    if (isMain) {
      borderColor = "#f5d76e";
      boxShadow = `0 0 ${8 + mainCount * 4}px rgba(245, 215, 110, ${0.4 + mainCount * 0.15})`;
      background = "rgba(42, 38, 21, 0.95)";
    } else if (isSub) {
      borderColor = "#7dd3fc";
      boxShadow = `0 0 ${8 + subCount * 4}px rgba(125, 211, 252, ${0.4 + subCount * 0.15})`;
      background = "rgba(23, 37, 56, 0.95)";
    }

    return {
      borderRadius: "8px",
      padding: "8px 12px",
      marginBottom: "8px",
      background,
      border: `1px solid ${borderColor}`,
      boxShadow,
      transition: "all 0.15s ease",
      cursor: "pointer",
    };
  };

  // 좌클릭: 추가, 우클릭: 제거 (보유 카드 수만큼 선택 가능)
  const handleCardClick = (cardId, isRightClick = false) => {
    // 보유한 카드 수 계산
    const ownedCount = ownedCards.filter(id => id === cardId).length;
    // 이미 선택된 카드 수 (주특기 + 보조특기)
    const usedInMain = mainSpecials.filter(id => id === cardId).length;
    const usedInSub = subSpecials.filter(id => id === cardId).length;
    const totalUsed = usedInMain + usedInSub;

    if (specialMode === "main") {
      setMainSpecials((prev) => {
        if (isRightClick) {
          // 우클릭: 해당 카드 하나만 제거
          const idx = prev.indexOf(cardId);
          if (idx === -1) return prev;
          return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
        }
        // 좌클릭: 추가 (슬롯 제한 + 보유 카드 수 확인)
        if (prev.length >= maxMainSlots) return prev;
        if (totalUsed >= ownedCount) return prev; // 보유 수 초과 불가
        return [...prev, cardId];
      });
    } else {
      setSubSpecials((prev) => {
        if (isRightClick) {
          // 우클릭: 해당 카드 하나만 제거
          const idx = prev.indexOf(cardId);
          if (idx === -1) return prev;
          return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
        }
        // 좌클릭: 추가 (슬롯 제한 + 보유 카드 수 확인)
        if (prev.length >= maxSubSlots) return prev;
        if (totalUsed >= ownedCount) return prev; // 보유 수 초과 불가
        return [...prev, cardId];
      });
    }
  };

  // 툴팁 핸들러
  const handleTraitMouseEnter = (e, trait) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipX = rect.right + 10; // 카드 오른쪽에 배치
    const tooltipY = rect.top;

    setHoveredTrait(trait);
    setTooltipPosition({ x: tooltipX, y: tooltipY });
  };

  const handleTraitMouseLeave = () => {
    setHoveredTrait(null);
  };

  const getModeButtonStyle = (mode) => ({
    flex: 1,
    padding: "8px 12px",
    fontSize: "14px",
    borderRadius: "8px",
    border: "1px solid rgba(118, 134, 185, 0.5)",
    marginRight: mode === "main" ? "8px" : "0",
    background:
      specialMode === mode
        ? mode === "main"
          ? "linear-gradient(135deg, #f5d76e, #c9a64a)"
          : "linear-gradient(135deg, #7dd3fc, #2b6fbf)"
        : "rgba(8, 11, 19, 0.95)",
    color: specialMode === mode ? "#000" : "#9fb6ff",
    fontWeight: specialMode === mode ? 700 : 500,
    cursor: "pointer",
    transition: "all 0.2s ease",
  });

  return (
    <div
      className="dungeon-modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 9999,
        pointerEvents: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "960px",
          maxHeight: "85vh",
          background: "rgba(8, 11, 19, 0.98)",
          borderRadius: "16px",
          border: "1px solid rgba(118, 134, 185, 0.5)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8)",
          padding: "24px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          color: "#9fb6ff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "24px", margin: 0, color: "#fff" }}>캐릭터 창</h2>
            <div style={{ fontSize: "13px", opacity: 0.75, marginTop: "4px", color: "#9fb6ff" }}>
              주특기 / 보조특기 카드 선택
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setShowOwnedCards(true)}
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                borderRadius: "8px",
                border: "1px solid #22c55e",
                background: "rgba(34, 197, 94, 0.2)",
                color: "#22c55e",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              🃏 보유 카드
            </button>
            <button
              type="button"
              onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            style={{
              padding: "6px 12px",
              fontSize: "13px",
              borderRadius: "8px",
              border: "1px solid rgba(118, 134, 185, 0.5)",
              background: "rgba(8, 11, 19, 0.95)",
              color: "#fca5a5",
              cursor: "pointer",
            }}
          >
            닫기
          </button>
          </div>
        </div>

        <div
          style={{
            borderRadius: "12px",
            padding: "12px 16px",
            marginBottom: "16px",
            background: "rgba(5, 8, 13, 0.92)",
            border: "1px solid rgba(118, 134, 185, 0.4)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "14px" }}>
            <span style={{ opacity: 0.8 }}>체력</span>
            <span style={{ fontWeight: 600, color: "#fff" }}>
              {currentHp} / {maxHp}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "14px" }}>
            <span style={{ opacity: 0.8 }}>에너지</span>
            <span style={{ fontWeight: 600, color: "#67e8f9" }}>
              {currentEnergy} / {maxEnergy}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "14px" }}>
            <span style={{ opacity: 0.8 }}>속도</span>
            <span style={{ fontWeight: 600, color: "#7dd3fc" }}>{speed}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "14px" }}>
            <span style={{ opacity: 0.8 }}>힘</span>
            <span style={{ fontWeight: 600, color: power >= 0 ? "#fbbf24" : "#ef4444" }}>{power}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
            <span style={{ opacity: 0.8 }}>민첩</span>
            <span style={{ fontWeight: 600, color: agility >= 0 ? "#34d399" : "#ef4444" }}>{agility}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
            <span style={{ opacity: 0.8 }}>통찰</span>
            <span style={{ fontWeight: 700, color: "#a78bfa" }}>{playerInsight}</span>
          </div>
        </div>

        {/* 개성(각성) 목록 */}
        <div
          style={{
            borderRadius: "12px",
            padding: "12px 16px",
            marginBottom: "16px",
            background: "rgba(5, 8, 13, 0.92)",
            border: "1px solid rgba(118, 134, 185, 0.4)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "14px" }}>
            <span style={{ opacity: 0.8 }}>획득한 개성</span>
          </div>
          {playerTraits && playerTraits.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: "18px", lineHeight: 1.4, color: "#fbbf24" }}>
              {Object.entries(traitCounts).map(([traitId, count]) => (
                <li key={traitId}>{formatTraitEffect(traitId, count)}</li>
              ))}
            </ul>
          ) : (
            <div style={{ color: "#9ca3af", fontSize: "0.9rem" }}>아직 각성한 개성이 없습니다.</div>
          )}
        </div>

        {/* 자아 목록 */}
        <div
          style={{
            borderRadius: "12px",
            padding: "12px 16px",
            marginBottom: "16px",
            background: "rgba(5, 8, 13, 0.92)",
            border: "1px solid rgba(118, 134, 185, 0.4)",
            position: "relative",
          }}
          onMouseEnter={(e) => {
            if (playerEgos && playerEgos.length > 0) {
              const rect = e.currentTarget.getBoundingClientRect();
              setEgoTooltipPosition({ x: rect.right + 10, y: rect.top });
              setShowEgoTooltip(true);
            }
          }}
          onMouseLeave={() => setShowEgoTooltip(false)}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "14px" }}>
            <span style={{ opacity: 0.8 }}>자아</span>
            {playerEgos && playerEgos.length > 0 && (
              <span style={{ opacity: 0.5, fontSize: "12px" }}>hover로 성찰 확인</span>
            )}
          </div>
          {playerEgos && playerEgos.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: "18px", lineHeight: 1.6, color: "#fde68a" }}>
              {playerEgos.map((ego, idx) => {
                const egoName = typeof ego === 'object' ? ego.name : ego;
                const egoKey = typeof ego === 'object' ? `${ego.name}-${idx}` : ego;
                const egoEffects = typeof ego === 'object' ? ego.effects : null;

                // 효과 텍스트 생성
                const effectLabels = {
                  playerStrength: '힘',
                  maxHp: '체력',
                  playerHp: null, // maxHp와 함께 표시되므로 생략
                  playerInsight: '통찰',
                  extraSubSpecialSlots: '보조슬롯',
                  playerMaxSpeedBonus: '속도',
                  playerEnergyBonus: '행동력',
                };

                const effectText = egoEffects ? Object.entries(egoEffects)
                  .filter(([key]) => effectLabels[key])
                  .map(([key, value]) => `${effectLabels[key]}+${value}`)
                  .join(' ') : '';

                return (
                  <li key={egoKey}>
                    {egoName}
                    {effectText && (
                      <span style={{ color: "#86efac", fontSize: "12px", marginLeft: "8px" }}>
                        ({effectText})
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div style={{ color: "#9ca3af", fontSize: "0.9rem" }}>아직 자아가 없습니다.</div>
          )}
        </div>

        {/* 성찰 툴팁 */}
        {showEgoTooltip && activeReflectionsInfo.length > 0 && (
          <div
            style={{
              position: "fixed",
              left: egoTooltipPosition.x,
              top: egoTooltipPosition.y,
              background: "rgba(15, 20, 30, 0.98)",
              border: "1px solid rgba(253, 230, 138, 0.6)",
              borderRadius: "8px",
              padding: "16px 20px",
              zIndex: 9999,
              minWidth: "320px",
              maxWidth: "400px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#fde68a", marginBottom: "12px", borderBottom: "1px solid rgba(253, 230, 138, 0.3)", paddingBottom: "8px" }}>
              ✨ 활성화된 성찰
            </div>
            <div style={{ fontSize: "16px", lineHeight: 1.8 }}>
              {activeReflectionsInfo.map((r) => (
                <div key={r.id} style={{ marginBottom: "8px" }}>
                  <span style={{ color: "#fde68a" }}>{r.emoji} {r.name}</span>
                  <span style={{ color: "#9ca3af", marginLeft: "8px" }}>
                    매 턴 {Math.round(r.finalProbability * 100)}% 확률로 {r.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 슬롯 현황 */}
        <div
          style={{
            borderRadius: "12px",
            padding: "12px 16px",
            background: "rgba(5, 8, 13, 0.92)",
            border: "1px solid rgba(118, 134, 185, 0.4)",
          }}
        >
          <div style={{ fontSize: "14px", opacity: 0.9, color: "#9fb6ff", display: "flex", justifyContent: "space-between" }}>
            <span>주특기: <b style={{ color: "#f5d76e" }}>{mainSpecials.length} / {maxMainSlots}</b></span>
            <span>보조특기: <b style={{ color: "#7dd3fc" }}>{subSpecials.length} / {maxSubSlots}</b></span>
          </div>
        </div>
      </div>

      {/* 보유 카드 및 선택 모달 */}
      {showOwnedCards && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
          }}
          onClick={() => setShowOwnedCards(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '900px',
              maxHeight: '90vh',
              background: 'rgba(8, 11, 19, 0.98)',
              borderRadius: '16px',
              border: '2px solid #22c55e',
              boxShadow: '0 0 40px rgba(34, 197, 94, 0.3)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', margin: 0, color: '#22c55e' }}>🃏 카드 관리</h2>
              <button
                type="button"
                onClick={() => setShowOwnedCards(false)}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid rgba(118, 134, 185, 0.5)',
                  background: 'rgba(8, 11, 19, 0.95)',
                  color: '#fca5a5',
                  cursor: 'pointer',
                }}
              >
                닫기
              </button>
            </div>

            {/* 슬롯 현황 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px 16px',
              marginBottom: '12px',
              background: 'rgba(5, 8, 13, 0.92)',
              borderRadius: '8px',
              border: '1px solid rgba(118, 134, 185, 0.4)',
            }}>
              <span style={{ color: '#9fb6ff', fontSize: '14px' }}>
                주특기: <b style={{ color: '#f5d76e' }}>{mainSpecials.length} / {maxMainSlots}</b>
              </span>
              <span style={{ color: '#9fb6ff', fontSize: '14px' }}>
                보조특기: <b style={{ color: '#7dd3fc' }}>{subSpecials.length} / {maxSubSlots}</b>
              </span>
            </div>

            {/* 모드 선택 버튼 */}
            <div style={{ display: 'flex', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setSpecialMode('main')}
                style={getModeButtonStyle('main')}
              >
                ⭐ 주특기 선택 모드
              </button>
              <button
                type="button"
                onClick={() => setSpecialMode('sub')}
                style={getModeButtonStyle('sub')}
              >
                💠 보조특기 선택 모드
              </button>
            </div>

            {/* 선택 안내 */}
            <div style={{
              fontSize: '12px',
              color: '#9ca3af',
              marginBottom: '12px',
              padding: '8px 12px',
              background: 'rgba(100, 116, 139, 0.1)',
              borderRadius: '6px',
            }}>
              💡 좌클릭: 카드 추가 | 우클릭: 카드 제거
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {/* 현재 보유한 카드 - 전투 스타일 */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{
                  fontSize: '14px',
                  color: specialMode === 'main' ? '#f5d76e' : '#7dd3fc',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  {specialMode === 'main' ? '⭐ 선택된 주특기' : '💠 선택된 보조특기'}
                  <span style={{ opacity: 0.7, fontWeight: 'normal' }}>
                    ({specialMode === 'main' ? mainSpecials.length : subSpecials.length}장)
                  </span>
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', minHeight: '230px', alignItems: 'flex-start' }}>
                  {(specialMode === 'main' ? mainSpecials : subSpecials).map((cardId, idx) => {
                    const card = CARDS.find(c => c.id === cardId);
                    if (!card) return null;
                    const Icon = card.type === 'attack' ? Sword : Shield;
                    const isMainSpecial = specialMode === 'main';
                    const borderColor = isMainSpecial ? '#f5d76e' : '#7dd3fc';
                    return (
                      <div
                        key={`selected-${cardId}-${idx}`}
                        style={{ transform: 'scale(1.1)', transformOrigin: 'top left', width: '170px', height: '220px' }}
                      >
                        <div
                          onClick={() => handleCardClick(cardId, true)}
                          className={`game-card-large no-hover ${card.type === 'attack' ? 'attack' : 'defense'}`}
                          style={{
                            cursor: 'pointer',
                            boxShadow: `0 0 15px ${borderColor}40`,
                            border: `2px solid ${borderColor}`,
                          }}
                          title="클릭하여 제거"
                        >
                          <div className="card-cost-badge-floating" style={{
                            color: isMainSpecial ? '#fcd34d' : '#60a5fa',
                            WebkitTextStroke: '1px #000'
                          }}>
                            {card.actionCost}
                          </div>
                          <div className="card-stats-sidebar">
                            {card.damage != null && card.damage > 0 && (
                              <div className="card-stat-item attack">⚔️{card.damage}{card.hits ? `×${card.hits}` : ''}</div>
                            )}
                            {card.block != null && card.block > 0 && (
                              <div className="card-stat-item defense">🛡️{card.block}</div>
                            )}
                            <div className="card-stat-item speed">⏱️{card.speedCost}</div>
                          </div>
                          <div className="card-header" style={{ display: 'flex', justifyContent: 'center' }}>
                            <div className="font-black text-sm" style={{ color: isMainSpecial ? '#fcd34d' : '#7dd3fc' }}>
                              {card.name}
                            </div>
                          </div>
                          <div className="card-icon-area">
                            <Icon size={50} className="text-white opacity-80" />
                          </div>
                          <div className="card-footer">
                            {card.traits && card.traits.length > 0 && <TraitBadgeList traits={card.traits} />}
                            <span className="card-description">{card.description || ''}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {(specialMode === 'main' ? mainSpecials : subSpecials).length === 0 && (
                    <span style={{ color: '#6b7280', fontSize: '13px', padding: '40px 0' }}>선택된 카드가 없습니다</span>
                  )}
                </div>
              </div>

              {/* 카드 목록 - 전투 스타일 */}
              <h3 style={{ fontSize: '14px', color: '#9fb6ff', marginBottom: '12px' }}>
                📜 {showAllCards ? '전체 카드 목록' : '보유 카드 목록'}
                {!showAllCards && displayedCards.length === 0 && (
                  <span style={{ color: '#64748b', fontWeight: 'normal', marginLeft: '8px' }}>(보유 카드 없음)</span>
                )}
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {displayedCards.map((c) => {
                  const card = c; // displayedCards에 이미 카드 정보 포함
                  if (!card) return null;
                  const Icon = card.type === 'attack' ? Sword : Shield;
                  const isMainSpecial = c._type === 'main';
                  const isSubSpecial = c._type === 'sub';
                  const isOwnedOnly = c._type === 'owned';

                  let borderStyle = {};
                  if (isMainSpecial) {
                    borderStyle = { border: '2px solid #f5d76e', boxShadow: '0 0 10px rgba(245, 215, 110, 0.4)' };
                  } else if (isSubSpecial) {
                    borderStyle = { border: '2px solid #7dd3fc', boxShadow: '0 0 10px rgba(125, 211, 252, 0.4)' };
                  } else if (isOwnedOnly) {
                    borderStyle = { border: '2px solid #64748b', boxShadow: '0 0 10px rgba(100, 116, 139, 0.4)' };
                  }

                  return (
                    <div
                      key={c._displayKey || c.id}
                      style={{ transform: 'scale(1.05)', transformOrigin: 'top left', width: '162px', height: '210px' }}
                    >
                      <div
                        onClick={() => handleCardClick(c.id, false)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          handleCardClick(c.id, true);
                        }}
                        className={`game-card-large no-hover ${card.type === 'attack' ? 'attack' : 'defense'}`}
                        style={{
                          cursor: 'pointer',
                          ...borderStyle,
                        }}
                      >
                        <div className="card-cost-badge-floating" style={{
                          color: isMainSpecial ? '#fcd34d' : isSubSpecial ? '#60a5fa' : isOwnedOnly ? '#94a3b8' : '#fff',
                          WebkitTextStroke: '1px #000'
                        }}>
                          {card.actionCost}
                        </div>
                        {(isMainSpecial || isSubSpecial || isOwnedOnly) && (
                          <div style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-4px',
                            background: isMainSpecial ? '#f5d76e' : isSubSpecial ? '#7dd3fc' : '#64748b',
                            color: isOwnedOnly ? '#fff' : '#000',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            zIndex: 10,
                          }}>
                            {isMainSpecial ? '⭐' : isSubSpecial ? '💠' : '⏳'}
                          </div>
                        )}
                        <div className="card-stats-sidebar">
                          {card.damage != null && card.damage > 0 && (
                            <div className="card-stat-item attack">⚔️{card.damage}{card.hits ? `×${card.hits}` : ''}</div>
                          )}
                          {card.block != null && card.block > 0 && (
                            <div className="card-stat-item defense">🛡️{card.block}</div>
                          )}
                          <div className="card-stat-item speed">⏱️{card.speedCost}</div>
                        </div>
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'center' }}>
                          <div className="font-black text-sm" style={{
                            color: isMainSpecial ? '#fcd34d' : isSubSpecial ? '#7dd3fc' : isOwnedOnly ? '#94a3b8' : '#fff'
                          }}>
                            {card.name}
                          </div>
                        </div>
                        <div className="card-icon-area">
                          <Icon size={50} className="text-white opacity-80" />
                        </div>
                        <div className="card-footer">
                          {card.traits && card.traits.length > 0 && <TraitBadgeList traits={card.traits} />}
                          <span className="card-description">{card.description || ''}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
