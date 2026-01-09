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
  isSwordCard,
  isGunCard
} from '../../../lib/ethosEffects';
import { applyGunCritEthosEffects, applyGunCritReloadEffect } from '../utils/criticalEffects';
import { shouldShootOnBlock, getArmorPenetration, getCombatTokens, getMinFinesse } from '../../../lib/logosEffects';
import { UNIFIED_CORE_FLAGS } from '../../../core/combat/types';
import * as EffectCore from '../../../core/combat/effect-core';
import { toUnifiedTokens, fromUnifiedTokens } from '../../../core/combat/token-core';

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

  // soulWeaken 효과: 영혼이 파괴된 적의 공격력 50% 감소
  if (attackerName === 'enemy' && hasToken(currentAttacker, 'soulWeaken')) {
    const originalDmg = dmg;
    dmg = Math.floor(dmg * 0.5);
    specialLogs.push(`👻 영혼 쇠약: 공격력 ${originalDmg} → ${dmg} (50% 감소)`);
  }

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

  // 파토스 효과: 회피 무시 (플레이어 공격 시에만)
  const ignoreEvasionChance = attackerName === 'player' ? (battleContext.pathosTurnEffects?.ignoreEvasion || 0) : 0;
  const tokenDamageResult = applyTokenEffectsOnDamage(dmg, currentDefender, currentAttacker, { ignoreEvasion: ignoreEvasionChance });

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
    const beforeBlock = updatedDefender.block ?? 0;
    const effectiveDmg = dmg * crushMultiplier;

    if (effectiveDmg < beforeBlock) {
      const remaining = beforeBlock - effectiveDmg;
      updatedDefender.block = remaining;
      blockDestroyed = effectiveDmg;
      dmg = 0;

      // 로고스 효과: 배틀 왈츠 Lv2 - 검격 방어력 추가 피해
      let armorPenDmg = 0;
      if (attackerName === 'player' && isSwordCard(card)) {
        const armorPen = getArmorPenetration();
        if (armorPen > 0) {
          armorPenDmg = Math.floor(effectiveDmg * armorPen / 100);
          if (armorPenDmg > 0) {
            const beforeHP = updatedDefender.hp;
            updatedDefender.hp = Math.max(0, updatedDefender.hp - armorPenDmg);
            damageDealt += armorPenDmg;
            const enemyNamePen = battleContext.enemyDisplayName || '몬스터';
            const penMsg = `⚔️ 배틀 왈츠: 관통 피해 ${armorPenDmg} (${beforeHP} -> ${updatedDefender.hp})`;
            events.push({ actor: 'player', type: 'logos' as const, dmg: armorPenDmg, msg: penMsg } as BattleEvent);
            logs.push(penMsg);
          }
        }
      }

      const crushText = crushMultiplier > 1 ? ' [분쇄×2]' : '';
      const enemyName = battleContext.enemyDisplayName || '몬스터';
      const actorName = attackerName === 'player' ? `플레이어(${card.name})` : `${enemyName}(${card.name})`;
      const targetName = attackerName === 'player' ? enemyName : '플레이어';
      const formula = `공격력 ${base}${boost > 1 ? '×2' : ''}${critText}${crushText} - 방어력 ${beforeBlock} = 차단 (잔여 방어력 ${remaining})`;
      const msg = `${actorName}${ghostText} -> ${targetName} • ${formula}`;

      events.push({ actor: attackerName, card: card.name, type: 'blocked', msg });
      logs.push(msg);

      // 로고스 효과: 건카타 Lv1 - 방어력으로 막아낼 시 총격
      if (attackerName === 'enemy' && shouldShootOnBlock() && effectiveDmg > 0) {
        const shootCard = CARDS.find(c => c.id === 'shoot');
        if (shootCard) {
          const shotDamage = shootCard.damage || 8;
          const enemyBeforeHP = updatedAttacker.hp;
          updatedAttacker = {
            ...updatedAttacker,
            hp: Math.max(0, updatedAttacker.hp - shotDamage)
          };

          // 룰렛 증가
          const rouletteResult = addToken(updatedDefender, 'roulette', 1);
          updatedDefender = { ...updatedDefender, tokens: rouletteResult.tokens };

          const shotMsg = `🔫 건카타: 방어 성공! ${enemyName}에게 ${shotDamage} 피해 (체력 ${enemyBeforeHP} -> ${updatedAttacker.hp})`;
          events.push({
            actor: 'player',
            type: 'logos' as const,
            dmg: shotDamage,
            msg: shotMsg
          } as BattleEvent);
          logs.push(shotMsg);
          damageTaken += shotDamage;
        }
      }
    } else {
      const blocked = beforeBlock ?? 0;
      const remained = Math.max(0, effectiveDmg - blocked);
      updatedDefender.block = 0;
      blockDestroyed = blocked ?? 0;

      // 취약 배율: 토큰 효과 + 이변 효과
      const tokenVuln = (updatedDefender.vulnMult && updatedDefender.vulnMult > 1) ? updatedDefender.vulnMult : 1;
      const anomalyVuln = getVulnerabilityMultiplier(updatedDefender);
      const vulnMul = tokenVuln * anomalyVuln;

      // 로고스 효과: 배틀 왈츠 Lv2 - 검격 방어력 추가 피해
      let armorPenBonus = 0;
      if (attackerName === 'player' && isSwordCard(card) && blocked > 0) {
        const armorPen = getArmorPenetration();
        if (armorPen > 0) {
          armorPenBonus = Math.floor(blocked * armorPen / 100);
        }
      }

      const finalDmg = Math.floor(remained * vulnMul) + armorPenBonus;
      const beforeHP = updatedDefender.hp;
      updatedDefender.hp = Math.max(0, updatedDefender.hp - finalDmg);

      // 관통 피해 로그 (보너스가 있을 때만)
      if (armorPenBonus > 0) {
        const penMsg = `⚔️ 배틀 왈츠: 관통 보너스 +${armorPenBonus}`;
        events.push({ actor: 'player', type: 'logos' as const, msg: penMsg } as BattleEvent);
        logs.push(penMsg);
      }

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

      // 로고스 효과: 건카타 Lv1 - 방어력으로 막아낼 시 총격 (관통당해도 방어력이 피해 흡수한 경우)
      if (attackerName === 'enemy' && shouldShootOnBlock() && blocked > 0) {
        const shootCard = CARDS.find(c => c.id === 'shoot');
        if (shootCard) {
          const shotDamage = shootCard.damage || 8;
          const enemyBeforeHP = updatedAttacker.hp;
          updatedAttacker = {
            ...updatedAttacker,
            hp: Math.max(0, updatedAttacker.hp - shotDamage)
          };

          // 룰렛 증가
          const rouletteResult = addToken(updatedDefender, 'roulette', 1);
          updatedDefender = { ...updatedDefender, tokens: rouletteResult.tokens };

          const enemyNameShot = battleContext.enemyDisplayName || '몬스터';
          const shotMsg = `🔫 건카타: 방어 흡수! ${enemyNameShot}에게 ${shotDamage} 피해 (체력 ${enemyBeforeHP} -> ${updatedAttacker.hp})`;
          events.push({
            actor: 'player',
            type: 'logos' as const,
            dmg: shotDamage,
            msg: shotMsg
          } as BattleEvent);
          logs.push(shotMsg);
        }
      }

      // 총격 치명타 에토스 효과 (불꽃: 화상 부여)
      if (attackerName === 'player' && isCritical && isGunCard(card)) {
        const gunCritResult = applyGunCritEthosEffects(card, true, updatedDefender, battleContext);
        updatedDefender = gunCritResult.defender;
        events.push(...gunCritResult.events);
        logs.push(...gunCritResult.logs);

        // 로고스 효과: 건카타 Lv3 - 치명타 시 즉시 장전
        const reloadResult = applyGunCritReloadEffect(card, true, updatedAttacker);
        updatedAttacker = reloadResult.attacker;
        events.push(...reloadResult.events);
        logs.push(...reloadResult.logs);
      }

      // 로고스 효과: 배틀 왈츠 Lv3 - 공격 시 흐릿함 토큰 획득
      if (attackerName === 'player' && isSwordCard(card) && finalDmg > 0) {
        const combatTokens = getCombatTokens();
        if (combatTokens.onAttack) {
          const blurResult = addToken(updatedAttacker, combatTokens.onAttack, 1);
          updatedAttacker = { ...updatedAttacker, tokens: blurResult.tokens };
          const tokenMsg = `✨ 배틀 왈츠: 검격 공격! ${combatTokens.onAttack} 획득`;
          events.push({ actor: 'player', type: 'logos' as const, msg: tokenMsg } as BattleEvent);
          logs.push(tokenMsg);
        }
      }

      // 반격 처리 - Effect Core 사용 시 통합 로직 적용
      if (UNIFIED_CORE_FLAGS.useEffectCore && finalDmg > 0) {
        const defenderUnifiedTokens = toUnifiedTokens(updatedDefender.tokens);
        const enemyName = battleContext.enemyDisplayName || '몬스터';

        // 반격 토큰 처리 (counter, counterPlus)
        const counterResult = EffectCore.processCounterEffect(defenderUnifiedTokens);
        if (counterResult.triggered) {
          const totalCounterDmg = counterResult.damage + (tokenDamageResult.reflected || 0);
          const beforeHP = updatedAttacker.hp;
          updatedAttacker = { ...updatedAttacker, hp: Math.max(0, updatedAttacker.hp - totalCounterDmg) };
          updatedDefender = { ...updatedDefender, tokens: fromUnifiedTokens(counterResult.newTokens) };

          const cmsg = `${attackerName === 'player' ? `${enemyName} -> 플레이어` : `플레이어 -> ${enemyName}`} • 반격 ${totalCounterDmg} (체력 ${beforeHP} -> ${updatedAttacker.hp})`;
          events.push({ actor: 'counter', value: totalCounterDmg, msg: cmsg });
          logs.push(`${attackerName === 'player' ? '👾' : '🔵'} ${cmsg}`);
          damageTaken += totalCounterDmg;
        }

        // 대응사격 토큰 처리
        const csResult = EffectCore.processCounterShotEffect(toUnifiedTokens(updatedDefender.tokens));
        if (csResult.triggered) {
          const beforeHP = updatedAttacker.hp;
          updatedAttacker = { ...updatedAttacker, hp: Math.max(0, updatedAttacker.hp - csResult.damage) };
          updatedDefender = { ...updatedDefender, tokens: fromUnifiedTokens(csResult.newTokens) };

          const defenderName = attackerName === 'player' ? enemyName : '플레이어';
          const targetName = attackerName === 'player' ? '플레이어' : enemyName;
          const csmsg = `${defenderName} -> ${targetName} • 🔫 대응사격 ${csResult.damage} (체력 ${beforeHP} -> ${updatedAttacker.hp})`;
          events.push({ actor: 'counterShot', type: 'hit' as const, dmg: csResult.damage, msg: csmsg });
          logs.push(`${attackerName === 'player' ? '👾' : '🔵'} ${csmsg}`);
          damageTaken += csResult.damage;
        }
      } else {
        // 레거시 반격 로직
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

      // 비의 눈물 효과 (공격받기만 해도 발동)
      if (hasToken(updatedDefender, 'rain_defense')) {
        const rainResult = applyRainDefense(updatedDefender, attackerName, battleContext);
        updatedDefender = rainResult.defender;
        events.push(...rainResult.events);
        logs.push(...rainResult.logs);
        timelineAdvance += rainResult.advance;
      }

      // 파토스 효과: counterAttack (플레이어 피격 시 반격 확률)
      if (attackerName === 'enemy' && finalDmg > 0 && battleContext.pathosTurnEffects?.counterAttack) {
        const counterChance = battleContext.pathosTurnEffects.counterAttack;
        const roll = Math.random() * 100;
        if (roll < counterChance) {
          const counterCard = CARDS.find(c => c.id === 'slash');
          const counterDamage = (counterCard?.damage || 8) + (updatedDefender.strength || 0);
          const beforeHPCounter = updatedAttacker.hp;
          updatedAttacker = {
            ...updatedAttacker,
            hp: Math.max(0, updatedAttacker.hp - counterDamage)
          };

          const enemyNameCounter = battleContext.enemyDisplayName || '몬스터';
          const counterMsg = `⚔️ 반격: 피격 반격! ${enemyNameCounter}에게 ${counterDamage} 피해 (체력 ${beforeHPCounter} -> ${updatedAttacker.hp})`;
          events.push({
            actor: 'player',
            type: 'pathos' as const,
            dmg: counterDamage,
            msg: counterMsg
          } as BattleEvent);
          logs.push(counterMsg);
          damageTaken += counterDamage;
        }
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

    // 총격 치명타 에토스 효과 (불꽃: 화상 부여)
    if (attackerName === 'player' && isCritical && isGunCard(card)) {
      const gunCritResult = applyGunCritEthosEffects(card, true, updatedDefender, battleContext);
      updatedDefender = gunCritResult.defender;
      events.push(...gunCritResult.events);
      logs.push(...gunCritResult.logs);

      // 로고스 효과: 건카타 Lv3 - 치명타 시 즉시 장전
      const reloadResult = applyGunCritReloadEffect(card, true, updatedAttacker);
      updatedAttacker = reloadResult.attacker;
      events.push(...reloadResult.events);
      logs.push(...reloadResult.logs);
    }

    // 로고스 효과: 배틀 왈츠 Lv3 - 공격 시 흐릿함 토큰 획득
    if (attackerName === 'player' && isSwordCard(card) && finalDmg > 0) {
      const combatTokens = getCombatTokens();
      if (combatTokens.onAttack) {
        const blurResult = addToken(updatedAttacker, combatTokens.onAttack, 1);
        updatedAttacker = { ...updatedAttacker, tokens: blurResult.tokens };
        const tokenMsg = `✨ 배틀 왈츠: 검격 공격! ${combatTokens.onAttack} 획득`;
        events.push({ actor: 'player', type: 'logos' as const, msg: tokenMsg } as BattleEvent);
        logs.push(tokenMsg);
      }
    }

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

    // 파토스 효과: counterAttack (플레이어 피격 시 반격 확률)
    if (attackerName === 'enemy' && finalDmg > 0 && battleContext.pathosTurnEffects?.counterAttack) {
      const counterChance = battleContext.pathosTurnEffects.counterAttack;
      const roll = Math.random() * 100;
      if (roll < counterChance) {
        // 기본 반격 피해 (검격 카드 기반)
        const counterCard = CARDS.find(c => c.id === 'slash');
        const counterDamage = (counterCard?.damage || 8) + (updatedDefender.strength || 0);
        const beforeHPCounter = updatedAttacker.hp;
        updatedAttacker = {
          ...updatedAttacker,
          hp: Math.max(0, updatedAttacker.hp - counterDamage)
        };

        const enemyNameCounter = battleContext.enemyDisplayName || '몬스터';
        const counterMsg = `⚔️ 반격: 피격 반격! ${enemyNameCounter}에게 ${counterDamage} 피해 (체력 ${beforeHPCounter} -> ${updatedAttacker.hp})`;
        events.push({
          actor: 'player',
          type: 'pathos' as const,
          dmg: counterDamage,
          msg: counterMsg
        } as BattleEvent);
        logs.push(counterMsg);
        damageTaken += counterDamage;
      }
    }

    // 파토스 효과: gunToMelee (총격 시 추가 타격)
    if (attackerName === 'player' && isGunCard(card) && battleContext.pathosTurnEffects?.gunToMelee) {
      const meleeCard = CARDS.find(c => c.id === 'slash');
      if (meleeCard) {
        const meleeDamage = (meleeCard.damage || 8) + (updatedAttacker.strength || 0);
        const beforeHPMelee = updatedDefender.hp;
        updatedDefender = {
          ...updatedDefender,
          hp: Math.max(0, updatedDefender.hp - meleeDamage)
        };
        damageDealt += meleeDamage;

        const enemyNameMelee = battleContext.enemyDisplayName || '몬스터';
        const meleeMsg = `⚔️ 총검술: 추가 타격! ${enemyNameMelee}에게 ${meleeDamage} 피해 (체력 ${beforeHPMelee} -> ${updatedDefender.hp})`;
        events.push({
          actor: 'player',
          type: 'pathos' as const,
          dmg: meleeDamage,
          msg: meleeMsg
        } as BattleEvent);
        logs.push(meleeMsg);
      }
    }

    // 파토스 효과: swordToGun (검격 시 추가 사격)
    if (attackerName === 'player' && isSwordCard(card) && battleContext.pathosTurnEffects?.swordToGun) {
      const shootCard = CARDS.find(c => c.id === 'shoot');
      if (shootCard) {
        const shotDamage = (shootCard.damage || 8) + (updatedAttacker.strength || 0);
        const beforeHPShot = updatedDefender.hp;
        updatedDefender = {
          ...updatedDefender,
          hp: Math.max(0, updatedDefender.hp - shotDamage)
        };
        damageDealt += shotDamage;

        // 룰렛 증가
        const rouletteResult = addToken(updatedAttacker, 'roulette', 1);
        updatedAttacker = { ...updatedAttacker, tokens: rouletteResult.tokens };

        const enemyNameShot = battleContext.enemyDisplayName || '몬스터';
        const shotMsg = `🔫 검격사격: 추가 사격! ${enemyNameShot}에게 ${shotDamage} 피해 (체력 ${beforeHPShot} -> ${updatedDefender.hp})`;
        events.push({
          actor: 'player',
          type: 'pathos' as const,
          dmg: shotDamage,
          msg: shotMsg
        } as BattleEvent);
        logs.push(shotMsg);
      }
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
