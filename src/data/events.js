/**
 * 이벤트 라이브러리
 *
 * 구조 설명:
 * - steps: 다단계 이벤트 (새 방식)
 *   - 각 step에 description, choices
 *   - choice.next: 다음 단계로 이동
 *   - choice.final: true면 결과 처리 후 종료
 *
 * - choices만 있으면 단일 단계 이벤트 (기존 방식 호환)
 *
 * 예시:
 * "event-example": {
 *   title: "이벤트 제목",
 *   steps: {
 *     start: {
 *       description: "첫 단계 설명",
 *       choices: [
 *         { id: "choice1", label: "선택지1", next: "step2" },
 *         { id: "choice2", label: "선택지2", final: true, rewards: {...}, penalty: {...} },
 *       ],
 *     },
 *     step2: {
 *       description: "두번째 단계 설명",
 *       choices: [
 *         { id: "final_choice", label: "최종 선택", final: true, rewards: {...}, penalty: {...} },
 *       ],
 *     },
 *   },
 * },
 */

export const eventLibrary = {
  // 새 이벤트를 여기에 추가
};

/**
 * 이벤트에서 현재 단계 정보를 가져오는 헬퍼 함수
 */
export function getEventStep(eventDef, stepId = "start") {
  if (!eventDef) return null;

  // 다단계 이벤트 (steps 구조)
  if (eventDef.steps) {
    return eventDef.steps[stepId] || eventDef.steps.start;
  }

  // 단일 단계 이벤트 (기존 방식 호환)
  return {
    description: eventDef.description,
    choices: eventDef.choices,
  };
}

/**
 * 이벤트 제목 가져오기
 */
export function getEventTitle(eventDef) {
  return eventDef?.title || "알 수 없는 사건";
}
