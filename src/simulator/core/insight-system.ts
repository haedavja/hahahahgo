/**
 * @file insight-system.ts
 * @description 통찰 시스템 - 적 정보 가시성 계산
 *
 * ## 통찰 레벨 (-3 ~ +3)
 * | 레벨 | 이름 | 효과 |
 * |------|------|------|
 * | -3   | 망각 | 타임라인, 적 체력/에테르 확인 불가 |
 * | -2   | 미련 | 진행단계에서 적 타임라인 확인 불가 |
 * | -1   | 우둔 | 대응단계에서 적 타임라인 확인 불가 |
 * |  0   | 평온 | 선택단계에서 적 카드 3개 확인 |
 * | +1   | 예측 | 선택단계에서 적 카드 4개 확인 |
 * | +2   | 독심 | 선택단계에서 적 카드 모두 확인 |
 * | +3   | 혜안 | 적 카드 모두 + 카드 정보 확인 |
 *
 * ## 통찰 감소 요소
 * - 적 shroud 토큰
 * - 적 유닛 veil 효과
 * - 이변 통찰 감소
 * - 페널티 (특정 효과)
 */

import type { TokenState } from './game-types';

// ==================== 타입 정의 ====================

export type InsightLevelName = '망각' | '미련' | '우둔' | '평온' | '예측' | '독심' | '혜안';

export interface InsightLevel {
  level: number;
  name: InsightLevelName;
  description: string;
}

export interface InsightReveal {
  /** 공개 여부 */
  visible: boolean;
  /** 통찰 레벨 (-3 ~ +3) */
  level: number;
  /** 공개되는 카드 수 */
  revealedCardCount: number;
  /** 카드 상세 정보 공개 여부 */
  showCardDetails: boolean;
  /** 적 체력 공개 여부 */
  showEnemyHp: boolean;
  /** 적 에테르 공개 여부 */
  showEnemyEther: boolean;
  /** 타임라인 공개 여부 */
  showTimeline: boolean;
}

export interface InsightCalculationParams {
  /** 플레이어 기본 통찰 */
  playerInsight: number;
  /** 적 shroud 토큰 수 */
  enemyShroud: number;
  /** 통찰 페널티 */
  insightPenalty: number;
  /** 이변 통찰 감소 */
  anomalyReduction: number;
  /** 적 유닛 veil 효과 수 */
  veilCount: number;
  /** 개발자 모드 감쇠 레벨 */
  devDulledLevel?: number;
}

export interface EnemyUnit {
  id: string;
  tokens?: TokenState;
  hasVeil?: boolean;
}

// ==================== 상수 ====================

export const INSIGHT_LEVELS: Record<number, InsightLevel> = {
  [-3]: { level: -3, name: '망각', description: '타임라인, 적 체력/에테르 확인 불가' },
  [-2]: { level: -2, name: '미련', description: '진행단계에서 적 타임라인 확인 불가' },
  [-1]: { level: -1, name: '우둔', description: '대응단계에서 적 타임라인 확인 불가' },
  [0]: { level: 0, name: '평온', description: '선택단계에서 적 카드 3개 확인' },
  [1]: { level: 1, name: '예측', description: '선택단계에서 적 카드 4개 확인' },
  [2]: { level: 2, name: '독심', description: '선택단계에서 적 카드 모두 확인' },
  [3]: { level: 3, name: '혜안', description: '적 카드 모두 + 카드 정보 확인' },
};

/** 통찰 레벨별 공개 카드 수 */
const REVEALED_CARD_COUNT: Record<number, number> = {
  [-3]: 0,
  [-2]: 0,
  [-1]: 0,
  [0]: 3,
  [1]: 4,
  [2]: Infinity,
  [3]: Infinity,
};

// ==================== 통찰 계산 ====================

/**
 * 유효 통찰 레벨 계산
 */
export function calculateInsightLevel(params: InsightCalculationParams): number {
  const {
    playerInsight,
    enemyShroud,
    insightPenalty,
    anomalyReduction,
    veilCount,
    devDulledLevel,
  } = params;

  // 개발자 모드 감쇠가 설정되어 있으면 우선 적용
  if (devDulledLevel !== undefined && devDulledLevel !== null) {
    return Math.max(-3, Math.min(3, -devDulledLevel));
  }

  // 기본 통찰 - shroud - 페널티 - 이변 감소 - veil
  const base = playerInsight - enemyShroud - insightPenalty - anomalyReduction - veilCount;

  // -3 ~ +3 범위로 클램프
  return Math.max(-3, Math.min(3, base));
}

/**
 * 통찰 레벨 정보 가져오기
 */
export function getInsightLevelInfo(level: number): InsightLevel {
  const clampedLevel = Math.max(-3, Math.min(3, level));
  return INSIGHT_LEVELS[clampedLevel];
}

/**
 * 통찰 공개 정보 계산
 */
export function getInsightReveal(
  insightLevel: number,
  phase: 'select' | 'respond' | 'resolve' | 'end'
): InsightReveal {
  const clampedLevel = Math.max(-3, Math.min(3, insightLevel));

  // 기본값: 아무것도 보이지 않음
  const base: InsightReveal = {
    visible: false,
    level: clampedLevel,
    revealedCardCount: 0,
    showCardDetails: false,
    showEnemyHp: true,
    showEnemyEther: true,
    showTimeline: true,
  };

  // 망각 (-3): 거의 모든 정보 차단
  if (clampedLevel <= -3) {
    return {
      ...base,
      showEnemyHp: false,
      showEnemyEther: false,
      showTimeline: false,
    };
  }

  // 미련 (-2): 진행단계에서 타임라인 차단
  if (clampedLevel === -2 && phase === 'resolve') {
    return {
      ...base,
      showTimeline: false,
    };
  }

  // 우둔 (-1): 대응단계에서 타임라인 차단
  if (clampedLevel === -1 && phase === 'respond') {
    return {
      ...base,
      showTimeline: false,
    };
  }

  // 선택 단계에서만 적 카드 공개
  if (phase !== 'select') {
    return base;
  }

  // 평온 이상: 카드 공개
  const revealedCount = REVEALED_CARD_COUNT[clampedLevel] ?? 0;

  return {
    visible: revealedCount > 0,
    level: clampedLevel,
    revealedCardCount: revealedCount,
    showCardDetails: clampedLevel >= 3, // 혜안에서만 상세 정보
    showEnemyHp: true,
    showEnemyEther: true,
    showTimeline: true,
  };
}

// ==================== shroud/veil 계산 ====================

/**
 * 적 shroud 토큰 합계 계산
 */
export function calculateTotalShroud(
  enemyTokens: TokenState,
  enemyUnits: EnemyUnit[] = []
): number {
  let total = enemyTokens.shroud || 0;

  // 유닛별 shroud 합산
  for (const unit of enemyUnits) {
    if (unit.tokens?.shroud) {
      total += unit.tokens.shroud;
    }
  }

  return total;
}

/**
 * veil 효과를 가진 유닛 수 계산
 */
export function calculateVeilCount(enemyUnits: EnemyUnit[] = []): number {
  let count = 0;

  for (const unit of enemyUnits) {
    if (unit.hasVeil || unit.tokens?.veil) {
      count++;
    }
  }

  return count;
}

/**
 * veil 효과로 인한 통찰 감소량 계산
 */
export function calculateVeilInsightReduction(veilCount: number): number {
  // veil 1개당 통찰 1 감소
  return veilCount;
}

// ==================== 시뮬레이터 통합 ====================

/**
 * 시뮬레이터용 통찰 정보 계산
 * AI 의사결정에 사용
 */
export function getSimulatorInsightInfo(
  playerInsight: number,
  enemyShroud: number,
  enemyUnits: EnemyUnit[],
  anomalyReduction: number,
  insightPenalty: number,
  phase: 'select' | 'respond' | 'resolve' | 'end'
): {
  level: number;
  reveal: InsightReveal;
  canSeeEnemyCards: boolean;
  visibleCardCount: number;
} {
  const veilCount = calculateVeilCount(enemyUnits);

  const level = calculateInsightLevel({
    playerInsight,
    enemyShroud,
    insightPenalty,
    anomalyReduction,
    veilCount,
  });

  const reveal = getInsightReveal(level, phase);

  return {
    level,
    reveal,
    canSeeEnemyCards: reveal.visible && reveal.revealedCardCount > 0,
    visibleCardCount: reveal.revealedCardCount === Infinity ? 999 : reveal.revealedCardCount,
  };
}

/**
 * 적 카드 필터링 (통찰에 따라 보이는 카드만 반환)
 */
export function filterVisibleEnemyCards<T>(
  cards: T[],
  insightReveal: InsightReveal
): T[] {
  if (!insightReveal.visible) {
    return [];
  }

  if (insightReveal.revealedCardCount === Infinity) {
    return cards;
  }

  return cards.slice(0, insightReveal.revealedCardCount);
}

/**
 * 통찰 레벨 이름 가져오기
 */
export function getInsightLevelName(level: number): InsightLevelName {
  const info = getInsightLevelInfo(level);
  return info.name;
}
