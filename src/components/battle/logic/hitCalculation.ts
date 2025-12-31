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
  SpecialCard,
  ConsumedToken
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
import { getVulnerabilityMultiplier } from '../../../lib/anomalyEffectUtils';
import {
  shouldCounterShootOnEvade,
  calculateSwordDamageBonus,
  calculateAttackDamageBonus,
  isSwordCard
} from '../../../lib/ethosEffects';

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
  const events: BattleEvent[] = [];
  const logs: string[] = [];

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
    type: 'hit' as const,
    dmg: shotDamage,
    msg: cmsg
  });
  logs.push(`${attackerName === 'player' ? '👾' : '🔵'} ${cmsg}`);

  const rouletteMsg = `${defenderName} • 🎰 대응사격: 룰렛 ${newRouletteStacks} (${Math.round(newRouletteStacks * 5)}% 위험)`;
  events.push({ actor: 'counterShot', type: 'token' as const, msg: rouletteMsg });
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
 * 비의 눈물 효과 처리 (공격당할 때 방어력 획득 + 타임라인 앞당김)
 * @param defender - 비의 눈물 토큰을 가진 방어자
 * @param attackerName - 공격자 이름
 * @param battleContext - 전투 컨텍스트
 */
export function applyRainDefense(
  defender: Combatant,
  attackerName: 'player' | 'enemy',
  battleContext: BattleContext = {}
): { defender: Combatant; block: number; advance: number; events: BattleEvent[]; logs: string[] } {
  const events: BattleEvent[] = [];
  const logs: string[] = [];

  // rain_defense 토큰 확인 (TURN 타입이므로 소모하지 않음)
  const allTokens = [
    ...(defender.tokens?.usage || []),
    ...(defender.tokens?.turn || []),
    ...(defender.tokens?.permanent || [])
  ];
  const rainToken = allTokens.find(t => t.id === 'rain_defense');
  if (!rainToken) {
    return { defender, block: 0, advance: 0, events, logs };
  }

  const blockGain = 7;
  const advanceAmount = 3;
  const updatedDefender = {
    ...defender,
    block: (defender.block || 0) + blockGain,
    def: true  // 방어력이 있으면 def도 true로 설정
  };

  const enemyName = battleContext.enemyDisplayName || '몬스터';
  const defenderName = attackerName === 'player' ? '플레이어' : enemyName;
  const msg = `${defenderName} • 🌧️ 비의 눈물: 방어력 +${blockGain}, 앞당김 ${advanceAmount}`;

  events.push({
    actor: attackerName === 'player' ? 'enemy' : 'player',
    type: 'special' as const,
    msg
  });
  logs.push(msg);

  return {
    defender: updatedDefender,
    block: blockGain,
    advance: advanceAmount,
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

  let modifiedCard: Card, currentAttacker: Combatant, currentDefender: Combatant, specialEvents: BattleEvent[], specialLogs: string[], attackerConsumedTokens: ConsumedToken[];
  let queueModifications: Array<{ index: number; newSp: number }> | undefined;

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

    // 유령카드도 토큰 효과 적용 (파쇄탄, 철갑탄, 소이탄 등)
    // 단, 유령카드는 토큰을 소모하지 않음 (원본 카드에서만 소모)
    const tokenResult = applyTokenEffectsToCard(preAttackResult.modifiedCard, preAttackResult.attacker, 'attack');

    modifiedCard = tokenResult.modifiedCard;
    currentAttacker = preAttackResult.attacker;
    currentDefender = preAttackResult.defender;
    specialEvents = preAttackResult.events as BattleEvent[];
    specialLogs = preAttackResult.logs;
    // 유령카드는 토큰 소모 안 함
    attackerConsumedTokens = isGhost ? [] : tokenResult.consumedTokens;
    // queue 수정 정보 저장
    queueModifications = preAttackResult.queueModifications;
  }

  const base = modifiedCard.damage || 0;
  const fencingBonus = (card.cardCategory === 'fencing' && battleContext.fencingDamageBonus) ? battleContext.fencingDamageBonus : 0;
  const strengthBonus = currentAttacker.strength || 0;
  const ghostText = isGhost ? ' [👻유령]' : '';
  const boost = currentAttacker.etherOverdriveActive ? 2 : 1;

  // 에토스 피해 보너스 (플레이어 공격 시에만)
  let ethosBonus = 0;
  const ethosLogs: string[] = [];
  if (attackerName === 'player') {
    // 검술 카드: 검예 에토스 (기교 스택만큼 추가 피해)
    if (isSwordCard(card)) {
      const finesseStacks = getTokenStacks(currentAttacker, 'finesse');
      const swordResult = calculateSwordDamageBonus(finesseStacks);
      ethosBonus += swordResult.bonus;
      ethosLogs.push(...swordResult.logs);
    }

    // 고고학 에토스 (상징 개수만큼 추가 피해)
    const symbolCount = battleContext.symbolCount || 0;
    if (symbolCount > 0) {
      const attackResult = calculateAttackDamageBonus(symbolCount);
      ethosBonus += attackResult.bonus;
      ethosLogs.push(...attackResult.logs);
    }
  }

  let dmg = (base + fencingBonus + strengthBonus + ethosBonus) * boost;

  if (isCritical) {
    dmg = applyCriticalDamage(dmg, true);
  }
  const critText = isCritical ? ' [💥치명타!]' : '';

  const crushMultiplier = hasTrait(card, 'crush') ? 2 : 1;
  const events = [...specialEvents];
  const logs = [...specialLogs, ...ethosLogs];
  let damageDealt = 0;
  let damageTaken = 0;
  let blockDestroyed = 0;
  let timelineAdvance = 0;

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
    // 회피 시에도 공격 로그 생성 (빗나감 표시)
    const enemyNameDodge = battleContext.enemyDisplayName || '몬스터';
    const actorNameDodge = attackerName === 'player' ? `플레이어(${card.name})` : `${enemyNameDodge}(${card.name})`;
    const targetNameDodge = attackerName === 'player' ? enemyNameDodge : '플레이어';
    const dodgeMsg = `${actorNameDodge}${ghostText} -> ${targetNameDodge} • 빗나감! (회피)`;

    events.push({
      actor: attackerName,
      card: card.name,
      type: 'dodge',
      msg: dodgeMsg
    });
    logs.push(dodgeMsg);

    // 틈새 에토스: 플레이어가 회피 성공 시 반격 사격
    if (attackerName === 'enemy') {
      const evadeShot = shouldCounterShootOnEvade();
      if (evadeShot.shouldShoot && evadeShot.shots > 0) {
        const shootCard = CARDS.find(c => c.id === 'shoot');
        if (shootCard) {
          const shotDamage = (shootCard.damage || 8) * evadeShot.shots;
          const beforeHP = updatedAttacker.hp;
          updatedAttacker = {
            ...updatedAttacker,
            hp: Math.max(0, updatedAttacker.hp - shotDamage)
          };

          // 룰렛 증가
          const rouletteResult = addToken(updatedDefender, 'roulette', evadeShot.shots);
          updatedDefender = { ...updatedDefender, tokens: rouletteResult.tokens };

          const shotMsg = `🔫 틈새: 회피 성공! ${enemyNameDodge}에게 ${shotDamage} 피해 (체력 ${beforeHP} -> ${updatedAttacker.hp})`;
          events.push({
            actor: 'player',
            type: 'ethos' as const,
            dmg: shotDamage,
            msg: shotMsg
          } as BattleEvent);
          logs.push(shotMsg);
        }
      }
    }

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
      const actorName = attackerName === 'player' ? `플레이어(${card.name})` : `${enemyName}(${card.name})`;
      const targetName = attackerName === 'player' ? enemyName : '플레이어';
      const formula = `공격력 ${base}${boost > 1 ? '×2' : ''}${critText}${crushText} - 방어력 ${beforeBlock} = 차단 (잔여 방어력 ${remaining})`;
      const msg = `${actorName}${ghostText} -> ${targetName} • ${formula}`;

      events.push({ actor: attackerName, card: card.name, type: 'blocked', msg });
      logs.push(msg);
    } else {
      const blocked = beforeBlock;
      const remained = Math.max(0, effectiveDmg - blocked);
      updatedDefender.block = 0;
      blockDestroyed = blocked;

      // 취약 배율: 토큰 효과 + 이변 효과
      const tokenVuln = (updatedDefender.vulnMult && updatedDefender.vulnMult > 1) ? updatedDefender.vulnMult : 1;
      const anomalyVuln = getVulnerabilityMultiplier(updatedDefender);
      const vulnMul = tokenVuln * anomalyVuln;
      const finalDmg = Math.floor(remained * vulnMul);
      const beforeHP = updatedDefender.hp;
      updatedDefender.hp = Math.max(0, updatedDefender.hp - finalDmg);

      const crushText = crushMultiplier > 1 ? ' [분쇄×2]' : '';
      const enemyNamePierce = battleContext.enemyDisplayName || '몬스터';
      const actorName = attackerName === 'player' ? `플레이어(${card.name})` : `${enemyNamePierce}(${card.name})`;
      const targetName = attackerName === 'player' ? enemyNamePierce : '플레이어';
      const formula = blocked > 0
        ? `공격력 ${base}${boost > 1 ? '×2' : ''}${critText}${crushText} - 방어력 ${blocked} = ${finalDmg} 데미지`
        : `${finalDmg} 데미지${critText}${crushText}`;
      const msg = `${actorName}${ghostText} -> ${targetName} • ${formula} (체력 ${beforeHP} -> ${updatedDefender.hp})`;

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

      // 비의 눈물 효과 (공격받기만 해도 발동)
      if (hasToken(updatedDefender, 'rain_defense')) {
        const rainResult = applyRainDefense(updatedDefender, attackerName, battleContext);
        updatedDefender = rainResult.defender;
        events.push(...rainResult.events);
        logs.push(...rainResult.logs);
        timelineAdvance += rainResult.advance;
      }
    }
  } else {
    // 취약 배율: 토큰 효과 + 이변 효과
    const tokenVuln = (updatedDefender.vulnMult && updatedDefender.vulnMult > 1) ? updatedDefender.vulnMult : 1;
    const anomalyVuln = getVulnerabilityMultiplier(updatedDefender);
    const vulnMul = tokenVuln * anomalyVuln;
    const finalDmg = Math.floor(dmg * vulnMul);
    const beforeHP = updatedDefender.hp;
    updatedDefender.hp = Math.max(0, updatedDefender.hp - finalDmg);

    const ignoreBlockText = ignoreBlock && (updatedDefender.block || 0) > 0 ? ' [방어 무시]' : '';
    const boostText = boost > 1 ? ' (에테르 폭주×2)' : '';
    const enemyNameHit = battleContext.enemyDisplayName || '몬스터';
    const actorName = attackerName === 'player' ? `플레이어(${card.name})` : `${enemyNameHit}(${card.name})`;
    const targetName = attackerName === 'player' ? enemyNameHit : '플레이어';
    const msg = `${actorName}${ghostText} -> ${targetName} • ${finalDmg} 데미지${critText}${boostText}${ignoreBlockText} (체력 ${beforeHP} -> ${updatedDefender.hp})`;

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

    // 비의 눈물 효과 (공격받기만 해도 발동)
    if (hasToken(updatedDefender, 'rain_defense')) {
      const rainResult = applyRainDefense(updatedDefender, attackerName, battleContext);
      updatedDefender = rainResult.defender;
      events.push(...rainResult.events);
      logs.push(...rainResult.logs);
      timelineAdvance += rainResult.advance;
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
    timelineAdvance,
    events,
    logs,
    preProcessedResult: resultPreProcessed,
    queueModifications
  };
}
