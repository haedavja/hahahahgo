/**
 * @file comboDetection.ts
 * @description 포커 조합 감지 시스템 (공유 라이브러리 래퍼)
 *
 * 실제 로직은 /lib/comboDetection.ts에서 구현됩니다.
 * 이 파일은 하위 호환성을 위해 유지됩니다.
 */

import {
  detectPokerCombo as detectPokerComboShared,
  applyPokerBonus as applyPokerBonusShared,
  type ComboCard,
  type ComboCalculation,
} from '../../../lib/comboDetection';

/**
 * 포커 조합 감지
 */
export function detectPokerCombo(cards: ComboCard[]): ComboCalculation | null {
  // 공유 라이브러리로 위임
  const result = detectPokerComboShared(cards);
  if (!result) return null;

  return {
    name: result.name,
    bonusKeys: result.bonusKeys,
  };
}

/**
 * 포커 조합 보너스 적용
 */
export function applyPokerBonus<T extends ComboCard>(cards: T[], combo: ComboCalculation | null): T[] {
  return applyPokerBonusShared(cards, combo);
}

// Re-export types for backwards compatibility
export type { ComboCard, ComboCalculation } from '../../../lib/comboDetection';
