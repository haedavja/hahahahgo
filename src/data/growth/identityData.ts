/**
 * @file identityData.ts
 * @description 자아 (Identity) - 총잡이/검잡이
 *
 * 피라미드 정점(자아 단계)에서 선택
 * 선택에 따라 전용 로고스 해금
 * 하이브리드 가능 (둘 다 선택)
 */

import type { LogosType } from './logosData';

export type IdentityType = 'gunslinger' | 'swordsman';

export interface Identity {
  id: IdentityType;
  name: string;
  emoji: string;
  description: string;
  logos: LogosType;         // 연결된 로고스
  preferredEthos: string[]; // 권장 에토스 타입
  preferredPathos: string[]; // 권장 파토스 타입
}

export const IDENTITIES: Record<IdentityType, Identity> = {
  gunslinger: {
    id: 'gunslinger',
    name: '총잡이',
    emoji: '🔫',
    description: '총기를 다루는 자. 건카타 로고스 해금.',
    logos: 'gunkata',
    preferredEthos: ['flame', 'gap', 'modernMag', 'shadow', 'marksman', 'neutralize'],
    preferredPathos: ['armorPiercing', 'incendiary', 'reload', 'gunSword', 'wanted', 'barrage'],
  },
  swordsman: {
    id: 'swordsman',
    name: '검잡이',
    emoji: '⚔️',
    description: '검을 다루는 자. 배틀 왈츠 로고스 해금.',
    logos: 'battleWaltz',
    preferredEthos: ['warmup', 'extreme', 'swordArt', 'compression', 'master', 'archaeology'],
    preferredPathos: ['cross', 'counter', 'dance', 'sharpBlade', 'epee', 'wayOfSword', 'swordGun', 'swordDance', 'lightSword'],
  },
};

// 자아 선택 요구 피라미드 레벨
export const IDENTITY_REQUIRED_PYRAMID_LEVEL = 3;

// 자아 선택 가능 여부
export function canSelectIdentity(pyramidLevel: number): boolean {
  return pyramidLevel >= IDENTITY_REQUIRED_PYRAMID_LEVEL;
}
