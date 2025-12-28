/**
 * @file hitCalculation.ts
 * @description 단일 타격 계산 및 반격 처리 로직
 *
 * combatActions.ts에서 분리됨
 */

import type {
  Card,
  Combatant,
  BattleEvent,
  CounterResult,
  BattleContext,
  CounterShotResult,
  SingleHitResult,
  PreProcessedResult,
  SpecialCard
} from '../../../types';
import { hasTrait } from '../utils/battleUtils';
import { applyTokenEffectsToCard, applyTokenEffectsOnDamage, consumeTokens } from '../../../lib/tokenEffects';
import { addToken, removeToken, hasToken, getTokenStacks } from '../../../lib/tokenUtils';
import { CARDS } from '../battleData';
import {
  processPreAttackSpecials,
  shouldIgnoreBlock,
  applyCriticalDamage
} from '../utils/cardSpecialEffects';

/**
 * 반격 처리
 * @param defender - 반격하는 방어자
 * @param attacker - 반격 대상 공격자
 * @param attackerName - 원래 공격자 이름
 * @param counterDmg - 반격 피해량 (null이면 defender.counter 사용)
 * @param battleContext - 전투 컨텍스트
 */
export function applyCounter(
  defender: Combatant,
  attacker: Combatant,
  attackerName: 'player' | 'enemy',
  counterDmg: number | null = null,
  battleContext: BattleContext = {}
): CounterResult {
  const actualCounterDmg = counterDmg !== null ? counterDmg : (defender.counter || 0);
  const beforeHP = attacker.hp;
  const updatedAttacker = {
    ...attacker,
    hp: Math.max(0, attacker.hp - actualCounterDmg)
  };

  const enemyName = battleContext.enemyDisplayName || '몬스터';
  const cmsg = `${attackerName === 'player' ? `${enemyName} -> 플레이어` : `플레이어 -> ${enemyName}`} • 반격 ${actualCounterDmg} (체력 ${beforeHP} -> ${updatedAttacker.hp})`;

  const event: BattleEvent = { actor: 'counter', value: actualCounterDmg, msg: cmsg };
  const log = `${attackerName === 'player' ? '👾' : '🔵'} ${cmsg}`;

  return {
    attacker: updatedAttacker,
    damage: actualCounterDmg,
    events: [event],
    logs: [log]
  };
}

/**
 * 대응사격 처리 (사격 카드로 반격)
 * @param defender - 대응사격하는 방어자
 * @param attacker - 대응사격 대상
 * @param attackerName - 원래 공격자 이름
 * @param battleContext - 전투 컨텍스트
 */
export function applyCounterShot(
  defender: Combatant,
  attacker: Combatant,
  attackerName: 'player' | 'enemy',
  battleContext: BattleContext = {}
): CounterShotResult {
  const events = [];
  const logs = [];

  const shootCard = CARDS.find(c => c.id === 'shoot');
  if (!shootCard) {
    return { defender, attacker, damage: 0, events, logs };
  }

  const shotDamage = shootCard.damage || 8;
  const beforeHP = attacker.hp;
  const updatedAttacker = {
    ...attacker,
    hp: Math.max(0, attacker.hp - shotDamage)
  };

  const tokenResult = removeToken(defender, 'counterShot', 'usage', 1);
  let updatedDefender = { ...defender, tokens: tokenResult.tokens };

  const rouletteResult = addToken(updatedDefender, 'roulette', 1);
  updatedDefender = { ...updatedDefender, tokens: rouletteResult.tokens };
  const newRouletteStacks = getTokenStacks(updatedDefender, 'roulette');

  const enemyName = battleContext.enemyDisplayName || '몬스터';
  const defenderName = attackerName === 'player' ? enemyName : '플레이어';
  const targetName = attackerName === 'player' ? '플레이어' : enemyName;
  const cmsg = `${defenderName} -> ${targetName} • 🔫 대응사격 ${shotDamage} (체력 ${beforeHP} -> ${updatedAttacker.hp})`;

  events.push({
    actor: 'counterShot',
    card: shootCard.name,
    type: 'counterShot',
    dmg: shotDamage,
    msg: cmsg
  });
  logs.push(`${attackerName === 'player' ? '👾' : '🔵'} ${cmsg}`);

  const rouletteMsg = `${defenderName} • 🎰 대응사격: 룰렛 ${newRouletteStacks} (${Math.round(newRouletteStacks * 5)}% 위험)`;
  events.push({ actor: 'counterShot', type: 'roulette', msg: rouletteMsg });
  logs.push(`${attackerName === 'player' ? '👾' : '🔵'} ${rouletteMsg}`);

  return {
    defender: updatedDefender,
    attacker: updatedAttacker,
    damage: shotDamage,
    events,
    logs
  };
}

/**
 * 단일 타격 계산
 * @param attacker - 공격자
 * @param defender - 방어자
 * @param card - 사용 카드
 * @param attackerName - 공격자 이름
 * @param battleContext - 전투 컨텍스트
 * @param isCritical - 치명타 여부
 * @param preProcessedResult - 사전 처리 결과
 */
export function calculateSingleHit(
  attacker: Combatant,
  defender: Combatant,
  card: Card,
  attackerName: 'player' | 'enemy',
  battleContext: BattleContext = {},
  isCritical = false,
  preProcessedResult: PreProcessedResult | null = null
): SingleHitResult {
  const isGhost = card.isGhost === true;

  let modifiedCard, currentAttacker, currentDefender, specialEvents, specialLogs, attackerConsumedTokens;

  if (preProcessedResult) {
    modifiedCard = preProcessedResult.modifiedCard;
    currentAttacker = { ...attacker };
    currentDefender = { ...defender };
    specialEvents = [];
    specialLogs = [];
    attackerConsumedTokens = [];
  } else {
    const preAttackResult = processPreAttackSpecials({
      card: card as SpecialCard,
      attacker,
      defender,
      attackerName,
      battleContext
    });

    const tokenResult = isGhost
      ? { modifiedCard: preAttackResult.modifiedCard, consumedTokens: [] }
      : applyTokenEffectsToCard(preAttackResult.modifiedCard, preAttackResult.attacker, 'attack');

    modifiedCard = tokenResult.modifiedCard;
    currentAttacker = preAttackResult.attacker;
    currentDefender = preAttackResult.defender;
    specialEvents = preAttackResult.events;
    specialLogs = preAttackResult.logs;
    attackerConsumedTokens = tokenResult.consumedTokens;
  }

  const base = modifiedCard.damage || 0;
  const fencingBonus = (card.cardCategory === 'fencing' && battleContext.fencingDamageBonus) ? battleContext.fencingDamageBonus : 0;
  const strengthBonus = currentAttacker.strength || 0;
  const ghostText = isGhost ? ' [👻유령]' : '';
  const boost = currentAttacker.etherOverdriveActive ? 2 : 1;
  let dmg = (base + fencingBonus + strengthBonus) * boost;

  if (isCritical) {
    dmg = applyCriticalDamage(dmg, true);
  }
  const critText = isCritical ? ' [💥치명타!]' : '';

  const crushMultiplier = hasTrait(card, 'crush') ? 2 : 1;
  const events = [...specialEvents];
  const logs = [...specialLogs];
  let damageDealt = 0;
  let damageTaken = 0;
  let blockDestroyed = 0;

  let updatedAttacker = { ...currentAttacker };
  let updatedDefender = { ...currentDefender };

  if (attackerConsumedTokens.length > 0) {
    const consumeResult = consumeTokens(updatedAttacker, attackerConsumedTokens);
    updatedAttacker.tokens = consumeResult.tokens;
    logs.push(...consumeResult.logs);
  }

  const tokenDamageResult = applyTokenEffectsOnDamage(dmg, currentDefender, currentAttacker);

  if (tokenDamageResult.consumedTokens.length > 0) {
    const consumeResult = consumeTokens(updatedDefender, tokenDamageResult.consumedTokens);
    updatedDefender.tokens = consumeResult.tokens;
    logs.push(...consumeResult.logs);
  }

  if (tokenDamageResult.dodged) {
    events.push({
      actor: attackerName,
      card: card.name,
      type: 'dodge',
      msg: tokenDamageResult.logs.join(', ')
    });
    logs.push(...tokenDamageResult.logs);
    return {
      attacker: updatedAttacker,
      defender: updatedDefender,
      damage: 0,
      events,
      logs
    };
  }

  if (tokenDamageResult.logs.length > 0) {
    logs.push(...tokenDamageResult.logs);
  }

  dmg = tokenDamageResult.finalDamage;
  const ignoreBlock = shouldIgnoreBlock(modifiedCard);

  if (!ignoreBlock && updatedDefender.def && (updatedDefender.block || 0) > 0) {
    const beforeBlock = updatedDefender.block;
    const effectiveDmg = dmg * crushMultiplier;

    if (effectiveDmg < beforeBlock) {
      const remaining = beforeBlock - effectiveDmg;
      updatedDefender.block = remaining;
      blockDestroyed = effectiveDmg;
      dmg = 0;

      const crushText = crushMultiplier > 1 ? ' [분쇄×2]' : '';
      const enemyName = battleContext.enemyDisplayName || '몬스터';
      const formula = `공격력 ${base}${boost > 1 ? '×2' : ''}${critText}${crushText} - 방어력 ${beforeBlock} = 차단 (잔여 방어력 ${remaining})`;
      const msg = `${attackerName === 'player' ? `플레이어(${card.name}) -> ${enemyName}` : `${enemyName}(${card.name}) -> 플레이어`} • ${formula}${ghostText}`;

      events.push({ actor: attackerName, card: card.name, type: 'blocked', msg });
      logs.push(msg);
    } else {
      const blocked = beforeBlock;
      const remained = Math.max(0, effectiveDmg - blocked);
      updatedDefender.block = 0;
      blockDestroyed = blocked;

      const vulnMul = (updatedDefender.vulnMult && updatedDefender.vulnMult > 1) ? updatedDefender.vulnMult : 1;
      const finalDmg = Math.floor(remained * vulnMul);
      const beforeHP = updatedDefender.hp;
      updatedDefender.hp = Math.max(0, updatedDefender.hp - finalDmg);

      const crushText = crushMultiplier > 1 ? ' [분쇄×2]' : '';
      const enemyNamePierce = battleContext.enemyDisplayName || '몬스터';
      const formula = blocked > 0
        ? `공격력 ${base}${boost > 1 ? '×2' : ''}${critText}${crushText} - 방어력 ${blocked} = ${finalDmg} 데미지`
        : `${finalDmg} 데미지${critText}${crushText}`;
      const msg = `${attackerName === 'player' ? `플레이어(${card.name}) -> ${enemyNamePierce}` : `${enemyNamePierce}(${card.name}) -> 플레이어`} • ${formula} (체력 ${beforeHP} -> ${updatedDefender.hp})${ghostText}`;

      events.push({
        actor: attackerName,
        card: card.name,
        type: 'pierce',
        dmg: finalDmg,
        beforeHP,
        afterHP: updatedDefender.hp,
        msg
      });
      logs.push(msg);

      damageDealt += finalDmg;

      const totalCounter = (updatedDefender.counter || 0) + (tokenDamageResult.reflected || 0);
      if (totalCounter > 0 && finalDmg > 0) {
        const counterResult = applyCounter(updatedDefender, updatedAttacker, attackerName, totalCounter, battleContext);
        updatedAttacker = counterResult.attacker;
        events.push(...counterResult.events);
        logs.push(...counterResult.logs);
        damageTaken += counterResult.damage;
      }

      if (finalDmg > 0 && hasToken(updatedDefender, 'counterShot')) {
        const counterShotResult = applyCounterShot(updatedDefender, updatedAttacker, attackerName, battleContext);
        updatedDefender = counterShotResult.defender;
        updatedAttacker = counterShotResult.attacker;
        events.push(...counterShotResult.events);
        logs.push(...counterShotResult.logs);
        damageTaken += counterShotResult.damage;
      }
    }
  } else {
    const vulnMul = (updatedDefender.vulnMult && updatedDefender.vulnMult > 1) ? updatedDefender.vulnMult : 1;
    const finalDmg = Math.floor(dmg * vulnMul);
    const beforeHP = updatedDefender.hp;
    updatedDefender.hp = Math.max(0, updatedDefender.hp - finalDmg);

    const ignoreBlockText = ignoreBlock && (updatedDefender.block || 0) > 0 ? ' [방어 무시]' : '';
    const enemyNameHit = battleContext.enemyDisplayName || '몬스터';
    const boostText = boost > 1 ? ' (에테르 폭주×2)' : '';
    const msg = `${attackerName === 'player' ? `플레이어(${card.name}) -> ${enemyNameHit}` : `${enemyNameHit}(${card.name}) -> 플레이어`} • ${finalDmg} 데미지${critText}${boostText}${ignoreBlockText} (체력 ${beforeHP} -> ${updatedDefender.hp})${ghostText}`;

    events.push({
      actor: attackerName,
      card: card.name,
      type: 'hit',
      dmg: finalDmg,
      beforeHP,
      afterHP: updatedDefender.hp,
      msg
    });
    logs.push(msg);

    damageDealt += finalDmg;

    const totalCounter = (updatedDefender.counter || 0) + (tokenDamageResult.reflected || 0);
    if (totalCounter > 0 && finalDmg > 0) {
      const counterResult = applyCounter(updatedDefender, updatedAttacker, attackerName, totalCounter, battleContext);
      updatedAttacker = counterResult.attacker;
      events.push(...counterResult.events);
      logs.push(...counterResult.logs);
      damageTaken += counterResult.damage;
    }

    if (finalDmg > 0 && hasToken(updatedDefender, 'counterShot')) {
      const counterShotResult = applyCounterShot(updatedDefender, updatedAttacker, attackerName, battleContext);
      updatedDefender = counterShotResult.defender;
      updatedAttacker = counterShotResult.attacker;
      events.push(...counterShotResult.events);
      logs.push(...counterShotResult.logs);
      damageTaken += counterShotResult.damage;
    }
  }

  const resultPreProcessed = preProcessedResult || {
    modifiedCard,
    attacker: currentAttacker,
    defender: currentDefender,
    consumedTokens: attackerConsumedTokens
  };

  return {
    attacker: updatedAttacker,
    defender: updatedDefender,
    damage: damageDealt,
    damageTaken,
    blockDestroyed,
    events,
    logs,
    preProcessedResult: resultPreProcessed
  };
}
