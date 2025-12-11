/**
 * 이벤트 라이브러리
 *
 * 구조 설명:
 * - steps: 다단계 이벤트
 *   - 각 step에 description, choices
 *   - choice.next: 다음 단계로 이동
 *   - choice.final: true면 결과 처리 후 종료
 *
 * - choices만 있으면 단일 단계 이벤트 (기존 방식 호환)
 */

export const eventLibrary = {
  "event-abandoned-lab": {
    title: "버려진 연구소",
    steps: {
      start: {
        description: "황폐한 연구소에 들어섰다. 전력이 끊긴 복도에 희미한 비상등만 깜빡인다.",
        choices: [
          {
            id: "explore_lab",
            label: "내부 탐색",
            detail: "연구 자료가 남아있을지 모른다.",
            next: "lab_interior",
          },
          {
            id: "check_generator",
            label: "발전기 확인",
            detail: "전력을 복구하면 더 많은 것을 찾을 수 있다.",
            next: "generator_room",
          },
          {
            id: "leave_quickly",
            label: "빠르게 떠난다",
            detail: "위험해 보인다. 돌아가자.",
            final: true,
            rewards: {},
            penalty: {},
            successText: "현명한 선택이었다.",
            failureText: "아무것도 얻지 못했다.",
          },
        ],
      },
      lab_interior: {
        description: "실험실 안에서 깨진 시험관들과 서류 더미를 발견했다.",
        choices: [
          {
            id: "search_documents",
            label: "서류 조사",
            detail: "정보가 있을 수 있다.",
            final: true,
            rewards: { intel: { min: 1, max: 2 } },
            penalty: {},
            successText: "유용한 연구 기록을 발견했다.",
            failureText: "대부분 훼손되어 읽을 수 없었다.",
          },
          {
            id: "salvage_equipment",
            label: "장비 수거",
            detail: "쓸만한 부품이 있을 것이다.",
            final: true,
            rewards: { material: 1, loot: 1 },
            penalty: { intel: 1 },
            successText: "분해할 수 있는 장비를 찾았다.",
            failureText: "장비를 만지다 경보가 울렸다.",
          },
          {
            id: "go_back",
            label: "입구로 돌아간다",
            detail: "다른 곳을 살펴보자.",
            next: "start",
          },
        ],
      },
      generator_room: {
        description: "발전기실에 도착했다. 연료가 조금 남아있다.",
        choices: [
          {
            id: "restore_power",
            label: "전력 복구 시도",
            detail: "성공하면 보안 시스템에 접근할 수 있다.",
            next: "power_restored",
          },
          {
            id: "drain_fuel",
            label: "연료만 가져간다",
            detail: "확실한 이득을 챙긴다.",
            final: true,
            rewards: { material: { min: 1, max: 2 } },
            penalty: {},
            successText: "연료를 회수했다.",
            failureText: "연료통이 새서 조금만 가져갈 수 있었다.",
          },
        ],
      },
      power_restored: {
        description: "전력이 들어왔다! 터미널 화면이 켜지고 잠긴 금고가 보인다.",
        choices: [
          {
            id: "hack_terminal",
            label: "터미널 해킹(정보 1)",
            detail: "연구 데이터에 접근한다.",
            cost: { intel: 1 },
            final: true,
            rewards: { intel: 2, gold: 15 },
            penalty: { intel: 1 },
            successText: "귀중한 데이터와 계좌 정보를 얻었다.",
            failureText: "보안에 걸려 역추적당했다.",
          },
          {
            id: "crack_safe",
            label: "금고 열기",
            detail: "안에 뭐가 있을까?",
            final: true,
            rewards: { gold: { min: 15, max: 25 }, loot: 1 },
            penalty: { gold: 5 },
            successText: "금고 안에서 현금과 물건을 발견했다.",
            failureText: "경보가 울리며 금고가 영구 잠금됐다.",
          },
        ],
      },
    },
  },

  "event-wandering-merchant": {
    title: "수상한 행상인",
    steps: {
      start: {
        description: "후드를 깊이 쓴 행상인이 길을 막아선다. \"좋은 물건 있어요...\"",
        choices: [
          {
            id: "see_wares",
            label: "물건을 본다",
            detail: "뭘 파는지 확인해보자.",
            next: "show_goods",
          },
          {
            id: "ask_info",
            label: "정보를 묻는다",
            detail: "이 근처에 대해 아는 게 있나?",
            next: "ask_about_area",
          },
          {
            id: "ignore",
            label: "무시하고 지나간다",
            final: true,
            rewards: {},
            penalty: {},
            successText: "행상인이 어깨를 으쓱하며 사라졌다.",
            failureText: "지갑이 가벼워진 느낌이 든다.",
          },
        ],
      },
      show_goods: {
        description: "행상인이 낡은 보따리를 펼친다. 이상한 물건들이 가득하다.",
        choices: [
          {
            id: "buy_mystery",
            label: "수상한 상자 구매(금 20)",
            detail: "안에 뭐가 들었는지 모른다.",
            cost: { gold: 20 },
            final: true,
            rewards: { loot: { min: 1, max: 4 } },
            penalty: { loot: 1 },
            successText: "예상외로 좋은 물건이 들어있었다!",
            failureText: "쓰레기만 잔뜩... 사기당했다.",
          },
          {
            id: "buy_intel",
            label: "지도 구매(금 15)",
            detail: "이 지역의 정보가 담겨있다고 한다.",
            cost: { gold: 15 },
            final: true,
            rewards: { intel: 2 },
            penalty: {},
            successText: "유용한 정보가 적힌 지도였다.",
            failureText: "오래된 지도라 일부만 읽을 수 있다.",
          },
          {
            id: "decline",
            label: "됐어, 필요없어",
            detail: "거래를 거절한다.",
            next: "start",
          },
        ],
      },
      ask_about_area: {
        description: "행상인이 의미심장하게 웃는다. \"정보도 공짜는 아니지...\"",
        choices: [
          {
            id: "pay_for_info",
            label: "금 10을 지불한다",
            detail: "돈으로 정보를 산다.",
            cost: { gold: 10 },
            final: true,
            rewards: { intel: 1 },
            penalty: {},
            successText: "앞으로의 길에 대한 조언을 들었다.",
            failureText: "별로 도움이 안 되는 이야기였다.",
          },
          {
            id: "trade_info",
            label: "정보 교환을 제안(정보 1)",
            detail: "서로 정보를 나눈다.",
            cost: { intel: 1 },
            final: true,
            rewards: { intel: 2, gold: 5 },
            penalty: {},
            successText: "서로에게 유익한 거래였다.",
            failureText: "얻은 정보가 이미 아는 내용이었다.",
          },
          {
            id: "nevermind",
            label: "그냥 물건이나 보자",
            next: "show_goods",
          },
        ],
      },
    },
  },

  "event-wounded-soldier": {
    title: "부상당한 병사",
    steps: {
      start: {
        description: "길가에 쓰러진 병사가 신음하고 있다. 피가 많이 흘렀다.",
        choices: [
          {
            id: "help",
            label: "도와준다",
            detail: "응급처치를 시도한다.",
            next: "help_soldier",
          },
          {
            id: "question",
            label: "먼저 질문한다",
            detail: "누구 편이지?",
            next: "interrogate",
          },
          {
            id: "loot_and_leave",
            label: "소지품만 뒤진다",
            detail: "냉정하지만 실용적이다.",
            final: true,
            rewards: { gold: { min: 5, max: 15 }, loot: 1 },
            penalty: { intel: 1 },
            successText: "쓸만한 물건을 찾았다.",
            failureText: "아무것도 없었고, 양심이 찔린다.",
          },
        ],
      },
      help_soldier: {
        description: "병사가 고마워하며 정신을 차린다. \"은혜를 갚겠소...\"",
        choices: [
          {
            id: "ask_reward",
            label: "보상을 요청한다",
            detail: "도움의 대가를 받는다.",
            final: true,
            rewards: { gold: 20, intel: 1 },
            penalty: {},
            successText: "병사가 가진 것을 나눠주었다.",
            failureText: "가진 게 별로 없어 미안해했다.",
          },
          {
            id: "ask_info",
            label: "정보를 요청한다",
            detail: "앞의 상황에 대해 묻는다.",
            final: true,
            rewards: { intel: { min: 2, max: 3 } },
            penalty: {},
            successText: "중요한 적 동태를 알려주었다.",
            failureText: "기억이 흐릿해 자세한 건 몰랐다.",
          },
          {
            id: "just_help",
            label: "아무것도 바라지 않는다",
            detail: "그냥 도와주고 떠난다.",
            final: true,
            rewards: { intel: 1, gold: 10, loot: 1 },
            penalty: {},
            successText: "병사가 감동해 모든 것을 나눠주었다.",
            failureText: "인사만 받고 헤어졌다.",
          },
        ],
      },
      interrogate: {
        description: "병사가 불안한 눈으로 당신을 올려다본다.",
        choices: [
          {
            id: "friendly",
            label: "걱정 마, 적이 아니야",
            detail: "안심시킨다.",
            next: "help_soldier",
          },
          {
            id: "threaten",
            label: "정보를 내놔",
            detail: "협박한다.",
            final: true,
            rewards: { intel: 2 },
            penalty: { gold: 10 },
            successText: "두려움에 모든 걸 털어놓았다.",
            failureText: "입을 다물고 의식을 잃었다.",
          },
          {
            id: "leave_be",
            label: "신경 끄자",
            detail: "상관하지 않는다.",
            final: true,
            rewards: {},
            penalty: {},
            successText: "그냥 지나쳤다.",
            failureText: "뒤에서 저주하는 소리가 들렸다.",
          },
        ],
      },
    },
  },

  "event-strange-signal": {
    title: "이상한 신호",
    steps: {
      start: {
        description: "통신기에서 알 수 없는 신호가 잡힌다. 잡음 속에 뭔가가 있다.",
        choices: [
          {
            id: "decode",
            label: "해독 시도(정보 1)",
            detail: "신호를 분석한다.",
            cost: { intel: 1 },
            next: "decoded",
          },
          {
            id: "trace",
            label: "발신지 추적",
            detail: "신호의 근원지를 찾아간다.",
            next: "trace_source",
          },
          {
            id: "block",
            label: "신호 차단",
            detail: "혹시 모를 위험을 막는다.",
            final: true,
            rewards: {},
            penalty: {},
            successText: "신호가 끊겼다. 안전한 선택이었다.",
            failureText: "기회를 놓친 것 같은 느낌이 든다.",
          },
        ],
      },
      decoded: {
        description: "좌표가 해독됐다. 근처에 뭔가 숨겨져 있다!",
        choices: [
          {
            id: "go_location",
            label: "좌표로 이동",
            detail: "보물이 있을지도?",
            final: true,
            rewards: { loot: { min: 2, max: 4 }, gold: 10 },
            penalty: { loot: 1 },
            successText: "숨겨진 보급품을 발견했다!",
            failureText: "이미 누군가 다녀간 흔적이 있다.",
          },
          {
            id: "sell_coords",
            label: "좌표를 판다",
            detail: "정보를 되판다.",
            final: true,
            rewards: { gold: { min: 15, max: 25 } },
            penalty: {},
            successText: "좋은 값에 팔렸다.",
            failureText: "관심 가지는 사람이 없었다.",
          },
        ],
      },
      trace_source: {
        description: "신호를 따라가니 버려진 통신 기지가 나타났다.",
        choices: [
          {
            id: "enter_base",
            label: "기지 진입",
            detail: "안에 뭐가 있을까?",
            final: true,
            rewards: { intel: 2, material: 1 },
            penalty: { gold: 5 },
            successText: "통신 장비와 자료를 얻었다.",
            failureText: "함정이 있었다. 약간의 피해를 입었다.",
          },
          {
            id: "salvage_antenna",
            label: "안테나만 수거",
            detail: "위험을 피하고 부품만 챙긴다.",
            final: true,
            rewards: { material: { min: 1, max: 2 } },
            penalty: {},
            successText: "쓸만한 부품을 얻었다.",
            failureText: "대부분 녹슬어 있었다.",
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
