/**
 * cardSpecialEffects.standalone.test.js
 *
 * 독립 실행 가능한 카드 special 효과 유닛 테스트
 * (외부 의존성 없이 순수 함수 로직만 테스트)
 */

// 간단한 테스트 프레임워크
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${e.message}`);
    failed++;
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value, got ${actual}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy value, got ${actual}`);
      }
    }
  };
}

// ============================================
// 인라인 함수 구현 (의존성 없이 테스트용)
// ============================================

function hasSpecial(card, specialName) {
  return card?.special === specialName;
}

function shouldIgnoreBlock(card) {
  return hasSpecial(card, 'ignoreBlock') || card._ignoreBlock === true;
}

// 간단한 addToken mock
function addToken(entity, tokenId, stacks) {
  const tokens = entity.tokens ? [...entity.tokens] : [];
  const existing = tokens.find(t => t.id === tokenId);
  if (existing) {
    existing.stacks = (existing.stacks || 1) + stacks;
  } else {
    tokens.push({ id: tokenId, stacks });
  }
  return { tokens };
}

function processPreAttackSpecials({
  card,
  attacker,
  defender,
  attackerName,
  battleContext = {}
}) {
  let modifiedCard = { ...card };
  let modifiedAttacker = { ...attacker };
  let modifiedDefender = { ...defender };
  const events = [];
  const logs = [];
  let skipNormalDamage = false;

  // ignoreBlock
  if (hasSpecial(card, 'ignoreBlock')) {
    modifiedCard._ignoreBlock = true;
  }

  // clearAllBlock
  if (hasSpecial(card, 'clearAllBlock')) {
    const playerBlockBefore = modifiedAttacker.block || 0;
    const enemyBlockBefore = modifiedDefender.block || 0;

    modifiedAttacker.block = 0;
    modifiedDefender.block = 0;
    modifiedDefender.def = false;
    modifiedAttacker.def = false;

    if (playerBlockBefore > 0 || enemyBlockBefore > 0) {
      const msg = `💥 ${card.name}: 양측 방어력 제거! (공격자: ${playerBlockBefore}→0, 방어자: ${enemyBlockBefore}→0)`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // doubleDamageIfSolo
  if (hasSpecial(card, 'doubleDamageIfSolo')) {
    const { playerAttackCards = [] } = battleContext;
    const isOnlyAttack = playerAttackCards.length === 1;

    if (isOnlyAttack) {
      modifiedCard.damage = (modifiedCard.damage || 0) * 2;
      const msg = `⚡ ${card.name}: 유일한 공격 카드! 피해 2배 (${card.damage}→${modifiedCard.damage})`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // agilityBonus
  if (hasSpecial(card, 'agilityBonus')) {
    const agility = attacker.agility || 0;
    if (agility > 0) {
      const bonusDamage = agility * 5;
      modifiedCard.damage = (modifiedCard.damage || 0) + bonusDamage;
      const msg = `🌀 ${card.name}: 민첩 ${agility} → +${bonusDamage} 추가 피해`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  return {
    modifiedCard,
    attacker: modifiedAttacker,
    defender: modifiedDefender,
    events,
    logs,
    skipNormalDamage
  };
}

function processPostAttackSpecials({
  card,
  attacker,
  defender,
  attackerName,
  damageDealt,
  battleContext = {}
}) {
  let modifiedAttacker = { ...attacker };
  let modifiedDefender = { ...defender };
  const events = [];
  const logs = [];
  let extraHits = 0;

  // executeUnder10
  if (hasSpecial(card, 'executeUnder10')) {
    const maxHp = defender.maxHp || 100;
    const threshold = Math.floor(maxHp * 0.1);

    if (modifiedDefender.hp > 0 && modifiedDefender.hp < threshold) {
      const beforeHp = modifiedDefender.hp;
      modifiedDefender.hp = 0;
      const msg = `💀 ${card.name}: 즉사 발동! (체력 ${beforeHp} < ${threshold} = 최대 체력의 10%)`;
      events.push({ actor: attackerName, card: card.name, type: 'execute', msg });
      logs.push(msg);
    }
  }

  // repeatIfLast
  if (hasSpecial(card, 'repeatIfLast')) {
    const { isLastCard = false } = battleContext;

    if (isLastCard) {
      extraHits = 1;
      const msg = `🔁 ${card.name}: 마지막 카드! 1회 추가 타격`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // repeatPerUnusedAttack
  if (hasSpecial(card, 'repeatPerUnusedAttack')) {
    const { unusedAttackCards = 0 } = battleContext;

    if (unusedAttackCards > 0) {
      extraHits = unusedAttackCards;
      const msg = `🔁 ${card.name}: 미사용 공격 카드 ${unusedAttackCards}장 → ${unusedAttackCards}회 추가 타격`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  return {
    attacker: modifiedAttacker,
    defender: modifiedDefender,
    events,
    logs,
    extraHits
  };
}

function processQueueCollisions(queue, addLog) {
  const destroyedCards = [];
  const logs = [];

  const playerCardsWithCollision = queue.filter(
    item => item.actor === 'player' && hasSpecial(item.card, 'destroyOnCollision')
  );

  if (playerCardsWithCollision.length === 0) {
    return { filteredQueue: queue, destroyedCards, logs };
  }

  const cardsToRemove = new Set();

  for (const playerItem of playerCardsWithCollision) {
    const collidingEnemyCards = queue.filter(
      item => item.actor === 'enemy' && item.sp === playerItem.sp
    );

    for (const enemyItem of collidingEnemyCards) {
      if (!cardsToRemove.has(enemyItem)) {
        cardsToRemove.add(enemyItem);
        destroyedCards.push(enemyItem.card);
        const msg = `💥 ${playerItem.card.name}: 타임라인 충돌! ${enemyItem.card?.name || '적 카드'} 파괴!`;
        logs.push(msg);
        if (addLog) addLog(msg);
      }
    }
  }

  const filteredQueue = queue.filter(item => !cardsToRemove.has(item));

  return { filteredQueue, destroyedCards, logs };
}

// ============================================
// 테스트 시작
// ============================================

console.log('\n=== cardSpecialEffects 테스트 ===\n');

// hasSpecial 테스트
test('hasSpecial: 카드에 special이 있으면 true', () => {
  const card = { special: 'ignoreBlock' };
  expect(hasSpecial(card, 'ignoreBlock')).toBe(true);
});

test('hasSpecial: 다른 special이면 false', () => {
  const card = { special: 'ignoreBlock' };
  expect(hasSpecial(card, 'clearAllBlock')).toBe(false);
});

test('hasSpecial: special이 없으면 false', () => {
  const card = { damage: 10 };
  expect(hasSpecial(card, 'ignoreBlock')).toBe(false);
});

// shouldIgnoreBlock 테스트
test('shouldIgnoreBlock: ignoreBlock special이면 true', () => {
  const card = { special: 'ignoreBlock' };
  expect(shouldIgnoreBlock(card)).toBe(true);
});

test('shouldIgnoreBlock: _ignoreBlock 플래그면 true', () => {
  const card = { _ignoreBlock: true };
  expect(shouldIgnoreBlock(card)).toBe(true);
});

test('shouldIgnoreBlock: 아무것도 없으면 false', () => {
  const card = { damage: 10 };
  expect(shouldIgnoreBlock(card)).toBe(false);
});

// processPreAttackSpecials 테스트
test('processPreAttackSpecials: ignoreBlock 플래그 설정', () => {
  const result = processPreAttackSpecials({
    card: { special: 'ignoreBlock', damage: 50, name: '로켓펀치' },
    attacker: { hp: 100 },
    defender: { hp: 100, block: 20 },
    attackerName: 'player'
  });
  expect(result.modifiedCard._ignoreBlock).toBe(true);
});

test('processPreAttackSpecials: clearAllBlock 양측 방어력 0', () => {
  const result = processPreAttackSpecials({
    card: { special: 'clearAllBlock', damage: 40, name: '필사의 일격' },
    attacker: { hp: 100, block: 15, def: true },
    defender: { hp: 100, block: 25, def: true },
    attackerName: 'player'
  });
  expect(result.attacker.block).toBe(0);
  expect(result.defender.block).toBe(0);
  expect(result.events.length > 0).toBe(true);
});

test('processPreAttackSpecials: doubleDamageIfSolo 유일한 공격카드', () => {
  const result = processPreAttackSpecials({
    card: { special: 'doubleDamageIfSolo', damage: 18, name: '걷어차기' },
    attacker: { hp: 100 },
    defender: { hp: 100 },
    attackerName: 'player',
    battleContext: { playerAttackCards: [{ id: 'kick' }] } // 1장만
  });
  expect(result.modifiedCard.damage).toBe(36); // 2배
});

test('processPreAttackSpecials: doubleDamageIfSolo 여러 공격카드면 그대로', () => {
  const result = processPreAttackSpecials({
    card: { special: 'doubleDamageIfSolo', damage: 18, name: '걷어차기' },
    attacker: { hp: 100 },
    defender: { hp: 100 },
    attackerName: 'player',
    battleContext: { playerAttackCards: [{ id: 'kick' }, { id: 'stab' }] } // 2장
  });
  expect(result.modifiedCard.damage).toBe(18); // 그대로
});

test('processPreAttackSpecials: agilityBonus 민첩 보너스', () => {
  const result = processPreAttackSpecials({
    card: { special: 'agilityBonus', damage: 25, name: '취권' },
    attacker: { hp: 100, agility: 2 },
    defender: { hp: 100 },
    attackerName: 'player'
  });
  expect(result.modifiedCard.damage).toBe(35); // 25 + (2 * 5)
});

// processPostAttackSpecials 테스트
test('processPostAttackSpecials: executeUnder10 즉사', () => {
  const result = processPostAttackSpecials({
    card: { special: 'executeUnder10', damage: 25, name: '두개골 부수기' },
    attacker: { hp: 100 },
    defender: { hp: 8, maxHp: 100 }, // 8% < 10%
    attackerName: 'player',
    damageDealt: 25
  });
  expect(result.defender.hp).toBe(0); // 즉사
});

test('processPostAttackSpecials: executeUnder10 10% 이상이면 그대로', () => {
  const result = processPostAttackSpecials({
    card: { special: 'executeUnder10', damage: 25, name: '두개골 부수기' },
    attacker: { hp: 100 },
    defender: { hp: 15, maxHp: 100 }, // 15% > 10%
    attackerName: 'player',
    damageDealt: 25
  });
  expect(result.defender.hp).toBe(15); // 그대로
});

test('processPostAttackSpecials: repeatIfLast 마지막 카드', () => {
  const result = processPostAttackSpecials({
    card: { special: 'repeatIfLast', damage: 30, name: '후려치기' },
    attacker: { hp: 100 },
    defender: { hp: 100 },
    attackerName: 'player',
    damageDealt: 30,
    battleContext: { isLastCard: true }
  });
  expect(result.extraHits).toBe(1);
});

test('processPostAttackSpecials: repeatIfLast 마지막 아니면 0', () => {
  const result = processPostAttackSpecials({
    card: { special: 'repeatIfLast', damage: 30, name: '후려치기' },
    attacker: { hp: 100 },
    defender: { hp: 100 },
    attackerName: 'player',
    damageDealt: 30,
    battleContext: { isLastCard: false }
  });
  expect(result.extraHits).toBe(0);
});

test('processPostAttackSpecials: repeatPerUnusedAttack 미사용 공격카드', () => {
  const result = processPostAttackSpecials({
    card: { special: 'repeatPerUnusedAttack', damage: 15, name: '연쇄기' },
    attacker: { hp: 100 },
    defender: { hp: 100 },
    attackerName: 'player',
    damageDealt: 15,
    battleContext: { unusedAttackCards: 3 }
  });
  expect(result.extraHits).toBe(3);
});

// processQueueCollisions 테스트
test('processQueueCollisions: 충돌 없으면 그대로', () => {
  const queue = [
    { actor: 'player', card: { name: '타격', damage: 17 }, sp: 7 },
    { actor: 'enemy', card: { name: '적 공격' }, sp: 10 }
  ];
  const result = processQueueCollisions(queue, () => {});
  expect(result.filteredQueue.length).toBe(2);
  expect(result.destroyedCards.length).toBe(0);
});

test('processQueueCollisions: destroyOnCollision으로 충돌 시 적 카드 제거', () => {
  const queue = [
    { actor: 'player', card: { name: '박치기', special: 'destroyOnCollision' }, sp: 9 },
    { actor: 'enemy', card: { name: '적 공격' }, sp: 9 } // 같은 sp
  ];
  const result = processQueueCollisions(queue, () => {});
  expect(result.filteredQueue.length).toBe(1);
  expect(result.destroyedCards.length).toBe(1);
  expect(result.filteredQueue[0].actor).toBe('player');
});

test('processQueueCollisions: destroyOnCollision 없으면 같은 sp라도 유지', () => {
  const queue = [
    { actor: 'player', card: { name: '타격' }, sp: 9 },
    { actor: 'enemy', card: { name: '적 공격' }, sp: 9 }
  ];
  const result = processQueueCollisions(queue, () => {});
  expect(result.filteredQueue.length).toBe(2);
});

// 결과 출력
console.log(`\n=== 테스트 결과: ${passed}/${passed + failed} 통과 ===\n`);
process.exit(failed > 0 ? 1 : 0);
