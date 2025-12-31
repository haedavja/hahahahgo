/**
 * @file ethosData.ts
 * @description 에토스 (Ethos) - 패시브 스킬 정의
 *
 * 피라미드 홀수 단계에서 해금 (1, 3, 5...)
 * 해금 후 상시 적용
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
}

// 총기 계열 에토스
export const GUN_ETHOS: Record<string, Ethos> = {
  flame: {
    id: 'flame',
    name: '불꽃',
    type: 'gun',
    description: '총격은 치명타시 화상 토큰을 더합니다.',
    effect: { trigger: 'gunCrit', action: 'addToken', token: 'burn', value: 1 },
    pyramidLevel: 1,
  },
  gap: {
    id: 'gap',
    name: '틈새',
    type: 'gun',
    description: '공격을 회피하는데 성공하면 1회 사격합니다.',
    effect: { trigger: 'evadeSuccess', action: 'shoot', value: 1 },
    pyramidLevel: 1,
  },
  modernMag: {
    id: 'modernMag',
    name: '최신 탄창',
    type: 'gun',
    description: '장전한 턴에는 탄걸림이 발생하지 않습니다.',
    effect: { trigger: 'reloadTurn', action: 'preventJam' },
    pyramidLevel: 3,
  },
  shadow: {
    id: 'shadow',
    name: '흑막',
    type: 'gun',
    description: '유령-사격은 더 이상 룰렛을 증가시키지 않습니다.',
    effect: { trigger: 'ghostShoot', action: 'preventRouletteIncrease' },
    pyramidLevel: 3,
  },
  marksman: {
    id: 'marksman',
    name: '명사수',
    type: 'gun',
    description: '총격은 회피를 25% 만큼 무시합니다.',
    effect: { trigger: 'gunAttack', action: 'ignoreEvasion', percent: 25 },
    pyramidLevel: 5,
  },
  neutralize: {
    id: 'neutralize',
    name: '무력화',
    type: 'gun',
    description: '총격은 교차시 상대에게 무딤 1회.',
    effect: { trigger: 'gunCross', action: 'addToken', token: 'dull', value: 1 },
    pyramidLevel: 5,
  },
};

// 검술 계열 에토스
export const SWORD_ETHOS: Record<string, Ethos> = {
  warmup: {
    id: 'warmup',
    name: '몸풀기',
    type: 'sword',
    description: '전투 시작 시 기교 1 획득.',
    effect: { trigger: 'battleStart', action: 'addToken', token: 'finesse', value: 1 },
    pyramidLevel: 1,
  },
  extreme: {
    id: 'extreme',
    name: '극한',
    type: 'sword',
    description: '기교를 3회 획득할때마다 1회 추가 획득합니다.',
    effect: { trigger: 'finesseGain3', action: 'addToken', token: 'finesse', value: 1 },
    pyramidLevel: 1,
  },
  swordArt: {
    id: 'swordArt',
    name: '검예',
    type: 'sword',
    description: '보유한 기교만큼 검격 카드의 피해량이 증가합니다.',
    effect: { trigger: 'swordAttack', action: 'damageBonus', source: 'finesse' },
    pyramidLevel: 3,
  },
  compression: {
    id: 'compression',
    name: '압축',
    type: 'sword',
    description: '연계의 단축 효과를 5로 강화합니다.',
    effect: { trigger: 'chain', action: 'enhanceShorten', value: 5 },
    pyramidLevel: 3,
  },
  master: {
    id: 'master',
    name: '달인',
    type: 'sword',
    description: '유령카드를 창조카드와 동일한 강화 형태로 창조합니다.',
    effect: { trigger: 'ghostCreate', action: 'inheritEnhancement' },
    pyramidLevel: 5,
  },
  archaeology: {
    id: 'archaeology',
    name: '고고학',
    type: 'sword',
    description: '상징 갯수만큼 추가 피해.',
    effect: { trigger: 'attack', action: 'damageBonus', source: 'symbol' },
    pyramidLevel: 5,
  },
};

// 전체 에토스
export const ETHOS: Record<string, Ethos> = {
  ...GUN_ETHOS,
  ...SWORD_ETHOS,
};

// 피라미드 레벨별 해금 가능 에토스 조회
export function getEthosForLevel(level: number, type?: EthosType): Ethos[] {
  return Object.values(ETHOS).filter(e =>
    e.pyramidLevel <= level && (!type || e.type === type)
  );
}
