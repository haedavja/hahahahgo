/**
 * 상세 통계 수집 테스트
 */
import { createGameSimulator } from '../game/index.js';
import { setLogLevel, LogLevel } from '../core/logger.js';
import { StatsCollector, StatsReporter } from '../analysis/detailed-stats.js';

// 로그 완전 비활성화
setLogLevel(LogLevel.SILENT);

async function main() {
  console.log('=== 상세 통계 수집 시뮬레이션 ===\n');

  const simulator = await createGameSimulator();
  const statsCollector = new StatsCollector();

  const NUM_RUNS = 10;
  console.log(`▶ ${NUM_RUNS}회 런 시뮬레이션 시작...\n`);

  for (let i = 0; i < NUM_RUNS; i++) {
    const run = simulator.simulateRun({ verbose: false });

    // 런 결과 기록
    statsCollector.recordRunExtended({
      success: run.success,
      layer: run.finalLayer,
      battlesWon: run.battlesWon,
      gold: run.totalGoldEarned,
      deckSize: run.finalPlayerState.deck?.length || 10,
      deathCause: run.success ? undefined : (run.nodeResults[run.nodeResults.length - 1]?.nodeType || 'battle'),
      strategy: 'balanced',
      upgradedCards: run.finalPlayerState.upgradedCards || [],
      shopsVisited: run.nodeResults.filter(n => n.nodeType === 'shop').length,
      dungeonsCleared: run.nodeResults.filter(n => n.nodeType === 'dungeon' && n.success).length,
      growthLevel: run.finalPlayerState.growth?.level || 0,
    });

    // 노드별 상세 기록
    for (const node of run.nodeResults) {
      // 전투 기록
      if (node.nodeType === 'battle' && node.battleResult) {
        statsCollector.recordBattle(node.battleResult, {
          id: node.enemyId || 'unknown',
          name: node.enemyName || '알 수 없는 적',
          tier: node.tier || 1,
          isBoss: node.isBoss || false,
          isElite: node.isElite || false,
        });
      }

      // 이벤트 기록
      if (node.nodeType === 'event') {
        if (node.success) {
          statsCollector.recordEventChoice({
            eventId: node.eventId || 'unknown',
            eventName: node.eventName || '알 수 없는 이벤트',
            choiceId: node.choiceId || 'choice_1',
            choiceName: node.choiceName || '선택',
            success: node.success,
            hpChange: node.changes?.hp || 0,
            goldChange: node.changes?.gold || 0,
            cardsGained: node.changes?.cardsGained || [],
            relicsGained: node.changes?.relicsGained || [],
          });
        } else if (node.skipped) {
          statsCollector.recordEventSkipped({
            eventId: node.eventId || 'unknown',
            eventName: node.eventName || '알 수 없는 이벤트',
            reason: node.skipReason || '조건 미충족',
          });
        }
      }

      // 상점 기록
      if (node.nodeType === 'shop') {
        statsCollector.recordShopVisit({
          goldSpent: node.changes?.gold ? -node.changes.gold : 0,
          cardsPurchased: node.changes?.cardsGained || [],
          relicsPurchased: node.changes?.relicsGained || [],
          cardsRemoved: node.cardsRemoved || 0,
          cardsUpgraded: node.cardsUpgraded || 0,
        });

        // 상점 서비스 상세 기록
        if (node.healed) {
          statsCollector.recordShopService({
            type: 'heal',
            cost: node.healCost || 50,
            hpHealed: node.healed,
          });
        }
        if (node.cardsRemoved) {
          statsCollector.recordShopService({
            type: 'remove',
            cost: node.removalCost || 75,
          });
        }
      }

      // 던전 기록
      if (node.nodeType === 'dungeon') {
        statsCollector.recordDungeon({
          dungeonId: node.dungeonId || 'unknown',
          success: node.success,
          turns: node.turns || 0,
          damageTaken: node.damageTaken || 0,
          goldReward: node.changes?.gold || 0,
          cardsGained: node.changes?.cardsGained || [],
          relicsGained: node.changes?.relicsGained || [],
        });
      }
    }

    // 진행 표시
    process.stdout.write(`  런 ${i + 1}/${NUM_RUNS} 완료 - ${run.success ? '승리' : '패배'} (레이어 ${run.finalLayer})\r`);
  }

  console.log('\n');

  // 통계 완료 및 리포트 생성
  const stats = statsCollector.finalize();
  const reporter = new StatsReporter(stats);

  // 전체 리포트 출력
  console.log(reporter.generateFullReport());

  console.log('\n=== 시뮬레이션 완료 ===');
}

main().catch(console.error);
