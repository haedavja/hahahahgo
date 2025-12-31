#!/usr/bin/env npx tsx
/**
 * @file runSimulator.ts
 * @description 게임 시뮬레이터 CLI 실행 스크립트
 *
 * 사용법:
 *   npx tsx scripts/runSimulator.ts [battles] [enemies...]
 *   npx tsx scripts/runSimulator.ts balance [battles]     # 밸런스 분석
 *   npx tsx scripts/runSimulator.ts tier [1|2|3] [battles] # 티어별 시뮬
 *   npx tsx scripts/runSimulator.ts full [battles]        # 전체 시뮬
 *   npx tsx scripts/runSimulator.ts relic [battles]       # 상징 효과 비교
 *   npx tsx scripts/runSimulator.ts deck [battles]        # 덱 전략 비교
 *   npx tsx scripts/runSimulator.ts anomaly [battles]     # 이변 효과 비교
 *   npx tsx scripts/runSimulator.ts card [battles]        # 카드 효율 분석
 *   npx tsx scripts/runSimulator.ts report [battles]      # 종합 리포트
 *   npx tsx scripts/runSimulator.ts replay [enemyId]      # 전투 리플레이
 *   npx tsx scripts/runSimulator.ts analyze [enemyId] [battles] # 적 분석
 *   npx tsx scripts/runSimulator.ts synergy [battles]     # 카드 시너지 분석
 *   npx tsx scripts/runSimulator.ts scaling [battles]     # 난이도 스케일링 분석
 *   npx tsx scripts/runSimulator.ts wincond [battles]     # 승리 요인 분석
 *   npx tsx scripts/runSimulator.ts export [battles] [filename] # 결과 내보내기
 *   npx tsx scripts/runSimulator.ts token [battles]       # 토큰 효율 분석
 *   npx tsx scripts/runSimulator.ts matchup [deck] [enemy] [battles] # 매치업 분석
 *   npx tsx scripts/runSimulator.ts speed [battles]       # 속도 분석
 *   npx tsx scripts/runSimulator.ts trait [battles]       # 특성 시너지 분석
 *   npx tsx scripts/runSimulator.ts recommend [enemyId] [battles] # 전략 추천
 *   npx tsx scripts/runSimulator.ts weakness [enemyId] [battles] # 적 약점 분석
 *   npx tsx scripts/runSimulator.ts multirelic [battles]  # 다중 상징 콤보 테스트
 *   npx tsx scripts/runSimulator.ts progression [runs]    # 진행형 난이도 테스트
 *   npx tsx scripts/runSimulator.ts cardrank [battles]    # 카드 랭킹
 *   npx tsx scripts/runSimulator.ts relicrank [battles]   # 상징 랭킹
 *   npx tsx scripts/runSimulator.ts meta [battles]        # 메타 분석
 *   npx tsx scripts/runSimulator.ts turn [battles]        # 턴 분석
 *   npx tsx scripts/runSimulator.ts damage [battles]      # 데미지 분석
 *   npx tsx scripts/runSimulator.ts healing [battles]     # 힐링 분석
 *   npx tsx scripts/runSimulator.ts combobreak [battles]  # 콤보 빈도 분석
 *   npx tsx scripts/runSimulator.ts stress [battles]      # 스트레스 테스트
 *   npx tsx scripts/runSimulator.ts prob                  # 확률 분석
 *   npx tsx scripts/runSimulator.ts versatility [battles] # 다양성 분석
 *   npx tsx scripts/runSimulator.ts consistency [trials] [battles] # 일관성 분석
 *   npx tsx scripts/runSimulator.ts patchnotes [battles]  # 패치 노트 생성
 *   npx tsx scripts/runSimulator.ts edge                  # 에지 케이스 테스트
 *   npx tsx scripts/runSimulator.ts quickcheck            # 빠른 상태 체크
 *   npx tsx scripts/runSimulator.ts aitest [battles]      # AI 테스트
 *   npx tsx scripts/runSimulator.ts timetrial [battles]   # 시간 기록 테스트
 *   npx tsx scripts/runSimulator.ts summary               # 전체 요약
 *   npx tsx scripts/runSimulator.ts deckbuilder [enemy] [battles] # AI 덱 빌더
 *   npx tsx scripts/runSimulator.ts whatif                # What-If 분석
 *   npx tsx scripts/runSimulator.ts csv [battles] [filename] # CSV 내보내기
 *   npx tsx scripts/runSimulator.ts heatmap [battles]     # 히트맵 분석
 *   npx tsx scripts/runSimulator.ts counter [battles]     # 카운터 전략 분석
 *   npx tsx scripts/runSimulator.ts resource [battles]    # 자원 관리 분석
 *   npx tsx scripts/runSimulator.ts longbattle [battles]  # 장기전 분석
 *   npx tsx scripts/runSimulator.ts burst [battles]       # 순간 폭딜 분석
 *   npx tsx scripts/runSimulator.ts randevent [trials]    # 랜덤 이벤트 분석
 *   npx tsx scripts/runSimulator.ts dummy [scale]         # 더미 데이터 테스트
 *   npx tsx scripts/runSimulator.ts cyclic [battles]      # 주기 분석
 *   npx tsx scripts/runSimulator.ts milestone [battles]   # 마일스톤 분석
 *   npx tsx scripts/runSimulator.ts comboopt [battles]    # 콤보 최적화 분석
 *   npx tsx scripts/runSimulator.ts endurance [battles]   # 내구력 테스트
 *   npx tsx scripts/runSimulator.ts balscore              # 밸런스 점수 계산
 *   npx tsx scripts/runSimulator.ts draw [battles]        # 드로우 분석
 *   npx tsx scripts/runSimulator.ts affinity [battles]    # 속성상성 분석
 *   npx tsx scripts/runSimulator.ts economy [battles]     # 턴경제 분석
 *   npx tsx scripts/runSimulator.ts risk [battles]        # 위험도 분석
 *   npx tsx scripts/runSimulator.ts adapt [battles]       # 적응력 테스트
 *   npx tsx scripts/runSimulator.ts tokensynergy [battles] # 토큰 시너지 분석
 *   npx tsx scripts/runSimulator.ts composition [battles] # 카드 편성 분석
 *   npx tsx scripts/runSimulator.ts keyword               # 키워드 분석
 *   npx tsx scripts/runSimulator.ts optimal [battles]     # 최적 전략 분석
 *   npx tsx scripts/runSimulator.ts burstpot [battles]    # 폭발력 분석
 *   npx tsx scripts/runSimulator.ts stratcmp [battles]    # 전략 비교 분석
 *   npx tsx scripts/runSimulator.ts absorb [battles]      # 피해 흡수 분석
 *   npx tsx scripts/runSimulator.ts killchain [battles]   # 연속 킬 분석
 *   npx tsx scripts/runSimulator.ts help                  # 도움말
 *
 * 예시:
 *   npx tsx scripts/runSimulator.ts 100
 *   npx tsx scripts/runSimulator.ts 200 ghoul marauder
 *   npx tsx scripts/runSimulator.ts balance 50
 *   npx tsx scripts/runSimulator.ts tier 2 100
 *   npx tsx scripts/runSimulator.ts full 30
 *   npx tsx scripts/runSimulator.ts relic 100
 *   npx tsx scripts/runSimulator.ts deck 50
 *   npx tsx scripts/runSimulator.ts anomaly 50
 *   npx tsx scripts/runSimulator.ts card 30
 *   npx tsx scripts/runSimulator.ts report 20
 *   npx tsx scripts/runSimulator.ts replay deserter
 *   npx tsx scripts/runSimulator.ts analyze slaughterer 30
 *   npx tsx scripts/runSimulator.ts synergy 30
 *   npx tsx scripts/runSimulator.ts scaling 50
 *   npx tsx scripts/runSimulator.ts wincond 50
 *   npx tsx scripts/runSimulator.ts export 30 results.json
 *   npx tsx scripts/runSimulator.ts token 30
 *   npx tsx scripts/runSimulator.ts matchup aggressive deserter 50
 *   npx tsx scripts/runSimulator.ts speed 30
 *   npx tsx scripts/runSimulator.ts trait 30
 */

import { runSimulation, printStats, SimulationConfig, runBalanceAnalysis, runTierSimulation, runFullSimulation, runRelicComparison, runDeckComparison, runAnomalyComparison, runCardEfficiencyAnalysis, runFullReport, runBattleReplay, runEnemyAnalysis, runSynergyAnalysis, runDifficultyScalingAnalysis, runWinConditionAnalysis, exportSimulationResults, runTokenEfficiencyAnalysis, runMatchupAnalysis, runSpeedAnalysis, runTraitSynergyAnalysis, runStrategyRecommendation, printHelp, runDeckCompare, runBenchmark, runRandomDeckTest, runBestCardFinder, runEnemyWeaknessAnalysis, runMultiRelicTest, runProgressionTest, runCardRanking, runRelicRanking, runMetaAnalysis, runTurnAnalysis, runDamageAnalysis, runHealingAnalysis, runComboBreakdown, runStressTest, runProbabilityAnalysis, runVersatilityAnalysis, runConsistencyAnalysis, generatePatchNotes, runEdgeCaseTest, runQuickCheck, runAITest, runTimeTrialTest, runSummary, runDeckBuilder, runWhatIfAnalysis, exportToCSV, runHeatmapAnalysis, runCounterAnalysis, runResourceManagement, runLongBattleAnalysis, runBurstDamageAnalysis, runRandomEventAnalysis, runDummyDataTest, runCyclicAnalysis, runMilestoneAnalysis, runComboOptimization, runEnduranceTest, runBalanceScore, runDrawAnalysis, runAttributeAffinity, runTurnEconomy, runRiskAssessment, runAdaptabilityTest, runTokenSynergy, runCompositionAnalysis, runKeywordAnalysis, runOptimalStrategy, runBurstPotential, runStrategyComparison, runDamageAbsorption, runKillChainAnalysis, TIER_1_ENEMIES, TIER_2_ENEMIES, TIER_3_ENEMIES } from '../src/tests/gameSimulator';
import { ENEMIES } from '../src/components/battle/battleData';

// 커맨드 라인 인자 파싱
const args = process.argv.slice(2);
const command = args[0];

// 특수 명령어 처리
if (command === 'balance') {
  const battles = parseInt(args[1]) || 100;
  console.log('🎮 밸런스 분석 모드\n');
  runBalanceAnalysis(battles);
  process.exit(0);
}

if (command === 'tier') {
  const tier = parseInt(args[1]) as 1 | 2 | 3;
  const battles = parseInt(args[2]) || 100;
  if (![1, 2, 3].includes(tier)) {
    console.error('❌ 티어는 1, 2, 3 중 하나여야 합니다.');
    process.exit(1);
  }
  runTierSimulation(tier, battles);
  process.exit(0);
}

if (command === 'full') {
  const battlesPerEnemy = parseInt(args[1]) || 50;
  runFullSimulation(battlesPerEnemy);
  process.exit(0);
}

if (command === 'relic') {
  const battles = parseInt(args[1]) || 50;
  console.log('🎮 상징 효과 비교 모드\n');
  runRelicComparison(battles);
  process.exit(0);
}

if (command === 'deck') {
  const battles = parseInt(args[1]) || 50;
  console.log('🎮 덱 전략 비교 모드\n');
  runDeckComparison(battles);
  process.exit(0);
}

if (command === 'anomaly') {
  const battles = parseInt(args[1]) || 50;
  console.log('🎮 이변 효과 비교 모드\n');
  runAnomalyComparison(battles);
  process.exit(0);
}

if (command === 'card') {
  const battles = parseInt(args[1]) || 30;
  console.log('🎮 카드 효율 분석 모드\n');
  runCardEfficiencyAnalysis(battles);
  process.exit(0);
}

if (command === 'report') {
  const battles = parseInt(args[1]) || 20;
  console.log('🎮 종합 리포트 생성 모드\n');
  runFullReport(battles);
  process.exit(0);
}

if (command === 'replay') {
  const enemyId = args[1] || 'ghoul';
  console.log('🎮 전투 리플레이 모드\n');
  runBattleReplay(enemyId);
  process.exit(0);
}

if (command === 'analyze') {
  const enemyId = args[1] || 'ghoul';
  const battles = parseInt(args[2]) || 20;
  console.log('🎮 적 분석 모드\n');
  runEnemyAnalysis(enemyId, battles);
  process.exit(0);
}

if (command === 'synergy') {
  const battles = parseInt(args[1]) || 20;
  console.log('🎮 카드 시너지 분석 모드\n');
  runSynergyAnalysis(battles);
  process.exit(0);
}

if (command === 'scaling') {
  const battles = parseInt(args[1]) || 30;
  console.log('🎮 난이도 스케일링 분석 모드\n');
  runDifficultyScalingAnalysis(battles);
  process.exit(0);
}

if (command === 'wincond') {
  const battles = parseInt(args[1]) || 50;
  console.log('🎮 승리 요인 분석 모드\n');
  runWinConditionAnalysis(battles);
  process.exit(0);
}

if (command === 'export') {
  const battles = parseInt(args[1]) || 30;
  const filename = args[2] || 'simulation_results.json';
  console.log('🎮 결과 내보내기 모드\n');
  exportSimulationResults(battles, filename);
  process.exit(0);
}

if (command === 'token') {
  const battles = parseInt(args[1]) || 30;
  console.log('🎮 토큰 효율 분석 모드\n');
  runTokenEfficiencyAnalysis(battles);
  process.exit(0);
}

if (command === 'matchup') {
  const deckName = args[1] || 'balanced';
  const enemyId = args[2] || 'ghoul';
  const battles = parseInt(args[3]) || 50;
  console.log('🎮 매치업 분석 모드\n');
  runMatchupAnalysis(deckName, enemyId, battles);
  process.exit(0);
}

if (command === 'speed') {
  const battles = parseInt(args[1]) || 30;
  console.log('🎮 속도 분석 모드\n');
  runSpeedAnalysis(battles);
  process.exit(0);
}

if (command === 'trait') {
  const battles = parseInt(args[1]) || 30;
  console.log('🎮 특성 시너지 분석 모드\n');
  runTraitSynergyAnalysis(battles);
  process.exit(0);
}

if (command === 'recommend') {
  const enemyId = args[1] || 'ghoul';
  const battles = parseInt(args[2]) || 30;
  console.log('🎮 전략 추천 모드\n');
  runStrategyRecommendation(enemyId, battles);
  process.exit(0);
}

if (command === 'help' || command === '-h' || command === '--help') {
  printHelp();
  process.exit(0);
}

if (command === 'compare') {
  const deck1 = args[1] || 'balanced';
  const deck2 = args[2] || 'aggressive';
  const battles = parseInt(args[3]) || 50;
  console.log('🎮 덱 비교 모드\n');
  runDeckCompare(deck1, deck2, battles);
  process.exit(0);
}

if (command === 'benchmark') {
  const iterations = parseInt(args[1]) || 100;
  console.log('🎮 벤치마크 모드\n');
  runBenchmark(iterations);
  process.exit(0);
}

if (command === 'random') {
  const trials = parseInt(args[1]) || 10;
  const battles = parseInt(args[2]) || 20;
  console.log('🎮 랜덤 덱 테스터 모드\n');
  runRandomDeckTest(trials, battles);
  process.exit(0);
}

if (command === 'bestcard') {
  const deckName = args[1] || 'balanced';
  const battles = parseInt(args[2]) || 20;
  console.log('🎮 최적 카드 찾기 모드\n');
  runBestCardFinder(deckName, battles);
  process.exit(0);
}

if (command === 'weakness') {
  const enemyId = args[1] || 'ghoul';
  const battles = parseInt(args[2]) || 30;
  console.log('🎮 적 약점 분석 모드\n');
  runEnemyWeaknessAnalysis(enemyId, battles);
  process.exit(0);
}

if (command === 'multirelic') {
  const battles = parseInt(args[1]) || 30;
  console.log('🎮 다중 상징 콤보 테스트 모드\n');
  runMultiRelicTest(battles);
  process.exit(0);
}

if (command === 'progression') {
  const runs = parseInt(args[1]) || 20;
  console.log('🎮 진행형 난이도 테스트 모드\n');
  runProgressionTest(runs);
  process.exit(0);
}

if (command === 'cardrank') {
  const battles = parseInt(args[1]) || 20;
  console.log('🎮 카드 랭킹 모드\n');
  runCardRanking(battles);
  process.exit(0);
}

if (command === 'relicrank') {
  const battles = parseInt(args[1]) || 30;
  console.log('🎮 상징 랭킹 모드\n');
  runRelicRanking(battles);
  process.exit(0);
}

if (command === 'meta') {
  const battles = parseInt(args[1]) || 30;
  console.log('🎮 메타 분석 모드\n');
  runMetaAnalysis(battles);
  process.exit(0);
}

if (command === 'turn') {
  const battles = parseInt(args[1]) || 30;
  console.log('🎮 턴 분석 모드\n');
  runTurnAnalysis(battles);
  process.exit(0);
}

if (command === 'damage') {
  const battles = parseInt(args[1]) || 30;
  console.log('🎮 데미지 분석 모드\n');
  runDamageAnalysis(battles);
  process.exit(0);
}

if (command === 'healing') {
  const battles = parseInt(args[1]) || 30;
  console.log('🎮 힐링 분석 모드\n');
  runHealingAnalysis(battles);
  process.exit(0);
}

if (command === 'combobreak') {
  const battles = parseInt(args[1]) || 50;
  console.log('🎮 콤보 빈도 분석 모드\n');
  runComboBreakdown(battles);
  process.exit(0);
}

if (command === 'stress') {
  const battles = parseInt(args[1]) || 1000;
  console.log('🎮 스트레스 테스트 모드\n');
  runStressTest(battles);
  process.exit(0);
}

if (command === 'prob') {
  console.log('🎮 확률 분석 모드\n');
  runProbabilityAnalysis();
  process.exit(0);
}

if (command === 'versatility') {
  const battles = parseInt(args[1]) || 20;
  console.log('🎮 다양성 분석 모드\n');
  runVersatilityAnalysis(battles);
  process.exit(0);
}

if (command === 'consistency') {
  const trials = parseInt(args[1]) || 10;
  const battles = parseInt(args[2]) || 30;
  console.log('🎮 일관성 분석 모드\n');
  runConsistencyAnalysis(trials, battles);
  process.exit(0);
}

if (command === 'patchnotes') {
  const battles = parseInt(args[1]) || 30;
  console.log('🎮 패치 노트 생성 모드\n');
  generatePatchNotes(battles);
  process.exit(0);
}

if (command === 'edge') {
  console.log('🎮 에지 케이스 테스트 모드\n');
  runEdgeCaseTest();
  process.exit(0);
}

if (command === 'quickcheck') {
  console.log('🎮 빠른 상태 체크 모드\n');
  runQuickCheck();
  process.exit(0);
}

if (command === 'aitest') {
  const battles = parseInt(args[1]) || 20;
  console.log('🎮 AI 테스트 모드\n');
  runAITest(battles);
  process.exit(0);
}

if (command === 'timetrial') {
  const battles = parseInt(args[1]) || 50;
  console.log('🎮 시간 기록 테스트 모드\n');
  runTimeTrialTest(battles);
  process.exit(0);
}

if (command === 'summary') {
  console.log('🎮 전체 요약 모드\n');
  runSummary();
  process.exit(0);
}

if (command === 'deckbuilder') {
  const enemyId = args[1] || 'ghoul';
  const battles = parseInt(args[2]) || 20;
  console.log('🎮 AI 덱 빌더 모드\n');
  runDeckBuilder(enemyId, battles);
  process.exit(0);
}

if (command === 'whatif') {
  console.log('🎮 What-If 분석 모드\n');
  runWhatIfAnalysis();
  process.exit(0);
}

if (command === 'csv') {
  const battles = parseInt(args[1]) || 30;
  const filename = args[2] || 'sim_results.csv';
  console.log('🎮 CSV 내보내기 모드\n');
  exportToCSV(battles, filename);
  process.exit(0);
}

if (command === 'heatmap') {
  const battles = parseInt(args[1]) || 15;
  console.log('🎮 히트맵 분석 모드\n');
  runHeatmapAnalysis(battles);
  process.exit(0);
}

if (command === 'counter') {
  const battles = parseInt(args[1]) || 20;
  console.log('🎮 카운터 전략 분석 모드\n');
  runCounterAnalysis(battles);
  process.exit(0);
}

if (command === 'resource') {
  const battles = parseInt(args[1]) || 30;
  console.log('🎮 자원 관리 분석 모드\n');
  runResourceManagement(battles);
  process.exit(0);
}

if (command === 'longbattle') {
  const battles = parseInt(args[1]) || 30;
  console.log('🎮 장기전 분석 모드\n');
  runLongBattleAnalysis(battles);
  process.exit(0);
}

if (command === 'burst') {
  const battles = parseInt(args[1]) || 30;
  console.log('🎮 순간 폭딜 분석 모드\n');
  runBurstDamageAnalysis(battles);
  process.exit(0);
}

if (command === 'randevent') {
  const trials = parseInt(args[1]) || 10;
  console.log('🎮 랜덤 이벤트 분석 모드\n');
  runRandomEventAnalysis(trials);
  process.exit(0);
}

if (command === 'dummy') {
  const scale = parseInt(args[1]) || 100;
  console.log('🎮 더미 데이터 테스트 모드\n');
  runDummyDataTest(scale);
  process.exit(0);
}

if (command === 'cyclic') {
  const battles = parseInt(args[1]) || 50;
  console.log('🎮 주기 분석 모드\n');
  runCyclicAnalysis(battles);
  process.exit(0);
}

if (command === 'milestone') {
  const battles = parseInt(args[1]) || 30;
  console.log('🎮 마일스톤 분석 모드\n');
  runMilestoneAnalysis(battles);
  process.exit(0);
}

if (command === 'comboopt') {
  const battles = parseInt(args[1]) || 30;
  console.log('🎮 콤보 최적화 분석 모드\n');
  runComboOptimization(battles);
  process.exit(0);
}

if (command === 'endurance') {
  const battles = parseInt(args[1]) || 50;
  console.log('🎮 내구력 테스트 모드\n');
  runEnduranceTest(battles);
  process.exit(0);
}

if (command === 'balscore') {
  console.log('🎮 밸런스 점수 계산 모드\n');
  runBalanceScore();
  process.exit(0);
}

if (command === 'draw') {
  const battles = parseInt(args[1]) || 30;
  console.log('🎮 드로우 분석 모드\n');
  runDrawAnalysis(battles);
  process.exit(0);
}

if (command === 'affinity') {
  const battles = parseInt(args[1]) || 20;
  console.log('🎮 속성상성 분석 모드\n');
  runAttributeAffinity(battles);
  process.exit(0);
}

if (command === 'economy') {
  const battles = parseInt(args[1]) || 30;
  console.log('🎮 턴경제 분석 모드\n');
  runTurnEconomy(battles);
  process.exit(0);
}

if (command === 'risk') {
  const battles = parseInt(args[1]) || 20;
  console.log('🎮 위험도 분석 모드\n');
  runRiskAssessment(battles);
  process.exit(0);
}

if (command === 'adapt') {
  const battles = parseInt(args[1]) || 20;
  console.log('🎮 적응력 테스트 모드\n');
  runAdaptabilityTest(battles);
  process.exit(0);
}

if (command === 'tokensynergy') {
  const battles = parseInt(args[1]) || 30;
  console.log('🎮 토큰 시너지 분석 모드\n');
  runTokenSynergy(battles);
  process.exit(0);
}

if (command === 'composition') {
  const battles = parseInt(args[1]) || 20;
  console.log('🎮 카드 편성 분석 모드\n');
  runCompositionAnalysis(battles);
  process.exit(0);
}

if (command === 'keyword') {
  console.log('🎮 키워드 분석 모드\n');
  runKeywordAnalysis();
  process.exit(0);
}

if (command === 'optimal') {
  const battles = parseInt(args[1]) || 20;
  console.log('🎮 최적 전략 분석 모드\n');
  runOptimalStrategy(battles);
  process.exit(0);
}

if (command === 'burstpot') {
  const battles = parseInt(args[1]) || 20;
  console.log('🎮 폭발력 분석 모드\n');
  runBurstPotential(battles);
  process.exit(0);
}

if (command === 'stratcmp') {
  const battles = parseInt(args[1]) || 20;
  console.log('🎮 전략 비교 분석 모드\n');
  runStrategyComparison(battles);
  process.exit(0);
}

if (command === 'absorb') {
  const battles = parseInt(args[1]) || 20;
  console.log('🎮 피해 흡수 분석 모드\n');
  runDamageAbsorption(battles);
  process.exit(0);
}

if (command === 'killchain') {
  const battles = parseInt(args[1]) || 30;
  console.log('🎮 연속 킬 분석 모드\n');
  runKillChainAnalysis(battles);
  process.exit(0);
}

// 기본 모드
const battles = parseInt(args[0]) || 100;
const enemyIds = args.slice(1).length > 0 ? args.slice(1) : undefined;

console.log('🎮 게임 시뮬레이터 시작\n');
console.log(`설정:`);
console.log(`  - 전투 횟수: ${battles}`);
console.log(`  - 대상 적: ${enemyIds?.join(', ') || '모든 Tier 1-2 적'}`);
console.log('');

// 시뮬레이션 설정
const config: SimulationConfig = {
  battles,
  maxTurns: 50,
  enemyIds: enemyIds || ['ghoul', 'marauder', 'wildrat', 'berserker', 'polluted', 'slurthim', 'deserter', 'hunter'],
  verbose: false,
};

// 시뮬레이션 실행
console.log('⏳ 시뮬레이션 실행 중...\n');
const startTime = Date.now();
const stats = runSimulation(config);
const elapsed = Date.now() - startTime;

// 결과 출력
printStats(stats);

// 추가 분석
console.log('📈 상세 분석:');
console.log('─────────────────────────────────────────');

// 적별 상세 분석
console.log('\n👾 적별 상세 분석:');
const sortedEnemies = Object.entries(stats.enemyStats)
  .sort((a, b) => a[1].winRate - b[1].winRate);

for (const [enemyId, enemyStat] of sortedEnemies) {
  const enemy = ENEMIES.find(e => e.id === enemyId);
  const name = enemy?.name || enemyId;
  const hp = enemy?.hp || '?';
  const tier = enemy?.tier || '?';

  const winPercent = (enemyStat.winRate * 100).toFixed(1);
  const difficultyRating = enemyStat.winRate > 0.9 ? '⭐ 쉬움' :
    enemyStat.winRate > 0.7 ? '⭐⭐ 보통' :
    enemyStat.winRate > 0.5 ? '⭐⭐⭐ 어려움' :
    enemyStat.winRate > 0.3 ? '⭐⭐⭐⭐ 매우 어려움' :
    '⭐⭐⭐⭐⭐ 극도로 어려움';

  console.log(`  ${name} (Tier ${tier}, HP ${hp})`);
  console.log(`    승률: ${winPercent}% | 난이도: ${difficultyRating}`);
}

// 전체 밸런스 평가
console.log('\n⚖️ 전체 밸런스 평가:');
const overallRating = stats.winRate > 0.8 ? '플레이어 유리 (적 강화 필요)' :
  stats.winRate > 0.6 ? '약간 플레이어 유리' :
  stats.winRate > 0.4 ? '균형 잡힘' :
  stats.winRate > 0.2 ? '약간 적 유리' :
  '적 유리 (플레이어 강화 필요)';

console.log(`  전체 승률 ${(stats.winRate * 100).toFixed(1)}%: ${overallRating}`);
console.log(`  평균 전투 시간: ${stats.avgTurns.toFixed(1)}턴`);

const paceRating = stats.avgTurns < 3 ? '매우 빠름 (밸런스 확인 필요)' :
  stats.avgTurns < 5 ? '빠름' :
  stats.avgTurns < 10 ? '적당함' :
  stats.avgTurns < 15 ? '느림' :
  '매우 느림';
console.log(`  전투 페이스: ${paceRating}`);

// 콤보 통계
if (Object.keys(stats.comboStats).length > 0) {
  console.log('\n🃏 콤보 발생 빈도:');
  const sortedCombos = Object.entries(stats.comboStats)
    .sort((a, b) => b[1].count - a[1].count);
  for (const [comboName, comboStat] of sortedCombos) {
    console.log(`  ${comboName}: ${comboStat.count}회 (전투당 ${comboStat.avgPerBattle.toFixed(2)})`);
  }
}

// 실행 시간
console.log(`\n⏱️ 실행 시간: ${elapsed}ms (${(elapsed / battles).toFixed(2)}ms/전투)`);
console.log('─────────────────────────────────────────\n');
