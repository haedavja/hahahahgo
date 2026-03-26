/**
 * @file pathosData.ts
 * @description 파토스 (Pathos) - 액티브 스킬 정의
 *
 * 피라미드 구조:
 * - 2단계: 파토스 노드 (2개 선택지 중 1개 선택, 검 vs 총)
 * - 4단계: 상위 파토스 노드 (2개 선택지 중 1개 선택, 검 vs 총)
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
// 2단계 - 파토스 노드 선택지 (검 vs 총)
// ========================================
export const TIER2_PATHOS: Record<string, Pathos> = {
  // 관통 노드: 교차(검) vs 철갑탄(총)
  cross: {
    id: 'cross',
    name: '교차',
    type: 'sword',
    description: '이번 턴 모든 검격 카드는 교차시 방어력을 4 얻습니다.',
    effect: { action: 'onCrossBlock', value: 4, duration: 'turn' },
    pyramidLevel: 2,
    nodeId: 'pierce',
  },
  armorPiercing: {
    id: 'armorPiercing',
    name: '철갑탄',
    type: 'gun',
    description: '철갑탄 토큰 1발 획득합니다.',
    effect: { action: 'addToken', token: 'armorPiercing', value: 1 },
    cooldown: 2,
    pyramidLevel: 2,
    nodeId: 'pierce',
  },

  // 점화 노드: 춤사위(검) vs 소이탄(총)
  dance: {
    id: 'dance',
    name: '춤사위',
    type: 'sword',
    description: '연계 이후 후속 혹은 마무리 특성을 쓰면 회피 1회 획득.',
    effect: { action: 'chainEvade', value: 1 },
    pyramidLevel: 2,
    nodeId: 'ignite',
  },
  incendiary: {
    id: 'incendiary',
    name: '소이탄',
    type: 'gun',
    description: '소이탄 토큰 1발 획득합니다.',
    effect: { action: 'addToken', token: 'incendiary', value: 1 },
    cooldown: 2,
    pyramidLevel: 2,
    nodeId: 'ignite',
  },

  // 방어 노드: 에페(검) vs 엄호(총)
  epee: {
    id: 'epee',
    name: '에페',
    type: 'sword',
    description: '검격 카드를 쓸때마다 방어력 5 획득 합니다.',
    effect: { action: 'onSwordBlock', value: 5, duration: 'turn' },
    pyramidLevel: 2,
    nodeId: 'defense',
  },
  cover: {
    id: 'cover',
    name: '엄호',
    type: 'gun',
    description: '총격 카드를 쓸때마다 방어력 3 획득합니다.',
    effect: { action: 'onGunBlock', value: 3, duration: 'turn' },
    pyramidLevel: 2,
    nodeId: 'defense',
  },

  // 집중 노드: 일섬(검) vs 조준(총)
  flash: {
    id: 'flash',
    name: '일섬',
    type: 'sword',
    description: '다음 검격 카드의 피해량이 5 증가합니다.',
    effect: { action: 'nextSwordDamage', value: 5, duration: 'next' },
    cooldown: 2,
    pyramidLevel: 2,
    nodeId: 'focus',
  },
  aim: {
    id: 'aim',
    name: '조준',
    type: 'gun',
    description: '다음 총격 카드가 반드시 치명타로 적중합니다.',
    effect: { action: 'nextGunCrit', duration: 'next' },
    cooldown: 3,
    pyramidLevel: 2,
    nodeId: 'focus',
  },

  // 연쇄 노드: 연환(검) vs 연발(총)
  chainSlash: {
    id: 'chainSlash',
    name: '연환',
    type: 'sword',
    description: '이번 턴 연계 성공 시 카드 1장을 드로우합니다.',
    effect: { action: 'chainDraw', value: 1, duration: 'turn' },
    pyramidLevel: 2,
    nodeId: 'chain',
  },
  burst: {
    id: 'burst',
    name: '연발',
    type: 'gun',
    description: '이번 턴 연계 성공 시 총알 1발을 자동 장전합니다.',
    effect: { action: 'chainReload', value: 1, duration: 'turn' },
    pyramidLevel: 2,
    nodeId: 'chain',
  },

  // 회복 노드: 참선(검) vs 정비(총)
  meditation: {
    id: 'meditation',
    name: '참선',
    type: 'sword',
    description: '이번 턴 피해를 입지 않으면 턴 종료 시 체력 5 회복.',
    effect: { action: 'noDamageHeal', value: 5, duration: 'turn' },
    pyramidLevel: 2,
    nodeId: 'recovery',
  },
  maintenance: {
    id: 'maintenance',
    name: '정비',
    type: 'gun',
    description: '장전된 총알 1발당 체력 1 회복합니다. (최대 3)',
    effect: { action: 'ammoHeal', value: 1, target: 'self' },
    cooldown: 2,
    pyramidLevel: 2,
    nodeId: 'recovery',
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
    name: '정밀 사격',
    type: 'gun',
    description: '다음 총격 카드는 치명타를 입힙니다.',
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
    name: '영감',
    type: 'sword',
    description: '창조할 때 기교 1 획득.',
    effect: { action: 'createFinesse', value: 1 },
    pyramidLevel: 4,
    nodeId: 'expertise',
  },
};

// ========================================
// 6단계 - 상위 파토스 선택지
// ========================================
export const TIER6_PATHOS: Record<string, Pathos> = {
  // 극한 노드
  trance: {
    id: 'trance',
    name: '무아지경',
    type: 'sword',
    description: '이번 턴 기교 소모 없음, 모든 검술 특성 효과 +50%.',
    effect: { action: 'noFineseCost', percent: 50, duration: 'turn' },
    cooldown: 5,
    pyramidLevel: 6,
    nodeId: 'ultimate',
  },
  barricade: {
    id: 'barricade',
    name: '탄막',
    type: 'gun',
    description: '이번 턴 탄환 소모 없음 (룰렛은 정상 작동).',
    effect: { action: 'noAmmoCost', duration: 'turn' },
    cooldown: 5,
    pyramidLevel: 6,
    nodeId: 'ultimate',
  },

  // 초월 노드
  swordKing: {
    id: 'swordKing',
    name: '검왕',
    type: 'sword',
    description: '다음 2회 검격이 모두 교차 판정.',
    effect: { action: 'guaranteeCross', value: 2, duration: 'stacks' },
    cooldown: 4,
    pyramidLevel: 6,
    nodeId: 'transcend',
  },
  sniperKing: {
    id: 'sniperKing',
    name: '저격왕',
    type: 'gun',
    description: '다음 2회 총격이 모두 치명타.',
    effect: { action: 'guaranteeCrit', value: 2, duration: 'stacks' },
    cooldown: 4,
    pyramidLevel: 6,
    nodeId: 'transcend',
  },

  // 융합 노드
  swordAura: {
    id: 'swordAura',
    name: '검기탄',
    type: 'sword',
    description: '다음 검격이 사거리 무한 + 회피 무시.',
    effect: { action: 'rangedSword', duration: 'next' },
    cooldown: 5,
    pyramidLevel: 6,
    nodeId: 'fusion',
  },
  bulletBlade: {
    id: 'bulletBlade',
    name: '탄검',
    type: 'gun',
    description: '다음 총격이 방어력 100% 관통 + 연계 트리거.',
    effect: { action: 'piercingChain', duration: 'next' },
    cooldown: 5,
    pyramidLevel: 6,
    nodeId: 'fusion',
  },
};

// ========================================
// 파토스 노드 정의
// ========================================
export const PATHOS_NODES: Record<string, PathosNode> = {
  // 2단계 노드 (검 vs 총)
  pierce: {
    id: 'pierce',
    name: '관통',
    tier: 2,
    choices: ['cross', 'armorPiercing'],
    description: '방어 강화 또는 관통탄',
  },
  ignite: {
    id: 'ignite',
    name: '점화',
    tier: 2,
    choices: ['dance', 'incendiary'],
    description: '회피 획득 또는 화염탄',
  },
  defense: {
    id: 'defense',
    name: '방어',
    tier: 2,
    choices: ['epee', 'cover'],
    description: '검격 방어 또는 총격 방어',
  },
  focus: {
    id: 'focus',
    name: '집중',
    tier: 2,
    choices: ['flash', 'aim'],
    description: '다음 공격 강화',
  },
  chain: {
    id: 'chain',
    name: '연쇄',
    tier: 2,
    choices: ['chainSlash', 'burst'],
    description: '연계 시 보너스',
  },
  recovery: {
    id: 'recovery',
    name: '회복',
    tier: 2,
    choices: ['meditation', 'maintenance'],
    description: '체력 회복',
  },

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
    choices: ['creativity', 'logicGun'],
    description: '창조 강화',
  },

  // 6단계 노드
  ultimate: {
    id: 'ultimate',
    name: '극한',
    tier: 6,
    choices: ['trance', 'barricade'],
    description: '자원 소모 없는 공격',
  },
  transcend: {
    id: 'transcend',
    name: '초월',
    tier: 6,
    choices: ['swordKing', 'sniperKing'],
    description: '확정 교차/치명타',
  },
  fusion: {
    id: 'fusion',
    name: '융합',
    tier: 6,
    choices: ['swordAura', 'bulletBlade'],
    description: '검/총 크로스오버',
  },
};

// 전체 파토스 (모든 티어 통합)
export const PATHOS: Record<string, Pathos> = {
  ...TIER2_PATHOS,
  ...TIER4_PATHOS,
  ...TIER6_PATHOS,
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

// 장착 슬롯 수
export const MAX_EQUIPPED_PATHOS = 3;
