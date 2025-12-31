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
import { BASE_PLAYER_ENERGY, ENEMIES } from '../battleData';
import { applyAction } from './combatActions';
import { calculatePassiveEffects } from '../../../lib/relicEffects';
import { getAllTokens } from '../../../lib/tokenUtils';
import { createBattleEnemyData } from '../../../state/battleHelpers';
import type {
  BattleAction,
  BattleEvent,
  BattleRef,
  PlayerBattleState,
  EnemyUnit,
  PostCombatOptions,
} from '../../../types/combat';
import type { Card, Relic } from '../../../types/core';
import type { EtherCard } from '../../../types/systems';

/**
 * runAll 핵심 로직 파라미터
 */
interface RunAllCoreParams {
  battle: BattleRef;
  player: PlayerBattleState;
  enemy: EnemyUnit;
  qIndex: number;
  turnEtherAccumulated: number;
  enemyTurnEtherAccumulated: number;
  orderedRelicList: Relic[];
  selected: Card[];
  addLog: (msg: string) => void;
  playSound: (frequency: number, duration: number) => void;
  actions: {
    setTurnEtherAccumulated: (value: number) => void;
    setEnemyTurnEtherAccumulated: (value: number) => void;
    setPlayer: (player: PlayerBattleState) => void;
    setEnemy: (enemy: EnemyUnit) => void;
    setActionEvents: (events: Record<number, BattleEvent[]>) => void;
    setQIndex: (index: number) => void;
    setPostCombatOptions: (options: PostCombatOptions) => void;
    setPhase: (phase: string) => void;
    setEnemyHit: (hit: boolean) => void;
  };
}

/**
 * runAll 핵심 로직
 */
export function runAllCore(params: RunAllCoreParams) {
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

  if (!battle.queue || battle.qIndex === undefined || battle.qIndex >= battle.queue.length) {
    return { completed: false };
  }

  playSound(1000, 150);
  const relicIds = orderedRelicList.map(r => r.id);
  const passiveRelicEffects = calculatePassiveEffects(relicIds);

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
  const newEvents: Record<number, BattleEvent[]> = {};
  let enemyDefeated = false;
  let playerDefeated = false;
  let finalQIndex = qIndex;

  // runAll용 battleContext 생성
  const playerAttackCards = selected.filter((c: Card) => c.type === 'attack');
  const playerEnergyBudget = P.energy || P.maxEnergy || BASE_PLAYER_ENERGY;
  const enemyEnergyBudget = E.energy || E.maxEnergy || BASE_PLAYER_ENERGY;
  const queue = battle.queue; // Type narrowing for loop

  for (let i = qIndex; i < queue.length; i++) {
    const a = queue[i];

    if (enemyDefeated && a.actor === 'enemy') {
      continue;
    }

    // battleContext 생성
    const isLastCard = i >= queue.length - 1;
    const unusedAttackCards = playerAttackCards.filter((c: Card) => {
      const cardQueueIndex = queue.findIndex((q: BattleAction) => q.card?.id === c.id && q.actor === 'player');
      return cardQueueIndex > i;
    }).length;

    // 현재까지 사용된 에너지 계산
    const executedPlayerCards = queue.slice(0, i).filter((q: BattleAction) => q.actor === 'player');
    const energyUsedSoFar = executedPlayerCards.reduce((sum: number, q: BattleAction) => sum + (q.card?.actionCost || 0), 0);
    const calcRemainingEnergy = Math.max(0, playerEnergyBudget - energyUsedSoFar);
    const executedEnemyCards = queue.slice(0, i).filter((q: BattleAction) => q.actor === 'enemy');
    const enemyEnergyUsedSoFar = executedEnemyCards.reduce((sum: number, q: BattleAction) => sum + (q.card?.actionCost || 0), 0);
    const calcEnemyRemainingEnergy = Math.max(0, enemyEnergyBudget - enemyEnergyUsedSoFar);

    const battleContext = {
      playerAttackCards,
      isLastCard,
      unusedAttackCards,
      queue,
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

    if (!a.card) continue;

    const actionResult = applyAction(tempState, a.actor, a.card, battleContext);
    const { events, updatedState } = actionResult;
    newEvents[i] = events;
    events.forEach(ev => addLog(ev.msg));

    // 상태 업데이트
    if (updatedState && updatedState.player && updatedState.enemy) {
      P = { ...P, ...(updatedState.player as PlayerBattleState) };
      E = { ...E, ...(updatedState.enemy as EnemyUnit) };
      tempState = { player: P, enemy: E, log: [] };
    }

    // 다중 유닛 데미지 분배
    if (hasUnits && a.actor === 'player' && a.card?.type === 'attack') {
      const damageDealt = Math.max(0, enemyHpBefore - E.hp);

      if (damageDealt > 0) {
        const currentUnits = E.units || enemyUnits;
        const aliveUnits = currentUnits.filter((u: EnemyUnit) => u.hp > 0);

        // 파토스 aoe 효과 확인
        const pathosNextCardEffects = (battle as { pathosNextCardEffects?: { aoe?: boolean } }).pathosNextCardEffects;
        const isAoe = pathosNextCardEffects?.aoe === true;

        if (isAoe && aliveUnits.length > 1) {
          // AOE: 모든 유닛에게 동일 데미지
          let totalDamage = 0;
          const updatedUnits = currentUnits.map((u: EnemyUnit) => {
            if (u.hp > 0) {
              const newHp = Math.max(0, u.hp - damageDealt);
              totalDamage += u.hp - newHp;
              return { ...u, hp: newHp };
            }
            return u;
          });

          E.units = updatedUnits;
          E.hp = updatedUnits.reduce((sum: number, u: EnemyUnit) => sum + Math.max(0, u.hp), 0);
          tempState = { player: P, enemy: E, log: [] };
          addLog(`💥 전체 공격! 모든 적에게 ${damageDealt} 피해!`);
        } else {
          // 단일 타겟
          let targetUnit = aliveUnits.find((u: EnemyUnit) => u.unitId === selectedTargetUnit);
          if (!targetUnit && aliveUnits.length > 0) {
            targetUnit = aliveUnits[0];
          }

          if (targetUnit) {
            const unitHpBefore = targetUnit.hp;
            const newUnitHp = Math.max(0, targetUnit.hp - damageDealt);

            const updatedUnits = currentUnits.map((u: EnemyUnit) => {
              if (u.unitId === targetUnit.unitId) {
                return { ...u, hp: newUnitHp };
              }
              return u;
            });

          const newTotalHp = updatedUnits.reduce((sum: number, u: EnemyUnit) => sum + Math.max(0, u.hp), 0);
          E.hp = newTotalHp;
          E.units = updatedUnits;
          tempState = { player: P, enemy: E, log: [] };

          // === summonOnHalfHp 패시브 체크 ===
          // 체력이 50% 이하로 떨어지면 소환 (한 번만 발동)
          const targetPassives = targetUnit.passives || ({} as Record<string, unknown>);
          if (targetPassives.summonOnHalfHp && !targetUnit.hasSummoned) {
            const maxHp = targetUnit.maxHp || targetUnit.hp || 100;
            const halfHp = maxHp / 2;
            if (newUnitHp <= halfHp && newUnitHp > 0) {
              // 소환 발동: 탈영병 2기 추가
              const deserterDef = ENEMIES.find(e => e.id === 'deserter');
              if (deserterDef) {
                const currentMaxId = Math.max(...E.units.map((u: EnemyUnit) => u.unitId || 0));
                const newUnit1 = { ...createBattleEnemyData(deserterDef), unitId: currentMaxId + 1 } as EnemyUnit;
                const newUnit2 = { ...createBattleEnemyData(deserterDef), unitId: currentMaxId + 2 } as EnemyUnit;

                // hasSummoned 플래그 설정
                const unitsWithFlag = E.units.map((u: EnemyUnit) =>
                  u.unitId === targetUnit.unitId ? { ...u, hasSummoned: true } : u
                );
                E.units = [...unitsWithFlag, newUnit1, newUnit2];
                E.hp = E.units.reduce((sum: number, u: EnemyUnit) => sum + Math.max(0, u.hp), 0);
                tempState = { player: P, enemy: E, log: [] };
                addLog(`⚔️ ${targetUnit.name}: 부하 소환! 탈영병 2기 등장!`);
              }
            }
          }
          } // if (targetUnit)
        } // else (단일 타겟)
      } // if (damageDealt > 0)
    } // if (hasUnits && player attack)

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

    if (a.actor === 'player' && a.card) {
      const gain = Math.floor(getCardEtherGain(a.card as unknown as EtherCard) * passiveRelicEffects.etherMultiplier);
      actions.setTurnEtherAccumulated(turnEtherAccumulated + gain);
    } else if (a.actor === 'enemy' && a.card) {
      actions.setEnemyTurnEtherAccumulated(enemyTurnEtherAccumulated + getCardEtherGain(a.card as unknown as EtherCard));
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

  actions.setQIndex(queue.length);

  return {
    completed: true,
    result: enemyDefeated ? 'enemyDefeated' : 'continue',
    P,
    E
  };
}
