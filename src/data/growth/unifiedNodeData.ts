/**
 * @file unifiedNodeData.ts
 * @description 피라미드 노드 통합 데이터
 *
 * 모든 노드 정보를 단일 소스로 통합:
 * - 노드 ID, 이름, 티어, 타입
 * - 연결 정보 (상위/하위 노드)
 * - 해금 조건 (개성 또는 상위 노드)
 * - 선택지 정보 (검/총)
 */

import type { Ethos, EthosEffect } from './ethosData';
import type { Pathos, PathosEffect } from './pathosData';

// ========================================
// 타입 정의
// ========================================

export type NodeType = 'ethos' | 'pathos';
export type WeaponType = 'sword' | 'gun' | 'common';

// 선택지 아이템
export interface ChoiceItem {
  id: string;
  name: string;
  type: WeaponType;
  description: string;
  effect: EthosEffect | PathosEffect;
  cooldown?: number;
}

// 통합 노드 구조
export interface UnifiedNode {
  id: string;
  name: string;
  tier: number;
  nodeType: NodeType;  // 'type' 대신 'nodeType' 사용 (TS 예약어 회피)

  // 연결 정보
  parentNodes: string[];       // 상위 노드 (이 노드 해금에 필요)
  childNodes: string[];        // 하위 노드 (이 노드가 해금 조건인 노드들)

  // 해금 조건 (tier 1-3)
  requiredTrait?: string;      // 필요 개성 ID
  requiredTraitCount?: number; // 필요 개성 횟수

  // 선택지 (tier 1은 직접 획득이므로 선택지 없음)
  choices: {
    sword: ChoiceItem;
    gun: ChoiceItem;
  } | null;

  // 노드 설명
  description: string;
}

// 개성 ID 타입
export type TraitId = 'bravery' | 'steadfast' | 'composure' | 'vitality' | 'passion' | 'thorough';

// 개성 한글명 → ID 매핑
export const TRAIT_NAME_TO_ID: Record<string, TraitId> = {
  '용맹함': 'bravery',
  '굳건함': 'steadfast',
  '냉철함': 'composure',
  '활력적': 'vitality',
  '열정적': 'passion',
  '철저함': 'thorough',
};

// ========================================
// 1단계 에토스 (개성 자동 해금, 선택지 없음)
// ========================================
const TIER1_NODES: Record<string, UnifiedNode> = {
  bravery: {
    id: 'bravery',
    name: '용맹함',
    tier: 1,
    nodeType: 'ethos',
    parentNodes: [],
    childNodes: ['pierce'],
    requiredTrait: 'bravery',
    requiredTraitCount: 1,
    choices: null,
    description: '전투 시작 시 공격력 +1',
  },
  steadfast: {
    id: 'steadfast',
    name: '굳건함',
    tier: 1,
    nodeType: 'ethos',
    parentNodes: [],
    childNodes: ['ignite'],
    requiredTrait: 'steadfast',
    requiredTraitCount: 1,
    choices: null,
    description: '최대 체력 +5',
  },
  composure: {
    id: 'composure',
    name: '냉철함',
    tier: 1,
    nodeType: 'ethos',
    parentNodes: [],
    childNodes: ['defense'],
    requiredTrait: 'composure',
    requiredTraitCount: 1,
    choices: null,
    description: '치명타 확률 +5%',
  },
  vitality: {
    id: 'vitality',
    name: '활력적',
    tier: 1,
    nodeType: 'ethos',
    parentNodes: [],
    childNodes: ['focus'],
    requiredTrait: 'vitality',
    requiredTraitCount: 1,
    choices: null,
    description: '턴 시작 시 10% 확률로 기교 획득',
  },
  passion: {
    id: 'passion',
    name: '열정적',
    tier: 1,
    nodeType: 'ethos',
    parentNodes: [],
    childNodes: ['chain'],
    requiredTrait: 'passion',
    requiredTraitCount: 1,
    choices: null,
    description: '연계 시 피해량 +2',
  },
  thorough: {
    id: 'thorough',
    name: '철저함',
    tier: 1,
    nodeType: 'ethos',
    parentNodes: [],
    childNodes: ['recovery'],
    requiredTrait: 'thorough',
    requiredTraitCount: 1,
    choices: null,
    description: '장전 시 탄약 +1',
  },
};

// ========================================
// 2단계 파토스 (개성 1회, 검 vs 총 선택)
// ========================================
const TIER2_NODES: Record<string, UnifiedNode> = {
  pierce: {
    id: 'pierce',
    name: '관통',
    tier: 2,
    nodeType: 'pathos',
    parentNodes: ['bravery'],
    childNodes: ['advance'],
    requiredTrait: 'bravery',
    requiredTraitCount: 1,
    choices: {
      sword: {
        id: 'cross',
        name: '교차',
        type: 'sword',
        description: '이번 턴 모든 검격 카드는 교차시 방어력을 4 얻습니다.',
        effect: { action: 'onCrossBlock', value: 4, duration: 'turn' },
      },
      gun: {
        id: 'armorPiercing',
        name: '철갑탄',
        type: 'gun',
        description: '철갑탄 토큰 1발 획득합니다.',
        effect: { action: 'addToken', token: 'armorPiercing', value: 1 },
        cooldown: 2,
      },
    },
    description: '방어 강화 또는 관통탄',
  },
  ignite: {
    id: 'ignite',
    name: '점화',
    tier: 2,
    nodeType: 'pathos',
    parentNodes: ['steadfast'],
    childNodes: ['constancy'],
    requiredTrait: 'steadfast',
    requiredTraitCount: 1,
    choices: {
      sword: {
        id: 'dance',
        name: '춤사위',
        type: 'sword',
        description: '연계 이후 후속 혹은 마무리 특성을 쓰면 회피 1회 획득.',
        effect: { action: 'chainEvade', value: 1 },
      },
      gun: {
        id: 'incendiary',
        name: '소이탄',
        type: 'gun',
        description: '소이탄 토큰 1발 획득합니다.',
        effect: { action: 'addToken', token: 'incendiary', value: 1 },
        cooldown: 2,
      },
    },
    description: '회피 획득 또는 화염탄',
  },
  defense: {
    id: 'defense',
    name: '방어',
    tier: 2,
    nodeType: 'pathos',
    parentNodes: ['composure'],
    childNodes: ['competence'],
    requiredTrait: 'composure',
    requiredTraitCount: 1,
    choices: {
      sword: {
        id: 'epee',
        name: '에페',
        type: 'sword',
        description: '검격 카드를 쓸때마다 방어력 5 획득 합니다.',
        effect: { action: 'onSwordBlock', value: 5, duration: 'turn' },
      },
      gun: {
        id: 'cover',
        name: '엄호',
        type: 'gun',
        description: '총격 카드를 쓸때마다 방어력 3 획득합니다.',
        effect: { action: 'onGunBlock', value: 3, duration: 'turn' },
      },
    },
    description: '검격 방어 또는 총격 방어',
  },
  focus: {
    id: 'focus',
    name: '집중',
    tier: 2,
    nodeType: 'pathos',
    parentNodes: ['vitality'],
    childNodes: ['persistence'],
    requiredTrait: 'vitality',
    requiredTraitCount: 1,
    choices: {
      sword: {
        id: 'flash',
        name: '일섬',
        type: 'sword',
        description: '다음 검격 카드의 피해량이 5 증가합니다.',
        effect: { action: 'nextSwordDamage', value: 5, duration: 'next' },
        cooldown: 2,
      },
      gun: {
        id: 'aim',
        name: '조준',
        type: 'gun',
        description: '다음 총격 카드가 반드시 치명타로 적중합니다.',
        effect: { action: 'nextGunCrit', duration: 'next' },
        cooldown: 3,
      },
    },
    description: '다음 공격 강화',
  },
  chain: {
    id: 'chain',
    name: '연쇄',
    tier: 2,
    nodeType: 'pathos',
    parentNodes: ['passion'],
    childNodes: ['endurance'],
    requiredTrait: 'passion',
    requiredTraitCount: 1,
    choices: {
      sword: {
        id: 'chainSlash',
        name: '연환',
        type: 'sword',
        description: '이번 턴 연계 성공 시 카드 1장을 드로우합니다.',
        effect: { action: 'chainDraw', value: 1, duration: 'turn' },
      },
      gun: {
        id: 'burst',
        name: '연발',
        type: 'gun',
        description: '이번 턴 연계 성공 시 총알 1발을 자동 장전합니다.',
        effect: { action: 'chainReload', value: 1, duration: 'turn' },
      },
    },
    description: '연계 시 보너스',
  },
  recovery: {
    id: 'recovery',
    name: '회복',
    tier: 2,
    nodeType: 'pathos',
    parentNodes: ['thorough'],
    childNodes: ['confirmation'],
    requiredTrait: 'thorough',
    requiredTraitCount: 1,
    choices: {
      sword: {
        id: 'meditation',
        name: '참선',
        type: 'sword',
        description: '이번 턴 피해를 입지 않으면 턴 종료 시 체력 5 회복.',
        effect: { action: 'noDamageHeal', value: 5, duration: 'turn' },
      },
      gun: {
        id: 'maintenance',
        name: '정비',
        type: 'gun',
        description: '장전된 총알 1발당 체력 1 회복합니다. (최대 3)',
        effect: { action: 'ammoHeal', value: 1, target: 'self' },
        cooldown: 2,
      },
    },
    description: '체력 회복',
  },
};

// ========================================
// 3단계 에토스 (개성 2회, 검 vs 총 선택)
// ========================================
const TIER3_NODES: Record<string, UnifiedNode> = {
  advance: {
    id: 'advance',
    name: '전진',
    tier: 3,
    nodeType: 'ethos',
    parentNodes: ['pierce'],
    childNodes: ['ironman'],
    requiredTrait: 'bravery',
    requiredTraitCount: 2,
    choices: {
      sword: {
        id: 'smokescreen',
        name: '연막',
        type: 'sword',
        description: '공격을 회피하는데 성공하면 기교 +1.',
        effect: { trigger: 'evadeSuccess', action: 'addToken', token: 'finesse', value: 1 },
      },
      gun: {
        id: 'gap',
        name: '틈새',
        type: 'gun',
        description: '공격을 회피하는데 성공하면 1회 사격합니다.',
        effect: { trigger: 'evadeSuccess', action: 'shoot', value: 1 },
      },
    },
    description: '회피 성공 시 추가 효과',
  },
  constancy: {
    id: 'constancy',
    name: '불변',
    tier: 3,
    nodeType: 'ethos',
    parentNodes: ['ignite'],
    childNodes: ['ironman', 'glacier'],
    requiredTrait: 'steadfast',
    requiredTraitCount: 2,
    choices: {
      sword: {
        id: 'warmup',
        name: '몸풀기',
        type: 'sword',
        description: '전투 시작 시 기교 1 획득.',
        effect: { trigger: 'battleStart', action: 'addToken', token: 'finesse', value: 1 },
      },
      gun: {
        id: 'deepBreath',
        name: '심호흡',
        type: 'gun',
        description: '전투 시작 시 집중 1 획득.',
        effect: { trigger: 'battleStart', action: 'addToken', token: 'focus', value: 1 },
      },
    },
    description: '전투 시작 시 토큰 획득',
  },
  competence: {
    id: 'competence',
    name: '유능',
    tier: 3,
    nodeType: 'ethos',
    parentNodes: ['defense'],
    childNodes: ['glacier', 'pride'],
    requiredTrait: 'composure',
    requiredTraitCount: 2,
    choices: {
      sword: {
        id: 'quickHands',
        name: '빠른 손',
        type: 'sword',
        description: '검격 카드의 속도가 1 감소합니다.',
        effect: { trigger: 'swordCard', action: 'speedBonus', value: -1 },
      },
      gun: {
        id: 'modernMag',
        name: '최신 탄창',
        type: 'gun',
        description: '장전한 턴에는 탄걸림이 발생하지 않습니다.',
        effect: { trigger: 'reloadTurn', action: 'preventJam' },
      },
    },
    description: '장전 관련 강화',
  },
  persistence: {
    id: 'persistence',
    name: '끈기',
    tier: 3,
    nodeType: 'ethos',
    parentNodes: ['focus'],
    childNodes: ['pride', 'diligence'],
    requiredTrait: 'vitality',
    requiredTraitCount: 2,
    choices: {
      sword: {
        id: 'archaeology',
        name: '고고학',
        type: 'sword',
        description: '상징 갯수만큼 추가 피해.',
        effect: { trigger: 'attack', action: 'damageBonus', source: 'symbol' },
      },
      gun: {
        id: 'sniper',
        name: '저격',
        type: 'gun',
        description: '총격 카드의 사거리가 1 증가합니다.',
        effect: { trigger: 'gunAttack', action: 'rangeBonus', value: 1 },
      },
    },
    description: '피해 또는 사거리 강화',
  },
  endurance: {
    id: 'endurance',
    name: '인내',
    tier: 3,
    nodeType: 'ethos',
    parentNodes: ['chain'],
    childNodes: ['diligence', 'expertise'],
    requiredTrait: 'passion',
    requiredTraitCount: 2,
    choices: {
      sword: {
        id: 'compression',
        name: '압축',
        type: 'sword',
        description: '연계의 단축 효과를 5로 강화합니다.',
        effect: { trigger: 'chain', action: 'enhanceShorten', value: 5 },
      },
      gun: {
        id: 'conviction',
        name: '회심',
        type: 'gun',
        description: '총격 치명타 피해가 50% 증가합니다.',
        effect: { trigger: 'gunCrit', action: 'damageBonus', percent: 50 },
      },
    },
    description: '연계 효과 강화',
  },
  confirmation: {
    id: 'confirmation',
    name: '확인',
    tier: 3,
    nodeType: 'ethos',
    parentNodes: ['recovery'],
    childNodes: ['expertise'],
    requiredTrait: 'thorough',
    requiredTraitCount: 2,
    choices: {
      sword: {
        id: 'gambler',
        name: '도박꾼',
        type: 'sword',
        description: '연계 성공 시 다음 연계 피해 +10% (누적).',
        effect: { trigger: 'chainSuccess', action: 'stackChainBonus', percent: 10 },
      },
      gun: {
        id: 'jackpot',
        name: '잭팟',
        type: 'gun',
        description: '총격이 치명타가 아니면 다음 치명타 확률 +5% (누적).',
        effect: { trigger: 'gunNonCrit', action: 'stackCritBonus', percent: 5 },
      },
    },
    description: '확률 누적 보너스',
  },
};

// ========================================
// 4단계 파토스 (하위 2노드 필요, 검 vs 총 선택)
// ========================================
const TIER4_NODES: Record<string, UnifiedNode> = {
  ironman: {
    id: 'ironman',
    name: '철인',
    tier: 4,
    nodeType: 'pathos',
    parentNodes: ['advance', 'constancy'],
    childNodes: ['emperor'],
    choices: {
      sword: {
        id: 'wayOfSword',
        name: '검의 길',
        type: 'sword',
        description: '이번 턴 모든 검격카드를 교차로 판정합니다.',
        effect: { action: 'forceCross', duration: 'turn' },
        cooldown: 4,
      },
      gun: {
        id: 'wanted',
        name: '원티드',
        type: 'gun',
        description: '이번 턴 총격 카드는 회피를 무시합니다.',
        effect: { action: 'ignoreEvasion', duration: 'turn', percent: 100 },
        cooldown: 4,
      },
    },
    description: '교차 또는 명중 강화',
  },
  glacier: {
    id: 'glacier',
    name: '빙하',
    tier: 4,
    nodeType: 'pathos',
    parentNodes: ['constancy', 'competence'],
    childNodes: ['emperor', 'grit'],
    choices: {
      sword: {
        id: 'lightSword',
        name: '빛의 검',
        type: 'sword',
        description: '다음 검격 카드의 속도를 1로 합니다.',
        effect: { action: 'setSpeed', value: 1, duration: 'next' },
        cooldown: 4,
      },
      gun: {
        id: 'barrage',
        name: '난사',
        type: 'gun',
        description: '다음 총격 카드가 모든 적에게 피해를 가합니다.',
        effect: { action: 'aoe', target: 'all', duration: 'next' },
        cooldown: 5,
      },
    },
    description: '속도 또는 범위 강화',
  },
  pride: {
    id: 'pride',
    name: '긍지',
    tier: 4,
    nodeType: 'pathos',
    parentNodes: ['competence', 'persistence'],
    childNodes: ['grit', 'respect'],
    choices: {
      sword: {
        id: 'swordDance',
        name: '검무',
        type: 'sword',
        description: '이번 턴 연계-후속-마무리 특성 효과가 50% 증가합니다.',
        effect: { action: 'chainBonus', percent: 50, duration: 'turn' },
        cooldown: 3,
      },
      gun: {
        id: 'gunSword',
        name: '검총술',
        type: 'gun',
        description: '이번 턴 총격 카드를 쓸때마다 추가로 타격을 가합니다.',
        effect: { action: 'gunToMelee', duration: 'turn' },
        cooldown: 4,
      },
    },
    description: '연계 또는 복합 공격',
  },
  diligence: {
    id: 'diligence',
    name: '성실',
    tier: 4,
    nodeType: 'pathos',
    parentNodes: ['persistence', 'endurance'],
    childNodes: ['respect', 'dignity'],
    choices: {
      sword: {
        id: 'swordGun',
        name: '총검술',
        type: 'sword',
        description: '이번 턴 검격 카드를 쓸때마다 추가로 사격을 가합니다.',
        effect: { action: 'swordToGun', duration: 'turn' },
        cooldown: 4,
      },
      gun: {
        id: 'sharpBlade',
        name: '정밀 사격',
        type: 'gun',
        description: '다음 총격 카드는 치명타를 입힙니다.',
        effect: { action: 'guaranteeCrit', duration: 'next' },
        cooldown: 3,
      },
    },
    description: '복합 공격 또는 치명타',
  },
  expertise: {
    id: 'expertise',
    name: '전문',
    tier: 4,
    nodeType: 'pathos',
    parentNodes: ['endurance', 'confirmation'],
    childNodes: ['dignity'],
    choices: {
      sword: {
        id: 'creativity',
        name: '영감',
        type: 'sword',
        description: '창조할 때 기교 1 획득.',
        effect: { action: 'createFinesse', value: 1 },
      },
      gun: {
        id: 'logicGun',
        name: '논리란 총에서',
        type: 'gun',
        description: '창조할 때마다 소이탄 또는 철갑탄을 장전합니다.',
        effect: { action: 'createLoadAmmo', token: 'random' },
      },
    },
    description: '창조 강화',
  },
};

// ========================================
// 5단계 에토스 (하위 2노드 필요, 검 vs 총 선택)
// ========================================
const TIER5_NODES: Record<string, UnifiedNode> = {
  emperor: {
    id: 'emperor',
    name: '제왕',
    tier: 5,
    nodeType: 'ethos',
    parentNodes: ['ironman', 'glacier'],
    childNodes: ['ultimate'],
    choices: {
      sword: {
        id: 'extreme',
        name: '극한',
        type: 'sword',
        description: '기교를 3회 획득할때마다 1회 추가 획득합니다.',
        effect: { trigger: 'finesseGain3', action: 'addToken', token: 'finesse', value: 1 },
      },
      gun: {
        id: 'marksman',
        name: '명사수',
        type: 'gun',
        description: '총격은 회피를 25% 만큼 무시합니다.',
        effect: { trigger: 'gunAttack', action: 'ignoreEvasion', percent: 25 },
      },
    },
    description: '기교 또는 명중 강화',
  },
  grit: {
    id: 'grit',
    name: '근성',
    tier: 5,
    nodeType: 'ethos',
    parentNodes: ['glacier', 'pride'],
    childNodes: ['ultimate', 'transcend'],
    choices: {
      sword: {
        id: 'master',
        name: '달인',
        type: 'sword',
        description: '유령카드를 창조카드와 동일한 강화 형태로 창조합니다.',
        effect: { trigger: 'ghostCreate', action: 'inheritEnhancement' },
      },
      gun: {
        id: 'shadow',
        name: '흑막',
        type: 'gun',
        description: '유령-사격은 더 이상 룰렛을 증가시키지 않습니다.',
        effect: { trigger: 'ghostShoot', action: 'preventRouletteIncrease' },
      },
    },
    description: '유령 카드 강화',
  },
  respect: {
    id: 'respect',
    name: '존경',
    tier: 5,
    nodeType: 'ethos',
    parentNodes: ['pride', 'diligence'],
    childNodes: ['transcend', 'fusion'],
    choices: {
      sword: {
        id: 'swordArt',
        name: '검예',
        type: 'sword',
        description: '보유한 기교만큼 검격 카드의 피해량이 증가합니다.',
        effect: { trigger: 'swordAttack', action: 'damageBonus', source: 'finesse' },
      },
      gun: {
        id: 'flame',
        name: '불꽃',
        type: 'gun',
        description: '총격은 치명타시 화상 토큰을 더합니다.',
        effect: { trigger: 'gunCrit', action: 'addToken', token: 'burn', value: 1 },
      },
    },
    description: '피해량 또는 상태이상 강화',
  },
  dignity: {
    id: 'dignity',
    name: '위엄',
    tier: 5,
    nodeType: 'ethos',
    parentNodes: ['diligence', 'expertise'],
    childNodes: ['fusion'],
    choices: {
      sword: {
        id: 'riposte',
        name: '응수',
        type: 'sword',
        description: '피해를 받으면 30% 확률로 타격 카드로 반격.',
        effect: { trigger: 'takeDamage', action: 'counterAttack', percent: 30 },
      },
      gun: {
        id: 'neutralize',
        name: '무력화',
        type: 'gun',
        description: '총격은 교차시 상대에게 무딤 1회.',
        effect: { trigger: 'gunCross', action: 'addToken', token: 'dull', value: 1 },
      },
    },
    description: '반격 또는 디버프 강화',
  },
};

// ========================================
// 6단계 파토스 (하위 2노드 필요, 검 vs 총 선택)
// ========================================
const TIER6_NODES: Record<string, UnifiedNode> = {
  ultimate: {
    id: 'ultimate',
    name: '극한',
    tier: 6,
    nodeType: 'pathos',
    parentNodes: ['emperor', 'grit'],
    childNodes: [],
    choices: {
      sword: {
        id: 'trance',
        name: '무아지경',
        type: 'sword',
        description: '이번 턴 기교 소모 없음, 모든 검술 특성 효과 +50%.',
        effect: { action: 'noFineseCost', percent: 50, duration: 'turn' },
        cooldown: 5,
      },
      gun: {
        id: 'barricade',
        name: '탄막',
        type: 'gun',
        description: '이번 턴 탄환 소모 없음 (룰렛은 정상 작동).',
        effect: { action: 'noAmmoCost', duration: 'turn' },
        cooldown: 5,
      },
    },
    description: '자원 소모 없는 공격',
  },
  transcend: {
    id: 'transcend',
    name: '초월',
    tier: 6,
    nodeType: 'pathos',
    parentNodes: ['grit', 'respect'],
    childNodes: [],
    choices: {
      sword: {
        id: 'swordKing',
        name: '검왕',
        type: 'sword',
        description: '다음 2회 검격이 모두 교차 판정.',
        effect: { action: 'guaranteeCross', value: 2, duration: 'stacks' },
        cooldown: 4,
      },
      gun: {
        id: 'sniperKing',
        name: '저격왕',
        type: 'gun',
        description: '다음 2회 총격이 모두 치명타.',
        effect: { action: 'guaranteeCrit', value: 2, duration: 'stacks' },
        cooldown: 4,
      },
    },
    description: '확정 교차/치명타',
  },
  fusion: {
    id: 'fusion',
    name: '융합',
    tier: 6,
    nodeType: 'pathos',
    parentNodes: ['respect', 'dignity'],
    childNodes: [],
    choices: {
      sword: {
        id: 'swordAura',
        name: '검기탄',
        type: 'sword',
        description: '다음 검격이 사거리 무한 + 회피 무시.',
        effect: { action: 'rangedSword', duration: 'next' },
        cooldown: 5,
      },
      gun: {
        id: 'bulletBlade',
        name: '탄검',
        type: 'gun',
        description: '다음 총격이 방어력 100% 관통 + 연계 트리거.',
        effect: { action: 'piercingChain', duration: 'next' },
        cooldown: 5,
      },
    },
    description: '검/총 크로스오버',
  },
};

// ========================================
// 통합 노드 데이터
// ========================================
export const UNIFIED_NODES: Record<string, UnifiedNode> = {
  ...TIER1_NODES,
  ...TIER2_NODES,
  ...TIER3_NODES,
  ...TIER4_NODES,
  ...TIER5_NODES,
  ...TIER6_NODES,
};

// ========================================
// 유틸리티 함수
// ========================================

/**
 * 티어별 노드 목록 반환
 */
export function getNodesForTier(tier: number): UnifiedNode[] {
  return Object.values(UNIFIED_NODES).filter(n => n.tier === tier);
}

/**
 * 노드 타입별 목록 반환
 */
export function getNodesByType(nodeType: NodeType): UnifiedNode[] {
  return Object.values(UNIFIED_NODES).filter(n => n.nodeType === nodeType);
}

/**
 * 노드 ID로 노드 정보 조회
 */
export function getNode(nodeId: string): UnifiedNode | null {
  return UNIFIED_NODES[nodeId] || null;
}

/**
 * 노드의 선택지 조회 (Ethos | Pathos 형식 반환)
 */
export function getNodeChoices(nodeId: string): [ChoiceItem, ChoiceItem] | null {
  const node = UNIFIED_NODES[nodeId];
  if (!node || !node.choices) return null;
  return [node.choices.sword, node.choices.gun];
}

/**
 * 노드 해금 가능 여부 확인
 */
export function canUnlockNode(
  nodeId: string,
  traitCounts: Record<string, number>,
  unlockedNodes: string[]
): { canUnlock: boolean; reason?: string } {
  const node = UNIFIED_NODES[nodeId];
  if (!node) return { canUnlock: false, reason: '알 수 없는 노드' };

  // 티어 1: 개성 1회 필요
  if (node.tier === 1) {
    const count = traitCounts[node.requiredTrait!] || 0;
    if (count >= 1) return { canUnlock: true };
    return { canUnlock: false, reason: `개성 '${getTraitName(node.requiredTrait!)}' 1회 필요` };
  }

  // 티어 2-3: 개성 횟수 확인
  if (node.tier <= 3 && node.requiredTrait) {
    const count = traitCounts[node.requiredTrait] || 0;
    if (count >= (node.requiredTraitCount || 1)) {
      return { canUnlock: true };
    }
    return {
      canUnlock: false,
      reason: `개성 '${getTraitName(node.requiredTrait)}' ${node.requiredTraitCount}회 필요 (현재 ${count}회)`,
    };
  }

  // 티어 4+: 상위 노드 2개 해금 필요
  if (node.parentNodes.length === 2) {
    const [req1, req2] = node.parentNodes;
    const hasReq1 = unlockedNodes.includes(req1);
    const hasReq2 = unlockedNodes.includes(req2);

    if (hasReq1 && hasReq2) return { canUnlock: true };

    const missing: string[] = [];
    if (!hasReq1) missing.push(getNodeName(req1));
    if (!hasReq2) missing.push(getNodeName(req2));

    return { canUnlock: false, reason: `필요: ${missing.join(', ')}` };
  }

  return { canUnlock: true };
}

/**
 * 개성 한글명 반환
 */
function getTraitName(traitId: string): string {
  const names: Record<string, string> = {
    bravery: '용맹함',
    steadfast: '굳건함',
    composure: '냉철함',
    vitality: '활력적',
    passion: '열정적',
    thorough: '철저함',
  };
  return names[traitId] || traitId;
}

/**
 * 노드 한글명 반환
 */
function getNodeName(nodeId: string): string {
  const node = UNIFIED_NODES[nodeId];
  return node?.name || nodeId;
}

/**
 * 티어별 노드 순서 (UI 렌더링용)
 */
export const NODE_ORDER = {
  tier1: ['bravery', 'steadfast', 'composure', 'vitality', 'passion', 'thorough'],
  tier2: ['pierce', 'ignite', 'defense', 'focus', 'chain', 'recovery'],
  tier3: ['advance', 'constancy', 'competence', 'persistence', 'endurance', 'confirmation'],
  tier4: ['ironman', 'glacier', 'pride', 'diligence', 'expertise'],
  tier5: ['emperor', 'grit', 'respect', 'dignity'],
  tier6: ['ultimate', 'transcend', 'fusion'],
};

/**
 * 노드 간 연결 목록 생성 (SVG 연결선용)
 */
export function generateConnections(): Array<{ from: string; to: string; tier: number }> {
  const connections: Array<{ from: string; to: string; tier: number }> = [];

  Object.values(UNIFIED_NODES).forEach(node => {
    node.parentNodes.forEach(parentId => {
      connections.push({
        from: parentId,
        to: node.id,
        tier: node.tier,
      });
    });
  });

  return connections;
}

/**
 * 개성 획득 시 자동 해금되는 노드 반환 (1단계만)
 */
export function getAutoUnlockNodes(
  traitId: string,
  newCount: number,
  currentUnlockedNodes: string[]
): string[] {
  const toUnlock: string[] = [];

  // 1단계 에토스만 자동 해금
  const tier1Node = UNIFIED_NODES[traitId];
  if (tier1Node && tier1Node.tier === 1 && newCount >= 1) {
    if (!currentUnlockedNodes.includes(traitId)) {
      toUnlock.push(traitId);
    }
  }

  return toUnlock;
}
