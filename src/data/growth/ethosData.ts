/**
 * @file ethosData.ts
 * @description 에토스 (Ethos) - 패시브 스킬 정의
 *
 * 피라미드 구조:
 * - 1단계: 기초 에토스 (선택지 없음, 바로 획득)
 * - 3단계: 에토스 노드 (2개 선택지 중 1개 선택)
 * - 5단계: 상위 에토스 노드 (2개 선택지 중 1개 선택)
 */

export type EthosType = 'gun' | 'sword' | 'common';

export interface EthosEffect {
  trigger: string;       // 발동 조건
  action: string;        // 효과 타입
  value?: number;        // 수치
  token?: string;        // 토큰 ID (addToken일 경우)
  source?: string;       // 참조 소스 (damageBonus일 경우)
  percent?: number;      // 퍼센트 값
}

export interface Ethos {
  id: string;
  name: string;
  type: EthosType;
  description: string;
  effect: EthosEffect;
  pyramidLevel: number;  // 해금 가능 피라미드 레벨
  nodeId?: string;       // 소속 노드 ID (선택지인 경우)
}

// 에토스 노드 (2개 선택지를 가진 상위 구조)
export interface EthosNode {
  id: string;
  name: string;
  tier: number;          // 피라미드 단계 (1, 3, 5)
  choices: [string, string]; // 두 개의 에토스 ID
  description: string;
}

// ========================================
// 1단계 - 기초 에토스 (선택지 없음)
// ========================================
export const BASE_ETHOS: Record<string, Ethos> = {
  bravery: {
    id: 'bravery',
    name: '용맹함',
    type: 'sword',
    description: '전투 시작 시 공격력 +1',
    effect: { trigger: 'battleStart', action: 'attackBonus', value: 1 },
    pyramidLevel: 1,
  },
  steadfast: {
    id: 'steadfast',
    name: '굳건함',
    type: 'common',
    description: '최대 체력 +5',
    effect: { trigger: 'passive', action: 'maxHpBonus', value: 5 },
    pyramidLevel: 1,
  },
  composure: {
    id: 'composure',
    name: '냉철함',
    type: 'gun',
    description: '치명타 확률 +5%',
    effect: { trigger: 'passive', action: 'critBonus', percent: 5 },
    pyramidLevel: 1,
  },
  vitality: {
    id: 'vitality',
    name: '활력적',
    type: 'sword',
    description: '턴 시작 시 10% 확률로 기교 획득',
    effect: { trigger: 'turnStart', action: 'chanceToken', token: 'finesse', percent: 10 },
    pyramidLevel: 1,
  },
  passion: {
    id: 'passion',
    name: '열정적',
    type: 'common',
    description: '연계 시 피해량 +2',
    effect: { trigger: 'chain', action: 'damageBonus', value: 2 },
    pyramidLevel: 1,
  },
  thorough: {
    id: 'thorough',
    name: '철저함',
    type: 'gun',
    description: '장전 시 탄약 +1',
    effect: { trigger: 'reload', action: 'ammoBonus', value: 1 },
    pyramidLevel: 1,
  },
};

// ========================================
// 3단계 - 에토스 선택지
// ========================================
export const TIER3_ETHOS: Record<string, Ethos> = {
  // 전진 노드
  gap: {
    id: 'gap',
    name: '틈새',
    type: 'gun',
    description: '공격을 회피하는데 성공하면 1회 사격합니다.',
    effect: { trigger: 'evadeSuccess', action: 'shoot', value: 1 },
    pyramidLevel: 3,
    nodeId: 'advance',
  },
  smokescreen: {
    id: 'smokescreen',
    name: '연막',
    type: 'sword',
    description: '공격을 회피하는데 성공하면 기교 +1.',
    effect: { trigger: 'evadeSuccess', action: 'addToken', token: 'finesse', value: 1 },
    pyramidLevel: 3,
    nodeId: 'advance',
  },

  // 불변 노드
  warmup: {
    id: 'warmup',
    name: '몸풀기',
    type: 'sword',
    description: '전투 시작 시 기교 1 획득.',
    effect: { trigger: 'battleStart', action: 'addToken', token: 'finesse', value: 1 },
    pyramidLevel: 3,
    nodeId: 'constancy',
  },
  deepBreath: {
    id: 'deepBreath',
    name: '심호흡',
    type: 'common',
    description: '전투 시작 시 집중 1 획득.',
    effect: { trigger: 'battleStart', action: 'addToken', token: 'focus', value: 1 },
    pyramidLevel: 3,
    nodeId: 'constancy',
  },

  // 유능 노드
  modernMag: {
    id: 'modernMag',
    name: '최신 탄창',
    type: 'gun',
    description: '장전한 턴에는 탄걸림이 발생하지 않습니다.',
    effect: { trigger: 'reloadTurn', action: 'preventJam' },
    pyramidLevel: 3,
    nodeId: 'competence',
  },
  quickHands: {
    id: 'quickHands',
    name: '빠른 손',
    type: 'gun',
    description: '장전 카드의 속도가 2 감소합니다.',
    effect: { trigger: 'reloadCard', action: 'speedBonus', value: -2 },
    pyramidLevel: 3,
    nodeId: 'competence',
  },

  // 끈기 노드
  archaeology: {
    id: 'archaeology',
    name: '고고학',
    type: 'sword',
    description: '상징 갯수만큼 추가 피해.',
    effect: { trigger: 'attack', action: 'damageBonus', source: 'symbol' },
    pyramidLevel: 3,
    nodeId: 'persistence',
  },
  sniper: {
    id: 'sniper',
    name: '저격',
    type: 'gun',
    description: '총격 카드의 사거리가 1 증가합니다.',
    effect: { trigger: 'gunAttack', action: 'rangeBonus', value: 1 },
    pyramidLevel: 3,
    nodeId: 'persistence',
  },

  // 인내 노드
  compression: {
    id: 'compression',
    name: '압축',
    type: 'sword',
    description: '연계의 단축 효과를 5로 강화합니다.',
    effect: { trigger: 'chain', action: 'enhanceShorten', value: 5 },
    pyramidLevel: 3,
    nodeId: 'endurance',
  },
  conviction: {
    id: 'conviction',
    name: '회심',
    type: 'sword',
    description: '연계 마무리 피해가 50% 증가합니다.',
    effect: { trigger: 'chainFinish', action: 'damageBonus', percent: 50 },
    pyramidLevel: 3,
    nodeId: 'endurance',
  },

  // 확인 노드
  jackpot: {
    id: 'jackpot',
    name: '잭팟',
    type: 'gun',
    description: '총격이 치명타가 아니면 다음 치명타 확률 +5% (누적).',
    effect: { trigger: 'gunNonCrit', action: 'stackCritBonus', percent: 5 },
    pyramidLevel: 3,
    nodeId: 'confirmation',
  },
  gambler: {
    id: 'gambler',
    name: '도박꾼',
    type: 'gun',
    description: '룰렛 성공 시 다음 룰렛 성공 확률 +10%.',
    effect: { trigger: 'rouletteSuccess', action: 'stackRouletteBonus', percent: 10 },
    pyramidLevel: 3,
    nodeId: 'confirmation',
  },
};

// ========================================
// 5단계 - 상위 에토스 선택지
// ========================================
export const TIER5_ETHOS: Record<string, Ethos> = {
  // 제왕 노드
  extreme: {
    id: 'extreme',
    name: '극한',
    type: 'sword',
    description: '기교를 3회 획득할때마다 1회 추가 획득합니다.',
    effect: { trigger: 'finesseGain3', action: 'addToken', token: 'finesse', value: 1 },
    pyramidLevel: 5,
    nodeId: 'emperor',
  },
  marksman: {
    id: 'marksman',
    name: '명사수',
    type: 'gun',
    description: '총격은 회피를 25% 만큼 무시합니다.',
    effect: { trigger: 'gunAttack', action: 'ignoreEvasion', percent: 25 },
    pyramidLevel: 5,
    nodeId: 'emperor',
  },

  // 근성 노드
  master: {
    id: 'master',
    name: '달인',
    type: 'sword',
    description: '유령카드를 창조카드와 동일한 강화 형태로 창조합니다.',
    effect: { trigger: 'ghostCreate', action: 'inheritEnhancement' },
    pyramidLevel: 5,
    nodeId: 'grit',
  },
  shadow: {
    id: 'shadow',
    name: '흑막',
    type: 'gun',
    description: '유령-사격은 더 이상 룰렛을 증가시키지 않습니다.',
    effect: { trigger: 'ghostShoot', action: 'preventRouletteIncrease' },
    pyramidLevel: 5,
    nodeId: 'grit',
  },

  // 존경 노드
  swordArt: {
    id: 'swordArt',
    name: '검예',
    type: 'sword',
    description: '보유한 기교만큼 검격 카드의 피해량이 증가합니다.',
    effect: { trigger: 'swordAttack', action: 'damageBonus', source: 'finesse' },
    pyramidLevel: 5,
    nodeId: 'respect',
  },
  flame: {
    id: 'flame',
    name: '불꽃',
    type: 'gun',
    description: '총격은 치명타시 화상 토큰을 더합니다.',
    effect: { trigger: 'gunCrit', action: 'addToken', token: 'burn', value: 1 },
    pyramidLevel: 5,
    nodeId: 'respect',
  },

  // 위엄 노드
  riposte: {
    id: 'riposte',
    name: '응수',
    type: 'sword',
    description: '피해를 받으면 30% 확률로 타격 카드로 반격.',
    effect: { trigger: 'takeDamage', action: 'counterAttack', percent: 30 },
    pyramidLevel: 5,
    nodeId: 'dignity',
  },
  neutralize: {
    id: 'neutralize',
    name: '무력화',
    type: 'gun',
    description: '총격은 교차시 상대에게 무딤 1회.',
    effect: { trigger: 'gunCross', action: 'addToken', token: 'dull', value: 1 },
    pyramidLevel: 5,
    nodeId: 'dignity',
  },
};

// ========================================
// 에토스 노드 정의
// ========================================
export const ETHOS_NODES: Record<string, EthosNode> = {
  // 3단계 노드
  advance: {
    id: 'advance',
    name: '전진',
    tier: 3,
    choices: ['gap', 'smokescreen'],
    description: '회피 성공 시 추가 효과',
  },
  constancy: {
    id: 'constancy',
    name: '불변',
    tier: 3,
    choices: ['warmup', 'deepBreath'],
    description: '전투 시작 시 토큰 획득',
  },
  competence: {
    id: 'competence',
    name: '유능',
    tier: 3,
    choices: ['modernMag', 'quickHands'],
    description: '장전 관련 강화',
  },
  persistence: {
    id: 'persistence',
    name: '끈기',
    tier: 3,
    choices: ['archaeology', 'sniper'],
    description: '피해 또는 사거리 강화',
  },
  endurance: {
    id: 'endurance',
    name: '인내',
    tier: 3,
    choices: ['compression', 'conviction'],
    description: '연계 효과 강화',
  },
  confirmation: {
    id: 'confirmation',
    name: '확인',
    tier: 3,
    choices: ['jackpot', 'gambler'],
    description: '확률 누적 보너스',
  },

  // 5단계 노드
  emperor: {
    id: 'emperor',
    name: '제왕',
    tier: 5,
    choices: ['extreme', 'marksman'],
    description: '기교 또는 명중 강화',
  },
  grit: {
    id: 'grit',
    name: '근성',
    tier: 5,
    choices: ['master', 'shadow'],
    description: '유령 카드 강화',
  },
  respect: {
    id: 'respect',
    name: '존경',
    tier: 5,
    choices: ['swordArt', 'flame'],
    description: '피해량 또는 상태이상 강화',
  },
  dignity: {
    id: 'dignity',
    name: '위엄',
    tier: 5,
    choices: ['riposte', 'neutralize'],
    description: '반격 또는 디버프 강화',
  },
};

// 전체 에토스 (모든 티어 통합)
export const ETHOS: Record<string, Ethos> = {
  ...BASE_ETHOS,
  ...TIER3_ETHOS,
  ...TIER5_ETHOS,
};

// 피라미드 레벨별 해금 가능 에토스 조회
export function getEthosForLevel(level: number, type?: EthosType): Ethos[] {
  return Object.values(ETHOS).filter(e =>
    e.pyramidLevel <= level && (!type || e.type === type)
  );
}

// 노드별 선택지 조회
export function getEthosNodeChoices(nodeId: string): [Ethos, Ethos] | null {
  const node = ETHOS_NODES[nodeId];
  if (!node) return null;

  const choice1 = ETHOS[node.choices[0]];
  const choice2 = ETHOS[node.choices[1]];

  if (!choice1 || !choice2) return null;
  return [choice1, choice2];
}

// 티어별 노드 조회
export function getEthosNodesForTier(tier: number): EthosNode[] {
  return Object.values(ETHOS_NODES).filter(n => n.tier === tier);
}

// 기초 에토스 조회 (1단계)
export function getBaseEthos(): Ethos[] {
  return Object.values(BASE_ETHOS);
}
