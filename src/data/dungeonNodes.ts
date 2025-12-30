/**
 * @file dungeonNodes.js
 * @description 던전 노드 시스템
 * @typedef {import('../types').DungeonObject} DungeonObject
 *
 * 메트로배니아 스타일 던전을 위한 그래프 기반 구조
 *
 * ## 노드 타입
 * - ROOM: 방 (이벤트/보물)
 * - CORRIDOR: 복도 (이동)
 * - CROSSROAD: 기로 (선택지)
 *
 * ## 연결 타입
 * - OPEN: 항상 통과
 * - STAT_GATE: 스탯 필요
 * - ITEM_GATE: 아이템 필요
 */

// 노드 타입 정의
export const DUNGEON_NODE_TYPES = {
  ENTRANCE: 'entrance',      // 입구
  ROOM: 'room',              // 방 (이벤트/보물 등)
  CORRIDOR: 'corridor',      // 복도 (이동 구간)
  CROSSROAD: 'crossroad',    // 기로 (선택지)
  EXIT: 'exit',              // 출구
  SHORTCUT: 'shortcut',      // 숏컷 연결점
  TREASURE: 'treasure',      // 보물방
  BOSS: 'boss',              // 보스방
};

// 연결 타입 정의
export const CONNECTION_TYPES = {
  OPEN: 'open',              // 항상 통과 가능
  STAT_GATE: 'stat_gate',    // 스탯 필요 (힘/민첩/통찰)
  ITEM_GATE: 'item_gate',    // 아이템 필요 (열쇠, 횃불 등)
  ONE_WAY: 'one_way',        // 일방통행 (한쪽에서만 열 수 있음)
  LOCKED: 'locked',          // 잠김 (다른 곳에서 해제해야 함)
};

// 연결 인터페이스
interface DungeonConnection {
  targetId: string;
  type: string;
  requirements: { stat?: string; value?: number; item?: string } | null;
  unlocked: boolean;
}

// 플레이어 스탯 타입
type PlayerStat = 'strength' | 'agility' | 'insight';

// 플레이어 스탯 객체
interface PlayerStats {
  strength: number;
  agility: number;
  insight: number;
}

// 플레이어 아이템
interface PlayerItem {
  id: string;
  [key: string]: unknown;
}

// 던전 노드 인터페이스
interface DungeonNode {
  id: string;
  type: string;
  name: string;
  description: string;
  x: number;
  y: number;
  event: DungeonEvent | null;
  visited: boolean;
  cleared: boolean;
  hidden?: boolean;
}

// 던전 이벤트
interface DungeonEvent {
  type: string;
  templateId?: string;
  quality?: string;
  difficulty?: number;
}

// 던전 상태
interface DungeonState {
  id: string;
  nodes: DungeonNode[];
  connections: Record<string, DungeonConnection[]>;
  currentNodeId: string;
  unlockedShortcuts: string[];
  discoveredHidden: string[];
  timeElapsed: number;
  maxTime: number;
}

// 던전 생성 설정 인터페이스
interface DungeonGenerationConfig {
  mainPathLength?: number;
  branchCount?: number;
  difficulty?: number;
}

// 이벤트 타입 정의
export const DUNGEON_EVENT_TYPES = {
  NONE: 'none',
  CHEST: 'chest',            // 보물상자
  COMBAT: 'combat',          // 전투
  CURIO: 'curio',            // 수상한 상징
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
          '손을 뻗어 바위틈을 잡습니다. 아직 한참 더 올라가야 합니다.',
          '중간쯤 왔습니다. 손에 땀이 납니다.',
          '팔에 힘이 빠지기 시작합니다. 거의 다 왔습니다!',
          '정상이 코앞입니다! 마지막 힘을 짜냅니다.',
        ],
        // 스탯 부족 시 표시되는 텍스트 (시도 횟수별)
        strainText: [
          '손아귀에 힘이 부족합니다. 바위가 미끄럽게 느껴집니다.',
          '팔이 후들후들 떨립니다. 힘이 부족한 것 같습니다.',
          '온몸이 떨리기 시작합니다. 이대로는 위험합니다!',
          '손가락 끝에 감각이 없어집니다. 더 이상은...',
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
          '쾅! 있는 힘껏 내려칩니다. 자물쇠에 흠집이 났습니다.',
          '쾅! 쾅! 자물쇠가 조금 휘어졌습니다.',
          '쾅! 쾅! 쾅! 거의 다 부서졌습니다!',
          '한 번만 더!',
        ],
        strainText: [
          '힘이 부족합니다. 손목이 아파옵니다.',
          '팔에 쥐가 납니다. 힘을 더 길러야 할 것 같습니다.',
          '주먹에서 피가 납니다. 이대로는 자물쇠보다 손이 먼저 부서질 것 같습니다.',
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
          '절반쯤 왔습니다. 균형을 잡으며 천천히.',
          '거의 다 왔습니다! 널빤지가 흔들립니다.',
        ],
        strainText: [
          '다리가 후들거립니다. 균형 잡기가 어렵습니다.',
          '발이 미끄러질 것 같습니다. 몸이 굳어갑니다.',
          '현기증이 납니다. 아래를 보지 않으려 애쓰지만...',
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
        requirements: {},
        successRate: 0.5,
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '빠른 발놀림으로 단숨에 건넜습니다!',
            effect: { unlockNode: 'next_area' },
          },
          failure: {
            type: CHOICE_RESULT_TYPES.FAILURE,
            text: '너무 급하게 달리다 발이 미끄러졌습니다!',
            effect: { damage: 10 },
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
        ],
        strainText: [
          '문양의 의미를 알 것 같은데... 머리가 아파옵니다.',
          '집중하려 하지만 생각이 흐려집니다. 통찰력이 부족한 것 같습니다.',
        ],
        scalingRequirement: { stat: 'insight', baseValue: 0, increment: 1 },
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '"경배하는 자에게 축복을" - 석상 앞에 무릎을 꿇자, 보석이 손에 떨어집니다.',
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
        text: '피를 바친다.',
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
        ],
        strainText: [
          '집중이 흐트러집니다. 마음이 어지럽습니다.',
          '제단의 의지를 느낄 수 없습니다. 통찰력이 부족한 것 같습니다.',
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
        ],
        strainText: [
          '어둠 속에서 방향 감각을 잃어갑니다.',
          '발이 휘청거립니다. 민첩하게 대응하기 어렵습니다.',
          '무언가에 걸려 넘어질 뻔 했습니다!',
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
        ],
        strainText: [
          '다리에 힘이 빠집니다. 늪에서 발을 빼기 어렵습니다.',
          '온몸이 무거워집니다. 체력이 부족합니다.',
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
        ],
        strainText: [
          '아무리 봐도 다른 길이 보이지 않습니다. 통찰력이 부족한 것 같습니다.',
        ],
        scalingRequirement: { stat: 'insight', baseValue: 1, increment: 1 },
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '숨겨진 샛길을 발견했습니다! 우회로를 찾아 안전하게 건넜습니다.',
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

  // === 자원 획득 상호작용 ===

  oreVein: {
    id: 'ore_vein',
    name: '광맥',
    description: '벽면에 빛나는 광석이 박혀 있습니다. 채굴할 수 있을 것 같습니다.',
    eventType: DUNGEON_EVENT_TYPES.CURIO,
    choices: [
      {
        id: 'mine_force',
        text: '힘껏 캔다.',
        repeatable: true,
        maxAttempts: 3,
        requirements: {},
        progressText: [
          '쿵! 광석 조각이 떨어집니다.',
          '쿵! 쿵! 더 많은 광석이 드러납니다.',
        ],
        strainText: [
          '팔에 힘이 부족합니다. 광석이 꿈쩍도 안 합니다.',
          '손이 저려옵니다. 더 힘이 필요합니다.',
        ],
        scalingRequirement: { stat: 'strength', baseValue: 0, increment: 1 },
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '광석을 모두 캐냈습니다!',
            effect: { reward: { material: { min: 2, max: 4 } } },
          },
          failure: {
            type: CHOICE_RESULT_TYPES.FAILURE,
            text: '힘이 부족해 광석을 캐지 못했습니다. 손만 다쳤습니다.',
            effect: { damage: 4 },
          },
        },
      },
      {
        id: 'mine_smart',
        text: '약점을 찾아 캔다.',
        repeatable: true,
        maxAttempts: 2,
        requirements: {},
        progressText: [
          '광맥의 결을 살펴봅니다...',
        ],
        strainText: [
          '광맥의 구조가 복잡합니다. 통찰력이 부족합니다.',
        ],
        scalingRequirement: { stat: 'insight', baseValue: 1, increment: 1 },
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '정확한 지점을 찾아 효율적으로 캐냈습니다!',
            effect: { reward: { material: { min: 3, max: 5 } } },
          },
          failure: {
            type: CHOICE_RESULT_TYPES.FAILURE,
            text: '잘못된 곳을 쳤습니다. 광석이 부서졌습니다.',
            effect: { reward: { material: { min: 1, max: 1 } } },
          },
        },
      },
      {
        id: 'leave_ore',
        text: '지나친다.',
        repeatable: false,
        requirements: {},
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '광맥을 뒤로 하고 떠납니다.',
            effect: {},
          },
        },
      },
    ],
  },

  corpse: {
    id: 'corpse',
    name: '모험가의 시체',
    description: '불운한 모험가의 시체가 쓰러져 있습니다. 소지품이 남아있을지도 모릅니다.',
    eventType: DUNGEON_EVENT_TYPES.CURIO,
    choices: [
      {
        id: 'search_corpse',
        text: '소지품을 뒤진다.',
        repeatable: false,
        requirements: {},
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '주머니에서 금화를 발견했습니다.',
            effect: { reward: { gold: { min: 10, max: 20 } } },
          },
        },
      },
      {
        id: 'search_thorough',
        text: '꼼꼼히 수색한다.',
        repeatable: true,
        maxAttempts: 2,
        requirements: {},
        progressText: [
          '옷 안쪽을 뒤집니다...',
        ],
        strainText: [
          '뭔가 있는 것 같은데 찾기 어렵습니다.',
        ],
        scalingRequirement: { stat: 'insight', baseValue: 0, increment: 1 },
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '숨겨진 주머니에서 금화와 원자재를 발견했습니다!',
            effect: { reward: { gold: { min: 15, max: 25 }, material: { min: 1, max: 2 } } },
          },
          failure: {
            type: CHOICE_RESULT_TYPES.FAILURE,
            text: '더 이상 찾을 것이 없습니다.',
            effect: { reward: { gold: { min: 5, max: 10 } } },
          },
        },
      },
      {
        id: 'bury_corpse',
        text: '묵념하고 지나간다.',
        repeatable: false,
        requirements: {},
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '동료의 명복을 빕니다. 마음이 편안해집니다.',
            effect: { buff: 'blessed' },
          },
        },
      },
    ],
  },

  abandonedVault: {
    id: 'abandoned_vault',
    name: '버려진 금고',
    description: '먼지 쌓인 금고가 벽에 박혀 있습니다. 자물쇠가 녹슬어 있습니다.',
    eventType: DUNGEON_EVENT_TYPES.CURIO,
    choices: [
      {
        id: 'pick_lock',
        text: '자물쇠를 딴다.',
        repeatable: true,
        maxAttempts: 3,
        requirements: {},
        progressText: [
          '찰칵... 첫 번째 핀이 풀렸습니다.',
          '찰칵... 거의 다 됐습니다.',
        ],
        strainText: [
          '손놀림이 부족합니다. 핀이 다시 잠겼습니다.',
          '손가락이 떨립니다. 섬세함이 부족합니다.',
        ],
        scalingRequirement: { stat: 'agility', baseValue: 0, increment: 1 },
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '딸깍! 금고가 열렸습니다. 금화가 가득합니다!',
            effect: { reward: { gold: { min: 30, max: 50 } } },
          },
          failure: {
            type: CHOICE_RESULT_TYPES.FAILURE,
            text: '자물쇠가 완전히 망가졌습니다. 더 이상 열 수 없습니다.',
            effect: {},
          },
        },
      },
      {
        id: 'break_vault',
        text: '힘으로 부순다.',
        repeatable: true,
        maxAttempts: 4,
        requirements: {},
        progressText: [
          '쿵! 금고에 흠집이 났습니다.',
          '쿵! 쿵! 문이 휘어지기 시작합니다.',
          '거의 다 부서졌습니다!',
        ],
        strainText: [
          '금고가 너무 튼튼합니다.',
          '팔이 아파옵니다. 힘이 부족합니다.',
        ],
        scalingRequirement: { stat: 'strength', baseValue: 0, increment: 1 },
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.PARTIAL,
            text: '금고가 부서졌습니다! 일부 금화가 흩어졌지만 꽤 건졌습니다.',
            effect: { reward: { gold: { min: 20, max: 35 } } },
          },
          failure: {
            type: CHOICE_RESULT_TYPES.FAILURE,
            text: '손만 다쳤습니다. 금고는 꿈쩍도 안 합니다.',
            effect: { damage: 5 },
          },
        },
      },
      {
        id: 'leave_vault',
        text: '포기한다.',
        repeatable: false,
        requirements: {},
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '금고를 뒤로 하고 떠납니다.',
            effect: {},
          },
        },
      },
    ],
  },

  mushroomCluster: {
    id: 'mushroom_cluster',
    name: '버섯 군락',
    description: '형형색색의 버섯들이 자라고 있습니다. 일부는 귀한 재료로 쓰일 것 같습니다.',
    eventType: DUNGEON_EVENT_TYPES.CURIO,
    choices: [
      {
        id: 'gather_careful',
        text: '조심히 채집한다.',
        repeatable: true,
        maxAttempts: 2,
        requirements: {},
        progressText: [
          '버섯의 종류를 구분합니다...',
        ],
        strainText: [
          '어떤 버섯이 좋은 건지 구분이 안 됩니다.',
        ],
        scalingRequirement: { stat: 'insight', baseValue: 0, increment: 1 },
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '귀한 버섯들만 골라 채집했습니다!',
            effect: { reward: { material: { min: 2, max: 3 } } },
          },
          failure: {
            type: CHOICE_RESULT_TYPES.FAILURE,
            text: '독버섯을 만졌습니다! 손이 얼얼합니다.',
            effect: { damage: 3, debuff: 'poison' },
          },
        },
      },
      {
        id: 'gather_all',
        text: '전부 긁어모은다.',
        repeatable: false,
        requirements: {},
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.PARTIAL,
            text: '버섯을 잔뜩 모았습니다. 일부는 쓸모없지만 괜찮은 것도 있습니다.',
            effect: { reward: { material: { min: 1, max: 2 } } },
          },
        },
      },
      {
        id: 'leave_mushroom',
        text: '지나친다.',
        repeatable: false,
        requirements: {},
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '버섯밭을 피해 갑니다.',
            effect: {},
          },
        },
      },
    ],
  },

  brokenCart: {
    id: 'broken_cart',
    name: '부서진 수레',
    description: '상인의 수레가 전복되어 있습니다. 짐이 흩어져 있습니다.',
    eventType: DUNGEON_EVENT_TYPES.CURIO,
    choices: [
      {
        id: 'search_cart',
        text: '짐을 뒤진다.',
        repeatable: false,
        requirements: {},
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '쓸만한 물건들을 찾았습니다.',
            effect: { reward: { gold: { min: 8, max: 15 }, material: { min: 1, max: 2 } } },
          },
        },
      },
      {
        id: 'salvage_cart',
        text: '수레를 해체한다.',
        repeatable: true,
        maxAttempts: 2,
        requirements: {},
        progressText: [
          '나무와 쇠붙이를 분리합니다...',
        ],
        strainText: [
          '해체하기 어렵습니다. 힘이 부족합니다.',
        ],
        scalingRequirement: { stat: 'strength', baseValue: 0, increment: 1 },
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '수레를 해체해 원자재를 얻었습니다!',
            effect: { reward: { material: { min: 2, max: 4 } } },
          },
          failure: {
            type: CHOICE_RESULT_TYPES.FAILURE,
            text: '수레가 너무 단단히 박혀있습니다.',
            effect: { reward: { material: { min: 1, max: 1 } } },
          },
        },
      },
      {
        id: 'leave_cart',
        text: '지나친다.',
        repeatable: false,
        requirements: {},
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '수레를 뒤로 하고 떠납니다.',
            effect: {},
          },
        },
      },
    ],
  },

  crystalFormation: {
    id: 'crystal_formation',
    name: '수정 결정',
    description: '거대한 수정 결정이 천장에서 자라고 있습니다. 매우 귀한 재료입니다.',
    eventType: DUNGEON_EVENT_TYPES.CURIO,
    choices: [
      {
        id: 'climb_crystal',
        text: '올라가서 캔다.',
        repeatable: true,
        maxAttempts: 3,
        requirements: {},
        progressText: [
          '수정을 향해 올라갑니다...',
          '거의 다 왔습니다. 손을 뻗으면 닿을 것 같습니다.',
        ],
        strainText: [
          '미끄럽습니다. 민첩하게 균형을 잡기 어렵습니다.',
          '손아귀에 힘이 빠집니다.',
        ],
        scalingRequirement: { stat: 'agility', baseValue: 0, increment: 1 },
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '수정을 성공적으로 채취했습니다!',
            effect: { reward: { material: { min: 3, max: 5 } } },
          },
          failure: {
            type: CHOICE_RESULT_TYPES.FAILURE,
            text: '미끄러져 떨어졌습니다!',
            effect: { damage: 8 },
          },
        },
      },
      {
        id: 'throw_rock',
        text: '돌을 던져 떨어뜨린다.',
        repeatable: false,
        requirements: {},
        successRate: 0.5,
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.PARTIAL,
            text: '수정이 떨어졌습니다! 일부가 깨졌지만 꽤 건졌습니다.',
            effect: { reward: { material: { min: 2, max: 3 } } },
          },
          failure: {
            type: CHOICE_RESULT_TYPES.FAILURE,
            text: '빗나갔습니다. 수정은 꿈쩍도 안 합니다.',
            effect: {},
          },
        },
      },
      {
        id: 'leave_crystal',
        text: '포기한다.',
        repeatable: false,
        requirements: {},
        outcomes: {
          success: {
            type: CHOICE_RESULT_TYPES.SUCCESS,
            text: '수정을 뒤로 하고 떠납니다.',
            effect: {},
          },
        },
      },
    ],
  },
};

/**
 * 연결 정보 생성 헬퍼
 */
function createConnection(
  targetId: string,
  type = CONNECTION_TYPES.OPEN,
  requirements: DungeonConnection['requirements'] = null
): DungeonConnection {
  return {
    targetId,
    type,
    requirements,  // { stat: 'strength', value: 3 } 또는 { item: 'key' }
    unlocked: type === CONNECTION_TYPES.OPEN,
  };
}

/**
 * 메트로배니아 스타일 던전 생성 함수
 * - 메인 경로 + 분기 경로
 * - 스탯/아이템 관문
 * - 숏컷 문
 */
export function generateDungeonGraph(dungeonId: string, config: DungeonGenerationConfig = {}): DungeonState {
  const {
    mainPathLength = 6,         // 메인 경로 길이
    branchCount = 2,            // 분기 경로 수
    difficulty = 1,
  } = config;

  const nodes: DungeonNode[] = [];
  const connections: Record<string, DungeonConnection[]> = {};  // nodeId -> Connection[]

  // 1. 입구 노드
  const entranceId = `${dungeonId}_entrance`;
  nodes.push({
    id: entranceId,
    type: DUNGEON_NODE_TYPES.ENTRANCE,
    name: '던전 입구',
    description: '어둠이 당신을 맞이합니다.',
    x: 0, y: 2,  // 미니맵용 좌표
    event: null,
    visited: true,
    cleared: true,
  });
  connections[entranceId] = [];

  // 2. 메인 경로 생성
  let prevId = entranceId;
  const mainPath = [entranceId];

  for (let i = 1; i <= mainPathLength; i++) {
    const nodeId = `${dungeonId}_main_${i}`;
    const isLast = i === mainPathLength;
    const nodeType = isLast ? DUNGEON_NODE_TYPES.EXIT :
                     (i % 2 === 0 ? DUNGEON_NODE_TYPES.ROOM : DUNGEON_NODE_TYPES.CORRIDOR);

    nodes.push({
      id: nodeId,
      type: nodeType,
      name: isLast ? '던전 출구' : getNodeName(nodeType, i),
      description: isLast ? '빛이 보입니다.' : getNodeDescription(nodeType),
      x: i, y: 2,
      event: !isLast && i > 1 ? generateEvent(nodeType, difficulty) : null,
      visited: false,
      cleared: false,
    });

    // 양방향 연결 (OPEN)
    connections[nodeId] = [];
    connections[prevId].push(createConnection(nodeId, CONNECTION_TYPES.OPEN));
    connections[nodeId].push(createConnection(prevId, CONNECTION_TYPES.OPEN));

    mainPath.push(nodeId);
    prevId = nodeId;
  }

  // 3. 분기 경로 추가 (스탯 관문)
  const branchPoints = [2, 4];  // 메인 경로에서 분기할 위치
  const stats: PlayerStat[] = ['strength', 'agility', 'insight'];

  branchPoints.forEach((branchIdx, i) => {
    if (branchIdx >= mainPath.length) return;

    const branchStartId = mainPath[branchIdx];
    const stat = stats[i % stats.length];
    const branchId = `${dungeonId}_branch_${i}`;
    const treasureId = `${dungeonId}_treasure_${i}`;

    // 분기 방
    nodes.push({
      id: branchId,
      type: DUNGEON_NODE_TYPES.CROSSROAD,
      name: '갈림길',
      description: '다른 길이 보입니다.',
      x: branchIdx, y: i === 0 ? 1 : 3,
      event: { type: DUNGEON_EVENT_TYPES.OBSTACLE, templateId: getObstacleForStat(stat) },
      visited: false,
      cleared: false,
    });
    connections[branchId] = [];

    // 메인 → 분기 (스탯 관문)
    connections[branchStartId].push(createConnection(branchId, CONNECTION_TYPES.STAT_GATE, { stat, value: 2 }));
    connections[branchId].push(createConnection(branchStartId, CONNECTION_TYPES.OPEN));

    // 보물방
    nodes.push({
      id: treasureId,
      type: DUNGEON_NODE_TYPES.TREASURE,
      name: '보물방',
      description: '귀중한 것들이 빛나고 있습니다.',
      x: branchIdx + 1, y: i === 0 ? 1 : 3,
      event: { type: DUNGEON_EVENT_TYPES.CHEST, quality: 'rare' },
      visited: false,
      cleared: false,
    });
    connections[treasureId] = [];
    connections[branchId].push(createConnection(treasureId, CONNECTION_TYPES.OPEN));
    connections[treasureId].push(createConnection(branchId, CONNECTION_TYPES.OPEN));

    // 숏컷: 보물방 → 메인 경로 앞쪽 (일방통행, 열면 양방향)
    if (branchIdx + 2 < mainPath.length) {
      const shortcutTargetId = mainPath[branchIdx + 2];
      connections[treasureId].push(createConnection(shortcutTargetId, CONNECTION_TYPES.ONE_WAY));
      // 반대편은 잠김 상태로 시작 (treasureId에서 열어야 함)
      connections[shortcutTargetId].push(createConnection(treasureId, CONNECTION_TYPES.LOCKED));
    }
  });

  // 4. 숨겨진 방 (통찰 필요)
  const hiddenId = `${dungeonId}_hidden`;
  const hiddenConnectIdx = Math.min(3, mainPath.length - 2);
  nodes.push({
    id: hiddenId,
    type: DUNGEON_NODE_TYPES.ROOM,
    name: '숨겨진 방',
    description: '벽 뒤에 숨겨진 공간입니다.',
    x: hiddenConnectIdx, y: 0,
    event: { type: DUNGEON_EVENT_TYPES.CURIO, quality: 'legendary' },
    visited: false,
    cleared: false,
    hidden: true,  // 발견 전까지 미니맵에 안 보임
  });
  connections[hiddenId] = [];
  connections[mainPath[hiddenConnectIdx]].push(
    createConnection(hiddenId, CONNECTION_TYPES.STAT_GATE, { stat: 'insight', value: 3 })
  );
  connections[hiddenId].push(createConnection(mainPath[hiddenConnectIdx], CONNECTION_TYPES.OPEN));

  return {
    id: dungeonId,
    nodes,
    connections,  // 별도 연결 맵
    currentNodeId: entranceId,
    unlockedShortcuts: [],  // 열린 숏컷 ID 배열
    discoveredHidden: [],   // 발견한 숨겨진 방 ID 배열
    timeElapsed: 0,
    maxTime: 30,
  };
}

/**
 * 스탯에 맞는 장애물 템플릿 반환
 */
function getObstacleForStat(stat: PlayerStat): string {
  const mapping: Record<PlayerStat, string> = {
    strength: 'cliff',
    agility: 'unstableBridge',
    insight: 'mysteriousStatue',
  };
  return mapping[stat] || 'cliff';
}

/**
 * 연결 통과 가능 여부 체크
 * @param {Object} connection - 연결 정보
 * @param {Object} playerStats - { strength, agility, insight }
 * @param {Array} playerItems - 플레이어 아이템 배열
 * @param {Array} unlockedShortcuts - 열린 숏컷 배열
 * @returns {Object} { canPass: boolean, reason: string }
 */
export function canPassConnection(
  connection: DungeonConnection,
  playerStats: PlayerStats,
  playerItems: PlayerItem[] = [],
  unlockedShortcuts: string[] = []
): { canPass: boolean; reason: string | null; consumeItem?: string; isOneWay?: boolean; isLocked?: boolean } {
  const { type, requirements, targetId } = connection;

  // 이미 열린 연결
  if (connection.unlocked) {
    return { canPass: true, reason: null };
  }

  switch (type) {
    case CONNECTION_TYPES.OPEN:
      return { canPass: true, reason: null };

    case CONNECTION_TYPES.STAT_GATE:
      if (!requirements) return { canPass: true, reason: null };
      const statValue = playerStats[requirements.stat] || 0;
      const needed = requirements.value || 0;
      if (statValue >= needed) {
        return { canPass: true, reason: null };
      }
      return {
        canPass: false,
        reason: `${getStatName(requirements.stat)} ${needed} 필요 (현재: ${statValue})`,
      };

    case CONNECTION_TYPES.ITEM_GATE:
      if (!requirements) return { canPass: true, reason: null };
      const hasItem = playerItems.some(item => item.id === requirements.item);
      if (hasItem) {
        return { canPass: true, reason: null, consumeItem: requirements.consume };
      }
      return {
        canPass: false,
        reason: `${requirements.itemName || requirements.item} 필요`,
      };

    case CONNECTION_TYPES.ONE_WAY:
      // 일방통행은 해당 방향에서는 통과 가능
      return { canPass: true, reason: null, isOneWay: true };

    case CONNECTION_TYPES.LOCKED:
      // 잠긴 문은 반대편에서 열어야 함
      if (unlockedShortcuts.includes(targetId)) {
        return { canPass: true, reason: null };
      }
      return {
        canPass: false,
        reason: '반대편에서 열어야 합니다',
        isLocked: true,
      };

    default:
      return { canPass: true, reason: null };
  }
}

/**
 * 숏컷 열기 (일방통행 문을 양방향으로 변경)
 * @param {Object} dungeonState - 던전 상태
 * @param {string} fromNodeId - 현재 노드 ID
 * @param {string} toNodeId - 대상 노드 ID
 * @returns {Object} 업데이트된 던전 상태
 */
export function unlockShortcut(dungeonState: DungeonState, fromNodeId: string, toNodeId: string): DungeonState {
  const newState = { ...dungeonState };

  // 숏컷 목록에 추가
  if (!newState.unlockedShortcuts.includes(fromNodeId)) {
    newState.unlockedShortcuts = [...newState.unlockedShortcuts, fromNodeId];
  }
  if (!newState.unlockedShortcuts.includes(toNodeId)) {
    newState.unlockedShortcuts = [...newState.unlockedShortcuts, toNodeId];
  }

  // 연결 상태 업데이트
  const connections = { ...newState.connections };

  // 반대편 LOCKED 연결을 unlocked로 변경
  if (connections[toNodeId]) {
    connections[toNodeId] = connections[toNodeId].map((conn: DungeonConnection) => {
      if (conn.targetId === fromNodeId && conn.type === CONNECTION_TYPES.LOCKED) {
        return { ...conn, unlocked: true };
      }
      return conn;
    });
  }

  newState.connections = connections;
  return newState;
}

/**
 * 노드 이동
 * @param {Object} dungeonState - 던전 상태
 * @param {string} targetNodeId - 이동할 노드 ID
 * @param {Object} playerStats - 플레이어 스탯
 * @param {Array} playerItems - 플레이어 아이템
 * @returns {Object} { success, newState, message, consumedItem }
 */
export function moveToNode(
  dungeonState: DungeonState,
  targetNodeId: string,
  playerStats: PlayerStats,
  playerItems: PlayerItem[] = []
): { success: boolean; newState?: DungeonState; message?: string; consumedItem?: string } {
  const currentNodeId = dungeonState.currentNodeId;
  const connections = dungeonState.connections[currentNodeId] || [];

  // 연결 찾기
  const connection = connections.find((c: DungeonConnection) => c.targetId === targetNodeId);
  if (!connection) {
    return { success: false, message: '연결되지 않은 장소입니다.' };
  }

  // 통과 가능 여부 체크
  const checkResult = canPassConnection(
    connection,
    playerStats,
    playerItems,
    dungeonState.unlockedShortcuts
  );

  if (!checkResult.canPass) {
    return { success: false, message: checkResult.reason };
  }

  // 상태 업데이트
  let newState = { ...dungeonState };

  // 일방통행 문이면 숏컷 열기
  if (checkResult.isOneWay) {
    newState = unlockShortcut(newState, currentNodeId, targetNodeId);
  }

  // 노드 이동
  newState.currentNodeId = targetNodeId;
  newState.timeElapsed += 1;

  // 방문 처리
  const nodeIdx = newState.nodes.findIndex((n: DungeonNode) => n.id === targetNodeId);
  if (nodeIdx >= 0) {
    newState.nodes = [...newState.nodes];
    newState.nodes[nodeIdx] = { ...newState.nodes[nodeIdx], visited: true };

    // 숨겨진 방 발견
    if (newState.nodes[nodeIdx].hidden && !newState.discoveredHidden.includes(targetNodeId)) {
      newState.discoveredHidden = [...newState.discoveredHidden, targetNodeId];
    }
  }

  return {
    success: true,
    newState,
    consumedItem: checkResult.consumeItem,
  };
}

/**
 * 현재 노드에서 갈 수 있는 연결 목록
 */
export function getAvailableConnections(
  dungeonState: DungeonState,
  playerStats: PlayerStats,
  playerItems: PlayerItem[] = []
): Array<DungeonConnection & { targetNode?: DungeonNode; canPass: boolean; reason: string | null; isLocked?: boolean }> {
  const currentNodeId = dungeonState.currentNodeId;
  const connections = dungeonState.connections[currentNodeId] || [];

  return connections.map((conn: DungeonConnection) => {
    const targetNode = dungeonState.nodes.find((n: DungeonNode) => n.id === conn.targetId);
    const checkResult = canPassConnection(
      conn,
      playerStats,
      playerItems,
      dungeonState.unlockedShortcuts
    );

    return {
      ...conn,
      targetNode,
      canPass: checkResult.canPass,
      reason: checkResult.reason,
      isLocked: checkResult.isLocked,
    };
  });
}

function getStatName(stat: PlayerStat): string {
  const names: Record<PlayerStat, string> = { strength: '힘', agility: '민첩', insight: '통찰' };
  return names[stat] || stat;
}

function getNodeName(type: string, index: number): string {
  const names = {
    [DUNGEON_NODE_TYPES.ROOM]: ['낡은 방', '어두운 방', '습한 방', '넓은 방'],
    [DUNGEON_NODE_TYPES.CORRIDOR]: ['좁은 복도', '긴 복도', '어두운 통로', '구불구불한 길'],
    [DUNGEON_NODE_TYPES.CROSSROAD]: ['갈림길', '분기점', '교차로'],
  };
  const options = names[type] || ['알 수 없는 장소'];
  return options[index % options.length];
}

function getNodeDescription(type: string): string {
  const descriptions = {
    [DUNGEON_NODE_TYPES.ROOM]: '사방이 벽으로 둘러싸인 공간입니다.',
    [DUNGEON_NODE_TYPES.CORRIDOR]: '좁고 어두운 통로입니다.',
    [DUNGEON_NODE_TYPES.CROSSROAD]: '여러 갈래의 길이 보입니다.',
  };
  return descriptions[type] || '';
}

function generateEvent(nodeType: string, difficulty: number): DungeonEvent {
  const rand = Math.random();

  if (nodeType === DUNGEON_NODE_TYPES.CORRIDOR) {
    // 복도: 전투, 함정 위주
    if (rand < 0.4) return { type: DUNGEON_EVENT_TYPES.COMBAT, difficulty };
    if (rand < 0.6) return { type: DUNGEON_EVENT_TYPES.TRAP };
    return { type: DUNGEON_EVENT_TYPES.NONE };
  }

  if (nodeType === DUNGEON_NODE_TYPES.ROOM) {
    // 방: 보물, 상징 위주
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

function ensureMinCombats(nodes: DungeonNode[], minCombats: number): void {
  const combatCount = nodes.filter((n: DungeonNode) => n.event?.type === DUNGEON_EVENT_TYPES.COMBAT).length;
  let needed = minCombats - combatCount;

  const eligibleNodes = nodes.filter((n: DungeonNode) =>
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
export function calculateTimePenalty(timeElapsed: number, maxTime: number): {
  level: number;
  description: string;
  etherDecay: number;
  ambushChance: number;
} {
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
