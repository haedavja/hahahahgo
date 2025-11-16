import { useState, useEffect } from "react";
import { useGameStore } from "../../state/gameStore";
import { PLAYER_STARTER_DECK, CARD_LIBRARY } from "../../data/cards";

const baseStats = {
  hp: { current: 30, max: 30 },
  energy: { current: 6, max: 6 },
  speed: 30,
  power: 0,
};

// PLAYER_STARTER_DECK 전체 사용 (중복 포함)
const availableCards = PLAYER_STARTER_DECK.map((cardId, index) => {
  const card = CARD_LIBRARY[cardId];
  return {
    id: cardId,
    uniqueId: `${cardId}_${index}`, // 중복 카드 구분용 고유 ID
    slot: index + 1,
    name: card.name,
    type: card.type,
    speed: card.speedCost,
    ap: card.actionCost,
    desc: card.description,
  };
});

export function CharacterSheet({ onClose }) {
  const characterBuild = useGameStore((state) => state.characterBuild);
  const updateCharacterBuild = useGameStore((state) => state.updateCharacterBuild);

  const [specialMode, setSpecialMode] = useState("main");
  // uniqueId로 선택 상태 관리
  const [mainSpecials, setMainSpecials] = useState([]);
  const [subSpecials, setSubSpecials] = useState([]);

  // 초기 로드 시 저장된 cardId를 uniqueId로 변환
  useEffect(() => {
    if (characterBuild.mainSpecials.length > 0 || characterBuild.subSpecials.length > 0) {
      const mainUniqueIds = characterBuild.mainSpecials.map((cardId) => {
        const card = availableCards.find((c) => c.id === cardId && !mainSpecials.includes(c.uniqueId));
        return card?.uniqueId;
      }).filter(Boolean);

      const subUniqueIds = characterBuild.subSpecials.map((cardId) => {
        const card = availableCards.find((c) => c.id === cardId && !subSpecials.includes(c.uniqueId));
        return card?.uniqueId;
      }).filter(Boolean);

      setMainSpecials(mainUniqueIds);
      setSubSpecials(subUniqueIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 선택 사항이 변경될 때마다 uniqueId -> cardId 변환 후 게임 스토어에 저장
  useEffect(() => {
    const mainCardIds = mainSpecials.map((uniqueId) => {
      const card = availableCards.find((c) => c.uniqueId === uniqueId);
      return card?.id;
    }).filter(Boolean);

    const subCardIds = subSpecials.map((uniqueId) => {
      const card = availableCards.find((c) => c.uniqueId === uniqueId);
      return card?.id;
    }).filter(Boolean);

    updateCharacterBuild(mainCardIds, subCardIds);
  }, [mainSpecials, subSpecials, updateCharacterBuild]);

  const getCardStyle = (uniqueId) => {
    const isMain = mainSpecials.includes(uniqueId);
    const isSub = subSpecials.includes(uniqueId);

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

  const handleCardClick = (uniqueId) => {
    if (specialMode === "main") {
      setMainSpecials((prev) => {
        if (prev.includes(uniqueId)) {
          return prev.filter((id) => id !== uniqueId);
        }
        if (prev.length >= 3) return prev;
        setSubSpecials((prevSub) => prevSub.filter((id) => id !== uniqueId));
        return [...prev, uniqueId];
      });
    } else {
      setSubSpecials((prev) => {
        if (prev.includes(uniqueId)) {
          return prev.filter((id) => id !== uniqueId);
        }
        if (prev.length >= 5) return prev;
        setMainSpecials((prevMain) => prevMain.filter((id) => id !== uniqueId));
        return [...prev, uniqueId];
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
            {availableCards.map((card) => (
              <div key={card.uniqueId} style={getCardStyle(card.uniqueId)} onClick={() => handleCardClick(card.uniqueId)}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ color: "#fff" }}>
                    <span style={{ opacity: 0.7, fontSize: "12px" }}>슬롯 {card.slot}</span>{" "}
                    <b>{card.name}</b>
                    <span style={{ opacity: 0.7, fontSize: "12px" }}> · {card.type}</span>
                  </span>
                  <span style={{ fontSize: "12px", opacity: 0.8, color: "#9fb6ff" }}>
                    속도 {card.speed} / AP {card.ap}
                  </span>
                </div>
                <div style={{ fontSize: "13px", opacity: 0.9, color: "#9fb6ff" }}>{card.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
