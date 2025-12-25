/**
 * DungeonModals.jsx
 *
 * 던전 관련 모달 컴포넌트들
 * - RewardModal: 전투 보상 모달
 * - DungeonSummaryModal: 던전 탈출 요약 모달
 * - CrossroadModal: 기로 선택지 모달
 */

/**
 * 전투 보상 모달
 */
export function RewardModal({ rewardModal, onClose }) {
  if (!rewardModal) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.8)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 200,
    }}>
      <div style={{
        background: "#1e1e2e",
        padding: "32px",
        borderRadius: "16px",
        border: "2px solid #444",
        textAlign: "center",
        color: "#fff",
      }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "24px" }}>
          {rewardModal.victory ? "승리!" : "패배"}
        </h3>
        {rewardModal.victory && (
          <div style={{ fontSize: "18px", marginBottom: "8px" }}>
            {rewardModal.gold > 0 && <div style={{ color: "#ffd700", marginBottom: "4px" }}>금 +{rewardModal.gold}</div>}
            {rewardModal.loot > 0 && <div style={{ color: "#ff6b6b" }}>전리품 +{rewardModal.loot}</div>}
          </div>
        )}
        {!rewardModal.victory && <div style={{ fontSize: "14px", color: "#ff6b6b" }}>보상 없음</div>}
        <button
          onClick={onClose}
          style={{
            marginTop: "20px",
            padding: "10px 24px",
            background: "#3498db",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "600",
          }}
        >
          확인
        </button>
      </div>
    </div>
  );
}

/**
 * 던전 탈출 요약 모달
 */
export function DungeonSummaryModal({ dungeonSummary, onClose }) {
  if (!dungeonSummary) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.8)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 200,
    }}>
      <div style={{
        background: "#1e1e2e",
        padding: "32px",
        borderRadius: "16px",
        border: "2px solid #444",
        textAlign: "center",
        color: "#fff",
        minWidth: "300px",
      }}>
        <h3 style={{ margin: "0 0 24px", fontSize: "24px", color: "#3498db" }}>
          던전 탐험 완료
        </h3>
        <div style={{ fontSize: "16px", lineHeight: "1.8", textAlign: "left", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ color: "#ffd700" }}>금:</span>
            <span style={{ color: dungeonSummary.gold >= 0 ? "#90EE90" : "#ff6b6b", fontWeight: "600" }}>
              {dungeonSummary.gold >= 0 ? "+" : ""}{dungeonSummary.gold}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ color: "#9da9d6" }}>정보:</span>
            <span style={{ color: dungeonSummary.intel >= 0 ? "#90EE90" : "#ff6b6b", fontWeight: "600" }}>
              {dungeonSummary.intel >= 0 ? "+" : ""}{dungeonSummary.intel}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ color: "#ff6b6b" }}>전리품:</span>
            <span style={{ color: dungeonSummary.loot >= 0 ? "#90EE90" : "#ff6b6b", fontWeight: "600" }}>
              {dungeonSummary.loot >= 0 ? "+" : ""}{dungeonSummary.loot}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#a0e9ff" }}>원자재:</span>
            <span style={{ color: dungeonSummary.material >= 0 ? "#90EE90" : "#ff6b6b", fontWeight: "600" }}>
              {dungeonSummary.material >= 0 ? "+" : ""}{dungeonSummary.material}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            marginTop: "20px",
            padding: "10px 24px",
            background: "#27ae60",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "600",
          }}
        >
          확인
        </button>
      </div>
    </div>
  );
}

/**
 * 기로 선택지 모달
 */
export function CrossroadModal({ crossroadModal, screenShake, onSelectChoice, onClose }) {
  if (!crossroadModal) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.85)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 200,
      animation: screenShake ? "shake 0.2s ease-in-out" : undefined,
    }}>
      <div style={{
        background: "linear-gradient(145deg, #1e293b, #0f172a)",
        padding: "32px",
        borderRadius: "16px",
        border: "2px solid #475569",
        boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
        maxWidth: "500px",
        width: "90%",
      }}>
        {/* 제목 */}
        <h3 style={{
          margin: "0 0 8px",
          fontSize: "24px",
          color: "#f1c40f",
          textAlign: "center",
        }}>
          {crossroadModal.template?.name || "기로"}
        </h3>

        {/* 설명 */}
        <p style={{
          margin: "0 0 24px",
          fontSize: "15px",
          color: "#94a3b8",
          textAlign: "center",
          lineHeight: 1.6,
        }}>
          {crossroadModal.template?.description || "선택의 순간입니다."}
        </p>

        {/* 선택지 목록 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {crossroadModal.template?.choices?.map((choice) => {
            const attemptCount = crossroadModal.choiceState[choice.id]?.attempts || 0;
            const canSelect = choice.repeatable || attemptCount === 0;

            return (
              <button
                key={choice.id}
                onClick={() => canSelect && onSelectChoice(choice, crossroadModal.choiceState)}
                disabled={!canSelect}
                style={{
                  padding: "16px 20px",
                  background: canSelect
                    ? "rgba(59, 130, 246, 0.15)"
                    : "rgba(100, 116, 139, 0.1)",
                  border: `2px solid ${canSelect ? "#3b82f6" : "#475569"}`,
                  borderRadius: "10px",
                  color: canSelect ? "#e2e8f0" : "#64748b",
                  fontSize: "15px",
                  cursor: canSelect ? "pointer" : "not-allowed",
                  textAlign: "left",
                  transition: "all 0.2s",
                  opacity: canSelect ? 1 : 0.5,
                }}
              >
                <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                  {choice.text}
                </div>
                {choice.repeatable && attemptCount > 0 && (
                  <div style={{
                    fontSize: "12px",
                    color: "#94a3b8",
                    marginTop: "4px",
                  }}>
                    시도: {attemptCount}/{choice.maxAttempts || 5}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          style={{
            marginTop: "20px",
            width: "100%",
            padding: "12px",
            background: "#334155",
            border: "none",
            borderRadius: "8px",
            color: "#94a3b8",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          물러나기
        </button>
      </div>
    </div>
  );
}
