/**
 * @file enemyDisplayUtils.ts
 * @description 적 표시 관련 유틸리티 함수
 *
 * ## 주요 기능
 * - getEnemyNameCounts: 적 이름별 개수 집계
 * - getGroupedEnemyMembers: 적 그룹화 및 중복 제거
 *
 * ## 사용처
 * - BattleApp.tsx: 적 UI 표시
 */

// Enemy 타입은 여러 형태로 사용되므로 유연한 타입 정의
interface EnemyLike {
  name?: string;
  composition?: Array<{ name?: string; count?: number; quantity?: number; emoji?: string; [key: string]: unknown }> | unknown[];
  count?: number;
  quantity?: number;
  emoji?: string;
  units?: Array<{ name?: string; emoji?: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

/**
 * 적 이름별 개수를 집계합니다.
 * @param enemy - 적 정보
 * @returns 이름별 개수 맵 (예: { "고블린": 3, "오크": 2 })
 */
export function getEnemyNameCounts(enemy: EnemyLike | null): Record<string, number> {
  if (!enemy) return {};

  const counts: Record<string, number> = {};
  const extEnemy = enemy as { composition?: Array<{ name?: string }>; count?: number; quantity?: number };

  (extEnemy.composition || []).forEach((m) => {
    const key = m?.name || '몬스터';
    counts[key] = (counts[key] || 0) + 1;
  });

  const base = enemy?.name || '몬스터';
  if (!counts[base]) counts[base] = extEnemy?.count || extEnemy?.quantity || 1;

  return counts;
}

/**
 * 적 멤버를 그룹화하여 중복을 제거합니다.
 * @param enemy - 적 정보
 * @returns 그룹화된 적 멤버 배열 (예: [{ name: "고블린", emoji: "👺", count: 3 }])
 */
export function getGroupedEnemyMembers(
  enemy: EnemyLike | null
): Array<{ name: string; emoji: string; count: number }> {
  if (!enemy) return [];

  type EnemyMember = { name?: string; emoji?: string; count?: number };
  const extEnemy = enemy as { composition?: EnemyMember[]; emoji?: string; count?: number; quantity?: number };

  const list: EnemyMember[] = extEnemy?.composition && extEnemy.composition.length > 0
    ? extEnemy.composition
    : [{ name: enemy?.name || '몬스터', emoji: extEnemy?.emoji || '👹', count: extEnemy?.count || extEnemy?.quantity || 1 }];

  const map = new Map<string, { name: string; emoji: string; count: number }>();
  list.forEach((m) => {
    const name = m?.name || '몬스터';
    const emoji = m?.emoji || '👹';
    const increment = m?.count || 1;
    if (!map.has(name)) {
      map.set(name, { name, emoji, count: increment });
    } else {
      const cur = map.get(name);
      if (cur) {
        map.set(name, { ...cur, count: cur.count + increment });
      }
    }
  });

  return Array.from(map.values());
}
