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
        // 시도할수록 힘 요구량 증가 (1회차: 1, 2회차: 2, 3회차: 3, ...)
        scalingRequirement: { stat: 'strength', baseValue: 0, increment: 1 },
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
