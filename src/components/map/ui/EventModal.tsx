/**
 * EventModal.jsx
 * 이벤트 모달 컴포넌트
 */

import type { ActiveEvent, EventRewards } from '../../../types/game';
import type { Resources } from '../../../types/core';
import { STAT_LABELS, describeCost, describeBundle, formatApplied, canAfford } from '../utils/mapConfig';

interface EventOutcome {
  choice?: string;
  success?: boolean;
  resultDescription?: string;
  cost?: Record<string, number>;
  rewards?: EventRewards;
  text?: string;
}

interface EventModalProps {
  activeEvent: ActiveEvent | null;
  resources: Resources;
  meetsStatRequirement: (req: Record<string, number> | undefined) => boolean;
  chooseEvent: (choiceId: string) => void;
  closeEvent: () => void;
}

export function EventModal({
  activeEvent,
  resources,
  meetsStatRequirement,
  chooseEvent,
  closeEvent,
}: EventModalProps) {
  if (!activeEvent) return null;

  // 현재 스테이지에 맞는 description과 choices 가져오기
  const currentStage = activeEvent.currentStage;
  const stageData = (currentStage && activeEvent.definition?.stages) ? activeEvent.definition.stages[currentStage] : undefined;
  const currentDescription = stageData?.description ?? activeEvent.definition?.description ?? "설명 없음";
  const currentChoices = stageData?.choices ?? activeEvent.definition?.choices ?? [];

  // 표시할 텍스트: resolved면 resultDescription, 아니면 currentDescription
  const outcome = activeEvent.outcome as EventOutcome | undefined;
  const displayText = activeEvent.resolved && outcome?.resultDescription
    ? outcome.resultDescription
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
            {currentChoices.map((choice) => {
              const affordable = canAfford(resources as unknown as Record<string, number>, choice.cost as Record<string, number> || {});
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
                    <small>보상: {describeBundle(choice.rewards as Record<string, unknown>)}</small>
                  )}
                  {choice.statRequirement && (
                    <small style={{ color: hasRequiredStats ? "#4ade80" : "#ef4444" }}>
                      요구: {Object.entries(choice.statRequirement).map(([k, v]: [string, unknown]) => `${(STAT_LABELS as Record<string, string>)[k] ?? k} ${v}`).join(", ")}
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

        {activeEvent.resolved && outcome && (
          <div className="event-result">
            {outcome.cost && Object.keys(outcome.cost).length > 0 && (
              <p>소모: {formatApplied(Object.fromEntries(Object.entries(outcome.cost).map(([k, v]) => [k, -v])))}</p>
            )}
            {outcome.rewards && Object.keys(outcome.rewards).length > 0 && (
              <p>획득: {formatApplied(outcome.rewards as Record<string, unknown>)}</p>
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
