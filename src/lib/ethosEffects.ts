/**
 * @file ethosEffects.ts
 * @description 에토스 패시브 효과 처리 유틸리티
 *
 * 에토스 효과 트리거:
 * - battleStart: 전투 시작 시
 * - gunCrit: 총격 치명타 시
 * - evadeSuccess: 회피 성공 시
 * - reloadTurn: 장전한 턴
 * - ghostShoot: 유령 사격 시
 * - gunAttack: 총격 공격 시
 * - gunCross: 총격 교차 시
 * - finesseGain3: 기교 3회 획득 시
 * - swordAttack: 검격 공격 시
 * - chain: 연계 시
 * - ghostCreate: 유령카드 생성 시
 * - attack: 모든 공격 시
 */

import { ETHOS, type Ethos, type EthosEffect } from '../data/growth/ethosData';
import type { GrowthState } from '../state/slices/growthSlice';
import type { Combatant } from '../types';

export interface EthosEffectResult {
  updatedPlayer: Combatant;
  logs: string[];
  tokensToAdd: Array<{ id: string; stacks: number }>;
  damageBonus: number;
  specialEffects: string[];
}

/**
 * 전투 시작 시 에토스 효과 처리
 * @param player 플레이어 상태
 * @param growth 성장 상태
 * @returns 효과 적용 결과
 */
export function processEthosAtBattleStart(
  player: Combatant,
  growth: GrowthState
): EthosEffectResult {
  const result: EthosEffectResult = {
    updatedPlayer: { ...player },
    logs: [],
    tokensToAdd: [],
    damageBonus: 0,
    specialEffects: [],
  };

  if (!growth || !growth.unlockedEthos || growth.unlockedEthos.length === 0) {
    return result;
  }

  // 해금된 에토스 중 battleStart 트리거인 것만 처리
  for (const ethosId of growth.unlockedEthos) {
    const ethos = ETHOS[ethosId];
    if (!ethos) continue;

    if (ethos.effect.trigger === 'battleStart') {
      const effectResult = applyEthosEffect(ethos, result.updatedPlayer);
      result.updatedPlayer = effectResult.updatedPlayer;
      result.tokensToAdd.push(...effectResult.tokensToAdd);
      result.logs.push(...effectResult.logs);
    }
  }

  return result;
}

/**
 * 에토스 효과 적용
 */
function applyEthosEffect(
  ethos: Ethos,
  player: Combatant
): { updatedPlayer: Combatant; tokensToAdd: Array<{ id: string; stacks: number }>; logs: string[] } {
  const effect = ethos.effect;
  const tokensToAdd: Array<{ id: string; stacks: number }> = [];
  const logs: string[] = [];
  let updatedPlayer = { ...player };

  switch (effect.action) {
    case 'addToken':
      if (effect.token && effect.value) {
        tokensToAdd.push({ id: effect.token, stacks: effect.value });
        logs.push(`🌟 ${ethos.name}: ${effect.token} +${effect.value}`);
      }
      break;

    case 'shoot':
      // 사격 효과는 전투 중 별도 처리 필요
      logs.push(`🌟 ${ethos.name}: 발동 준비`);
      break;

    case 'damageBonus':
      // 데미지 보너스는 공격 시 계산
      break;

    default:
      break;
  }

  return { updatedPlayer, tokensToAdd, logs };
}

/**
 * 특정 트리거에 해당하는 에토스 효과 조회
 */
export function getEthosEffectsForTrigger(
  growth: GrowthState,
  trigger: string
): Ethos[] {
  if (!growth || !growth.unlockedEthos) return [];

  return growth.unlockedEthos
    .map(id => ETHOS[id])
    .filter((ethos): ethos is Ethos => !!ethos && ethos.effect.trigger === trigger);
}

/**
 * 총격 치명타 시 에토스 효과 확인
 */
export function hasGunCritEthos(growth: GrowthState): { hasBurn: boolean } {
  const effects = getEthosEffectsForTrigger(growth, 'gunCrit');
  return {
    hasBurn: effects.some(e => e.effect.token === 'burn'),
  };
}

/**
 * 회피 성공 시 에토스 효과 확인
 */
export function hasEvadeSuccessEthos(growth: GrowthState): { hasShoot: boolean } {
  const effects = getEthosEffectsForTrigger(growth, 'evadeSuccess');
  return {
    hasShoot: effects.some(e => e.effect.action === 'shoot'),
  };
}

/**
 * 검격 피해 보너스 계산 (검예 에토스)
 */
export function getSwordDamageBonus(growth: GrowthState, finesseStacks: number): number {
  const effects = getEthosEffectsForTrigger(growth, 'swordAttack');
  let bonus = 0;

  for (const ethos of effects) {
    if (ethos.effect.action === 'damageBonus' && ethos.effect.source === 'finesse') {
      bonus += finesseStacks;
    }
  }

  return bonus;
}

/**
 * 총격 회피 무시율 확인 (명사수 에토스)
 */
export function getGunEvasionIgnore(growth: GrowthState): number {
  const effects = getEthosEffectsForTrigger(growth, 'gunAttack');
  let ignorePercent = 0;

  for (const ethos of effects) {
    if (ethos.effect.action === 'ignoreEvasion' && ethos.effect.percent) {
      ignorePercent += ethos.effect.percent;
    }
  }

  return ignorePercent;
}

/**
 * 장전 턴 탄걸림 방지 확인 (최신 탄창 에토스)
 */
export function hasPreventJamOnReload(growth: GrowthState): boolean {
  const effects = getEthosEffectsForTrigger(growth, 'reloadTurn');
  return effects.some(e => e.effect.action === 'preventJam');
}

/**
 * 유령 사격 룰렛 증가 방지 확인 (흑막 에토스)
 */
export function hasPreventGhostRouletteIncrease(growth: GrowthState): boolean {
  const effects = getEthosEffectsForTrigger(growth, 'ghostShoot');
  return effects.some(e => e.effect.action === 'preventRouletteIncrease');
}

/**
 * 기교 3회 획득 시 추가 획득 확인 (극한 에토스)
 */
export function hasFinesseBonus(growth: GrowthState): boolean {
  const effects = getEthosEffectsForTrigger(growth, 'finesseGain3');
  return effects.some(e => e.effect.action === 'addToken' && e.effect.token === 'finesse');
}

/**
 * 총격 교차 시 무딤 부여 확인 (무력화 에토스)
 */
export function hasGunCrossDull(growth: GrowthState): boolean {
  const effects = getEthosEffectsForTrigger(growth, 'gunCross');
  return effects.some(e => e.effect.action === 'addToken' && e.effect.token === 'dull');
}

/**
 * 상징 개수만큼 추가 피해 확인 (고고학 에토스)
 */
export function getSymbolDamageBonus(growth: GrowthState, symbolCount: number): number {
  const effects = getEthosEffectsForTrigger(growth, 'attack');
  let bonus = 0;

  for (const ethos of effects) {
    if (ethos.effect.action === 'damageBonus' && ethos.effect.source === 'symbol') {
      bonus += symbolCount;
    }
  }

  return bonus;
}
