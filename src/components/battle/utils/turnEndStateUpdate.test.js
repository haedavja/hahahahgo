/**
 * @file turnEndStateUpdate.test.js
 * @description turnEndStateUpdate 함수 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  updateComboUsageCount,
  createTurnEndPlayerState,
  createTurnEndEnemyState,
  checkVictoryCondition
} from './turnEndStateUpdate';

describe('turnEndStateUpdate', () => {
  describe('updateComboUsageCount', () => {
    it('조합 사용 횟수를 증가시켜야 함', () => {
      const current = { '올인': 2 };
      const combo = { name: '올인' };

      const result = updateComboUsageCount(current, combo);

      expect(result['올인']).toBe(3);
    });

    it('새 조합은 1로 시작해야 함', () => {
      const current = {};
      const combo = { name: '쌍권총' };

      const result = updateComboUsageCount(current, combo);

      expect(result['쌍권총']).toBe(1);
    });

    it('null 조합은 무시해야 함', () => {
      const current = { test: 1 };
      const result = updateComboUsageCount(current, null);

      expect(result).toEqual({ test: 1 });
    });

    it('name이 없는 조합은 무시해야 함', () => {
      const current = { test: 1 };
      const result = updateComboUsageCount(current, {});

      expect(result).toEqual({ test: 1 });
    });

    it('플레이어 카드 사용 횟수를 추적해야 함', () => {
      const current = {};
      const queue = [
        { actor: 'player', card: { id: 'card1' } },
        { actor: 'player', card: { id: 'card2' } },
        { actor: 'enemy', card: { id: 'enemy_card' } }
      ];

      const result = updateComboUsageCount(current, null, queue, 'player');

      expect(result['card1']).toBe(1);
      expect(result['card2']).toBe(1);
      expect(result['enemy_card']).toBeUndefined();
    });

    it('같은 카드가 여러 번 사용되면 누적해야 함', () => {
      const current = { card1: 2 };
      const queue = [
        { actor: 'player', card: { id: 'card1' } },
        { actor: 'player', card: { id: 'card1' } }
      ];

      const result = updateComboUsageCount(current, null, queue, 'player');

      expect(result['card1']).toBe(4);
    });

    it('enemy actor 필터는 플레이어 카드를 무시해야 함', () => {
      const current = {};
      const queue = [
        { actor: 'player', card: { id: 'player_card' } },
        { actor: 'enemy', card: { id: 'enemy_card' } }
      ];

      const result = updateComboUsageCount(current, null, queue, 'enemy');

      expect(result['player_card']).toBeUndefined();
      // enemy 필터는 카드 추적 안 함 (actorFilter === 'player' 조건)
      expect(result['enemy_card']).toBeUndefined();
    });

    it('null currentUsageCount는 빈 객체로 시작해야 함', () => {
      const result = updateComboUsageCount(null, { name: 'combo' });

      expect(result['combo']).toBe(1);
    });

    it('id가 없는 카드는 무시해야 함', () => {
      const current = {};
      const queue = [
        { actor: 'player', card: { name: 'No ID Card' } }
      ];

      const result = updateComboUsageCount(current, null, queue, 'player');

      expect(Object.keys(result).length).toBe(0);
    });
  });

  describe('createTurnEndPlayerState', () => {
    it('방어 상태를 초기화해야 함', () => {
      const player = {
        hp: 80,
        block: 15,
        def: true,
        counter: 5
      };

      const result = createTurnEndPlayerState(player, {
        comboUsageCount: {},
        etherPts: 10
      });

      expect(result.block).toBe(0);
      expect(result.def).toBe(false);
      expect(result.counter).toBe(0);
    });

    it('취약 상태를 초기화해야 함', () => {
      const player = {
        hp: 100,
        vulnMult: 1.5,
        vulnTurns: 2
      };

      const result = createTurnEndPlayerState(player, {
        comboUsageCount: {},
        etherPts: 10
      });

      expect(result.vulnMult).toBe(1);
      expect(result.vulnTurns).toBe(0);
    });

    it('에테르 폭주를 비활성화해야 함', () => {
      const player = {
        hp: 100,
        etherOverdriveActive: true
      };

      const result = createTurnEndPlayerState(player, {
        comboUsageCount: {},
        etherPts: 10
      });

      expect(result.etherOverdriveActive).toBe(false);
    });

    it('조합 사용 카운트를 설정해야 함', () => {
      const result = createTurnEndPlayerState({ hp: 100 }, {
        comboUsageCount: { '올인': 3 },
        etherPts: 10
      });

      expect(result.comboUsageCount).toEqual({ '올인': 3 });
    });

    it('에테르 포인트를 설정해야 함', () => {
      const result = createTurnEndPlayerState({ hp: 100 }, {
        comboUsageCount: {},
        etherPts: 25
      });

      expect(result.etherPts).toBe(25);
    });

    it('음수 에테르 포인트는 0으로 처리해야 함', () => {
      const result = createTurnEndPlayerState({ hp: 100 }, {
        comboUsageCount: {},
        etherPts: -5
      });

      expect(result.etherPts).toBe(0);
    });

    it('에테르 오버플로우를 누적해야 함', () => {
      const player = { hp: 100, etherOverflow: 10 };

      const result = createTurnEndPlayerState(player, {
        comboUsageCount: {},
        etherPts: 20,
        etherOverflow: 5
      });

      expect(result.etherOverflow).toBe(15);
    });

    it('에테르 배율을 설정해야 함', () => {
      const result = createTurnEndPlayerState({ hp: 100 }, {
        comboUsageCount: {},
        etherPts: 10,
        etherMultiplier: 1.5
      });

      expect(result.etherMultiplier).toBe(1.5);
    });

    it('에테르 배율 기본값은 1이어야 함', () => {
      const result = createTurnEndPlayerState({ hp: 100 }, {
        comboUsageCount: {},
        etherPts: 10
      });

      expect(result.etherMultiplier).toBe(1);
    });

    it('기존 플레이어 속성을 유지해야 함', () => {
      const player = {
        hp: 75,
        maxHp: 100,
        strength: 3,
        name: 'Player'
      };

      const result = createTurnEndPlayerState(player, {
        comboUsageCount: {},
        etherPts: 10
      });

      expect(result.hp).toBe(75);
      expect(result.maxHp).toBe(100);
      expect(result.strength).toBe(3);
      expect(result.name).toBe('Player');
    });
  });

  describe('createTurnEndEnemyState', () => {
    it('방어 상태를 초기화해야 함', () => {
      const enemy = {
        hp: 100,
        block: 20,
        def: true,
        counter: 10
      };

      const result = createTurnEndEnemyState(enemy, {
        comboUsageCount: {},
        etherPts: 15
      });

      expect(result.block).toBe(0);
      expect(result.def).toBe(false);
      expect(result.counter).toBe(0);
    });

    it('취약 상태를 초기화해야 함', () => {
      const enemy = {
        hp: 100,
        vulnMult: 2,
        vulnTurns: 3
      };

      const result = createTurnEndEnemyState(enemy, {
        comboUsageCount: {},
        etherPts: 10
      });

      expect(result.vulnMult).toBe(1);
      expect(result.vulnTurns).toBe(0);
    });

    it('에테르 폭주를 비활성화해야 함', () => {
      const enemy = {
        hp: 100,
        etherOverdriveActive: true
      };

      const result = createTurnEndEnemyState(enemy, {
        comboUsageCount: {},
        etherPts: 10
      });

      expect(result.etherOverdriveActive).toBe(false);
    });

    it('유닛의 block도 초기화해야 함', () => {
      const enemy = {
        hp: 100,
        units: [
          { id: 'unit1', hp: 50, block: 10 },
          { id: 'unit2', hp: 30, block: 5 }
        ]
      };

      const result = createTurnEndEnemyState(enemy, {
        comboUsageCount: {},
        etherPts: 10
      });

      expect(result.units[0].block).toBe(0);
      expect(result.units[1].block).toBe(0);
      expect(result.units[0].hp).toBe(50); // HP 유지
    });

    it('유닛이 없으면 빈 배열 유지해야 함', () => {
      const enemy = { hp: 100, units: [] };

      const result = createTurnEndEnemyState(enemy, {
        comboUsageCount: {},
        etherPts: 10
      });

      expect(result.units).toEqual([]);
    });

    it('units 필드가 없으면 빈 배열로 처리해야 함', () => {
      const enemy = { hp: 100 };

      const result = createTurnEndEnemyState(enemy, {
        comboUsageCount: {},
        etherPts: 10
      });

      expect(result.units).toEqual([]);
    });

    it('음수 에테르 포인트는 0으로 처리해야 함', () => {
      const result = createTurnEndEnemyState({ hp: 100 }, {
        comboUsageCount: {},
        etherPts: -10
      });

      expect(result.etherPts).toBe(0);
    });
  });

  describe('checkVictoryCondition', () => {
    it('적 HP가 0이면 승리해야 함', () => {
      const result = checkVictoryCondition({ hp: 0 }, 100);

      expect(result.isVictory).toBe(true);
      expect(result.isEtherVictory).toBe(false);
      expect(result.delay).toBe(500);
    });

    it('적 에테르가 0이면 에테르 승리해야 함', () => {
      const result = checkVictoryCondition({ hp: 50 }, 0);

      expect(result.isVictory).toBe(true);
      expect(result.isEtherVictory).toBe(true);
      expect(result.delay).toBe(1200);
    });

    it('적 에테르가 음수면 에테르 승리해야 함', () => {
      const result = checkVictoryCondition({ hp: 50 }, -5);

      expect(result.isVictory).toBe(true);
      expect(result.isEtherVictory).toBe(true);
    });

    it('둘 다 만족하지 않으면 승리가 아니어야 함', () => {
      const result = checkVictoryCondition({ hp: 50 }, 100);

      expect(result.isVictory).toBe(false);
      expect(result.isEtherVictory).toBe(false);
    });

    it('HP와 에테르 둘 다 0이면 에테르 승리로 처리해야 함', () => {
      const result = checkVictoryCondition({ hp: 0 }, 0);

      expect(result.isVictory).toBe(true);
      expect(result.isEtherVictory).toBe(true);
      expect(result.delay).toBe(1200); // 에테르 승리 delay
    });
  });
});
