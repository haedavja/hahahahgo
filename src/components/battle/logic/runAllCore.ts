/**
 * @file runAllCore.js
 * @description 전체 큐 실행 핵심 로직
 * @typedef {import('../../../types').Card} Card
 *
 * battleExecution.js에서 분리됨
 *
 * ## 기능
 * 타임라인의 모든 액션을 순차 실행
 */

import { getCardEtherGain } from '../utils/etherCalculations';
import { BASE_PLAYER_ENERGY } from '../battleData';
import { applyAction } from './combatActions';
import { calculatePassiveEffects } from '../../../lib/relicEffects';
import { getAllTokens } from '../../../lib/tokenUtils';

/**
 * runAll 핵심 로직
 */
export function runAllCore(params: any) {
  const {
    battle,
    player,
    enemy,
    qIndex,
    turnEtherAccumulated,
    enemyTurnEtherAccumulated,
    orderedRelicList,
    selected,
    addLog,
    playSound,
    actions,
  } = params;

  if (battle.qIndex >= battle.queue.length) return { completed: false };

  playSound(1000, 150);
  const passiveRelicEffects = calculatePassiveEffects(orderedRelicList);

  let P = {
    ...player,
    def: player.def || false,
    block: player.block || 0,
    counter: player.counter || 0,
    vulnMult: player.vulnMult || 1,
    etherPts: player.etherPts || 0,
    tokens: player.tokens
  };
  let E = {
    ...enemy,
    def: enemy.def || false,
    block: enemy.block || 0,
    counter: enemy.counter || 0,
    vulnMult: enemy.vulnMult || 1,
    etherPts: enemy.etherPts || 0,
    tokens: enemy.tokens
  };

  let tempState = { player: P, enemy: E, log: [] };
  const newEvents: any = {};
  let enemyDefeated = false;
  let playerDefeated = false;
  let finalQIndex = qIndex;

  // runAll용 battleContext 생성
  const playerAttackCards = selected.filter((c: any) => c.type === 'attack');
  const playerEnergyBudget = P.energy || P.maxEnergy || BASE_PLAYER_ENERGY;
  const enemyEnergyBudget = E.energy || E.maxEnergy || BASE_PLAYER_ENERGY;

  for (let i = qIndex; i < battle.queue.length; i++) {
    const a = battle.queue[i];

    if (enemyDefeated && a.actor === 'enemy') {
      continue;
    }

    // battleContext 생성
    const isLastCard = i >= battle.queue.length - 1;
    const unusedAttackCards = playerAttackCards.filter((c: any) => {
      const cardQueueIndex = battle.queue.findIndex((q: any) => q.card?.id === c.id && q.actor === 'player');
      return cardQueueIndex > i;
    }).length;

    // 현재까지 사용된 에너지 계산
    const executedPlayerCards = battle.queue.slice(0, i).filter((q: any) => q.actor === 'player');
    const energyUsedSoFar = executedPlayerCards.reduce((sum: any, q: any) => sum + (q.card?.actionCost || 0), 0);
    const calcRemainingEnergy = Math.max(0, playerEnergyBudget - energyUsedSoFar);
    const executedEnemyCards = battle.queue.slice(0, i).filter((q: any) => q.actor === 'enemy');
    const enemyEnergyUsedSoFar = executedEnemyCards.reduce((sum: any, q: any) => sum + (q.card?.actionCost || 0), 0);
    const calcEnemyRemainingEnergy = Math.max(0, enemyEnergyBudget - enemyEnergyUsedSoFar);

    const battleContext = {
      playerAttackCards,
      isLastCard,
      unusedAttackCards,
      queue: battle.queue,
      currentQIndex: i,
      currentSp: a.sp || 0,
      remainingEnergy: calcRemainingEnergy,
      enemyRemainingEnergy: calcEnemyRemainingEnergy
    };

    // 다중 유닛: 공격 전 enemy HP 저장
    const enemyHpBefore = tempState.enemy.hp;
    const selectedTargetUnit = battle.selectedTargetUnit ?? 0;
    const enemyUnits = E.units || enemy.units || [];
    const hasUnits = enemyUnits.length > 0;

    const actionResult = applyAction(tempState, a.actor, a.card, battleContext);
    const { events, updatedState } = actionResult;
    newEvents[i] = events;
    events.forEach(ev => addLog(ev.msg));

    // 상태 업데이트
    if (updatedState) {
      P = updatedState.player;
      E = updatedState.enemy;
      tempState = { player: P, enemy: E, log: [] };
    }

    // 다중 유닛 데미지 분배
    if (hasUnits && a.actor === 'player' && a.card?.type === 'attack') {
      const damageDealt = Math.max(0, enemyHpBefore - E.hp);

      if (damageDealt > 0) {
        const currentUnits = E.units || enemyUnits;
        const aliveUnits = currentUnits.filter((u: any) => u.hp > 0);
        let targetUnit = aliveUnits.find((u: any) => u.unitId === selectedTargetUnit);
        if (!targetUnit && aliveUnits.length > 0) {
          targetUnit = aliveUnits[0];
        }

        if (targetUnit) {
          const unitHpBefore = targetUnit.hp;
          const newUnitHp = Math.max(0, targetUnit.hp - damageDealt);

          const updatedUnits = currentUnits.map((u: any) => {
            if (u.unitId === targetUnit.unitId) {
              return { ...u, hp: newUnitHp };
            }
            return u;
          });

          const newTotalHp = updatedUnits.reduce((sum: any, u: any) => sum + Math.max(0, u.hp), 0);
          E.hp = newTotalHp;
          E.units = updatedUnits;
          tempState = { player: P, enemy: E, log: [] };

          if (targetUnit.name) {
            addLog(`🎯 ${targetUnit.name}에게 ${damageDealt} 피해 (${unitHpBefore} -> ${newUnitHp})`);
          }
        }
      }
    }

    // 화상(BURN) 피해 처리
    if (a.actor === 'player') {
      const playerBurnTokens = getAllTokens(P).filter(t => t.effect?.type === 'BURN');
      if (playerBurnTokens.length > 0) {
        const burnDamage = playerBurnTokens.reduce((sum, t) => sum + (t.effect?.value || 3) * (t.stacks || 1), 0);
        P.hp = Math.max(0, P.hp - burnDamage);
        addLog(`🔥 화상: 플레이어 -${burnDamage} HP`);
        tempState = { player: P, enemy: E, log: [] };
      }
    } else if (a.actor === 'enemy') {
      const enemyBurnTokens = getAllTokens(E).filter(t => t.effect?.type === 'BURN');
      if (enemyBurnTokens.length > 0) {
        const burnDamage = enemyBurnTokens.reduce((sum, t) => sum + (t.effect?.value || 3) * (t.stacks || 1), 0);
        E.hp = Math.max(0, E.hp - burnDamage);
        addLog(`🔥 화상: 적 -${burnDamage} HP`);
        tempState = { player: P, enemy: E, log: [] };
      }
    }

    if (a.actor === 'player') {
      const gain = Math.floor(getCardEtherGain(a.card) * passiveRelicEffects.etherMultiplier);
      actions.setTurnEtherAccumulated(turnEtherAccumulated + gain);
    } else if (a.actor === 'enemy') {
      actions.setEnemyTurnEtherAccumulated(enemyTurnEtherAccumulated + getCardEtherGain(a.card));
    }

    if (P.hp <= 0) {
      playerDefeated = true;
      finalQIndex = i + 1;
      break;
    }

    if (E.hp <= 0 && !enemyDefeated) {
      actions.setEnemyHit(true);
      playSound(200, 500);
      addLog('💀 적 처치! 남은 적 행동 건너뛰기');
      enemyDefeated = true;
    }
  }

  // 상태 업데이트
  actions.setPlayer({
    ...player,
    hp: P.hp,
    def: P.def,
    block: P.block,
    counter: P.counter,
    vulnMult: P.vulnMult || 1,
    tokens: P.tokens
  });
  actions.setEnemy({
    ...enemy,
    hp: E.hp,
    def: E.def,
    block: E.block,
    counter: E.counter,
    vulnMult: E.vulnMult || 1,
    tokens: E.tokens,
    ...(E.units && { units: E.units })
  });
  actions.setActionEvents({ ...battle.actionEvents, ...newEvents });

  if (playerDefeated) {
    actions.setQIndex(finalQIndex);
    actions.setPostCombatOptions({ type: 'defeat' });
    actions.setPhase('post');
    return { completed: true, result: 'defeat' };
  }

  actions.setQIndex(battle.queue.length);

  return {
    completed: true,
    result: enemyDefeated ? 'enemyDefeated' : 'continue',
    P,
    E
  };
}
