/**
 * @file restConstants.ts
 * @description 휴식 모달 관련 상수 및 유틸리티
 */

import type { CardGrowthState } from '../../../../state/slices/types';

// ========================================
// 상수
// ========================================

export const TRAIT_EFFECT_DESC: Record<string, string> = {
  '용맹함': '힘 +1',
  '굳건함': '체력 +10',
  '냉철함': '통찰 +1',
  '철저함': '보조슬롯 +1',
  '열정적': '속도 +5',
  '활력적': '행동력 +1',
};

export const ENHANCEMENT_COST: Record<number, number> = {
  1: 0,  // 0→1강 (무료)
  2: 0,  // 1→2강 (무료)
  3: 0,  // 2→3강 (무료)
  4: 0,  // 3→4강 (무료)
  5: 0,  // 4→5강 (무료)
};

export const SPECIALIZATION_COST = 0;

export const RARITY_LABEL: Record<string, string> = {
  common: '일반',
  rare: '희귀',
  special: '특별',
  legendary: '전설',
};

export const RARITY_BADGE: Record<string, { color: string; label: string } | null> = {
  common: null,
  rare: { color: '#60a5fa', label: '희귀' },
  special: { color: '#34d399', label: '특별' },
  legendary: { color: '#fbbf24', label: '전설' },
};

// ========================================
// 타입
// ========================================

export interface GrowthNotification {
  message: string;
  type: 'enhance' | 'specialize' | 'promotion';
  cardName: string;
}

export interface GrowthStats {
  totalCards: number;
  enhancedCards: number;
  specializedCards: number;
  totalEnhancementLevels: number;
  totalSpecializations: number;
  totalTraits: number;
  rarityBreakdown: Record<string, number>;
  maxEnhancementLevel: number;
}

// ========================================
// 유틸리티 함수
// ========================================

export function calculateGrowthStats(cardGrowth: Record<string, CardGrowthState>): GrowthStats {
  const stats: GrowthStats = {
    totalCards: 0,
    enhancedCards: 0,
    specializedCards: 0,
    totalEnhancementLevels: 0,
    totalSpecializations: 0,
    totalTraits: 0,
    rarityBreakdown: { common: 0, rare: 0, special: 0, legendary: 0 },
    maxEnhancementLevel: 0,
  };

  for (const [_cardId, growth] of Object.entries(cardGrowth)) {
    stats.totalCards++;

    if (growth.enhancementLevel && growth.enhancementLevel > 0) {
      stats.enhancedCards++;
      stats.totalEnhancementLevels += growth.enhancementLevel;
      stats.maxEnhancementLevel = Math.max(stats.maxEnhancementLevel, growth.enhancementLevel);
    }

    if (growth.specializationCount && growth.specializationCount > 0) {
      stats.specializedCards++;
      stats.totalSpecializations += growth.specializationCount;
    }

    if (growth.traits) {
      stats.totalTraits += growth.traits.length;
    }

    stats.rarityBreakdown[growth.rarity || 'common']++;
  }

  return stats;
}
