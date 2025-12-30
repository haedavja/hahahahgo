/**
 * @file events.js
 * @description 이벤트 라이브러리
 *
 * ## 이벤트 구조
 * - steps: 다단계 이벤트
 *   - 각 step에 description, choices
 *   - choice.next: 다음 단계 이동
 *   - choice.final: 결과 처리 후 종료
 * - choices만 있으면 단일 단계 (레거시 호환)
 *
 * @typedef {Object} Event
 * @property {string} id - 이벤트 ID
 * @property {Object[]} steps - 단계 배열
 * @property {Object[]} choices - 선택지 (단일 단계용)
 */

export const eventLibrary = {
  // 새 이벤트를 여기에 추가
};

import type { NewEventDefinition, NewEventStage } from '../types';

/**
 * 이벤트에서 현재 단계 정보를 가져오는 헬퍼 함수
 */
export function getEventStep(eventDef: NewEventDefinition | null | undefined, stepId: string = "start"): NewEventStage | null {
  if (!eventDef) return null;

  // 다단계 이벤트 (stages 구조)
  if (eventDef.stages) {
    return eventDef.stages[stepId] || eventDef.stages.start || null;
  }

  // 단일 단계 이벤트 (기존 방식 호환)
  return {
    description: eventDef.description || "",
    choices: eventDef.choices || [],
  };
}

/**
 * 이벤트 제목 가져오기
 */
export function getEventTitle(eventDef: NewEventDefinition | null | undefined): string {
  return eventDef?.title || "알 수 없는 사건";
}
