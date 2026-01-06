/**
 * @file newEvents.js
 * @description 다단계 이벤트 시스템
 *
 * ## 이벤트 구조
 * - stages: 다단계 대화 지원
 * - choices: 선택지
 * - statRequirement: 스탯 요구조건
 *
 * ## 자원 변환
 * - 에테르(ether) → 은총화(grace)
 *
 * @typedef {Object} EventStage
 * @property {string} description - 단계 설명
 * @property {Object[]} choices - 선택지
 */

import type { NewEventDefinition } from '../types';

export const NEW_EVENT_LIBRARY: Record<string, NewEventDefinition> = {
  // === 자원 이벤트 - 복합 자원 ===
  "broken-ai": {
    id: "broken-ai",
    title: "고장난 AI",
    description: "치치ㅣ지지직. 블루스크린이 떠있는 모니터가 보입니다.",
    difficulty: 'medium',
    choices: [
      { id: "approach", label: "다가간다", nextStage: "inspect" },
      { id: "ignore", label: "무시한다", resultDescription: "굳이 위험을 감수할 필요는 없습니다. 발걸음을 돌립니다." }
    ],
    stages: {
      "inspect": {
        description: "가까이 가니 화면에 '복구 가능' 메시지가 깜빡입니다.",
        choices: [
          { id: "destroy", label: "때려 부순다", resultDescription: "쾅! 모니터가 산산조각 났습니다. 잔해 속에서 쓸만한 부품들이 보입니다.", rewards: { material: 2 } },
          { id: "extract", label: "은총화로 정보 추출", resultDescription: "은총화가 빛을 발하며 AI의 메모리에서 귀중한 정보를 추출합니다.", cost: { grace: 1 }, rewards: { intel: 50 } },
          { id: "repair", label: "수리를 시도한다", statRequirement: { insight: 2 }, nextStage: "repair-result" }
        ]
      },
      "repair-result": {
        description: "수리에 성공했습니다! AI가 감사 인사를 합니다.",
        choices: [
          { id: "accept", label: "정보를 받는다", resultDescription: "\"고맙습니다, 인간.\" AI가 저장된 데이터와 여분의 부품을 건네줍니다.", rewards: { intel: 30, material: 1 } }
        ]
      }
    }
  },

  "merchant": {
    id: "merchant",
    title: "상인",
    description: "세상을 도는 상인입니다. 하지만 지금 물건이 동나 팔 것은 없다네요.",
    difficulty: 'easy',
    choices: [
      { id: "talk", label: "말을 건다", nextStage: "negotiate" },
      { id: "leave", label: "그냥 떠난다", resultDescription: "별 볼 일 없군요. 길을 재촉합니다." }
    ],
    stages: {
      "negotiate": {
        description: "\"대신 돈을 주면 정보를 알려주던가, 원자재를 매입할 의사가 있소.\"",
        choices: [
          { id: "buy-intel", label: "정보를 구매한다", resultDescription: "상인이 귀중한 정보가 적힌 쪽지를 건넵니다.", cost: { gold: 30 }, rewards: { intel: 40 } },
          { id: "sell-material", label: "원자재를 판다", resultDescription: "상인이 원자재를 꼼꼼히 살펴보더니 금화를 꺼냅니다.", cost: { material: 1 }, rewards: { gold: 40 } },
          { id: "leave", label: "됐소", resultDescription: "\"아쉽군. 다음에 또 보시오.\" 상인이 손을 흔듭니다." }
        ]
      }
    }
  },

  "wandering-merchant": {
    id: "wandering-merchant",
    title: "떠돌이 상인",
    description: "🎒 어둠 속에서 등불 하나가 다가옵니다. 커다란 배낭을 짊어진 상인이네요.",
    difficulty: 'easy',
    choices: [
      { id: "shop", label: "🛒 물건을 구경한다", openShop: "wanderer", resultDescription: "상인이 배낭을 열어 물건들을 펼쳐 보입니다." },
      { id: "leave", label: "그냥 지나친다", resultDescription: "상인이 아쉬운 듯 손을 흔듭니다. \"다음에 또 보시오!\"" }
    ]
  },

  "rare-collector": {
    id: "rare-collector",
    title: "수집가",
    description: "🎩 화려한 복장의 신사가 당신을 불러 세웁니다. \"희귀한 물건만 취급합니다.\"",
    difficulty: 'medium',
    choices: [
      { id: "shop", label: "🛒 컬렉션을 구경한다", openShop: "collector", resultDescription: "수집가가 은밀하게 가방을 엽니다. 눈부신 상징들이 빛납니다." },
      { id: "leave", label: "됐습니다", resultDescription: "수집가가 고개를 끄덕입니다. \"현명한 선택일 수도, 후회할 선택일 수도...\"" }
    ]
  },

  "junk-dealer": {
    id: "junk-dealer",
    title: "고물상",
    description: "💰 수레를 끄는 노인이 다가옵니다. \"좋은 물건 있으면 비싸게 사드립니다!\"",
    difficulty: 'easy',
    choices: [
      { id: "shop", label: "💰 물건을 판다", openShop: "buyer", resultDescription: "고물상이 안경을 꺼내 쓰며 물건을 살핍니다." },
      { id: "leave", label: "팔 것 없소", resultDescription: "\"아쉽군요. 좋은 물건 생기면 찾아오시오!\"" }
    ]
  },

  // === 자원 이벤트 - 정보 (알빠리우스 연계) ===
  "alparius-1": {
    id: "alparius-1",
    title: "요원 알빠리우스 1",
    description: "거적으로 푸른 갑옷을 감추고 있는 자와 마주합니다. 그는 자신을 알빠리우스라고 소개합니다.",
    isInitial: true,
    choices: [
      { id: "listen", label: "이야기를 듣는다", nextStage: "offer" },
      { id: "refuse", label: "거절한다", resultDescription: "수상한 자와 엮이고 싶지 않습니다. 무시하고 지나칩니다." }
    ],
    stages: {
      "offer": {
        description: "\"온갖 귀중한 정보를 가지고 있소. 적절한 돈만 주면 얼마든 공유하겠소.\"",
        choices: [
          { id: "accept", label: "거래한다", resultDescription: "알빠리우스가 두꺼운 서류 뭉치를 건넵니다. \"좋은 거래였소.\"", cost: { gold: 50 }, rewards: { intel: 60 }, nextEvent: "alparius-2" },
          { id: "refuse", label: "거절한다", resultDescription: "\"그렇소? 아쉽군.\" 알빠리우스가 어둠 속으로 사라집니다." }
        ]
      }
    }
  },

  "alparius-2": {
    id: "alparius-2",
    title: "요원 알빠리우스 2",
    description: "자기도 알빠리우스라고 주장합니다.",
    isInitial: false,
    choices: [
      { id: "question", label: "아까 그 사람 아니오?", nextStage: "explain" },
      { id: "accept", label: "또 거래한다", resultDescription: "이번에도 정보를 건넵니다. 분명 아까 그 사람 같은데..?", cost: { gold: 50 }, rewards: { intel: 60 }, nextEvent: "alparius-3" },
      { id: "refuse", label: "거절한다", resultDescription: "뭔가 이상합니다. 더 엮이지 않기로 합니다." }
    ],
    stages: {
      "explain": {
        description: "\"...? 무슨 소리요. 난 처음 보는 얼굴인데.\" 마찬가지로 돈만 주면 정보를 주겠답니다.",
        choices: [
          { id: "accept", label: "거래한다", resultDescription: "정보를 받았습니다. 하지만 점점 혼란스러워집니다.", cost: { gold: 50 }, rewards: { intel: 60 }, nextEvent: "alparius-3" },
          { id: "refuse", label: "수상하군. 거절한다", resultDescription: "이건 뭔가 잘못됐습니다. 서둘러 자리를 뜹니다." }
        ]
      }
    }
  },

  "alparius-3": {
    id: "alparius-3",
    title: "요원 알빠리우스 3",
    description: "웬 앵무새 한 마리가 갑자기 말을 겁니다.",
    isInitial: false,
    choices: [
      { id: "listen", label: "뭐라고?", nextStage: "parrot" },
      { id: "ignore", label: "무시한다", resultDescription: "새가 뭐라고 했는지... 그냥 지나칩니다." }
    ],
    stages: {
      "parrot": {
        description: "\"나는 알빠리우스다..\" 다른 말은 없지만 마치 그 의미를 알지 않냐는 듯 쳐다봅니다.",
        choices: [
          { id: "accept", label: "...거래한다", resultDescription: "앵무새가 금화를 물고 날아가더니 쪽지를 떨어뜨립니다. 정보가 적혀 있습니다.", cost: { gold: 50 }, rewards: { intel: 60 }, nextEvent: "alparius-4" },
          { id: "refuse", label: "미쳤군", resultDescription: "앵무새와 거래라니. 정신을 차려야겠습니다." }
        ]
      }
    }
  },

  "alparius-4": {
    id: "alparius-4",
    title: "요원 알빠리우스 4",
    description: "아무것도 없습니다. 하지만 어디선가 목소리가 들려옵니다.",
    isInitial: false,
    choices: [
      { id: "listen", label: "...?", nextStage: "voice" },
      { id: "ignore", label: "환청이다. 무시한다", resultDescription: "귀를 막고 서둘러 그 자리를 벗어납니다. 환청일 뿐입니다." }
    ],
    stages: {
      "voice": {
        description: "\"나는 알빠리우스다.\"\n\n그저 내가 환청으로 미친 걸까요? 아니면 귀신에 홀린 걸까요?",
        choices: [
          { id: "accept", label: "...거래한다", resultDescription: "허공에 금화를 던지자 사라집니다. 그리고 머릿속에 정보가 각인됩니다.", cost: { gold: 50 }, rewards: { intel: 60 }, nextEvent: "alparius-5" },
          { id: "ignore", label: "제정신 차리자", resultDescription: "머리를 세게 흔듭니다. 정신이 돌아온 것 같습니다." }
        ]
      }
    }
  },

  "alparius-5": {
    id: "alparius-5",
    title: "요원 알빠리우스 5 - 의심",
    description: "무덤에서 웬 목소리가 들려옵니다.",
    isInitial: false,
    choices: [
      { id: "approach", label: "무덤에 다가간다", nextStage: "grave" },
      { id: "refuse", label: "이건 아니다", resultDescription: "무덤과 거래하다니 미친 짓입니다. 서둘러 떠납니다." }
    ],
    stages: {
      "grave": {
        description: "\"우리는 알빠리우스다\"\n\n우리는? 대체 얼마나 많은 알빠리우스가 있단 말인가? 당신은 의심하기 시작합니다.",
        choices: [
          { id: "accept", label: "거래한다", resultDescription: "무덤 위에 금화를 올리자 땅속에서 서류가 솟아오릅니다.", cost: { gold: 50 }, rewards: { intel: 60 }, nextEvent: "alparius-6" },
          { id: "confront", label: "진실을 추궁한다", resultDescription: "\"대체 너희는 뭐냐?!\" 당신의 외침에 순간 침묵이 흐릅니다. 그리고 깨달음이 찾아옵니다.", statRequirement: { insight: 2 }, rewards: { insight: 2 } },
          { id: "refuse", label: "더 이상 믿지 않는다", resultDescription: "이건 사기입니다. 더 이상 속지 않겠습니다." }
        ]
      }
    }
  },

  "alparius-6": {
    id: "alparius-6",
    title: "요원 알빠리우스 6 - 봉인된 진실",
    description: "웬 시체가 나뒹굽니다. 그런데 그 갑옷에는 이렇게 적혀있습니다. \"나는 알빠리우스다.\"",
    isInitial: false,
    choices: [
      { id: "examine", label: "시체를 살핀다", nextStage: "truth" }
    ],
    stages: {
      "truth": {
        description: "모든 것이 명확해집니다. 알빠리우스는 한 사람이 아니었습니다. 이들은 모두 같은 조직의 구성원이었고, 그 조직은 이미 멸망했습니다.\n\n당신은 죽은 자들의 메아리와 거래하고 있었던 것입니다.",
        choices: [
          { id: "become-alparius", label: "나도 알빠리우스다", resultDescription: "갑옷을 입습니다. 이제 당신도 알빠리우스입니다. 그들의 의지가 당신 안에 깃듭니다.", specialRequirement: "alparius-accepted-4-times", rewards: { relic: "alparius-emblem" } },
          { id: "dig-grave", label: "무덤을 파헤친다", resultDescription: "땅을 파헤치자 엄청난 양의 정보 문서가 쏟아져 나옵니다.", rewards: { intel: 100 } },
          { id: "accept-truth", label: "진실을 받아들인다", resultDescription: "모든 것이 이해됩니다. 그들의 지식이 당신의 것이 됩니다.", rewards: { insight: 3 } }
        ]
      }
    }
  },

  // === 자원 이벤트 - 금화 ===
  "casino": {
    id: "casino",
    title: "카지노",
    description: "멋진 카지노에 들릅니다.",
    choices: [
      { id: "enter", label: "들어간다", nextStage: "gamble" },
      { id: "leave", label: "지나친다", resultDescription: "도박은 패가망신의 지름길. 현명하게 지나칩니다." }
    ],
    stages: {
      "gamble": {
        description: "주사위를 잡았습니다. 1~6 중 맞추면 대박입니다!",
        choices: [
          { id: "bet", label: "건다 (금 50)", resultDescription: "주사위가 굴러갑니다... 탁! 숫자가 멈췄습니다.", cost: { gold: 50 }, probability: 1/6, successRewards: { gold: 300 }, failurePenalties: {} },
          { id: "detect-fraud", label: "이건 사기다", statRequirement: { insight: 2 }, nextStage: "exposed" },
          { id: "leave", label: "안 건다", resultDescription: "위험한 도박판에서 빠져나옵니다. 지갑이 무사합니다." }
        ]
      },
      "exposed": {
        description: "당신의 날카로운 눈이 조작된 주사위를 발견했습니다. 딜러가 당황합니다.",
        choices: [
          { id: "blackmail", label: "협박한다", resultDescription: "\"신고당하기 싫으면 금화를 내놔.\" 딜러가 벌벌 떨며 금화를 건넵니다.", rewards: { gold: 200 } },
          { id: "report", label: "신고한다", resultDescription: "경비대가 딜러를 체포합니다. 정보 제공 보상이 주어집니다.", rewards: { intel: 30 } }
        ]
      }
    }
  },

  "gold-on-floor": {
    id: "gold-on-floor",
    title: "금화가 바닥에..",
    description: "세상에, 금화가 바닥에 가득 깔려있습니다!",
    difficulty: 'easy',
    choices: [
      { id: "approach", label: "다가간다", nextStage: "closer" },
      { id: "ignore", label: "함정이다. 무시한다", resultDescription: "탐욕을 버리고 지나칩니다. 뒤에서 '딸깍' 소리가 들렸습니다." }
    ],
    stages: {
      "closer": {
        description: "가까이 가니 바닥에 실이 보입니다. 함정일지도 모릅니다!",
        choices: [
          { id: "take", label: "그래도 집는다", resultDescription: "손을 뻗는 순간— 칙! 날카로운 것이 스쳐 지나갑니다!", rewards: { gold: 100 }, probability: 0.5, failurePenalties: { hp: 30 } },
          { id: "careful", label: "조심히 해체한다", statRequirement: { insight: 2 }, nextStage: "disarm" },
          { id: "leave", label: "포기한다", resultDescription: "아깝지만 목숨보다 소중한 건 없죠. 발걸음을 돌립니다." }
        ]
      },
      "disarm": {
        description: "함정을 성공적으로 해체했습니다! 금화와 함께 장치 부품도 얻었습니다.",
        choices: [
          { id: "collect", label: "전부 챙긴다", resultDescription: "함정 장치와 금화를 모두 수거했습니다. 꽤나 솜씨 좋은 짓이었군요.", rewards: { gold: 100, material: 1 } }
        ]
      }
    }
  },

  "rest-of-dead": {
    id: "rest-of-dead",
    title: "망자의 안식",
    description: "뼈밖에 안 남은 시체가 하나 있습니다. 그냥 무시하려던 찰나 갑자기 입을 엽니다.",
    choices: [
      { id: "listen", label: "말을 듣는다", nextStage: "request" },
      { id: "smash", label: "부숴버린다", resultDescription: "우드득! 뼈가 부서지며 안에서 쓸만한 재료가 나옵니다.", rewards: { material: 1 } },
      { id: "ignore", label: "무시한다", resultDescription: "무시하고 지나가려는데 시체가 벌떡 일어납니다!", combatTrigger: true, combatRewards: { gold: 80 } }
    ],
    stages: {
      "request": {
        description: "\"날 안식에 들게 해주면 금을 주겠다…..\"",
        choices: [
          { id: "pray", label: "기도해준다", cost: { grace: 1 }, nextStage: "peace" },
          { id: "loot", label: "유품만 챙긴다", resultDescription: "시체 곁에 있던 금화를 슬쩍 챙깁니다. 시체는 한숨을 쉽니다.", rewards: { gold: 40 } },
          { id: "destroy", label: "시체를 박살낸다", resultDescription: "우드득! 시체를 부수자 금화가 쏟아집니다. 하지만 저주받은 기운이 스며듭니다.", rewards: { gold: 80 }, penalties: { card: "curse" } }
        ]
      },
      "peace": {
        description: "영혼이 평화롭게 승천합니다. 바닥에서 금화가 솟아오릅니다.",
        choices: [
          { id: "collect", label: "금화를 줍는다", resultDescription: "영혼의 감사와 함께 금화가 손에 들어옵니다. 따뜻한 기운이 느껴집니다.", rewards: { gold: 80, grace: 1 } }
        ]
      }
    }
  },

  "begging-child": {
    id: "begging-child",
    title: "구걸하는 아이",
    description: "누더기를 입은 아이가 손을 내밉니다. \"도와주세요...\"",
    choices: [
      { id: "approach", label: "다가간다", nextStage: "closer" },
      { id: "ignore", label: "무시한다", resultDescription: "아이의 눈물 어린 눈을 외면합니다. 마음 한구석이 무거워집니다.", penalties: { insight: 1 } }
    ],
    stages: {
      "closer": {
        description: "아이의 눈에서 눈물이 흐릅니다. 진심으로 배가 고파 보입니다.",
        choices: [
          { id: "help", label: "금화를 준다", cost: { gold: 30 }, nextStage: "gratitude" },
          { id: "exploit", label: "이용한다", resultDescription: "아이에게서 정보를 캐냅니다. 아이의 눈빛이 어두워집니다.", statRequirement: { insight: 2 }, rewards: { intel: 30 }, penalties: { card: "curse" } },
          { id: "leave", label: "그냥 간다", resultDescription: "도와줄 여유가 없습니다. 아이를 뒤로하고 떠납니다." }
        ]
      },
      "gratitude": {
        description: "아이가 감사하며 무언가를 건넵니다. \"이건 어머니가 주신 거예요...\"",
        choices: [
          { id: "accept", label: "받는다", resultDescription: "아이의 손에서 따뜻한 빛이 나는 물건을 받습니다. 특별한 기운이 느껴집니다.", rewards: { insight: 2, card: "blessing" } },
          { id: "refuse", label: "네가 가져라", resultDescription: "\"소중한 건 네가 가지렴.\" 아이가 환하게 웃습니다. 마음이 맑아집니다.", rewards: { insight: 3 } }
        ]
      }
    }
  },

  // === 자원 이벤트 - 전리품 ===
  "bloody-warrior": {
    id: "bloody-warrior",
    title: "피투성이 전사",
    description: "비틀거리며 당장이라도 쓰러질 것 같은 전사가 훌륭한 전리품을 들고 있습니다.",
    choices: [
      { id: "approach", label: "다가간다", nextStage: "encounter" },
      { id: "ignore", label: "지나친다", resultDescription: "남의 일에 끼어들 필요 없습니다. 조용히 지나칩니다." }
    ],
    stages: {
      "encounter": {
        description: "전사가 당신을 올려다봅니다. \"살려줘...\"",
        choices: [
          { id: "help", label: "치료해준다", cost: { grace: 1 }, nextStage: "healed" },
          { id: "trade", label: "전리품만 달라", nextStage: "bargain" },
          { id: "backstab", label: "뒤통수를 친다", resultDescription: "퍽! 전사가 쓰러집니다. 전리품을 모두 챙깁니다. 하지만 마음이 불편합니다.", rewards: { loot: 3 }, penalties: { insight: 2 } }
        ]
      },
      "healed": {
        description: "전사가 기력을 회복합니다. \"은혜를 갚겠소. 이 전리품을 받아주시오.\"",
        choices: [
          { id: "accept", label: "받는다", resultDescription: "전사가 감사의 인사와 함께 전리품과 정보를 건넵니다.", rewards: { loot: 2, intel: 20 } },
          { id: "refuse", label: "됐소", resultDescription: "\"필요 없소. 건강히 가시오.\" 전사가 감동한 표정으로 떠납니다.", rewards: { insight: 1 } }
        ]
      },
      "bargain": {
        description: "\"...알겠소. 목숨값이라 생각하겠소.\" 전사가 억울한 표정으로 전리품을 건넵니다.",
        choices: [
          { id: "take", label: "받는다", resultDescription: "전리품을 받아듭니다. 전사의 원망 어린 눈빛이 느껴집니다.", rewards: { loot: 2 }, penalties: { insight: 1 } }
        ]
      }
    }
  },

  "sacrifice-sheep": {
    id: "sacrifice-sheep",
    title: "희생양",
    description: "묶여있는 양을 발견했습니다. 애처롭게 울고 있습니다.",
    choices: [
      { id: "observe", label: "지켜본다", nextStage: "monster" },
      { id: "leave", label: "냅둔다", resultDescription: "양의 울음소리가 멀어집니다. 뒤에서 비명소리가 들립니다. 이 지역이 위험해졌습니다.", penalties: { mapRisk: 15 } }
    ],
    stages: {
      "monster": {
        description: "괴물 하나가 양을 향해 달려듭니다!",
        choices: [
          { id: "save", label: "구한다!", resultDescription: "양을 구하기 위해 뛰어듭니다!", combatTrigger: true, combatRewards: { loot: 2 } },
          { id: "watch", label: "구경한다", resultDescription: "양이 잡아먹히는 것을 지켜봅니다. 찝찝한 기분이 듭니다.", penalties: { insight: 1 } }
        ]
      }
    }
  },

  // === 전투 이벤트 ===
  "fighter": {
    id: "fighter",
    title: "승부사",
    description: "너!!! 그래, 너!!! 나와 싸우자아아아아앗!!!!",
    choices: [
      { id: "respond", label: "뭐야 이 사람", nextStage: "confrontation" },
      { id: "flee", label: "도망간다", resultDescription: "재빠르게 도망칩니다. \"야!! 비겁한 놈!!!\" 뒤에서 소리가 들립니다.", statRequirement: { agility: 1 } }
    ],
    stages: {
      "confrontation": {
        description: "미친 눈빛으로 달려듭니다. 피할 수 없어 보입니다.",
        choices: [
          { id: "fight", label: "싸운다", resultDescription: "정면 대결을 받아들입니다!", combatTrigger: true, combatRewards: { hpRestore: "full" } },
          { id: "tackle", label: "선제 몸통박치기", resultDescription: "퍽! 먼저 몸통박치기를 날립니다!", statRequirement: { strength: 1 }, combatTrigger: true, combatModifier: { enemyHp: 0.5 } },
          { id: "execute", label: "죽인다", resultDescription: "한 순간에 승부가 끝났습니다. 상대는 더 이상 움직이지 않습니다.", specialRequirement: "death-card-mastery", instantKill: true }
        ]
      }
    }
  },

  "scarecrow": {
    id: "scarecrow",
    title: "허수아비",
    description: "나는.. 무적이다.. 중얼거리는 인형과 마주했습니다.",
    appearCondition: { minStat: { strength: 10, agility: 10 } },
    choices: [
      { id: "approach", label: "다가간다", nextStage: "test" },
      { id: "ignore", label: "무시한다", resultDescription: "이상한 인형입니다. 그냥 지나칩니다." }
    ],
    stages: {
      "test": {
        description: "인형이 당신을 바라봅니다. 시험해볼까요?",
        choices: [
          { id: "test", label: "시험해본다", resultDescription: "허수아비가 움직이기 시작합니다!", timedCombat: true, combatSuccessRewards: { grace: 1 }, combatFailurePenalties: { mapRisk: 20 } },
          { id: "leave", label: "그만둔다", resultDescription: "굳이 위험을 감수할 필요는 없습니다. 물러납니다." }
        ]
      }
    }
  },

  "suspicious-merchant": {
    id: "suspicious-merchant",
    title: "수상한 상인",
    description: "웬 상인이 기적의 물약을 팔고 있습니다.",
    choices: [
      { id: "listen", label: "들어본다", nextStage: "sales" },
      { id: "refuse", label: "거절한다", resultDescription: "수상한 냄새가 납니다. 무시하고 지나칩니다." }
    ],
    stages: {
      "sales": {
        description: "\"이걸 마시면 무적이 됩니다!\" 수상한 냄새가 납니다.",
        choices: [
          { id: "buy", label: "구매한다", resultDescription: "꿀꺽. 물약을 마셨지만... 아무 효과도 없습니다! 사기당했습니다!", appearCondition: { maxStat: { insight: 4 } }, cost: { gold: 50 }, penalties: { card: "useless-curse" } },
          { id: "expose", label: "사기꾼!", statRequirement: { insight: 2 }, nextStage: "exposed" },
          { id: "refuse", label: "됐어", resultDescription: "\"에이, 아깝네~\" 상인이 투덜거립니다. 현명한 선택이었습니다." }
        ]
      },
      "exposed": {
        description: "당신의 날카로운 눈에 상인이 당황합니다. \"잠깐, 잠깐! 진짜를 보여주지!\"",
        choices: [
          { id: "demand", label: "배상하라", resultDescription: "\"알았어, 알았어!\" 상인이 울며 금화를 건넵니다.", rewards: { gold: 30 } },
          { id: "report", label: "신고한다", resultDescription: "경비대를 불러 상인을 체포합니다. 제보 포상이 주어집니다.", rewards: { intel: 20 } }
        ]
      }
    }
  },

  // === 기억·강화 이벤트 ===
  "shrine": {
    id: "shrine",
    title: "성소",
    description: "작은 동굴 아래 촛불이 켜져있는 소형 성소를 발견했습니다.",
    choices: [
      { id: "pray", label: "기도한다", nextStage: "offering" },
      { id: "leave", label: "그냥 간다", resultDescription: "성스러운 곳이지만 지금은 갈 길이 바쁩니다." }
    ],
    stages: {
      "offering": {
        description: "기도하시겠습니까? 은총화를 바치면 기억을 얻을 수 있습니다.",
        choices: [
          { id: "offer-1", label: "은총화 1을 바친다", resultDescription: "은총화가 빛을 내며 사라집니다. 머릿속에 기억이 새겨집니다.", cost: { grace: 1 }, rewards: { memory: 100 } },
          { id: "offer-2", label: "은총화 2를 바친다", resultDescription: "강렬한 빛이 일어납니다. 더 깊은 기억이 각성됩니다.", cost: { grace: 2 }, rewards: { memory: 200 } },
          { id: "offer-3", label: "은총화 3을 바친다", resultDescription: "눈부신 광휘! 과거의 기억이 폭포처럼 쏟아집니다.", cost: { grace: 3 }, rewards: { memory: 300 } },
          { id: "leave", label: "그만둔다", resultDescription: "기도를 마치고 조용히 물러납니다." }
        ]
      }
    }
  },

  "altar": {
    id: "altar",
    title: "제단",
    description: "피비린내가 진동하는 강 위에 칼을 손에 쥔 제단이 눈에 띕니다.",
    choices: [
      { id: "approach", label: "다가간다", nextStage: "sacrifice" },
      { id: "leave", label: "지나친다", resultDescription: "끔찍한 곳입니다. 서둘러 지나칩니다." }
    ],
    stages: {
      "sacrifice": {
        description: "이 제단이 무엇을 요구하는지는 명확합니다. 피입니다.",
        choices: [
          { id: "sacrifice-10", label: "체력 10을 바친다", resultDescription: "손바닥을 그어 피를 흘립니다. 제단이 붉게 빛나며 기억이 밀려옵니다.", hpRequirement: { min: 21 }, cost: { hp: 10 }, rewards: { memory: 120 } },
          { id: "sacrifice-20", label: "체력 20을 바친다", resultDescription: "더 깊이 베어 피를 바칩니다. 제단이 크게 떨리며 강렬한 기억이 새겨집니다.", hpRequirement: { min: 41 }, cost: { hp: 20 }, rewards: { memory: 250 } },
          { id: "sacrifice-30", label: "체력 30을 바친다", resultDescription: "피가 제단을 적십니다. 엄청난 고통과 함께 과거의 기억이 폭발적으로 각성됩니다.", hpRequirement: { min: 41 }, cost: { hp: 30 }, rewards: { memory: 400 } },
          { id: "leave", label: "그만둔다", resultDescription: "피를 바칠 용기가 없습니다. 물러납니다." }
        ]
      }
    }
  },

  "corrupted-altar": {
    id: "corrupted-altar",
    title: "오염된 제단",
    description: "검은 기운이 흐르는 제단입니다. 사악한 힘이 느껴집니다.",
    choices: [
      { id: "approach", label: "다가간다", nextStage: "choice" },
      { id: "ignore", label: "무시한다", resultDescription: "불길한 기운이 느껴집니다. 멀리 피하는 게 현명합니다." }
    ],
    stages: {
      "choice": {
        description: "제단에서 속삭임이 들립니다. \"피를... 아니면... 정화를...\"",
        choices: [
          { id: "sacrifice", label: "피를 바친다", resultDescription: "검은 제단이 당신의 피를 흡수합니다. 기억과 함께 저주가 스며듭니다.", hpRequirement: { min: 40 }, cost: { hp: 30 }, rewards: { memory: 300 }, penalties: { card: "curse" } },
          { id: "purify", label: "정화를 시도한다", cost: { grace: 2 }, nextStage: "purified" },
          { id: "leave", label: "떠난다", resultDescription: "이 제단과 엮이고 싶지 않습니다. 서둘러 떠납니다." }
        ]
      },
      "purified": {
        description: "제단의 어둠이 걷힙니다. 그 안에서 축복받은 무언가가 나타납니다.",
        choices: [
          { id: "take", label: "받는다", resultDescription: "정화된 제단에서 축복의 힘이 솟아오릅니다. 빛나는 무언가를 얻었습니다.", rewards: { card: "blessing" } }
        ]
      }
    }
  },

  "introspection": {
    id: "introspection",
    title: "성찰",
    description: "거대한 불상 아래 웅덩이가 있습니다.",
    choices: [
      { id: "look", label: "들여다본다", nextStage: "reflection" },
      { id: "leave", label: "그냥 간다", resultDescription: "물웅덩이일 뿐입니다. 지나칩니다." }
    ],
    stages: {
      "reflection": {
        description: "수면에 자신의 모습이 비칩니다. 무언가 다른 자신이 보입니다.",
        choices: [
          { id: "dive", label: "뛰어든다", resultDescription: "철벅! 물속으로 뛰어듭니다. 다른 자신과 하나가 됩니다. 새로운 개성이 깨어납니다.", rewards: { trait: "random" } },
          { id: "leave", label: "물러난다", resultDescription: "아직 준비가 되지 않았습니다. 조용히 물러납니다." }
        ]
      }
    }
  },

  // === 은총화 이벤트 ===
  "windmill": {
    id: "windmill",
    title: "풍차",
    description: "거대한 풍차가 있습니다. \"기도하고자 하는 자 풍차를 돌려라..\"",
    choices: [
      { id: "approach", label: "풍차에 다가간다", nextStage: "turn" },
      { id: "give-up", label: "포기한다", resultDescription: "풍차가 너무 무거워 보입니다. 포기하고 떠납니다." }
    ],
    stages: {
      "turn": {
        description: "무거운 풍차입니다. 돌리시겠습니까?",
        choices: [
          { id: "turn-hard", label: "힘들어도 돌린다", resultDescription: "끼이익... 온 힘을 다해 풍차를 돌립니다. 은총의 빛이 내려옵니다.", cost: { hp: 8 }, rewards: { grace: 1 } },
          { id: "turn-easy", label: "가뿐히 돌린다", resultDescription: "힘이 좋군요! 풍차가 가볍게 돌아갑니다. 은총이 내려옵니다.", statRequirement: { strength: 2 }, rewards: { grace: 1 } },
          { id: "turn-fast", label: "쌩쌩 돌린다", resultDescription: "엄청난 힘으로 풍차가 회전합니다! 은총과 함께 특별한 무언가가 나타납니다.", statRequirement: { strength: 3 }, rewards: { grace: 1, relic: "rare" } },
          { id: "give-up", label: "포기한다", resultDescription: "역시 무리입니다. 물러납니다." }
        ]
      }
    }
  },

  "blood-offering": {
    id: "blood-offering",
    title: "피를 흘려라",
    description: "붉게 장식된 카펫에 거대한 우상이 서있습니다. 많은 사람들이 숭배하고 있습니다.",
    choices: [
      { id: "approach", label: "다가간다", nextStage: "demand" },
      { id: "leave", label: "그냥 떠난다", resultDescription: "불길한 기운이 느껴집니다. 이곳을 피해 떠납니다." }
    ],
    stages: {
      "demand": {
        description: "\"피.. 피를 흘려보내라..\" 모든 사람들의 시선이 당신에게 쏠립니다.",
        choices: [
          { id: "self-cut", label: "자신의 손바닥을 긋는다", resultDescription: "칼날이 손바닥을 스칩니다. 피가 제단에 떨어지자 은총의 빛이 내려옵니다.", cost: { hp: 10 }, rewards: { grace: 2 } },
          { id: "kill-other", label: "옆사람의 목을 자른다", resultDescription: "퍽! 옆사람이 쓰러집니다. 우상이 환희에 찬 빛을 뿜습니다. 하지만 마음이 어두워집니다.", rewards: { grace: 5 }, penalties: { card: "curse", insight: 2 } },
          { id: "kill-all", label: "모두 죽인다", resultDescription: "피바다가 됩니다. 기억이 폭발적으로 밀려오지만, 저주가 깊이 새겨집니다.", rewards: { memory: 500 }, penalties: { card: "curse-2", insight: 3 } },
          { id: "refuse", label: "거부한다", resultDescription: "\"감히..!\" 광신도들이 달려듭니다!", combatTrigger: true }
        ]
      }
    }
  },

  "ether-fountain": {
    id: "ether-fountain",
    title: "은총화 분수",
    description: "투명한 은총화가 분수처럼 솟아오르는 곳을 발견했습니다.",
    choices: [
      { id: "approach", label: "다가간다", nextStage: "drink" },
      { id: "leave", label: "지나친다", resultDescription: "신비로운 곳이지만 지금은 갈 길이 바쁩니다." }
    ],
    stages: {
      "drink": {
        description: "신비로운 기운이 느껴집니다. 어떻게 하시겠습니까?",
        choices: [
          { id: "drink", label: "마신다", resultDescription: "시원한 은총화가 목을 타고 내려갑니다. 몸 안에서 빛이 퍼집니다.", rewards: { grace: 2 } },
          { id: "immerse", label: "몸을 담근다", resultDescription: "차가운 물에 몸을 담급니다. 고통스럽지만 온몸이 은총으로 가득 찹니다.", cost: { hp: 20 }, rewards: { grace: 3 } },
          { id: "careful", label: "소량만 취한다", resultDescription: "조심스럽게 한 모금만 마십니다. 은은한 빛이 느껴집니다.", rewards: { grace: 1 } }
        ]
      }
    }
  },

  "freed-soul": {
    id: "freed-soul",
    title: "해방된 영혼",
    description: "영혼이 은총화로 승화하고 있습니다.",
    choices: [
      { id: "observe", label: "지켜본다", nextStage: "choice" },
      { id: "ignore", label: "무시한다", resultDescription: "영혼은 영혼의 일입니다. 조용히 지나칩니다." }
    ],
    stages: {
      "choice": {
        description: "영혼이 당신을 바라봅니다. 무언가를 원하는 것 같습니다.",
        choices: [
          { id: "absorb", label: "영혼을 흡수한다", resultDescription: "영혼을 향해 손을 뻗습니다...", probability: 0.5, successRewards: { grace: 2 }, failurePenalties: { card: "curse" } },
          { id: "comfort", label: "영혼을 위로한다", resultDescription: "\"편히 가세요.\" 영혼이 미소 짓더니 감사의 빛을 남기고 사라집니다.", rewards: { insight: 1, grace: 1 } },
          { id: "leave", label: "그냥 둔다", resultDescription: "영혼의 승화를 묵묵히 지켜봅니다. 영혼이 하늘로 올라갑니다." }
        ]
      }
    }
  },

  // === 카드 이벤트 ===
  "well-of-oblivion": {
    id: "well-of-oblivion",
    title: "망각의 우물",
    description: "갈증에 시달리던 때, 우물을 발견해 퍼올렸습니다.",
    choices: [
      { id: "smell", label: "냄새를 맡아본다", nextStage: "strange" },
      { id: "discard", label: "버린다", resultDescription: "이상한 느낌이 듭니다. 물을 버리고 떠납니다. 갈증은 참아야겠습니다.", cost: { hp: 15 } }
    ],
    stages: {
      "strange": {
        description: "뭔가 이상한 냄새가 납니다. 마시면 무언가 잊힐 것 같습니다.",
        choices: [
          { id: "drink", label: "마신다", resultDescription: "꿀꺽. 머릿속이 멍해집니다. 무언가를 잊었지만, 새로운 기억이 떠오릅니다.", cardAction: { lose: 1, gain: 1 } },
          { id: "discard", label: "버린다", resultDescription: "역시 마시면 안 될 것 같습니다. 물을 쏟아버립니다." }
        ]
      }
    }
  },

  "memory-library": {
    id: "memory-library",
    title: "추억의 도서관",
    description: "알 수 없는 도서관에 들어섰습니다.",
    choices: [
      { id: "enter", label: "안으로 들어간다", nextStage: "inside" },
      { id: "leave", label: "나간다", resultDescription: "도서관의 먼지 냄새가 싫습니다. 그냥 나갑니다." }
    ],
    stages: {
      "inside": {
        description: "어째서인지 옛 기억이 떠오릅니다. 책장에서 빛이 납니다.",
        choices: [
          { id: "select-1", label: "책 하나를 고른다", resultDescription: "책을 펼치자 빛이 쏟아집니다. 새로운 기술이 각성됩니다.", cardAction: { select: 1 } },
          { id: "select-2", label: "여러 권 고른다", resultDescription: "여러 권의 책에서 동시에 빛이 솟아오릅니다! 다양한 기술이 각성됩니다.", statRequirement: { insight: 2 }, cardAction: { select: 2 } },
          { id: "store", label: "기억을 보관한다", resultDescription: "당신의 기억 하나가 책장에 보관됩니다. 몸이 가벼워집니다.", cardAction: { lose: 1 }, rewards: { hp: 20 } }
        ]
      }
    }
  },

  "training-ground": {
    id: "training-ground",
    title: "훈련장",
    description: "PT 8번 준비!!!! 영문을 모르겠지만 어쨌든 합시다.",
    choices: [
      { id: "join", label: "참여한다", nextStage: "train" },
      { id: "flee", label: "도망친다", resultDescription: "이건 아닌 것 같습니다. 슬쩍 도망칩니다." }
    ],
    stages: {
      "train": {
        description: "힘든 훈련이 시작됩니다. 어떻게 임하시겠습니까?",
        choices: [
          { id: "train", label: "일반 훈련", resultDescription: "\"하나! 둘! 하나! 둘!\" 힘들지만 새로운 기술을 익혔습니다.", cost: { hp: 15 }, cardAction: { gainRandom: 1 } },
          { id: "special-train", label: "특별 훈련", resultDescription: "강인한 체력으로 특별 훈련을 완료했습니다. 원하는 기술을 배웁니다.", statRequirement: { strength: 2 }, cardAction: { selectAny: 1 } },
          { id: "quit", label: "포기한다", resultDescription: "\"탈락!\" 교관의 고함소리와 함께 쫓겨납니다." }
        ]
      }
    }
  },

  "mad-logic": {
    id: "mad-logic",
    title: "광란의 논리",
    description: "횡설수설하는 노인네와 마주합니다.",
    choices: [
      { id: "listen", label: "들어본다", nextStage: "rambling" },
      { id: "ignore", label: "무시한다", resultDescription: "정신 나간 노인입니다. 무시하고 지나칩니다." }
    ],
    stages: {
      "rambling": {
        description: "당신을 붙잡은 채 입 냄새 나는 헛소리를 지껄입니다. 어쩔까요?",
        choices: [
          { id: "pay", label: "돈 좀 쥐어준다", resultDescription: "\"그래, 이거면 되겠군!\" 노인이 금화를 받고 사라집니다.", cost: { gold: 20 } },
          { id: "argue-win", label: "논쟁한다", resultDescription: "\"흠... 네 말도 일리가 있군!\" 논쟁에서 이겼습니다. 노인이 비법을 알려줍니다.", statRequirement: { insight: 2 }, cardAction: { selectAny: 1 } },
          { id: "argue-lose", label: "논쟁하다 진다", resultDescription: "\"이런 멍청이! 네 논리는 틀렸어!\" 논쟁에서 지고 혼란에 빠집니다.", appearCondition: { maxStat: { insight: 1 } }, cardAction: { loseRandom: 1 } },
          { id: "violence", label: "폭력으로 해결", resultDescription: "퍽! 노인을 때리자 주머니에서 뭔가 떨어집니다.", statRequirement: { strength: 1 }, cardAction: { gainRandom: 1 } }
        ]
      }
    }
  },

  "defense": {
    id: "defense",
    title: "변호",
    description: "웬 깡통 로봇이 자신은 무고하다며 도와달라 합니다.",
    choices: [
      { id: "listen", label: "들어본다", nextStage: "story" },
      { id: "ignore", label: "무시한다", resultDescription: "로봇의 일에 관심 없습니다. 그냥 지나칩니다." }
    ],
    stages: {
      "story": {
        description: "\"저는 무고합니다! 벌받고 있지만 저는 아무것도 안 했어요!\"",
        choices: [
          { id: "believe", label: "믿고 변호한다", resultDescription: "변호에 성공했습니다! 로봇이 감사의 선물로 데이터 칩을 건넵니다.", cardAction: { gainRandom: 1 } },
          { id: "destroy", label: "박살낸다", resultDescription: "쾅! 로봇을 부숴버립니다. 부품을 챙기지만 어딘가 시선이 느껴집니다.", rewards: { material: 2 }, penalties: { mapRisk: 10 } },
          { id: "leave", label: "그냥 간다", resultDescription: "\"제발...!\" 로봇의 외침을 뒤로하고 떠납니다." }
        ]
      }
    }
  },

  // === 상징 이벤트 ===
  "relic-junk-dealer": {
    id: "relic-junk-dealer",
    title: "고물상의 상징",
    description: "이봐, 이거 어때? 고물상이 상징을 보여줍니다.",
    choices: [
      { id: "look", label: "살펴본다", nextStage: "offer" },
      { id: "refuse", label: "거절", resultDescription: "쓸모없는 고물들입니다. 그냥 지나칩니다." }
    ],
    stages: {
      "offer": {
        description: "\"금 100이면 이 상징을 줄게. 어때?\"",
        choices: [
          { id: "accept", label: "수락", resultDescription: "금화를 건네자 고물상이 상징을 내밀며 싱긋 웃습니다.", cost: { gold: 100 }, rewards: { relic: "1" } },
          { id: "more", label: "다른 것도 보여줘", statRequirement: { insight: 1 }, nextStage: "more-items" },
          { id: "refuse", label: "거절", resultDescription: "\"에이, 아깝네.\" 고물상이 투덜거립니다." }
        ]
      },
      "more-items": {
        description: "\"오, 눈이 높군! 이건 어때?\" 더 좋은 물건을 꺼냅니다.",
        choices: [
          { id: "buy-rare", label: "구매 (금 150)", resultDescription: "이건 진짜 명품입니다! 고물상이 소중히 건넵니다.", cost: { gold: 150 }, rewards: { relic: "rare" } },
          { id: "refuse", label: "됐어", resultDescription: "\"흥, 눈만 높고 주머니는 얕군.\" 고물상이 투덜거립니다." }
        ]
      }
    }
  },

  "scrap-pile": {
    id: "scrap-pile",
    title: "고철더미",
    description: "고철더미 아래로 귀중한 무언가가 느껴집니다.",
    choices: [
      { id: "examine", label: "살펴본다", nextStage: "dig" },
      { id: "leave", label: "지나친다", resultDescription: "손 더럽히기 싫습니다. 그냥 지나칩니다." }
    ],
    stages: {
      "dig": {
        description: "파내려면 힘이 들 것 같습니다.",
        choices: [
          { id: "dig", label: "파낸다", resultDescription: "으으윽... 힘들게 고철을 치우자 빛나는 상징이 모습을 드러냅니다.", cost: { hp: 20 }, rewards: { relic: "1" } },
          { id: "throw", label: "힘으로 치운다", resultDescription: "강한 힘으로 고철을 한번에 치웁니다! 상징이 나타났습니다.", statRequirement: { strength: 2 }, rewards: { relic: "1" } },
          { id: "leave", label: "포기한다", resultDescription: "너무 힘들어 보입니다. 포기하고 떠납니다." }
        ]
      }
    }
  },

  "trap-beyond": {
    id: "trap-beyond",
    title: "함정 너머에",
    description: "위험해 보이는 미로 너머에 번쩍이는 상징이 보입니다.",
    choices: [
      { id: "approach", label: "도전한다", nextStage: "attempt" },
      { id: "leave", label: "포기한다", resultDescription: "목숨보다 소중한 건 없습니다. 아쉽지만 물러납니다." }
    ],
    stages: {
      "attempt": {
        description: "함정이 보입니다. 어떻게 통과하시겠습니까?",
        choices: [
          { id: "rush", label: "달려간다", resultDescription: "쿵! 챵! 퍽! 상처투성이가 됐지만 상징을 손에 넣었습니다!", cost: { hp: 25 }, rewards: { relic: "1" } },
          { id: "dodge", label: "민첩하게 피한다", resultDescription: "화살이 스쳐 지나갑니다! 날렵하게 상징을 획득했습니다.", statRequirement: { agility: 2 }, rewards: { relic: "1" } },
          { id: "retreat", label: "물러난다", resultDescription: "역시 위험합니다. 물러나는 게 현명합니다." }
        ]
      }
    }
  },

  "pie-in-sky": {
    id: "pie-in-sky",
    title: "그림의 떡",
    description: "강력한 무인 보안 시스템이 귀중품을 보관하고 있습니다.",
    choices: [
      { id: "examine", label: "살펴본다", nextStage: "analysis" },
      { id: "give-up", label: "포기한다", resultDescription: "이건 불가능해 보입니다. 미련 없이 떠납니다." }
    ],
    stages: {
      "analysis": {
        description: "뚫으려면 엄청난 힘과 민첩이 필요합니다.",
        choices: [
          { id: "attempt", label: "시도한다", resultDescription: "쾅! 슉! 쨍! 불가능을 가능으로 만들었습니다! 희귀 상징을 획득했습니다!", statRequirement: { strength: 2, agility: 2 }, rewards: { relic: "rare+" } },
          { id: "give-up", label: "포기한다", resultDescription: "아직 실력이 부족합니다. 다음 기회를 노립니다." }
        ]
      }
    }
  },

  "among-fakes": {
    id: "among-fakes",
    title: "가짜들 속에..",
    description: "보물들이 잔뜩 있는 방을 발견했습니다.",
    choices: [
      { id: "enter", label: "들어간다", nextStage: "choose" },
      { id: "leave", label: "나간다", resultDescription: "함정일지도 모릅니다. 조심스럽게 물러납니다." }
    ],
    stages: {
      "choose": {
        description: "하지만 진짜는 숨겨져 있는 것 같군요..",
        choices: [
          { id: "grab-any", label: "아무거나 집는다", resultDescription: "손에 잡히는 대로 집어봅니다...", probability: 0.1, successRewards: { relic: 1 } },
          { id: "find-real", label: "진짜를 찾는다", resultDescription: "날카로운 눈으로 진짜를 발견했습니다! 다른 것들은 전부 가짜였군요.", statRequirement: { insight: 1 }, rewards: { relic: "1" } },
          { id: "leave", label: "그만둔다", resultDescription: "분별이 안 됩니다. 그냥 나갑니다." }
        ]
      }
    }
  },

  "debris": {
    id: "debris",
    title: "잔해더미",
    description: "한바탕 전투가 벌어진 곳입니다. 귀중품이 있을지 모릅니다.",
    choices: [
      { id: "search", label: "뒤진다", nextStage: "searching" },
      { id: "leave", label: "그냥 떠난다", resultDescription: "시체 냄새가 진동합니다. 서둘러 떠납니다." }
    ],
    stages: {
      "searching": {
        description: "어디를 뒤지시겠습니까?",
        choices: [
          { id: "large", label: "큰 잔해", resultDescription: "힘을 써서 큰 잔해를 치웁니다. 그 밑에서 상징을 발견했습니다!", statRequirement: { strength: 2 }, rewards: { relic: "1" } },
          { id: "small", label: "작은 잔해", resultDescription: "작은 잔해를 뒤집니다...", statRequirement: { strength: 1 }, probability: 0.5, successRewards: { relic: "1" } },
          { id: "insight", label: "유력한 장소", resultDescription: "예리한 관찰력으로 숨겨진 상징을 찾아냈습니다!", statRequirement: { insight: 2 }, rewards: { relic: "1" } },
          { id: "both", label: "확실한 장소", resultDescription: "힘과 지혜를 모두 동원해 최고의 상징을 발굴했습니다!", statRequirement: { strength: 2, insight: 2 }, rewards: { relic: "rare" } },
          { id: "leave", label: "그만둔다", resultDescription: "더 뒤져봐야 의미가 없을 것 같습니다. 떠납니다." }
        ]
      }
    }
  },

  "refugee": {
    id: "refugee",
    title: "피난민",
    description: "지친 기색이 역력한 피난민과 조우합니다.",
    choices: [
      { id: "talk", label: "말을 건다", nextStage: "request" },
      { id: "ignore", label: "무시한다", resultDescription: "피난민의 절박한 눈빛을 외면합니다. 남의 일입니다." }
    ],
    stages: {
      "request": {
        description: "\"가보를 줄 테니 제발 먹을 걸 달라\"고 요청합니다.",
        choices: [
          { id: "steal", label: "강탈한다", resultDescription: "피난민의 소지품을 빼앗습니다. 저주의 시선이 느껴집니다.", rewards: { relic: "1" }, penalties: { card: "curse" } },
          { id: "trade", label: "교환한다", resultDescription: "공정한 거래입니다. 피난민이 가보를 건넵니다.", cost: { material: 2 }, rewards: { relic: "1" } },
          { id: "help", label: "도와준다", cost: { gold: 50 }, nextStage: "gratitude" }
        ]
      },
      "gratitude": {
        description: "피난민이 눈물을 흘리며 감사합니다. \"언젠가 꼭 보답하겠습니다...\"",
        choices: [
          { id: "accept", label: "가보를 받는다", resultDescription: "\"이건 우리 가문의 가보입니다. 받아주세요.\" 상징과 함께 따뜻함이 전해집니다.", rewards: { relic: "1", insight: 1 } },
          { id: "refuse", label: "가지고 있어라", resultDescription: "\"소중한 건 네가 가지렴.\" 피난민이 감격해 울먹입니다. 마음이 맑아집니다.", rewards: { insight: 2 } }
        ]
      }
    }
  },

  "temple": {
    id: "temple",
    title: "신전에서",
    description: "웅장한 신전에서 신관이 나와 당신을 마중합니다.",
    choices: [
      { id: "enter", label: "들어간다", nextStage: "offer" },
      { id: "refuse", label: "거절한다", resultDescription: "\"안타깝군요...\" 신관이 슬픈 표정으로 돌아갑니다." }
    ],
    stages: {
      "offer": {
        description: "\"그대가 올 걸 예지받았소. 기도하시오. 그럼 보답받을지니.\"",
        choices: [
          { id: "pray", label: "기도한다", resultDescription: "은총화를 바치며 기도합니다. 신관이 성물을 건넵니다.", cost: { grace: 1 }, rewards: { relic: "1" } },
          { id: "persuade", label: "설득한다", resultDescription: "\"당신의 말에 진심이 느껴지오.\" 신관이 성물을 건넵니다.", statRequirement: { insight: 2 }, rewards: { relic: "1" } },
          { id: "refuse", label: "거절한다", resultDescription: "\"그대의 선택을 존중하겠소.\" 신관이 물러납니다." }
        ]
      }
    }
  },

  "dark-ritual": {
    id: "dark-ritual",
    title: "어둠의 제의",
    description: "어둠의 의식이 진행 중입니다.",
    choices: [
      { id: "observe", label: "지켜본다", nextStage: "demand" },
      { id: "ignore", label: "무시한다", resultDescription: "불길한 의식입니다. 멀리 피해 갑니다." }
    ],
    stages: {
      "demand": {
        description: "제물이 될 것을 요구합니다. 거절하면 전투가 벌어질 것 같습니다.",
        choices: [
          { id: "sacrifice", label: "체력 50%를 바친다", resultDescription: "피가 제단에 스며듭니다. 고통스럽지만 희귀한 상징이 나타납니다.", hpRequirement: { min: 30 }, cost: { hpPercent: 50 }, rewards: { relic: "rare" } },
          { id: "fight", label: "거절하고 전투", resultDescription: "\"불경한 자!\" 광신도들이 달려듭니다!", combatTrigger: true, combatRewards: { relic: "1" } },
          { id: "flee", label: "도망친다", resultDescription: "서둘러 도망칩니다! 하지만 추격당할 위험이 높아졌습니다.", penalties: { mapRisk: 10 } }
        ]
      }
    }
  },

  // === 복합 이벤트 ===
  "crying-idol": {
    id: "crying-idol",
    title: "흐느끼는 우상",
    description: "작은 동굴에서, 웬 조각상이 눈물을 흘리고 있습니다.",
    choices: [
      { id: "approach", label: "다가간다", nextStage: "close" },
      { id: "leave", label: "지나친다", resultDescription: "기묘한 조각상입니다. 굳이 건드리지 않기로 합니다." }
    ],
    stages: {
      "close": {
        description: "조각상의 눈물이 은총화처럼 빛납니다.",
        choices: [
          { id: "pray", label: "닦아주고 기도한다", resultDescription: "눈물을 닦아주자 조각상에서 따뜻한 빛이 뿜어져 나옵니다. 은총을 받았습니다.", rewards: { grace: 2 } },
          { id: "take", label: "가져간다", resultDescription: "조각상을 뜯어냅니다. 갑자기 주변이 차가워집니다...", rewards: { loot: 1 }, penalties: { insight: 1 } }
        ]
      }
    }
  },

  "arm-wrestling": {
    id: "arm-wrestling",
    title: "팔씨름 대회",
    description: "공터에서 팔씨름 대회가 열리고 있습니다.",
    difficulty: 'easy',
    choices: [
      { id: "join", label: "참여한다", cost: { gold: 50 }, nextStage: "round-1" },
      { id: "ignore", label: "무시하고 간다", resultDescription: "팔씨름에는 관심 없습니다. 지나칩니다." }
    ],
    stages: {
      "round-1": {
        description: "1라운드입니다! 상대가 긴장한 표정입니다.",
        choices: [
          { id: "compete", label: "겨룬다", resultDescription: "으아아악!", statCheck: { strength: 1 }, successRewards: { gold: 100 }, successNextStage: "round-2", failurePenalties: { mapRisk: 10 } },
          { id: "quit", label: "기권", resultDescription: "\"비겁자!\" 야유가 쏟아집니다. 그냥 나갑니다." }
        ]
      },
      "round-2": {
        description: "2라운드! 상대가 더 강해 보입니다.",
        choices: [
          { id: "compete", label: "겨룬다", resultDescription: "이번 상대도 만만치 않습니다!", statCheck: { strength: 2 }, successRewards: { gold: 100 }, successNextStage: "finals", failurePenalties: { mapRisk: 10 } },
          { id: "quit", label: "기권", resultDescription: "여기서 그만두는 게 현명한 판단입니다. 상금을 들고 자리를 뜹니다." }
        ]
      },
      "finals": {
        description: "결승전입니다! 우승이 눈앞에!",
        choices: [
          { id: "compete", label: "겨룬다", resultDescription: "결승전! 모든 힘을 쏟아붓습니다!", statCheck: { strength: 3 }, successRewards: { gold: 200, relic: "rare" }, successNextStage: "homer", failurePenalties: { mapRisk: 15 } },
          { id: "quit", label: "기권", resultDescription: "준우승도 나쁘지 않습니다. 박수 속에 물러납니다." }
        ]
      },
      "homer": {
        description: "갑자기 거구의 호메로스가 나타났습니다! \"진정한 챔피언과 겨뤄봐!\"",
        choices: [
          { id: "fight", label: "싸운다", resultDescription: "호메로스가 덤벼옵니다! 전투 준비!", combatTrigger: true, combatRewards: { card: "rare" } },
          { id: "donut", label: "도우넛을 준다", resultDescription: "\"오... 도우넛!\" 호메로스가 기뻐하며 도우넛을 받아먹습니다. \"좋은 녀석이군. 친구 하자!\"" }
        ]
      }
    }
  },

  "forgotten-soldier": {
    id: "forgotten-soldier",
    title: "잊힌 병사",
    description: "녹슨 갑옷을 입은 병사의 유해를 발견했습니다.",
    choices: [
      { id: "examine", label: "살펴본다", nextStage: "letter" },
      { id: "leave", label: "지나친다", resultDescription: "죽은 자의 일에 간섭하지 않는 게 좋습니다. 조용히 지나칩니다." }
    ],
    stages: {
      "letter": {
        description: "그의 손에는 바랜 편지가 쥐어져 있습니다. '이곳에서 기다리겠소...' 누군가는 그를 기다리고 있었을 것입니다.",
        choices: [
          { id: "remember", label: "기억한다", resultDescription: "당신은 이 병사의 이름을 마음에 새깁니다. 그의 희생은 잊히지 않을 것입니다.", rewards: { insight: 1, card: "blessing" } },
          { id: "forget", label: "잊어버린다", resultDescription: "슬픈 이야기입니다. 하지만 그의 소지품은 챙깁니다.", rewards: { gold: 50 }, penalties: { insight: 1 } },
          { id: "mourn", label: "애도한다", resultDescription: "은총화를 바쳐 명복을 빕니다. 그의 영혼이 평안을 찾은 것 같습니다.", cost: { grace: 1 }, rewards: { memory: 150 } }
        ]
      }
    }
  },

  // ==================== 고위험/고보상 이벤트 ====================
  // Dead Cells/Slay the Spire 참고: 큰 리스크와 큰 보상

  "cursed-altar": {
    id: "cursed-altar",
    title: "저주받은 제단",
    description: "🩸 검붉은 피가 흐르는 제단입니다. 강력한 힘이 느껴지지만, 대가가 클 것 같습니다.",
    difficulty: 'hard',
    minFloor: 4,
    choices: [
      { id: "approach", label: "⚠️ 다가간다", nextStage: "offer" },
      { id: "leave", label: "떠난다", resultDescription: "위험한 곳에서 물러납니다. 현명한 선택입니다." }
    ],
    stages: {
      "offer": {
        description: "제단이 속삭입니다. \"피를 바쳐라... 힘을 주리라...\"",
        choices: [
          { id: "blood-pact", label: "⚠️ 최대 HP 25% 희생", resultDescription: "피가 제단에 스며들고, 엄청난 힘이 몸에 깃듭니다!", penalties: { maxHpPercent: 25 }, rewards: { relic: "bloodPactSeal" } },
          { id: "card-sacrifice", label: "⚠️ 덱에서 카드 3장 소멸", resultDescription: "카드들이 불타오르며 제단에 흡수됩니다. 대가로 강력한 상징을 얻습니다.", penalties: { removeCards: 3 }, rewards: { relic: "soulForge" } },
          { id: "all-in", label: "⚠️ HP 50% + 카드 2장 희생", resultDescription: "모든 것을 바쳤습니다. 제단이 두 개의 상징을 내놓습니다!", penalties: { maxHpPercent: 50, removeCards: 2 }, rewards: { relic: "bloodPactSeal", relic2: "soulForge" } },
          { id: "flee", label: "도망친다", resultDescription: "제단의 유혹을 뿌리치고 도망칩니다." }
        ]
      }
    }
  },

  "demon-gambler": {
    id: "demon-gambler",
    title: "악마의 도박사",
    description: "🎰 붉은 눈의 도박사가 나타납니다. \"모 아니면 도... 한 판 어때?\"",
    difficulty: 'hard',
    minFloor: 5,
    choices: [
      { id: "listen", label: "조건을 듣는다", nextStage: "deal" },
      { id: "refuse", label: "거절한다", resultDescription: "\"겁쟁이...\" 도박사가 연기처럼 사라집니다." }
    ],
    stages: {
      "deal": {
        description: "\"간단해. 동전을 던져서 앞면이 나오면 네 덱의 모든 카드를 승급시켜주지. 뒷면이면... 절반을 가져가마.\"",
        choices: [
          { id: "accept", label: "⚠️ 도박한다 (50% 확률)", resultDescription: "동전이 공중에서 빙글빙글 돕니다...", probability: 0.5, successRewards: { upgradeAllCards: true }, failurePenalties: { removeHalfDeck: true } },
          { id: "counter", label: "역제안한다", statRequirement: { insight: 3 }, nextStage: "counter-deal" },
          { id: "decline", label: "관뒀어", resultDescription: "\"현명하군... 아니면 어리석거나.\" 도박사가 사라집니다." }
        ]
      },
      "counter-deal": {
        description: "\"호오? 배짱이 있군. 좋아, 그럼 이건 어때? 네 HP 30%를 걸면 확률을 70%로 올려주지.\"",
        choices: [
          { id: "accept-counter", label: "⚠️ 수락 (70% 성공)", resultDescription: "피를 걸고 도박합니다...", cost: { hpPercent: 30 }, probability: 0.7, successRewards: { upgradeAllCards: true }, failurePenalties: { removeHalfDeck: true } },
          { id: "decline", label: "역시 관둔다", resultDescription: "위험은 피하는 게 상책입니다." }
        ]
      }
    }
  },

  "forbidden-library": {
    id: "forbidden-library",
    title: "금서고",
    description: "📚 봉인된 도서관입니다. 금지된 지식이 잠들어 있습니다.",
    difficulty: 'hard',
    minFloor: 6,
    choices: [
      { id: "enter", label: "들어간다", nextStage: "books" },
      { id: "leave", label: "지나친다", resultDescription: "봉인된 지식은 그대로 두는 게 좋습니다." }
    ],
    stages: {
      "books": {
        description: "세 권의 책이 빛나고 있습니다. 각각 다른 금지된 지식이 담겨 있습니다.",
        choices: [
          { id: "book-power", label: "⚠️ 힘의 서 (HP 40% 소모)", resultDescription: "페이지를 넘기자 엄청난 힘이 몸에 깃듭니다. 하지만 대가로 생명력이 깎여나갑니다.", penalties: { hpPercent: 40 }, rewards: { strength: 5, relic: "forbiddenPower" } },
          { id: "book-wisdom", label: "⚠️ 지혜의 서 (카드 4장 소멸)", resultDescription: "책을 읽으면 읽을수록 기억이 희미해집니다. 하지만 대신 깊은 통찰을 얻습니다.", penalties: { removeCards: 4 }, rewards: { insight: 5, relic: "forbiddenWisdom" } },
          { id: "book-death", label: "⚠️ 죽음의 서 (HP 1로 고정)", resultDescription: "책을 펼치자 죽음의 기운이 밀려옵니다. 죽음 직전까지 몰리지만, 그 대가로...", penalties: { setHp: 1 }, rewards: { relic: "deathsEmbrace", relic2: "forbiddenPower" } },
          { id: "leave", label: "책을 덮는다", resultDescription: "금지된 지식은 건드리지 않는 게 좋겠습니다." }
        ]
      }
    }
  },

  "soul-merchant": {
    id: "soul-merchant",
    title: "영혼 상인",
    description: "👤 그림자 속에서 목소리가 들립니다. \"영혼 조각... 비싸게 사들이지...\"",
    difficulty: 'hard',
    minFloor: 5,
    choices: [
      { id: "listen", label: "이야기를 듣는다", nextStage: "offer" },
      { id: "attack", label: "공격한다", combatTrigger: true, combatId: "shadow-merchant", combatRewards: { gold: 100 } },
      { id: "flee", label: "도망친다", resultDescription: "불길한 기운을 피해 달아납니다." }
    ],
    stages: {
      "offer": {
        description: "\"최대 HP를 팔아라... 영원히... 대신 원하는 것을 주지...\"",
        choices: [
          { id: "sell-10", label: "⚠️ 최대 HP 10 판매", resultDescription: "영혼 조각이 빠져나갑니다. 상인이 대가를 지불합니다.", penalties: { maxHp: 10 }, rewards: { gold: 150, relic: "random" } },
          { id: "sell-25", label: "⚠️ 최대 HP 25 판매", resultDescription: "상당한 영혼을 팔았습니다. 상인이 만족스러워합니다.", penalties: { maxHp: 25 }, rewards: { gold: 300, relic: "soulFragment" } },
          { id: "sell-50", label: "⚠️ 최대 HP 50 판매 (위험!)", resultDescription: "절반의 영혼을 팔았습니다. 상인이 환호합니다. \"훌륭한 거래야!\"", penalties: { maxHp: 50 }, rewards: { gold: 500, relic: "soulFragment", relic2: "voidHeart" } },
          { id: "decline", label: "거절한다", resultDescription: "\"아쉽군... 다음에 또 보자...\" 상인이 그림자 속으로 사라집니다." }
        ]
      }
    }
  },

  "time-paradox": {
    id: "time-paradox",
    title: "시간의 균열",
    description: "⏳ 시공간이 뒤틀린 곳입니다. 과거의 자신과 마주칩니다.",
    difficulty: 'hard',
    minFloor: 7,
    choices: [
      { id: "approach", label: "다가간다", nextStage: "past-self" },
      { id: "avoid", label: "피한다", resultDescription: "시간의 장난에 휘말리지 않는 게 좋겠습니다." }
    ],
    stages: {
      "past-self": {
        description: "과거의 자신이 말합니다. \"여기서 뭘 선택하느냐에 따라 네 운명이 바뀔 거야.\"",
        choices: [
          { id: "merge", label: "⚠️ 과거와 합체 (덱 초기화)", resultDescription: "과거와 하나가 됩니다. 모든 것이 처음으로 돌아가지만, 강력한 힘을 얻습니다.", penalties: { resetDeck: true }, rewards: { relic: "timeloop", fullHeal: true, insight: 3 } },
          { id: "fight", label: "⚠️ 과거를 처치 (50% HP 손실)", resultDescription: "과거의 자신과 싸웁니다. 승리하지만 큰 상처를 입습니다.", penalties: { hpPercent: 50 }, rewards: { upgradeAllCards: true, relic: "paradoxShard" } },
          { id: "trade", label: "거래한다", statRequirement: { insight: 3 }, nextStage: "time-trade" },
          { id: "leave", label: "떠난다", resultDescription: "과거는 과거일 뿐. 앞으로 나아갑니다." }
        ]
      },
      "time-trade": {
        description: "\"통찰력이 있군. 좋아, 카드 2장과 상징 하나를 교환하자.\"",
        choices: [
          { id: "accept", label: "교환한다", resultDescription: "과거의 자신과 카드를 교환합니다. 새로운 가능성이 열립니다.", penalties: { removeCards: 2 }, rewards: { relic: "paradoxShard", card: "rare", card2: "rare" } },
          { id: "decline", label: "됐어", resultDescription: "과거의 자신이 고개를 끄덕이며 사라집니다." }
        ]
      }
    }
  },

  "abyss-gate": {
    id: "abyss-gate",
    title: "심연의 문",
    description: "🌀 거대한 검은 문이 있습니다. 문 너머에서 강력한 힘이 느껴집니다.",
    difficulty: 'hard',
    minFloor: 8,
    choices: [
      { id: "open", label: "⚠️ 문을 연다", nextStage: "abyss" },
      { id: "leave", label: "돌아간다", resultDescription: "심연은 건드리지 않는 게 좋겠습니다." }
    ],
    stages: {
      "abyss": {
        description: "문 너머는 끝없는 어둠입니다. 심연이 속삭입니다. \"들어와... 모든 것을 줄게...\"",
        choices: [
          { id: "dive", label: "⚠️ 뛰어든다 (HP 70% 손실)", resultDescription: "심연에 뛰어듭니다! 죽음 직전까지 몰리지만, 심연의 축복을 받습니다.", penalties: { hpPercent: 70 }, rewards: { relic: "abyssalCore", relic2: "voidHeart", strength: 3 } },
          { id: "reach", label: "⚠️ 손만 넣는다 (HP 30% 손실)", resultDescription: "조심스럽게 손을 넣습니다. 무언가가 손에 쥐어집니다.", penalties: { hpPercent: 30 }, rewards: { relic: "abyssalCore" } },
          { id: "sacrifice-card", label: "⚠️ 카드 5장을 바친다", resultDescription: "카드들이 심연에 빨려들어갑니다. 대신 심연의 힘을 얻습니다.", penalties: { removeCards: 5 }, rewards: { relic: "abyssalCore", relic2: "forbiddenWisdom" } },
          { id: "close", label: "문을 닫는다", resultDescription: "아직 준비가 안 됐습니다. 문을 닫고 돌아섭니다." }
        ]
      }
    }
  },

  "phoenix-trial": {
    id: "phoenix-trial",
    title: "불사조의 시련",
    description: "🔥 불꽃에 휩싸인 제단입니다. \"죽음을 겪어야 부활할 수 있다...\"",
    difficulty: 'hard',
    minFloor: 9,
    choices: [
      { id: "accept", label: "⚠️ 시련을 받아들인다", nextStage: "trial" },
      { id: "refuse", label: "거절한다", resultDescription: "불사조의 시련은 언제든 돌아올 수 있습니다." }
    ],
    stages: {
      "trial": {
        description: "불꽃이 당신을 감쌉니다. 선택하세요: 무엇을 불태울 것인가?",
        choices: [
          { id: "burn-body", label: "⚠️ 육체를 불태운다 (HP 1)", resultDescription: "불꽃이 육체를 태웁니다. 죽음 직전에서... 부활합니다!", penalties: { setHp: 1 }, rewards: { relic: "phoenixFeather", maxHp: 30 } },
          { id: "burn-deck", label: "⚠️ 덱을 불태운다 (절반 소멸)", resultDescription: "카드들이 재가 됩니다. 하지만 재 속에서 새로운 카드가 탄생합니다.", penalties: { removeHalfDeck: true }, rewards: { relic: "phoenixFeather", card: "legendary", card2: "legendary" } },
          { id: "burn-all", label: "⚠️ 모든 것을 불태운다", resultDescription: "완전한 소멸... 그리고 완전한 부활.", penalties: { setHp: 1, removeHalfDeck: true }, rewards: { relic: "phoenixFeather", relic2: "phoenixAsh", maxHp: 50, upgradeAllCards: true } },
          { id: "extinguish", label: "불을 끈다", resultDescription: "시련을 거부합니다. 불꽃이 꺼집니다." }
        ]
      }
    }
  }
};

// 이벤트 키 목록 (isInitial이 true이거나 정의되지 않은 이벤트만 포함)
export const EVENT_KEYS = Object.keys(NEW_EVENT_LIBRARY).filter(
  key => NEW_EVENT_LIBRARY[key].isInitial !== false
);

/**
 * 이벤트가 스탯 요구 선택지를 가지고 있는지 확인
 * (후반 노드에서만 등장해야 하는 이벤트)
 */
export function hasStatRequirement(eventKey: string): boolean {
  const event = NEW_EVENT_LIBRARY[eventKey];
  if (!event) return false;

  // 최상위 choices 확인
  if (event.choices?.some(c => c.statRequirement)) return true;

  // stages 내 choices 확인
  if (event.stages) {
    for (const stage of Object.values(event.stages)) {
      if (stage.choices?.some(c => c.statRequirement)) return true;
    }
  }

  return false;
}

// 스탯 요구 이벤트 최소 레이어 (후반부)
export const STAT_EVENT_MIN_LAYER = 5;

// 스탯 요구 이벤트 키 목록 (캐시)
export const STAT_REQUIRING_EVENTS = EVENT_KEYS.filter(hasStatRequirement);

// 특수 상징 정보
export const SPECIAL_RELICS = {
  "alparius-emblem": {
    name: "알빠리우스의 문장",
    description: "정보 자원 획득량 +50%",
    effect: { intelBonus: 0.5 }
  }
};
