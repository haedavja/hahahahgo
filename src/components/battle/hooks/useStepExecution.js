import { useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { playHitSound, playBlockSound, playParrySound } from "../../../lib/soundUtils";
import { TIMING, executeMultiHitAsync } from "../logic/battleExecution";
import { applyAction } from "../logic/combatActions";
import { addToken, removeToken, getAllTokens, expireTurnTokensByTimeline, setTokenStacks } from "../../../lib/tokenUtils";
import { TOKENS } from "../../../data/tokens";
import { hasTrait } from "../utils/battleUtils";
import { processTimelineSpecials, hasSpecial, processCardPlaySpecials } from "../utils/cardSpecialEffects";
import { processStunEffect } from "../utils/stunProcessing";
import { setupParryReady, checkParryTrigger } from "../utils/parryProcessing";
import { processImmediateCardTraits, processCardPlayedRelicEffects } from "../utils/cardImmediateEffects";
import { processPlayerEtherAccumulation, processEnemyEtherAccumulation } from "../utils/etherAccumulationProcessing";
import { processEnemyDeath } from "../utils/enemyDeathProcessing";
import { processActionEventAnimations } from "../utils/eventAnimationProcessing";
import { collectTriggeredRelics, playRelicActivationSequence } from "../utils/relicActivationAnimation";
import { drawFromDeck } from "../utils/handGeneration";
import { calculatePassiveEffects } from "../../../lib/relicEffects";
import { getCardEtherGain } from "../utils/etherCalculations";
import { useGameStore } from "../../../state/gameStore";
import { DEFAULT_PLAYER_MAX_SPEED, DEFAULT_ENEMY_MAX_SPEED, BASE_PLAYER_ENERGY } from "../battleData";

/**
 * useStepExecution - stepOnce와 executeCardAction 로직을 추출한 훅
 */
export function useStepExecution({
  battle,
  player,
  enemy,
  turnNumber,
  turnEtherAccumulated,
  enemyTurnEtherAccumulated,
  cardUsageCount,
  nextTurnEffects,
  orderedRelicList,
  relics,
  cardUpgrades,
  resolvedPlayerCards,
  playerTimeline,
  CARDS,
  // Refs
  battleRef,
  breachSelectionRef,
  setBreachSelection,
  creationQueueRef,
  stepOnceRef,
  timelineAnimationRef,
  isExecutingCardRef,
  parryReadyStatesRef,
  setParryReadyStates,
  growingDefenseRef,
  escapeBanRef,
  escapeUsedThisTurnRef,
  referenceBookTriggeredRef,
  devilDiceTriggeredRef,
  // Functions
  addLog,
  playSound,
  flashRelic,
  actions
}) {
  /**
   * stepOnce - 타임라인에서 한 카드씩 실행
   */
  const stepOnce = useCallback(() => {
    // 브리치 선택 대기 중이면 진행 차단
    if (breachSelectionRef.current) return;

    const currentBattle = battleRef.current;
    if (currentBattle.qIndex >= currentBattle.queue.length) return;
    const a = currentBattle.queue[currentBattle.qIndex];

    // 죽은 적의 카드 스킵
    const currentEnemy = currentBattle.enemy || enemy;
    if (a.actor === 'enemy' && currentEnemy.hp <= 0) {
      const newQIndex = currentBattle.qIndex + 1;
      actions.setQIndex(newQIndex);
      battleRef.current = { ...battleRef.current, qIndex: newQIndex };
      return;
    }
    const currentQIndex = currentBattle.qIndex;

    // 타임라인 progress 업데이트
    const playerMaxSpeed = player?.maxSpeed || DEFAULT_PLAYER_MAX_SPEED;
    const enemyMaxSpeed = enemy?.maxSpeed || DEFAULT_ENEMY_MAX_SPEED;
    const commonMaxSpeed = Math.max(playerMaxSpeed, enemyMaxSpeed);
    const targetProgress = (a.sp / commonMaxSpeed) * 100;

    // 이전 애니메이션 정리
    if (timelineAnimationRef.current) {
      cancelAnimationFrame(timelineAnimationRef.current);
      timelineAnimationRef.current = null;
    }

    // 부드러운 타임라인 진행 애니메이션
    const startProgress = currentBattle.timelineProgress || 0;
    const animationDuration = TIMING.CARD_EXECUTION_DELAY;
    const startTime = performance.now();

    const animateProgress = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      const currentProgress = startProgress + (targetProgress - startProgress) * progress;

      // 방어자세 실시간 방어력 업데이트
      if (growingDefenseRef.current) {
        const currentTimelineSp = Math.floor((currentProgress / 100) * commonMaxSpeed);
        const { activatedSp, totalDefenseApplied = 0 } = growingDefenseRef.current;
        const totalDefenseNeeded = Math.max(0, currentTimelineSp - activatedSp);
        const defenseDelta = totalDefenseNeeded - totalDefenseApplied;
        if (defenseDelta > 0) {
          const currentPlayer = battleRef.current?.player || player;
          const newBlock = (currentPlayer.block || 0) + defenseDelta;
          actions.setPlayer({ ...currentPlayer, block: newBlock, def: true });
          if (battleRef.current) {
            battleRef.current.player = { ...battleRef.current.player, block: newBlock, def: true };
          }
          growingDefenseRef.current.totalDefenseApplied = totalDefenseNeeded;
        }
      }

      flushSync(() => {
        actions.setTimelineProgress(currentProgress);
      });

      if (progress < 1) {
        timelineAnimationRef.current = requestAnimationFrame(animateProgress);
      } else {
        timelineAnimationRef.current = null;
      }
    };

    timelineAnimationRef.current = requestAnimationFrame(animateProgress);

    // 시곗바늘 이동 완료 후 카드 발동
    setTimeout(() => {
      actions.setExecutingCardIndex(currentQIndex);

      setTimeout(() => {
        actions.setExecutingCardIndex(null);
        const currentBattle = battleRef.current;
        const currentUsedIndices = currentBattle.usedCardIndices || [];
        actions.setUsedCardIndices([...currentUsedIndices, currentQIndex]);
      }, TIMING.CARD_SHAKE_DURATION);

      if (currentQIndex >= currentBattle.queue.length - 1) {
        setTimeout(() => {
          actions.setTimelineIndicatorVisible(false);
        }, TIMING.CARD_FADEOUT_DELAY);
      }

      // 플레이어 카드 소멸 이펙트
      if (a.actor === 'player') {
        if (hasTrait(a.card, 'escape')) {
          escapeUsedThisTurnRef.current = new Set([...escapeUsedThisTurnRef.current, a.card.id]);
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
      }

      executeCardAction();
    }, TIMING.CARD_EXECUTION_DELAY);
  }, [player, enemy, actions, battleRef, breachSelectionRef, timelineAnimationRef, growingDefenseRef, escapeUsedThisTurnRef]);

  /**
   * executeCardAction - 카드 실행 핵심 로직
   */
  const executeCardAction = useCallback(async () => {
    if (isExecutingCardRef.current) return;
    isExecutingCardRef.current = true;

    const currentBattle = battleRef.current;
    if (currentBattle.qIndex >= currentBattle.queue.length) {
      isExecutingCardRef.current = false;
      return;
    }
    const a = currentBattle.queue[currentBattle.qIndex];

    // 최신 player/enemy 상태
    const latestPlayer = currentBattle.player || player;
    const latestEnemy = currentBattle.enemy || enemy;
    let P = { ...player, def: latestPlayer.def || player.def || false, block: latestPlayer.block ?? player.block ?? 0, counter: player.counter || 0, vulnMult: player.vulnMult || 1, strength: player.strength || 0, tokens: latestPlayer.tokens };
    let E = { ...enemy, def: latestEnemy.def || enemy.def || false, block: latestEnemy.block ?? enemy.block ?? 0, counter: enemy.counter || 0, vulnMult: enemy.vulnMult || 1, tokens: latestEnemy.tokens };

    // 타임라인 기반 토큰 만료 처리
    const currentSp = a.sp || 0;
    const playerExpireResult = expireTurnTokensByTimeline(P, turnNumber, currentSp);
    const enemyExpireResult = expireTurnTokensByTimeline(E, turnNumber, currentSp);

    if (playerExpireResult.logs.length > 0) {
      P = { ...P, tokens: playerExpireResult.tokens };
      playerExpireResult.logs.forEach(log => addLog(log));
    }
    if (enemyExpireResult.logs.length > 0) {
      E = { ...E, tokens: enemyExpireResult.tokens };
      enemyExpireResult.logs.forEach(log => addLog(log));
    }

    if (battleRef.current && (playerExpireResult.logs.length > 0 || enemyExpireResult.logs.length > 0)) {
      battleRef.current = { ...battleRef.current, player: P, enemy: E };
    }

    const tempState = { player: P, enemy: E, log: [] };

    // battleContext 생성
    const allPlayerCards = currentBattle.queue.filter(q => q.actor === 'player');
    const totalEnergyUsed = allPlayerCards.reduce((sum, q) => sum + (q.card?.actionCost || 0), 0);
    const playerEnergyBudget = P.energy || P.maxEnergy || BASE_PLAYER_ENERGY;
    const calculatedRemainingEnergy = Math.max(0, playerEnergyBudget - totalEnergyUsed);

    const allEnemyCards = currentBattle.queue.filter(q => q.actor === 'enemy');
    const enemyTotalEnergyUsed = allEnemyCards.reduce((sum, q) => sum + (q.card?.actionCost || 0), 0);
    const enemyEnergyBudget = E.energy || E.maxEnergy || BASE_PLAYER_ENERGY;
    const calculatedEnemyRemainingEnergy = Math.max(0, enemyEnergyBudget - enemyTotalEnergyUsed);

    const executedPlayerCards = currentBattle.queue
      .slice(0, currentBattle.qIndex)
      .filter(q => q.actor === 'player');
    const usedCardCategories = [...new Set(executedPlayerCards.map(q => q.card?.cardCategory).filter(Boolean))];

    const currentUnitsForContext = E.units || enemy?.units || [];
    const sourceUnit = a.actor === 'enemy' && a.card.__sourceUnitId !== undefined
      ? currentUnitsForContext.find(u => u.unitId === a.card.__sourceUnitId)
      : null;
    const enemyDisplayName = sourceUnit?.name || E.name || enemy?.name || '몬스터';

    const currentNextTurnEffects = battleRef.current?.nextTurnEffects || battle.nextTurnEffects || {};

    const battleContext = {
      currentSp: a.sp || 0,
      currentTurn: turnNumber,
      queue: currentBattle.queue,
      currentQIndex: currentBattle.qIndex,
      remainingEnergy: calculatedRemainingEnergy,
      enemyRemainingEnergy: calculatedEnemyRemainingEnergy,
      allCards: CARDS,
      usedCardCategories,
      hand: currentBattle.hand || [],
      enemyDisplayName,
      fencingDamageBonus: currentNextTurnEffects.fencingDamageBonus || 0
    };

    // requiredTokens 소모
    if (a.actor === 'player' && a.card.requiredTokens && a.card.requiredTokens.length > 0) {
      for (const req of a.card.requiredTokens) {
        const tokenRemoveResult = removeToken(P, req.id, 'permanent', req.stacks);
        P = { ...P, tokens: tokenRemoveResult.tokens };
        addLog(`✨ ${req.id === 'finesse' ? '기교' : req.id} -${req.stacks} 소모`);
      }
      tempState.player = P;
      if (battleRef.current) {
        battleRef.current = { ...battleRef.current, player: P };
      }
      actions.setPlayer({ ...P });
    }

    // 다중 타격 처리 여부
    const isAttackCard = a.card.type === 'attack';
    const isGunCard = a.card.cardCategory === 'gun';
    const hasMultipleHits = (a.card.hits || 1) > 1;
    const useAsyncMultiHit = isAttackCard && (isGunCard || hasMultipleHits);

    // 유닛 시스템: 타겟 유닛 처리
    let targetUnitIdForAttack = null;
    const currentUnitsForAttack = E.units || enemy?.units || [];
    const hasUnitsForAttack = currentUnitsForAttack.length > 0;

    if (a.actor === 'player' && isAttackCard && hasUnitsForAttack) {
      const cardTargetUnitId = a.card.__targetUnitId ?? battle.selectedTargetUnit ?? 0;
      const aliveUnitsForAttack = currentUnitsForAttack.filter(u => u.hp > 0);
      let targetUnit = aliveUnitsForAttack.find(u => u.unitId === cardTargetUnitId);
      if (!targetUnit && aliveUnitsForAttack.length > 0) {
        targetUnit = aliveUnitsForAttack[0];
      }
      if (targetUnit) {
        targetUnitIdForAttack = targetUnit.unitId;
        E.block = targetUnit.block || 0;
        E.def = E.block > 0;
        tempState.enemy = E;
      }
    }

    // 적 방어 시 소스 유닛 처리
    if (a.actor === 'enemy' && (a.card.type === 'defense' || a.card.type === 'general') && hasUnitsForAttack) {
      const cardSourceUnitId = a.card.__sourceUnitId;
      if (cardSourceUnitId !== undefined && cardSourceUnitId !== null) {
        const sourceUnitForDefense = currentUnitsForAttack.find(u => u.unitId === cardSourceUnitId);
        if (sourceUnitForDefense) {
          E.block = sourceUnitForDefense.block || 0;
          E.def = E.block > 0;
          tempState.enemy = E;
        }
      }
    }

    let actionResult;
    let actionEvents;

    if (useAsyncMultiHit) {
      // 비동기 다중 타격 실행
      const attacker = a.actor === 'player' ? P : E;
      const defender = a.actor === 'player' ? E : P;

      const onHitCallback = async (hitResult, hitIndex, totalHits) => {
        if (hitResult.damage > 0) {
          playHitSound();
          if (a.actor === 'player') {
            actions.setEnemyHit(true);
            setTimeout(() => actions.setEnemyHit(false), 150);
          } else {
            actions.setPlayerHit(true);
            setTimeout(() => actions.setPlayerHit(false), 150);
          }
        }
      };

      const multiHitResult = await executeMultiHitAsync(a.card, attacker, defender, a.actor, battleContext, onHitCallback);

      if (a.actor === 'player') {
        P = multiHitResult.attacker;
        E = multiHitResult.defender;
      } else {
        E = multiHitResult.attacker;
        P = multiHitResult.defender;
      }

      const cardPlayAttacker = a.actor === 'player' ? P : E;
      const cardPlayResult = processCardPlaySpecials({
        card: a.card,
        attacker: cardPlayAttacker,
        attackerName: a.actor,
        battleContext
      });

      // 토큰 처리
      if (cardPlayResult.tokensToAdd?.length > 0) {
        cardPlayResult.tokensToAdd.forEach(tokenInfo => {
          const isPlayerAction = a.actor === 'player';
          const targetIsEnemy = tokenInfo.targetEnemy === true;
          const applyToEnemy = isPlayerAction ? targetIsEnemy : !targetIsEnemy;

          if (applyToEnemy) {
            const tokenResult = addToken(E, tokenInfo.id, tokenInfo.stacks, tokenInfo.grantedAt);
            E = { ...E, tokens: tokenResult.tokens };
          } else {
            const tokenResult = addToken(P, tokenInfo.id, tokenInfo.stacks, tokenInfo.grantedAt);
            P = { ...P, tokens: tokenResult.tokens };
          }
        });
      }
      if (cardPlayResult.tokensToRemove?.length > 0) {
        cardPlayResult.tokensToRemove.forEach(tokenInfo => {
          if (a.actor === 'player') {
            const tokenResult = removeToken(P, tokenInfo.id, 'permanent', tokenInfo.stacks);
            P = { ...P, tokens: tokenResult.tokens };
          } else {
            const tokenResult = removeToken(E, tokenInfo.id, 'permanent', tokenInfo.stacks);
            E = { ...E, tokens: tokenResult.tokens };
          }
        });
      }

      actionEvents = [...multiHitResult.events, ...cardPlayResult.events];
      actionResult = {
        dealt: multiHitResult.dealt,
        taken: multiHitResult.taken,
        events: actionEvents,
        isCritical: multiHitResult.isCritical,
        criticalHits: multiHitResult.criticalHits,
        createdCards: multiHitResult.createdCards,
        updatedState: { player: P, enemy: E, log: [] },
        cardPlaySpecials: cardPlayResult
      };

      if (battleRef.current) {
        battleRef.current = { ...battleRef.current, player: P, enemy: E };
      }
    } else {
      // 동기 처리 (방어 카드 또는 단일 타격)
      actionResult = applyAction(tempState, a.actor, a.card, battleContext);
      const { events, updatedState } = actionResult;
      actionEvents = events;

      if (updatedState) {
        P = updatedState.player;
        E = updatedState.enemy;
        if (battleRef.current) {
          battleRef.current = { ...battleRef.current, player: P, enemy: E };
        }
      }
    }

    // 유닛 블록 업데이트
    if (a.actor === 'player' && isAttackCard && hasUnitsForAttack && targetUnitIdForAttack !== null) {
      const remainingBlock = E.block || 0;
      const unitsAfterAttack = E.units || currentUnitsForAttack;
      const updatedUnitsAfterAttack = unitsAfterAttack.map(u => {
        if (u.unitId === targetUnitIdForAttack) {
          return { ...u, block: remainingBlock };
        }
        return u;
      });
      E.units = updatedUnitsAfterAttack;
      E.block = 0;
      E.def = false;
      if (battleRef.current) {
        battleRef.current = { ...battleRef.current, enemy: E };
      }
    }

    // 적 방어 카드: 개별 유닛에 방어력 적용
    if (a.actor === 'enemy' && (a.card.type === 'defense' || a.card.type === 'general') && E.block > 0) {
      const currentUnits = E.units || enemy?.units || [];
      const sourceUnitId = a.card.__sourceUnitId;
      if (currentUnits.length > 0 && sourceUnitId !== undefined && sourceUnitId !== null) {
        const totalBlock = E.block;
        const updatedUnits = currentUnits.map(u => {
          if (u.unitId === sourceUnitId) {
            return { ...u, block: totalBlock, def: true };
          }
          return u;
        });
        E.units = updatedUnits;
        E.block = 0;
        E.def = false;
        if (battleRef.current) {
          battleRef.current = { ...battleRef.current, enemy: E };
        }
      }
    }

    // 치명타 시 기교 토큰 부여
    if (actionResult.isCritical && a.actor === 'player') {
      const critCount = actionResult.criticalHits || 1;
      const finesseResult = addToken(P, 'finesse', critCount);
      P.tokens = finesseResult.tokens;
      addLog(`✨ 치명타! 기교 +${critCount} 획득`);
      if (battleRef.current) {
        battleRef.current = { ...battleRef.current, player: P };
      }
      actions.setPlayer({ ...P });
    }

    // 바이올랑 모르: 처형 효과
    if (hasSpecial(a.card, 'violentMort') && a.actor === 'player' && a.card.type === 'attack') {
      const EXECUTION_THRESHOLD = 30;
      if (E.hp > 0 && E.hp <= EXECUTION_THRESHOLD) {
        const reviveToken = getAllTokens(E).find(t => t.effect?.type === 'REVIVE');
        if (reviveToken) {
          const reviveRemoveResult = removeToken(E, reviveToken.id, 'usage', reviveToken.stacks || 1);
          E = { ...E, tokens: reviveRemoveResult.tokens };
          addLog(`💀 처형: 부활 무시!`);
        }
        E.hp = 0;
        E.executed = true;
        addLog(`💀 바이올랑 모르: 적 체력 ${EXECUTION_THRESHOLD} 이하! 처형!`);
        if (battleRef.current) {
          battleRef.current = { ...battleRef.current, enemy: E };
        }
        actions.setEnemy({ ...E });
      }
    }

    // 이벤트 로그 출력
    actionEvents.forEach(ev => {
      if (ev.msg) addLog(ev.msg);
    });

    // 화상(BURN) 피해 처리
    if (a.actor === 'player') {
      const playerBurnTokens = getAllTokens(P).filter(t => t.effect?.type === 'BURN');
      if (playerBurnTokens.length > 0) {
        const burnDamage = playerBurnTokens.reduce((sum, t) => sum + (t.effect?.value || 3) * (t.stacks || 1), 0);
        P.hp = Math.max(0, P.hp - burnDamage);
        addLog(`🔥 화상: 플레이어 -${burnDamage} HP`);
        if (battleRef.current) {
          battleRef.current = { ...battleRef.current, player: P };
        }
      }
    } else if (a.actor === 'enemy') {
      const enemyBurnTokens = getAllTokens(E).filter(t => t.effect?.type === 'BURN');
      if (enemyBurnTokens.length > 0) {
        const burnDamage = enemyBurnTokens.reduce((sum, t) => sum + (t.effect?.value || 3) * (t.stacks || 1), 0);
        E.hp = Math.max(0, E.hp - burnDamage);
        addLog(`🔥 화상: 적 -${burnDamage} HP`);
        if (battleRef.current) {
          battleRef.current = { ...battleRef.current, enemy: E };
        }
      }
    }

    // 카드 창조 효과
    if (actionResult.createdCards && actionResult.createdCards.length > 0 && a.actor === 'player') {
      const chainCount = actionResult.createdCards[0]?.flecheChainCount || 0;
      const sourceName = a.card.isFromFleche ? `플레쉬 연쇄 ${chainCount}` : a.card.name;
      const isLastChain = chainCount >= 2;
      addLog(`✨ "${sourceName}" 발동!${isLastChain ? ' (마지막 연쇄)' : ''} 카드를 선택하세요.`);

      const breachState = {
        cards: actionResult.createdCards,
        breachSp: a.sp,
        breachCard: { ...a.card, breachSpOffset: 1 },
        sourceCardName: sourceName,
        isLastChain
      };
      breachSelectionRef.current = breachState;
      setBreachSelection(breachState);
      isExecutingCardRef.current = false;
      return;
    }

    // cardPlaySpecials 결과 처리
    if (actionResult.cardPlaySpecials && a.actor === 'player') {
      const { bonusCards, nextTurnEffects: newNextTurnEffects } = actionResult.cardPlaySpecials;

      if (bonusCards && bonusCards.length > 0) {
        const insertSp = (a.sp || 0) + 1;
        const currentQ = battleRef.current.queue;
        const currentQIndex = battleRef.current.qIndex;

        const newActions = bonusCards.map(bonusCard => ({
          actor: 'player',
          card: {
            ...bonusCard,
            damage: bonusCard.damage,
            block: bonusCard.block,
            hits: bonusCard.hits,
            speedCost: bonusCard.speedCost,
            actionCost: bonusCard.actionCost,
            type: bonusCard.type,
            cardCategory: bonusCard.cardCategory,
            special: bonusCard.special,
            traits: bonusCard.traits,
            isGhost: true,
            __uid: `combo_${Math.random().toString(36).slice(2)}`
          },
          sp: insertSp
        }));

        const beforeCurrent = currentQ.slice(0, currentQIndex + 1);
        const afterCurrent = [...currentQ.slice(currentQIndex + 1), ...newActions];
        afterCurrent.sort((x, y) => {
          if ((x.sp ?? 0) !== (y.sp ?? 0)) return (x.sp ?? 0) - (y.sp ?? 0);
          if (x.card?.isGhost && !y.card?.isGhost) return -1;
          if (!x.card?.isGhost && y.card?.isGhost) return 1;
          return 0;
        });

        const newQueue = [...beforeCurrent, ...afterCurrent];
        actions.setQueue(newQueue);
        battleRef.current = { ...battleRef.current, queue: newQueue };
        addLog(`🔄 연계 효과: "${bonusCards.map(c => c.name).join(', ')}" 큐에 추가!`);
      }

      if (newNextTurnEffects) {
        const currentEffects = battleRef.current?.nextTurnEffects || battle.nextTurnEffects;
        const updatedEffects = {
          ...currentEffects,
          bonusEnergy: (currentEffects.bonusEnergy || 0) + (newNextTurnEffects.bonusEnergy || 0),
          maxSpeedBonus: (currentEffects.maxSpeedBonus || 0) + (newNextTurnEffects.maxSpeedBonus || 0),
          extraCardPlay: (currentEffects.extraCardPlay || 0) + (newNextTurnEffects.extraCardPlay || 0),
          fencingDamageBonus: (currentEffects.fencingDamageBonus || 0) + (newNextTurnEffects.fencingDamageBonus || 0)
        };

        // 비상대응
        if (newNextTurnEffects.emergencyDraw && newNextTurnEffects.emergencyDraw > 0) {
          const currentDeck = battleRef.current?.deck || battle.deck || [];
          const currentDiscard = battleRef.current?.discardPile || battle.discardPile || [];

          if (currentDeck.length > 0 || currentDiscard.length > 0) {
            const drawResult = drawFromDeck(currentDeck, currentDiscard, newNextTurnEffects.emergencyDraw, escapeBanRef.current);
            const currentHand = battleRef.current?.hand || battle.hand || [];
            const newHand = [...currentHand, ...drawResult.drawnCards];

            actions.setDeck(drawResult.newDeck);
            actions.setDiscardPile(drawResult.newDiscardPile);
            actions.setHand(newHand);

            if (battleRef.current) {
              battleRef.current = { ...battleRef.current, hand: newHand, deck: drawResult.newDeck, discardPile: drawResult.newDiscardPile };
            }

            if (drawResult.reshuffled) {
              addLog('🔄 덱이 소진되어 무덤을 섞어 새 덱을 만들었습니다.');
            }
            addLog(`🚨 비상대응: ${drawResult.drawnCards.map(c => c.name).join(', ')} 즉시 손패에 추가!`);
          }
        }

        // 함성 (recallCard)
        if (newNextTurnEffects.recallCard) {
          const currentBuild = useGameStore.getState().characterBuild;
          if (currentBuild) {
            const { mainSpecials = [], subSpecials = [], ownedCards = [] } = currentBuild;
            const usedCardIds = new Set([...mainSpecials, ...subSpecials]);
            const waitingCardIds = ownedCards.filter(id => !usedCardIds.has(id));
            const waitingCards = waitingCardIds
              .map(id => CARDS.find(c => c.id === id))
              .filter(Boolean);

            if (waitingCards.length > 0) {
              actions.setRecallSelection?.({ availableCards: waitingCards });
              addLog(`📢 함성: 대기 카드 중 1장을 선택하세요!`);
            }
          }
        }

        // 엘 라피드 (addCardToHand)
        if (newNextTurnEffects.addCardToHand) {
          const cardId = newNextTurnEffects.addCardToHand;
          const cardToAdd = CARDS.find(c => c.id === cardId);
          if (cardToAdd) {
            const currentHand = battleRef.current?.hand || battle.hand || [];
            const newCard = { ...cardToAdd, _instanceId: `${cardId}_copy_${Date.now()}` };
            const newHand = [...currentHand, newCard];
            actions.setHand(newHand);
            if (battleRef.current) {
              battleRef.current = { ...battleRef.current, hand: newHand };
            }
            addLog(`📋 ${cardToAdd.name} 복사본이 손패에 추가되었습니다!`);
          }
        }

        actions.setNextTurnEffects(updatedEffects);
        if (battleRef.current) {
          battleRef.current = { ...battleRef.current, nextTurnEffects: updatedEffects };
        }
      }
    }

    // 방어자세 성장 방어력
    if (growingDefenseRef.current) {
      const cardSp = a.sp || 0;
      const { activatedSp, totalDefenseApplied = 0 } = growingDefenseRef.current;
      const totalDefenseNeeded = Math.max(0, cardSp - activatedSp);
      const defenseDelta = totalDefenseNeeded - totalDefenseApplied;
      if (defenseDelta > 0) {
        const prevBlock = P.block || 0;
        P.block = prevBlock + defenseDelta;
        P.def = true;
        addLog(`🛡️ 방어자세: +${defenseDelta} 방어력 (총 ${totalDefenseNeeded})`);
        growingDefenseRef.current.totalDefenseApplied = totalDefenseNeeded;
      }
    }

    // 플레이어 카드 사용 시 처리
    if (a.actor === 'player' && a.card.id) {
      actions.setCardUsageCount({
        ...cardUsageCount,
        [a.card.id]: (cardUsageCount[a.card.id] || 0) + 1
      });

      // 방어자세 발동
      if (hasSpecial(a.card, 'growingDefense')) {
        const cardSp = a.sp || 0;
        growingDefenseRef.current = { activatedSp: cardSp, totalDefenseApplied: 0 };
        addLog(`🛡️ 방어자세 발동! (타임라인 ${cardSp}에서 활성화)`);
      }

      // 즉시 발동 특성 처리
      const updatedNextTurnEffects = processImmediateCardTraits({
        card: a.card,
        playerState: P,
        nextTurnEffects,
        addLog,
        addVanishedCard: actions.addVanishedCard
      });
      if (updatedNextTurnEffects !== nextTurnEffects) {
        actions.setNextTurnEffects(updatedNextTurnEffects);
      }

      // 상징: 카드 사용 시 효과
      processCardPlayedRelicEffects({
        relics,
        card: a.card,
        playerState: P,
        enemyState: E,
        safeInitialPlayer: player,
        addLog,
        setRelicActivated: actions.setRelicActivated
      });

      // onPlay 효과 처리
      if (a.card.onPlay && typeof a.card.onPlay === 'function') {
        try {
          const isCritical = actionResult.isCritical;
          const currentPlayerForToken = { ...P };
          const grantedAt = battleContext.currentTurn ? { turn: battleContext.currentTurn, sp: battleContext.currentSp || 0 } : null;
          const tokenActions = {
            ...actions,
            addTokenToPlayer: (tokenId, stacks = 1) => {
              const actualStacks = isCritical ? stacks + 1 : stacks;
              if (isCritical) addLog(`💥 치명타! ${tokenId} +1 강화`);
              const result = addToken(currentPlayerForToken, tokenId, actualStacks, grantedAt);
              P.tokens = result.tokens;
              currentPlayerForToken.tokens = result.tokens;
              if (battleRef.current) {
                battleRef.current = { ...battleRef.current, player: { ...P } };
              }
              actions.setPlayer({ ...P });
              result.logs.forEach(log => addLog(log));
              return result;
            },
            removeTokenFromPlayer: (tokenId, tokenType, stacks = 1) => {
              const result = removeToken(currentPlayerForToken, tokenId, tokenType, stacks);
              P.tokens = result.tokens;
              currentPlayerForToken.tokens = result.tokens;
              if (battleRef.current) {
                battleRef.current = { ...battleRef.current, player: { ...P } };
              }
              actions.setPlayer({ ...P });
              result.logs.forEach(log => addLog(log));
              return result;
            },
            addTokenToEnemy: (tokenId, stacks = 1) => {
              const actualStacks = isCritical ? stacks + 1 : stacks;
              if (isCritical) addLog(`💥 치명타! ${tokenId} +1 강화`);

              const currentUnits = E.units || enemy?.units || [];
              if (currentUnits.length > 0 && targetUnitIdForAttack !== null) {
                const updatedUnits = currentUnits.map(u => {
                  if (u.unitId === targetUnitIdForAttack) {
                    const unitResult = addToken(u, tokenId, actualStacks, grantedAt);
                    return { ...u, tokens: unitResult.tokens };
                  }
                  return u;
                });
                E.units = updatedUnits;
                if (battleRef.current) {
                  battleRef.current = { ...battleRef.current, enemy: { ...E } };
                }
                actions.setEnemy({ ...E });
                actions.setEnemyUnits(updatedUnits);
                const targetUnit = currentUnits.find(u => u.unitId === targetUnitIdForAttack);
                const targetName = targetUnit?.name || '적';
                const tokenName = TOKENS[tokenId]?.name || tokenId;
                addLog(`🎯 ${targetName}에게 ${tokenName} 부여`);
                return { tokens: updatedUnits.find(u => u.unitId === targetUnitIdForAttack)?.tokens || {}, logs: [] };
              }

              const result = addToken(E, tokenId, actualStacks, grantedAt);
              E.tokens = result.tokens;
              if (battleRef.current) {
                battleRef.current = { ...battleRef.current, enemy: { ...E } };
              }
              actions.setEnemy({ ...E });
              result.logs.forEach(log => addLog(log));
              return result;
            },
            resetTokenForPlayer: (tokenId, tokenType, newStacks = 0) => {
              const result = setTokenStacks(currentPlayerForToken, tokenId, tokenType, newStacks);
              P.tokens = result.tokens;
              currentPlayerForToken.tokens = result.tokens;
              if (battleRef.current) {
                battleRef.current = { ...battleRef.current, player: { ...P } };
              }
              actions.setPlayer({ ...P });
              result.logs.forEach(log => addLog(log));
              return result;
            }
          };
          a.card.onPlay(battle, tokenActions);
        } catch (error) {
          console.error('[Token onPlay Error]', error);
        }
      }
    }

    // 스턴 처리
    if (hasTrait(a.card, 'stun')) {
      const { updatedQueue, stunEvent } = processStunEffect({
        action: a,
        queue: currentBattle.queue,
        currentQIndex: currentBattle.qIndex,
        addLog
      });
      if (updatedQueue !== currentBattle.queue) {
        actions.setQueue(updatedQueue);
      }
      if (stunEvent) {
        actionEvents = [...actionEvents, stunEvent];
      }
    }

    // 타임라인 조작 효과
    const timelineResult = processTimelineSpecials({
      card: a.card,
      actor: a.actor,
      actorName: a.actor,
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
      const qIdx = battleRef.current.qIndex;

      if (timelineChanges.advancePlayer > 0) {
        updatedQueue = updatedQueue.map((item, idx) => {
          if (idx > qIdx && item.actor === 'player') {
            return { ...item, sp: Math.max(0, item.sp - timelineChanges.advancePlayer) };
          }
          return item;
        });
      }

      if (timelineChanges.pushEnemy > 0) {
        updatedQueue = updatedQueue.map((item, idx) => {
          if (idx > qIdx && item.actor === 'enemy') {
            return { ...item, sp: item.sp + timelineChanges.pushEnemy };
          }
          return item;
        });
      }

      if (timelineChanges.pushLastEnemy > 0) {
        let lastEnemyIdx = -1;
        for (let i = updatedQueue.length - 1; i > qIdx; i--) {
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

      const processedCards = updatedQueue.slice(0, qIdx + 1);
      const remainingCards = updatedQueue.slice(qIdx + 1);
      remainingCards.sort((x, y) => x.sp - y.sp);
      updatedQueue = [...processedCards, ...remainingCards];
      actions.setQueue(updatedQueue);
    }

    // 쳐내기 패리 대기 상태 추가
    if (a.card.special === 'parryPush' && a.actor === 'player') {
      const parryState = setupParryReady({ action: a, addLog });
      parryReadyStatesRef.current = [...parryReadyStatesRef.current, parryState];
      setParryReadyStates([...parryReadyStatesRef.current]);
    }

    // 브리치 효과
    if (a.card.special === 'breach' && a.actor === 'player') {
      const cardPool = CARDS.filter(c =>
        (c.type === 'attack' || c.type === 'general' || c.type === 'special') &&
        c.id !== 'breach' &&
        (!c.requiredTokens || c.requiredTokens.length === 0)
      );
      const shuffled = [...cardPool].sort(() => Math.random() - 0.5);
      const breachCards = [];
      const usedIds = new Set();
      for (const card of shuffled) {
        if (!usedIds.has(card.id) && breachCards.length < 3) {
          breachCards.push(card);
          usedIds.add(card.id);
        }
      }

      addLog(`👻 "${a.card.name}" 발동! 카드를 선택하세요.`);

      processPlayerEtherAccumulation({
        card: a.card,
        turnEtherAccumulated,
        orderedRelicList,
        cardUpgrades,
        resolvedPlayerCards,
        playerTimeline,
        relics,
        triggeredRefs: {
          referenceBookTriggered: referenceBookTriggeredRef,
          devilDiceTriggered: devilDiceTriggeredRef
        },
        calculatePassiveEffects,
        getCardEtherGain,
        collectTriggeredRelics,
        playRelicActivationSequence,
        flashRelic,
        actions
      });

      const breachState = { cards: breachCards, breachSp: a.sp, breachCard: a.card };
      breachSelectionRef.current = breachState;
      setBreachSelection(breachState);
      isExecutingCardRef.current = false;
      return;
    }

    // 벙 데 라므 (createFencingCards3)
    if (hasSpecial(a.card, 'createFencingCards3') && a.actor === 'player') {
      const fencingAttackCards = CARDS.filter(c =>
        c.cardCategory === 'fencing' &&
        c.type === 'attack' &&
        c.id !== a.card.id &&
        (!c.requiredTokens || c.requiredTokens.length === 0)
      );

      if (fencingAttackCards.length >= 3) {
        const allShuffled = [...fencingAttackCards].sort(() => Math.random() - 0.5);
        const usedIds = new Set();
        creationQueueRef.current = [];

        for (let selectionIdx = 0; selectionIdx < 3; selectionIdx++) {
          const availableCards = allShuffled.filter(c => !usedIds.has(c.id));
          const selectionCards = availableCards.slice(0, 3);
          selectionCards.forEach(c => usedIds.add(c.id));

          creationQueueRef.current.push({
            cards: selectionCards,
            insertSp: a.sp + 1,
            breachCard: { ...a.card, breachSpOffset: 1 },
            isAoe: true
          });
        }

        addLog(`👻 "${a.card.name}" 발동! 검격 카드 창조 1/3: 카드를 선택하세요.`);

        processPlayerEtherAccumulation({
          card: a.card,
          turnEtherAccumulated,
          orderedRelicList,
          cardUpgrades,
          resolvedPlayerCards,
          playerTimeline,
          relics,
          triggeredRefs: {
            referenceBookTriggered: referenceBookTriggeredRef,
            devilDiceTriggered: devilDiceTriggeredRef
          },
          calculatePassiveEffects,
          getCardEtherGain,
          collectTriggeredRelics,
          playRelicActivationSequence,
          flashRelic,
          actions
        });

        const firstSelection = creationQueueRef.current.shift();
        const creationState = {
          cards: firstSelection.cards,
          breachSp: firstSelection.insertSp,
          breachCard: firstSelection.breachCard,
          isCreationSelection: true,
          isAoe: firstSelection.isAoe
        };
        breachSelectionRef.current = creationState;
        setBreachSelection(creationState);
        isExecutingCardRef.current = false;
        return;
      }
    }

    // 적 카드 발동 시 패리 트리거 체크
    const hasActiveParry = parryReadyStatesRef.current.some(s => s?.active && !s.triggered);
    if (a.actor === 'enemy' && hasActiveParry) {
      const currentQ = battleRef.current.queue;
      const { updatedQueue, parryEvents, updatedParryStates, outCards } = checkParryTrigger({
        parryReadyStates: parryReadyStatesRef.current,
        enemyAction: a,
        queue: currentQ,
        currentQIndex: currentBattle.qIndex,
        enemyMaxSpeed: enemy.maxSpeed,
        addLog,
        playParrySound
      });
      parryReadyStatesRef.current = updatedParryStates;
      setParryReadyStates(updatedParryStates);
      if (updatedQueue !== currentQ) {
        actions.setQueue(updatedQueue);
      }
      if (parryEvents && parryEvents.length > 0) {
        actionEvents = [...actionEvents, ...parryEvents];
      }
      if (outCards && outCards.length > 0) {
        outCards.forEach(outCard => {
          actionEvents.push({
            actor: 'player',
            type: 'out',
            card: outCard.card?.name,
            msg: `🚫 "${outCard.card?.name}" 아웃!`
          });
        });
      }
    }

    // 에테르 누적
    if (a.actor === 'player' && !a.card.isGhost) {
      processPlayerEtherAccumulation({
        card: a.card,
        turnEtherAccumulated,
        orderedRelicList,
        cardUpgrades,
        resolvedPlayerCards,
        playerTimeline,
        relics,
        triggeredRefs: {
          referenceBookTriggered: referenceBookTriggeredRef,
          devilDiceTriggered: devilDiceTriggeredRef
        },
        calculatePassiveEffects,
        getCardEtherGain,
        collectTriggeredRelics,
        playRelicActivationSequence,
        flashRelic,
        actions
      });
    } else if (a.actor === 'enemy') {
      processEnemyEtherAccumulation({
        card: a.card,
        enemyTurnEtherAccumulated,
        getCardEtherGain,
        actions
      });
    }

    actions.setPlayer({ ...player, hp: P.hp, def: P.def, block: P.block, counter: P.counter, vulnMult: P.vulnMult || 1, strength: P.strength || 0, tokens: P.tokens });

    // 다중 유닛 데미지 분배
    const enemyUnits = E.units || enemy.units || [];
    const hasUnits = enemyUnits.length > 1;

    if (hasUnits && a.actor === 'player' && a.card?.type === 'attack') {
      const targetUnitIds = a.card.__targetUnitIds;
      const isAoeAttack = hasSpecial(a.card, 'aoeAttack') || a.card.isAoe === true;

      if (isAoeAttack) {
        let updatedUnits = [...enemyUnits];
        const damageDealt = actionResult.dealt || 0;
        const damageLogParts = [];

        if (damageDealt > 0) {
          const aliveUnits = updatedUnits.filter(u => u.hp > 0);
          for (const targetUnit of aliveUnits) {
            const unitBlock = targetUnit.block || 0;
            const blockedDamage = Math.min(unitBlock, damageDealt);
            const actualDamage = damageDealt - blockedDamage;
            const newBlock = unitBlock - blockedDamage;
            const newHp = Math.max(0, targetUnit.hp - actualDamage);

            updatedUnits = updatedUnits.map(u => {
              if (u.unitId === targetUnit.unitId) {
                return { ...u, hp: newHp, block: newBlock };
              }
              return u;
            });

            if (blockedDamage > 0) {
              damageLogParts.push(`${targetUnit.name}: ${actualDamage} (방어 ${blockedDamage})`);
            } else {
              damageLogParts.push(`${targetUnit.name}: ${actualDamage}`);
            }
          }

          const newTotalHp = updatedUnits.reduce((sum, u) => sum + Math.max(0, u.hp), 0);
          E.hp = newTotalHp;
          E.units = updatedUnits;

          if (damageLogParts.length > 0) {
            addLog(`🌀 범위 피해: ${damageLogParts.join(', ')}`);
          }
        }
      } else if (targetUnitIds && targetUnitIds.length > 0) {
        let updatedUnits = [...enemyUnits];
        const baseDamage = a.card.damage || 0;
        const damageLogParts = [];

        for (const unitId of targetUnitIds) {
          const targetUnit = updatedUnits.find(u => u.unitId === unitId && u.hp > 0);
          if (!targetUnit) continue;

          const unitBlock = targetUnit.block || 0;
          const blockedDamage = Math.min(unitBlock, baseDamage);
          const actualDamage = baseDamage - blockedDamage;
          const newBlock = unitBlock - blockedDamage;
          const newHp = Math.max(0, targetUnit.hp - actualDamage);

          updatedUnits = updatedUnits.map(u => {
            if (u.unitId === unitId) {
              return { ...u, hp: newHp, block: newBlock };
            }
            return u;
          });

          if (blockedDamage > 0) {
            damageLogParts.push(`${targetUnit.name}: 공격력 ${baseDamage} - 방어력 ${blockedDamage} = ${actualDamage}`);
          } else {
            damageLogParts.push(`${targetUnit.name}: ${actualDamage}`);
          }
        }

        const newTotalHp = updatedUnits.reduce((sum, u) => sum + Math.max(0, u.hp), 0);
        E.hp = newTotalHp;
        E.units = updatedUnits;

        if (damageLogParts.length > 0) {
          addLog(`⚔️ 다중 타겟: ${damageLogParts.join(', ')}`);
        }
      } else {
        const damageDealt = actionResult.dealt || 0;

        if (damageDealt > 0) {
          const cardTargetUnitId = a.card.__targetUnitId ?? battle.selectedTargetUnit ?? 0;
          const aliveUnits = enemyUnits.filter(u => u.hp > 0);
          let targetUnit = aliveUnits.find(u => u.unitId === cardTargetUnitId);
          if (!targetUnit && aliveUnits.length > 0) {
            targetUnit = aliveUnits[0];
          }

          if (targetUnit) {
            const unitHpBefore = targetUnit.hp;
            const newUnitHp = Math.max(0, targetUnit.hp - damageDealt);

            const updatedUnits = enemyUnits.map(u => {
              if (u.unitId === targetUnit.unitId) {
                return { ...u, hp: newUnitHp };
              }
              return u;
            });

            const newTotalHp = updatedUnits.reduce((sum, u) => sum + Math.max(0, u.hp), 0);
            E.hp = newTotalHp;
            E.units = updatedUnits;

            addLog(`🎯 ${targetUnit.name}에게 ${damageDealt} 피해 (${unitHpBefore} → ${newUnitHp})`);
          }
        }
      }
    }

    actions.setEnemy({ ...enemy, hp: E.hp, def: E.def, block: E.block, counter: E.counter, vulnMult: E.vulnMult || 1, tokens: E.tokens, ...(E.units && { units: E.units }) });
    actions.setActionEvents({ ...currentBattle.actionEvents, [currentBattle.qIndex]: actionEvents });

    // 이벤트 처리: 애니메이션 및 사운드
    processActionEventAnimations({
      actionEvents,
      action: a,
      playHitSound,
      playBlockSound,
      actions
    });

    const newQIndex = battleRef.current.qIndex + 1;
    battleRef.current = { ...battleRef.current, qIndex: newQIndex };
    actions.setQIndex(newQIndex);

    if (P.hp <= 0) {
      isExecutingCardRef.current = false;
      actions.setPostCombatOptions({ type: 'defeat' });
      actions.setPhase('post');
      return;
    }
    if (E.hp <= 0) {
      isExecutingCardRef.current = false;
      processEnemyDeath({
        newQIndex,
        queue: battle.queue,
        queueLength: battle.queue.length,
        turnEtherAccumulated,
        playSound,
        actions
      });
      return;
    }

    isExecutingCardRef.current = false;
  }, [
    player, enemy, battle, turnNumber, turnEtherAccumulated, enemyTurnEtherAccumulated,
    cardUsageCount, nextTurnEffects, orderedRelicList, relics, cardUpgrades,
    resolvedPlayerCards, playerTimeline, CARDS, battleRef, breachSelectionRef,
    setBreachSelection, creationQueueRef, isExecutingCardRef, parryReadyStatesRef,
    setParryReadyStates, growingDefenseRef, escapeBanRef, referenceBookTriggeredRef,
    devilDiceTriggeredRef, addLog, playSound, flashRelic, actions
  ]);

  // stepOnce를 ref에 저장
  if (stepOnceRef) {
    stepOnceRef.current = stepOnce;
  }

  return { stepOnce, executeCardAction };
}
