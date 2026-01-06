/**
 * EventModal.tsx
 * 이벤트 모달 컴포넌트
 * 최적화: React.memo + useCallback
 */

import { memo, useCallback } from 'react';
import type { CSSProperties } from 'react';
import type { ActiveEvent, EventRewards } from '../../../types/game';
import type { Resources } from '../../../types/core';
import { STAT_LABELS, describeCost, describeBundle, formatApplied, canAfford } from '../utils/mapConfig';

// 스타일 상수
const DESCRIPTION_STYLE: CSSProperties = { lineHeight: "1.6" };
const INSUFFICIENT_STYLE: CSSProperties = { color: "#ef4444" };
const SUFFICIENT_STYLE: CSSProperties = { color: "#4ade80" };

interface EventOutcome {
  choice?: string;
  success?: boolean;
  resultDescription?: string;
  cost?: Record<string, number>;
  rewards?: EventRewards;
  text?: string;
  // 전투 트리거 정보
  combatTrigger?: boolean;
  combatRewards?: Record<string, unknown>;
  combatModifier?: { enemyHp?: number };
  combatId?: string;
}

interface BattleConfig {
  nodeId?: string;
  kind?: string;
  label?: string;
  rewards?: Record<string, unknown>;
  enemyId?: string;
  enemyHp?: number;
}

interface EventModalProps {
  activeEvent: ActiveEvent | null;
  resources: Resources;
  meetsStatRequirement: (req: Record<string, number> | undefined) => boolean;
  chooseEvent: (choiceId: string) => void;
  closeEvent: () => void;
  startBattle?: (config: BattleConfig) => void;
}

export const EventModal = memo(function EventModal({
  activeEvent,
  resources,
  meetsStatRequirement,
  chooseEvent,
  closeEvent,
  startBattle,
}: EventModalProps) {
  // React hooks 규칙: 모든 훅은 early return 전에 호출되어야 함
  const handleChooseEvent = useCallback((choiceId: string) => {
    chooseEvent(choiceId);
  }, [chooseEvent]);

  // 전투 트리거 시 전투 시작 후 이벤트 닫기
  const handleClose = useCallback(() => {
    if (!activeEvent) {
      closeEvent();
      return;
    }
    const outcome = activeEvent.outcome as EventOutcome | undefined;
    if (outcome?.combatTrigger && startBattle) {
      const battleConfig: BattleConfig = {
        nodeId: `event-combat-${activeEvent.definition?.id || 'unknown'}`,
        kind: 'combat',
        label: outcome.choice || '이벤트 전투',
        rewards: outcome.combatRewards || {},
        enemyId: outcome.combatId,
      };
      // enemyHp 수정자가 있으면 적용 (예: 적 HP 50% 감소)
      if (outcome.combatModifier?.enemyHp) {
        battleConfig.enemyHp = Math.floor(30 * outcome.combatModifier.enemyHp);
      }
      startBattle(battleConfig);
    }
    closeEvent();
  }, [activeEvent, startBattle, closeEvent]);

  // Early return은 모든 훅 호출 후에 수행
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
    <div className="event-modal-overlay" data-testid="event-modal-overlay">
      <div className="event-modal" data-testid="event-modal">
        <header data-testid="event-modal-header">
          <h3>{activeEvent.definition?.title ?? "미확인 사건"}</h3>
        </header>
        <p style={DESCRIPTION_STYLE}>{displayText}</p>

        {!activeEvent.resolved && (
          <div className="event-choices" data-testid="event-choices">
            {currentChoices.map((choice) => {
              const affordable = canAfford(resources as unknown as Record<string, number>, choice.cost as Record<string, number> || {});
              const hasRequiredStats = meetsStatRequirement(choice.statRequirement);
              const canSelect = affordable && hasRequiredStats;

              return (
                <div key={choice.id} className="choice-card" data-testid={`event-choice-${choice.id}`}>
                  <strong>{choice.label}</strong>
                  {choice.cost && Object.keys(choice.cost).length > 0 && (
                    <small style={affordable ? undefined : INSUFFICIENT_STYLE}>
                      비용: {describeCost(choice.cost)}
                      {!affordable && " (부족)"}
                    </small>
                  )}
                  {choice.rewards && Object.keys(choice.rewards).length > 0 && (
                    <small>보상: {describeBundle(choice.rewards as Record<string, unknown>)}</small>
                  )}
                  {choice.statRequirement && (
                    <small style={hasRequiredStats ? SUFFICIENT_STYLE : INSUFFICIENT_STYLE}>
                      요구: {Object.entries(choice.statRequirement).map(([k, v]: [string, unknown]) => `${(STAT_LABELS as Record<string, string>)[k] ?? k} ${v}`).join(", ")}
                      {!hasRequiredStats && " (부족)"}
                    </small>
                  )}
                  <button type="button" disabled={!canSelect} onClick={() => handleChooseEvent(choice.id)} data-testid={`event-choice-btn-${choice.id}`}>
                    선택
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {activeEvent.resolved && outcome && (
          <div className="event-result" data-testid="event-result">
            {outcome.cost && Object.keys(outcome.cost).length > 0 && (
              <p>소모: {formatApplied(Object.fromEntries(Object.entries(outcome.cost).map(([k, v]) => [k, -v])))}</p>
            )}
            {outcome.rewards && Object.keys(outcome.rewards).length > 0 && (
              <p>획득: {formatApplied(outcome.rewards as Record<string, unknown>)}</p>
            )}
            <button type="button" className="close-btn" onClick={handleClose} data-testid="event-close-btn">
              {outcome.combatTrigger ? '전투 시작!' : '확인'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
