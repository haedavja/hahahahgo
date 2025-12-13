/**
 * 던전 노드 시스템
 * 메트로배니아 스타일 던전을 위한 그래프 기반 구조
 */

// 노드 타입 정의
export const DUNGEON_NODE_TYPES = {
  ENTRANCE: 'entrance',      // 입구
  ROOM: 'room',              // 방 (이벤트/보물 등)
  CORRIDOR: 'corridor',      // 복도 (이동 구간)
  CROSSROAD: 'crossroad',    // 기로 (선택지)
  EXIT: 'exit',              // 출구
};

// 이벤트 타입 정의
export const DUNGEON_EVENT_TYPES = {
  NONE: 'none',
  CHEST: 'chest',            // 보물상자
  COMBAT: 'combat',          // 전투
  CURIO: 'curio',            // 수상한 유물
  OBSTACLE: 'obstacle',      // 장애물 (절벽, 잠긴 문 등)
  TRAP: 'trap',              // 함정
  REST: 'rest',              // 휴식처
  MERCHANT: 'merchant',      // 상인
};

// 선택지 결과 타입
export const CHOICE_RESULT_TYPES = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  PARTIAL: 'partial',        // 부분 성공 (보상 감소 등)
  HIDDEN: 'hidden',          // 숨겨진 결과
};

/**
 * 기로(선택지) 정의
 * @typedef {Object} DungeonChoice
 * @property {string} id - 선택지 ID
 * @property {string} text - 선택지 텍스트
 * @property {Object} requirements - 요구 조건 (힘, 민첩, 통찰, 주특기 등)
 * @property {boolean} repeatable - 반복 선택 가능 여부
 * @property {number} maxAttempts - 최대 시도 횟수 (repeatable일 때)
 * @property {Array} outcomes - 가능한 결과들
 */

/**
 * 던전 노드 정의
 * @typedef {Object} DungeonNode
 * @property {string} id - 노드 ID
 * @property {string} type - 노드 타입
 * @property {string} name - 노드 이름
 * @property {string} description - 설명
 * @property {string[]} connections - 연결된 노드 ID 배열 (양방향)
 * @property {Object} event - 이벤트 정보
 * @property {Array} choices - 선택지 배열 (기로 노드일 때)
 * @property {boolean} visited - 방문 여부
 * @property {boolean} cleared - 클리어 여부
 */

// 예시: 절벽 등반 이벤트
export const OBSTACLE_TEMPLATES = {
  cliff: {
    id: 'cliff',
    name: '깎아지른 절벽',
    description: '깎아지른 절벽 위로 통로가 보입니다.',
    eventType: DUNGEON_EVENT_TYPES.OBSTACLE,
    choices: [
      {
        id: 'climb',
        text: '추락을 각오하고 시도한다.',
        repeatable: true,
        maxAttempts: 5,
        requirements: {},  // 기본 선택지
        progressText: [
          '아직 한참 더 올라가야 할 것 같습니다.',
          '손에 땀이 납니다. 계속 올라갑니다.',
          '당신의 손이 힘이 부족해 후들거립니다.',
          '거의 다 왔습니다. 조금만 더!',
          '마침내 정상에 도착했습니다!',
        ],
        // 시도할수록 힘 요구량 증가 (1회차: 0, 2회차: 0, 3회차: 1, 4회차: 2, 5회차: 3)
        scalingRequirement: { stat: 'strength', baseValue: -2, increment: 1 },
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '마침내 정상에 도착했습니다!',
            effect: { unlockNode: 'next_area' },
          },
          failure: {
            type: CHOICE_RESULT_TYPES.FAILURE,
            text: '쿵! 당신은 밑으로 추락하고 말았습니다. 전신이 부서진듯 아파옵니다.',
            effect: { damage: 12 },
          },
        },
        // 주특기로 우회 가능
        specialOverrides: [
          {
            requiredSpecial: 'leap',  // 도약 카드
            text: '한 번에 도약해 올라간다.',
            outcome: {
              type: CHOICE_RESULT_TYPES.SUCCESS,
              text: '강력한 도약으로 단번에 올라섰습니다!',
              effect: { unlockNode: 'next_area' },
            },
          },
        ],
      },
      {
        id: 'retreat',
        text: '포기하고 돌아간다.',
        repeatable: false,
        requirements: {},
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '안전하게 뒤로 물러났습니다.',
            effect: { returnToPrevious: true },
          },
        },
      },
    ],
  },

  lockedChest: {
    id: 'locked_chest',
    name: '잠긴 보물상자',
    description: '딱 봐도 보물이 잠들어있어 보이는 상자가 보입니다. 그런데 열쇠가 필요하네요.',
    eventType: DUNGEON_EVENT_TYPES.CHEST,
    choices: [
      {
        id: 'use_key',
        text: '열쇠로 연다.',
        repeatable: false,
        requirements: { item: 'dungeon_key' },
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '딸깍. 상자가 열렸습니다.',
            effect: { reward: { gold: { min: 15, max: 25 }, loot: 1 }, consumeItem: 'dungeon_key' },
          },
        },
      },
      {
        id: 'force_open',
        text: '힘으로 자물쇠를 부수려 시도한다.',
        repeatable: true,
        maxAttempts: 5,
        requirements: {},
        progressText: [
          '쾅! 있는 힘껏 내려칩니다.',
          '쾅! 쾅! 자물쇠가 조금 휘어졌습니다.',
          '쾅! 쾅! 쾅! 거의 다 부서졌습니다!',
        ],
        screenEffect: 'shake',  // 화면 흔들림
        soundEffect: 'bang',    // 효과음
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.PARTIAL,
            text: '자물쇠가 부서졌습니다! 하지만 내용물 일부가 손상되었습니다.',
            effect: { reward: { gold: { min: 8, max: 15 } } },  // 보상 감소
          },
          failure: {
            // 과잉 선택 시 미믹으로 변신
            type: CHOICE_RESULT_TYPES.FAILURE,
            text: '콰직! 손이 물렸습니다. 알고보니 상자는 동면중인 미믹이었습니다!',
            effect: { damage: 5, triggerCombat: 'mimic' },
          },
        },
        // 3회 초과 시 경고
        warningAtAttempt: 3,
        warningText: '상자에서 이상한 기운이 느껴집니다...',
      },
      {
        id: 'leave',
        text: '포기한다.',
        repeatable: false,
        requirements: {},
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '상자를 뒤로 하고 떠납니다.',
            effect: {},
          },
        },
      },
    ],
  },

  unstableBridge: {
    id: 'unstable_bridge',
    name: '흔들리는 다리',
    description: '낡은 나무 다리가 깊은 절벽 위에 위태롭게 걸쳐 있습니다. 아래는 보이지 않습니다.',
    eventType: DUNGEON_EVENT_TYPES.OBSTACLE,
    choices: [
      {
        id: 'careful_cross',
        text: '조심스럽게 건넌다.',
        repeatable: true,
        maxAttempts: 4,
        requirements: {},
        progressText: [
          '한 발짝... 다리가 삐걱거립니다.',
          '절반쯤 왔습니다. 바람이 불어옵니다.',
          '거의 다 왔습니다! 널빤지가 흔들립니다.',
          '안전하게 건넜습니다!',
        ],
        // 1회차: 0, 2회차: 1, 3회차: 2, 4회차: 3
        scalingRequirement: { stat: 'agility', baseValue: -1, increment: 1 },
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '무사히 다리를 건넜습니다!',
            effect: { unlockNode: 'next_area' },
          },
          failure: {
            type: CHOICE_RESULT_TYPES.FAILURE,
            text: '발을 헛디뎠습니다! 간신히 매달렸지만 손에 상처를 입었습니다.',
            effect: { damage: 8 },
          },
        },
      },
      {
        id: 'dash_across',
        text: '전력질주로 한 번에 건넌다.',
        repeatable: false,
        requirements: { agility: 4 },
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '빠른 발놀림으로 단숨에 건넜습니다!',
            effect: { unlockNode: 'next_area' },
          },
        },
      },
      {
        id: 'retreat_bridge',
        text: '돌아간다.',
        repeatable: false,
        requirements: {},
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '위험을 피해 돌아섭니다.',
            effect: { returnToPrevious: true },
          },
        },
      },
    ],
  },

  mysteriousStatue: {
    id: 'mysterious_statue',
    name: '신비로운 석상',
    description: '고대 석상이 서 있습니다. 한 손은 앞으로 뻗어 있고, 다른 손에는 보석이 쥐어져 있습니다.',
    eventType: DUNGEON_EVENT_TYPES.CURIO,
    choices: [
      {
        id: 'examine',
        text: '석상을 자세히 살핀다.',
        repeatable: true,
        maxAttempts: 3,
        requirements: {},
        progressText: [
          '석상의 표면에 희미한 문양이 새겨져 있습니다...',
          '문양이 고대 언어입니다. 해독을 시도합니다...',
          '"경배하는 자에게 축복을" - 의미를 이해했습니다!',
        ],
        scalingRequirement: { stat: 'insight', baseValue: 0, increment: 1 },
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '석상 앞에 무릎을 꿇자, 보석이 손에 떨어집니다.',
            effect: { reward: { gold: { min: 20, max: 35 }, relic: 'random_common' } },
          },
          failure: {
            type: CHOICE_RESULT_TYPES.FAILURE,
            text: '문양의 의미를 잘못 해석했습니다. 석상의 눈이 붉게 빛나며...',
            effect: { damage: 6, debuff: 'curse' },
          },
        },
      },
      {
        id: 'take_gem',
        text: '보석을 낚아챈다.',
        repeatable: false,
        requirements: {},
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.PARTIAL,
            text: '보석을 손에 넣었지만, 석상의 눈이 번뜩입니다!',
            effect: { reward: { gold: { min: 10, max: 15 } }, triggerCombat: 'stone_guardian' },
          },
        },
      },
      {
        id: 'ignore_statue',
        text: '지나친다.',
        repeatable: false,
        requirements: {},
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '석상을 지나쳐 갑니다.',
            effect: {},
          },
        },
      },
    ],
  },

  ancientAltar: {
    id: 'ancient_altar',
    name: '고대 제단',
    description: '핏빛 제단이 어두운 빛을 뿜고 있습니다. 제단 위에 금화가 쌓여 있습니다.',
    eventType: DUNGEON_EVENT_TYPES.CURIO,
    choices: [
      {
        id: 'blood_offering',
        text: '피를 바친다. (체력 -10)',
        repeatable: false,
        requirements: {},
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '제단이 당신의 피를 받아들입니다. 금화와 함께 신비로운 힘이 느껴집니다.',
            effect: { damage: 10, reward: { gold: { min: 30, max: 50 } }, buff: 'blood_pact' },
          },
        },
      },
      {
        id: 'pray',
        text: '기도를 올린다.',
        repeatable: true,
        maxAttempts: 3,
        requirements: {},
        progressText: [
          '제단 앞에 무릎 꿇고 기도합니다...',
          '마음을 비우고 집중합니다...',
          '제단의 의지와 연결되었습니다.',
        ],
        scalingRequirement: { stat: 'insight', baseValue: 0, increment: 1 },
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '제단이 당신의 경건함을 인정합니다. 피 없이도 축복을 내립니다.',
            effect: { reward: { gold: { min: 15, max: 25 } }, buff: 'blessed' },
          },
          failure: {
            type: CHOICE_RESULT_TYPES.FAILURE,
            text: '제단이 분노합니다! 불경한 자에게 저주를!',
            effect: { debuff: 'curse', damage: 5 },
          },
        },
      },
      {
        id: 'steal_gold',
        text: '금화를 훔친다.',
        repeatable: false,
        requirements: {},
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.PARTIAL,
            text: '금화를 쓸어 담는 순간, 제단의 수호자가 깨어납니다!',
            effect: { reward: { gold: { min: 20, max: 30 } }, triggerCombat: 'altar_guardian' },
          },
        },
      },
      {
        id: 'leave_altar',
        text: '건드리지 않는다.',
        repeatable: false,
        requirements: {},
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '현명한 선택입니다. 제단을 피해 지나갑니다.',
            effect: {},
          },
        },
      },
    ],
  },

  darkPassage: {
    id: 'dark_passage',
    name: '칠흑의 통로',
    description: '앞이 전혀 보이지 않는 어두운 통로입니다. 발밑에서 무언가 딸깍거리는 소리가 납니다.',
    eventType: DUNGEON_EVENT_TYPES.TRAP,
    choices: [
      {
        id: 'use_torch',
        text: '횃불을 켠다.',
        repeatable: false,
        requirements: { item: 'torch' },
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '횃불 불빛에 바닥의 함정들이 드러납니다. 조심히 피해갑니다.',
            effect: { consumeItem: 'torch', unlockNode: 'next_area' },
          },
        },
      },
      {
        id: 'careful_step',
        text: '더듬더듬 조심히 나아간다.',
        repeatable: true,
        maxAttempts: 4,
        requirements: {},
        progressText: [
          '한 발짝... 조심스럽게 발을 내딛습니다.',
          '딸깍! 뭔가를 밟았지만 반응이 없습니다...',
          '차갑고 끈적한 것이 느껴집니다. 거미줄?',
          '드디어 빛이 보입니다!',
        ],
        // 1회차: 0, 2회차: 1, 3회차: 2, 4회차: 3
        scalingRequirement: { stat: 'agility', baseValue: -1, increment: 1 },
        warningAtAttempt: 2,
        warningText: '발밑에서 무언가 움직이는 소리가 들립니다...',
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '함정을 모두 피해 통로를 빠져나왔습니다!',
            effect: { unlockNode: 'next_area' },
          },
          failure: {
            type: CHOICE_RESULT_TYPES.FAILURE,
            text: '찌릭! 숨겨진 가시에 찔렸습니다. 독이 몸에 퍼집니다.',
            effect: { damage: 6, debuff: 'poison' },
          },
        },
      },
      {
        id: 'run_through',
        text: '전력으로 달린다!',
        repeatable: false,
        requirements: {},
        successRate: 0.3,
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '운이 좋았습니다! 함정을 모두 피해 달려 나왔습니다.',
            effect: { unlockNode: 'next_area' },
          },
          failure: {
            type: CHOICE_RESULT_TYPES.FAILURE,
            text: '쾅! 벽에 부딪히고 함정에 걸려 나뒹굴었습니다.',
            effect: { damage: 15 },
          },
        },
      },
      {
        id: 'go_back_dark',
        text: '돌아간다.',
        repeatable: false,
        requirements: {},
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '위험한 통로를 피해 되돌아갑니다.',
            effect: { returnToPrevious: true },
          },
        },
      },
    ],
  },

  poisonousSwamp: {
    id: 'poisonous_swamp',
    name: '독늪',
    description: '독기가 피어오르는 늪이 길을 막고 있습니다. 건너편에 빛나는 무언가가 보입니다.',
    eventType: DUNGEON_EVENT_TYPES.OBSTACLE,
    choices: [
      {
        id: 'wade_through',
        text: '억지로 건넌다.',
        repeatable: true,
        maxAttempts: 3,
        requirements: {},
        progressText: [
          '발목까지 잠겼습니다. 독기가 코를 찌릅니다.',
          '허리까지 잠겼습니다. 피부가 따끔거립니다.',
          '거의 다 왔습니다!',
        ],
        // 1회차: 1, 2회차: 2, 3회차: 3
        scalingRequirement: { stat: 'strength', baseValue: 0, increment: 1 },
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.PARTIAL,
            text: '겨우 건넜습니다. 하지만 독이 스며들었습니다.',
            effect: { debuff: 'poison', reward: { gold: { min: 25, max: 40 } } },
          },
          failure: {
            type: CHOICE_RESULT_TYPES.FAILURE,
            text: '중독이 심각합니다. 겨우 빠져나왔지만...',
            effect: { damage: 12, debuff: 'poison' },
          },
        },
      },
      {
        id: 'use_antidote',
        text: '해독제를 바르고 건넌다.',
        repeatable: false,
        requirements: { item: 'antidote' },
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '해독제 덕분에 독을 피하고 안전하게 보물을 얻었습니다!',
            effect: { consumeItem: 'antidote', reward: { gold: { min: 25, max: 40 }, potion: 1 } },
          },
        },
      },
      {
        id: 'find_another_way',
        text: '다른 길을 찾는다.',
        repeatable: true,
        maxAttempts: 2,
        requirements: {},
        progressText: [
          '주변을 둘러봅니다...',
          '숨겨진 샛길을 발견했습니다!',
        ],
        scalingRequirement: { stat: 'insight', baseValue: 1, increment: 1 },
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '우회로를 찾아 안전하게 건넜습니다.',
            effect: { unlockNode: 'next_area' },
          },
          failure: {
            type: CHOICE_RESULT_TYPES.FAILURE,
            text: '다른 길은 없었습니다. 시간만 낭비했습니다.',
            effect: {},
          },
        },
      },
      {
        id: 'skip_swamp',
        text: '포기한다.',
        repeatable: false,
        requirements: {},
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '보물을 포기하고 돌아섭니다.',
            effect: {},
          },
        },
      },
    ],
  },
};

/**
 * 던전 생성 함수
 * @param {string} dungeonId - 던전 ID
 * @param {Object} config - 던전 설정
 * @returns {Object} 생성된 던전 데이터
 */
export function generateDungeonGraph(dungeonId, config = {}) {
  const {
    nodeCount = { min: 8, max: 12 },
    branchChance = 0.3,         // 분기 확률
    eventDensity = 0.6,         // 이벤트 밀도
    minCombats = 2,
    difficulty = 1,
  } = config;

  const nodes = [];
  const totalNodes = nodeCount.min + Math.floor(Math.random() * (nodeCount.max - nodeCount.min + 1));

  // 입구 노드
  nodes.push({
    id: `${dungeonId}_entrance`,
    type: DUNGEON_NODE_TYPES.ENTRANCE,
    name: '던전 입구',
    description: '어둠이 당신을 맞이합니다.',
    connections: [],
    event: null,
    visited: true,
    cleared: true,
  });

  // 중간 노드들 생성
  let currentNodeIndex = 0;
  for (let i = 1; i < totalNodes - 1; i++) {
    const isBranch = Math.random() < branchChance && i > 2 && i < totalNodes - 3;
    const nodeType = isBranch ? DUNGEON_NODE_TYPES.CROSSROAD :
                     (i % 2 === 0 ? DUNGEON_NODE_TYPES.ROOM : DUNGEON_NODE_TYPES.CORRIDOR);

    const node = {
      id: `${dungeonId}_node_${i}`,
      type: nodeType,
      name: getNodeName(nodeType, i),
      description: getNodeDescription(nodeType),
      connections: [],
      event: Math.random() < eventDensity ? generateEvent(nodeType, difficulty) : null,
      visited: false,
      cleared: false,
    };

    // 이전 노드와 연결 (양방향)
    const prevNode = nodes[currentNodeIndex];
    prevNode.connections.push(node.id);
    node.connections.push(prevNode.id);

    nodes.push(node);
    currentNodeIndex = nodes.length - 1;
  }

  // 출구 노드
  const exitNode = {
    id: `${dungeonId}_exit`,
    type: DUNGEON_NODE_TYPES.EXIT,
    name: '던전 출구',
    description: '빛이 보입니다.',
    connections: [],
    event: null,
    visited: false,
    cleared: false,
  };

  // 마지막 노드와 출구 연결
  const lastNode = nodes[nodes.length - 1];
  lastNode.connections.push(exitNode.id);
  exitNode.connections.push(lastNode.id);
  nodes.push(exitNode);

  // 최소 전투 보장
  ensureMinCombats(nodes, minCombats);

  return {
    id: dungeonId,
    nodes,
    currentNodeId: nodes[0].id,
    timeElapsed: 0,
    maxTime: 30,  // 30턴 제한
  };
}

function getNodeName(type, index) {
  const names = {
    [DUNGEON_NODE_TYPES.ROOM]: ['낡은 방', '어두운 방', '습한 방', '넓은 방'],
    [DUNGEON_NODE_TYPES.CORRIDOR]: ['좁은 복도', '긴 복도', '어두운 통로', '구불구불한 길'],
    [DUNGEON_NODE_TYPES.CROSSROAD]: ['갈림길', '분기점', '교차로'],
  };
  const options = names[type] || ['알 수 없는 장소'];
  return options[index % options.length];
}

function getNodeDescription(type) {
  const descriptions = {
    [DUNGEON_NODE_TYPES.ROOM]: '사방이 벽으로 둘러싸인 공간입니다.',
    [DUNGEON_NODE_TYPES.CORRIDOR]: '좁고 어두운 통로입니다.',
    [DUNGEON_NODE_TYPES.CROSSROAD]: '여러 갈래의 길이 보입니다.',
  };
  return descriptions[type] || '';
}

function generateEvent(nodeType, difficulty) {
  const rand = Math.random();

  if (nodeType === DUNGEON_NODE_TYPES.CORRIDOR) {
    // 복도: 전투, 함정 위주
    if (rand < 0.4) return { type: DUNGEON_EVENT_TYPES.COMBAT, difficulty };
    if (rand < 0.6) return { type: DUNGEON_EVENT_TYPES.TRAP };
    return { type: DUNGEON_EVENT_TYPES.NONE };
  }

  if (nodeType === DUNGEON_NODE_TYPES.ROOM) {
    // 방: 보물, 유물 위주
    if (rand < 0.35) return { type: DUNGEON_EVENT_TYPES.CHEST };
    if (rand < 0.55) return { type: DUNGEON_EVENT_TYPES.CURIO };
    if (rand < 0.7) return { type: DUNGEON_EVENT_TYPES.COMBAT, difficulty };
    return { type: DUNGEON_EVENT_TYPES.NONE };
  }

  if (nodeType === DUNGEON_NODE_TYPES.CROSSROAD) {
    // 기로: 장애물 위주
    if (rand < 0.5) return { type: DUNGEON_EVENT_TYPES.OBSTACLE };
    return { type: DUNGEON_EVENT_TYPES.NONE };
  }

  return { type: DUNGEON_EVENT_TYPES.NONE };
}

function ensureMinCombats(nodes, minCombats) {
  const combatCount = nodes.filter(n => n.event?.type === DUNGEON_EVENT_TYPES.COMBAT).length;
  let needed = minCombats - combatCount;

  const eligibleNodes = nodes.filter(n =>
    n.type !== DUNGEON_NODE_TYPES.ENTRANCE &&
    n.type !== DUNGEON_NODE_TYPES.EXIT &&
    (!n.event || n.event.type === DUNGEON_EVENT_TYPES.NONE)
  );

  while (needed > 0 && eligibleNodes.length > 0) {
    const idx = Math.floor(Math.random() * eligibleNodes.length);
    eligibleNodes[idx].event = { type: DUNGEON_EVENT_TYPES.COMBAT, difficulty: 1 };
    eligibleNodes.splice(idx, 1);
    needed--;
  }
}

/**
 * 시간 페널티 계산
 * @param {number} timeElapsed - 경과 시간(턴)
 * @param {number} maxTime - 최대 시간
 * @returns {Object} 페널티 정보
 */
export function calculateTimePenalty(timeElapsed, maxTime) {
  const ratio = timeElapsed / maxTime;

  if (ratio < 0.5) {
    return { level: 0, description: '안전', etherDecay: 0, ambushChance: 0 };
  }
  if (ratio < 0.75) {
    return { level: 1, description: '불안', etherDecay: 1, ambushChance: 0.1 };
  }
  if (ratio < 0.9) {
    return { level: 2, description: '위험', etherDecay: 3, ambushChance: 0.25 };
  }
  return { level: 3, description: '절박', etherDecay: 5, ambushChance: 0.4 };
}
