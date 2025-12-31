/**
 * @file logosData.ts
 * @description 로고스 (Logos) - 피라미드 정점 보상
 *
 * 공용: 자아 선택 무관 해금
 * 건카타: 총잡이 자아 선택 시 해금
 * 배틀 왈츠: 검잡이 자아 선택 시 해금
 */

export type LogosType = 'common' | 'gunkata' | 'battleWaltz';

export interface LogosEffect {
  type: string;          // 효과 타입
  value?: number;        // 수치
  description: string;   // 효과 설명
}

export interface LogosLevel {
  level: number;
  name: string;
  effect: LogosEffect;
}

export interface Logos {
  id: LogosType;
  name: string;
  description: string;
  levels: LogosLevel[];
}

// 공용 로고스 (모든 자아 공통)
export const COMMON_LOGOS: Logos = {
  id: 'common',
  name: '공용',
  description: '자아 선택 무관 해금',
  levels: [
    {
      level: 1,
      name: '교차로',
      effect: {
        type: 'expandCrossRange',
        value: 1,
        description: '모든 교차의 범위가 1~-1까지 확장됩니다.',
      },
    },
    {
      level: 2,
      name: '보조특기',
      effect: {
        type: 'extraSubSlots',
        value: 2,
        description: '보조특기 2개 추가.',
      },
    },
    {
      level: 3,
      name: '주특기',
      effect: {
        type: 'extraMainSlots',
        value: 1,
        description: '주특기 한 개 추가.',
      },
    },
  ],
};

// 건카타 로고스 (총잡이 전용)
export const GUNKATA_LOGOS: Logos = {
  id: 'gunkata',
  name: '건카타',
  description: '총잡이 자아 전용',
  levels: [
    {
      level: 1,
      name: '반격',
      effect: {
        type: 'blockToShoot',
        description: '방어력으로 막아낼 시 총격.',
      },
    },
    {
      level: 2,
      name: '정밀',
      effect: {
        type: 'reduceJamChance',
        value: 2,
        description: '1발당 룰렛 탄걸림 확률 5% → 3%로 조정.',
      },
    },
    {
      level: 3,
      name: '명중',
      effect: {
        type: 'critBonus',
        value: 3,
        description: '총격 치명타 확률 3% 상승, 치명타시 장전.',
      },
    },
  ],
};

// 배틀 왈츠 로고스 (검잡이 전용)
export const BATTLE_WALTZ_LOGOS: Logos = {
  id: 'battleWaltz',
  name: '배틀 왈츠',
  description: '검잡이 자아 전용',
  levels: [
    {
      level: 1,
      name: '유지',
      effect: {
        type: 'minFinesse',
        value: 1,
        description: '기교가 1 밑으로 내려가지 않음.',
      },
    },
    {
      level: 2,
      name: '관통',
      effect: {
        type: 'armorPenetration',
        value: 50,
        description: '검격이 방어력에 50% 추가피해.',
      },
    },
    {
      level: 3,
      name: '흐름',
      effect: {
        type: 'combatTokens',
        description: '공격시 흐릿함, 방어시 수세 획득.',
      },
    },
  ],
};

// 전체 로고스
export const LOGOS: Record<LogosType, Logos> = {
  common: COMMON_LOGOS,
  gunkata: GUNKATA_LOGOS,
  battleWaltz: BATTLE_WALTZ_LOGOS,
};

// 로고스 레벨 요구 피라미드 레벨
export const LOGOS_LEVEL_REQUIREMENTS: Record<number, number> = {
  1: 3,  // 로고스 Lv1: 피라미드 레벨 3 필요
  2: 5,  // 로고스 Lv2: 피라미드 레벨 5 필요
  3: 7,  // 로고스 Lv3: 피라미드 레벨 7 필요
};

// 피라미드 레벨로 로고스 레벨 계산
export function getLogosLevelFromPyramid(pyramidLevel: number): number {
  if (pyramidLevel >= 7) return 3;
  if (pyramidLevel >= 5) return 2;
  if (pyramidLevel >= 3) return 1;
  return 0;
}
