import React, { useState } from "react";

const baseStats = {
  hp: { current: 30, max: 30 },
  energy: { current: 6, max: 6 },
  speed: 30,
  power: 0,
};

const initialDeck = [
  { slot: 1, name: "Quick Slash", type: "공격", speed: 3, ap: 1, desc: "빠른 근접 공격, 선제용" },
  { slot: 2, name: "Guard Stance", type: "방어", speed: 6, ap: 1, desc: "기본 방어자세, 방어력 확보" },
  { slot: 3, name: "Parry", type: "반격", speed: 2, ap: 1, desc: "공격을 흘려 반격" },
  { slot: 4, name: "Focus Heal", type: "회복", speed: 10, ap: 2, desc: "집중 치유, 체력 회복" },
  { slot: 5, name: "Feint Strike", type: "공격", speed: 4, ap: 1, desc: "하이리스크 하이리턴 공격" },
  { slot: 6, name: "Adrenaline Surge", type: "버프", speed: 4, ap: 2, desc: "속도/행동력 버프" },
];

const cardRowBaseStyle = {
  borderRadius: 6,
  padding: "4px 6px",
  marginBottom: 4,
  background: "#1b1b24",
  border: "1px solid #31314a",
  transition: "box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease",
};

const statRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 4,
  fontSize: 13,
};

const statLabelStyle = { opacity: 0.8 };
const statValueStyle = { fontWeight: 600 };

function DungeonGameCharacterBuild() {
  const [specialMode, setSpecialMode] = useState("main");
  const [mainSpecials, setMainSpecials] = useState([]);
  const [subSpecials, setSubSpecials] = useState([]);

  const getCardStyle = (slot) => {
    const isMain = mainSpecials.includes(slot);
    const isSub = subSpecials.includes(slot);

    let borderColor = "#31314a";
    let boxShadow = "none";
    let background = cardRowBaseStyle.background;

    if (isMain) {
      borderColor = "#f5d76e";
      boxShadow = "0 0 8px rgba(245,215,110,0.9)";
      background = "#2a2615";
    } else if (isSub) {
      borderColor = "#4ea3ff";
      boxShadow = "0 0 8px rgba(78,163,255,0.9)";
      background = "#172538";
    }

    return {
      ...cardRowBaseStyle,
      border: "1px solid " + borderColor,
      boxShadow,
      background,
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
    padding: "4px 6px",
    fontSize: 12,
    borderRadius: 6,
    border: "1px solid #3a3a60",
    marginRight: mode === "main" ? 4 : 0,
    background:
      specialMode === mode
        ? mode === "main"
          ? "linear-gradient(135deg, #f5d76e, #c9a64a)"
          : "linear-gradient(135deg, #4ea3ff, #2b6fbf)"
        : "#181820",
    color: specialMode === mode ? "#000" : "#ddd",
    fontWeight: specialMode === mode ? 700 : 500,
  });

  return (
    <div style={{ width: "100%", height: "100%", background: "#111", color: "#fff", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: 560, maxHeight: "82vh", background: "#151521", borderRadius: 12, border: "1px solid #3a3a60", boxShadow: "0 14px 40px rgba(0,0,0,0.8)", padding: 16, boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <div>
            <h2 style={{ fontSize: 18, margin: 0 }}>캐릭터</h2>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>
              주특기 / 보조특기 카드 선택 UI
            </div>
          </div>
        </div>

        <div style={{ borderRadius: 8, padding: 8, marginBottom: 10, background: "#181820", border: "1px solid #303040" }}>
          <div style={statRowStyle}>
            <span style={statLabelStyle}>체력</span>
            <span style={statValueStyle}>{baseStats.hp.current} / {baseStats.hp.max}</span>
          </div>
          <div style={statRowStyle}>
            <span style={statLabelStyle}>에너지</span>
            <span style={statValueStyle}>{baseStats.energy.current} / {baseStats.energy.max}</span>
          </div>
          <div style={statRowStyle}>
            <span style={statLabelStyle}>속도</span>
            <span style={statValueStyle}>{baseStats.speed}</span>
          </div>
          <div style={statRowStyle}>
            <span style={statLabelStyle}>힘</span>
            <span style={statValueStyle}>{baseStats.power}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", marginBottom: 6, gap: 8 }}>
          <div style={{ display: "flex", flex: 1 }}>
            <button type="button" style={getModeButtonStyle("main")} onClick={() => setSpecialMode("main")}>
              주특기 선택 모드
            </button>
            <button type="button" style={getModeButtonStyle("sub")} onClick={() => setSpecialMode("sub")}>
              보조특기 선택 모드
            </button>
          </div>
          <div style={{ fontSize: 11, opacity: 0.8, textAlign: "right", minWidth: 140 }}>
            <div>주특기: {mainSpecials.length} / 3</div>
            <div>보조특기: {subSpecials.length} / 5</div>
          </div>
        </div>

        <h3 style={{ fontSize: 14, margin: "0 0 4px" }}>카드 선택</h3>
        <div style={{ borderRadius: 8, padding: 8, marginBottom: 6, background: "#16161d", border: "1px solid #28283a", flex: 1, overflowY: "auto", maxHeight: "48vh" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gridAutoRows: "minmax(60px, auto)", columnGap: 6, rowGap: 6 }}>
            {initialDeck.map((card) => (
              <div key={card.slot} style={getCardStyle(card.slot)} onClick={() => handleCardClick(card.slot)}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span>
                    <span style={{ opacity: 0.7 }}>슬롯 {card.slot}</span>{" "}
                    <b>{card.name}</b>
                    <span style={{ opacity: 0.6 }}> · {card.type}</span>
                  </span>
                  <span style={{ fontSize: 11, opacity: 0.8 }}>
                    속도 {card.speed} / 행동력 {card.ap}
                  </span>
                </div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>
                  {card.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DungeonGameCharacterBuild;
