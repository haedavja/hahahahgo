/**
 * @file useResolveExecution.js
 * @description 진행(resolve) 단계 실행 훅
 * @typedef {import('../../../types').Card} Card
 *
 * ## 제공 기능
 * - finishTurn: 턴 종료 처리
 * - runAll: 전체 큐 실행
 * - stepOnce: 단일 액션 실행
 */

import { useCallback } from 'react';
import type { MutableRefObject, Dispatch, SetStateAction } from 'react';
import { detectPokerCombo } from '../utils/comboDetection';
import { clearTurnTokens, getTokenStacks, removeToken, setTokenStacks } from '../../../lib/tokenUtils';
import { gainGrace, createInitialGraceState, type MonsterGraceState, type PrayerType } from '../../../data/monsterEther';
import { processCardTraitEffects } from '../utils/cardTraitEffects';
import { applyTurnEndEffects, calculatePassiveEffects } from '../../../lib/relicEffects';
import { playTurnEndRelicAnimations, applyTurnEndRelicEffectsToNextTurn } from '../utils/turnEndRelicEffectsProcessing';
import { calculateTurnEndEther, formatPlayerEtherLog, formatEnemyEtherLog } from '../utils/turnEndEtherCalculation';
import { startEnemyEtherAnimation } from '../utils/enemyEtherAnimation';
import { processEtherTransfer } from '../utils/etherTransferProcessing';
import { updateComboUsageCount, createTurnEndPlayerState, createTurnEndEnemyState } from '../utils/turnEndStateUpdate';
import { processVictoryDefeatTransition } from '../utils/victoryDefeatTransition';
import { startEtherCalculationAnimationSequence } from '../utils/etherCalculationAnimation';
import { applyAction } from '../logic/combatActions';
import { getCardEtherGain } from '../utils/etherCalculations';
import { CARDS, BASE_PLAYER_ENERGY } from '../battleData';
import { RELICS } from '../../../data/relics';
import type {
  CombatBattleContext,
  Card,
  ParryReadyState,
  EnemyPlan,
  BattleEvent,
  VictoryCheckResult,
  PlayerBattleState,
  EnemyUnit,
  OrderItem,
  TokenInstance,
  TraitEffectCard,
  VictoryEnemy,
  EtherCard,
  EtherAnimCard
} from '../../../types';
import type { BattleRefValue } from '../../../types/hooks';
import type { FullBattleState } from '../reducer/battleReducerState';
import type { PlayerState, EnemyState } from '../reducer/battleReducerActions';
import type { BattleActions } from './useBattleState';
import type { HandCard } from '../../../lib/speedQueue';

/**
 * useResolveExecution 파라미터 인터페이스
 */
interface UseResolveExecutionParams {
  battle: FullBattleState;
  player: PlayerState;
  enemy: EnemyState;
  selected: Card[];
  queue: OrderItem[];
  qIndex: number;
  turnNumber: number;
  turnEtherAccumulated: number;
  enemyTurnEtherAccumulated: number;
  finalComboMultiplier: number;
  enemyPlan: EnemyPlan;
  relics: string[];
  orderedRelicList: string[];
  battleRef: MutableRefObject<BattleRefValue | null>;
  parryReadyStatesRef: MutableRefObject<ParryReadyState[]>;
  setParryReadyStates: Dispatch<SetStateAction<ParryReadyState[]>>;
  growingDefenseRef: MutableRefObject<number | null>;
  escapeBanRef: MutableRefObject<Set<string>>;
  escapeUsedThisTurnRef: MutableRefObject<Set<string>>;
  calculateEtherTransfer: (playerAppliedEther: number, enemyAppliedEther: number, curPlayerPts: number, curEnemyPts: number, enemyHp: number) => { nextPlayerPts: number; nextEnemyPts: number; movedPts: number };
  checkVictoryCondition: (enemy: VictoryEnemy, pts: number) => VictoryCheckResult;
  showCardRewardModal: () => void;
  startEtherCalculationAnimation: () => void;
  addLog: (message: string) => void;
  playSound: (frequency?: number, duration?: number) => void;
  actions: BattleActions;
}

/**
 * 진행(resolve) 단계 실행 훅
 * @returns {{finishTurn: Function, runAll: Function, stepOnce: Function}}
 */
export function useResolveExecution({
  battle,
  player,
  enemy,
  selected,
  queue,
  qIndex,
  turnNumber,
  turnEtherAccumulated,
  enemyTurnEtherAccumulated,
  finalComboMultiplier,
  enemyPlan,
  relics,
  orderedRelicList,
  battleRef,
  parryReadyStatesRef,
  setParryReadyStates,
  growingDefenseRef,
  escapeBanRef,
  escapeUsedThisTurnRef,
  calculateEtherTransfer,
  checkVictoryCondition,
  showCardRewardModal,
  startEtherCalculationAnimation,
  addLog,
  playSound,
  actions
}: UseResolveExecutionParams) {
  // 턴 종료 처리
  const finishTurn = useCallback((reason: string) => {
    addLog(`턴 종료: ${reason || ''}`);

    // 턴소모 토큰 제거 - battleRef에서 최신 상태 사용 (stale closure 방지)
    const currentBattle = battleRef.current || {};
    let latestPlayer = currentBattle.player || battle.player;
    let latestEnemy = currentBattle.enemy || battle.enemy;

    // 경계 토큰 확인 (턴 토큰 제거 전에 확인해야 함)
    const playerTurnTokens = latestPlayer.tokens?.turn || [];
    const hasVigilance = playerTurnTokens.some((t: TokenInstance) => t.id === 'vigilance' && (t.stacks || 1) > 0);

    const playerTokenResult = clearTurnTokens(latestPlayer);
    playerTokenResult.logs.forEach(log => addLog(log));
    latestPlayer = { ...latestPlayer, tokens: playerTokenResult.tokens };
    actions.setPlayer(latestPlayer as PlayerBattleState);

    const enemyTokenResult = clearTurnTokens(latestEnemy);
    enemyTokenResult.logs.forEach(log => addLog(log));
    latestEnemy = { ...latestEnemy, tokens: enemyTokenResult.tokens };
    actions.setEnemy(latestEnemy);

    // 다중 턴 토큰 스택 감소 처리 (jam_immunity 등)
    // jam_immunity: 스택이 남은 턴 수를 나타냄, 턴 종료 시 1 감소
    const playerJamImmunityStacks = getTokenStacks(latestPlayer, 'jam_immunity');
    if (playerJamImmunityStacks > 0) {
      if (playerJamImmunityStacks === 1) {
        // 마지막 스택: 토큰 완전 제거
        const removeResult = removeToken(latestPlayer, 'jam_immunity', 'turn', 1);
        latestPlayer = { ...latestPlayer, tokens: removeResult.tokens };
        addLog('♾️ 탄걸림 면역 효과 종료');
      } else {
        // 스택 1 감소
        const newStacks = playerJamImmunityStacks - 1;
        const decrementResult = setTokenStacks(latestPlayer, 'jam_immunity', 'turn', newStacks);
        latestPlayer = { ...latestPlayer, tokens: decrementResult.tokens };
        addLog(`♾️ 탄걸림 면역 ${newStacks}턴 남음`);
      }
      actions.setPlayer(latestPlayer as PlayerBattleState);
    }

    // battleRef 동기 업데이트
    if (battleRef.current) {
      battleRef.current = { ...battleRef.current, player: latestPlayer, enemy: latestEnemy };
    }

    // 패리 대기 상태 배열 초기화
    parryReadyStatesRef.current = [];
    setParryReadyStates([]);

    // 방어자세 성장 방어력 초기화
    growingDefenseRef.current = null;

    // 이번 턴 사용한 탈주 카드를 다음 턴 한정으로 차단
    escapeBanRef.current = new Set(escapeUsedThisTurnRef.current);
    escapeUsedThisTurnRef.current = new Set();

    // 다음 턴 효과 처리 (특성 기반)
    const traitNextTurnEffects = processCardTraitEffects(selected as TraitEffectCard[], addLog);

    // 카드 플레이 중 설정된 효과 병합
    const currentNextTurnEffects = battleRef.current?.nextTurnEffects || battle.nextTurnEffects;
    const newNextTurnEffects = {
      ...traitNextTurnEffects,
      ...currentNextTurnEffects,  // 모든 현재 효과 유지 (fencingDamageBonus 등)
      bonusEnergy: (traitNextTurnEffects.bonusEnergy || 0) + (currentNextTurnEffects.bonusEnergy || 0),
      maxSpeedBonus: (traitNextTurnEffects.maxSpeedBonus || 0) + (currentNextTurnEffects.maxSpeedBonus || 0),
      extraCardPlay: (traitNextTurnEffects.extraCardPlay || 0) + (currentNextTurnEffects.extraCardPlay || 0),
      // 턴 종료 시 blockPerCardExecution 초기화 (이번 턴만 유효)
      blockPerCardExecution: 0,
      repeatMyTimeline: false
    };

    // 상징 턴 종료 효과 적용
    const relicIds = relics;
    const turnEndRelicEffects = applyTurnEndEffects(relicIds, {
      cardsPlayedThisTurn: battle.selected.length,
      player,
      enemy,
    });

    // 턴 종료 상징 발동 애니메이션
    playTurnEndRelicAnimations({
      relics: relicIds,
      RELICS,
      cardsPlayedThisTurn: battle.selected.length,
      player,
      enemy,
      playSound,
      actions: {
        setRelicActivated: actions.setRelicActivated,
        setPlayer: actions.setPlayer as (player: import('../../../types').Combatant) => void
      }
    });

    // 턴 종료 상징 효과를 다음 턴 효과에 적용
    const updatedNextTurnEffects = applyTurnEndRelicEffectsToNextTurn({
      turnEndRelicEffects,
      nextTurnEffects: newNextTurnEffects,
      player,
      addLog,
      actions: {
        setRelicActivated: actions.setRelicActivated,
        setPlayer: actions.setPlayer as (player: import('../../../types').Combatant) => void
      }
    });

    actions.setNextTurnEffects(updatedNextTurnEffects);
    // battleRef도 동기 업데이트 (useEffect에서 이전 값으로 덮어쓰지 않도록)
    if (battleRef.current) {
      battleRef.current = { ...battleRef.current, nextTurnEffects: updatedNextTurnEffects };
    }

    // 턴 종료 시 조합 카운트 증가 (Deflation)
    const pComboEnd = detectPokerCombo(selected);
    const eComboEnd = detectPokerCombo(enemyPlan.actions);

    // 에테르 최종 계산
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

    // 플레이어 에테르 획득 처리
    if (playerFinalEther > 0) {
      addLog(formatPlayerEtherLog(playerEther, turnEtherAccumulated));
      actions.setEtherFinalValue(playerFinalEther);
    }

    // 적 에테르 획득 처리
    if (enemyFinalEther > 0) {
      addLog(formatEnemyEtherLog(enemyEther, enemyTurnEtherAccumulated));
      startEnemyEtherAnimation({
        enemyFinalEther,
        enemyEther,
        actions: {
          setEnemyEtherCalcPhase: actions.setEnemyEtherCalcPhase as (phase: import('../../../types').AnimEtherCalcPhase) => void,
          setEnemyCurrentDeflation: actions.setEnemyCurrentDeflation
        }
      });
    }

    actions.setEnemyEtherFinalValue(enemyFinalEther);

    // 에테르 소지량 이동
    const curPlayerPts = player.etherPts || 0;
    const curEnemyPts = enemy.etherPts || 0;

    // 이변: 에테르 획득 불가 체크
    const effectivePlayerAppliedEther = player.etherBan ? 0 : playerAppliedEther;
    if (player.etherBan && playerAppliedEther > 0) {
      addLog('⚠️ [디플레이션의 저주] 에테르 획득이 차단되었습니다!');
    }

    // 현재 은총 상태 가져오기
    const rawGrace = latestEnemy.grace;
    const enemyUnit = enemy as EnemyUnit;
    const currentGrace: MonsterGraceState = (rawGrace && typeof rawGrace === 'object' && 'gracePts' in rawGrace)
      ? rawGrace as MonsterGraceState
      : createInitialGraceState((enemyUnit.availablePrayers as PrayerType[] | undefined) || []);

    const { nextPlayerPts, nextEnemyPts, enemyGraceGain, updatedGraceState } = processEtherTransfer({
      playerAppliedEther: effectivePlayerAppliedEther,
      enemyAppliedEther,
      curPlayerPts,
      curEnemyPts,
      enemyHp: enemy.hp,
      graceState: currentGrace,
      calculateEtherTransfer,
      addLog,
      playSound,
      actions: {
        setNetEtherDelta: actions.setNetEtherDelta,
        setPlayerTransferPulse: actions.setPlayerTransferPulse,
        setEnemyTransferPulse: actions.setEnemyTransferPulse
      }
    });

    // 은총 상태 업데이트 (보호막 소모 + 은총 획득)
    // updatedGraceState가 유효한 MonsterGraceState인지 확인
    const validUpdatedGrace = (updatedGraceState && typeof updatedGraceState === 'object' && 'gracePts' in updatedGraceState)
      ? updatedGraceState as MonsterGraceState
      : null;
    let newGrace: MonsterGraceState = validUpdatedGrace || currentGrace;
    if (enemyGraceGain > 0) {
      newGrace = gainGrace(newGrace, enemyGraceGain);
    }
    if (newGrace !== currentGrace || enemyGraceGain > 0) {
      latestEnemy = { ...latestEnemy, grace: newGrace };
      if (battleRef.current) {
        battleRef.current.enemy = latestEnemy;
      }
    }

    // 조합 사용 카운트 업데이트
    const newUsageCount = updateComboUsageCount(player.comboUsageCount, pComboEnd as Card | null, queue, 'player');
    const newEnemyUsageCount = updateComboUsageCount(enemy.comboUsageCount, eComboEnd as Card | null, [], 'enemy');

    // 턴 종료 상태 업데이트
    let newPlayerState;
    try {
      newPlayerState = createTurnEndPlayerState(latestPlayer as PlayerBattleState, {
        comboUsageCount: newUsageCount,
        etherPts: nextPlayerPts,
        etherOverflow: playerOverflow,
        etherMultiplier: 1,
        hasVigilance  // 경계 토큰으로 방어력 유지 여부
      });
    } catch (err) {
      if (import.meta.env.DEV) console.error('[finishTurn] createTurnEndPlayerState 에러:', err);
      newPlayerState = { ...latestPlayer, etherMultiplier: 1 } as PlayerBattleState;
    }
    actions.setPlayer(newPlayerState as PlayerBattleState);

    if (battleRef.current) {
      battleRef.current.player = newPlayerState;
    }

    const nextPts = Math.max(0, nextEnemyPts);
    const nextEnemyPtsSnapshot = nextPts;
    actions.setEnemy(createTurnEndEnemyState(latestEnemy, {
      comboUsageCount: newEnemyUsageCount,
      etherPts: nextPts
    }));

    // 에테르 누적 카운터 리셋
    actions.setTurnEtherAccumulated(0);
    actions.setEnemyTurnEtherAccumulated(0);

    actions.setSelected([]);
    actions.setQueue([]);
    actions.setQIndex(0);
    actions.setFixedOrder(null);
    actions.setUsedCardIndices([]);
    actions.setDisappearingCards([]);
    actions.setHiddenCards([]);

    // 턴 종료 시 승리/패배 체크
    const transitionResult = processVictoryDefeatTransition({
      enemy: enemy as VictoryEnemy,
      player,
      nextEnemyPtsSnapshot,
      checkVictoryCondition,
      actions: {
        setSoulShatter: actions.setSoulShatter,
        setNetEtherDelta: actions.setNetEtherDelta,
        setPostCombatOptions: actions.setPostCombatOptions,
        setPhase: actions.setPhase,
        setEnemy: actions.setEnemy
      },
      onVictory: showCardRewardModal,
      addLog
    });
    if (transitionResult.shouldReturn) return;

    actions.setTurnNumber(turnNumber + 1);
    actions.setNetEtherDelta(null);
    actions.setEnemyPlan({ actions: [], mode: enemyPlan.mode, manuallyModified: false });
    actions.setPhase('select');
  }, [
    battle, player, enemy, selected, queue, turnNumber,
    turnEtherAccumulated, enemyTurnEtherAccumulated, finalComboMultiplier,
    enemyPlan, relics, orderedRelicList, battleRef,
    parryReadyStatesRef, setParryReadyStates, growingDefenseRef,
    escapeBanRef, escapeUsedThisTurnRef, calculateEtherTransfer,
    checkVictoryCondition, showCardRewardModal, addLog, playSound, actions
  ]);

  // 전부 실행 (한 번에 모든 카드 처리)
  const runAll = useCallback(() => {
    if (battle.qIndex >= battle.queue.length) return;
    playSound(1000, 150);
    const passiveRelicEffects = calculatePassiveEffects(orderedRelicList);
    let P = { ...player, def: player.def || false, block: player.block || 0, counter: player.counter || 0, vulnMult: player.vulnMult || 1, etherPts: player.etherPts || 0 };
    let E = { ...enemy, def: enemy.def || false, block: enemy.block || 0, counter: enemy.counter || 0, vulnMult: enemy.vulnMult || 1, etherPts: enemy.etherPts || 0 };
    const tempState = { player: P, enemy: E, log: [] };
    const newEvents: Record<string, BattleEvent[]> = {};
    let enemyDefeated = false;

    // 진행 단계 최종 남은 행동력 계산
    const allPlayerCards = battle.queue.filter((q: OrderItem) => q.actor === 'player');
    const totalEnergyUsed = allPlayerCards.reduce((sum: number, q: OrderItem) => sum + (q.card?.actionCost || 0), 0);
    const playerEnergyBudget = P.energy || P.maxEnergy || BASE_PLAYER_ENERGY;
    const finalRemainingEnergy = Math.max(0, playerEnergyBudget - totalEnergyUsed);
    const allEnemyCards = battle.queue.filter((q: OrderItem) => q.actor === 'enemy');
    const enemyTotalEnergyUsed = allEnemyCards.reduce((sum: number, q: OrderItem) => sum + (q.card?.actionCost || 0), 0);
    const enemyEnergyBudget = E.energy || E.maxEnergy || BASE_PLAYER_ENERGY;
    const finalEnemyRemainingEnergy = Math.max(0, enemyEnergyBudget - enemyTotalEnergyUsed);

    let localTurnEther = turnEtherAccumulated;
    let localEnemyTurnEther = enemyTurnEtherAccumulated;

    // 최적화: 루프 외부에서 카테고리 Set 초기화 (기존: 매 반복마다 slice+filter+map+Set 생성)
    const usedCategoriesSet = new Set<string>();
    // qIndex 이전에 실행된 플레이어 카드의 카테고리 미리 수집
    for (let j = 0; j < qIndex; j++) {
      const q = battle.queue[j];
      if (q.actor === 'player' && q.card?.cardCategory) {
        usedCategoriesSet.add(q.card.cardCategory);
      }
    }

    for (let i = qIndex; i < battle.queue.length; i++) {
      const a = battle.queue[i];

      if (enemyDefeated && a.actor === 'enemy') {
        continue;
      }

      // 최적화: 현재 인덱스 이전 카드의 카테고리 누적 (O(n²) → O(n))
      const usedCardCategories = [...usedCategoriesSet];
      const previewNextTurnEffects = battle.nextTurnEffects || {};

      const battleContext = {
        currentSp: a.sp || 0,
        queue: battle.queue,
        currentQIndex: i,
        remainingEnergy: finalRemainingEnergy,
        enemyRemainingEnergy: finalEnemyRemainingEnergy,
        allCards: CARDS,
        usedCardCategories,
        hand: battle.hand || [],
        fencingDamageBonus: previewNextTurnEffects.fencingDamageBonus || 0
      };

      const { events } = applyAction(tempState, a.actor, a.card, battleContext as CombatBattleContext);
      newEvents[i] = events;
      events.forEach(ev => addLog(ev.msg));

      if (a.actor === 'player') {
        // 카테고리 누적 (다음 반복에서 사용)
        if (a.card?.cardCategory) {
          usedCategoriesSet.add(a.card.cardCategory);
        }
        const gain = Math.floor(getCardEtherGain(a.card as EtherCard) * passiveRelicEffects.etherMultiplier);
        localTurnEther += gain;
      } else if (a.actor === 'enemy') {
        localEnemyTurnEther += getCardEtherGain(a.card as EtherCard);
      }

      if (P.hp <= 0) {
        actions.setPlayer({ ...player, hp: P.hp, def: P.def, block: P.block, counter: P.counter, vulnMult: P.vulnMult || 1 });
        actions.setEnemy({ ...enemy, hp: E.hp, def: E.def, block: E.block, counter: E.counter, vulnMult: E.vulnMult || 1 });
        actions.setActionEvents({ ...battle.actionEvents, ...newEvents });
        actions.setQIndex(i + 1);
        actions.setPostCombatOptions({ type: 'defeat' });
        actions.setPhase('post');
        return;
      }
      if (E.hp <= 0 && !enemyDefeated) {
        actions.setEnemyHit(true);
        playSound(200, 500);
        addLog('💀 적 처치! 남은 적 행동 건너뛰기');
        enemyDefeated = true;
      }
    }

    actions.setTurnEtherAccumulated(localTurnEther);
    actions.setEnemyTurnEtherAccumulated(localEnemyTurnEther);
    actions.setPlayer({ ...player, hp: P.hp, def: P.def, block: P.block, counter: P.counter, vulnMult: P.vulnMult || 1 });
    actions.setEnemy({ ...enemy, hp: E.hp, def: E.def, block: E.block, counter: E.counter, vulnMult: E.vulnMult || 1 });
    actions.setActionEvents({ ...battle.actionEvents, ...newEvents });
    actions.setQIndex(battle.queue.length);

    // 타임라인 완료 후 에테르 계산 애니메이션
    const latestPlayerForAnim = battleRef.current?.player || player;
    startEtherCalculationAnimationSequence({
      turnEtherAccumulated: localTurnEther,
      selected: selected as EtherAnimCard[],
      player: latestPlayerForAnim,
      playSound,
      actions: {
        setEtherCalcPhase: actions.setEtherCalcPhase as (phase: import('../../../types').AnimEtherCalcPhase) => void
      },
      onMultiplierConsumed: () => {
        const currentPlayer = battleRef.current?.player || player;
        const updatedPlayer = { ...currentPlayer, etherMultiplier: 1 };
        actions.setPlayer(updatedPlayer as PlayerBattleState);
        if (battleRef.current) {
          battleRef.current.player = updatedPlayer;
        }
      }
    });
  }, [
    battle, player, enemy, selected, qIndex,
    turnEtherAccumulated, enemyTurnEtherAccumulated,
    orderedRelicList, battleRef, addLog, playSound, actions
  ]);

  return { finishTurn, runAll };
}
