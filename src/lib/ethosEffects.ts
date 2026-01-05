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

import { ETHOS, type Ethos } from '../data/growth/ethosData';
import type { GrowthState } from '../state/slices/growthSlice';
import { initialGrowthState } from '../state/slices/growthSlice';
import type { Combatant, Card } from '../types';
import { useGameStore } from '../state/gameStore';

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
 * 에토스 효과 적용 (테스트 가능하도록 export)
 */
export function applyEthosEffect(
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

// ============== 전투 통합 헬퍼 함수 ==============

/**
 * 현재 성장 상태 가져오기 (전투 중 사용)
 */
export function getGrowthState(): GrowthState {
  return useGameStore.getState().growth || initialGrowthState;
}

/**
 * 카드가 총기 카드인지 확인
 */
export function isGunCard(card: Card): boolean {
  return card.cardCategory === 'gun';
}

/**
 * 카드가 검술 카드인지 확인
 */
export function isSwordCard(card: Card): boolean {
  return card.cardCategory === 'fencing' || card.cardCategory === 'sword';
}

/**
 * 총격 치명타 시 적용할 효과 반환 (불꽃 에토스)
 */
export function getGunCritEffects(): { burnStacks: number; logs: string[] } {
  const growth = getGrowthState();
  const effects = getEthosEffectsForTrigger(growth, 'gunCrit');
  let burnStacks = 0;
  const logs: string[] = [];

  for (const ethos of effects) {
    if (ethos.effect.action === 'addToken' && ethos.effect.token === 'burn') {
      burnStacks += ethos.effect.value || 1;
      logs.push(`🔥 ${ethos.name}: 화상 +${ethos.effect.value || 1}`);
    }
  }

  return { burnStacks, logs };
}

/**
 * 회피 성공 시 반격 사격 여부 확인 (틈새 에토스)
 */
export function shouldCounterShootOnEvade(): { shouldShoot: boolean; shots: number; logs: string[] } {
  const growth = getGrowthState();
  const effects = getEthosEffectsForTrigger(growth, 'evadeSuccess');
  let shots = 0;
  const logs: string[] = [];

  for (const ethos of effects) {
    if (ethos.effect.action === 'shoot') {
      shots += ethos.effect.value || 1;
      logs.push(`🔫 ${ethos.name}: 반격 사격 ${ethos.effect.value || 1}회`);
    }
  }

  return { shouldShoot: shots > 0, shots, logs };
}

/**
 * 검격 피해량 보너스 계산 (검예 에토스 - 기교 스택만큼 추가 피해)
 */
export function calculateSwordDamageBonus(finesseStacks: number): { bonus: number; logs: string[] } {
  const growth = getGrowthState();
  const effects = getEthosEffectsForTrigger(growth, 'swordAttack');
  let bonus = 0;
  const logs: string[] = [];

  for (const ethos of effects) {
    if (ethos.effect.action === 'damageBonus' && ethos.effect.source === 'finesse') {
      bonus += finesseStacks;
      if (finesseStacks > 0) {
        logs.push(`⚔️ ${ethos.name}: 기교로 +${finesseStacks} 피해`);
      }
    }
  }

  return { bonus, logs };
}

/**
 * 총격 교차 시 무딤 부여 확인 (무력화 에토스)
 */
export function getGunCrossEffects(): { dullStacks: number; logs: string[] } {
  const growth = getGrowthState();
  const effects = getEthosEffectsForTrigger(growth, 'gunCross');
  let dullStacks = 0;
  const logs: string[] = [];

  for (const ethos of effects) {
    if (ethos.effect.action === 'addToken' && ethos.effect.token === 'dull') {
      dullStacks += ethos.effect.value || 1;
      logs.push(`🎯 ${ethos.name}: 무딤 +${ethos.effect.value || 1}`);
    }
  }

  return { dullStacks, logs };
}

/**
 * 공격 시 전체 피해 보너스 계산 (고고학 에토스 - 상징 개수만큼)
 */
export function calculateAttackDamageBonus(symbolCount: number): { bonus: number; logs: string[] } {
  const growth = getGrowthState();
  const effects = getEthosEffectsForTrigger(growth, 'attack');
  let bonus = 0;
  const logs: string[] = [];

  for (const ethos of effects) {
    if (ethos.effect.action === 'damageBonus' && ethos.effect.source === 'symbol') {
      bonus += symbolCount;
      if (symbolCount > 0) {
        logs.push(`🏛️ ${ethos.name}: 상징으로 +${symbolCount} 피해`);
      }
    }
  }

  return { bonus, logs };
}

/**
 * 장전 턴 탄걸림 방지 여부 (최신 탄창 에토스)
 */
export function shouldPreventJamOnReload(): boolean {
  const growth = getGrowthState();
  return hasPreventJamOnReload(growth);
}

/**
 * 유령 사격 룰렛 증가 방지 여부 (흑막 에토스)
 */
export function shouldPreventGhostRoulette(): boolean {
  const growth = getGrowthState();
  return hasPreventGhostRouletteIncrease(growth);
}

/**
 * 총격 회피 무시 확률 (명사수 에토스)
 */
export function getGunEvasionIgnorePercent(): number {
  const growth = getGrowthState();
  return getGunEvasionIgnore(growth);
}

/**
 * 기교 획득 시 추가 기교 확인 (극한 에토스)
 * @param currentFinesseGainCount 현재 턴에서 획득한 기교 횟수
 * @returns 추가로 획득해야 할 기교 수
 */
export function getExtraFinesseOnGain(currentFinesseGainCount: number): { extra: number; logs: string[] } {
  const growth = getGrowthState();
  const logs: string[] = [];

  if (!hasFinesseBonus(growth)) {
    return { extra: 0, logs };
  }

  // 3회마다 1 추가
  const extra = Math.floor(currentFinesseGainCount / 3);
  if (extra > 0) {
    logs.push(`⚡ 극한: 기교 3회 획득으로 +${extra} 추가`);
  }

  return { extra, logs };
}
