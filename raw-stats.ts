import { RunSimulator } from './src/simulator/game/run-simulator';
import { StatsCollector } from './src/simulator/analysis/detailed-stats';
import { setLogLevel, LogLevel } from './src/simulator/core/logger';

setLogLevel(LogLevel.SILENT);

const stats = new StatsCollector();
const simulator = new RunSimulator();
simulator.setStatsCollector(stats);

async function run() {
  await simulator.loadGameData();

  for (let i = 0; i < 20; i++) {
    simulator.simulateRun({
      initialPlayer: {
        hp: 80, maxHp: 80, gold: 150, intel: 0, material: 0, loot: 0, grace: 0,
        strength: 0, agility: 0, insight: 0,
        deck: ['shoot', 'shoot', 'strike', 'strike', 'strike', 'reload', 'quarte', 'octave', 'breach', 'deflect'],
        relics: [], items: [], upgradedCards: []
      },
      difficulty: 1,
      strategy: 'balanced'
    });
  }

  const s = stats.finalize();

  console.log('==================== 런 통계 ====================');
  console.log(`총 런: ${s.runStats.totalRuns ?? 0}회`);
  console.log(`성공: ${s.runStats.successfulRuns ?? 0}회`);
  console.log(`실패: ${s.runStats.failedRuns ?? 0}회`);
  console.log(`성공률: ${((s.runStats.successRate ?? 0) * 100).toFixed(1)}%`);
  console.log(`평균 도달 층: ${(s.runStats.avgLayerReached ?? 0).toFixed(1)}`);
  console.log(`평균 전투 승리: ${(s.runStats.avgBattlesWon ?? 0).toFixed(1)}`);
  console.log(`평균 골드 획득: ${(s.runStats.avgGoldEarned ?? 0).toFixed(0)}`);
  console.log(`평균 덱 크기: ${(s.runStats.avgFinalDeckSize ?? 0).toFixed(1)}`);

  console.log('\n==================== 카드 사용 통계 ====================');
  const cardArr = Array.from(s.cardStats.entries()).sort((a, b) => b[1].totalUses - a[1].totalUses);
  for (const [id, c] of cardArr) {
    console.log(`${id}: 사용 ${c.totalUses}회, 승리시 ${c.usesInWins}회, 패배시 ${c.usesInLosses}회, 총피해 ${c.totalDamage}, 총방어 ${c.totalBlock}, 교차 ${c.crossTriggers}회, 특수효과 ${JSON.stringify(c.specialTriggers)}`);
  }

  console.log('\n==================== 몬스터 전투 통계 ====================');
  const monsterArr = Array.from(s.monsterStats.entries()).sort((a, b) => b[1].battles - a[1].battles);
  for (const [id, m] of monsterArr) {
    console.log(`${id}: 조우 ${m.battles}회, 승리 ${m.wins}회, 패배 ${m.losses}회, 평균턴 ${(m.avgTurns ?? 0).toFixed(1)}, 받은피해 ${m.totalDamageTaken}, 준피해 ${m.totalDamageDealt}`);
  }

  console.log('\n==================== 상점 통계 ====================');
  console.log(`방문: ${s.shopStats.totalVisits}회`);
  console.log(`총 지출: ${s.shopStats.totalSpent}G`);
  console.log(`평균 지출: ${(s.shopStats.avgSpentPerVisit ?? 0).toFixed(0)}G/회`);
  console.log(`카드 제거: ${s.shopStats.cardsRemoved}회`);
  console.log(`카드 승급: ${s.shopStats.cardsUpgraded}회`);
  console.log('\n구매한 카드:');
  for (const [id, count] of Object.entries(s.shopStats.cardsPurchased)) {
    console.log(`  ${id}: ${count}회`);
  }
  console.log('\n구매한 상징:');
  for (const [id, count] of Object.entries(s.shopStats.relicsPurchased)) {
    console.log(`  ${id}: ${count}회`);
  }
  console.log('\n구매한 아이템:');
  for (const [id, count] of Object.entries(s.shopStats.itemsPurchased)) {
    console.log(`  ${id}: ${count}회`);
  }
  console.log('\n구매 기록 (이유별):');
  for (const rec of s.shopStats.purchaseRecords) {
    console.log(`  ${rec.itemName} (${rec.type}) ${rec.price}G - 이유: ${rec.reason}`);
  }

  console.log('\n==================== 던전 통계 ====================');
  console.log(`총 진입: ${s.dungeonStats.totalAttempts ?? 0}회`);
  console.log(`클리어: ${s.dungeonStats.clears ?? 0}회`);
  console.log(`클리어율: ${((s.dungeonStats.clearRate ?? 0) * 100).toFixed(1)}%`);
  console.log(`평균 소요 턴: ${(s.dungeonStats.avgTurns ?? 0).toFixed(1)}`);
  console.log(`평균 받은 피해: ${(s.dungeonStats.avgDamageTaken ?? 0).toFixed(1)}`);
  console.log(`획득 골드: ${s.dungeonStats.rewards?.gold ?? 0}G`);
  console.log(`획득 카드: ${s.dungeonStats.rewards?.cards?.length ?? 0}장 - [${(s.dungeonStats.rewards?.cards ?? []).join(', ')}]`);
  console.log(`획득 상징: ${s.dungeonStats.rewards?.relics?.length ?? 0}개 - [${(s.dungeonStats.rewards?.relics ?? []).join(', ')}]`);

  console.log('\n==================== 이벤트 통계 ====================');
  const eventArr = Array.from(s.eventStats.entries()).sort((a, b) => b[1].occurrences - a[1].occurrences);
  for (const [id, e] of eventArr) {
    console.log(`${id}: 발생 ${e.occurrences}회, 성공 ${e.successes}회, 골드변화 ${e.totalGoldChange ?? 0}, 정보변화 ${e.totalIntelChange ?? 0}, 재료변화 ${e.totalMaterialChange ?? 0}`);
  }

  console.log('\n==================== 아이템 통계 ====================');
  console.log('획득한 아이템:');
  for (const [id, count] of Object.entries(s.itemUsageStats.itemsAcquired)) {
    console.log(`  ${id}: ${count}개`);
  }
  console.log('\n사용한 아이템:');
  for (const [id, count] of Object.entries(s.itemUsageStats.itemsUsed)) {
    console.log(`  ${id}: ${count}회`);
  }
  console.log('\n아이템 효과:');
  for (const [id, eff] of Object.entries(s.itemUsageStats.itemEffects)) {
    console.log(`  ${id}: 사용 ${eff.timesUsed}회, HP회복 ${eff.totalHpHealed}, 피해 ${eff.totalDamage}, 골드 ${eff.totalGoldGained}, 특수효과 ${JSON.stringify(eff.specialEffects)}`);
  }

  console.log('\n==================== 이벤트 선택 상세 ====================');
  for (const [eventId, choiceStats] of s.eventChoiceStats.entries()) {
    console.log(`\n${eventId}: 발생 ${choiceStats.occurrences ?? 0}회, 스킵 ${choiceStats.timesSkipped ?? 0}회`);
    if (choiceStats.choiceOutcomes) {
      for (const [choiceId, outcome] of Object.entries(choiceStats.choiceOutcomes)) {
        console.log(`  선택 "${choiceId}": ${outcome.timesChosen ?? 0}회, HP변화 ${outcome.avgHpChange?.toFixed(1) ?? 0}, 골드변화 ${outcome.avgGoldChange?.toFixed(0) ?? 0}, 성공률 ${((outcome.successRate ?? 0) * 100).toFixed(0)}%`);
      }
    }
  }
}

run();
