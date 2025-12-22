/**
 * multiHitExecution.js
 *
 * 다중 타격 비동기 실행 - executeMultiHitAsync
 * battleExecution.js에서 분리됨
 */

import { prepareMultiHitAttack, calculateSingleHit, finalizeMultiHitAttack, rollCritical } from './combatActions';
import { processPerHitRoulette } from '../utils/cardSpecialEffects';
import { TIMING } from './battleExecution';

/**
 * 다중 타격 비동기 실행 (딜레이 + 타격별 룰렛 체크 + 타격별 치명타 판정)
 */
export async function executeMultiHitAsync(card, attacker, defender, attackerName, battleContext, onHitCallback) {
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
  let totalBlockDestroyed = firstHitResult.blockDestroyed || 0;

  // 다중 타격 시 개별 데미지 로그 필터링
  const skipEventTypes = hits > 1 ? ['hit', 'blocked', 'pierce'] : [];
  const filteredEvents = firstHitResult.events.filter(ev => !skipEventTypes.includes(ev.type));
  const allEvents = [...filteredEvents];
  const allLogs = [];

  // 첫 타격 후 룰렛 체크 (총기 카드)
  if (isGunCard) {
    const rouletteResult = processPerHitRoulette(currentAttacker, card, attackerName, 0, hits);
    currentAttacker = rouletteResult.updatedAttacker;
    if (rouletteResult.jammed) {
      const finalResult = finalizeMultiHitAttack(modifiedCard, currentAttacker, currentDefender, attackerName, totalDealt, totalBlockDestroyed, { ...battleContext, isCritical: totalCritCount > 0 });
      const enemyName = battleContext.enemyDisplayName || '몬스터';
      const who = attackerName === 'player' ? `플레이어 -> ${enemyName}` : `${enemyName} -> 플레이어`;
      const baseDmgJam = modifiedCard.damage || card.damage || 0;
      const critText = firstHitCritical ? ' 💥치명타!' : '';
      const jamMsg = hits > 1
        ? `${who} • 🔫 ${card.name}${ghostLabel}: ${baseDmgJam}x1 = ${totalDealt}${critText} 데미지 (탄걸림! ${hits - 1}회 취소)`
        : `${who} • 🔫 ${card.name}${ghostLabel}: ${totalDealt}${critText} 데미지 (탄걸림!)`;
      allEvents.push({ actor: attackerName, card: card.name, type: 'multihit', msg: jamMsg, dmg: totalDealt });

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
    const hitCritical = rollCritical(currentAttacker, attackerRemainingEnergy, card, attackerName);
    criticalHits.push(hitCritical);
    if (hitCritical) totalCritCount++;

    // 타격 실행
    const hitResult = calculateSingleHit(currentAttacker, currentDefender, card, attackerName, battleContext, hitCritical, preProcessedResult);
    currentAttacker = hitResult.attacker;
    currentDefender = hitResult.defender;
    totalDealt += hitResult.damage;
    totalTaken += hitResult.damageTaken || 0;
    totalBlockDestroyed += hitResult.blockDestroyed || 0;

    const filteredHitEvents = hitResult.events.filter(ev => !skipEventTypes.includes(ev.type));
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
        const enemyNameJam = battleContext.enemyDisplayName || '몬스터';
        const who = attackerName === 'player' ? `플레이어 -> ${enemyNameJam}` : `${enemyNameJam} -> 플레이어`;
        const baseDmgJam2 = modifiedCard.damage || card.damage || 0;
        const actualHits = i + 1;
        const critText = totalCritCount > 0 ? ` 💥치명타x${totalCritCount}!` : '';
        const jamMsg = `${who} • 🔫 ${card.name}${ghostLabel}: ${baseDmgJam2}x${actualHits} = ${totalDealt}${critText} 데미지 (탄걸림! ${hits - actualHits}회 취소)`;
        allEvents.push({ actor: attackerName, card: card.name, type: 'multihit', msg: jamMsg, dmg: totalDealt });

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
          createdCards: finalResult.createdCards
        };
      }
    }
  }

  // 총합 로그
  const enemyNameSum = battleContext.enemyDisplayName || '몬스터';
  const who = attackerName === 'player' ? `플레이어 -> ${enemyNameSum}` : `${enemyNameSum} -> 플레이어`;
  const baseDmg = modifiedCard.damage || card.damage || 0;
  const totalAttack = baseDmg * hits;
  const critText = totalCritCount > 0 ? ` 💥치명타x${totalCritCount}!` : '';
  const icon = isGunCard ? '🔫' : '🔥';

  let dmgFormula;
  if (totalBlockDestroyed > 0) {
    dmgFormula = `공격력 ${totalAttack} - 방어력 ${totalBlockDestroyed} = ${totalDealt}`;
  } else {
    dmgFormula = `${totalDealt}`;
  }

  if (hits > 1) {
    const multiHitMsg = `${who} • ${icon} ${card.name}${ghostLabel}: ${dmgFormula}${critText} 데미지!`;
    allEvents.push({ actor: attackerName, card: card.name, type: 'multihit', msg: multiHitMsg, dmg: totalDealt });
    allLogs.push(multiHitMsg);
  } else {
    const singleCritText = totalCritCount > 0 ? ' 💥치명타!' : '';
    const singleHitMsg = `${who} • ${icon} ${card.name}${ghostLabel}: ${dmgFormula}${singleCritText} 데미지`;
    allEvents.push({ actor: attackerName, card: card.name, type: 'hit', msg: singleHitMsg, dmg: totalDealt });
    allLogs.push(singleHitMsg);
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
    createdCards: finalResult.createdCards
  };
}
