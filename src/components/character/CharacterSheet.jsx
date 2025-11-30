import { useState, useEffect, useRef, useMemo } from "react";
import { useGameStore } from "../../state/gameStore";
import { CARDS, TRAITS } from "../battle/battleData";
import { calculatePassiveEffects } from "../../lib/relicEffects";

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
  const playerInsight = useGameStore((state) => state.playerInsight || 0);
  const relics = useGameStore((state) => state.relics);

  // 유물 패시브 효과 계산
  const passiveEffects = useMemo(() => {
    return calculatePassiveEffects(relics || []);
  }, [relics]);

  // 현재 스탯
  const currentHp = playerHp;
  const baseEnergy = 6;
  const currentEnergy = baseEnergy;
  const maxEnergy = baseEnergy + passiveEffects.maxEnergy;
  const speed = 30;
  const power = playerStrength || 0;
  const agility = playerAgility || 0;

  // 슬롯 제한 (유물 효과 반영)
  const maxMainSlots = 3 + passiveEffects.mainSpecialSlots;
  const maxSubSlots = 5 + passiveEffects.subSpecialSlots;

  const [specialMode, setSpecialMode] = useState("main");
  // cardId로 선택 상태 관리 - 초기화는 한 번만
  const [mainSpecials, setMainSpecials] = useState([]);
  const [subSpecials, setSubSpecials] = useState([]);
  const [initialized, setInitialized] = useState(false);

  // 툴팁 상태
  const [hoveredTrait, setHoveredTrait] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
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

  const getCardStyle = (cardId) => {
    const isMain = mainSpecials.includes(cardId);
    const isSub = subSpecials.includes(cardId);

    let borderColor = "rgba(118, 134, 185, 0.4)";
    let boxShadow = "none";
    let background = "rgba(8, 11, 19, 0.95)";

    if (isMain) {
      borderColor = "#f5d76e";
      boxShadow = "0 0 8px rgba(245, 215, 110, 0.6)";
      background = "rgba(42, 38, 21, 0.95)";
    } else if (isSub) {
      borderColor = "#7dd3fc";
      boxShadow = "0 0 8px rgba(125, 211, 252, 0.6)";
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

  const handleCardClick = (cardId) => {
    if (specialMode === "main") {
      setMainSpecials((prev) => {
        if (prev.includes(cardId)) {
          return prev.filter((id) => id !== cardId);
        }
        if (prev.length >= maxMainSlots) return prev;
        setSubSpecials((prevSub) => prevSub.filter((id) => id !== cardId));
        return [...prev, cardId];
      });
    } else {
      setSubSpecials((prev) => {
        if (prev.includes(cardId)) {
          return prev.filter((id) => id !== cardId);
        }
        if (prev.length >= maxSubSlots) return prev;
        setMainSpecials((prevMain) => prevMain.filter((id) => id !== cardId));
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

        <h3 style={{ fontSize: "16px", margin: "0 0 8px", color: "#fff" }}>카드 선택</h3>
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
              const isMain = mainSpecials.includes(card.id);
              const isSub = subSpecials.includes(card.id);

              return (
                <div
                  key={card.id}
                  style={{...getCardStyle(card.id), position: "relative"}}
                  onClick={() => handleCardClick(card.id)}
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
                          주특기
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
                          보조
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
