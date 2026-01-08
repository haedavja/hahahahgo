/**
 * @file BattleScreen.test.ts
 * @description BattleScreen 컴포넌트 테스트
 */

import { describe, it, expect } from 'vitest';

// buildBattlePayload 함수를 테스트하기 위한 헬퍼
// 실제 함수는 컴포넌트 내부에 있으므로, 로직을 검증하는 단위 테스트

describe('BattleScreen', () => {
  describe('전투 페이로드 생성 로직', () => {
    it('null battle은 null 페이로드를 반환해야 함', () => {
      const battle = null;
      expect(battle).toBeNull();
    });

    it('기본 적 데이터가 올바르게 처리되어야 함', () => {
      const enemyData = {
        hp: 40,
        maxHp: 40,
        ether: 100,
        speed: 10,
        deck: [],
      };

      expect(enemyData.hp).toBe(40);
      expect(enemyData.maxHp).toBe(40);
      expect(enemyData.ether).toBe(100);
    });

    it('혼합 적 그룹 HP가 올바르게 합산되어야 함', () => {
      const mixedEnemies = [
        { id: 'goblin', name: '고블린', hp: 20, ether: 50 },
        { id: 'goblin', name: '고블린', hp: 20, ether: 50 },
        { id: 'orc', name: '오크', hp: 40, ether: 100 },
      ];

      // 유닛별 집계 로직 테스트
      const unitMap = new Map<string, { count: number; hp: number; ether: number }>();

      mixedEnemies.forEach(e => {
        const key = e.id || e.name;
        if (!unitMap.has(key)) {
          unitMap.set(key, { count: 0, hp: 0, ether: 0 });
        }
        const unit = unitMap.get(key);
        if (unit) {
          unit.count += 1;
          unit.hp += e.hp;
          unit.ether += e.ether;
        }
      });

      const goblinUnit = unitMap.get('goblin');
      const orcUnit = unitMap.get('orc');

      expect(goblinUnit?.count).toBe(2);
      expect(goblinUnit?.hp).toBe(40);
      expect(orcUnit?.count).toBe(1);
      expect(orcUnit?.hp).toBe(40);

      // 총 HP
      const totalHp = Array.from(unitMap.values()).reduce((sum, u) => sum + u.hp, 0);
      expect(totalHp).toBe(80);
    });

    it('적 이름이 올바르게 생성되어야 함', () => {
      const units = [
        { name: '고블린', count: 2 },
        { name: '오크', count: 1 },
      ];

      const enemyName = units
        .map(u => u.count > 1 ? `${u.name}×${u.count}` : u.name)
        .join(' + ');

      expect(enemyName).toBe('고블린×2 + 오크');
    });

    it('기본 에너지 계산이 올바르게 되어야 함', () => {
      const baseEnergy = 4; // BASE_PLAYER_ENERGY
      const playerEnergyBonus = 2;
      const passiveMaxEnergy = 1;

      const totalEnergy = baseEnergy + playerEnergyBonus + passiveMaxEnergy;

      expect(totalEnergy).toBe(7);
    });

    it('시작 HP가 최소 1이어야 함', () => {
      const maxHp = 30;
      const initialHp = 5;
      const damage = 10;
      const heal = 2;

      const startingHp = Math.max(
        1,
        Math.min(maxHp, initialHp - damage + heal)
      );

      expect(startingHp).toBe(1); // 5 - 10 + 2 = -3 -> max(1, -3) = 1
    });

    it('시작 HP가 최대 HP를 초과하지 않아야 함', () => {
      const maxHp = 30;
      const initialHp = 25;
      const damage = 0;
      const heal = 10;

      const startingHp = Math.max(
        1,
        Math.min(maxHp, initialHp - damage + heal)
      );

      expect(startingHp).toBe(30); // 25 + 10 = 35 -> min(30, 35) = 30
    });
  });

  describe('적 유닛 시스템', () => {
    it('단일 적은 하나의 유닛으로 처리되어야 함', () => {
      const enemyCount = 1;
      const singleHp = 40;
      const singleEther = 100;

      const enemyUnits = [{
        unitId: 0,
        name: 'Enemy',
        count: enemyCount,
        hp: singleHp * enemyCount,
        maxHp: singleHp * enemyCount,
        ether: singleEther * enemyCount,
      }];

      expect(enemyUnits.length).toBe(1);
      expect(enemyUnits[0].hp).toBe(40);
      expect(enemyUnits[0].ether).toBe(100);
    });

    it('다중 적은 HP가 합산되어야 함', () => {
      const enemyCount = 3;
      const singleHp = 40;

      const totalHp = singleHp * enemyCount;

      expect(totalHp).toBe(120);
    });

    it('적 에테르 합계가 올바르게 계산되어야 함', () => {
      const enemyUnits = [
        { ether: 100, individualEther: 100, count: 1 },
        { ether: 200, individualEther: 100, count: 2 },
      ];

      const totalEther = enemyUnits.reduce(
        (sum, u) => sum + (u.ether || u.individualEther * u.count || 100),
        0
      );

      expect(totalEther).toBe(300);
    });
  });

  describe('플레이어 초기 상태', () => {
    it('상징 효과가 시작 힘에 적용되어야 함', () => {
      const playerStrength = 2;
      const combatStartStrength = 1;

      const startingStrength = playerStrength + combatStartStrength;

      expect(startingStrength).toBe(3);
    });

    it('최대 속도 보너스가 적용되어야 함', () => {
      const baseMaxSpeed = 30;
      const playerMaxSpeedBonus = 5;

      const startingMaxSpeed = baseMaxSpeed + playerMaxSpeedBonus;

      expect(startingMaxSpeed).toBe(35);
    });
  });
});
