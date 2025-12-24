/**
 * @file useTurnStartEffects.js
 * @description 턴 시작 효과 처리 훅
 * @typedef {import('../../../types').Card} Card
 *
 * ## 턴 시작 처리 순서
 * 1. 상징 턴 시작 효과 (피피한 갑옷 등)
 * 2. 성찰 효과 처리 (자아 보유 시)
 * 3. 에너지/체력/방어력 보너스 적용
 * 4. 적 패시브 효과 (회복, 힘 증가 등)
 * 5. 손패 생성 (덱에서 드로우)
 * 6. 적 성향/행동 계획 생성
 *
 * ## 적 패시브 효과
 * - veilAtStart: 첫 턴 장막 부여
 * - healPerTurn: 매턴 체력 회복
 * - strengthPerTurn: 매턴 힘 증가
 */

import { useEffect } from 'react';
import { RELICS } from '../../../data/relics';
import { applyTurnStartEffects, calculatePassiveEffects } from '../../../lib/relicEffects';
import { processReflections } from '../../../lib/reflectionEffects';
import { convertTraitsToIds } from '../../../data/reflections';
import { getAllTokens, addToken } from '../../../lib/tokenUtils';
import { drawFromDeck } from '../utils/handGeneration';
import { decideEnemyMode, generateEnemyActions, expandActionsWithGhosts } from '../utils/enemyAI';
import { useGameStore } from '../../../state/gameStore';
import { DEFAULT_PLAYER_MAX_SPEED, DEFAULT_DRAW_COUNT, CARDS } from '../battleData';

/**
 * 턴 시작 효과 처리 훅
 * @param {Object} params
 * @param {Object} params.battle - 전투 상태
 * @param {Object} params.player - 플레이어 상태
 * @param {Object} params.enemy - 적 상태
 * @param {Object} params.enemyPlan - 적 행동 계획
 * @param {Object} params.nextTurnEffects - 다음 턴 효과
 * @param {number} params.turnNumber - 현재 턴 번호
 * @param {number} params.baseMaxEnergy - 기본 최대 에너지
 * @param {string[]} params.orderedRelicList - 보유 상징 목록
 * @param {string[]} params.playerEgos - 플레이어 자아 목록
 * @param {string[]} params.playerTraits - 플레이어 특성 목록
 * @param {React.MutableRefObject<Object>} params.battleRef - 전투 상태 ref
 * @param {React.MutableRefObject<Set>} params.escapeBanRef - 탈주 차단 ref
 * @param {React.MutableRefObject<boolean>} params.turnStartProcessedRef - 턴 시작 처리 완료 ref
 * @param {Function} params.etherSlots - 에테르 슬롯 계산
 * @param {Function} params.playSound - 사운드 재생
 * @param {Function} params.addLog - 로그 추가
 * @param {Object} params.actions - 상태 업데이트 액션
 */
export function useTurnStartEffects({
  battle,
  player,
  enemy,
  enemyPlan,
  nextTurnEffects,
  turnNumber,
  baseMaxEnergy,
  orderedRelicList,
  playerEgos,
  playerTraits,
  enemyCount,
  battleRef,
  escapeBanRef,
  turnStartProcessedRef,
  etherSlots,
  playSound,
  addLog,
  actions
}) {
  useEffect(() => {
    if (!enemy || battle.phase !== 'select') {
      // phase가 select가 아니면 플래그 리셋
      if (battle.phase !== 'select') {
        turnStartProcessedRef.current = false;
      }
      return;
    }

    // 턴 시작 효과가 이미 처리되었으면 중복 실행 방지
    if (turnStartProcessedRef.current) {
      return;
    }
    turnStartProcessedRef.current = true;

    actions.setFixedOrder(null);
    actions.setActionEvents({});
    actions.setCanRedraw(true);
    actions.setWillOverdrive(false);

    // 상징 턴 시작 효과 적용 (피피한 갑옷 등)
    const turnStartRelicEffects = applyTurnStartEffects(orderedRelicList, nextTurnEffects);

    // 턴 시작 상징 발동 애니메이션
    orderedRelicList.forEach(relicId => {
      const relic = RELICS[relicId];
      if (relic?.effects?.type === 'ON_TURN_START') {
        actions.setRelicActivated(relicId);
        playSound(800, 200);
        setTimeout(() => actions.setRelicActivated(null), 500);
      }
    });

    // === 성찰 효과 처리 (자아가 있을 때만) ===
    let reflectionResult = { updatedPlayer: player, updatedBattleState: battle.reflectionState, effects: [], logs: [] };
    const hasEgo = playerEgos && playerEgos.length > 0;
    if (hasEgo) {
      const traitIds = convertTraitsToIds(playerTraits);
      const playerForReflection = {
        ...player,
        egos: playerEgos,
        traits: traitIds,
        tokens: player.tokens || { usage: [], turn: [], permanent: [] }
      };
      reflectionResult = processReflections(playerForReflection, battle.reflectionState, turnNumber);

      // 성찰 발동 시 효과음과 로그
      if (reflectionResult.effects.length > 0) {
        playSound(1200, 150);
        setTimeout(() => playSound(1500, 100), 100);
      }
      reflectionResult.logs.forEach(log => addLog(log));
    }
    // 성찰 상태 업데이트
    actions.setReflectionState(reflectionResult.updatedBattleState);

    // 특성 효과로 인한 에너지 보너스/페널티 적용
    const passiveRelicEffects = calculatePassiveEffects(orderedRelicList);
    const baseEnergy = baseMaxEnergy;
    const reflectionEnergyBonus = reflectionResult.updatedBattleState.bonusEnergy || 0;
    const energyBonus = (nextTurnEffects.bonusEnergy || 0) + turnStartRelicEffects.energy + reflectionEnergyBonus;
    const energyPenalty = nextTurnEffects.energyPenalty || 0;
    const finalEnergy = Math.max(0, baseEnergy + energyBonus - energyPenalty);

    // 방어력과 체력 회복 적용 (성찰 회복 효과 포함)
    const reflectionHealedHp = reflectionResult.updatedPlayer.hp || player.hp;
    const newHp = Math.min(player.maxHp, reflectionHealedHp + turnStartRelicEffects.heal);
    const newBlock = (player.block || 0) + turnStartRelicEffects.block;
    const newDef = turnStartRelicEffects.block > 0;
    // 성찰 효과로 얻은 토큰 적용
    const newTokens = reflectionResult.updatedPlayer.tokens || player.tokens || { usage: [], turn: [], permanent: [] };
    // 정신집중 토큰 효과 확인
    const allPlayerTokens = getAllTokens({ tokens: newTokens });
    const focusToken = allPlayerTokens.find(t => t.effect?.type === 'FOCUS');
    const focusMaxSpeedBonus = focusToken ? 8 * (focusToken.stacks || 1) : 0;
    const focusExtraCardPlay = focusToken ? 2 * (focusToken.stacks || 1) : 0;
    // 타임라인 보너스 적용
    const reflectionTimelineBonus = reflectionResult.updatedBattleState.timelineBonus || 0;
    const maxSpeedBonusFromEffects = (nextTurnEffects.maxSpeedBonus || 0) + focusMaxSpeedBonus;
    const newMaxSpeed = (player.maxSpeed || DEFAULT_PLAYER_MAX_SPEED) + reflectionTimelineBonus + maxSpeedBonusFromEffects;
    // 에테르 배율 적용 (성찰 완성 효과)
    const reflectionEtherMultiplier = reflectionResult.updatedBattleState.etherMultiplier || 1;
    const currentEtherMultiplier = player.etherMultiplier || 1;
    const newEtherMultiplier = currentEtherMultiplier * reflectionEtherMultiplier;

    actions.setPlayer({
      ...player,
      hp: newHp,
      block: newBlock,
      def: newDef,
      energy: finalEnergy,
      maxEnergy: baseMaxEnergy,
      maxSpeed: newMaxSpeed,
      etherMultiplier: newEtherMultiplier,
      etherOverdriveActive: false,
      etherOverflow: 0,
      strength: player.strength || 0,
      tokens: newTokens
    });

    // 로그 추가
    if (turnStartRelicEffects.block > 0) {
      addLog(`🛡️ 상징 효과: 방어력 +${turnStartRelicEffects.block}`);
    }
    if (turnStartRelicEffects.heal > 0) {
      addLog(`💚 상징 효과: 체력 +${turnStartRelicEffects.heal}`);
    }
    if (turnStartRelicEffects.energy > 0) {
      addLog(`⚡ 상징 효과: 행동력 +${turnStartRelicEffects.energy}`);
    }
    if (energyBonus > 0) {
      addLog(`⚡ 다음턴 보너스 행동력: +${energyBonus}`);
    }
    if (focusToken) {
      addLog(`🧘 정신집중: 최대속도 +${focusMaxSpeedBonus}, 카드 +${focusExtraCardPlay}장`);
    }

    // 성찰 지배 효과: 적 타임라인 동결
    const reflectionFreezeTurns = reflectionResult.updatedBattleState.enemyFreezeTurns || 0;
    if (reflectionFreezeTurns > 0) {
      const currentFrozenOrder = battle.frozenOrder || 0;
      const newFrozenOrder = Math.max(currentFrozenOrder, reflectionFreezeTurns);
      actions.setFrozenOrder(newFrozenOrder);
      if (battleRef.current) {
        battleRef.current.frozenOrder = newFrozenOrder;
      }
    }

    // === 적 패시브 효과 처리 ===
    let updatedEnemy = { ...enemy };
    const enemyPassives = enemy.passives || {};

    // 첫 턴: 장막(veil) 부여 (통찰 차단) - 유닛별로 처리
    if (turnNumber === 1) {
      const units = updatedEnemy.units || [];
      let updatedUnits = [...units];
      let anyVeil = false;

      for (let i = 0; i < updatedUnits.length; i++) {
        const unit = updatedUnits[i];
        const unitPassives = unit.passives || {};
        if (unitPassives.veilAtStart) {
          const veilResult = addToken(unit, 'veil', 1);
          updatedUnits[i] = { ...unit, tokens: veilResult.tokens };
          addLog(`🌫️ ${unit.name}: 장막 - 이 적의 행동을 볼 수 없습니다!`);
          anyVeil = true;
        }
      }

      if (anyVeil) {
        updatedEnemy = { ...updatedEnemy, units: updatedUnits };
      }

      // 레거시 호환: 전체 enemy에 veilAtStart가 있는 경우 (유닛이 없는 경우)
      if (enemyPassives.veilAtStart && units.length === 0) {
        const veilResult = addToken(updatedEnemy, 'veil', 1);
        updatedEnemy = { ...updatedEnemy, tokens: veilResult.tokens };
        addLog(`🌫️ ${enemy.name}: 장막 - 적의 행동을 볼 수 없습니다!`);
      }
    }

    // 매턴 체력 회복
    if (enemyPassives.healPerTurn && enemyPassives.healPerTurn > 0) {
      const healAmount = enemyPassives.healPerTurn;
      const newEnemyHp = Math.min(enemy.maxHp || enemy.hp, updatedEnemy.hp + healAmount);
      const actualHeal = newEnemyHp - updatedEnemy.hp;
      if (actualHeal > 0) {
        updatedEnemy.hp = newEnemyHp;
        addLog(`💚 ${enemy.name}: 체력 +${actualHeal} 회복`);
      }
    }

    // 매턴 힘 증가
    if (enemyPassives.strengthPerTurn && enemyPassives.strengthPerTurn > 0) {
      const strengthGain = enemyPassives.strengthPerTurn;
      updatedEnemy.strength = (updatedEnemy.strength || 0) + strengthGain;
      addLog(`💪 ${enemy.name}: 힘 +${strengthGain} 증가 (현재: ${updatedEnemy.strength})`);
    }

    // 적 상태 업데이트
    if (JSON.stringify(updatedEnemy) !== JSON.stringify(enemy)) {
      actions.setEnemy(updatedEnemy);
      if (battleRef.current) {
        battleRef.current = { ...battleRef.current, enemy: updatedEnemy };
      }
    }

    // 매 턴 시작 시 새로운 손패 생성 (덱/무덤 시스템)
    if (turnNumber === 1) {
      // 첫 턴은 초기화 useEffect에서 처리됨 - 스킵
      actions.setSelected([]);
    } else {
      const currentBuild = useGameStore.getState().characterBuild;
      const hasCharacterBuild = currentBuild && (currentBuild.mainSpecials?.length > 0 || currentBuild.subSpecials?.length > 0 || currentBuild.ownedCards?.length > 0);

      if (hasCharacterBuild) {
        // 현재 손패를 무덤으로 이동
        const currentHand = battle.hand || [];
        let currentDeck = battle.deck || [];
        let currentDiscard = [...(battle.discardPile || []), ...currentHand];

        // 덱에서 카드 드로우
        const drawResult = drawFromDeck(currentDeck, currentDiscard, DEFAULT_DRAW_COUNT, escapeBanRef.current);

        actions.setDeck(drawResult.newDeck);
        actions.setDiscardPile(drawResult.newDiscardPile);
        actions.setHand(drawResult.drawnCards);

        if (drawResult.reshuffled) {
          addLog('🔄 덱이 소진되어 무덤을 섞어 새 덱을 만들었습니다.');
        }
      } else {
        const rawHand = CARDS.slice(0, 10).map((card, idx) => ({ ...card, __handUid: `${card.id}_${idx}_${Math.random().toString(36).slice(2, 8)}` }));
        actions.setHand(rawHand);
      }
      actions.setSelected([]);
    }

    // 적 성향/행동을 턴 시작에 즉시 결정 (몬스터별 가중치 적용)
    const mode = battle.enemyPlan.mode || decideEnemyMode(enemy);
    if (!battle.enemyPlan.mode) {
      addLog(`🤖 적 성향 힌트: ${mode.name}`);
    }

    const refEnemyPlan = battleRef.current?.enemyPlan;
    const latestManuallyModified = battle.enemyPlan.manuallyModified || refEnemyPlan?.manuallyModified;

    if (latestManuallyModified) {
      const currentActions = refEnemyPlan?.actions || battle.enemyPlan.actions;
      actions.setEnemyPlan({ mode, actions: currentActions, manuallyModified: true });
    } else {
      const slots = etherSlots(enemy?.etherPts || 0);
      // 단일 몬스터 기준 카드 수 (다중 몬스터는 유령카드로 확장)
      const singleEnemyCards = enemy?.cardsPerTurn || 1;
      const rawActions = generateEnemyActions(enemy, mode, slots, singleEnemyCards, Math.min(1, singleEnemyCards));
      // 다중 몬스터: 실제 카드 + 유령카드로 확장
      const planActions = expandActionsWithGhosts(rawActions, enemy?.units || []);
      actions.setEnemyPlan({ mode, actions: planActions });
    }
  }, [battle.phase, enemy, enemyPlan.mode, enemyPlan.manuallyModified, nextTurnEffects]);
}
