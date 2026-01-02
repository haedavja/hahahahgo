/**
 * @file insightSystem.ts
 * @description 통찰(Insight) 시스템 - 적 정보 공개 레벨 관리
 *
 * ## 통찰 레벨별 공개 정보
 * - 0: 적 존재만 표시
 * - 1: 적 이름/HP 공개
 * - 2: 적 행동 타입(공격/방어) 공개
 * - 3: 적 카드 상세 정보 공개
 *
 * ## 장막(Shroud) 시스템
 * 적의 장막 스택만큼 통찰 효과 감소
 */

import type {
  Card,
  InsightCardInfo,
  InsightEnemyAction,
  InsightUnit,
  InsightActionRevealInfo,
  InsightRevealResult,
  TokenEntity
} from '../../../types';
import { getTokenStacks } from "../../../lib/tokenUtils";

/**
 * 유효 통찰 계산: 플레이어 통찰 - 적의 장막
 * @param playerInsight - 플레이어 통찰
 * @param enemyShroud - 적의 장막
 * @returns 유효 통찰
 */
export const calculateEffectiveInsight = (playerInsight: number, enemyShroud: number): number => {
  return Math.max(0, (playerInsight || 0) - (enemyShroud || 0));
};

/**
 * 유닛의 veil 스택 가져오기
 * @param unit - 유닛 객체
 * @returns veil 스택 수
 */
const getUnitVeil = (unit: InsightUnit | undefined): number => {
  if (!unit) return 0;
  return getTokenStacks(unit, 'veil') || 0;
};

/**
 * 특정 통찰 레벨에 따른 action 정보 생성
 * @param action - 적의 행동
 * @param idx - 인덱스
 * @param insightForAction - 이 action에 적용할 유효 통찰
 * @param totalActions - 전체 행동 수
 * @returns 공개할 action 정보
 */
const getActionRevealInfo = (
  action: InsightEnemyAction | Card,
  idx: number,
  insightForAction: number,
  totalActions: number
): InsightActionRevealInfo => {
  // Card를 직접 받는 경우와 InsightEnemyAction을 받는 경우 모두 처리
  const card = 'card' in action && action.card ? action.card : action as Card;
  const speed = 'speed' in action ? action.speed : undefined;
  // sourceUnitId는 런타임에 추가되는 속성
  const sourceUnitId = (card as Card & { __sourceUnitId?: number })?.__sourceUnitId;

  if (insightForAction <= 0) {
    // 레벨 0: 정보 없음 (카드 존재는 알지만 내용 비공개)
    return {
      index: idx,
      hidden: true,
      sourceUnitId,
    };
  }

  if (insightForAction === 1) {
    // 레벨 1: 대략적 순서만
    return {
      index: idx,
      isFirst: idx === 0,
      isLast: idx === totalActions - 1,
      hidden: false,
      revealLevel: 1,
      sourceUnitId,
    };
  }

  if (insightForAction === 2) {
    // 레벨 2: 카드 이름과 속도
    return {
      index: idx,
      card: card as InsightCardInfo,
      speed: speed,
      hidden: false,
      revealLevel: 2,
      sourceUnitId,
    };
  }

  // 레벨 3+: 모든 정보
  return {
    index: idx,
    card: card as InsightCardInfo,
    speed: speed,
    effects: (card as InsightCardInfo)?.effects,
    traits: card?.traits,
    hidden: false,
    revealLevel: 3,
    sourceUnitId,
  };
};

/**
 * 통찰 레벨별 적 정보 공개 (유닛별 veil 적용)
 * @param baseInsight - 기본 유효 통찰 (player.insight - enemy.shroud)
 * @param enemyActions - 적의 행동 계획
 * @param units - 적 유닛 배열 (각 유닛에 veil 토큰 있을 수 있음)
 * @returns 공개할 정보 레벨
 */
export const getInsightRevealLevel = (
  baseInsight: number,
  enemyActions: Array<InsightEnemyAction | Card>,
  units: InsightUnit[] = []
): InsightRevealResult => {
  if (!enemyActions || !Array.isArray(enemyActions) || enemyActions.length === 0) {
    return { level: 0, visible: false };
  }

  // 각 action에 대해 해당 유닛의 veil을 적용한 유효 통찰 계산
  const actionsWithReveal = enemyActions.map((action, idx) => {
    // Card를 직접 받는 경우와 InsightEnemyAction을 받는 경우 모두 처리
    const card = 'card' in action && action.card ? action.card : action as Card;
    const sourceUnitId = card?.__sourceUnitId;
    const sourceUnit = units.find(u => u.unitId === sourceUnitId);
    const unitVeil = getUnitVeil(sourceUnit);
    const insightForAction = Math.max(0, baseInsight - unitVeil);

    return getActionRevealInfo(action, idx, insightForAction, enemyActions.length);
  });

  // 최소 공개 레벨 (가장 낮은 레벨 기준으로 전체 표시 여부 결정)
  const minLevel = actionsWithReveal.reduce((min, a) => {
    if (a.hidden) return min;
    return Math.min(min, a.revealLevel || 0);
  }, 3);

  const anyVisible = actionsWithReveal.some(a => !a.hidden);

  if (!anyVisible) {
    return { level: 0, visible: false };
  }

  return {
    level: minLevel,
    visible: true,
    cardCount: enemyActions.length,
    showRoughOrder: minLevel >= 1,
    showCards: minLevel >= 2,
    showSpeed: minLevel >= 2,
    showEffects: minLevel >= 3,
    fullDetails: minLevel >= 3,
    actions: actionsWithReveal,
  };
};

// Window 인터페이스 확장 (webkitAudioContext)
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

/**
 * 통찰 레벨에 따른 짧은 효과음
 * @param level - 통찰 레벨 (1, 2, 3+)
 */
export const playInsightSound = (level: number = 1): void => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    const base = level === 3 ? 880 : level === 2 ? 720 : 560;
    osc.frequency.value = base;
    osc.type = 'triangle';
    gain.gain.setValueAtTime(0.16, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.45);
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.5);
  } catch {
    // 사운드 실패 시 무시
  }
};
