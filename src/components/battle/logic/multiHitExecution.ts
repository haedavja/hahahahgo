/**
 * @file multiHitExecution.js
 * @description 다중 타격 비동기 실행
 * @typedef {import('../../../types').Card} Card
 *
 * battleExecution.js에서 분리됨
 *
 * ## 기능
 * - 타격별 딜레이 처리
 * - 타격별 룰렛/치명타 판정
 * - 총기 카드 탄걸림 처리
 */

import type { BattleEvent, CriticalActor, CriticalCard, PreProcessedResult, CombatBattleContext } from '../../../types';
import { prepareMultiHitAttack, calculateSingleHit, finalizeMultiHitAttack, rollCritical } from './combatActions';
import { processPerHitRoulette } from '../utils/cardSpecialEffects';
import { TIMING } from './battleConstants'; // 순환 의존성 방지: battleExecution 대신 직접 import

/**
 * 다중 타격 비동기 실행 (딜레이 + 타격별 룰렛 체크 + 타격별 치명타 판정)
 */
export async function executeMultiHitAsync(card: any, attacker: any, defender: any, attackerName: any, battleContext: any, onHitCallback: any) {
  const isGunCard = card.cardCategory === 'gun' && card.type === 'attack';
  const ghostLabel = card.isGhost ? ' [👻유령]' : '';

  // 첫 타격 준비
  const prepResult = prepareMultiHitAttack(attacker, defender, card, attackerName, battleContext);
  let { hits, firstHitCritical, preProcessedResult, modifiedCard, currentAttacker, currentDefender, attackerRemainingEnergy } = prepResult;
  const firstHitResult = prepResult.firstHitResult;

  // 치명타 추적
  const criticalHits = [firstHitCritical];
  let totalCritCount = firstHitCritical ? 1 : 0;

  let totalDealt = firstHitResult.damage;
  let totalTaken = firstHitResult.damageTaken || 0;
  let totalBlockDestroyed: number = Number(firstHitResult.blockDestroyed) || 0;
  let totalTimelineAdvance = firstHitResult.timelineAdvance || 0;

  // 다중 타격 시 개별 데미지 로그 필터링
  const skipEventTypes = hits > 1 ? ['hit', 'blocked', 'pierce'] : [];
  const filteredEvents = (firstHitResult.events as BattleEvent[]).filter((ev: BattleEvent) => !ev.type || !skipEventTypes.includes(ev.type));
  const allEvents = [...filteredEvents];
  const allLogs: string[] = [];

  // 첫 타격 후 룰렛 체크 (총기 카드)
  if (isGunCard) {
    const rouletteResult = processPerHitRoulette(currentAttacker, card, attackerName, 0, hits);
    currentAttacker = rouletteResult.updatedAttacker;
    if (rouletteResult.jammed) {
      const finalResult = finalizeMultiHitAttack(modifiedCard, currentAttacker, currentDefender, attackerName, totalDealt, totalBlockDestroyed, { ...battleContext, isCritical: totalCritCount > 0 });
      const enemyName = ((battleContext as CombatBattleContext & { enemyDisplayName?: string }).enemyDisplayName ?? '몬스터');
      const who = attackerName === 'player' ? `플레이어 -> ${enemyName}` : `${enemyName} -> 플레이어`;
      const baseDmgJam = modifiedCard.damage || card.damage || 0;
      const critText = firstHitCritical ? ' 💥치명타!' : '';
      const jamMsg = hits > 1
        ? `${who} • 🔫 ${card.name}${ghostLabel}: ${baseDmgJam}x1 = ${totalDealt}${critText} 데미지 (탄걸림! ${hits - 1}회 취소)`
        : `${who} • 🔫 ${card.name}${ghostLabel}: ${totalDealt}${critText} 데미지 (탄걸림!)`;
      allEvents.push({ actor: attackerName, card: card.name || '', type: 'multihit', msg: jamMsg, dmg: totalDealt } as BattleEvent);

      return {
        attacker: finalResult.attacker,
        defender: finalResult.defender,
        dealt: totalDealt,
        taken: totalTaken,
        events: [...allEvents, ...finalResult.events],
        logs: [jamMsg],
        isCritical: totalCritCount > 0,
        criticalHits: totalCritCount,
        jammed: true,
        hitsCompleted: 1,
        totalHits: hits,
        createdCards: finalResult.createdCards
      };
    }
  }

  // 첫 타격 콜백
  if (onHitCallback) {
    await onHitCallback(firstHitResult, 0, hits);
  }

  // 후속 타격
  for (let i = 1; i < hits; i++) {
    await new Promise(resolve => setTimeout(resolve, TIMING.MULTI_HIT_DELAY));

    // 타격별 치명타 판정
    const hitCritical = rollCritical(currentAttacker as unknown as CriticalActor, attackerRemainingEnergy, card as unknown as CriticalCard, attackerName);
    criticalHits.push(hitCritical);
    if (hitCritical) totalCritCount++;

    // 타격 실행
    const hitResult = calculateSingleHit(currentAttacker, currentDefender, card, attackerName, battleContext, hitCritical, preProcessedResult as PreProcessedResult);
    currentAttacker = hitResult.attacker;
    currentDefender = hitResult.defender;
    totalDealt += hitResult.damage;
    totalTaken += hitResult.damageTaken || 0;
    totalBlockDestroyed += Number(hitResult.blockDestroyed) || 0;
    totalTimelineAdvance += hitResult.timelineAdvance || 0;

    const filteredHitEvents = (hitResult.events as BattleEvent[]).filter((ev: BattleEvent) => !ev.type || !skipEventTypes.includes(ev.type));
    allEvents.push(...filteredHitEvents);

    if (onHitCallback) {
      await onHitCallback(hitResult, i, hits);
    }

    // 룰렛 체크 (총기 카드)
    if (isGunCard) {
      const rouletteResult = processPerHitRoulette(currentAttacker, card, attackerName, i, hits);
      currentAttacker = rouletteResult.updatedAttacker;
      if (rouletteResult.jammed && i < hits - 1) {
        const finalResult = finalizeMultiHitAttack(modifiedCard, currentAttacker, currentDefender, attackerName, totalDealt, totalBlockDestroyed, { ...battleContext, isCritical: totalCritCount > 0 });
        const enemyNameJam = ((battleContext as CombatBattleContext & { enemyDisplayName?: string }).enemyDisplayName ?? '몬스터');
        const who = attackerName === 'player' ? `플레이어 -> ${enemyNameJam}` : `${enemyNameJam} -> 플레이어`;
        const baseDmgJam2 = modifiedCard.damage || card.damage || 0;
        const actualHits = i + 1;
        const critText = totalCritCount > 0 ? ` 💥치명타x${totalCritCount}!` : '';
        const jamMsg = `${who} • 🔫 ${card.name}${ghostLabel}: ${baseDmgJam2}x${actualHits} = ${totalDealt}${critText} 데미지 (탄걸림! ${hits - actualHits}회 취소)`;
        allEvents.push({ actor: attackerName, card: card.name || '', type: 'multihit', msg: jamMsg, dmg: totalDealt } as BattleEvent);

        return {
          attacker: finalResult.attacker,
          defender: finalResult.defender,
          dealt: totalDealt,
          taken: totalTaken,
          events: [...allEvents, ...finalResult.events],
          logs: [...allLogs, jamMsg],
          isCritical: totalCritCount > 0,
          criticalHits: totalCritCount,
          jammed: true,
          hitsCompleted: actualHits,
          totalHits: hits,
          createdCards: finalResult.createdCards,
          defenderTimelineAdvance: totalTimelineAdvance
        };
      }
    }
  }

  // 총합 로그
  const enemyNameSum = (battleContext as CombatBattleContext & { enemyDisplayName?: string }).enemyDisplayName || '몬스터';
  const who = attackerName === 'player' ? `플레이어 -> ${enemyNameSum}` : `${enemyNameSum} -> 플레이어`;
  const baseDmg = modifiedCard.damage || card.damage || 0;
  const totalAttack = baseDmg * hits;
  const critText = totalCritCount > 0 ? ` 💥치명타x${totalCritCount}!` : '';
  const icon = isGunCard ? '🔫' : '🔥';

  let dmgFormula;
  if ((totalBlockDestroyed) > 0) {
    dmgFormula = `공격력 ${totalAttack} - 방어력 ${totalBlockDestroyed} = ${totalDealt}`;
  } else {
    dmgFormula = `${totalDealt}`;
  }

  // 다중 타격 시에만 총합 로그 추가 (단일 타격은 hitCalculation에서 이미 처리됨)
  if (hits > 1) {
    const multiHitMsg = `${attackerName === 'player' ? `플레이어(${card.name})` : `${enemyNameSum}(${card.name})`} -> ${attackerName === 'player' ? enemyNameSum : '플레이어'} • ${icon} ${dmgFormula}${critText} 데미지!${ghostLabel}`;
    allEvents.push({ actor: attackerName, card: card.name, type: 'multihit', msg: multiHitMsg, dmg: totalDealt } as BattleEvent);
    allLogs.push(multiHitMsg);
  }

  // 후처리
  const finalResult = finalizeMultiHitAttack(modifiedCard, currentAttacker, currentDefender, attackerName, totalDealt, totalBlockDestroyed, { ...battleContext, isCritical: totalCritCount > 0 });

  return {
    attacker: finalResult.attacker,
    defender: finalResult.defender,
    dealt: totalDealt,
    taken: totalTaken,
    events: [...allEvents, ...finalResult.events],
    logs: [...allLogs, ...finalResult.logs],
    isCritical: totalCritCount > 0,
    criticalHits: totalCritCount,
    jammed: false,
    hitsCompleted: hits,
    totalHits: hits,
    createdCards: finalResult.createdCards,
    defenderTimelineAdvance: totalTimelineAdvance
  };
}
