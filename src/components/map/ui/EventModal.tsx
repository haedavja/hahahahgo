/**
 * EventModal.jsx
 * 이벤트 모달 컴포넌트
 */

import { STAT_LABELS, describeCost, describeBundle, formatApplied, canAfford } from '../utils/mapConfig';

export function EventModal({
  activeEvent,
  resources,
  meetsStatRequirement,
  chooseEvent,
  closeEvent,
}: any) {
  if (!activeEvent) return null;

  // 현재 스테이지에 맞는 description과 choices 가져오기
  const currentStage = activeEvent.currentStage;
  const stageData = currentStage && activeEvent.definition?.stages?.[currentStage];
  const currentDescription = stageData?.description ?? activeEvent.definition?.description ?? "설명 없음";
  const currentChoices = stageData?.choices ?? activeEvent.definition?.choices ?? [];

  // 표시할 텍스트: resolved면 resultDescription, 아니면 currentDescription
  const displayText = activeEvent.resolved && activeEvent.outcome?.resultDescription
    ? activeEvent.outcome.resultDescription
    : currentDescription;

  return (
    <div className="event-modal-overlay">
      <div className="event-modal">
        <header>
          <h3>{activeEvent.definition?.title ?? "미확인 사건"}</h3>
        </header>
        <p style={{ lineHeight: "1.6" }}>{displayText}</p>

        {!activeEvent.resolved && (
          <div className="event-choices">
            {currentChoices.map((choice: any) => {
              const affordable = canAfford(resources, choice.cost || {});
              const hasRequiredStats = meetsStatRequirement(choice.statRequirement);
              const canSelect = affordable && hasRequiredStats;

              return (
                <div key={choice.id} className="choice-card">
                  <strong>{choice.label}</strong>
                  {choice.cost && Object.keys(choice.cost).length > 0 && (
                    <small style={{ color: affordable ? undefined : "#ef4444" }}>
                      비용: {describeCost(choice.cost)}
                      {!affordable && " (부족)"}
                    </small>
                  )}
                  {choice.rewards && Object.keys(choice.rewards).length > 0 && (
                    <small>보상: {describeBundle(choice.rewards)}</small>
                  )}
                  {choice.statRequirement && (
                    <small style={{ color: hasRequiredStats ? "#4ade80" : "#ef4444" }}>
                      요구: {Object.entries(choice.statRequirement).map(([k, v]: [string, any]) => `${(STAT_LABELS as any)[k] ?? k} ${v}`).join(", ")}
                      {!hasRequiredStats && " (부족)"}
                    </small>
                  )}
                  <button type="button" disabled={!canSelect} onClick={() => chooseEvent(choice.id)}>
                    선택
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {activeEvent.resolved && activeEvent.outcome && (
          <div className="event-result">
            {activeEvent.outcome.cost && Object.keys(activeEvent.outcome.cost).length > 0 && (
              <p>소모: {formatApplied(Object.fromEntries(Object.entries(activeEvent.outcome.cost).map(([k, v]: [string, any]) => [k, -(v as number)])))}</p>
            )}
            {activeEvent.outcome.rewards && Object.keys(activeEvent.outcome.rewards).length > 0 && (
              <p>획득: {formatApplied(activeEvent.outcome.rewards)}</p>
            )}
            <button type="button" className="close-btn" onClick={closeEvent}>
              확인
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
