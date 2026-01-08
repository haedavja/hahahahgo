/**
 * @file enemyDisplayUtils.test.ts
 * @description 적 표시 유틸리티 테스트
 */

import { describe, it, expect } from 'vitest';
import { getEnemyNameCounts, getGroupedEnemyMembers } from './enemyDisplayUtils';

describe('enemyDisplayUtils', () => {
  describe('getEnemyNameCounts', () => {
    it('null 적 정보에 대해 빈 객체 반환', () => {
      expect(getEnemyNameCounts(null)).toEqual({});
    });

    it('기본 적 이름 카운트', () => {
      const enemy = { name: '고블린', count: 3 };
      expect(getEnemyNameCounts(enemy)).toEqual({ '고블린': 3 });
    });

    it('quantity 속성 처리', () => {
      const enemy = { name: '오크', quantity: 2 };
      expect(getEnemyNameCounts(enemy)).toEqual({ '오크': 2 });
    });

    it('composition 배열 처리', () => {
      const enemy = {
        name: '몬스터 무리',
        composition: [
          { name: '고블린' },
          { name: '고블린' },
          { name: '오크' }
        ]
      };
      const result = getEnemyNameCounts(enemy);
      expect(result['고블린']).toBe(2);
      expect(result['오크']).toBe(1);
    });

    it('이름 없는 적은 "몬스터"로 처리', () => {
      const enemy = { count: 1 };
      expect(getEnemyNameCounts(enemy)).toEqual({ '몬스터': 1 });
    });

    it('composition 내 이름 없는 멤버는 "몬스터"로 처리', () => {
      const enemy = {
        composition: [
          { name: '고블린' },
          {} // 이름 없음
        ]
      };
      const result = getEnemyNameCounts(enemy);
      expect(result['고블린']).toBe(1);
      expect(result['몬스터']).toBe(1);
    });

    it('count와 quantity 없으면 1로 처리', () => {
      const enemy = { name: '슬라임' };
      expect(getEnemyNameCounts(enemy)).toEqual({ '슬라임': 1 });
    });
  });

  describe('getGroupedEnemyMembers', () => {
    it('null 적 정보에 대해 빈 배열 반환', () => {
      expect(getGroupedEnemyMembers(null)).toEqual([]);
    });

    it('단일 적 처리', () => {
      const enemy = { name: '고블린', emoji: '👺', count: 3 };
      const result = getGroupedEnemyMembers(enemy);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ name: '고블린', emoji: '👺', count: 3 });
    });

    it('기본 이모지 사용', () => {
      const enemy = { name: '고블린', count: 2 };
      const result = getGroupedEnemyMembers(enemy);
      expect(result[0].emoji).toBe('👹');
    });

    it('composition 멤버 그룹화', () => {
      const enemy = {
        composition: [
          { name: '고블린', emoji: '👺' },
          { name: '고블린', emoji: '👺' },
          { name: '오크', emoji: '👹' }
        ]
      };
      const result = getGroupedEnemyMembers(enemy);
      expect(result).toHaveLength(2);

      const goblin = result.find(r => r.name === '고블린');
      expect(goblin?.count).toBe(2);
      expect(goblin?.emoji).toBe('👺');

      const orc = result.find(r => r.name === '오크');
      expect(orc?.count).toBe(1);
    });

    it('quantity 속성 처리', () => {
      const enemy = { name: '슬라임', quantity: 5 };
      const result = getGroupedEnemyMembers(enemy);
      expect(result[0].count).toBe(5);
    });

    it('이름 없는 멤버는 "몬스터"로 처리', () => {
      const enemy = {
        composition: [
          { emoji: '👻' } // 이름 없음
        ]
      };
      const result = getGroupedEnemyMembers(enemy);
      expect(result[0].name).toBe('몬스터');
      expect(result[0].emoji).toBe('👻');
    });

    it('count 속성이 있는 composition 멤버 처리', () => {
      const enemy = {
        composition: [
          { name: '스켈레톤', emoji: '💀', count: 3 },
          { name: '스켈레톤', emoji: '💀', count: 2 }
        ]
      };
      const result = getGroupedEnemyMembers(enemy);
      expect(result).toHaveLength(1);
      expect(result[0].count).toBe(5);
    });

    it('빈 composition은 기본 적 정보 사용', () => {
      const enemy = { name: '보스', emoji: '👑', count: 1, composition: [] };
      const result = getGroupedEnemyMembers(enemy);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ name: '보스', emoji: '👑', count: 1 });
    });
  });
});
