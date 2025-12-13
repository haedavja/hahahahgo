/**
 * combatActions.integration.test.js
 *
 * 전투 시스템 통합 테스트 (Mock 없음)
 * 실제 tokenUtils, cardSpecialEffects 모두 사용
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { applyAction, applyAttack, applyDefense } from '../logic/combatActions.js';
import { createEmptyTokens } from '../../../lib/tokenUtils.js';
import { processQueueCollisions } from './cardSpecialEffects.js';

// 테스트용 기본 엔티티 생성
function createPlayer(overrides = {}) {
  return {
    hp: 100,
    maxHp: 100,
    block: 0,
    def: false,
    strength: 0,
    agility: 0,
    counter: 0,
    tokens: createEmptyTokens(),
    ...overrides
  };
}

function createEnemy(overrides = {}) {
  return {
    hp: 100,
    maxHp: 100,
    block: 0,
    def: false,
    strength: 0,
    counter: 0,
    tokens: createEmptyTokens(),
    ...overrides
  };
}

function createState(playerOverrides = {}, enemyOverrides = {}) {
  return {
    player: createPlayer(playerOverrides),
    enemy: createEnemy(enemyOverrides),
    log: []
  };
}

describe('통합 테스트: 기본 전투', () => {
  describe('기본 공격', () => {
    it('방어력 없는 적에게 피해를 입힘', () => {
      const state = createState();
      const card = { type: 'attack', name: '타격', damage: 20 };

      const result = applyAction(state, 'player', card);

      expect(result.updatedState.enemy.hp).toBe(80);
      expect(result.dealt).toBe(20);
    });

    it('힘 스탯이 피해에 추가됨', () => {
      const state = createState({ strength: 5 });
      const card = { type: 'attack', name: '타격', damage: 20 };

      const result = applyAction(state, 'player', card);

      expect(result.updatedState.enemy.hp).toBe(75); // 20 + 5 = 25
      expect(result.dealt).toBe(25);
    });

    it('다중 타격 카드', () => {
      const state = createState();
      const card = { type: 'attack', name: '연타', damage: 10, hits: 3 };

      const result = applyAction(state, 'player', card);

      expect(result.updatedState.enemy.hp).toBe(70); // 10 * 3 = 30
      expect(result.dealt).toBe(30);
    });
  });

  describe('방어', () => {
    it('방어 카드로 방어력 획득', () => {
      const state = createState();
      const card = { type: 'defense', name: '방어', block: 15 };

      const result = applyAction(state, 'player', card);

      expect(result.updatedState.player.block).toBe(15);
      expect(result.updatedState.player.def).toBe(true);
    });

    it('방어력이 누적됨', () => {
      const state = createState({ block: 10, def: true });
      const card = { type: 'defense', name: '방어', block: 15 };

      const result = applyAction(state, 'player', card);

      expect(result.updatedState.player.block).toBe(25); // 10 + 15
    });

    it('방어력이 공격을 차단', () => {
      const state = createState({}, { block: 30, def: true });
      const card = { type: 'attack', name: '타격', damage: 20 };

      const result = applyAction(state, 'player', card);

      expect(result.updatedState.enemy.hp).toBe(100); // 피해 없음
      expect(result.updatedState.enemy.block).toBe(10); // 30 - 20
      expect(result.dealt).toBe(0);
    });

    it('방어력을 초과하는 공격은 관통', () => {
      const state = createState({}, { block: 10, def: true });
      const card = { type: 'attack', name: '타격', damage: 25 };

      const result = applyAction(state, 'player', card);

      expect(result.updatedState.enemy.hp).toBe(85); // 25 - 10 = 15 관통
      expect(result.updatedState.enemy.block).toBe(0);
      expect(result.dealt).toBe(15);
    });
  });
});

describe('통합 테스트: Special 효과', () => {
  describe('ignoreBlock (방어 무시)', () => {
    it('방어력을 무시하고 피해를 입힘', () => {
      const state = createState({}, { block: 50, def: true });
      const card = { type: 'attack', name: '로켓펀치', damage: 30, special: 'ignoreBlock' };

      const result = applyAction(state, 'player', card);

      expect(result.updatedState.enemy.hp).toBe(70); // 방어 무시
      expect(result.updatedState.enemy.block).toBe(50); // 방어력은 유지
      expect(result.dealt).toBe(30);
    });
  });

  describe('clearAllBlock (양측 방어력 0)', () => {
    it('공격 전 양측 방어력을 0으로 만듦', () => {
      const state = createState({ block: 20, def: true }, { block: 30, def: true });
      const card = { type: 'attack', name: '필사의 일격', damage: 25, special: 'clearAllBlock' };

      const result = applyAction(state, 'player', card);

      expect(result.updatedState.player.block).toBe(0);
      expect(result.updatedState.enemy.block).toBe(0);
      expect(result.updatedState.enemy.hp).toBe(75); // 방어력 제거 후 공격
    });
  });

  describe('doubleDamageIfSolo (유일한 공격 카드면 2배)', () => {
    it('유일한 공격 카드면 2배 피해', () => {
      const state = createState();
      const card = { type: 'attack', name: '걷어차기', damage: 18, special: 'doubleDamageIfSolo' };
      const battleContext = { playerAttackCards: [card] }; // 1장만

      const result = applyAction(state, 'player', card, battleContext);

      expect(result.updatedState.enemy.hp).toBe(64); // 18 * 2 = 36
      expect(result.dealt).toBe(36);
    });

    it('여러 공격 카드면 원래 피해', () => {
      const state = createState();
      const card = { type: 'attack', name: '걷어차기', damage: 18, special: 'doubleDamageIfSolo' };
      const battleContext = { playerAttackCards: [card, { name: '타격' }] }; // 2장

      const result = applyAction(state, 'player', card, battleContext);

      expect(result.updatedState.enemy.hp).toBe(82); // 18
      expect(result.dealt).toBe(18);
    });
  });

  describe('agilityBonus (민첩 보너스)', () => {
    it('민첩당 5 추가 피해', () => {
      const state = createState({ agility: 3 });
      const card = { type: 'attack', name: '취권', damage: 20, special: 'agilityBonus' };

      const result = applyAction(state, 'player', card);

      expect(result.updatedState.enemy.hp).toBe(65); // 20 + 15 = 35
      expect(result.dealt).toBe(35);
    });

    it('민첩 0이면 추가 피해 없음', () => {
      const state = createState({ agility: 0 });
      const card = { type: 'attack', name: '취권', damage: 20, special: 'agilityBonus' };

      const result = applyAction(state, 'player', card);

      expect(result.updatedState.enemy.hp).toBe(80);
      expect(result.dealt).toBe(20);
    });
  });

  describe('executeUnder10 (10% 미만 즉사)', () => {
    it('10% 미만이면 즉사', () => {
      const state = createState({}, { hp: 50, maxHp: 100 });
      const card = { type: 'attack', name: '두개골 부수기', damage: 45, special: 'executeUnder10' };

      const result = applyAction(state, 'player', card);

      // 50 - 45 = 5 (< 10) → 즉사
      expect(result.updatedState.enemy.hp).toBe(0);
    });

    it('10% 이상이면 즉사 안 함', () => {
      const state = createState({}, { hp: 50, maxHp: 100 });
      const card = { type: 'attack', name: '두개골 부수기', damage: 35, special: 'executeUnder10' };

      const result = applyAction(state, 'player', card);

      // 50 - 35 = 15 (>= 10) → 즉사 안 함
      expect(result.updatedState.enemy.hp).toBe(15);
    });
  });

  describe('repeatIfLast (마지막 카드면 반복)', () => {
    it('마지막 카드면 2번 타격', () => {
      const state = createState();
      const card = { type: 'attack', name: '후려치기', damage: 20, special: 'repeatIfLast' };
      const battleContext = { isLastCard: true };

      const result = applyAction(state, 'player', card, battleContext);

      expect(result.updatedState.enemy.hp).toBe(60); // 20 * 2 = 40
      expect(result.dealt).toBe(40);
    });

    it('마지막 카드가 아니면 1번 타격', () => {
      const state = createState();
      const card = { type: 'attack', name: '후려치기', damage: 20, special: 'repeatIfLast' };
      const battleContext = { isLastCard: false };

      const result = applyAction(state, 'player', card, battleContext);

      expect(result.updatedState.enemy.hp).toBe(80);
      expect(result.dealt).toBe(20);
    });
  });

  describe('repeatPerUnusedAttack (미사용 공격카드당 반복)', () => {
    it('미사용 공격카드 수만큼 추가 타격', () => {
      const state = createState();
      const card = { type: 'attack', name: '연쇄기', damage: 10, special: 'repeatPerUnusedAttack' };
      const battleContext = { unusedAttackCards: 2 };

      const result = applyAction(state, 'player', card, battleContext);

      // 기본 1타 + 추가 2타 = 3타
      expect(result.updatedState.enemy.hp).toBe(70); // 10 * 3 = 30
      expect(result.dealt).toBe(30);
    });
  });

  describe('vulnIfNoBlock (방어 없으면 취약)', () => {
    it('방어력 없으면 취약 토큰 부여', () => {
      const state = createState({}, { def: false, block: 0 });
      const card = { type: 'attack', name: '검 빙글빙글', damage: 14, special: 'vulnIfNoBlock' };

      const result = applyAction(state, 'player', card);

      // 취약 토큰 확인
      const enemyTokens = result.updatedState.enemy.tokens;
      const hasVulnerable = enemyTokens.turn?.some(t => t.id === 'vulnerable');
      expect(hasVulnerable).toBe(true);
    });

    it('방어력 있으면 취약 토큰 안 부여', () => {
      const state = createState({}, { def: true, block: 20 });
      const card = { type: 'attack', name: '검 빙글빙글', damage: 14, special: 'vulnIfNoBlock' };

      const result = applyAction(state, 'player', card);

      const enemyTokens = result.updatedState.enemy.tokens;
      const hasVulnerable = enemyTokens.turn?.some(t => t.id === 'vulnerable');
      expect(hasVulnerable).toBeFalsy();
    });
  });

  describe('doubleVulnIfNoBlock (방어 없으면 2배 취약)', () => {
    it('방어력 없으면 취약 2스택', () => {
      const state = createState({}, { def: false, block: 0 });
      const card = { type: 'attack', name: '미늘작살', damage: 10, special: 'doubleVulnIfNoBlock' };

      const result = applyAction(state, 'player', card);

      const enemyTokens = result.updatedState.enemy.tokens;
      const vulnToken = enemyTokens.turn?.find(t => t.id === 'vulnerable');
      expect(vulnToken?.stacks).toBe(2);
    });
  });

  describe('hitOnEnemyAction (적 행동 시 타격)', () => {
    it('persistent_strike 토큰 획득', () => {
      const state = createState();
      const card = { type: 'attack', name: '질긴 놈', damage: 20, special: 'hitOnEnemyAction' };

      const result = applyAction(state, 'player', card);

      const playerTokens = result.updatedState.player.tokens;
      const hasPersistentStrike = playerTokens.turn?.some(t => t.id === 'persistent_strike');
      expect(hasPersistentStrike).toBe(true);
    });
  });

  describe('halfEnemyEther (적 에테르 절반)', () => {
    it('half_ether 토큰 부여', () => {
      const state = createState();
      const card = { type: 'attack', name: '에테르 커터', damage: 30, special: 'halfEnemyEther' };

      const result = applyAction(state, 'player', card);

      const enemyTokens = result.updatedState.enemy.tokens;
      const hasHalfEther = enemyTokens.turn?.some(t => t.id === 'half_ether');
      expect(hasHalfEther).toBe(true);
    });
  });
});

describe('통합 테스트: 토큰 시스템 연동', () => {
  describe('공격 토큰', () => {
    it('attack 토큰으로 공격력 50% 증가', () => {
      const state = createState({
        tokens: {
          usage: [],
          turn: [{ id: 'attack', stacks: 1 }],
          permanent: []
        }
      });
      const card = { type: 'attack', name: '타격', damage: 20 };

      const result = applyAction(state, 'player', card);

      expect(result.updatedState.enemy.hp).toBe(70); // 20 * 1.5 = 30
      expect(result.dealt).toBe(30);
    });
  });

  describe('방어 토큰', () => {
    it('defense 토큰으로 방어력 50% 증가', () => {
      const state = createState({
        tokens: {
          usage: [],
          turn: [{ id: 'defense', stacks: 1 }],
          permanent: []
        }
      });
      const card = { type: 'defense', name: '방어', block: 20 };

      const result = applyAction(state, 'player', card);

      expect(result.updatedState.player.block).toBe(30); // 20 * 1.5 = 30
    });
  });

  describe('허약 토큰', () => {
    it('vulnerable 토큰으로 받는 피해 50% 증가', () => {
      const state = createState({}, {
        tokens: {
          usage: [],
          turn: [{ id: 'vulnerable', stacks: 1 }],
          permanent: []
        }
      });
      const card = { type: 'attack', name: '타격', damage: 20 };

      const result = applyAction(state, 'player', card);

      expect(result.updatedState.enemy.hp).toBe(70); // 20 * 1.5 = 30
      expect(result.dealt).toBe(30);
    });
  });

  describe('Special + 토큰 복합 효과', () => {
    it('doubleDamageIfSolo + attack 토큰 복합', () => {
      const state = createState({
        tokens: {
          usage: [],
          turn: [{ id: 'attack', stacks: 1 }],
          permanent: []
        }
      });
      const card = { type: 'attack', name: '걷어차기', damage: 20, special: 'doubleDamageIfSolo' };
      const battleContext = { playerAttackCards: [card] };

      const result = applyAction(state, 'player', card, battleContext);

      // 20 * 2 (solo) = 40, 40 * 1.5 (attack token) = 60
      expect(result.updatedState.enemy.hp).toBe(40);
      expect(result.dealt).toBe(60);
    });

    it('ignoreBlock + vulnerable 복합', () => {
      const state = createState({}, {
        block: 50,
        def: true,
        tokens: {
          usage: [],
          turn: [{ id: 'vulnerable', stacks: 1 }],
          permanent: []
        }
      });
      const card = { type: 'attack', name: '로켓펀치', damage: 30, special: 'ignoreBlock' };

      const result = applyAction(state, 'player', card);

      // 방어 무시 + 취약 50% 증가
      expect(result.updatedState.enemy.hp).toBe(55); // 30 * 1.5 = 45
      expect(result.dealt).toBe(45);
    });
  });
});

describe('통합 테스트: 엣지 케이스', () => {
  it('HP가 0 이하로 떨어지지 않음', () => {
    const state = createState({}, { hp: 10 });
    const card = { type: 'attack', name: '타격', damage: 50 };

    const result = applyAction(state, 'player', card);

    expect(result.updatedState.enemy.hp).toBe(0);
  });

  it('반격 데미지 처리', () => {
    const state = createState({}, { counter: 10 });
    const card = { type: 'attack', name: '타격', damage: 20 };

    const result = applyAction(state, 'player', card);

    expect(result.updatedState.player.hp).toBe(90); // 반격 10
    expect(result.taken).toBe(10);
  });

  it('적 턴 공격도 정상 작동', () => {
    const state = createState();
    const card = { type: 'attack', name: '적 공격', damage: 15 };

    const result = applyAction(state, 'enemy', card);

    expect(result.updatedState.player.hp).toBe(85);
  });
});

describe('통합 테스트: 회피 토큰 (Math.random mock)', () => {
  let originalRandom;

  beforeEach(() => {
    originalRandom = Math.random;
  });

  afterEach(() => {
    Math.random = originalRandom;
  });

  it('회피 성공 (확률 50%, 랜덤 0.3)', () => {
    Math.random = () => 0.3; // 50% 확률 → 0.3 < 0.5 → 회피 성공

    const state = createState({}, {
      tokens: {
        usage: [{ id: 'blur', stacks: 1 }],
        turn: [],
        permanent: []
      }
    });
    const card = { type: 'attack', name: '타격', damage: 30 };

    const result = applyAction(state, 'player', card);

    expect(result.updatedState.enemy.hp).toBe(100); // 회피 → 피해 없음
    expect(result.dealt).toBe(0);
  });

  it('회피 실패 (확률 50%, 랜덤 0.7)', () => {
    Math.random = () => 0.7; // 50% 확률 → 0.7 >= 0.5 → 회피 실패

    const state = createState({}, {
      tokens: {
        usage: [{ id: 'blur', stacks: 1 }],
        turn: [],
        permanent: []
      }
    });
    const card = { type: 'attack', name: '타격', damage: 30 };

    const result = applyAction(state, 'player', card);

    expect(result.updatedState.enemy.hp).toBe(70); // 회피 실패 → 피해 30
    expect(result.dealt).toBe(30);
  });

  it('blurPlus 75% 회피 성공', () => {
    Math.random = () => 0.6; // 75% 확률 → 0.6 < 0.75 → 회피 성공

    const state = createState({}, {
      tokens: {
        usage: [{ id: 'blurPlus', stacks: 1 }],
        turn: [],
        permanent: []
      }
    });
    const card = { type: 'attack', name: '타격', damage: 30 };

    const result = applyAction(state, 'player', card);

    expect(result.updatedState.enemy.hp).toBe(100);
    expect(result.dealt).toBe(0);
  });

  it('dodge 턴 토큰 회피', () => {
    Math.random = () => 0.4;

    const state = createState({}, {
      tokens: {
        usage: [],
        turn: [{ id: 'dodge', stacks: 1 }],
        permanent: []
      }
    });
    const card = { type: 'attack', name: '타격', damage: 25 };

    const result = applyAction(state, 'player', card);

    expect(result.updatedState.enemy.hp).toBe(100);
  });
});

describe('통합 테스트: processQueueCollisions 실제 연동', () => {
  it('복잡한 큐 충돌 처리', () => {
    const queue = [
      { actor: 'player', card: { name: '박치기', special: 'destroyOnCollision' }, sp: 5 },
      { actor: 'player', card: { name: '타격', damage: 20 }, sp: 8 },
      { actor: 'enemy', card: { name: '적1' }, sp: 5 },
      { actor: 'enemy', card: { name: '적2' }, sp: 8 },
      { actor: 'enemy', card: { name: '적3' }, sp: 12 }
    ];

    const logs = [];
    const result = processQueueCollisions(queue, msg => logs.push(msg));

    // 박치기(sp:5)가 적1(sp:5) 파괴
    expect(result.filteredQueue.length).toBe(4);
    expect(result.destroyedCards.length).toBe(1);
    expect(result.destroyedCards[0].name).toBe('적1');
    expect(logs.length).toBe(1);
  });

  it('다중 박치기 카드', () => {
    const queue = [
      { actor: 'player', card: { name: '박치기1', special: 'destroyOnCollision' }, sp: 3 },
      { actor: 'player', card: { name: '박치기2', special: 'destroyOnCollision' }, sp: 7 },
      { actor: 'enemy', card: { name: '적1' }, sp: 3 },
      { actor: 'enemy', card: { name: '적2' }, sp: 7 },
      { actor: 'enemy', card: { name: '적3' }, sp: 10 }
    ];

    const result = processQueueCollisions(queue, () => {});

    expect(result.filteredQueue.length).toBe(3); // 플레이어 2 + 적3
    expect(result.destroyedCards.length).toBe(2);
  });

  it('sp 불일치면 파괴 안됨', () => {
    const queue = [
      { actor: 'player', card: { name: '박치기', special: 'destroyOnCollision' }, sp: 5 },
      { actor: 'enemy', card: { name: '적 카드' }, sp: 6 }
    ];

    const result = processQueueCollisions(queue, () => {});

    expect(result.filteredQueue.length).toBe(2);
    expect(result.destroyedCards.length).toBe(0);
  });

  it('빈 큐 처리', () => {
    const result = processQueueCollisions([], () => {});

    expect(result.filteredQueue.length).toBe(0);
    expect(result.destroyedCards.length).toBe(0);
  });
});
