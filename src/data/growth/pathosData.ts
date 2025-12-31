/**
 * @file pathosData.ts
 * @description 파토스 (Pathos) - 액티브 스킬 정의
 *
 * 피라미드 짝수 단계에서 해금 (2, 4, 6...)
 * 해금된 것 중 3개를 전투에 장착
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
}

// 총기 계열 파토스
export const GUN_PATHOS: Record<string, Pathos> = {
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
  reload: {
    id: 'reload',
    name: '장전',
    type: 'gun',
    description: '즉시 장전합니다.',
    effect: { action: 'reload' },
    cooldown: 3,
    pyramidLevel: 2,
  },
  gunSword: {
    id: 'gunSword',
    name: '검총술',
    type: 'gun',
    description: '이번 턴 총격 카드를 쓸때마다 추가로 타격을 가합니다.',
    effect: { action: 'gunToMelee', duration: 'turn' },
    cooldown: 4,
    pyramidLevel: 4,
  },
  wanted: {
    id: 'wanted',
    name: '원티드',
    type: 'gun',
    description: '이번 턴 총격 카드는 회피를 무시합니다.',
    effect: { action: 'ignoreEvasion', duration: 'turn', percent: 100 },
    cooldown: 4,
    pyramidLevel: 4,
  },
  barrage: {
    id: 'barrage',
    name: '난사',
    type: 'gun',
    description: '다음 총격 카드가 모든 적에게 피해를 가합니다.',
    effect: { action: 'aoe', target: 'all', duration: 'next' },
    cooldown: 5,
    pyramidLevel: 6,
  },
};

// 검술 계열 파토스
export const SWORD_PATHOS: Record<string, Pathos> = {
  cross: {
    id: 'cross',
    name: '교차',
    type: 'sword',
    description: '모든 검격 카드는 교차시 방어력을 4 얻습니다.',
    effect: { action: 'onCrossBlock', value: 4, duration: 'turn' },
    pyramidLevel: 2,
  },
  counter: {
    id: 'counter',
    name: '응수',
    type: 'sword',
    description: '피해를 받으면 타격 카드로 반격할 확률 30%',
    effect: { action: 'counterAttack', percent: 30, duration: 'turn' },
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
  sharpBlade: {
    id: 'sharpBlade',
    name: '잘드는 날',
    type: 'sword',
    description: '다음 검격 카드는 치명타를 입힙니다.',
    effect: { action: 'guaranteeCrit', duration: 'next' },
    cooldown: 3,
    pyramidLevel: 4,
  },
  epee: {
    id: 'epee',
    name: '에페',
    type: 'sword',
    description: '검격 카드를 쓸때마다 방어력 5 획득 합니다.',
    effect: { action: 'onSwordBlock', value: 5, duration: 'turn' },
    pyramidLevel: 4,
  },
  wayOfSword: {
    id: 'wayOfSword',
    name: '검의 길',
    type: 'sword',
    description: '모든 검격카드를 교차로 판정합니다.',
    effect: { action: 'forceCross', duration: 'turn' },
    cooldown: 4,
    pyramidLevel: 4,
  },
  swordGun: {
    id: 'swordGun',
    name: '총검술',
    type: 'sword',
    description: '이번 턴 검격 카드를 쓸때마다 추가로 사격을 가합니다.',
    effect: { action: 'swordToGun', duration: 'turn' },
    cooldown: 4,
    pyramidLevel: 6,
  },
  swordDance: {
    id: 'swordDance',
    name: '검무',
    type: 'sword',
    description: '이번 턴 연계-후속-마무리 특성 효과가 50% 증가합니다.',
    effect: { action: 'chainBonus', percent: 50, duration: 'turn' },
    cooldown: 3,
    pyramidLevel: 6,
  },
  lightSword: {
    id: 'lightSword',
    name: '빛의 검',
    type: 'sword',
    description: '다음 검격 카드의 속도를 1로 합니다.',
    effect: { action: 'setSpeed', value: 1, duration: 'next' },
    cooldown: 4,
    pyramidLevel: 6,
  },
};

// 전체 파토스
export const PATHOS: Record<string, Pathos> = {
  ...GUN_PATHOS,
  ...SWORD_PATHOS,
};

// 피라미드 레벨별 해금 가능 파토스 조회
export function getPathosForLevel(level: number, type?: PathosType): Pathos[] {
  return Object.values(PATHOS).filter(p =>
    p.pyramidLevel <= level && (!type || p.type === type)
  );
}

// 장착 슬롯 수
export const MAX_EQUIPPED_PATHOS = 3;
