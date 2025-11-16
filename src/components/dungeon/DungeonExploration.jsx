import { useState } from "react";
import { useGameStore } from "../../state/gameStore";

const baseStats = {
  hp: { current: 30, max: 30 },
  energy: { current: 6, max: 6 },
  speed: 30,
  power: 0,
};

const initialDeck = [
  { slot: 1, name: "빠른 베기", type: "공격", speed: 3, ap: 1, desc: "빠른 근접 공격, 선제용" },
  { slot: 2, name: "방어 자세", type: "방어", speed: 6, ap: 1, desc: "기본 방어자세, 방어력 확보" },
  { slot: 3, name: "패리", type: "반격", speed: 2, ap: 1, desc: "공격을 흘려 반격" },
  { slot: 4, name: "집중 치유", type: "회복", speed: 10, ap: 2, desc: "집중 치유, 체력 회복" },
  { slot: 5, name: "페인트 공격", type: "공격", speed: 4, ap: 1, desc: "하이리스크 하이리턴 공격" },
  { slot: 6, name: "아드레날린", type: "버프", speed: 4, ap: 2, desc: "속도/행동력 버프" },
];

export function DungeonExploration() {
  const skipDungeon = useGameStore((state) => state.skipDungeon);
  const [specialMode, setSpecialMode] = useState("main");
  const [mainSpecials, setMainSpecials] = useState([]);
  const [subSpecials, setSubSpecials] = useState([]);

  const getCardStyle = (slot) => {
    const isMain = mainSpecials.includes(slot);
    const isSub = subSpecials.includes(slot);

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

  const handleCardClick = (slot) => {
    if (specialMode === "main") {
      setMainSpecials((prev) => {
        if (prev.includes(slot)) {
          return prev.filter((s) => s !== slot);
        }
        if (prev.length >= 3) return prev;
        setSubSpecials((prevSub) => prevSub.filter((s) => s !== slot));
        return [...prev, slot];
      });
    } else {
      setSubSpecials((prev) => {
        if (prev.includes(slot)) {
          return prev.filter((s) => s !== slot);
        }
        if (prev.length >= 5) return prev;
        setMainSpecials((prevMain) => prevMain.filter((s) => s !== slot));
        return [...prev, slot];
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
    <div className="dungeon-modal-overlay">
      <div
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
            <h2 style={{ fontSize: "24px", margin: 0, color: "#fff" }}>던전 탐색</h2>
            <div style={{ fontSize: "13px", opacity: 0.75, marginTop: "4px", color: "#9fb6ff" }}>
              주특기 / 보조특기 카드 선택
            </div>
          </div>
          <button
            type="button"
            onClick={skipDungeon}
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
            탈출
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
            {initialDeck.map((card) => (
              <div key={card.slot} style={getCardStyle(card.slot)} onClick={() => handleCardClick(card.slot)}>
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
