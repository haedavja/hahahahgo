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

import { ENEMIES } from '../battleData';

// Enemy 타입은 여러 형태로 사용되므로 유연한 타입 정의
interface EnemyLike {
  name?: string;
  composition?: Array<{ name?: string; count?: number; quantity?: number; emoji?: string; [key: string]: unknown }> | string[] | unknown[];
  count?: number;
  quantity?: number;
  emoji?: string;
  units?: Array<{ name?: string; emoji?: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

/**
 * composition 배열을 정규화된 멤버 배열로 변환
 * - 문자열 배열(ID)인 경우 ENEMIES에서 조회
 * - 객체 배열인 경우 그대로 반환
 */
function normalizeComposition(composition: unknown[]): Array<{ name?: string; emoji?: string; count?: number }> {
  if (!composition || composition.length === 0) return [];

  // 첫 번째 요소로 타입 판별
  const firstItem = composition[0];

  if (typeof firstItem === 'string') {
    // 문자열 배열(적 ID): ENEMIES에서 조회
    return (composition as string[]).map(id => {
      const enemy = ENEMIES.find(e => e.id === id);
      return {
        name: enemy?.name || id,
        emoji: enemy?.emoji || '👹',
        count: 1
      };
    });
  }

  // 객체 배열: 그대로 반환
  return composition as Array<{ name?: string; emoji?: string; count?: number }>;
}

/**
 * 적 이름별 개수를 집계합니다.
 * @param enemy - 적 정보
 * @returns 이름별 개수 맵 (예: { "고블린": 3, "오크": 2 })
 */
export function getEnemyNameCounts(enemy: EnemyLike | null): Record<string, number> {
  if (!enemy) return {};

  const counts: Record<string, number> = {};
  const extEnemy = enemy as { composition?: unknown[]; units?: Array<{ name?: string }>; count?: number; quantity?: number };

  // composition > units 순서로 확인 (composition은 정규화 필요)
  let memberList: Array<{ name?: string }>;
  if (extEnemy.composition && extEnemy.composition.length > 0) {
    memberList = normalizeComposition(extEnemy.composition);
  } else {
    memberList = extEnemy.units || [];
  }

  memberList.forEach((m) => {
    const key = m?.name || '몬스터';
    counts[key] = (counts[key] || 0) + 1;
  });

  // 리스트가 비어있으면 기본 정보 사용
  const base = enemy?.name || '몬스터';
  if (Object.keys(counts).length === 0) {
    counts[base] = extEnemy?.count || extEnemy?.quantity || 1;
  }

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
  const extEnemy = enemy as { composition?: unknown[]; units?: EnemyMember[]; emoji?: string; count?: number; quantity?: number };

  // composition > units > 단일 적 순서로 폴백 (composition은 정규화 필요)
  let list: EnemyMember[];
  if (extEnemy?.composition && extEnemy.composition.length > 0) {
    list = normalizeComposition(extEnemy.composition);
  } else if (extEnemy?.units && extEnemy.units.length > 0) {
    // units 배열 사용 (리듀서 상태에서 올 때)
    list = extEnemy.units;
  } else {
    list = [{ name: enemy?.name || '몬스터', emoji: extEnemy?.emoji || '👹', count: extEnemy?.count || extEnemy?.quantity || 1 }];
  }

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
