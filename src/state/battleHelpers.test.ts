/**
 * @file battleHelpers.test.ts
 * @description 전투 헬퍼 함수 테스트
 *
 * ## 테스트 대상
 * - createBattleEnemyData: 적 데이터 생성 헬퍼
 * - 엣지 케이스: null, undefined, 불완전한 데이터
 *
 * ## 목적
 * 속성 누락 버그 방지 (speed, isBoss 등)
 */

import { describe, it, expect } from 'vitest';
import { createBattleEnemyData } from './battleHelpers';

describe('createBattleEnemyData', () => {
  describe('정상 데이터 변환', () => {
    it('모든 속성이 있는 적 데이터를 올바르게 변환해야 함', () => {
      const enemy = {
        id: 'ghoul',
        name: '구울',
        emoji: '💀',
        hp: 40,
        ether: 100,
        speed: 10,
        deck: ['ghoul_attack', 'ghoul_block'],
        cardsPerTurn: 2,
        passives: { rage: true },
        tier: 1,
        isBoss: false,
      };

      const result = createBattleEnemyData(enemy);

      expect(result.id).toBe('ghoul');
      expect(result.name).toBe('구울');
      expect(result.emoji).toBe('💀');
      expect(result.hp).toBe(40);
      expect(result.maxHp).toBe(40);
      expect(result.ether).toBe(100);
      expect(result.speed).toBe(10);
      expect(result.deck).toEqual(['ghoul_attack', 'ghoul_block']);
      expect(result.cardsPerTurn).toBe(2);
      expect(result.passives).toEqual({ rage: true });
      expect(result.tier).toBe(1);
      expect(result.isBoss).toBe(false);
    });

    it('보스 적 데이터의 isBoss가 true로 유지되어야 함', () => {
      const boss = {
        id: 'slaughterer',
        name: '살육자',
        hp: 200,
        speed: 20,
        isBoss: true,
      };

      const result = createBattleEnemyData(boss);

      expect(result.isBoss).toBe(true);
    });
  });

  describe('기본값 적용', () => {
    it('빈 객체에 모든 기본값이 적용되어야 함', () => {
      const result = createBattleEnemyData({});

      expect(result.name).toBe('적');
      expect(result.emoji).toBe('👾');
      expect(result.hp).toBe(40);
      expect(result.maxHp).toBe(40);
      expect(result.ether).toBe(100);
      expect(result.speed).toBe(10);
      expect(result.deck).toEqual([]);
      expect(result.cardsPerTurn).toBe(2);
      expect(result.passives).toEqual({});
      expect(result.tier).toBe(1);
      expect(result.isBoss).toBe(false);
    });

    it('null 입력에도 기본값이 적용되어야 함', () => {
      const result = createBattleEnemyData(null);

      expect(result.name).toBe('적');
      expect(result.speed).toBe(10);
      expect(result.isBoss).toBe(false);
    });

    it('undefined 입력에도 기본값이 적용되어야 함', () => {
      const result = createBattleEnemyData(undefined);

      expect(result.name).toBe('적');
      expect(result.speed).toBe(10);
      expect(result.isBoss).toBe(false);
    });
  });

  describe('부분 데이터 처리', () => {
    it('일부 속성만 있는 데이터도 올바르게 처리해야 함', () => {
      const partial = {
        id: 'test',
        name: '테스트 적',
        hp: 50,
        // speed, isBoss 등 누락
      };

      const result = createBattleEnemyData(partial);

      expect(result.id).toBe('test');
      expect(result.name).toBe('테스트 적');
      expect(result.hp).toBe(50);
      expect(result.speed).toBe(10); // 기본값
      expect(result.isBoss).toBe(false); // 기본값
    });

    it('deck이 배열이 아닌 경우 빈 배열로 변환해야 함', () => {
      const invalid = {
        id: 'test',
        deck: 'not-an-array', // 잘못된 타입
      };

      const result = createBattleEnemyData(invalid);

      expect(Array.isArray(result.deck)).toBe(true);
      expect(result.deck).toEqual([]);
    });

    it('deck이 null인 경우 빈 배열로 변환해야 함', () => {
      const result = createBattleEnemyData({ deck: null });

      expect(result.deck).toEqual([]);
    });
  });

  describe('필수 속성 검증', () => {
    it('speed 속성이 항상 존재해야 함 (이전 버그 방지)', () => {
      const enemies = [
        {},
        { id: 'test' },
        { id: 'test', name: 'Test' },
        null,
        undefined,
      ];

      enemies.forEach((enemy) => {
        const result = createBattleEnemyData(enemy);
        expect(result).toHaveProperty('speed');
        expect(typeof result.speed).toBe('number');
      });
    });

    it('isBoss 속성이 항상 존재해야 함 (이전 버그 방지)', () => {
      const enemies = [
        {},
        { id: 'test' },
        { id: 'test', name: 'Test' },
        null,
        undefined,
      ];

      enemies.forEach((enemy) => {
        const result = createBattleEnemyData(enemy);
        expect(result).toHaveProperty('isBoss');
        expect(typeof result.isBoss).toBe('boolean');
      });
    });
  });
});
