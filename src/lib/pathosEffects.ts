/**
 * @file pathosEffects.ts
 * @description 파토스 (액티브 스킬) 효과 처리 유틸리티
 *
 * 파토스는 전투 중 수동으로 발동하는 액티브 스킬입니다.
 * 최대 3개까지 장착 가능하며, 쿨다운이 있습니다.
 */

import { PATHOS, type Pathos, type PathosEffect } from '../data/growth/pathosData';
import type { GrowthState } from '../state/slices/growthSlice';
import { initialGrowthState } from '../state/slices/growthSlice';
import type { Combatant, BattleEvent } from '../types';
import { useGameStore } from '../state/gameStore';
import { addToken } from './tokenUtils';

// 파토스 쿨다운 상태
export interface PathosCooldowns {
  [pathosId: string]: number; // 남은 쿨다운 턴
}

// 파토스 사용 결과
export interface PathosUseResult {
  success: boolean;
  message: string;
  updatedPlayer?: Combatant;
  updatedEnemy?: Combatant;
  events: BattleEvent[];
  logs: string[];
  // 턴 동안 유지되는 효과
  turnEffects?: {
    gunToMelee?: boolean;      // 총격 시 추가 타격
    swordToGun?: boolean;      // 검격 시 추가 사격
    ignoreEvasion?: number;    // 회피 무시 확률
    onCrossBlock?: number;     // 교차 시 방어력 획득
    onSwordBlock?: number;     // 검격 시 방어력 획득
    forceCross?: boolean;      // 모든 검격 교차 판정
    chainBonus?: number;       // 연계 효과 증가율
    chainEvade?: boolean;      // 연계 후 회피 획득
    counterAttack?: number;    // 피격 시 반격 확률
  };
  // 다음 카드에만 적용되는 효과
  nextCardEffects?: {
    guaranteeCrit?: boolean;   // 치명타 보장
    setSpeed?: number;         // 속도 설정
    aoe?: boolean;             // 전체 공격
  };
}

/**
 * 현재 성장 상태에서 장착된 파토스 목록 조회
 */
export function getEquippedPathos(): Pathos[] {
  const growth = useGameStore.getState().growth || initialGrowthState;
  return growth.equippedPathos
    .map(id => PATHOS[id])
    .filter((p): p is Pathos => !!p);
}

/**
 * 파토스 사용 가능 여부 확인
 */
export function canUsePathos(pathosId: string, cooldowns: PathosCooldowns): boolean {
  const growth = useGameStore.getState().growth || initialGrowthState;

  // 장착 여부 확인
  if (!growth.equippedPathos.includes(pathosId)) {
    return false;
  }

  // 쿨다운 확인
  if (cooldowns[pathosId] && cooldowns[pathosId] > 0) {
    return false;
  }

  return true;
}

/**
 * 파토스 사용
 */
export function usePathos(
  pathosId: string,
  player: Combatant,
  enemy: Combatant,
  cooldowns: PathosCooldowns
): PathosUseResult {
  const pathos = PATHOS[pathosId];
  if (!pathos) {
    return {
      success: false,
      message: '존재하지 않는 파토스입니다.',
      events: [],
      logs: []
    };
  }

  if (!canUsePathos(pathosId, cooldowns)) {
    const remaining = cooldowns[pathosId] || 0;
    return {
      success: false,
      message: remaining > 0 ? `쿨다운 ${remaining}턴 남음` : '장착되지 않은 파토스입니다.',
      events: [],
      logs: []
    };
  }

  // 효과 적용
  const result = applyPathosEffect(pathos, player, enemy);

  // 쿨다운 설정
  if (pathos.cooldown) {
    cooldowns[pathosId] = pathos.cooldown;
  }

  return {
    success: true,
    message: `${pathos.name} 발동!`,
    ...result
  };
}

/**
 * 파토스 효과 적용
 */
function applyPathosEffect(
  pathos: Pathos,
  player: Combatant,
  enemy: Combatant
): Omit<PathosUseResult, 'success' | 'message'> {
  const effect = pathos.effect;
  const events: BattleEvent[] = [];
  const logs: string[] = [];
  let updatedPlayer = { ...player };
  let updatedEnemy = { ...enemy };
  const turnEffects: PathosUseResult['turnEffects'] = {};
  const nextCardEffects: PathosUseResult['nextCardEffects'] = {};

  switch (effect.action) {
    case 'addToken':
      // 토큰 추가 (철갑탄, 소이탄 등)
      if (effect.token && effect.value) {
        const tokenResult = addToken(updatedPlayer, effect.token, effect.value);
        updatedPlayer = { ...updatedPlayer, tokens: tokenResult.tokens };
        const msg = `✨ ${pathos.name}: ${effect.token} +${effect.value}`;
        events.push({ actor: 'player', type: 'pathos' as const, msg } as BattleEvent);
        logs.push(msg);
      }
      break;

    case 'reload':
      // 즉시 장전 (룰렛 초기화)
      const reloadResult = addToken(updatedPlayer, 'roulette', -100); // 음수로 초기화
      updatedPlayer = { ...updatedPlayer, tokens: reloadResult.tokens };
      const reloadMsg = `🔄 ${pathos.name}: 즉시 장전!`;
      events.push({ actor: 'player', type: 'pathos' as const, msg: reloadMsg } as BattleEvent);
      logs.push(reloadMsg);
      break;

    case 'gunToMelee':
      // 총격 시 추가 타격
      turnEffects.gunToMelee = true;
      const gunMeleeMsg = `⚔️ ${pathos.name}: 이번 턴 총격 시 추가 타격!`;
      events.push({ actor: 'player', type: 'pathos' as const, msg: gunMeleeMsg } as BattleEvent);
      logs.push(gunMeleeMsg);
      break;

    case 'swordToGun':
      // 검격 시 추가 사격
      turnEffects.swordToGun = true;
      const swordGunMsg = `🔫 ${pathos.name}: 이번 턴 검격 시 추가 사격!`;
      events.push({ actor: 'player', type: 'pathos' as const, msg: swordGunMsg } as BattleEvent);
      logs.push(swordGunMsg);
      break;

    case 'ignoreEvasion':
      // 회피 무시
      turnEffects.ignoreEvasion = effect.percent || 100;
      const ignoreMsg = `🎯 ${pathos.name}: 이번 턴 회피 무시!`;
      events.push({ actor: 'player', type: 'pathos' as const, msg: ignoreMsg } as BattleEvent);
      logs.push(ignoreMsg);
      break;

    case 'onCrossBlock':
      // 교차 시 방어력 획득
      turnEffects.onCrossBlock = effect.value || 4;
      const crossBlockMsg = `🛡️ ${pathos.name}: 교차 시 방어력 +${effect.value}`;
      events.push({ actor: 'player', type: 'pathos' as const, msg: crossBlockMsg } as BattleEvent);
      logs.push(crossBlockMsg);
      break;

    case 'onSwordBlock':
      // 검격 시 방어력 획득
      turnEffects.onSwordBlock = effect.value || 5;
      const swordBlockMsg = `🛡️ ${pathos.name}: 검격 시 방어력 +${effect.value}`;
      events.push({ actor: 'player', type: 'pathos' as const, msg: swordBlockMsg } as BattleEvent);
      logs.push(swordBlockMsg);
      break;

    case 'forceCross':
      // 모든 검격 교차 판정
      turnEffects.forceCross = true;
      const forceCrossMsg = `⚔️ ${pathos.name}: 모든 검격 교차 판정!`;
      events.push({ actor: 'player', type: 'pathos' as const, msg: forceCrossMsg } as BattleEvent);
      logs.push(forceCrossMsg);
      break;

    case 'guaranteeCrit':
      // 다음 검격 치명타 보장
      nextCardEffects.guaranteeCrit = true;
      const critMsg = `💥 ${pathos.name}: 다음 검격 치명타!`;
      events.push({ actor: 'player', type: 'pathos' as const, msg: critMsg } as BattleEvent);
      logs.push(critMsg);
      break;

    case 'setSpeed':
      // 다음 카드 속도 설정
      nextCardEffects.setSpeed = effect.value || 1;
      const speedMsg = `⚡ ${pathos.name}: 다음 검격 속도 ${effect.value}`;
      events.push({ actor: 'player', type: 'pathos' as const, msg: speedMsg } as BattleEvent);
      logs.push(speedMsg);
      break;

    case 'aoe':
      // 전체 공격
      nextCardEffects.aoe = true;
      const aoeMsg = `💥 ${pathos.name}: 다음 총격 전체 공격!`;
      events.push({ actor: 'player', type: 'pathos' as const, msg: aoeMsg } as BattleEvent);
      logs.push(aoeMsg);
      break;

    case 'chainBonus':
      // 연계 효과 증가
      turnEffects.chainBonus = effect.percent || 50;
      const chainMsg = `⚔️ ${pathos.name}: 연계 효과 +${effect.percent}%`;
      events.push({ actor: 'player', type: 'pathos' as const, msg: chainMsg } as BattleEvent);
      logs.push(chainMsg);
      break;

    case 'chainEvade':
      // 연계 후 회피 획득
      turnEffects.chainEvade = true;
      const chainEvadeMsg = `💨 ${pathos.name}: 연계 후 회피 획득!`;
      events.push({ actor: 'player', type: 'pathos' as const, msg: chainEvadeMsg } as BattleEvent);
      logs.push(chainEvadeMsg);
      break;

    case 'counterAttack':
      // 피격 시 반격 확률
      turnEffects.counterAttack = effect.percent || 30;
      const counterMsg = `⚔️ ${pathos.name}: 피격 시 ${effect.percent}% 반격!`;
      events.push({ actor: 'player', type: 'pathos' as const, msg: counterMsg } as BattleEvent);
      logs.push(counterMsg);
      break;

    default:
      const defaultMsg = `✨ ${pathos.name} 발동!`;
      events.push({ actor: 'player', type: 'pathos' as const, msg: defaultMsg } as BattleEvent);
      logs.push(defaultMsg);
      break;
  }

  return {
    updatedPlayer,
    updatedEnemy,
    events,
    logs,
    turnEffects: Object.keys(turnEffects).length > 0 ? turnEffects : undefined,
    nextCardEffects: Object.keys(nextCardEffects).length > 0 ? nextCardEffects : undefined
  };
}

/**
 * 턴 시작 시 쿨다운 감소
 */
export function decreaseCooldowns(cooldowns: PathosCooldowns): PathosCooldowns {
  const updated: PathosCooldowns = {};
  for (const [pathosId, remaining] of Object.entries(cooldowns)) {
    if (remaining > 1) {
      updated[pathosId] = remaining - 1;
    }
    // 0이 되면 삭제 (쿨다운 완료)
  }
  return updated;
}

/**
 * 파토스 정보 조회
 */
export function getPathosInfo(pathosId: string): Pathos | null {
  return PATHOS[pathosId] || null;
}
