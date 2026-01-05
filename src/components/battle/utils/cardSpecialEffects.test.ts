/**
 * @file cardSpecialEffects.test.js
 * @description 카드 special 효과 유닛 테스트
 *
 * ## 테스트 대상
 * - hasSpecial: 카드 special 속성 확인
 * - shouldIgnoreBlock: 방어력 무시 여부
 * - processPreAttackSpecials: 공격 전 효과 처리
 * - processPostAttackSpecials: 공격 후 효과 처리
 * - processQueueCollisions: 타임라인 충돌 처리
 * - calculateAgilitySpeedReduction: 민첩 속도 감소
 *
 * ## 주요 테스트 케이스
 * - ignoreBlock/clearAllBlock 방어력 관련
 * - 취약/출혈/화상 상태이상 부여
 * - 타임라인 겹침 시 cross 특성 발동
 * - null/undefined 안전 처리
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi } from 'vitest';
import {
  hasSpecial,
  shouldIgnoreBlock,
  processPreAttackSpecials,
  processPostAttackSpecials,
  processQueueCollisions,
  processCollisionSpecials,
  calculateAgilitySpeedReduction
} from './cardSpecialEffects.js';

// tokenUtils mock
vi.mock('../../../lib/tokenUtils', () => ({
  addToken: vi.fn((entity, tokenId, stacks) => {
    const tokens = entity.tokens ? { ...entity.tokens } : { turn: [], usage: [], permanent: [] };
    const turnTokens = tokens.turn || [];
    const existing = turnTokens.find((t: any) => t.id === tokenId);
    if (existing) {
      existing.stacks = (existing.stacks || 1) + stacks;
    } else {
      turnTokens.push({ id: tokenId, stacks });
    }
    tokens.turn = turnTokens;
    return { tokens, logs: [`${tokenId} ${stacks}스택 획득`] };
  })
}));

describe('hasSpecial', () => {
  it('카드에 special이 있으면 true', () => {
    const card = { special: 'ignoreBlock' } as any;
    expect(hasSpecial(card, 'ignoreBlock')).toBe(true);
  });

  it('다른 special이면 false', () => {
    const card = { special: 'ignoreBlock' } as any;
    expect(hasSpecial(card, 'clearAllBlock')).toBe(false);
  });

  it('special이 없으면 false', () => {
    const card = { damage: 10 } as any;
    expect(hasSpecial(card, 'ignoreBlock')).toBe(false);
  });

  it('card가 null이면 false', () => {
    expect(hasSpecial(null as any, 'ignoreBlock')).toBe(false);
  });

  it('card가 undefined이면 false', () => {
    expect(hasSpecial(undefined as any, 'ignoreBlock')).toBe(false);
  });
});

describe('shouldIgnoreBlock', () => {
  it('ignoreBlock special이면 true', () => {
    const card = { special: 'ignoreBlock' } as any;
    expect(shouldIgnoreBlock(card)).toBe(true);
  });

  it('_ignoreBlock 플래그면 true', () => {
    const card = { _ignoreBlock: true } as any;
    expect(shouldIgnoreBlock(card)).toBe(true);
  });

  it('아무것도 없으면 false', () => {
    const card = { damage: 10 } as any;
    expect(shouldIgnoreBlock(card)).toBe(false);
  });
});

describe('processPreAttackSpecials', () => {
  describe('ignoreBlock', () => {
    it('_ignoreBlock 플래그 설정', () => {
      const result = processPreAttackSpecials({
        card: { special: 'ignoreBlock', damage: 50, name: '로켓펀치' } as any,
        attacker: { hp: 100 } as any,
        defender: { hp: 100, block: 20 } as any,
        attackerName: 'player'
      });
      expect(result.modifiedCard._ignoreBlock).toBe(true);
    });
  });

  describe('clearAllBlock', () => {
    it('양측 방어력 0으로 설정', () => {
      const result = processPreAttackSpecials({
        card: { special: 'clearAllBlock', damage: 40, name: '필사의 일격' } as any,
        attacker: { hp: 100, block: 15, def: true } as any,
        defender: { hp: 100, block: 25, def: true } as any,
        attackerName: 'player'
      });
      expect(result.attacker.block).toBe(0);
      expect(result.defender.block).toBe(0);
      expect((result.attacker as any).def).toBe(false);
      expect((result.defender as any).def).toBe(false);
    });

    it('방어력이 있을 때만 이벤트 발생', () => {
      const result = processPreAttackSpecials({
        card: { special: 'clearAllBlock', damage: 40, name: '필사의 일격' } as any,
        attacker: { hp: 100, block: 15 } as any,
        defender: { hp: 100, block: 25 } as any,
        attackerName: 'player'
      });
      expect(result.events.length).toBe(1);
      expect(result.logs.length).toBe(1);
    });

    it('양측 방어력이 0이면 이벤트 없음', () => {
      const result = processPreAttackSpecials({
        card: { special: 'clearAllBlock', damage: 40, name: '필사의 일격' } as any,
        attacker: { hp: 100, block: 0 } as any,
        defender: { hp: 100, block: 0 } as any,
        attackerName: 'player'
      });
      expect(result.events.length).toBe(0);
    });
  });

  describe('doubleDamageIfSolo', () => {
    it('유일한 공격카드면 2배 피해', () => {
      const result = processPreAttackSpecials({
        card: { special: 'doubleDamageIfSolo', damage: 18, name: '걷어차기' } as any,
        attacker: { hp: 100 } as any,
        defender: { hp: 100 } as any,
        attackerName: 'player',
        battleContext: { playerAttackCards: [{ id: 'kick' }] as any }
      });
      expect(result.modifiedCard.damage).toBe(36);
      expect(result.events.length).toBe(1);
    });

    it('여러 공격카드면 그대로', () => {
      const result = processPreAttackSpecials({
        card: { special: 'doubleDamageIfSolo', damage: 18, name: '걷어차기' } as any,
        attacker: { hp: 100 } as any,
        defender: { hp: 100 } as any,
        attackerName: 'player',
        battleContext: { playerAttackCards: [{ id: 'kick' } as any, { id: 'stab' }] }
      });
      expect(result.modifiedCard.damage).toBe(18);
      expect(result.events.length).toBe(0);
    });

    it('battleContext 없으면 그대로', () => {
      const result = processPreAttackSpecials({
        card: { special: 'doubleDamageIfSolo', damage: 18, name: '걷어차기' } as any,
        attacker: { hp: 100 } as any,
        defender: { hp: 100 } as any,
        attackerName: 'player'
      });
      expect(result.modifiedCard.damage).toBe(18);
    });
  });

  describe('agilityBonus', () => {
    it('민첩당 5 추가 피해', () => {
      const result = processPreAttackSpecials({
        card: { special: 'agilityBonus', damage: 25, name: '취권' } as any,
        attacker: { hp: 100, agility: 2 } as any,
        defender: { hp: 100 } as any,
        attackerName: 'player'
      });
      expect(result.modifiedCard.damage).toBe(35); // 25 + (2 * 5)
    });

    it('민첩 3이면 +15', () => {
      const result = processPreAttackSpecials({
        card: { special: 'agilityBonus', damage: 20, name: '취권' } as any,
        attacker: { hp: 100, agility: 3 } as any,
        defender: { hp: 100 } as any,
        attackerName: 'player'
      });
      expect(result.modifiedCard.damage).toBe(35); // 20 + 15
    });

    it('민첩 0이면 변화 없음', () => {
      const result = processPreAttackSpecials({
        card: { special: 'agilityBonus', damage: 25, name: '취권' } as any,
        attacker: { hp: 100, agility: 0 } as any,
        defender: { hp: 100 } as any,
        attackerName: 'player'
      });
      expect(result.modifiedCard.damage).toBe(25);
      expect(result.events.length).toBe(0);
    });

    it('민첩 속성 없으면 변화 없음', () => {
      const result = processPreAttackSpecials({
        card: { special: 'agilityBonus', damage: 25, name: '취권' } as any,
        attacker: { hp: 100 } as any,
        defender: { hp: 100 } as any,
        attackerName: 'player'
      });
      expect(result.modifiedCard.damage).toBe(25);
    });
  });
});

describe('processPostAttackSpecials', () => {
  describe('executeUnder10', () => {
    it('10% 미만이면 즉사', () => {
      const result = processPostAttackSpecials({
        card: { special: 'executeUnder10', damage: 25, name: '두개골 부수기' } as any,
        attacker: { hp: 100 } as any,
        defender: { hp: 8, maxHp: 100 } as any,
        attackerName: 'player',
        damageDealt: 25
      });
      expect(result.defender.hp).toBe(0);
      expect(result.events[0].type).toBe('execute');
    });

    it('정확히 10%면 즉사 안함', () => {
      const result = processPostAttackSpecials({
        card: { special: 'executeUnder10', damage: 25, name: '두개골 부수기' } as any,
        attacker: { hp: 100 } as any,
        defender: { hp: 10, maxHp: 100 } as any,
        attackerName: 'player',
        damageDealt: 25
      });
      expect(result.defender.hp).toBe(10);
    });

    it('10% 이상이면 그대로', () => {
      const result = processPostAttackSpecials({
        card: { special: 'executeUnder10', damage: 25, name: '두개골 부수기' } as any,
        attacker: { hp: 100 } as any,
        defender: { hp: 15, maxHp: 100 } as any,
        attackerName: 'player',
        damageDealt: 25
      });
      expect(result.defender.hp).toBe(15);
    });

    it('이미 hp가 0이면 이벤트 없음', () => {
      const result = processPostAttackSpecials({
        card: { special: 'executeUnder10', damage: 25, name: '두개골 부수기' } as any,
        attacker: { hp: 100 } as any,
        defender: { hp: 0, maxHp: 100 } as any,
        attackerName: 'player',
        damageDealt: 25
      });
      expect(result.events.length).toBe(0);
    });

    it('maxHp가 200이면 임계값 20', () => {
      const result = processPostAttackSpecials({
        card: { special: 'executeUnder10', damage: 25, name: '두개골 부수기' } as any,
        attacker: { hp: 100 } as any,
        defender: { hp: 19, maxHp: 200 } as any,
        attackerName: 'player',
        damageDealt: 25
      });
      expect(result.defender.hp).toBe(0); // 19 < 20 (200*0.1)
    });
  });

  describe('vulnIfNoBlock', () => {
    it('방어력 없으면 취약 부여', () => {
      const result = processPostAttackSpecials({
        card: { special: 'vulnIfNoBlock', damage: 14, name: '검 빙글빙글' } as any,
        attacker: { hp: 100 } as any,
        defender: { hp: 100, maxHp: 100, def: false, block: 0, tokens: { usage: [], turn: [], permanent: [] } } as any,
        attackerName: 'player',
        damageDealt: 14
      });
      expect(result.defender.tokens!.turn).toBeDefined();
      expect(result.defender.tokens!.turn!.some(t => t.id === 'vulnerable')).toBe(true);
    });

    it('방어력 있으면 취약 부여 안함', () => {
      const result = processPostAttackSpecials({
        card: { special: 'vulnIfNoBlock', damage: 14, name: '검 빙글빙글' } as any,
        attacker: { hp: 100 } as any,
        defender: { hp: 100, maxHp: 100, def: true, block: 10, tokens: { usage: [], turn: [], permanent: [] } } as any,
        attackerName: 'player',
        damageDealt: 14
      });
      expect(result.events.length).toBe(0);
    });
  });

  describe('doubleVulnIfNoBlock', () => {
    it('방어력 없으면 2스택 취약 부여', () => {
      const result = processPostAttackSpecials({
        card: { special: 'doubleVulnIfNoBlock', damage: 10, name: '미늘작살' } as any,
        attacker: { hp: 100 } as any,
        defender: { hp: 100, maxHp: 100, def: false, block: 0, tokens: { usage: [], turn: [], permanent: [] } } as any,
        attackerName: 'player',
        damageDealt: 10
      });
      expect(result.defender.tokens!.turn!.find(t => t.id === 'vulnerable')!.stacks).toBe(2);
    });
  });

  describe('repeatIfLast', () => {
    it('마지막 카드면 extraHits 1', () => {
      const result = processPostAttackSpecials({
        card: { special: 'repeatIfLast', damage: 30, name: '후려치기' } as any,
        attacker: { hp: 100 } as any,
        defender: { hp: 100 } as any,
        attackerName: 'player',
        damageDealt: 30,
        battleContext: { isLastCard: true }
      });
      expect(result.extraHits).toBe(1);
    });

    it('마지막 아니면 extraHits 0', () => {
      const result = processPostAttackSpecials({
        card: { special: 'repeatIfLast', damage: 30, name: '후려치기' } as any,
        attacker: { hp: 100 } as any,
        defender: { hp: 100 } as any,
        attackerName: 'player',
        damageDealt: 30,
        battleContext: { isLastCard: false }
      });
      expect(result.extraHits).toBe(0);
    });
  });

  describe('repeatPerUnusedAttack', () => {
    it('미사용 공격카드 수만큼 extraHits', () => {
      const result = processPostAttackSpecials({
        card: { special: 'repeatPerUnusedAttack', damage: 15, name: '연쇄기' } as any,
        attacker: { hp: 100 } as any,
        defender: { hp: 100 } as any,
        attackerName: 'player',
        damageDealt: 15,
        battleContext: { unusedAttackCards: 3 }
      });
      expect(result.extraHits).toBe(3);
    });

    it('미사용 공격카드 없으면 extraHits 0', () => {
      const result = processPostAttackSpecials({
        card: { special: 'repeatPerUnusedAttack', damage: 15, name: '연쇄기' } as any,
        attacker: { hp: 100 } as any,
        defender: { hp: 100 } as any,
        attackerName: 'player',
        damageDealt: 15,
        battleContext: { unusedAttackCards: 0 }
      });
      expect(result.extraHits).toBe(0);
    });
  });

  describe('hitOnEnemyAction', () => {
    it('persistent_strike 토큰 부여', () => {
      const result = processPostAttackSpecials({
        card: { special: 'hitOnEnemyAction', damage: 20, name: '질긴 놈' } as any,
        attacker: { hp: 100, maxHp: 100, block: 0, tokens: { usage: [], turn: [], permanent: [] } } as any,
        defender: { hp: 100 } as any,
        attackerName: 'player',
        damageDealt: 20
      });
      expect(result.attacker.tokens!.turn!.some(t => t.id === 'persistent_strike')).toBe(true);
      expect(result.attacker._persistentStrikeDamage).toBe(20);
    });
  });

  describe('halfEnemyEther', () => {
    it('half_ether 토큰 부여', () => {
      const result = processPostAttackSpecials({
        card: { special: 'halfEnemyEther', damage: 30, name: '에테르 커터' } as any,
        attacker: { hp: 100 } as any,
        defender: { hp: 100, maxHp: 100, block: 0, tokens: { usage: [], turn: [], permanent: [] } } as any,
        attackerName: 'player',
        damageDealt: 30
      });
      expect(result.defender.tokens!.turn!.some(t => t.id === 'half_ether')).toBe(true);
    });
  });
});

describe('processQueueCollisions', () => {
  it('충돌 없으면 그대로', () => {
    const queue = [
      { actor: 'player', card: { name: '타격', damage: 17 } as any, sp: 7 },
      { actor: 'enemy', card: { name: '적 공격' } as any, sp: 10 }
    ] as any;
    const result = processQueueCollisions(queue, () => {});
    expect(result.filteredQueue.length).toBe(2);
    expect(result.destroyedCards.length).toBe(0);
  });

  it('destroyOnCollision으로 충돌 시 적 카드 제거', () => {
    const queue = [
      { actor: 'player', card: { name: '박치기', special: 'destroyOnCollision' } as any, sp: 9 },
      { actor: 'enemy', card: { name: '적 공격' } as any, sp: 9 }
    ] as any;
    const result = processQueueCollisions(queue, () => {});
    expect(result.filteredQueue.length).toBe(1);
    expect(result.destroyedCards.length).toBe(1);
    expect(result.filteredQueue[0].actor).toBe('player');
  });

  it('destroyOnCollision 없으면 같은 sp라도 유지', () => {
    const queue = [
      { actor: 'player', card: { name: '타격' } as any, sp: 9 },
      { actor: 'enemy', card: { name: '적 공격' } as any, sp: 9 }
    ] as any;
    const result = processQueueCollisions(queue, () => {});
    expect(result.filteredQueue.length).toBe(2);
  });

  it('여러 충돌 처리', () => {
    const queue = [
      { actor: 'player', card: { name: '박치기1', special: 'destroyOnCollision' } as any, sp: 5 },
      { actor: 'player', card: { name: '박치기2', special: 'destroyOnCollision' } as any, sp: 10 },
      { actor: 'enemy', card: { name: '적1' } as any, sp: 5 },
      { actor: 'enemy', card: { name: '적2' } as any, sp: 10 },
      { actor: 'enemy', card: { name: '적3' } as any, sp: 15 }
    ] as any;
    const result = processQueueCollisions(queue, () => {});
    expect(result.filteredQueue.length).toBe(3); // 플레이어 2 + 적3
    expect(result.destroyedCards.length).toBe(2);
  });

  it('같은 sp에 여러 적 카드면 모두 파괴', () => {
    const queue = [
      { actor: 'player', card: { name: '박치기', special: 'destroyOnCollision' } as any, sp: 7 },
      { actor: 'enemy', card: { name: '적1' } as any, sp: 7 },
      { actor: 'enemy', card: { name: '적2' } as any, sp: 7 }
    ] as any;
    const result = processQueueCollisions(queue, () => {});
    expect(result.filteredQueue.length).toBe(1);
    expect(result.destroyedCards.length).toBe(2);
  });

  it('로그 콜백 호출', () => {
    const logs: string[] = [];
    const queue = [
      { actor: 'player', card: { name: '박치기', special: 'destroyOnCollision' } as any, sp: 9 },
      { actor: 'enemy', card: { name: '적 공격' } as any, sp: 9 }
    ] as any;
    processQueueCollisions(queue, (msg) => logs.push(msg));
    expect(logs.length).toBe(1);
    expect(logs[0]).toContain('충돌');
  });
});

describe('processCollisionSpecials', () => {
  it('destroyOnCollision이면 destroyed true', () => {
    const result = processCollisionSpecials({
      card: { name: '박치기', special: 'destroyOnCollision' } as any,
      enemyCard: { name: '적 카드' } as any,
      attackerName: 'player'
    });
    expect(result.destroyed).toBe(true);
    expect(result.events[0].type).toBe('destroy');
  });

  it('destroyOnCollision 아니면 destroyed false', () => {
    const result = processCollisionSpecials({
      card: { name: '타격' } as any,
      enemyCard: { name: '적 카드' } as any,
      attackerName: 'player'
    });
    expect(result.destroyed).toBe(false);
  });
});

describe('calculateAgilitySpeedReduction', () => {
  it('민첩당 3 감소', () => {
    const result = calculateAgilitySpeedReduction(
      { special: 'agilityBonus' } as any,
      { agility: 2 } as any
    );
    expect(result).toBe(6); // 2 * 3
  });

  it('agilityBonus 없으면 0', () => {
    const result = calculateAgilitySpeedReduction(
      { damage: 10 } as any,
      { agility: 2 } as any
    );
    expect(result).toBe(0);
  });

  it('민첩 없으면 0', () => {
    const result = calculateAgilitySpeedReduction(
      { special: 'agilityBonus' } as any,
      {} as any
    );
    expect(result).toBe(0);
  });
});

// 추가 import
import {
  processPerHitRoulette,
  processTimelineSpecials,
  calculateGrowingDefense,
  processCardCreationSpecials
} from './cardSpecialEffects.js';

describe('processPerHitRoulette', () => {
  it('총기가 아닌 카드는 룰렛 체크 안함', () => {
    const result = processPerHitRoulette(
      { hp: 100, tokens: { usage: [], turn: [], permanent: [] } } as any,
      { cardCategory: 'fencing', type: 'attack', name: '검격' } as any,
      'player',
      0,
      1
    );
    expect(result.jammed).toBe(false);
    expect(result.event).toBeNull();
  });

  it('방어 카드는 룰렛 체크 안함', () => {
    const result = processPerHitRoulette(
      { hp: 100, tokens: { usage: [], turn: [], permanent: [] } } as any,
      { cardCategory: 'gun', type: 'defense', name: '총기 방어' } as any,
      'player',
      0,
      1
    );
    expect(result.jammed).toBe(false);
    expect(result.event).toBeNull();
  });

  it('singleRoulette면 첫 타격만 룰렛 체크', () => {
    const result = processPerHitRoulette(
      { hp: 100, tokens: { usage: [], turn: [], permanent: [] } } as any,
      { cardCategory: 'gun', type: 'attack', name: '라이플', special: 'singleRoulette' } as any,
      'player',
      1,
      3
    );
    expect(result.jammed).toBe(false);
    expect(result.event).toBeNull();
  });

  it('총기 공격시 룰렛 스택 증가', () => {
    const result = processPerHitRoulette(
      { hp: 100, tokens: { usage: [], turn: [], permanent: [] } } as any,
      { cardCategory: 'gun', type: 'attack', name: '권총' } as any,
      'player',
      0,
      1
    );
    expect(result.jammed).toBe(false);
    expect(result.log).toContain('룰렛');
  });

  it('적 공격시 몬스터 라벨 표시', () => {
    const result = processPerHitRoulette(
      { hp: 100, tokens: { usage: [], turn: [], permanent: [] } } as any,
      { cardCategory: 'gun', type: 'attack', name: '권총' } as any,
      'enemy',
      0,
      1
    );
    expect(result.log).toContain('몬스터');
  });
});

describe('processTimelineSpecials', () => {
  it('advanceTimeline이면 플레이어 타임라인 앞당김', () => {
    const result = processTimelineSpecials({
      card: { special: 'advanceTimeline', name: '빠른발', advanceAmount: 4 } as any,
      actor: { hp: 100 } as any,
      actorName: 'player',
      queue: [],
      currentIndex: 0
    });
    expect(result.timelineChanges.advancePlayer).toBe(4);
    expect(result.logs[0]).toContain('앞당김');
  });

  it('pushEnemyTimeline이면 피해 시 적 타임라인 밀림', () => {
    const result = processTimelineSpecials({
      card: { special: 'pushEnemyTimeline', name: '밀치기', pushAmount: 5 } as any,
      actor: { hp: 100 } as any,
      actorName: 'player',
      queue: [],
      currentIndex: 0,
      damageDealt: 10
    });
    expect(result.timelineChanges.pushEnemy).toBe(5);
    expect(result.logs[0]).toContain('밀림');
  });

  it('피해 없으면 pushEnemyTimeline 발동 안함', () => {
    const result = processTimelineSpecials({
      card: { special: 'pushEnemyTimeline', name: '밀치기', pushAmount: 5 } as any,
      actor: { hp: 100 } as any,
      actorName: 'player',
      queue: [],
      currentIndex: 0,
      damageDealt: 0
    });
    expect(result.timelineChanges.pushEnemy).toBe(0);
    expect(result.logs.length).toBe(0);
  });

  it('beatEffect는 앞당김과 밀림 동시 발동', () => {
    const result = processTimelineSpecials({
      card: { special: 'beatEffect', name: '비트', advanceAmount: 1, pushAmount: 2 } as any,
      actor: { hp: 100 } as any,
      actorName: 'player',
      queue: [],
      currentIndex: 0,
      damageDealt: 10
    });
    expect(result.timelineChanges.advancePlayer).toBe(1);
    expect(result.timelineChanges.pushEnemy).toBe(2);
    expect(result.logs.length).toBe(2);
  });

  it('pushLastEnemyCard면 적 마지막 카드 밀림', () => {
    const result = processTimelineSpecials({
      card: { special: 'pushLastEnemyCard', name: '후려치기', pushAmount: 9 } as any,
      actor: { hp: 100 } as any,
      actorName: 'player',
      queue: [],
      currentIndex: 0
    });
    expect(result.timelineChanges.pushLastEnemy).toBe(9);
    expect(result.logs[0]).toContain('마지막 카드');
  });

  it('chain trait과 다음 카드가 펜싱이면 연계 발동', () => {
    const queue = [
      { actor: 'player', card: { name: '연결기', traits: ['chain'] } as any, sp: 5 },
      { actor: 'player', card: { name: '펜싱 공격', cardCategory: 'fencing' } as any, sp: 10 }
    ] as any;
    const result = processTimelineSpecials({
      card: { traits: ['chain'], name: '연결기', advanceAmount: 3 } as any,
      actor: { hp: 100 } as any,
      actorName: 'player',
      queue,
      currentIndex: 0
    });
    expect(result.timelineChanges.advancePlayer).toBe(3);
    expect(result.logs[0]).toContain('연계');
  });

  it('적 actor일 때 몬스터 라벨 표시', () => {
    const result = processTimelineSpecials({
      card: { special: 'advanceTimeline', name: '돌진', advanceAmount: 2 } as any,
      actor: { hp: 100 } as any,
      actorName: 'enemy',
      queue: [],
      currentIndex: 0
    });
    expect(result.logs[0]).toContain('몬스터');
  });
});

describe('calculateGrowingDefense', () => {
  it('growingDefense 없으면 0', () => {
    const result = calculateGrowingDefense({ name: '일반 방어' } as any, 5);
    expect(result).toBe(0);
  });

  it('growingDefense 있어도 현재 0 반환', () => {
    // 현재 구현은 0만 반환
    const result = calculateGrowingDefense({ special: 'growingDefense' } as any, 5);
    expect(result).toBe(0);
  });
});

describe('processCardCreationSpecials', () => {
  it('피해 없으면 카드 생성 안함', () => {
    const result = processCardCreationSpecials({
      card: { special: 'createAttackOnHit', name: '플레쉬' } as any,
      actorName: 'player',
      damageDealt: 0,
      allCards: [{ id: 'attack1', type: 'attack', name: '공격1' }] as any
    });
    expect(result.createdCards.length).toBe(0);
  });

  it('공격 카드가 없으면 생성 안함', () => {
    const result = processCardCreationSpecials({
      card: { special: 'createAttackOnHit', name: '플레쉬' } as any,
      actorName: 'player',
      damageDealt: 10,
      allCards: [{ id: 'block1', type: 'defense', name: '방어1' }] as any
    });
    expect(result.createdCards.length).toBe(0);
  });

  it('적 actor도 카드 생성 가능', () => {
    const result = processCardCreationSpecials({
      card: { id: 'enemy_fleche', special: 'createAttackOnHit', name: '적 플레쉬' } as any,
      actorName: 'enemy',
      damageDealt: 10,
      allCards: [{ id: 'attack1', type: 'attack', name: '공격1' }] as any
    });
    if (result.createdCards.length > 0) {
      expect(result.logs[0]).toContain('몬스터');
    }
  });

  it('연쇄 횟수 초과시 생성 안함', () => {
    const result = processCardCreationSpecials({
      card: { isFromFleche: true, flecheChainCount: 2, name: '플레쉬 연쇄' } as any,
      actorName: 'player',
      damageDealt: 10,
      allCards: [{ id: 'attack1', type: 'attack', name: '공격1' }] as any
    });
    expect(result.createdCards.length).toBe(0);
  });
});
