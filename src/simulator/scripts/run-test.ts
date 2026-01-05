/**
 * 시뮬레이터 테스트 실행
 */
import { runSharedTimelineBattle } from '../core/multi-enemy-battle-engine.js';
import type { EnemyState } from '../core/game-types.js';

// 테스트 덱
const playerDeck = [
  'strike', 'strike', 'strike', 'strike',
  'shoot', 'shoot', 'shoot',
  'defend', 'defend', 'defend',
  'slash', 'slash',
  'quarte', 'thrust'
];

// 테스트 적
const enemies: EnemyState[] = [
  {
    id: 'goblin',
    name: '고블린',
    hp: 30,
    maxHp: 30,
    block: 0,
    tokens: {},
    deck: ['goblin_attack', 'goblin_attack', 'goblin_defend'],
    cardsPerTurn: 1,
    maxSpeed: 12,
    ether: 0,
    tier: 1
  },
  {
    id: 'slime',
    name: '슬라임',
    hp: 25,
    maxHp: 25,
    block: 0,
    tokens: {},
    deck: ['slime_attack', 'slime_split'],
    cardsPerTurn: 1,
    maxSpeed: 12,
    ether: 0,
    tier: 1
  }
];

console.log('=== 시뮬레이터 테스트 ===\n');

// 일반 전투
console.log('▶ 일반 전투 (이변 없음)');
const result1 = runSharedTimelineBattle(playerDeck, [], enemies, { verbose: true });
console.log('승자: ' + (result1.winner === 'player' ? '플레이어' : '적'));
console.log('턴 수: ' + result1.turns);
console.log('플레이어 HP: ' + result1.playerFinalHp);
console.log('처치한 적: ' + result1.enemiesKilled + '/' + enemies.length);
console.log('에테르 획득: ' + result1.etherGained);
const comboStr = Object.entries(result1.comboStats).map(([k,v]) => k + '(' + v + ')').join(', ') || '없음';
console.log('콤보: ' + comboStr);

// 다중 전투 테스트
console.log('\n▶ 다중 전투 테스트 (10회)');
let wins = 0;
let totalTurns = 0;
let totalEther = 0;

for (let i = 0; i < 10; i++) {
  const result = runSharedTimelineBattle(playerDeck, [], enemies);
  if (result.winner === 'player') wins++;
  totalTurns += result.turns;
  totalEther += result.etherGained;
}

console.log('승률: ' + wins + '/10 (' + (wins * 10) + '%)');
console.log('평균 턴: ' + (totalTurns / 10).toFixed(1));
console.log('평균 에테르: ' + (totalEther / 10).toFixed(1));

// 이변 적용 테스트
console.log('\n▶ 이변 전투 테스트 (blood_moon)');
const result2 = runSharedTimelineBattle(playerDeck, [], enemies, {
  anomalyId: 'blood_moon',
  verbose: false
});
console.log('승자: ' + (result2.winner === 'player' ? '플레이어' : '적'));
console.log('플레이어 HP: ' + result2.playerFinalHp);

console.log('\n=== 테스트 완료 ===');
