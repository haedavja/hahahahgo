// 새로운 이벤트 시스템 - 다단계 대화 지원
// 에테르(ether) → 은총화(grace)로 변경

console.log('=== newEvents.js LOADED (v2) ===');

export const NEW_EVENT_LIBRARY = {
  // === 자원 이벤트 - 복합 자원 ===
  "broken-ai": {
    id: "broken-ai",
    title: "고장난 AI",
    description: "치치ㅣ지지직. 블루스크린이 떠있는 모니터가 보입니다.",
    difficulty: 'medium',
    choices: [
      { id: "approach", label: "다가간다", nextStage: "inspect" },
      { id: "ignore", label: "무시한다" }
    ],
    stages: {
      "inspect": {
        description: "가까이 가니 화면에 '복구 가능' 메시지가 깜빡입니다.",
        choices: [
          { id: "destroy", label: "때려 부순다", rewards: { material: 2 } },
          { id: "extract", label: "은총화로 정보 추출", cost: { grace: 1 }, rewards: { intel: 50 } },
          { id: "repair", label: "수리를 시도한다", statRequirement: { insight: 2 }, nextStage: "repair-result" }
        ]
      },
      "repair-result": {
        description: "수리에 성공했습니다! AI가 감사 인사를 합니다.",
        choices: [
          { id: "accept", label: "정보를 받는다", rewards: { intel: 30, material: 1 } }
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
      { id: "leave", label: "그냥 떠난다" }
    ],
    stages: {
      "negotiate": {
        description: "\"대신 돈을 주면 정보를 알려주던가, 원자재를 매입할 의사가 있소.\"",
        choices: [
          { id: "buy-intel", label: "정보를 구매한다", cost: { gold: 30 }, rewards: { intel: 40 } },
          { id: "sell-material", label: "원자재를 판다", cost: { material: 1 }, rewards: { gold: 40 } },
          { id: "leave", label: "됐소" }
        ]
      }
    }
  },

  // === 자원 이벤트 - 정보 (알빠리우스 연계) ===
  "alparius-1": {
    id: "alparius-1",
    title: "요원 알빠리우스 1",
    description: "거적으로 푸른 갑옷을 감추고 있는 자와 마주합니다. 그는 자신을 알빠리우스라고 소개합니다.",
    isInitial: true,
    choices: [
      { id: "listen", label: "이야기를 듣는다", nextStage: "offer" },
      { id: "refuse", label: "거절한다" }
    ],
    stages: {
      "offer": {
        description: "\"온갖 귀중한 정보를 가지고 있소. 적절한 돈만 주면 얼마든 공유하겠소.\"",
        choices: [
          { id: "accept", label: "거래한다", cost: { gold: 50 }, rewards: { intel: 60 }, nextEvent: "alparius-2" },
          { id: "refuse", label: "거절한다" }
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
      { id: "accept", label: "또 거래한다", cost: { gold: 50 }, rewards: { intel: 60 }, nextEvent: "alparius-3" },
      { id: "refuse", label: "거절한다" }
    ],
    stages: {
      "explain": {
        description: "\"...? 무슨 소리요. 난 처음 보는 얼굴인데.\" 마찬가지로 돈만 주면 정보를 주겠답니다.",
        choices: [
          { id: "accept", label: "거래한다", cost: { gold: 50 }, rewards: { intel: 60 }, nextEvent: "alparius-3" },
          { id: "refuse", label: "수상하군. 거절한다" }
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
      { id: "ignore", label: "무시한다" }
    ],
    stages: {
      "parrot": {
        description: "\"나는 알빠리우스다..\" 다른 말은 없지만 마치 그 의미를 알지 않냐는 듯 쳐다봅니다.",
        choices: [
          { id: "accept", label: "...거래한다", cost: { gold: 50 }, rewards: { intel: 60 }, nextEvent: "alparius-4" },
          { id: "refuse", label: "미쳤군" }
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
      { id: "ignore", label: "환청이다. 무시한다" }
    ],
    stages: {
      "voice": {
        description: "\"나는 알빠리우스다.\"\n\n그저 내가 환청으로 미친 걸까요? 아니면 귀신에 홀린 걸까요?",
        choices: [
          { id: "accept", label: "...거래한다", cost: { gold: 50 }, rewards: { intel: 60 }, nextEvent: "alparius-5" },
          { id: "ignore", label: "제정신 차리자" }
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
      { id: "refuse", label: "이건 아니다" }
    ],
    stages: {
      "grave": {
        description: "\"우리는 알빠리우스다\"\n\n우리는? 대체 얼마나 많은 알빠리우스가 있단 말인가? 당신은 의심하기 시작합니다.",
        choices: [
          { id: "accept", label: "거래한다", cost: { gold: 50 }, rewards: { intel: 60 }, nextEvent: "alparius-6" },
          { id: "confront", label: "진실을 추궁한다", statRequirement: { insight: 2 }, rewards: { insight: 2 } },
          { id: "refuse", label: "더 이상 믿지 않는다" }
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
          { id: "become-alparius", label: "나도 알빠리우스다", specialRequirement: "alparius-accepted-4-times", rewards: { relic: "alparius-emblem" } },
          { id: "dig-grave", label: "무덤을 파헤친다", rewards: { intel: 100 } },
          { id: "accept-truth", label: "진실을 받아들인다", rewards: { insight: 3 } }
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
      { id: "leave", label: "지나친다" }
    ],
    stages: {
      "gamble": {
        description: "주사위를 잡았습니다. 1~6 중 맞추면 대박입니다!",
        choices: [
          { id: "bet", label: "건다 (금 50)", cost: { gold: 50 }, probability: 1/6, successRewards: { gold: 300 }, failurePenalties: {} },
          { id: "detect-fraud", label: "이건 사기다", statRequirement: { insight: 2 }, nextStage: "exposed" },
          { id: "leave", label: "안 건다" }
        ]
      },
      "exposed": {
        description: "당신의 날카로운 눈이 조작된 주사위를 발견했습니다. 딜러가 당황합니다.",
        choices: [
          { id: "blackmail", label: "협박한다", rewards: { gold: 200 } },
          { id: "report", label: "신고한다", rewards: { intel: 30 } }
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
      { id: "ignore", label: "함정이다. 무시한다" }
    ],
    stages: {
      "closer": {
        description: "가까이 가니 바닥에 실이 보입니다. 함정일지도 모릅니다!",
        choices: [
          { id: "take", label: "그래도 집는다", rewards: { gold: 100 }, probability: 0.5, failurePenalties: { hp: 30 } },
          { id: "careful", label: "조심히 해체한다", statRequirement: { insight: 2 }, nextStage: "disarm" },
          { id: "leave", label: "포기한다" }
        ]
      },
      "disarm": {
        description: "함정을 성공적으로 해체했습니다! 금화와 함께 장치 부품도 얻었습니다.",
        choices: [
          { id: "collect", label: "전부 챙긴다", rewards: { gold: 100, material: 1 } }
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
      { id: "smash", label: "부숴버린다", rewards: { material: 1 } },
      { id: "ignore", label: "무시한다", combatTrigger: true, combatRewards: { gold: 80 } }
    ],
    stages: {
      "request": {
        description: "\"날 안식에 들게 해주면 금을 주겠다…..\"",
        choices: [
          { id: "pray", label: "기도해준다", cost: { grace: 1 }, nextStage: "peace" },
          { id: "loot", label: "유품만 챙긴다", rewards: { gold: 40 } },
          { id: "destroy", label: "시체를 박살낸다", rewards: { gold: 80 }, penalties: { card: "curse" } }
        ]
      },
      "peace": {
        description: "영혼이 평화롭게 승천합니다. 바닥에서 금화가 솟아오릅니다.",
        choices: [
          { id: "collect", label: "금화를 줍는다", rewards: { gold: 80, grace: 1 } }
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
      { id: "ignore", label: "무시한다", penalties: { insight: 1 } }
    ],
    stages: {
      "closer": {
        description: "아이의 눈에서 눈물이 흐릅니다. 진심으로 배가 고파 보입니다.",
        choices: [
          { id: "help", label: "금화를 준다", cost: { gold: 30 }, nextStage: "gratitude" },
          { id: "exploit", label: "이용한다", statRequirement: { insight: 2 }, rewards: { intel: 30 }, penalties: { card: "curse" } },
          { id: "leave", label: "그냥 간다" }
        ]
      },
      "gratitude": {
        description: "아이가 감사하며 무언가를 건넵니다. \"이건 어머니가 주신 거예요...\"",
        choices: [
          { id: "accept", label: "받는다", rewards: { insight: 2, card: "blessing" } },
          { id: "refuse", label: "네가 가져라", rewards: { insight: 3 } }
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
      { id: "ignore", label: "지나친다" }
    ],
    stages: {
      "encounter": {
        description: "전사가 당신을 올려다봅니다. \"살려줘...\"",
        choices: [
          { id: "help", label: "치료해준다", cost: { grace: 1 }, nextStage: "healed" },
          { id: "trade", label: "전리품만 달라", nextStage: "bargain" },
          { id: "backstab", label: "뒤통수를 친다", rewards: { loot: 3 }, penalties: { insight: 2 } }
        ]
      },
      "healed": {
        description: "전사가 기력을 회복합니다. \"은혜를 갚겠소. 이 전리품을 받아주시오.\"",
        choices: [
          { id: "accept", label: "받는다", rewards: { loot: 2, intel: 20 } },
          { id: "refuse", label: "됐소", rewards: { insight: 1 } }
        ]
      },
      "bargain": {
        description: "\"...알겠소. 목숨값이라 생각하겠소.\" 전사가 억울한 표정으로 전리품을 건넵니다.",
        choices: [
          { id: "take", label: "받는다", rewards: { loot: 2 }, penalties: { insight: 1 } }
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
      { id: "leave", label: "냅둔다", penalties: { mapRisk: 15 } }
    ],
    stages: {
      "monster": {
        description: "괴물 하나가 양을 향해 달려듭니다!",
        choices: [
          { id: "save", label: "구한다!", combatTrigger: true, combatRewards: { loot: 2 } },
          { id: "watch", label: "구경한다", penalties: { insight: 1 } }
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
      { id: "flee", label: "도망간다", statRequirement: { agility: 1 } }
    ],
    stages: {
      "confrontation": {
        description: "미친 눈빛으로 달려듭니다. 피할 수 없어 보입니다.",
        choices: [
          { id: "fight", label: "싸운다", combatTrigger: true, combatRewards: { hpRestore: "full" } },
          { id: "tackle", label: "선제 몸통박치기", statRequirement: { strength: 1 }, combatTrigger: true, combatModifier: { enemyHp: 0.5 } },
          { id: "execute", label: "죽인다", specialRequirement: "death-card-mastery", instantKill: true }
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
      { id: "ignore", label: "무시한다" }
    ],
    stages: {
      "test": {
        description: "인형이 당신을 바라봅니다. 시험해볼까요?",
        choices: [
          { id: "test", label: "시험해본다", timedCombat: true, combatSuccessRewards: { grace: 1 }, combatFailurePenalties: { mapRisk: 20 } },
          { id: "leave", label: "그만둔다" }
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
      { id: "refuse", label: "거절한다" }
    ],
    stages: {
      "sales": {
        description: "\"이걸 마시면 무적이 됩니다!\" 수상한 냄새가 납니다.",
        choices: [
          { id: "buy", label: "구매한다", appearCondition: { maxStat: { insight: 4 } }, cost: { gold: 50 }, penalties: { card: "useless-curse" } },
          { id: "expose", label: "사기꾼!", statRequirement: { insight: 2 }, nextStage: "exposed" },
          { id: "refuse", label: "됐어" }
        ]
      },
      "exposed": {
        description: "당신의 날카로운 눈에 상인이 당황합니다. \"잠깐, 잠깐! 진짜를 보여주지!\"",
        choices: [
          { id: "demand", label: "배상하라", rewards: { gold: 30 } },
          { id: "report", label: "신고한다", rewards: { intel: 20 } }
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
      { id: "leave", label: "그냥 간다" }
    ],
    stages: {
      "offering": {
        description: "기도하시겠습니까? 은총화를 바치면 기억을 얻을 수 있습니다.",
        choices: [
          { id: "offer-1", label: "은총화 1을 바친다", cost: { grace: 1 }, rewards: { memory: 100 } },
          { id: "offer-2", label: "은총화 2를 바친다", cost: { grace: 2 }, rewards: { memory: 200 } },
          { id: "offer-3", label: "은총화 3을 바친다", cost: { grace: 3 }, rewards: { memory: 300 } },
          { id: "leave", label: "그만둔다" }
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
      { id: "leave", label: "지나친다" }
    ],
    stages: {
      "sacrifice": {
        description: "이 제단이 무엇을 요구하는지는 명확합니다. 피입니다.",
        choices: [
          { id: "sacrifice-10", label: "HP 10을 바친다", hpRequirement: { min: 21 }, cost: { hp: 10 }, rewards: { memory: 120 } },
          { id: "sacrifice-20", label: "HP 20을 바친다", hpRequirement: { min: 41 }, cost: { hp: 20 }, rewards: { memory: 250 } },
          { id: "sacrifice-30", label: "HP 30을 바친다", hpRequirement: { min: 41 }, cost: { hp: 30 }, rewards: { memory: 400 } },
          { id: "leave", label: "그만둔다" }
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
      { id: "ignore", label: "무시한다" }
    ],
    stages: {
      "choice": {
        description: "제단에서 속삭임이 들립니다. \"피를... 아니면... 정화를...\"",
        choices: [
          { id: "sacrifice", label: "피를 바친다", hpRequirement: { min: 40 }, cost: { hp: 30 }, rewards: { memory: 300 }, penalties: { card: "curse" } },
          { id: "purify", label: "정화를 시도한다", cost: { grace: 2 }, nextStage: "purified" },
          { id: "leave", label: "떠난다" }
        ]
      },
      "purified": {
        description: "제단의 어둠이 걷힙니다. 그 안에서 축복받은 무언가가 나타납니다.",
        choices: [
          { id: "take", label: "받는다", rewards: { card: "blessing" } }
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
      { id: "leave", label: "그냥 간다" }
    ],
    stages: {
      "reflection": {
        description: "수면에 자신의 모습이 비칩니다. 무언가 다른 자신이 보입니다.",
        choices: [
          { id: "dive", label: "뛰어든다", rewards: { trait: "random" } },
          { id: "leave", label: "물러난다" }
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
      { id: "give-up", label: "포기한다" }
    ],
    stages: {
      "turn": {
        description: "무거운 풍차입니다. 돌리시겠습니까?",
        choices: [
          { id: "turn-hard", label: "힘들어도 돌린다", cost: { hp: 8 }, rewards: { grace: 1 } },
          { id: "turn-easy", label: "가뿐히 돌린다", statRequirement: { strength: 2 }, rewards: { grace: 1 } },
          { id: "turn-fast", label: "쌩쌩 돌린다", statRequirement: { strength: 3 }, rewards: { grace: 1, relic: "rare" } },
          { id: "give-up", label: "포기한다" }
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
      { id: "leave", label: "그냥 떠난다" }
    ],
    stages: {
      "demand": {
        description: "\"피.. 피를 흘려보내라..\" 모든 사람들의 시선이 당신에게 쏠립니다.",
        choices: [
          { id: "self-cut", label: "자신의 손바닥을 긋는다", cost: { hp: 10 }, rewards: { grace: 2 } },
          { id: "kill-other", label: "옆사람의 목을 자른다", rewards: { grace: 5 }, penalties: { card: "curse", insight: 2 } },
          { id: "kill-all", label: "모두 죽인다", rewards: { memory: 500 }, penalties: { card: "curse-2", insight: 3 } },
          { id: "refuse", label: "거부한다", combatTrigger: true }
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
      { id: "leave", label: "지나친다" }
    ],
    stages: {
      "drink": {
        description: "신비로운 기운이 느껴집니다. 어떻게 하시겠습니까?",
        choices: [
          { id: "drink", label: "마신다", rewards: { grace: 2 } },
          { id: "immerse", label: "몸을 담근다", cost: { hp: 20 }, rewards: { grace: 3 } },
          { id: "careful", label: "소량만 취한다", rewards: { grace: 1 } }
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
      { id: "ignore", label: "무시한다" }
    ],
    stages: {
      "choice": {
        description: "영혼이 당신을 바라봅니다. 무언가를 원하는 것 같습니다.",
        choices: [
          { id: "absorb", label: "영혼을 흡수한다", probability: 0.5, successRewards: { grace: 2 }, failurePenalties: { card: "curse" } },
          { id: "comfort", label: "영혼을 위로한다", rewards: { insight: 1, grace: 1 } },
          { id: "leave", label: "그냥 둔다" }
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
      { id: "discard", label: "버린다", cost: { hp: 15 } }
    ],
    stages: {
      "strange": {
        description: "뭔가 이상한 냄새가 납니다. 마시면 무언가 잊힐 것 같습니다.",
        choices: [
          { id: "drink", label: "마신다", cardAction: { lose: 1, gain: 1 } },
          { id: "discard", label: "버린다" }
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
      { id: "leave", label: "나간다" }
    ],
    stages: {
      "inside": {
        description: "어째서인지 옛 기억이 떠오릅니다. 책장에서 빛이 납니다.",
        choices: [
          { id: "select-1", label: "책 하나를 고른다", cardAction: { select: 1 } },
          { id: "select-2", label: "여러 권 고른다", statRequirement: { insight: 2 }, cardAction: { select: 2 } },
          { id: "store", label: "기억을 보관한다", cardAction: { lose: 1 }, rewards: { hp: 20 } }
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
      { id: "flee", label: "도망친다" }
    ],
    stages: {
      "train": {
        description: "힘든 훈련이 시작됩니다. 어떻게 임하시겠습니까?",
        choices: [
          { id: "train", label: "일반 훈련", cost: { hp: 15 }, cardAction: { gainRandom: 1 } },
          { id: "special-train", label: "특별 훈련", statRequirement: { strength: 2 }, cardAction: { selectAny: 1 } },
          { id: "quit", label: "포기한다" }
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
      { id: "ignore", label: "무시한다" }
    ],
    stages: {
      "rambling": {
        description: "당신을 붙잡은 채 입 냄새 나는 헛소리를 지껄입니다. 어쩔까요?",
        choices: [
          { id: "pay", label: "돈 좀 쥐어준다", cost: { gold: 20 } },
          { id: "argue-win", label: "논쟁한다", statRequirement: { insight: 2 }, cardAction: { selectAny: 1 } },
          { id: "argue-lose", label: "논쟁하다 진다", appearCondition: { maxStat: { insight: 1 } }, cardAction: { loseRandom: 1 } },
          { id: "violence", label: "폭력으로 해결", statRequirement: { strength: 1 }, cardAction: { gainRandom: 1 } }
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
      { id: "ignore", label: "무시한다" }
    ],
    stages: {
      "story": {
        description: "\"저는 무고합니다! 벌받고 있지만 저는 아무것도 안 했어요!\"",
        choices: [
          { id: "believe", label: "믿고 변호한다", cardAction: { gainRandom: 1 } },
          { id: "destroy", label: "박살낸다", rewards: { material: 2 }, penalties: { mapRisk: 10 } },
          { id: "leave", label: "그냥 간다" }
        ]
      }
    }
  },

  // === 유물 이벤트 ===
  "junk-dealer": {
    id: "junk-dealer",
    title: "고물상",
    description: "이봐, 이거 어때? 고물상이 유물을 보여줍니다.",
    choices: [
      { id: "look", label: "살펴본다", nextStage: "offer" },
      { id: "refuse", label: "거절" }
    ],
    stages: {
      "offer": {
        description: "\"금 100이면 이 유물을 줄게. 어때?\"",
        choices: [
          { id: "accept", label: "수락", cost: { gold: 100 }, rewards: { relic: 1 } },
          { id: "more", label: "다른 것도 보여줘", statRequirement: { insight: 1 }, nextStage: "more-items" },
          { id: "refuse", label: "거절" }
        ]
      },
      "more-items": {
        description: "\"오, 눈이 높군! 이건 어때?\" 더 좋은 물건을 꺼냅니다.",
        choices: [
          { id: "buy-rare", label: "구매 (금 150)", cost: { gold: 150 }, rewards: { relic: "rare" } },
          { id: "refuse", label: "됐어" }
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
      { id: "leave", label: "지나친다" }
    ],
    stages: {
      "dig": {
        description: "파내려면 힘이 들 것 같습니다.",
        choices: [
          { id: "dig", label: "파낸다", cost: { hp: 20 }, rewards: { relic: 1 } },
          { id: "throw", label: "힘으로 치운다", statRequirement: { strength: 2 }, rewards: { relic: 1 } },
          { id: "leave", label: "포기한다" }
        ]
      }
    }
  },

  "trap-beyond": {
    id: "trap-beyond",
    title: "함정 너머에",
    description: "위험해 보이는 미로 너머에 번쩍이는 유물이 보입니다.",
    choices: [
      { id: "approach", label: "도전한다", nextStage: "attempt" },
      { id: "leave", label: "포기한다" }
    ],
    stages: {
      "attempt": {
        description: "함정이 보입니다. 어떻게 통과하시겠습니까?",
        choices: [
          { id: "rush", label: "달려간다", cost: { hp: 25 }, rewards: { relic: 1 } },
          { id: "dodge", label: "민첩하게 피한다", statRequirement: { agility: 2 }, rewards: { relic: 1 } },
          { id: "retreat", label: "물러난다" }
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
      { id: "give-up", label: "포기한다" }
    ],
    stages: {
      "analysis": {
        description: "뚫으려면 엄청난 힘과 민첩이 필요합니다.",
        choices: [
          { id: "attempt", label: "시도한다", statRequirement: { strength: 2, agility: 2 }, rewards: { relic: "rare+" } },
          { id: "give-up", label: "포기한다" }
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
      { id: "leave", label: "나간다" }
    ],
    stages: {
      "choose": {
        description: "하지만 진짜는 숨겨져 있는 것 같군요..",
        choices: [
          { id: "grab-any", label: "아무거나 집는다", probability: 0.1, successRewards: { relic: 1 } },
          { id: "find-real", label: "진짜를 찾는다", statRequirement: { insight: 1 }, rewards: { relic: 1 } },
          { id: "leave", label: "그만둔다" }
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
      { id: "leave", label: "그냥 떠난다" }
    ],
    stages: {
      "searching": {
        description: "어디를 뒤지시겠습니까?",
        choices: [
          { id: "large", label: "큰 잔해", statRequirement: { strength: 2 }, rewards: { relic: 1 } },
          { id: "small", label: "작은 잔해", statRequirement: { strength: 1 }, probability: 0.5, successRewards: { relic: 1 } },
          { id: "insight", label: "유력한 장소", statRequirement: { insight: 2 }, rewards: { relic: 1 } },
          { id: "both", label: "확실한 장소", statRequirement: { strength: 2, insight: 2 }, rewards: { relic: "rare" } },
          { id: "leave", label: "그만둔다" }
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
      { id: "ignore", label: "무시한다" }
    ],
    stages: {
      "request": {
        description: "\"가보를 줄 테니 제발 먹을 걸 달라\"고 요청합니다.",
        choices: [
          { id: "steal", label: "강탈한다", rewards: { relic: 1 }, penalties: { card: "curse" } },
          { id: "trade", label: "교환한다", cost: { material: 2 }, rewards: { relic: 1 } },
          { id: "help", label: "도와준다", cost: { gold: 50 }, nextStage: "gratitude" }
        ]
      },
      "gratitude": {
        description: "피난민이 눈물을 흘리며 감사합니다. \"언젠가 꼭 보답하겠습니다...\"",
        choices: [
          { id: "accept", label: "가보를 받는다", rewards: { relic: 1, insight: 1 } },
          { id: "refuse", label: "가지고 있어라", rewards: { insight: 2 } }
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
      { id: "refuse", label: "거절한다" }
    ],
    stages: {
      "offer": {
        description: "\"그대가 올 걸 예지받았소. 기도하시오. 그럼 보답받을지니.\"",
        choices: [
          { id: "pray", label: "기도한다", cost: { grace: 1 }, rewards: { relic: 1 } },
          { id: "persuade", label: "설득한다", statRequirement: { insight: 2 }, rewards: { relic: 1 } },
          { id: "refuse", label: "거절한다" }
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
      { id: "ignore", label: "무시한다" }
    ],
    stages: {
      "demand": {
        description: "제물이 될 것을 요구합니다. 거절하면 전투가 벌어질 것 같습니다.",
        choices: [
          { id: "sacrifice", label: "HP 50%를 바친다", hpRequirement: { min: 30 }, cost: { hpPercent: 50 }, rewards: { relic: "rare" } },
          { id: "fight", label: "거절하고 전투", combatTrigger: true, combatRewards: { relic: 1 } },
          { id: "flee", label: "도망친다", penalties: { mapRisk: 10 } }
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
      { id: "leave", label: "지나친다" }
    ],
    stages: {
      "close": {
        description: "조각상의 눈물이 은총화처럼 빛납니다.",
        choices: [
          { id: "pray", label: "닦아주고 기도한다", rewards: { grace: 2 } },
          { id: "take", label: "가져간다", rewards: { loot: 1 }, penalties: { insight: 1 } }
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
      { id: "ignore", label: "무시하고 간다" }
    ],
    stages: {
      "round-1": {
        description: "1라운드입니다! 상대가 긴장한 표정입니다.",
        choices: [
          { id: "compete", label: "겨룬다", statCheck: { strength: 1 }, successRewards: { gold: 100 }, successNextStage: "round-2", failurePenalties: { mapRisk: 10 } },
          { id: "quit", label: "기권" }
        ]
      },
      "round-2": {
        description: "2라운드! 상대가 더 강해 보입니다.",
        choices: [
          { id: "compete", label: "겨룬다", statCheck: { strength: 2 }, successRewards: { gold: 100 }, successNextStage: "finals", failurePenalties: { mapRisk: 10 } },
          { id: "quit", label: "기권" }
        ]
      },
      "finals": {
        description: "결승전입니다! 우승이 눈앞에!",
        choices: [
          { id: "compete", label: "겨룬다", statCheck: { strength: 3 }, successRewards: { gold: 200, relic: "rare" }, successNextStage: "homer", failurePenalties: { mapRisk: 15 } },
          { id: "quit", label: "기권" }
        ]
      },
      "homer": {
        description: "갑자기 거구의 호메로스가 나타났습니다! \"진정한 챔피언과 겨뤄봐!\"",
        choices: [
          { id: "fight", label: "싸운다", combatTrigger: true, combatRewards: { card: "rare" } },
          { id: "donut", label: "도우넛을 준다", rewards: { hp: 30, maxHp: 10 } }
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
      { id: "leave", label: "지나친다" }
    ],
    stages: {
      "letter": {
        description: "그의 손에는 바랜 편지가 쥐어져 있습니다. '이곳에서 기다리겠소...' 누군가는 그를 기다리고 있었을 것입니다.",
        choices: [
          { id: "remember", label: "기억한다", rewards: { insight: 1, card: "blessing" } },
          { id: "forget", label: "잊어버린다", rewards: { gold: 50 }, penalties: { insight: 1 } },
          { id: "mourn", label: "애도한다", cost: { grace: 1 }, rewards: { memory: 150 } }
        ]
      }
    }
  }
};

// 이벤트 키 목록 (isInitial이 true이거나 정의되지 않은 이벤트만 포함)
export const EVENT_KEYS = Object.keys(NEW_EVENT_LIBRARY).filter(
  key => NEW_EVENT_LIBRARY[key].isInitial !== false
);

// 특수 유물 정보
export const SPECIAL_RELICS = {
  "alparius-emblem": {
    name: "알빠리우스의 문장",
    description: "정보 자원 획득량 +50%",
    effect: { intelBonus: 0.5 }
  }
};
