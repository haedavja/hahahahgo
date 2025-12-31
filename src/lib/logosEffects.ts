/**
 * @file logosEffects.ts
 * @description 로고스 (피라미드 정점) 효과 처리 유틸리티
 *
 * 로고스는 피라미드 레벨 3, 5, 7에서 해금되는 영구 보너스입니다.
 * - 공용: 모든 자아 공통
 * - 건카타: 총잡이 자아 전용
 * - 배틀 왈츠: 검잡이 자아 전용
 */

import {
  COMMON_LOGOS,
  GUNKATA_LOGOS,
  BATTLE_WALTZ_LOGOS,
  getLogosLevelFromPyramid
} from '../data/growth/logosData';
import type { GrowthState } from '../state/slices/growthSlice';
import { initialGrowthState } from '../state/slices/growthSlice';
import { useGameStore } from '../state/gameStore';

// 로고스 효과 타입
export interface LogosEffects {
  // 공용
  expandCrossRange: boolean;      // 교차 범위 확장 (Lv1)
  extraSubSlots: number;          // 추가 보조특기 슬롯 (Lv2)
  extraMainSlots: number;         // 추가 주특기 슬롯 (Lv3)

  // 건카타 (총잡이)
  blockToShoot: boolean;          // 방어력으로 막아낼 시 총격 (Lv1)
  reduceJamChance: number;        // 탄걸림 확률 감소 (Lv2, 기본 5% → 3%)
  critBonusGun: number;           // 총격 치명타 확률 증가 (Lv3)
  critReload: boolean;            // 치명타시 장전 (Lv3)

  // 배틀 왈츠 (검잡이)
  minFinesse: number;             // 최소 기교 (Lv1)
  armorPenetration: number;       // 검격 방어력 추가 피해 % (Lv2)
  combatTokensOnAttack: string;   // 공격시 획득 토큰 (Lv3)
  combatTokensOnDefense: string;  // 방어시 획득 토큰 (Lv3)
}

/**
 * 현재 성장 상태에서 로고스 효과 계산
 */
export function getLogosEffects(): LogosEffects {
  const growth = useGameStore.getState().growth || initialGrowthState;
  return calculateLogosEffects(growth);
}

/**
 * 성장 상태에서 로고스 효과 계산
 */
export function calculateLogosEffects(growth: GrowthState): LogosEffects {
  const effects: LogosEffects = {
    // 공용 (초기값)
    expandCrossRange: false,
    extraSubSlots: 0,
    extraMainSlots: 0,

    // 건카타 (초기값)
    blockToShoot: false,
    reduceJamChance: 0,
    critBonusGun: 0,
    critReload: false,

    // 배틀 왈츠 (초기값)
    minFinesse: 0,
    armorPenetration: 0,
    combatTokensOnAttack: '',
    combatTokensOnDefense: ''
  };

  if (!growth) return effects;

  const { logosLevels, identities } = growth;

  // 공용 로고스 효과
  if (logosLevels.common >= 1) {
    effects.expandCrossRange = true;
  }
  if (logosLevels.common >= 2) {
    effects.extraSubSlots = 2;
  }
  if (logosLevels.common >= 3) {
    effects.extraMainSlots = 1;
  }

  // 건카타 로고스 효과 (총잡이 자아 필요)
  if (identities.includes('gunslinger') && logosLevels.gunkata >= 1) {
    effects.blockToShoot = true;
  }
  if (identities.includes('gunslinger') && logosLevels.gunkata >= 2) {
    effects.reduceJamChance = 2; // 5% → 3% (2% 감소)
  }
  if (identities.includes('gunslinger') && logosLevels.gunkata >= 3) {
    effects.critBonusGun = 3;
    effects.critReload = true;
  }

  // 배틀 왈츠 로고스 효과 (검잡이 자아 필요)
  if (identities.includes('swordsman') && logosLevels.battleWaltz >= 1) {
    effects.minFinesse = 1;
  }
  if (identities.includes('swordsman') && logosLevels.battleWaltz >= 2) {
    effects.armorPenetration = 50;
  }
  if (identities.includes('swordsman') && logosLevels.battleWaltz >= 3) {
    effects.combatTokensOnAttack = 'blur';     // 흐릿함
    effects.combatTokensOnDefense = 'defensive'; // 수세
  }

  return effects;
}

/**
 * 교차 범위 확장 여부
 */
export function hasExpandedCrossRange(): boolean {
  const effects = getLogosEffects();
  return effects.expandCrossRange;
}

/**
 * 추가 보조특기 슬롯 수
 */
export function getExtraSubSlots(): number {
  const effects = getLogosEffects();
  return effects.extraSubSlots;
}

/**
 * 추가 주특기 슬롯 수
 */
export function getExtraMainSlots(): number {
  const effects = getLogosEffects();
  return effects.extraMainSlots;
}

/**
 * 방어력으로 막아낼 시 총격 여부 (건카타 Lv1)
 */
export function shouldShootOnBlock(): boolean {
  const effects = getLogosEffects();
  return effects.blockToShoot;
}

/**
 * 탄걸림 확률 감소량 (건카타 Lv2)
 */
export function getJamReduction(): number {
  const effects = getLogosEffects();
  return effects.reduceJamChance;
}

/**
 * 총격 치명타 보너스 (건카타 Lv3)
 */
export function getGunCritBonus(): number {
  const effects = getLogosEffects();
  return effects.critBonusGun;
}

/**
 * 치명타시 장전 여부 (건카타 Lv3)
 */
export function shouldReloadOnCrit(): boolean {
  const effects = getLogosEffects();
  return effects.critReload;
}

/**
 * 최소 기교 (배틀 왈츠 Lv1)
 */
export function getMinFinesse(): number {
  const effects = getLogosEffects();
  return effects.minFinesse;
}

/**
 * 검격 방어력 추가 피해 % (배틀 왈츠 Lv2)
 */
export function getArmorPenetration(): number {
  const effects = getLogosEffects();
  return effects.armorPenetration;
}

/**
 * 공격/방어 시 획득 토큰 (배틀 왈츠 Lv3)
 */
export function getCombatTokens(): { onAttack: string; onDefense: string } {
  const effects = getLogosEffects();
  return {
    onAttack: effects.combatTokensOnAttack,
    onDefense: effects.combatTokensOnDefense
  };
}

/**
 * 로고스 레벨 요약
 */
export function getLogosLevelSummary(): { common: number; gunkata: number; battleWaltz: number } {
  const growth = useGameStore.getState().growth || initialGrowthState;
  return {
    common: growth.logosLevels.common,
    gunkata: growth.logosLevels.gunkata,
    battleWaltz: growth.logosLevels.battleWaltz
  };
}
