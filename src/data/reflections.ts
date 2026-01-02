/**
 * @file reflections.ts
 * @description 개성(Personality) 시스템 정의
 *
 * ## 개성 (Personality Traits)
 * - 용맹함, 열정적, 냉철함, 철저함, 활력적, 굳건함
 * - 기억 100 소모로 획득
 * - 스탯 강화 + 로고스 레벨업 조건
 */

// 한국어 개성 이름 → 영어 ID 매핑
export const TRAIT_NAME_TO_ID: Record<string, string> = {
  '용맹함': 'valiant',
  '열정적': 'passionate',
  '냉철함': 'calm',
  '철저함': 'thorough',
  '활력적': 'energetic',
  '굳건함': 'steadfast'
};

// 영어 ID → 한국어 개성 이름 매핑
export const TRAIT_ID_TO_NAME: Record<string, string> = {
  'valiant': '용맹함',
  'passionate': '열정적',
  'calm': '냉철함',
  'thorough': '철저함',
  'energetic': '활력적',
  'steadfast': '굳건함'
};

/**
 * 한국어 개성 이름 배열을 영어 ID 배열로 변환
 */
export function convertTraitsToIds(koreanTraits: string[] | null | undefined): string[] {
  if (!koreanTraits || !Array.isArray(koreanTraits)) return [];
  return koreanTraits
    .map((trait: string) => TRAIT_NAME_TO_ID[trait])
    .filter((id): id is string => !!id);
}

// 기본 개성 정의
export const PERSONALITY_TRAITS = {
  valiant: {
    id: 'valiant',
    name: '용맹함',
    emoji: '⚔️',
    description: '두려움 없이 전진하는 성향',
    statBonus: { playerStrength: 1 }
  },
  passionate: {
    id: 'passionate',
    name: '열정적',
    emoji: '🔥',
    description: '뜨거운 열정으로 임하는 성향',
    statBonus: { playerMaxSpeedBonus: 5 }
  },
  calm: {
    id: 'calm',
    name: '냉철함',
    emoji: '❄️',
    description: '차분하게 상황을 분석하는 성향',
    statBonus: { playerInsight: 1 }
  },
  thorough: {
    id: 'thorough',
    name: '철저함',
    emoji: '🎯',
    description: '꼼꼼하게 준비하는 성향',
    statBonus: { extraSubSpecialSlots: 1 }
  },
  energetic: {
    id: 'energetic',
    name: '활력적',
    emoji: '⚡',
    description: '활기차게 움직이는 성향',
    statBonus: { playerEnergyBonus: 1 }
  },
  steadfast: {
    id: 'steadfast',
    name: '굳건함',
    emoji: '🛡️',
    description: '흔들리지 않는 단단한 성향',
    statBonus: { maxHp: 10, playerHp: 10 }
  }
};

// 개성 효과 설명
export const TRAIT_EFFECT_DESC: Record<string, string> = {
  '용맹함': '힘 +1',
  '굳건함': '체력 +10',
  '냉철함': '통찰 +1',
  '철저함': '보조슬롯 +1',
  '열정적': '속도 +5',
  '활력적': '행동력 +1',
};

/**
 * 개성 수로 피라미드 레벨 계산
 * @param traitCount 보유 개성 수
 * @returns 피라미드 레벨 (0부터 시작)
 */
export function getPyramidLevelFromTraits(traitCount: number): number {
  // 개성 2개당 피라미드 1레벨
  return Math.floor(traitCount / 2);
}

// === 레거시 호환성 함수 (새 피라미드 시스템으로 대체됨) ===

interface Reflection {
  id: string;
  name: string;
  emoji?: string;
  description: string;
  probability: number;
}

/**
 * @deprecated 새 피라미드 성장 시스템으로 대체됨
 * 자아별 성찰 반환 (레거시 - 빈 배열 반환)
 */
export function getReflectionsByEgos(_playerEgos: string[]): Reflection[] {
  return [];
}

/**
 * @deprecated 새 피라미드 성장 시스템으로 대체됨
 * 개성 수에 따른 확률 보너스 (레거시 - 0 반환)
 */
export function getTraitCountBonus(_traitCount: number): number {
  return 0;
}
