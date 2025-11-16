import { useState, useEffect } from "react";
import { useGameStore } from "../../state/gameStore";
import { CARDS } from "../battle/battleData";

const baseStats = {
  hp: { current: 30, max: 30 },
  energy: { current: 6, max: 6 },
  speed: 30,
  power: 0,
};

// 전투에서 사용되는 카드 8종 (CARDS.slice(0, 8))
const availableCards = CARDS.slice(0, 8).map((card, index) => ({
  id: card.id,
  slot: index + 1,
  name: card.name,
  type: card.type,
  speed: card.speedCost,
  ap: card.actionCost,
  desc: `${card.damage ? `공격력 ${card.damage}${card.hits ? ` x${card.hits}` : ''}` : ''}${card.block ? `방어력 ${card.block}` : ''}${card.counter !== undefined ? ` 반격 ${card.counter}` : ''}`,
}));

export function CharacterSheet({ onClose }) {
  const characterBuild = useGameStore((state) => state.characterBuild);
  const updateCharacterBuild = useGameStore((state) => state.updateCharacterBuild);

  const [specialMode, setSpecialMode] = useState("main");
  // cardId로 선택 상태 관리 - 초기화는 한 번만
  const [mainSpecials, setMainSpecials] = useState([]);
  const [subSpecials, setSubSpecials] = useState([]);
  const [initialized, setInitialized] = useState(false);

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
        if (prev.length >= 3) return prev;
        setSubSpecials((prevSub) => prevSub.filter((id) => id !== cardId));
        return [...prev, cardId];
      });
    } else {
      setSubSpecials((prev) => {
        if (prev.includes(cardId)) {
          return prev.filter((id) => id !== cardId);
        }
        if (prev.length >= 5) return prev;
        setMainSpecials((prevMain) => prevMain.filter((id) => id !== cardId));
        return [...prev, cardId];
      });
    }
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
          width: "640px",
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
            onClick={onClose}
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
              {baseStats.hp.current} / {baseStats.hp.max}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "14px" }}>
            <span style={{ opacity: 0.8 }}>에너지</span>
            <span style={{ fontWeight: 600, color: "#67e8f9" }}>
              {baseStats.energy.current} / {baseStats.energy.max}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "14px" }}>
            <span style={{ opacity: 0.8 }}>속도</span>
            <span style={{ fontWeight: 600, color: "#7dd3fc" }}>{baseStats.speed}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
            <span style={{ opacity: 0.8 }}>힘</span>
            <span style={{ fontWeight: 600, color: "#fca5a5" }}>{baseStats.power}</span>
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
            <div>주특기: {mainSpecials.length} / 3</div>
            <div>보조특기: {subSpecials.length} / 5</div>
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
                <div key={card.id} style={getCardStyle(card.id)} onClick={() => handleCardClick(card.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ opacity: 0.7, fontSize: "12px" }}>슬롯 {card.slot}</span>{" "}
                      <b>{card.name}</b>
                      <span style={{ opacity: 0.7, fontSize: "12px" }}> · {card.type}</span>
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
                    <span style={{ fontSize: "12px", opacity: 0.8, color: "#9fb6ff" }}>
                      속도 {card.speed} / AP {card.ap}
                    </span>
                  </div>
                  <div style={{ fontSize: "13px", opacity: 0.9, color: "#9fb6ff" }}>{card.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
