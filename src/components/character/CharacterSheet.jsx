import { useState, useEffect, useRef, useMemo } from "react";
import { useGameStore } from "../../state/gameStore";
import { CARDS, TRAITS } from "../battle/battleData";
import { calculatePassiveEffects } from "../../lib/relicEffects";
import { getReflectionsByEgos, getTraitCountBonus, REFLECTIONS } from "../../data/reflections";

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

export function CharacterSheet({ onClose }) {
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

  // 유물 패시브 효과 계산
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

  // 슬롯 제한 (유물 효과 반영)
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

  // 개발자 모드
  const [devMode, setDevMode] = useState(false);
  const [devCardInput, setDevCardInput] = useState("");

  // 툴팁 상태
  const [hoveredTrait, setHoveredTrait] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showEgoTooltip, setShowEgoTooltip] = useState(false);
  const [egoTooltipPosition, setEgoTooltipPosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showCardTooltip, setShowCardTooltip] = useState(false);
  const cardTooltipTimerRef = useRef(null);

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

  // 개발자 모드: 카드 ID로 추가
  const handleDevAddCard = () => {
    const cardId = devCardInput.trim();
    if (!cardId) return;
    const card = CARDS.find(c => c.id === cardId);
    if (!card) {
      alert(`카드 ID "${cardId}"를 찾을 수 없습니다.`);
      return;
    }
    if (specialMode === "main") {
      setMainSpecials(prev => [...prev, cardId]);
    } else {
      setSubSpecials(prev => [...prev, cardId]);
    }
    setDevCardInput("");
  };

  // 좌클릭: 추가, 우클릭: 제거
  const handleCardClick = (cardId, isRightClick = false) => {
    if (specialMode === "main") {
      setMainSpecials((prev) => {
        if (isRightClick) {
          // 우클릭: 하나만 제거
          const idx = prev.lastIndexOf(cardId);
          if (idx !== -1) {
            return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
          }
          return prev;
        }
        // 좌클릭: 추가 (슬롯 제한 확인)
        if (prev.length >= maxMainSlots) return prev;
        return [...prev, cardId];
      });
    } else {
      setSubSpecials((prev) => {
        if (isRightClick) {
          // 우클릭: 하나만 제거
          const idx = prev.lastIndexOf(cardId);
          if (idx !== -1) {
            return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
          }
          return prev;
        }
        // 좌클릭: 추가 (슬롯 제한 확인)
        if (prev.length >= maxSubSlots) return prev;
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
              onClick={() => setDevMode(!devMode)}
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                borderRadius: "8px",
                border: devMode ? "1px solid #f59e0b" : "1px solid rgba(118, 134, 185, 0.5)",
                background: devMode ? "rgba(245, 158, 11, 0.2)" : "rgba(8, 11, 19, 0.95)",
                color: devMode ? "#f59e0b" : "#9fb6ff",
                cursor: "pointer",
              }}
            >
              DEV
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

        {/* 개발자 모드 패널 */}
        {devMode && (
          <div
            style={{
              borderRadius: "12px",
              padding: "12px 16px",
              marginBottom: "16px",
              background: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.4)",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#f59e0b", marginBottom: "8px" }}>
              🛠️ 개발자 모드
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
              <input
                type="text"
                value={devCardInput}
                onChange={(e) => setDevCardInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDevAddCard()}
                placeholder="카드 ID 입력 (예: slash, deflect)"
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  background: "rgba(8, 11, 19, 0.9)",
                  color: "#fff",
                  fontSize: "13px",
                }}
              />
              <button
                type="button"
                onClick={handleDevAddCard}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "1px solid #f59e0b",
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "#000",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {specialMode === "main" ? "주특기 추가" : "보조 추가"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (specialMode === "main") setMainSpecials([]);
                  else setSubSpecials([]);
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #ef4444",
                  background: "rgba(239, 68, 68, 0.2)",
                  color: "#ef4444",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                초기화
              </button>
            </div>
            <div style={{ fontSize: "11px", opacity: 0.7, color: "#f59e0b" }}>
              카드 ID 예시: slash, deflect, stab, heavy, quick, parry, guard, rocket_punch, jab, drunken_fist
            </div>
          </div>
        )}

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

        <div style={{ display: "flex", alignItems: "center", marginBottom: "12px", gap: "16px" }}>
          <div style={{ display: "flex", flex: 1 }}>
            <button type="button" style={getModeButtonStyle("main")} onClick={() => setSpecialMode("main")}>
              주특기 선택 모드
            </button>
            <button type="button" style={getModeButtonStyle("sub")} onClick={() => setSpecialMode("sub")}>
              보조특기 선택 모드
            </button>
          </div>
          <div style={{ fontSize: "13px", opacity: 0.9, textAlign: "right", minWidth: "140px", color: "#9fb6ff" }}>
            <div>주특기: {mainSpecials.length} / {maxMainSlots}</div>
            <div>보조특기: {subSpecials.length} / {maxSubSlots}</div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
          <h3 style={{ fontSize: "16px", margin: 0, color: "#fff" }}>카드 선택</h3>
          <span style={{ fontSize: "12px", opacity: 0.6, color: "#9fb6ff" }}>
            좌클릭: 추가 / 우클릭: 제거 (중복 가능)
          </span>
        </div>
        <div
          style={{
            borderRadius: "12px",
            padding: "12px",
            marginBottom: "12px",
            background: "rgba(5, 8, 13, 0.92)",
            border: "1px solid rgba(118, 134, 185, 0.4)",
            flex: 1,
            overflowY: "auto",
            maxHeight: "50vh",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gridAutoRows: "minmax(70px, auto)",
              columnGap: "8px",
              rowGap: "8px",
            }}
          >
            {availableCards.map((card) => {
              const mainCount = getCardCount(card.id, mainSpecials);
              const subCount = getCardCount(card.id, subSpecials);
              const isMain = mainCount > 0;
              const isSub = subCount > 0;

              return (
                <div
                  key={card.id}
                  style={{...getCardStyle(card.id), position: "relative"}}
                  onClick={() => handleCardClick(card.id, false)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleCardClick(card.id, true);
                  }}
                  onMouseEnter={(e) => {
                    if (card.traits && card.traits.length > 0) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const fullCard = CARDS.find(c => c.id === card.id);
                      setHoveredCard({ card: fullCard, x: rect.right, y: rect.top });
                      if (cardTooltipTimerRef.current) clearTimeout(cardTooltipTimerRef.current);
                      cardTooltipTimerRef.current = setTimeout(() => {
                        setShowCardTooltip(true);
                      }, 500);
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredCard(null);
                    setShowCardTooltip(false);
                    if (cardTooltipTimerRef.current) clearTimeout(cardTooltipTimerRef.current);
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <b style={{ color: card.type === "attack" ? "#ef4444" : "#60a5fa" }}>{card.name}</b>
                      {isMain && (
                        <span style={{
                          fontSize: "11px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "linear-gradient(135deg, #f5d76e, #c9a64a)",
                          color: "#000",
                          fontWeight: 700,
                        }}>
                          주특기 {mainCount > 1 ? `x${mainCount}` : ''}
                        </span>
                      )}
                      {isSub && (
                        <span style={{
                          fontSize: "11px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "linear-gradient(135deg, #7dd3fc, #2b6fbf)",
                          color: "#000",
                          fontWeight: 700,
                        }}>
                          보조 {subCount > 1 ? `x${subCount}` : ''}
                        </span>
                      )}
                    </span>
                    <span style={{ fontSize: "12px", opacity: 0.8, color: "#9fb6ff", display: "flex", gap: "8px" }}>
                      <span>AP {card.ap}</span>
                      <span>속도 {card.speed}</span>
                      <span>{card.desc}</span>
                    </span>
                  </div>
                  {card.description && (
                    <div style={{ fontSize: "12px", opacity: 0.75, color: "#9fb6ff", marginBottom: "4px", fontStyle: "italic" }}>
                      {card.description}
                    </div>
                  )}
                  {card.traits && card.traits.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
                      {card.traits.map((traitId) => {
                        const trait = TRAITS[traitId];
                        if (!trait) return null;
                        const isPositive = trait.type === "positive";
                        return (
                          <span
                            key={traitId}
                            style={{
                              fontSize: "11px",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: isPositive ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                              border: `1px solid ${isPositive ? "#22c55e" : "#ef4444"}`,
                              color: isPositive ? "#22c55e" : "#ef4444",
                              fontWeight: 600,
                              cursor: "help",
                            }}
                            onMouseEnter={(e) => handleTraitMouseEnter(e, trait)}
                            onMouseLeave={handleTraitMouseLeave}
                          >
                            {trait.name} {"★".repeat(trait.weight)}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 커스텀 툴팁 */}
      {hoveredTrait && (
        <div
          ref={tooltipRef}
          style={{
            position: "fixed",
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            background: "rgba(0, 0, 0, 0.95)",
            border: `2px solid ${hoveredTrait.type === "positive" ? "#22c55e" : "#ef4444"}`,
            borderRadius: "8px",
            padding: "12px 16px",
            color: "#fff",
            fontSize: "16px",
            fontWeight: 500,
            maxWidth: "300px",
            zIndex: 10000,
            pointerEvents: "none",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.5)",
            lineHeight: "1.5",
          }}
        >
          <div style={{ marginBottom: "6px", fontWeight: 700, color: hoveredTrait.type === "positive" ? "#22c55e" : "#ef4444" }}>
            {hoveredTrait.name} {"★".repeat(hoveredTrait.weight)}
          </div>
          <div style={{ fontSize: "14px", opacity: 0.9 }}>
            {hoveredTrait.description}
          </div>
        </div>
      )}

      {/* 카드 특성 툴팁 */}
      {showCardTooltip && hoveredCard && hoveredCard.card.traits && hoveredCard.card.traits.length > 0 && (
        <div
          style={{
            position: 'fixed',
            left: `${hoveredCard.x + 10}px`,
            top: `${hoveredCard.y}px`,
            background: 'rgba(0, 0, 0, 0.95)',
            border: '2px solid #fbbf24',
            borderRadius: '12px',
            padding: '20px',
            color: '#fff',
            maxWidth: '400px',
            zIndex: 10000,
            pointerEvents: 'none',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
          }}
        >
          <div style={{ fontSize: '21px', fontWeight: 700, color: '#fbbf24', marginBottom: '12px' }}>
            특성 정보
          </div>
          {hoveredCard.card.traits.map(traitId => {
            const trait = TRAITS[traitId];
            if (!trait) return null;
            const isPositive = trait.type === 'positive';
            return (
              <div key={traitId} style={{ marginBottom: '12px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px'
                }}>
                  <span style={{
                    fontSize: '19px',
                    fontWeight: 700,
                    color: isPositive ? '#22c55e' : '#ef4444'
                  }}>
                    {trait.name}
                  </span>
                  <span style={{ fontSize: '16px', color: '#fbbf24' }}>
                    {"★".repeat(trait.weight)}
                  </span>
                </div>
                <div style={{ fontSize: '18px', color: '#9fb6ff', lineHeight: 1.5 }}>
                  {trait.description}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
