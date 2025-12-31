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

describe('티어별 적 목록', () => {
  it('TIER_1_ENEMIES에 올바른 적이 포함되어 있다', async () => {
    const { TIER_1_ENEMIES } = await import('./gameSimulator');
    expect(TIER_1_ENEMIES).toContain('ghoul');
    expect(TIER_1_ENEMIES).toContain('wildrat');
    expect(TIER_1_ENEMIES.length).toBeGreaterThanOrEqual(4);
  });

  it('TIER_2_ENEMIES에 올바른 적이 포함되어 있다', async () => {
    const { TIER_2_ENEMIES } = await import('./gameSimulator');
    expect(TIER_2_ENEMIES).toContain('deserter');
    expect(TIER_2_ENEMIES).toContain('hunter');
  });

  it('TIER_3_ENEMIES에 보스 적이 포함되어 있다', async () => {
    const { TIER_3_ENEMIES } = await import('./gameSimulator');
    expect(TIER_3_ENEMIES).toContain('slaughterer');
    expect(TIER_3_ENEMIES).toContain('captain');
  });

  it('ALL_ENEMIES에 모든 티어가 포함되어 있다', async () => {
    const { ALL_ENEMIES, TIER_1_ENEMIES, TIER_2_ENEMIES, TIER_3_ENEMIES } = await import('./gameSimulator');
    expect(ALL_ENEMIES.length).toBe(
      TIER_1_ENEMIES.length + TIER_2_ENEMIES.length + TIER_3_ENEMIES.length
    );
  });
});

describe('상징 효과 시뮬레이션', () => {
  it('상징을 장착한 시뮬레이션을 실행할 수 있다', () => {
    const config: SimulationConfig = {
      battles: 10,
      maxTurns: 30,
      enemyIds: ['ghoul'],
      playerRelics: ['sturdyArmor'],
    };

    const stats: SimulationStats = runSimulation(config);

    expect(stats.totalBattles).toBe(10);
    // sturdyArmor는 방어력을 제공하므로 승률에 긍정적 영향
    expect(stats.winRate).toBeGreaterThanOrEqual(0);
  });

  it('여러 상징을 장착한 시뮬레이션을 실행할 수 있다', () => {
    const config: SimulationConfig = {
      battles: 10,
      maxTurns: 30,
      enemyIds: ['ghoul'],
      playerRelics: ['sturdyArmor', 'trainingBoots'],
    };

    const stats: SimulationStats = runSimulation(config);

    expect(stats.totalBattles).toBe(10);
    expect(stats.avgPlayerFinalHp).toBeGreaterThanOrEqual(0);
  });

  it('상징 없이 시뮬레이션을 실행할 수 있다', () => {
    const config: SimulationConfig = {
      battles: 10,
      maxTurns: 30,
      enemyIds: ['ghoul'],
      playerRelics: [],
    };

    const stats: SimulationStats = runSimulation(config);

    expect(stats.totalBattles).toBe(10);
  });

  it('runRelicComparison 함수가 존재한다', async () => {
    const { runRelicComparison } = await import('./gameSimulator');
    expect(typeof runRelicComparison).toBe('function');
  });
});

describe('덱 비교 시뮬레이션', () => {
  it('DECK_PRESETS에 덱 프리셋이 정의되어 있다', async () => {
    const { DECK_PRESETS } = await import('./gameSimulator');
    expect(Object.keys(DECK_PRESETS).length).toBeGreaterThanOrEqual(4);
    expect(DECK_PRESETS.balanced).toBeDefined();
    expect(DECK_PRESETS.aggressive).toBeDefined();
    expect(DECK_PRESETS.defensive).toBeDefined();
  });

  it('덱 프리셋으로 시뮬레이션을 실행할 수 있다', async () => {
    const { DECK_PRESETS, runSimulation, SimulationConfig } = await import('./gameSimulator');

    const config: SimulationConfig = {
      battles: 10,
      maxTurns: 30,
      enemyIds: ['ghoul'],
      playerDeck: DECK_PRESETS.aggressive.cards,
    };

    const stats = runSimulation(config);

    expect(stats.totalBattles).toBe(10);
    expect(stats.winRate).toBeGreaterThanOrEqual(0);
  });

  it('runDeckComparison 함수가 존재한다', async () => {
    const { runDeckComparison } = await import('./gameSimulator');
    expect(typeof runDeckComparison).toBe('function');
  });
});

describe('이변 효과 시뮬레이션', () => {
  it('이변을 비활성화한 시뮬레이션을 실행할 수 있다', () => {
    const config: SimulationConfig = {
      battles: 10,
      maxTurns: 30,
      enemyIds: ['ghoul'],
      enableAnomalies: false,
    };

    const stats: SimulationStats = runSimulation(config);

    expect(stats.totalBattles).toBe(10);
  });

  it('특정 이변을 지정한 시뮬레이션을 실행할 수 있다', () => {
    const config: SimulationConfig = {
      battles: 10,
      maxTurns: 30,
      enemyIds: ['ghoul'],
      enableAnomalies: true,
      fixedAnomaly: 'energy_drain',
      mapRisk: 50,
    };

    const stats: SimulationStats = runSimulation(config);

    expect(stats.totalBattles).toBe(10);
  });

  it('runAnomalyComparison 함수가 존재한다', async () => {
    const { runAnomalyComparison } = await import('./gameSimulator');
    expect(typeof runAnomalyComparison).toBe('function');
  });
});

describe('카드 효율 분석', () => {
  it('runCardEfficiencyAnalysis 함수가 존재한다', async () => {
    const { runCardEfficiencyAnalysis } = await import('./gameSimulator');
    expect(typeof runCardEfficiencyAnalysis).toBe('function');
  });
});

describe('종합 리포트', () => {
  it('runFullReport 함수가 존재한다', async () => {
    const { runFullReport } = await import('./gameSimulator');
    expect(typeof runFullReport).toBe('function');
  });
});

describe('전투 리플레이 및 분석', () => {
  it('runBattleReplay 함수가 존재한다', async () => {
    const { runBattleReplay } = await import('./gameSimulator');
    expect(typeof runBattleReplay).toBe('function');
  });

  it('runEnemyAnalysis 함수가 존재한다', async () => {
    const { runEnemyAnalysis } = await import('./gameSimulator');
    expect(typeof runEnemyAnalysis).toBe('function');
  });
});

describe('카드 시너지 분석', () => {
  it('runSynergyAnalysis 함수가 존재한다', async () => {
    const { runSynergyAnalysis } = await import('./gameSimulator');
    expect(typeof runSynergyAnalysis).toBe('function');
  });
});

describe('난이도 스케일링 분석', () => {
  it('runDifficultyScalingAnalysis 함수가 존재한다', async () => {
    const { runDifficultyScalingAnalysis } = await import('./gameSimulator');
    expect(typeof runDifficultyScalingAnalysis).toBe('function');
  });
});

describe('승리 요인 분석', () => {
  it('runWinConditionAnalysis 함수가 존재한다', async () => {
    const { runWinConditionAnalysis } = await import('./gameSimulator');
    expect(typeof runWinConditionAnalysis).toBe('function');
  });
});

describe('결과 내보내기', () => {
  it('exportSimulationResults 함수가 존재한다', async () => {
    const { exportSimulationResults } = await import('./gameSimulator');
    expect(typeof exportSimulationResults).toBe('function');
  });

  it('결과 객체를 반환한다', async () => {
    const { exportSimulationResults } = await import('./gameSimulator');
    const result = exportSimulationResults(5);
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('enemies');
    expect(result.summary).toHaveProperty('winRate');
    expect(Array.isArray(result.enemies)).toBe(true);
  });
});

describe('토큰 효율 분석', () => {
  it('runTokenEfficiencyAnalysis 함수가 존재한다', async () => {
    const { runTokenEfficiencyAnalysis } = await import('./gameSimulator');
    expect(typeof runTokenEfficiencyAnalysis).toBe('function');
  });
});

describe('매치업 분석', () => {
  it('runMatchupAnalysis 함수가 존재한다', async () => {
    const { runMatchupAnalysis } = await import('./gameSimulator');
    expect(typeof runMatchupAnalysis).toBe('function');
  });
});

describe('속도 분석', () => {
  it('runSpeedAnalysis 함수가 존재한다', async () => {
    const { runSpeedAnalysis } = await import('./gameSimulator');
    expect(typeof runSpeedAnalysis).toBe('function');
  });
});

describe('특성 시너지 분석', () => {
  it('runTraitSynergyAnalysis 함수가 존재한다', async () => {
    const { runTraitSynergyAnalysis } = await import('./gameSimulator');
    expect(typeof runTraitSynergyAnalysis).toBe('function');
  });
});

describe('전략 추천', () => {
  it('runStrategyRecommendation 함수가 존재한다', async () => {
    const { runStrategyRecommendation } = await import('./gameSimulator');
    expect(typeof runStrategyRecommendation).toBe('function');
  });
});

describe('도움말', () => {
  it('printHelp 함수가 존재한다', async () => {
    const { printHelp } = await import('./gameSimulator');
    expect(typeof printHelp).toBe('function');
  });
});

describe('덱 비교', () => {
  it('runDeckCompare 함수가 존재한다', async () => {
    const { runDeckCompare } = await import('./gameSimulator');
    expect(typeof runDeckCompare).toBe('function');
  });
});

describe('벤치마크', () => {
  it('runBenchmark 함수가 존재한다', async () => {
    const { runBenchmark } = await import('./gameSimulator');
    expect(typeof runBenchmark).toBe('function');
  });
});

describe('랜덤 덱 테스터', () => {
  it('runRandomDeckTest 함수가 존재한다', async () => {
    const { runRandomDeckTest } = await import('./gameSimulator');
    expect(typeof runRandomDeckTest).toBe('function');
  });
});

describe('최적 카드 찾기', () => {
  it('runBestCardFinder 함수가 존재한다', async () => {
    const { runBestCardFinder } = await import('./gameSimulator');
    expect(typeof runBestCardFinder).toBe('function');
  });
});

describe('적 약점 분석', () => {
  it('runEnemyWeaknessAnalysis 함수가 존재한다', async () => {
    const { runEnemyWeaknessAnalysis } = await import('./gameSimulator');
    expect(typeof runEnemyWeaknessAnalysis).toBe('function');
  });
});

describe('다중 상징 콤보 테스트', () => {
  it('runMultiRelicTest 함수가 존재한다', async () => {
    const { runMultiRelicTest } = await import('./gameSimulator');
    expect(typeof runMultiRelicTest).toBe('function');
  });
});

describe('진행형 난이도 테스트', () => {
  it('runProgressionTest 함수가 존재한다', async () => {
    const { runProgressionTest } = await import('./gameSimulator');
    expect(typeof runProgressionTest).toBe('function');
  });
});

describe('카드 랭킹', () => {
  it('runCardRanking 함수가 존재한다', async () => {
    const { runCardRanking } = await import('./gameSimulator');
    expect(typeof runCardRanking).toBe('function');
  });
});

describe('상징 랭킹', () => {
  it('runRelicRanking 함수가 존재한다', async () => {
    const { runRelicRanking } = await import('./gameSimulator');
    expect(typeof runRelicRanking).toBe('function');
  });
});

describe('메타 분석', () => {
  it('runMetaAnalysis 함수가 존재한다', async () => {
    const { runMetaAnalysis } = await import('./gameSimulator');
    expect(typeof runMetaAnalysis).toBe('function');
  });
});

describe('턴 분석', () => {
  it('runTurnAnalysis 함수가 존재한다', async () => {
    const { runTurnAnalysis } = await import('./gameSimulator');
    expect(typeof runTurnAnalysis).toBe('function');
  });
});
