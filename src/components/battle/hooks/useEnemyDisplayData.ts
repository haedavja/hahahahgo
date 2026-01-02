/**
 * @file useEnemyDisplayData.ts
 * @description 적 표시 데이터 훅
 *
 * ## 주요 기능
 * - 적 이름 카운트 계산
 * - 그룹화된 적 멤버 계산
 * - 적 콤보 감지
 * - 적 성향 힌트 추출
 */

import { useMemo } from 'react';
import { getEnemyNameCounts, getGroupedEnemyMembers } from '../utils/enemyDisplayUtils';
import { detectPokerCombo } from '../utils/comboDetection';

interface EnemyState {
  composition?: unknown[];
  name?: string;
  count?: number;
  quantity?: number;
  emoji?: string;
  [key: string]: unknown;
}

interface EnemyPlan {
  actions?: unknown[];
  mode?: unknown;
}

interface ComboResult {
  name: string;
  bonusKeys?: Set<number> | null;
  [key: string]: unknown;
}

interface UseEnemyDisplayDataParams {
  enemy: EnemyState | null;
  enemyPlan: EnemyPlan | null;
  battleLog: string[];
}

interface EnemyDisplayData {
  enemyNameCounts: ReturnType<typeof getEnemyNameCounts>;
  groupedEnemyMembers: ReturnType<typeof getGroupedEnemyMembers>;
  enemyCombo: ComboResult | null;
  enemyHint: string | null;
}

/**
 * 적 표시 데이터 훅
 */
export function useEnemyDisplayData(params: UseEnemyDisplayDataParams): EnemyDisplayData {
  const { enemy, enemyPlan, battleLog } = params;

  // 적 이름별 개수 계산
  const enemyNameCounts = useMemo(() => getEnemyNameCounts(enemy), [
    enemy?.composition,
    enemy?.name,
    (enemy as { count?: number })?.count,
    (enemy as { quantity?: number })?.quantity,
    enemy
  ]);

  // 그룹화된 적 멤버
  const groupedEnemyMembers = useMemo(() => getGroupedEnemyMembers(enemy), [
    enemy?.composition,
    enemy?.name,
    enemy?.emoji,
    enemy?.count,
    enemy?.quantity,
    enemy
  ]);

  // 적 조합 감지 (표시용)
  const enemyCombo = useMemo(() => {
    const rawActions = enemyPlan?.actions;
    const actions = Array.isArray(rawActions) ? rawActions : [];
    return detectPokerCombo(actions);
  }, [enemyPlan?.actions]);

  // 적 성향 힌트 추출
  const enemyHint = useMemo(() => {
    const hintLog = battleLog.find(line => line.includes('적 성향 힌트'));
    if (!hintLog) return null;
    const match = hintLog.match(/적 성향 힌트[:\s]*(.+)/);
    return match ? match[1].trim() : null;
  }, [battleLog]);

  return {
    enemyNameCounts,
    groupedEnemyMembers,
    enemyCombo,
    enemyHint
  };
}
