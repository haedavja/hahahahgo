/**
 * @file pathosData.ts
 * @description 파토스 (Pathos) - 액티브 스킬 정의
 *
 * 피라미드 구조:
 * - 2단계: 기본 파토스 (선택지 없음, 바로 획득)
 * - 4단계: 파토스 노드 (2개 선택지 중 1개 선택)
 */

export type PathosType = 'gun' | 'sword' | 'common';

export interface PathosEffect {
  action: string;        // 효과 타입
  value?: number;        // 수치
  token?: string;        // 토큰 ID
  duration?: string;     // 지속 시간 ('turn', 'next', 'permanent')
  target?: string;       // 대상 ('self', 'enemy', 'all')
  percent?: number;      // 퍼센트 값
}

export interface Pathos {
  id: string;
  name: string;
  type: PathosType;
  description: string;
  effect: PathosEffect;
  cooldown?: number;     // 쿨다운 (턴)
  pyramidLevel: number;  // 해금 가능 피라미드 레벨
  nodeId?: string;       // 소속 노드 ID (선택지인 경우)
}

// 파토스 노드 (2개 선택지를 가진 상위 구조)
export interface PathosNode {
  id: string;
  name: string;
  tier: number;          // 피라미드 단계 (2, 4)
  choices: [string, string]; // 두 개의 파토스 ID
  description: string;
}

// ========================================
// 2단계 - 기본 파토스 (선택지 없음)
// ========================================
export const BASE_PATHOS: Record<string, Pathos> = {
  armorPiercing: {
    id: 'armorPiercing',
    name: '철갑탄',
    type: 'gun',
    description: '철갑탄 토큰 1발 획득합니다.',
    effect: { action: 'addToken', token: 'armorPiercing', value: 1 },
    cooldown: 2,
    pyramidLevel: 2,
  },
  incendiary: {
    id: 'incendiary',
    name: '소이탄',
    type: 'gun',
    description: '소이탄 토큰 1발 획득합니다.',
    effect: { action: 'addToken', token: 'incendiary', value: 1 },
    cooldown: 2,
    pyramidLevel: 2,
  },
  cross: {
    id: 'cross',
    name: '교차',
    type: 'sword',
    description: '이번 턴 모든 검격 카드는 교차시 방어력을 4 얻습니다.',
    effect: { action: 'onCrossBlock', value: 4, duration: 'turn' },
    pyramidLevel: 2,
  },
  dance: {
    id: 'dance',
    name: '춤사위',
    type: 'sword',
    description: '연계 이후 후속 혹은 마무리 특성을 쓰면 회피 1회 획득.',
    effect: { action: 'chainEvade', value: 1 },
    pyramidLevel: 2,
  },
  epee: {
    id: 'epee',
    name: '에페',
    type: 'sword',
    description: '검격 카드를 쓸때마다 방어력 5 획득 합니다.',
    effect: { action: 'onSwordBlock', value: 5, duration: 'turn' },
    pyramidLevel: 2,
  },
};

// ========================================
// 4단계 - 파토스 선택지
// ========================================
export const TIER4_PATHOS: Record<string, Pathos> = {
  // 철인 노드
  wayOfSword: {
    id: 'wayOfSword',
    name: '검의 길',
    type: 'sword',
    description: '이번 턴 모든 검격카드를 교차로 판정합니다.',
    effect: { action: 'forceCross', duration: 'turn' },
    cooldown: 4,
    pyramidLevel: 4,
    nodeId: 'ironman',
  },
  wanted: {
    id: 'wanted',
    name: '원티드',
    type: 'gun',
    description: '이번 턴 총격 카드는 회피를 무시합니다.',
    effect: { action: 'ignoreEvasion', duration: 'turn', percent: 100 },
    cooldown: 4,
    pyramidLevel: 4,
    nodeId: 'ironman',
  },

  // 빙하 노드
  lightSword: {
    id: 'lightSword',
    name: '빛의 검',
    type: 'sword',
    description: '다음 검격 카드의 속도를 1로 합니다.',
    effect: { action: 'setSpeed', value: 1, duration: 'next' },
    cooldown: 4,
    pyramidLevel: 4,
    nodeId: 'glacier',
  },
  barrage: {
    id: 'barrage',
    name: '난사',
    type: 'gun',
    description: '다음 총격 카드가 모든 적에게 피해를 가합니다.',
    effect: { action: 'aoe', target: 'all', duration: 'next' },
    cooldown: 5,
    pyramidLevel: 4,
    nodeId: 'glacier',
  },

  // 긍지 노드
  swordDance: {
    id: 'swordDance',
    name: '검무',
    type: 'sword',
    description: '이번 턴 연계-후속-마무리 특성 효과가 50% 증가합니다.',
    effect: { action: 'chainBonus', percent: 50, duration: 'turn' },
    cooldown: 3,
    pyramidLevel: 4,
    nodeId: 'pride',
  },
  gunSword: {
    id: 'gunSword',
    name: '검총술',
    type: 'gun',
    description: '이번 턴 총격 카드를 쓸때마다 추가로 타격을 가합니다.',
    effect: { action: 'gunToMelee', duration: 'turn' },
    cooldown: 4,
    pyramidLevel: 4,
    nodeId: 'pride',
  },

  // 성실 노드
  swordGun: {
    id: 'swordGun',
    name: '총검술',
    type: 'sword',
    description: '이번 턴 검격 카드를 쓸때마다 추가로 사격을 가합니다.',
    effect: { action: 'swordToGun', duration: 'turn' },
    cooldown: 4,
    pyramidLevel: 4,
    nodeId: 'diligence',
  },
  sharpBlade: {
    id: 'sharpBlade',
    name: '잘드는 날',
    type: 'sword',
    description: '다음 검격 카드는 치명타를 입힙니다.',
    effect: { action: 'guaranteeCrit', duration: 'next' },
    cooldown: 3,
    pyramidLevel: 4,
    nodeId: 'diligence',
  },

  // 전문 노드
  logicGun: {
    id: 'logicGun',
    name: '논리란 총에서',
    type: 'gun',
    description: '창조할 때마다 소이탄 또는 철갑탄을 장전합니다.',
    effect: { action: 'createLoadAmmo', token: 'random' },
    pyramidLevel: 4,
    nodeId: 'expertise',
  },
  creativity: {
    id: 'creativity',
    name: '천재적 창의성',
    type: 'common',
    description: '창조할 때 선택지가 2개 더 늘어납니다.',
    effect: { action: 'extraCreateChoices', value: 2 },
    pyramidLevel: 4,
    nodeId: 'expertise',
  },
};

// ========================================
// 파토스 노드 정의
// ========================================
export const PATHOS_NODES: Record<string, PathosNode> = {
  // 4단계 노드
  ironman: {
    id: 'ironman',
    name: '철인',
    tier: 4,
    choices: ['wayOfSword', 'wanted'],
    description: '교차 또는 명중 강화',
  },
  glacier: {
    id: 'glacier',
    name: '빙하',
    tier: 4,
    choices: ['lightSword', 'barrage'],
    description: '속도 또는 범위 강화',
  },
  pride: {
    id: 'pride',
    name: '긍지',
    tier: 4,
    choices: ['swordDance', 'gunSword'],
    description: '연계 또는 복합 공격',
  },
  diligence: {
    id: 'diligence',
    name: '성실',
    tier: 4,
    choices: ['swordGun', 'sharpBlade'],
    description: '복합 공격 또는 치명타',
  },
  expertise: {
    id: 'expertise',
    name: '전문',
    tier: 4,
    choices: ['logicGun', 'creativity'],
    description: '창조 강화',
  },
};

// 전체 파토스 (모든 티어 통합)
export const PATHOS: Record<string, Pathos> = {
  ...BASE_PATHOS,
  ...TIER4_PATHOS,
};

// 피라미드 레벨별 해금 가능 파토스 조회
export function getPathosForLevel(level: number, type?: PathosType): Pathos[] {
  return Object.values(PATHOS).filter(p =>
    p.pyramidLevel <= level && (!type || p.type === type)
  );
}

// 노드별 선택지 조회
export function getPathosNodeChoices(nodeId: string): [Pathos, Pathos] | null {
  const node = PATHOS_NODES[nodeId];
  if (!node) return null;

  const choice1 = PATHOS[node.choices[0]];
  const choice2 = PATHOS[node.choices[1]];

  if (!choice1 || !choice2) return null;
  return [choice1, choice2];
}

// 티어별 노드 조회
export function getPathosNodesForTier(tier: number): PathosNode[] {
  return Object.values(PATHOS_NODES).filter(n => n.tier === tier);
}

// 기본 파토스 조회 (2단계)
export function getBasePathos(): Pathos[] {
  return Object.values(BASE_PATHOS);
}

// 장착 슬롯 수
export const MAX_EQUIPPED_PATHOS = 3;
