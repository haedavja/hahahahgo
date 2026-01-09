/**
 * @file gameSimulator.test.ts
 * @description 게임 시뮬레이터 테스트
 */

import { describe, it, expect } from 'vitest';
import { runBattle, runSimulation, SimulationConfig, BattleResult, SimulationStats } from './gameSimulator';

describe('게임 시뮬레이터', () => {
  describe('단일 전투', () => {
    it('구울과의 전투를 시뮬레이션할 수 있다', () => {
      const config: SimulationConfig = {
        battles: 1,
        maxTurns: 30,
      };

      const result: BattleResult = runBattle('ghoul', config);

      expect(result).toHaveProperty('winner');
      expect(['player', 'enemy', 'draw']).toContain(result.winner);
      expect(result.turns).toBeGreaterThan(0);
      expect(result.turns).toBeLessThanOrEqual(30);
      expect(result.log.length).toBeGreaterThan(0);
    });

    it('약탈자와의 전투를 시뮬레이션할 수 있다', () => {
      const config: SimulationConfig = {
        battles: 1,
        maxTurns: 30,
      };

      const result: BattleResult = runBattle('marauder', config);

      expect(result.winner).toBeDefined();
      expect(result.playerDamageDealt).toBeGreaterThanOrEqual(0);
      expect(result.enemyDamageDealt).toBeGreaterThanOrEqual(0);
    });

    it('탈영병과의 전투를 시뮬레이션할 수 있다', () => {
      const config: SimulationConfig = {
        battles: 1,
        maxTurns: 50,
      };

      const result: BattleResult = runBattle('deserter', config);

      expect(result.winner).toBeDefined();
      expect(result.turns).toBeGreaterThan(0);
    });

    it('들쥐와의 전투를 시뮬레이션할 수 있다', () => {
      const config: SimulationConfig = {
        battles: 1,
        maxTurns: 30,
      };

      const result: BattleResult = runBattle('wildrat', config);

      expect(result.winner).toBeDefined();
      // 들쥐는 약한 적이므로 플레이어가 자주 이겨야 함
    });

    it('폭주자와의 전투를 시뮬레이션할 수 있다', () => {
      const config: SimulationConfig = {
        battles: 1,
        maxTurns: 30,
      };

      const result: BattleResult = runBattle('berserker', config);

      expect(result.winner).toBeDefined();
    });
  });

  describe('다중 전투 시뮬레이션', () => {
    it('10회 전투 시뮬레이션을 실행할 수 있다', () => {
      const config: SimulationConfig = {
        battles: 10,
        maxTurns: 30,
        enemyIds: ['ghoul'],
      };

      const stats: SimulationStats = runSimulation(config);

      expect(stats.totalBattles).toBe(10);
      expect(stats.playerWins + stats.enemyWins + stats.draws).toBe(10);
      expect(stats.winRate).toBeGreaterThanOrEqual(0);
      expect(stats.winRate).toBeLessThanOrEqual(1);
    });

    it('여러 적에 대해 시뮬레이션을 실행할 수 있다', () => {
      const config: SimulationConfig = {
        battles: 30,
        maxTurns: 30,
        enemyIds: ['ghoul', 'marauder', 'wildrat'],
      };

      const stats: SimulationStats = runSimulation(config);

      expect(stats.totalBattles).toBeGreaterThanOrEqual(30);
      expect(Object.keys(stats.enemyStats).length).toBe(3);

      // 각 적에 대한 통계가 있어야 함
      expect(stats.enemyStats['ghoul']).toBeDefined();
      expect(stats.enemyStats['marauder']).toBeDefined();
      expect(stats.enemyStats['wildrat']).toBeDefined();
    });

    it('평균 통계가 합리적인 범위 내에 있다', () => {
      const config: SimulationConfig = {
        battles: 20,
        maxTurns: 30,
        enemyIds: ['ghoul', 'marauder'],
      };

      const stats: SimulationStats = runSimulation(config);

      expect(stats.avgTurns).toBeGreaterThan(0);
      expect(stats.avgTurns).toBeLessThanOrEqual(30);
      expect(stats.avgPlayerDamageDealt).toBeGreaterThanOrEqual(0);
      expect(stats.avgEnemyDamageDealt).toBeGreaterThanOrEqual(0);
    });
  });

  describe('밸런스 테스트', () => {
    it('약한 적(들쥐)에 대해 높은 승률을 보인다', () => {
      const config: SimulationConfig = {
        battles: 50,
        maxTurns: 30,
        enemyIds: ['wildrat'],
      };

      const stats: SimulationStats = runSimulation(config);

      // 들쥐는 HP 12로 매우 약하므로 80% 이상 승률 예상
      expect(stats.winRate).toBeGreaterThan(0.7);
    });

    it('중간 적(구울)에 대해 적당한 승률을 보인다', () => {
      const config: SimulationConfig = {
        battles: 50,
        maxTurns: 30,
        enemyIds: ['ghoul'],
      };

      const stats: SimulationStats = runSimulation(config);

      // 구울은 HP 40으로 적당하므로 50% 이상 승률 예상
      expect(stats.winRate).toBeGreaterThan(0.4);
    });
  });

  describe('커스텀 덱 테스트', () => {
    it('공격 위주 덱으로 전투할 수 있다', () => {
      const config: SimulationConfig = {
        battles: 10,
        maxTurns: 30,
        enemyIds: ['ghoul'],
        playerDeck: ['strike', 'strike', 'strike', 'shoot', 'shoot', 'lunge'],
      };

      const stats: SimulationStats = runSimulation(config);

      expect(stats.totalBattles).toBe(10);
      expect(stats.avgPlayerDamageDealt).toBeGreaterThan(0);
    });

    it('방어 위주 덱으로 전투할 수 있다', () => {
      const config: SimulationConfig = {
        battles: 10,
        maxTurns: 30,
        enemyIds: ['ghoul'],
        playerDeck: ['deflect', 'deflect', 'octave', 'quarte', 'guard', 'guard'],
      };

      const stats: SimulationStats = runSimulation(config);

      expect(stats.totalBattles).toBe(10);
    });

    it('커스텀 HP로 전투할 수 있다', () => {
      const config: SimulationConfig = {
        battles: 10,
        maxTurns: 30,
        enemyIds: ['ghoul'],
        playerHp: 200,
      };

      const stats: SimulationStats = runSimulation(config);

      // 높은 HP로 인해 승률이 높아야 함
      expect(stats.winRate).toBeGreaterThan(0.5);
    });
  });
});

describe('밸런스 분석 (스냅샷)', () => {
  it('전체 적에 대한 밸런스 테스트', () => {
    const config: SimulationConfig = {
      battles: 100,
      maxTurns: 30,
      enemyIds: ['ghoul', 'marauder', 'wildrat', 'berserker', 'polluted', 'deserter'],
    };

    const stats: SimulationStats = runSimulation(config);

    // 콘솔에 결과 출력 (CI에서 확인용)
    console.log('\n📊 밸런스 분석 결과:');
    console.log(`총 전투: ${stats.totalBattles}`);
    console.log(`전체 승률: ${(stats.winRate * 100).toFixed(1)}%`);
    console.log(`평균 턴: ${stats.avgTurns.toFixed(1)}`);
    console.log('\n적별 승률:');
    for (const [enemyId, enemyStat] of Object.entries(stats.enemyStats)) {
      console.log(`  ${enemyId}: ${(enemyStat.winRate * 100).toFixed(1)}%`);
    }

    // 기본 검증
    expect(stats.totalBattles).toBeGreaterThanOrEqual(100);
    expect(stats.winRate).toBeGreaterThanOrEqual(0);
    expect(stats.winRate).toBeLessThanOrEqual(1);
  });
});

describe('콤보 통계', () => {
  it('시뮬레이션에서 콤보 통계가 수집된다', () => {
    const config: SimulationConfig = {
      battles: 30,
      maxTurns: 30,
      enemyIds: ['ghoul'],
    };

    const stats: SimulationStats = runSimulation(config);

    // comboStats가 존재해야 함
    expect(stats.comboStats).toBeDefined();

    // 콤보가 발생했다면 통계가 있어야 함
    const comboCount = Object.keys(stats.comboStats).length;
    if (comboCount > 0) {
      const firstCombo = Object.values(stats.comboStats)[0];
      expect(firstCombo.count).toBeGreaterThan(0);
      expect(firstCombo.avgPerBattle).toBeGreaterThan(0);
    }
  });

  it('단일 전투에서 콤보가 기록된다', () => {
    const config: SimulationConfig = {
      battles: 1,
      maxTurns: 30,
    };

    const result = runBattle('ghoul', config);

    // combosFormed가 존재해야 함
    expect(result.combosFormed).toBeDefined();
    expect(typeof result.combosFormed).toBe('object');
  });
});

