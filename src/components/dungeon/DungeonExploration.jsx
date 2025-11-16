import { useGameStore } from "../../state/gameStore";

export function DungeonExploration() {
  const skipDungeon = useGameStore((state) => state.skipDungeon);

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
          alignItems: "center",
          gap: "24px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "24px", margin: 0, color: "#fff" }}>던전 탐색</h2>
          <div style={{ fontSize: "13px", opacity: 0.75, marginTop: "8px", color: "#9fb6ff" }}>
            어둠 속을 탐색하는 중...
          </div>
        </div>

        <div
          style={{
            borderRadius: "12px",
            padding: "32px 24px",
            background: "rgba(5, 8, 13, 0.92)",
            border: "1px solid rgba(118, 134, 185, 0.4)",
            textAlign: "center",
            width: "100%",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>☠️</div>
          <p style={{ fontSize: "16px", color: "#fff", margin: "0 0 16px 0" }}>던전 내부 탐색 시스템</p>
          <p style={{ fontSize: "14px", opacity: 0.8, margin: "0 0 24px 0" }}>
            던전 내부를 탐색하며 적과 조우하고 보물을 찾습니다.
            <br />
            <br />
            <span style={{ color: "#fca5a5" }}>⚠️ 던전 탐색 시스템은 개발 예정입니다</span>
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
            <div
              style={{
                padding: "12px 24px",
                borderRadius: "8px",
                background: "rgba(118, 134, 185, 0.2)",
                border: "1px solid rgba(118, 134, 185, 0.4)",
                fontSize: "13px",
              }}
            >
              • 방 탐색 및 랜덤 인카운터
              <br />
              • 보물 상자 및 함정
              <br />
              • 던전 보스 전투
              <br />• 탈출 또는 완료 보상
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={skipDungeon}
          style={{
            padding: "10px 24px",
            fontSize: "14px",
            borderRadius: "8px",
            border: "1px solid rgba(255, 110, 135, 0.5)",
            background: "rgba(12, 18, 32, 0.95)",
            color: "#fca5a5",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          던전 탈출
        </button>
      </div>
    </div>
  );
}
