/**
 * cardSpecialEffects.js
 *
 * 카드 special 효과 처리 시스템
 * 각 카드의 special 필드에 정의된 고유 효과를 처리
 */

import { addToken, removeToken, getAllTokens } from '../../../lib/tokenUtils';

/**
 * 카드의 special 효과 존재 여부 확인
 */
export function hasSpecial(card, specialName) {
  return card?.special === specialName;
}

/**
 * 공격 전 special 효과 처리 (피해 계산 전)
 * @param {Object} params
 * @returns {Object} { modifiedCard, attacker, defender, events, logs, skipNormalDamage }
 */
export function processPreAttackSpecials({
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

  // === ignoreBlock: 방어력 무시 ===
  if (hasSpecial(card, 'ignoreBlock')) {
    // 피해 계산 시 방어력을 무시하도록 플래그 설정
    modifiedCard._ignoreBlock = true;
  }

  // === clearAllBlock: 양측 방어력 0 ===
  if (hasSpecial(card, 'clearAllBlock')) {
    const playerBlockBefore = modifiedAttacker.block || 0;
    const enemyBlockBefore = modifiedDefender.block || 0;

    modifiedAttacker.block = 0;
    modifiedDefender.block = 0;
    modifiedDefender.def = false;
    modifiedAttacker.def = false;

    if (playerBlockBefore > 0 || enemyBlockBefore > 0) {
      const who = attackerName === 'player' ? '플레이어' : '몬스터';
      const msg = `${who} • 💥 ${card.name}: 양측 방어력 제거! (공격자: ${playerBlockBefore}→0, 방어자: ${enemyBlockBefore}→0)`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === doubleDamageIfSolo: 유일한 공격 카드일 때 2배 피해 ===
  if (hasSpecial(card, 'doubleDamageIfSolo')) {
    const { playerAttackCards = [] } = battleContext;
    const isOnlyAttack = playerAttackCards.length === 1;

    if (isOnlyAttack) {
      modifiedCard.damage = (modifiedCard.damage || 0) * 2;
      const who = attackerName === 'player' ? '플레이어' : '몬스터';
      const msg = `${who} • ⚡ ${card.name}: 유일한 공격 카드! 피해 2배 (${card.damage}→${modifiedCard.damage})`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === agilityBonus: 민첩 보너스 ===
  if (hasSpecial(card, 'agilityBonus')) {
    const agility = attacker.agility || 0;
    if (agility > 0) {
      const bonusDamage = agility * 5;
      modifiedCard.damage = (modifiedCard.damage || 0) + bonusDamage;
      // speedCost 감소는 카드 선택 시점에서 처리해야 함 (타임라인 계산 전)
      const who = attackerName === 'player' ? '플레이어' : '몬스터';
      const msg = `${who} • 🌀 ${card.name}: 민첩 ${agility} → +${bonusDamage} 추가 피해`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === reloadSpray: 장전 후 사격 (빈탄창 직접 제거) ===
  if (hasSpecial(card, 'reloadSpray')) {
    // 빈탄창 직접 제거
    const result = removeToken(modifiedAttacker, 'empty_chamber', 'permanent', 99);
    modifiedAttacker.tokens = result.tokens;
    if (result.logs.length > 0) {
      const who = attackerName === 'player' ? '플레이어' : '몬스터';
      const msg = `${who} • 🔫 ${card.name}: 장전! 빈탄창 해제!`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === gyrusRoulette: 행동력 1당 50% 확률로 2회 타격 ===
  if (hasSpecial(card, 'gyrusRoulette')) {
    const remainingEnergy = battleContext.remainingEnergy || 0;
    // 행동력 1당 50% 확률로 1회 또는 2회 타격
    let hits = 0;
    let bonusCount = 0;
    for (let i = 0; i < remainingEnergy; i++) {
      if (Math.random() < 0.5) {
        hits += 2;  // 50% 확률로 2회
        bonusCount++;
      } else {
        hits += 1;  // 50% 확률로 1회
      }
    }
    hits = Math.max(1, hits);  // 최소 1회
    modifiedCard.hits = hits;
    modifiedCard._addEmptyChamber = true;  // 사용 후 빈탄창 플래그
    const who = attackerName === 'player' ? '플레이어' : '몬스터';
    const msg = `${who} • 🎰 ${card.name}: 행동력 ${remainingEnergy} → ${hits}회 사격! (🎲 보너스 ${bonusCount}회)`;
    events.push({ actor: attackerName, card: card.name, type: 'special', msg });
    logs.push(msg);
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

/**
 * 공격 후 special 효과 처리 (피해 적용 후)
 * @param {Object} params
 * @returns {Object} { attacker, defender, events, logs, extraHits }
 */
export function processPostAttackSpecials({
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

  // === executeUnder10: 10% 미만 즉사 ===
  if (hasSpecial(card, 'executeUnder10')) {
    const maxHp = defender.maxHp || 100;
    const threshold = Math.floor(maxHp * 0.1);

    if (modifiedDefender.hp > 0 && modifiedDefender.hp < threshold) {
      const beforeHp = modifiedDefender.hp;
      modifiedDefender.hp = 0;
      const who = attackerName === 'player' ? '플레이어' : '몬스터';
      const target = attackerName === 'player' ? '몬스터' : '플레이어';
      const hpBeforeDmg = beforeHp + damageDealt;
      const dmgInfo = damageDealt > 0 ? ` 데미지 ${damageDealt} (체력 ${hpBeforeDmg} -> ${beforeHp}),` : '';
      const msg = `${who} -> ${target} •${dmgInfo} 💀 ${card.name}: 즉사 발동! (체력 ${beforeHp} < ${threshold})`;
      events.push({ actor: attackerName, card: card.name, type: 'execute', msg });
      logs.push(msg);
    }
  }

  // === vulnIfNoBlock: 방어력 없으면 취약 부여 ===
  if (hasSpecial(card, 'vulnIfNoBlock')) {
    const hadNoBlock = !defender.def || (defender.block || 0) <= 0;

    if (hadNoBlock) {
      const result = addToken(modifiedDefender, 'vulnerable', 1);
      modifiedDefender.tokens = result.tokens;
      const who = attackerName === 'player' ? '플레이어' : '몬스터';
      const target = attackerName === 'player' ? '몬스터' : '플레이어';
      const hpBefore = modifiedDefender.hp + damageDealt;
      const dmgInfo = damageDealt > 0 ? ` 데미지 ${damageDealt} (체력 ${hpBefore} -> ${modifiedDefender.hp}),` : '';
      const msg = `${who} -> ${target} •${dmgInfo} 🔻 ${card.name}: 취약 부여! (방어력 없음)`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === doubleVulnIfNoBlock: 방어력 없으면 2배 취약 ===
  if (hasSpecial(card, 'doubleVulnIfNoBlock')) {
    const hadNoBlock = !defender.def || (defender.block || 0) <= 0;

    if (hadNoBlock) {
      const result = addToken(modifiedDefender, 'vulnerable', 2);
      modifiedDefender.tokens = result.tokens;
      const who = attackerName === 'player' ? '플레이어' : '몬스터';
      const target = attackerName === 'player' ? '몬스터' : '플레이어';
      const hpBefore = modifiedDefender.hp + damageDealt;
      const dmgInfo = damageDealt > 0 ? ` 데미지 ${damageDealt} (체력 ${hpBefore} -> ${modifiedDefender.hp}),` : '';
      const msg = `${who} -> ${target} •${dmgInfo} 🔻🔻 ${card.name}: 2배 취약 부여! (방어력 없음)`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === repeatIfLast: 마지막 카드면 1회 추가 타격 ===
  if (hasSpecial(card, 'repeatIfLast')) {
    const { isLastCard = false } = battleContext;

    if (isLastCard) {
      extraHits = 1;
      const who = attackerName === 'player' ? '플레이어' : '몬스터';
      const msg = `${who} • 🔁 ${card.name}: 마지막 카드! 1회 추가 타격`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === repeatPerUnusedAttack: 미사용 공격 카드당 반복 ===
  if (hasSpecial(card, 'repeatPerUnusedAttack')) {
    const { unusedAttackCards = 0 } = battleContext;

    if (unusedAttackCards > 0) {
      extraHits = unusedAttackCards;
      const who = attackerName === 'player' ? '플레이어' : '몬스터';
      const msg = `${who} • 🔁 ${card.name}: 미사용 공격 카드 ${unusedAttackCards}장 → ${unusedAttackCards}회 추가 타격`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === hitOnEnemyAction: 적 카드 발동 시마다 타격 (상태 토큰으로 처리) ===
  if (hasSpecial(card, 'hitOnEnemyAction')) {
    const result = addToken(modifiedAttacker, 'persistent_strike', 1);
    modifiedAttacker.tokens = result.tokens;
    modifiedAttacker._persistentStrikeDamage = card.damage || 20;
    const who = attackerName === 'player' ? '플레이어' : '몬스터';
    const target = attackerName === 'player' ? '몬스터' : '플레이어';
    const hpBefore = modifiedDefender.hp + damageDealt;
    const dmgInfo = damageDealt > 0 ? ` 데미지 ${damageDealt} (체력 ${hpBefore} -> ${modifiedDefender.hp}),` : '';
    const msg = `${who} -> ${target} •${dmgInfo} 👊 ${card.name}: 집요한 타격 활성화! (적 행동 시마다 ${card.damage} 피해)`;
    events.push({ actor: attackerName, card: card.name, type: 'special', msg });
    logs.push(msg);
  }

  // === halfEnemyEther: 적 에테르 획득 절반 ===
  if (hasSpecial(card, 'halfEnemyEther')) {
    const result = addToken(modifiedDefender, 'half_ether', 1);
    modifiedDefender.tokens = result.tokens;
    const who = attackerName === 'player' ? '플레이어' : '몬스터';
    const target = attackerName === 'player' ? '몬스터' : '플레이어';
    const hpBefore = modifiedDefender.hp + damageDealt;
    const dmgInfo = damageDealt > 0 ? ` 데미지 ${damageDealt} (체력 ${hpBefore} -> ${modifiedDefender.hp}),` : '';
    const msg = `${who} -> ${target} •${dmgInfo} ✨ ${card.name}: 이번 턴 적 에테르 획득 50% 감소!`;
    events.push({ actor: attackerName, card: card.name, type: 'special', msg });
    logs.push(msg);
  }

  // === emptyAfterUse: 사용 후 빈탄창 ===
  if (hasSpecial(card, 'emptyAfterUse') || card._addEmptyChamber) {
    const result = addToken(modifiedAttacker, 'empty_chamber', 1);
    modifiedAttacker.tokens = result.tokens;
    const who = attackerName === 'player' ? '플레이어' : '몬스터';
    const target = attackerName === 'player' ? '몬스터' : '플레이어';
    const hpBefore = modifiedDefender.hp + damageDealt;
    const dmgInfo = damageDealt > 0 ? ` 데미지 ${damageDealt} (체력 ${hpBefore} -> ${modifiedDefender.hp}),` : '';
    const msg = `${who} -> ${target} •${dmgInfo} 🔫 ${card.name}: 사용 후 빈탄창!`;
    events.push({ actor: attackerName, card: card.name, type: 'special', msg });
    logs.push(msg);
  }

  // === reloadSpray: 장전 후 사격, 사용 후 빈탄창 ===
  if (hasSpecial(card, 'reloadSpray')) {
    // onPlay에서 이미 loaded 추가됨, 여기서 empty_chamber 추가
    const result = addToken(modifiedAttacker, 'empty_chamber', 1);
    modifiedAttacker.tokens = result.tokens;
    const who = attackerName === 'player' ? '플레이어' : '몬스터';
    const target = attackerName === 'player' ? '몬스터' : '플레이어';
    const hpBefore = modifiedDefender.hp + damageDealt;
    const dmgInfo = damageDealt > 0 ? ` 데미지 ${damageDealt} (체력 ${hpBefore} -> ${modifiedDefender.hp}),` : '';
    const msg = `${who} -> ${target} •${dmgInfo} 🔫 ${card.name}: 난사 후 빈탄창!`;
    events.push({ actor: attackerName, card: card.name, type: 'special', msg });
    logs.push(msg);
  }

  // === _applyBurn: 소이탄 토큰 효과 - 화상 부여 ===
  if (card._applyBurn) {
    const result = addToken(modifiedDefender, 'burn', 1);
    modifiedDefender.tokens = result.tokens;
    const who = attackerName === 'player' ? '플레이어' : '몬스터';
    const target = attackerName === 'player' ? '몬스터' : '플레이어';
    const msg = `${who} -> ${target} • 🔥 소이탄: 화상 부여!`;
    events.push({ actor: attackerName, card: card.name, type: 'special', msg });
    logs.push(msg);
  }

  return {
    attacker: modifiedAttacker,
    defender: modifiedDefender,
    events,
    logs,
    extraHits
  };
}

/**
 * 타임라인 충돌 시 special 효과 처리
 * @param {Object} params
 * @returns {Object} { destroyed, events, logs }
 */
export function processCollisionSpecials({
  card,
  enemyCard,
  attackerName
}) {
  const events = [];
  const logs = [];
  let destroyed = false;

  // === destroyOnCollision: 충돌 시 적 카드 파괴 ===
  if (hasSpecial(card, 'destroyOnCollision')) {
    destroyed = true;
    const who = attackerName === 'player' ? '플레이어' : '몬스터';
    const msg = `${who} • 💥 ${card.name}: 충돌! ${enemyCard?.name || '적 카드'} 파괴!`;
    events.push({ actor: attackerName, card: card.name, type: 'destroy', msg });
    logs.push(msg);
  }

  return { destroyed, events, logs };
}

/**
 * 큐에서 충돌 감지 및 적 카드 파괴 처리
 * @param {Array} queue - 정렬된 큐 배열 (sp 값 포함)
 * @param {Function} addLog - 로그 추가 함수
 * @returns {Object} { filteredQueue, destroyedCards, logs }
 */
export function processQueueCollisions(queue, addLog) {
  const destroyedCards = [];
  const logs = [];

  // destroyOnCollision 특성을 가진 플레이어 카드 찾기
  const playerCardsWithCollision = queue.filter(
    item => item.actor === 'player' && hasSpecial(item.card, 'destroyOnCollision')
  );

  if (playerCardsWithCollision.length === 0) {
    return { filteredQueue: queue, destroyedCards, logs };
  }

  // 적 카드와의 충돌 감지
  const cardsToRemove = new Set();

  for (const playerItem of playerCardsWithCollision) {
    // 같은 sp 값을 가진 적 카드 찾기
    const collidingEnemyCards = queue.filter(
      item => item.actor === 'enemy' && item.sp === playerItem.sp
    );

    for (const enemyItem of collidingEnemyCards) {
      if (!cardsToRemove.has(enemyItem)) {
        cardsToRemove.add(enemyItem);
        destroyedCards.push(enemyItem.card);
        const msg = `플레이어 • 💥 ${playerItem.card.name}: 타임라인 충돌! ${enemyItem.card?.name || '적 카드'} 파괴!`;
        logs.push(msg);
        if (addLog) addLog(msg);
      }
    }
  }

  // 파괴된 카드 제외한 큐 반환
  const filteredQueue = queue.filter(item => !cardsToRemove.has(item));

  return { filteredQueue, destroyedCards, logs };
}

/**
 * 방어력 무시 여부 확인
 */
export function shouldIgnoreBlock(card) {
  return hasSpecial(card, 'ignoreBlock') || card._ignoreBlock === true;
}

/**
 * 민첩 보너스로 speedCost 감소 계산
 */
export function calculateAgilitySpeedReduction(card, player) {
  if (!hasSpecial(card, 'agilityBonus')) return 0;
  const agility = player.agility || 0;
  return agility * 3; // 민첩 1당 시간 소모 3 감소
}

/**
 * 타임라인 조작 효과 처리
 * @param {Object} params
 * @returns {Object} { timelineChanges, events, logs }
 */
export function processTimelineSpecials({
  card,
  actor,
  actorName,
  queue,
  currentIndex,
  damageDealt = 0
}) {
  const events = [];
  const logs = [];
  const timelineChanges = {
    advancePlayer: 0,    // 플레이어 카드 앞당김
    pushEnemy: 0,        // 적 카드 뒤로 밀기
    pushLastEnemy: 0,    // 적의 마지막 카드만 뒤로 밀기
  };

  // === advanceTimeline: 내 타임라인 앞당기기 (마르쉐) ===
  if (hasSpecial(card, 'advanceTimeline')) {
    const amount = card.advanceAmount || 4;
    timelineChanges.advancePlayer = amount;
    const who = actorName === 'player' ? '플레이어' : '몬스터';
    const msg = `${who} • ⏪ ${card.name}: 내 타임라인 ${amount} 앞당김!`;
    events.push({ actor: actorName, card: card.name, type: 'timeline', msg });
    logs.push(msg);
  }

  // === pushEnemyTimeline: 피해 입히면 상대 타임라인 밀기 (런지) ===
  if (hasSpecial(card, 'pushEnemyTimeline') && damageDealt > 0) {
    const amount = card.pushAmount || 5;
    timelineChanges.pushEnemy = amount;
    const who = actorName === 'player' ? '플레이어' : '몬스터';
    const msg = `${who} • ⏩ ${card.name}: 피해 성공! 적 타임라인 ${amount} 뒤로 밀림!`;
    events.push({ actor: actorName, card: card.name, type: 'timeline', msg });
    logs.push(msg);
  }

  // === beatEffect: 내 타임라인 앞당기고 피해 입히면 적 타임라인 밀기 (비트) ===
  if (hasSpecial(card, 'beatEffect')) {
    const advanceAmount = card.advanceAmount || 1;
    timelineChanges.advancePlayer = advanceAmount;
    const who = actorName === 'player' ? '플레이어' : '몬스터';
    const msg1 = `${who} • ⏪ ${card.name}: 내 타임라인 ${advanceAmount} 앞당김!`;
    events.push({ actor: actorName, card: card.name, type: 'timeline', msg: msg1 });
    logs.push(msg1);

    if (damageDealt > 0) {
      const pushAmount = card.pushAmount || 2;
      timelineChanges.pushEnemy = pushAmount;
      const msg2 = `${who} • ⏩ ${card.name}: 피해 성공! 적 타임라인 ${pushAmount} 뒤로 밀림!`;
      events.push({ actor: actorName, card: card.name, type: 'timeline', msg: msg2 });
      logs.push(msg2);
    }
  }

  // === pushLastEnemyCard: 적의 마지막 카드만 밀기 (흐트리기) ===
  if (hasSpecial(card, 'pushLastEnemyCard')) {
    const amount = card.pushAmount || 9;
    timelineChanges.pushLastEnemy = amount;
    const who = actorName === 'player' ? '플레이어' : '몬스터';
    const msg = `${who} • ⏩ ${card.name}: 적의 마지막 카드를 ${amount} 뒤로 밀음!`;
    events.push({ actor: actorName, card: card.name, type: 'timeline', msg });
    logs.push(msg);
  }

  return { timelineChanges, events, logs };
}

/**
 * 성장하는 방어력 계산 (방어자세)
 * 발동 시에는 0, 이후 타임라인 진행 시 LegacyBattleApp에서 직접 추가
 * @param {Object} card - 카드 객체
 * @param {number} ticksPassed - 지나간 타임라인 틱 수
 * @returns {number} 추가 방어력
 */
export function calculateGrowingDefense(card, ticksPassed) {
  if (!hasSpecial(card, 'growingDefense')) return 0;
  // 발동 시에는 0 - 이후 타임라인 진행마다 방어력은 별도로 추가됨
  return 0;
}

/**
 * 카드 창조 효과 처리 (플레쉬, 브리치 등)
 * @param {Object} params
 * @returns {Object} { createdCards, events, logs }
 */
export function processCardCreationSpecials({
  card,
  actorName,
  damageDealt = 0,
  allCards = []
}) {
  const events = [];
  const logs = [];
  const createdCards = [];

  // === createAttackOnHit 또는 플레쉬에서 창조된 카드: 피해 입히면 공격 카드 3장 창조 ===
  // 플레쉬 연쇄는 최대 2번까지만 (원본 플레쉬 + 연쇄 1회 + 연쇄 2회)
  const MAX_FLECHE_CHAIN = 2;
  const currentChainCount = card.flecheChainCount || 0;
  const canChain = card.isFromFleche ? currentChainCount < MAX_FLECHE_CHAIN : true;
  const shouldCreateCards = (hasSpecial(card, 'createAttackOnHit') || card.isFromFleche) && damageDealt > 0 && canChain;

  if (shouldCreateCards) {
    // 공격 카드 중에서 랜덤 선택 (중복 방지, 원본 카드 제외)
    const originalCardId = card.createdBy || card.id;  // 원본 플레쉬 카드 ID
    const attackCards = allCards.filter(c => c.type === 'attack' && c.id !== originalCardId);
    if (attackCards.length > 0) {
      // 3장의 서로 다른 공격 카드 창조 (중복 방지)
      const shuffled = [...attackCards].sort(() => Math.random() - 0.5);
      const selectedCards = shuffled.slice(0, Math.min(3, shuffled.length));

      // 연쇄 카운트 계산 (원본 플레쉬면 1, 연쇄 카드면 +1)
      const nextChainCount = card.isFromFleche ? currentChainCount + 1 : 1;

      for (let i = 0; i < selectedCards.length; i++) {
        const selectedCard = selectedCards[i];
        const newCard = {
          ...selectedCard,
          isGhost: true, // 유령카드로 생성
          createdBy: originalCardId,  // 원본 플레쉬 카드 추적
          createdId: `${selectedCard.id}_created_${Date.now()}_${i}`,
          isFromFleche: true,  // 플레쉬에서 창조된 카드 표시 (연쇄 효과용)
          flecheChainCount: nextChainCount  // 연쇄 카운트 (최대 2)
        };
        createdCards.push(newCard);
      }
      const cardNames = createdCards.map(c => c.name).join(', ');
      const sourceName = card.isFromFleche ? `플레쉬 연쇄 ${currentChainCount + 1}` : card.name;
      const chainInfo = nextChainCount < MAX_FLECHE_CHAIN ? '' : ' (마지막 연쇄)';
      const who = actorName === 'player' ? '플레이어' : '몬스터';
      const msg = `${who} • ✨ ${sourceName}: 피해 성공! ${createdCards.length}장의 공격 카드 창조!${chainInfo} (${cardNames})`;
      events.push({ actor: actorName, card: card.name, type: 'create', msg });
      logs.push(msg);
    }
  }

  return { createdCards, events, logs };
}

/**
 * 카드 사용 시 special 효과 처리 (comboStyle, autoReload, mentalFocus 등)
 * @param {Object} params
 * @returns {Object} { bonusCards, tokens, nextTurnEffects, events, logs }
 */
export function processCardPlaySpecials({
  card,
  attacker,
  attackerName,
  battleContext = {}
}) {
  const events = [];
  const logs = [];
  const bonusCards = [];  // 큐에 추가할 보너스 카드
  const tokensToAdd = []; // 추가할 토큰
  let nextTurnEffects = null;  // 다음 턴 효과

  const { usedCardCategories = [], hand = [], allCards = [] } = battleContext;

  // === comboStyle: 검격→총격 또는 총격→검격 보너스 ===
  if (hasSpecial(card, 'comboStyle')) {
    const usedFencing = usedCardCategories.includes('fencing');
    const usedGun = usedCardCategories.includes('gun');

    const who = attackerName === 'player' ? '플레이어' : '몬스터';
    if (usedFencing && !usedGun) {
      // 검격을 냈으면 총격 보너스
      const gunCards = allCards.filter(c => c.cardCategory === 'gun' && c.type === 'attack');
      if (gunCards.length > 0) {
        const randomGun = gunCards[Math.floor(Math.random() * gunCards.length)];
        bonusCards.push({
          ...randomGun,
          isGhost: true,
          createdBy: card.id,
          createdId: `${randomGun.id}_combo_${Date.now()}`
        });
        const msg = `${who} • ⚔️→🔫 ${card.name}: 검격 연계! "${randomGun.name}" 추가 발동!`;
        events.push({ actor: attackerName, card: card.name, type: 'combo', msg });
        logs.push(msg);
      }
    } else if (usedGun && !usedFencing) {
      // 총격을 냈으면 검격 보너스
      const fencingCards = allCards.filter(c => c.cardCategory === 'fencing' && c.type === 'attack');
      if (fencingCards.length > 0) {
        const randomFencing = fencingCards[Math.floor(Math.random() * fencingCards.length)];
        bonusCards.push({
          ...randomFencing,
          isGhost: true,
          createdBy: card.id,
          createdId: `${randomFencing.id}_combo_${Date.now()}`
        });
        const msg = `${who} • 🔫→⚔️ ${card.name}: 총격 연계! "${randomFencing.name}" 추가 발동!`;
        events.push({ actor: attackerName, card: card.name, type: 'combo', msg });
        logs.push(msg);
      }
    } else if (usedFencing && usedGun) {
      // 둘 다 냈으면 둘 중 랜덤
      const useGun = Math.random() < 0.5;
      const targetCards = useGun
        ? allCards.filter(c => c.cardCategory === 'gun' && c.type === 'attack')
        : allCards.filter(c => c.cardCategory === 'fencing' && c.type === 'attack');
      if (targetCards.length > 0) {
        const randomCard = targetCards[Math.floor(Math.random() * targetCards.length)];
        bonusCards.push({
          ...randomCard,
          isGhost: true,
          createdBy: card.id,
          createdId: `${randomCard.id}_combo_${Date.now()}`
        });
        const msg = `${who} • 🔄 ${card.name}: 복합 연계! "${randomCard.name}" 추가 발동!`;
        events.push({ actor: attackerName, card: card.name, type: 'combo', msg });
        logs.push(msg);
      }
    }
  }

  // === autoReload: 손패에 장전 카드가 있으면 자동 장전 ===
  if (hasSpecial(card, 'autoReload')) {
    const hasReloadCard = hand.some(c => c.id === 'reload' || c.id === 'ap_load' || c.id === 'incendiary_load');
    if (hasReloadCard) {
      tokensToAdd.push({ id: 'loaded', stacks: 1 });
      const who = attackerName === 'player' ? '플레이어' : '몬스터';
      const msg = `${who} • 🔄 ${card.name}: 손패에 장전 카드 감지! 자동 장전!`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === mentalFocus: 정신집중 토큰 부여 ===
  if (hasSpecial(card, 'mentalFocus')) {
    tokensToAdd.push({ id: 'focus', stacks: 1 });
    const who = attackerName === 'player' ? '플레이어' : '몬스터';
    const msg = `${who} • 🧘 ${card.name}: 정신집중!`;
    events.push({ actor: attackerName, card: card.name, type: 'special', msg });
    logs.push(msg);
  }

  return { bonusCards, tokensToAdd, nextTurnEffects, events, logs };
}

// =====================
// 치명타 시스템
// =====================

/**
 * 치명타 확률 계산
 * @param {Object} actor - 행동 주체 (player 또는 enemy)
 * @param {number} remainingEnergy - 남은 행동력
 * @returns {number} 치명타 확률 (0~100)
 */
export function calculateCritChance(actor, remainingEnergy = 0) {
  const baseCritChance = 5; // 기본 5%
  const strength = actor.strength || 0;
  const energy = remainingEnergy || 0;

  // crit_boost 토큰 효과 (매의 눈 등)
  let critBoostFromTokens = 0;
  if (actor.tokens) {
    const allTokens = getAllTokens(actor);
    allTokens.forEach(token => {
      if (token.effect?.type === 'CRIT_BOOST') {
        critBoostFromTokens += (token.effect.value || 5) * (token.stacks || 1);
      }
    });
  }

  return baseCritChance + strength + energy + critBoostFromTokens;
}

/**
 * 치명타 판정
 * @param {Object} actor - 행동 주체
 * @param {number} remainingEnergy - 남은 행동력
 * @returns {boolean} 치명타 발생 여부
 */
export function rollCritical(actor, remainingEnergy = 0) {
  const critChance = calculateCritChance(actor, remainingEnergy);
  const roll = Math.random() * 100;
  return roll < critChance;
}

/**
 * 치명타 적용 (데미지)
 * @param {number} damage - 원본 데미지
 * @param {boolean} isCritical - 치명타 여부
 * @returns {number} 최종 데미지
 */
export function applyCriticalDamage(damage, isCritical) {
  return isCritical ? damage * 2 : damage;
}

/**
 * 치명타 적용 (상태이상 스택)
 * @param {number} stacks - 원본 스택 수
 * @param {boolean} isCritical - 치명타 여부
 * @returns {number} 최종 스택 수
 */
export function applyCriticalStacks(stacks, isCritical) {
  return isCritical ? stacks + 1 : stacks;
}
