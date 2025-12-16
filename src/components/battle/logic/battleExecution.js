/**
 * battleExecution.js
 *
 * 전투 실행 로직 - stepOnce, executeCardAction, finishTurn, runAll
 * LegacyBattleApp.jsx에서 분리됨
 */

import { hasTrait } from '../utils/battleUtils';
import { detectPokerCombo } from '../utils/comboDetection';
import { getCardEtherGain } from '../utils/etherCalculations';
import { applyAction } from './combatActions';
import { processTimelineSpecials } from '../utils/cardSpecialEffects';
import { processCardTraitEffects } from '../utils/cardTraitEffects';
import { calculateTurnEndEther, formatPlayerEtherLog, formatEnemyEtherLog } from '../utils/turnEndEtherCalculation';
import { updateComboUsageCount, createTurnEndPlayerState, createTurnEndEnemyState, checkVictoryCondition } from '../utils/turnEndStateUpdate';
import { processImmediateCardTraits, processCardPlayedRelicEffects } from '../utils/cardImmediateEffects';
import { processActionEventAnimations } from '../utils/eventAnimationProcessing';
import { processStunEffect } from '../utils/stunProcessing';
import { processPlayerEtherAccumulation, processEnemyEtherAccumulation } from '../utils/etherAccumulationProcessing';
import { processEnemyDeath } from '../utils/enemyDeathProcessing';
import { playTurnEndRelicAnimations, applyTurnEndRelicEffectsToNextTurn } from '../utils/turnEndRelicEffectsProcessing';
import { startEnemyEtherAnimation } from '../utils/enemyEtherAnimation';
import { processEtherTransfer } from '../utils/etherTransferProcessing';
import { processVictoryDefeatTransition } from '../utils/victoryDefeatTransition';
import { calculatePassiveEffects, applyTurnEndEffects } from '../../../lib/relicEffects';

// =====================
// 타이밍 상수 (밀리초)
// =====================
export const TIMING = {
  // stepOnce 타이밍
  CARD_EXECUTION_DELAY: 250,      // 시곗바늘 이동 후 카드 발동 대기
  CARD_SHAKE_DURATION: 200,       // 카드 흔들림 애니메이션
  CARD_FADEOUT_DELAY: 150,        // 마지막 카드 페이드아웃
  CARD_DISAPPEAR_START: 150,      // 카드 소멸 시작
  CARD_DISAPPEAR_DURATION: 300,   // 카드 소멸 애니메이션

  // 자동진행 타이밍
  AUTO_PROGRESS_DELAY: 450,       // 다음 카드로 넘어가는 대기 시간

  // 에테르 계산 타이밍
  ETHER_CALC_START_DELAY: 400,    // 에테르 계산 시작 딜레이
  ETHER_MULTIPLY_DELAY: 600,      // 배율 적용 딜레이
  ETHER_DEFLATION_DELAY: 400,     // 디플레이션 딜레이
};

// =====================
// stepOnce 애니메이션 처리
// =====================
export function createStepOnceAnimations(params) {
  const {
    currentQIndex,
    queueLength,
    action,
    battleRef,
    actions,
    escapeUsedThisTurnRef,
  } = params;

  return {
    // 카드 실행 애니메이션 시작
    startExecution: () => {
      actions.setExecutingCardIndex(currentQIndex);
    },

    // 카드 실행 완료 후 처리
    finishExecution: () => {
      actions.setExecutingCardIndex(null);
      const currentBattle = battleRef.current;
      const currentUsedIndices = currentBattle.usedCardIndices || [];
      actions.setUsedCardIndices([...currentUsedIndices, currentQIndex]);
    },

    // 마지막 카드 페이드아웃
    handleLastCard: () => {
      if (currentQIndex >= queueLength - 1) {
        setTimeout(() => {
          actions.setTimelineIndicatorVisible(false);
        }, TIMING.CARD_FADEOUT_DELAY);
      }
    },

    // 플레이어 카드 소멸 처리
    handlePlayerCardDisappear: () => {
      if (action.actor !== 'player') return;

      if (hasTrait(action.card, 'escape')) {
        escapeUsedThisTurnRef.current = new Set([...escapeUsedThisTurnRef.current, action.card.id]);
      }

      setTimeout(() => {
        const currentBattle = battleRef.current;
        const currentDisappearing = currentBattle.disappearingCards || [];
        actions.setDisappearingCards([...currentDisappearing, currentQIndex]);

        setTimeout(() => {
          const currentBattle = battleRef.current;
          const currentHidden = currentBattle.hiddenCards || [];
          const currentDisappearing2 = currentBattle.disappearingCards || [];
          actions.setHiddenCards([...currentHidden, currentQIndex]);
          actions.setDisappearingCards(currentDisappearing2.filter(i => i !== currentQIndex));
        }, TIMING.CARD_DISAPPEAR_DURATION);
      }, TIMING.CARD_DISAPPEAR_START);
    },
  };
}

// =====================
// executeCardAction 핵심 로직
// =====================
export function executeCardActionCore(params) {
  const {
    action,
    player,
    enemy,
    battle,
    battleRef,
    cardUsageCount,
    nextTurnEffects,
    turnEtherAccumulated,
    enemyTurnEtherAccumulated,
    orderedRelicList,
    cardUpgrades,
    resolvedPlayerCards,
    playerTimeline,
    relics,
    safeInitialPlayer,
    triggeredRefs,
    calculatePassiveEffects: calcPassive,
    collectTriggeredRelics,
    playRelicActivationSequence,
    flashRelic,
    addLog,
    playHitSound,
    playBlockSound,
    actions,
  } = params;

  // 초기 상태 설정
  let P = {
    ...player,
    def: player.def || false,
    block: player.block || 0,
    counter: player.counter || 0,
    vulnMult: player.vulnMult || 1,
    strength: player.strength || 0,
    tokens: player.tokens
  };
  let E = {
    ...enemy,
    def: enemy.def || false,
    block: enemy.block || 0,
    counter: enemy.counter || 0,
    vulnMult: enemy.vulnMult || 1,
    tokens: enemy.tokens
  };

  const tempState = { player: P, enemy: E, log: [] };

  // battleContext 생성 (special 효과용)
  const queue = battleRef.current?.queue || [];
  const currentQIndex = battleRef.current?.qIndex || 0;
  const selected = battle.selected || [];

  // 플레이어 공격 카드 목록
  const playerAttackCards = selected.filter(c => c.type === 'attack');
  // 이 카드가 타임라인상 마지막인지
  const isLastCard = currentQIndex >= queue.length - 1;
  // 이번 턴 사용하지 않은 공격 카드 수 (선택했지만 아직 발동하지 않은 공격 카드)
  const usedCardIndices = battleRef.current?.usedCardIndices || [];
  const unusedAttackCards = playerAttackCards.filter((c, idx) => {
    // 현재 카드 이후에 발동할 카드 중 공격 카드 개수
    const cardQueueIndex = queue.findIndex(q => q.card?.id === c.id && q.actor === 'player');
    return cardQueueIndex > currentQIndex;
  }).length;

  const battleContext = {
    playerAttackCards,
    isLastCard,
    unusedAttackCards,
    queue,
    currentQIndex,
    currentSp: action.sp || 0  // 현재 카드의 타임라인 위치 (growingDefense용)
  };

  const actionResult = applyAction(tempState, action.actor, action.card, battleContext);
  const { events, updatedState } = actionResult;
  let actionEvents = events;

  if (updatedState) {
    P = updatedState.player;
    E = updatedState.enemy;
  } else {
    console.error('[executeCardAction] updatedState is undefined!', {
      card: action.card,
      actor: action.actor,
      actionResult
    });
  }

  // 플레이어 카드 사용 시 추가 처리
  if (action.actor === 'player' && action.card.id) {
    // 카드 사용 횟수 증가
    actions.setCardUsageCount({
      ...cardUsageCount,
      [action.card.id]: (cardUsageCount[action.card.id] || 0) + 1
    });

    // 즉시 발동 특성 처리 (vanish 포함)
    const updatedNextTurnEffects = processImmediateCardTraits({
      card: action.card,
      playerState: P,
      nextTurnEffects,
      addLog,
      addVanishedCard: actions.addVanishedCard
    });
    if (updatedNextTurnEffects !== nextTurnEffects) {
      actions.setNextTurnEffects(updatedNextTurnEffects);
    }

    // 상징 효과
    processCardPlayedRelicEffects({
      relics,
      card: action.card,
      playerState: P,
      enemyState: E,
      safeInitialPlayer,
      addLog,
      setRelicActivated: actions.setRelicActivated
    });

    // 토큰 onPlay 효과
    if (action.card.onPlay && typeof action.card.onPlay === 'function') {
      try {
        action.card.onPlay(battle, actions);
      } catch (error) {
        console.error('[Token onPlay Error]', error);
      }
    }
  }

  // 스턴 효과 처리
  if (hasTrait(action.card, 'stun')) {
    const { updatedQueue, stunEvent } = processStunEffect({
      action,
      queue: battleRef.current.queue,
      currentQIndex: battleRef.current.qIndex,
      addLog
    });
    if (updatedQueue !== battleRef.current.queue) {
      actions.setQueue(updatedQueue);
    }
    if (stunEvent) {
      actionEvents = [...actionEvents, stunEvent];
    }
  }

  // 타임라인 조작 효과 처리 (마르쉐, 런지, 비트, 흐트리기 등)
  const timelineResult = processTimelineSpecials({
    card: action.card,
    actor: action.actor,
    actorName: action.actor,
    queue: battleRef.current.queue,
    currentIndex: battleRef.current.qIndex,
    damageDealt: actionResult.dealt || 0
  });

  if (timelineResult.events.length > 0) {
    actionEvents = [...actionEvents, ...timelineResult.events];
    timelineResult.logs.forEach(log => addLog(log));
  }

  // 타임라인 변경 적용
  const { timelineChanges } = timelineResult;
  if (timelineChanges.advancePlayer > 0 || timelineChanges.pushEnemy > 0 || timelineChanges.pushLastEnemy > 0) {
    let updatedQueue = [...battleRef.current.queue];
    const currentQIndex = battleRef.current.qIndex;

    // 플레이어 카드 앞당기기 (현재 카드 이후의 플레이어 카드들)
    if (timelineChanges.advancePlayer > 0) {
      updatedQueue = updatedQueue.map((item, idx) => {
        if (idx > currentQIndex && item.actor === 'player') {
          return { ...item, sp: Math.max(0, item.sp - timelineChanges.advancePlayer) };
        }
        return item;
      });
    }

    // 적 카드 뒤로 밀기 (현재 카드 이후의 적 카드들)
    if (timelineChanges.pushEnemy > 0) {
      updatedQueue = updatedQueue.map((item, idx) => {
        if (idx > currentQIndex && item.actor === 'enemy') {
          return { ...item, sp: item.sp + timelineChanges.pushEnemy };
        }
        return item;
      });
    }

    // 적의 마지막 카드만 밀기
    if (timelineChanges.pushLastEnemy > 0) {
      // 현재 이후의 적 카드들 중 가장 마지막 카드 찾기
      let lastEnemyIdx = -1;
      for (let i = updatedQueue.length - 1; i > currentQIndex; i--) {
        if (updatedQueue[i].actor === 'enemy') {
          lastEnemyIdx = i;
          break;
        }
      }
      if (lastEnemyIdx !== -1) {
        updatedQueue = updatedQueue.map((item, idx) => {
          if (idx === lastEnemyIdx) {
            return { ...item, sp: item.sp + timelineChanges.pushLastEnemy };
          }
          return item;
        });
      }
    }

    // 큐 재정렬 (sp 값 기준, 이미 처리된 카드들은 유지)
    const processedCards = updatedQueue.slice(0, currentQIndex + 1);
    const remainingCards = updatedQueue.slice(currentQIndex + 1);
    remainingCards.sort((a, b) => a.sp - b.sp);
    updatedQueue = [...processedCards, ...remainingCards];

    actions.setQueue(updatedQueue);
  }

  // 에테르 누적
  if (action.actor === 'player') {
    processPlayerEtherAccumulation({
      card: action.card,
      turnEtherAccumulated,
      orderedRelicList,
      cardUpgrades,
      resolvedPlayerCards,
      playerTimeline,
      relics,
      triggeredRefs,
      calculatePassiveEffects: calcPassive,
      getCardEtherGain,
      collectTriggeredRelics,
      playRelicActivationSequence,
      flashRelic,
      actions
    });
  } else if (action.actor === 'enemy') {
    processEnemyEtherAccumulation({
      card: action.card,
      enemyTurnEtherAccumulated,
      getCardEtherGain,
      actions
    });

    // 집요한 타격 (persistent_strike) 효과 처리
    const persistentStrikeToken = P.tokens?.find(t => t.id === 'persistent_strike');
    if (persistentStrikeToken) {
      const strikeDamage = P._persistentStrikeDamage || 20;
      const beforeHP = E.hp;
      E.hp = Math.max(0, E.hp - strikeDamage);
      const msg = `👊 집요한 타격: 적에게 ${strikeDamage} 피해! (체력 ${beforeHP} -> ${E.hp})`;
      addLog(msg);
      actionEvents.push({
        actor: 'player',
        card: '집요한 타격',
        type: 'hit',
        dmg: strikeDamage,
        msg
      });
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
    strength: P.strength || 0,
    tokens: P.tokens
  });
  actions.setEnemy({
    ...enemy,
    hp: E.hp,
    def: E.def,
    block: E.block,
    counter: E.counter,
    vulnMult: E.vulnMult || 1,
    tokens: E.tokens
  });
  actions.setActionEvents({ ...battleRef.current.actionEvents, [battleRef.current.qIndex]: actionEvents });

  // 이벤트 애니메이션
  processActionEventAnimations({
    actionEvents,
    action,
    addLog,
    playHitSound,
    playBlockSound,
    actions
  });

  return { P, E, actionEvents };
}

// =====================
// finishTurn 핵심 로직
// =====================
export function finishTurnCore(params) {
  const {
    reason,
    player,
    enemy,
    battle,
    selected,
    enemyPlan,
    queue,
    turnEtherAccumulated,
    enemyTurnEtherAccumulated,
    finalComboMultiplier,
    relics,
    nextTurnEffects,
    escapeBanRef,
    escapeUsedThisTurnRef,
    RELICS,
    calculateEtherTransfer,
    addLog,
    playSound,
    actions,
  } = params;

  addLog(`턴 종료: ${reason || ''}`);

  // 턴소모 토큰 제거
  actions.clearPlayerTurnTokens();
  actions.clearEnemyTurnTokens();

  // 탈주 카드 차단
  escapeBanRef.current = new Set(escapeUsedThisTurnRef.current);
  escapeUsedThisTurnRef.current = new Set();

  // 다음 턴 효과 처리
  const newNextTurnEffects = processCardTraitEffects(selected, addLog);

  // 상징 턴 종료 효과
  const turnEndRelicEffects = applyTurnEndEffects(relics, {
    cardsPlayedThisTurn: battle.selected.length,
    player,
    enemy,
  });

  playTurnEndRelicAnimations({
    relics,
    RELICS,
    cardsPlayedThisTurn: battle.selected.length,
    player,
    enemy,
    playSound,
    actions
  });

  const updatedNextTurnEffects = applyTurnEndRelicEffectsToNextTurn({
    turnEndRelicEffects,
    nextTurnEffects: newNextTurnEffects,
    player,
    addLog,
    actions
  });

  actions.setNextTurnEffects(updatedNextTurnEffects);

  // 조합 감지
  const pComboEnd = detectPokerCombo(selected);
  const eComboEnd = detectPokerCombo(enemyPlan.actions);

  // 에테르 최종 계산
  // battleRef에서 최신 player 상태 가져오기 (아이템 효과의 etherMultiplier 등)
  const latestPlayer = battleRef.current?.player || player;
  const etherResult = calculateTurnEndEther({
    playerCombo: pComboEnd,
    enemyCombo: eComboEnd,
    turnEtherAccumulated,
    enemyTurnEtherAccumulated,
    finalComboMultiplier,
    player: latestPlayer,
    enemy
  });

  const { player: playerEther, enemy: enemyEther } = etherResult;
  const playerFinalEther = playerEther.finalEther;
  const enemyFinalEther = enemyEther.finalEther;
  const playerAppliedEther = playerEther.appliedEther;
  const enemyAppliedEther = enemyEther.appliedEther;
  const playerOverflow = playerEther.overflow;

  // 로깅
  if (playerFinalEther > 0) {
    addLog(formatPlayerEtherLog(playerEther, turnEtherAccumulated));
    actions.setEtherFinalValue(playerFinalEther);
  }

  if (enemyFinalEther > 0) {
    addLog(formatEnemyEtherLog(enemyEther, enemyTurnEtherAccumulated));
    startEnemyEtherAnimation({ enemyFinalEther, enemyEther, actions });
  }

  actions.setEnemyEtherFinalValue(enemyFinalEther);

  // 에테르 이동
  const curPlayerPts = player.etherPts || 0;
  const curEnemyPts = enemy.etherPts || 0;

  const effectivePlayerAppliedEther = player.etherBan ? 0 : playerAppliedEther;
  if (player.etherBan && playerAppliedEther > 0) {
    addLog('⚠️ [디플레이션의 저주] 에테르 획득이 차단되었습니다!');
  }

  const { nextPlayerPts, nextEnemyPts } = processEtherTransfer({
    playerAppliedEther: effectivePlayerAppliedEther,
    enemyAppliedEther,
    curPlayerPts,
    curEnemyPts,
    enemyHp: enemy.hp,
    calculateEtherTransfer,
    addLog,
    playSound,
    actions
  });

  // 조합 사용 카운트 업데이트
  const newUsageCount = updateComboUsageCount(player.comboUsageCount, pComboEnd, queue, 'player');
  const newEnemyUsageCount = updateComboUsageCount(enemy.comboUsageCount, eComboEnd, [], 'enemy');

  // 상태 업데이트
  actions.setPlayer(createTurnEndPlayerState(player, {
    comboUsageCount: newUsageCount,
    etherPts: nextPlayerPts,
    etherOverflow: playerOverflow,
    etherMultiplier: 1  // 에테르 증폭 배율 초기화
  }));

  const nextPts = Math.max(0, nextEnemyPts);
  actions.setEnemy(createTurnEndEnemyState(enemy, {
    comboUsageCount: newEnemyUsageCount,
    etherPts: nextPts
  }));

  // 리셋
  actions.setTurnEtherAccumulated(0);
  actions.setEnemyTurnEtherAccumulated(0);
  actions.setSelected([]);
  actions.setQueue([]);
  actions.setQIndex(0);
  actions.setFixedOrder(null);
  actions.setUsedCardIndices([]);
  actions.setDisappearingCards([]);
  actions.setHiddenCards([]);

  // 승리/패배 체크
  const transitionResult = processVictoryDefeatTransition({
    enemy,
    player,
    nextEnemyPtsSnapshot: nextPts,
    checkVictoryCondition,
    actions
  });

  if (transitionResult.shouldReturn) {
    return { shouldReturn: true };
  }

  actions.setTurnNumber(t => t + 1);
  actions.setNetEtherDelta(null);
  actions.setPhase('select');

  return { shouldReturn: false };
}

// =====================
// runAll 핵심 로직
// =====================
export function runAllCore(params) {
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
    etherPts: player.etherPts || 0
  };
  let E = {
    ...enemy,
    def: enemy.def || false,
    block: enemy.block || 0,
    counter: enemy.counter || 0,
    vulnMult: enemy.vulnMult || 1,
    etherPts: enemy.etherPts || 0
  };

  const tempState = { player: P, enemy: E, log: [] };
  const newEvents = {};
  let enemyDefeated = false;
  let playerDefeated = false;
  let finalQIndex = qIndex;

  // runAll용 battleContext 생성
  const playerAttackCards = selected.filter(c => c.type === 'attack');

  for (let i = qIndex; i < battle.queue.length; i++) {
    const a = battle.queue[i];

    if (enemyDefeated && a.actor === 'enemy') {
      continue;
    }

    // battleContext 생성 (각 카드마다 다를 수 있음)
    const isLastCard = i >= battle.queue.length - 1;
    const unusedAttackCards = playerAttackCards.filter(c => {
      const cardQueueIndex = battle.queue.findIndex(q => q.card?.id === c.id && q.actor === 'player');
      return cardQueueIndex > i;
    }).length;

    const battleContext = {
      playerAttackCards,
      isLastCard,
      unusedAttackCards,
      queue: battle.queue,
      currentQIndex: i,
      currentSp: a.sp || 0  // 현재 카드의 타임라인 위치 (growingDefense용)
    };

    const { events } = applyAction(tempState, a.actor, a.card, battleContext);
    newEvents[i] = events;
    events.forEach(ev => addLog(ev.msg));

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
    vulnMult: P.vulnMult || 1
  });
  actions.setEnemy({
    ...enemy,
    hp: E.hp,
    def: E.def,
    block: E.block,
    counter: E.counter,
    vulnMult: E.vulnMult || 1
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
