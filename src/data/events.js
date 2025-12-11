/**
 * 이벤트 라이브러리
 *
 * 구조 설명:
 * - steps: 다단계 이벤트 (새 방식)
 *   - 각 step에 title, description, choices
 *   - choice.next: 다음 단계로 이동
 *   - choice.final: true면 결과 처리 후 종료
 *
 * - choices만 있으면 단일 단계 이벤트 (기존 방식 호환)
 */

export const eventLibrary = {
  // ===============================
  // 다단계 이벤트 (새 방식)
  // ===============================
  "event-entry-center": {
    title: "폐허가 된 무기고",
    steps: {
      start: {
        description: "붕괴된 요새 내부에서 기계 소리가 새어 나온다. 위험을 감수할지 정해야 한다.",
        choices: [
          {
            id: "fight",
            label: "기계병과 정면 교전",
            detail: "전투로 자원을 탈환한다.",
            next: "fight_result",
          },
          {
            id: "stealth",
            label: "잠행 침투(정보 1)",
            detail: "정보를 사용해 경보를 끄고 조용히 약탈한다.",
            cost: { intel: 1 },
            next: "stealth_attempt",
          },
          {
            id: "turret",
            label: "포탑 해체(원자재 2)",
            detail: "포탑을 분해해 방어 장치를 회수한다.",
            cost: { material: 2 },
            next: "turret_attempt",
          },
        ],
      },
      fight_result: {
        description: "기계병들이 일제히 깨어났다! 격렬한 전투가 벌어진다.",
        choices: [
          {
            id: "fight_all",
            label: "끝까지 싸운다",
            detail: "위험하지만 보상이 크다.",
            final: true,
            rewards: { loot: { min: 3, max: 5 }, gold: 20 },
            penalty: { loot: { min: 1, max: 2 }, gold: { min: 5, max: 10 } },
            successText: "기계병을 격파하고 창고를 확보했다.",
            failureText: "경보가 울려 피해만 입고 철수했다.",
          },
          {
            id: "retreat",
            label: "철수한다",
            detail: "안전하게 물러난다.",
            final: true,
            rewards: {},
            penalty: {},
            successText: "무사히 철수했다.",
            failureText: "철수하면서 경미한 피해를 입었다.",
          },
        ],
      },
      stealth_attempt: {
        description: "조심스럽게 내부로 침투한다. 경보 시스템이 보인다.",
        choices: [
          {
            id: "disable_alarm",
            label: "경보 해제 시도",
            detail: "경보를 끄고 약탈한다.",
            final: true,
            rewards: { loot: { min: 2, max: 3 } },
            penalty: { intel: 1 },
            successText: "경보를 울리지 않고 보급품을 챙겼다.",
            failureText: "경비병에게 들켜 정보만 잃었다.",
          },
          {
            id: "abort_stealth",
            label: "너무 위험하다, 돌아간다",
            detail: "안전하게 철수한다.",
            final: true,
            rewards: {},
            penalty: {},
            successText: "신중한 선택이었다.",
            failureText: "아무것도 얻지 못했다.",
          },
        ],
      },
      turret_attempt: {
        description: "포탑에 접근했다. 복잡한 회로가 얽혀 있다.",
        choices: [
          {
            id: "careful_dismantle",
            label: "신중하게 분해",
            detail: "시간이 걸리지만 안전하다.",
            final: true,
            rewards: { intel: 1, loot: 1 },
            penalty: { material: { min: 1, max: 2 } },
            successText: "포탑을 고철로 만들고 회로를 회수했다.",
            failureText: "포탑 폭발로 자재를 잃었다.",
          },
          {
            id: "quick_dismantle",
            label: "빠르게 분해 (위험)",
            detail: "빠르지만 폭발 위험이 있다.",
            final: true,
            rewards: { intel: 2, loot: 2, material: 1 },
            penalty: { material: 2, loot: 1 },
            successText: "위험을 감수한 보람이 있었다!",
            failureText: "폭발! 많은 자원을 잃었다.",
          },
        ],
      },
    },
  },

  "event-mid-center": {
    title: "유랑 상단",
    steps: {
      start: {
        description: "황무지를 떠도는 상단이 교역을 제안한다. 상단장이 당신을 유심히 살핀다.",
        choices: [
          {
            id: "approach",
            label: "가까이 다가간다",
            detail: "어떤 물건이 있는지 살펴본다.",
            next: "browse_goods",
          },
          {
            id: "negotiate",
            label: "협상을 제안한다",
            detail: "정보나 물자를 교환할 수 있을지 물어본다.",
            next: "negotiate_options",
          },
          {
            id: "leave",
            label: "그냥 지나친다",
            detail: "상단을 무시하고 길을 간다.",
            final: true,
            rewards: {},
            penalty: {},
            successText: "조용히 지나갔다.",
            failureText: "상단장이 아쉬워하며 손을 흔든다.",
          },
        ],
      },
      browse_goods: {
        description: "상단에는 다양한 물건이 진열되어 있다. 무엇이 눈에 띄는가?",
        choices: [
          {
            id: "buy_card",
            label: "카드 구매(금 30)",
            detail: "신형 카드를 구매해 덱을 강화한다.",
            cost: { gold: 30 },
            final: true,
            rewards: { loot: 1, intel: 1 },
            penalty: { gold: { min: 5, max: 15 } },
            successText: "고급 전술 정보를 얻었다.",
            failureText: "불량품이라 수리비만 들었다.",
          },
          {
            id: "buy_cheap",
            label: "싸구려 물건 구매(금 10)",
            detail: "운이 좋으면 쓸만할지도.",
            cost: { gold: 10 },
            final: true,
            rewards: { loot: { min: 0, max: 2 } },
            penalty: {},
            successText: "의외로 쓸만한 물건이었다!",
            failureText: "역시 싸구려는 싸구려다.",
          },
          {
            id: "back_to_start",
            label: "다시 생각한다",
            detail: "다른 선택지를 살펴본다.",
            next: "start",
          },
        ],
      },
      negotiate_options: {
        description: "상단장이 고개를 끄덕이며 이야기를 듣는다.",
        choices: [
          {
            id: "share_intel",
            label: "정보 교환(정보 2)",
            detail: "정보를 공유해 보상을 받는다.",
            cost: { intel: 2 },
            final: true,
            rewards: { gold: 15, material: 1 },
            penalty: { gold: { min: 5, max: 10 } },
            successText: "상단이 넉넉한 보상을 내줬다.",
            failureText: "정보 가치가 낮다며 헐값만 제시했다.",
          },
          {
            id: "sell_loot",
            label: "전리품 판매(전리품 2)",
            detail: "모은 전리품을 상단에 판다.",
            cost: { loot: 2 },
            final: true,
            rewards: { gold: 25 },
            penalty: { loot: 1 },
            successText: "넉넉한 자금을 확보했다.",
            failureText: "사기꾼에게 전리품 일부를 빼앗겼다.",
          },
          {
            id: "back_to_start",
            label: "다시 생각한다",
            detail: "다른 선택지를 살펴본다.",
            next: "start",
          },
        ],
      },
    },
  },

  "event-upper-right": {
    title: "폐광의 차원 균열",
    steps: {
      start: {
        description: "폐광에 시공 간섭이 발생한다. 불안정한 빛이 일렁이고 있다.",
        choices: [
          {
            id: "approach_rift",
            label: "균열에 다가간다",
            detail: "위험하지만 귀중한 것을 얻을 수 있을지도.",
            next: "rift_close",
          },
          {
            id: "seal",
            label: "원자재 3으로 봉인",
            detail: "자재를 태워 균열을 봉인한다.",
            cost: { material: 3 },
            final: true,
            rewards: { gold: 25, intel: 1 },
            penalty: { material: { min: 2, max: 3 }, gold: 10 },
            successText: "길이 안전해졌다.",
            failureText: "봉인 실패로 자원만 잃었다.",
          },
          {
            id: "ignore",
            label: "무시하고 지나치기",
            detail: "위험을 감수하지 않는다.",
            final: true,
            rewards: {},
            penalty: { intel: 1 },
            successText: "무사히 지나갔지만 찜찜함이 남았다.",
            failureText: "균열 폭발에 장비가 손상됐다.",
          },
        ],
      },
      rift_close: {
        description: "균열 가까이 다가가자 이상한 에너지가 느껴진다. 손을 뻗으면 뭔가 잡힐 것 같다.",
        choices: [
          {
            id: "investigate",
            label: "균열 조사(정보 2)",
            detail: "균열을 분석해 시료를 얻는다.",
            cost: { intel: 2 },
            final: true,
            rewards: { loot: { min: 4, max: 6 } },
            penalty: { material: 1 },
            successText: "귀중한 시료를 확보했다.",
            failureText: "폭발 여파로 장비가 손상됐다.",
          },
          {
            id: "reach_in",
            label: "손을 뻗는다 (위험)",
            detail: "알 수 없는 힘에 이끌린다...",
            final: true,
            rewards: { loot: { min: 6, max: 10 }, intel: 2 },
            penalty: { loot: 3, material: 2 },
            successText: "차원의 틈에서 귀중한 물건을 건져냈다!",
            failureText: "차원 폭풍에 휩쓸려 많은 것을 잃었다.",
          },
          {
            id: "back_away",
            label: "물러난다",
            detail: "위험하다. 철수한다.",
            next: "start",
          },
        ],
      },
    },
  },

  "event-top-left": {
    title: "구조 요청 신호",
    steps: {
      start: {
        description: "약한 구조 신호가 반복 수신된다. 어디서 오는 걸까?",
        choices: [
          {
            id: "trace_signal",
            label: "신호를 추적한다",
            detail: "신호의 출처를 찾아간다.",
            next: "signal_source",
          },
          {
            id: "donation",
            label: "금 20 기부",
            detail: "물자를 지원하고 조용히 떠난다.",
            cost: { gold: 20 },
            final: true,
            rewards: { intel: 1 },
            penalty: { gold: 5 },
            successText: "감사의 표시로 정보 패킷을 받았다.",
            failureText: "지원 물자가 사라졌다.",
          },
          {
            id: "salvage",
            label: "신호 장비 매각(전리품 1)",
            detail: "신호 장치를 분해해 자금을 마련한다.",
            cost: { loot: 1 },
            final: true,
            rewards: { gold: 15, material: 1 },
            penalty: { intel: 1 },
            successText: "실용적인 선택이었다.",
            failureText: "장비가 폭주해 정보가 소실됐다.",
          },
        ],
      },
      signal_source: {
        description: "폐허 속에서 생존자를 발견했다. 지쳐 보이지만 살아있다.",
        choices: [
          {
            id: "rescue",
            label: "구조 작전",
            detail: "전투 끝에 생존자를 확보한다.",
            final: true,
            rewards: { intel: 2, loot: 1 },
            penalty: { loot: 1 },
            successText: "생존자가 합류했다.",
            failureText: "적 매복에 전리품만 잃었다.",
          },
          {
            id: "share_supplies",
            label: "물자 나눔(전리품 1)",
            detail: "가진 것을 나눈다.",
            cost: { loot: 1 },
            final: true,
            rewards: { intel: 1, gold: 10 },
            penalty: {},
            successText: "감사 인사와 함께 정보를 얻었다.",
            failureText: "고마워하지만 줄 건 없다고 한다.",
          },
          {
            id: "leave_alone",
            label: "그냥 두고 떠난다",
            detail: "여력이 없다.",
            final: true,
            rewards: {},
            penalty: {},
            successText: "냉정하지만 현실적인 선택이었다.",
            failureText: "뒤에서 저주하는 소리가 들린다.",
          },
        ],
      },
    },
  },
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
