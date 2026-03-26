/**
 * @file anomalyEffectUtils.ts
 * @description 이변 효과 적용 유틸리티
 */

import { TRAITS } from '../components/battle/battleData';

interface AnomalyPlayerState {
  vulnerabilityPercent?: number;
  defenseBackfire?: number;
  speedInstability?: number;
  traitSilenceLevel?: number;
  chainIsolationLevel?: number;
  finesseBlockLevel?: number;
  [key: string]: unknown;
}

/**
 * 취약(VULNERABILITY) 이변: 받는 피해 증가율 계산
 * @returns 피해 배율 (1.0 = 100%, 1.1 = 110%)
 */
export function getVulnerabilityMultiplier(player: AnomalyPlayerState): number {
  const percent = player.vulnerabilityPercent || 0;
  return 1 + (percent / 100);
}

/**
 * 역류(DEFENSE_BACKFIRE) 이변: 방어 카드 사용 시 자해 피해량
 */
export function getDefenseBackfireDamage(player: AnomalyPlayerState): number {
  return player.defenseBackfire || 0;
}

/**
 * 불안정(SPEED_INSTABILITY) 이변: 속도 변동량 랜덤 생성
 * @returns ±value 범위의 랜덤 값
 */
export function getSpeedInstabilityModifier(player: AnomalyPlayerState): number {
  const range = player.speedInstability || 0;
  if (range === 0) return 0;
  // -range ~ +range 사이의 랜덤 정수
  return Math.floor(Math.random() * (range * 2 + 1)) - range;
}

/**
 * 침묵(TRAIT_SILENCE) 이변: 특성이 침묵되었는지 확인
 * @param traitId - 특성 ID
 * @param player - 플레이어 상태
 * @returns true면 해당 특성이 무효화됨
 */
export function isTraitSilenced(traitId: string, player: AnomalyPlayerState): boolean {
  const silenceLevel = player.traitSilenceLevel || 0;
  if (silenceLevel === 0) return false;

  const trait = TRAITS[traitId as keyof typeof TRAITS];
  if (!trait) return false;

  // 레벨 4: 모든 특성 무효화
  if (silenceLevel >= 4) return true;

  // 레벨 1: 부정 특성만 무효화
  if (silenceLevel === 1) {
    return trait.type === 'negative';
  }

  // 레벨 2-3: 해당 weight 이하 무효화
  return trait.weight <= silenceLevel;
}

/**
 * 고립(CHAIN_ISOLATION) 이변: 연계/후속 효과가 무효화되었는지 확인
 */
export function getChainIsolationEffect(player: AnomalyPlayerState): {
  blockChain: boolean;
  blockFollowup: boolean;
  blockAdvance: boolean;
} {
  const level = player.chainIsolationLevel || 0;
  return {
    blockChain: level === 1 || level >= 3,      // 레벨 1, 3, 4: 연계 무효
    blockFollowup: level >= 2,                  // 레벨 2, 3, 4: 후속 무효
    blockAdvance: level >= 4                    // 레벨 4: 앞당김도 무효
  };
}

/**
 * 광기(FINESSE_BLOCK) 이변: 기교 획득량 조정
 * @param originalStacks - 원래 획득량
 * @returns 조정된 획득량
 */
export function adjustFinesseGain(originalStacks: number, player: AnomalyPlayerState): number {
  const level = player.finesseBlockLevel || 0;
  if (level === 0) return originalStacks;

  // 레벨 3-4: 완전 차단
  if (level >= 3) return 0;

  // 레벨 1-2: 감소 (25% per level)
  const reduction = level * 0.25;
  return Math.max(0, Math.floor(originalStacks * (1 - reduction)));
}
