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
import type { MutableRefObject } from 'react';
import { RELICS } from '../../../data/relics';
import { calculatePassiveEffects } from '../../../lib/relicEffects';
import { executeTurnStartEffects, RELIC_AUDIO } from '../../../core/effects';
import { convertTraitsToIds } from '../../../data/reflections';
import { getAllTokens, addToken } from '../../../lib/tokenUtils';
import { processEthosAtBattleStart } from '../../../lib/ethosEffects';
import { initialGrowthState } from '../../../state/slices/growthSlice';
import { drawFromDeck } from '../utils/handGeneration';
import { decideEnemyMode, generateEnemyActions, expandActionsWithGhosts } from '../utils/enemyAI';
import { useGameStore } from '../../../state/gameStore';
import { DEFAULT_PLAYER_MAX_SPEED, DEFAULT_DRAW_COUNT, CARDS } from '../battleData';
import { generateHandUid } from '../../../lib/randomUtils';
import { ANIMATION_TIMING } from '../ui/constants/layout';
import {
  updateGraceOnTurnStart,
  processAutoPrayers,
  createInitialGraceState
} from '../../../data/monsterEther';
import type { PrayerType, MonsterGraceState } from '../../../data/monsterEther';
import { processTurnStartStack } from '../utils/enemyStack';
import type { StackTriggerEffect } from '../../../types/enemy';
import type {
  Combatant,
  EnemyPlan,
  NextTurnEffects,
  BattleRefValue,
  ProcessReflectionsResult,
  Relic,
  EnemyUnit
} from '../../../types';
import type { FullBattleState } from '../reducer/battleReducerState';

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
}: {
  battle: FullBattleState;
  player: Combatant;
  enemy: EnemyUnit;
  enemyPlan: EnemyPlan;
  nextTurnEffects: NextTurnEffects;
  turnNumber: number;
  baseMaxEnergy: number;
  orderedRelicList: string[];
  playerEgos: unknown[];
  playerTraits: string[];
  enemyCount: number;
  battleRef: MutableRefObject<BattleRefValue | null>;
  escapeBanRef: MutableRefObject<Set<string>>;
  turnStartProcessedRef: MutableRefObject<boolean>;
  etherSlots: (etherPts: number) => number;
  playSound: (frequency: number, duration: number) => void;
  addLog: (message: string) => void;
  actions: Record<string, (...args: unknown[]) => void>;
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
    const turnStartRelicEffects = executeTurnStartEffects(orderedRelicList);

    // 턴 시작 상징 발동 애니메이션
    orderedRelicList.forEach((relicId: string) => {
      const relic = RELICS[relicId as keyof typeof RELICS];
      if (relic && 'effects' in relic && (relic.effects as { type?: string })?.type === 'ON_TURN_START') {
        actions.setRelicActivated(relicId);
        playSound(RELIC_AUDIO.TURN_START.tone, RELIC_AUDIO.TURN_START.duration);
        setTimeout(() => actions.setRelicActivated(null), ANIMATION_TIMING.RELIC_ACTIVATION);
      }
    });

    // === 에토스 패시브 효과 처리 ===
    const growth = useGameStore.getState().growth || initialGrowthState;
    let ethosUpdatedPlayer = { ...player };
    const ethosLogs: string[] = [];

    // 첫 턴에만 battleStart 트리거 에토스 처리
    if (turnNumber === 1) {
      const ethosResult = processEthosAtBattleStart(player, growth);
      ethosUpdatedPlayer = ethosResult.updatedPlayer;

      // 에토스에서 부여하는 토큰 적용
      for (const tokenInfo of ethosResult.tokensToAdd) {
        const tokenResult = addToken(ethosUpdatedPlayer, tokenInfo.id, tokenInfo.stacks);
        ethosUpdatedPlayer = { ...ethosUpdatedPlayer, tokens: tokenResult.tokens };
      }

      ethosLogs.push(...ethosResult.logs);
    }

    // 에토스 로그 출력
    for (const log of ethosLogs) {
      addLog(log);
    }

    // 레거시 호환: reflectionState 유지 (빈 객체)
    const reflectionResult: ProcessReflectionsResult = {
      updatedPlayer: ethosUpdatedPlayer,
      updatedBattleState: battle.reflectionState || {},
      effects: [],
      logs: ethosLogs
    };
    actions.setReflectionState(reflectionResult.updatedBattleState);

    // 특성 효과로 인한 에너지 보너스/페널티 적용
    const passiveRelicEffects = calculatePassiveEffects(orderedRelicList);
    const baseEnergy = baseMaxEnergy;
    const reflectionEnergyBonus = reflectionResult.updatedBattleState.bonusEnergy || 0;

    // 상징 패시브 효과: 조건부 에너지 보너스
    let relicEnergyBonus = 0;
    // 영혼조각: HP 50% 이하 +1, 25% 이하 +2 행동력
    if (passiveRelicEffects.conditionalEnergy) {
      const hpPercent = player.hp / (player.maxHp || player.hp);
      if (hpPercent <= 0.25) {
        relicEnergyBonus += passiveRelicEffects.conditionalEnergy.threshold25;
        addLog(`💎 영혼조각: HP 25% 이하! 행동력 +${passiveRelicEffects.conditionalEnergy.threshold25}`);
      } else if (hpPercent <= 0.5) {
        relicEnergyBonus += passiveRelicEffects.conditionalEnergy.threshold50;
        addLog(`💎 영혼조각: HP 50% 이하! 행동력 +${passiveRelicEffects.conditionalEnergy.threshold50}`);
      }
    }
    // 역설의파편: 첫 턴 행동력 보너스
    if (turnNumber === 1 && passiveRelicEffects.firstTurnEnergy > 0) {
      relicEnergyBonus += passiveRelicEffects.firstTurnEnergy;
      addLog(`⚡ 역설의파편: 첫 턴 행동력 +${passiveRelicEffects.firstTurnEnergy}`);
    }

    const energyBonus = (nextTurnEffects.bonusEnergy || 0) + turnStartRelicEffects.energy + reflectionEnergyBonus + relicEnergyBonus;
    const energyPenalty = nextTurnEffects.energyPenalty || 0;
    const finalEnergy = Math.max(0, baseEnergy + energyBonus - energyPenalty);

    // 방어력과 체력 회복 적용 (성찰 회복 효과 포함)
    const reflectionHealedHp = reflectionResult.updatedPlayer.hp || player.hp;
    const effectiveMaxHp = player.maxHp ?? player.hp;
    // 철의 심장: 피해 받기 효과 (다음 턴 방어력/체력)
    const damageTakenHealBonus = nextTurnEffects.healNextTurn || 0;
    const damageTakenBlockBonus = nextTurnEffects.blockNextTurn || 0;
    // fullHeal 효과: 체력 최대 회복
    let newHp: number;
    if (nextTurnEffects.fullHeal) {
      newHp = effectiveMaxHp;
      addLog(`💖 결투: 체력 최대 회복! (${reflectionHealedHp} → ${effectiveMaxHp})`);
    } else {
      newHp = Math.min(effectiveMaxHp, reflectionHealedHp + turnStartRelicEffects.heal + damageTakenHealBonus);
    }
    const newBlock = (player.block || 0) + turnStartRelicEffects.block + damageTakenBlockBonus;
    // 방어력이 있으면 def도 true로 설정 (경계 토큰으로 유지된 방어력 포함)
    const newDef = newBlock > 0;
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
    // 철의 심장: 피해 받기 효과 로그
    if (damageTakenBlockBonus > 0 || damageTakenHealBonus > 0) {
      addLog(`❤️ 철의 심장: 방어력 +${damageTakenBlockBonus}, 체력 +${damageTakenHealBonus}`);
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
    const enemyPassives = enemy.passives || ({} as Record<string, unknown>);

    // 첫 턴: 장막(veil) 부여 (통찰 차단) - 유닛별로 처리
    if (turnNumber === 1) {
      const units = updatedEnemy.units || [];
      let updatedUnits = [...units];
      let anyVeil = false;
      let anyCritBoost = false;

      for (let i = 0; i < updatedUnits.length; i++) {
        const unit = updatedUnits[i];
        const unitPassives = unit.passives || {};
        if (unitPassives.veilAtStart) {
          const veilResult = addToken(unit, 'veil', 1);
          updatedUnits[i] = { ...unit, tokens: veilResult.tokens };
          addLog(`🌫️ ${unit.name}: 장막 - 이 적의 행동을 볼 수 없습니다!`);
          anyVeil = true;
        }
        // 첫 턴: 치명타 보너스 부여
        if (unitPassives.critBoostAtStart && typeof unitPassives.critBoostAtStart === 'number') {
          const critBoost = unitPassives.critBoostAtStart;
          const rawCritBonus = updatedUnits[i].critBonus;
          const currentCritBonus: number = typeof rawCritBonus === 'number' ? rawCritBonus : 0;
          updatedUnits[i] = { ...updatedUnits[i], critBonus: currentCritBonus + critBoost };
          addLog(`🎯 ${unit.name}: 치명타율 +${critBoost}%`);
          anyCritBoost = true;
        }
      }

      if (anyVeil || anyCritBoost) {
        updatedEnemy = { ...updatedEnemy, units: updatedUnits };
      }

      // 레거시 호환: 전체 enemy에 veilAtStart가 있는 경우 (유닛이 없는 경우)
      if (enemyPassives.veilAtStart && units.length === 0) {
        const veilResult = addToken(updatedEnemy, 'veil', 1);
        updatedEnemy = { ...updatedEnemy, tokens: veilResult.tokens };
        addLog(`🌫️ ${enemy.name}: 장막 - 적의 행동을 볼 수 없습니다!`);
      }

      // 레거시 호환: 전체 enemy에 critBoostAtStart가 있는 경우 (유닛이 없는 경우)
      const critBoostAtStart = typeof enemyPassives.critBoostAtStart === 'number' ? enemyPassives.critBoostAtStart : undefined;
      if (critBoostAtStart && units.length === 0) {
        const currentEnemyCritBonus = typeof updatedEnemy.critBonus === 'number' ? updatedEnemy.critBonus : 0;
        updatedEnemy = { ...updatedEnemy, critBonus: currentEnemyCritBonus + critBoostAtStart };
        addLog(`🎯 ${enemy.name}: 치명타율 +${critBoostAtStart}%`);
      }
    }

    // 매턴 체력 회복
    const healPerTurn = enemyPassives.healPerTurn as number | undefined;
    if (healPerTurn && healPerTurn > 0) {
      const healAmount = healPerTurn;
      const newEnemyHp = Math.min(enemy.maxHp || enemy.hp, updatedEnemy.hp + healAmount);
      const actualHeal = newEnemyHp - updatedEnemy.hp;
      if (actualHeal > 0) {
        updatedEnemy.hp = newEnemyHp;
        addLog(`💚 ${enemy.name}: 체력 +${actualHeal} 회복`);
      }
    }

    // 매턴 힘 증가
    const strengthPerTurn = enemyPassives.strengthPerTurn as number | undefined;
    if (strengthPerTurn && strengthPerTurn > 0) {
      const strengthGain = strengthPerTurn;
      updatedEnemy.strength = (updatedEnemy.strength || 0) + strengthGain;
      addLog(`💪 ${enemy.name}: 힘 +${strengthGain} 증가 (현재: ${updatedEnemy.strength})`);
    }

    // === 몬스터 기원 시스템 처리 ===
    // 은총 상태 턴 시작 업데이트 (가호 턴 감소, 사용 기록 초기화)
    const rawGrace = updatedEnemy.grace;
    // gracePts가 있는지 체크하여 유효한 MonsterGraceState인지 확인
    const currentGrace = (rawGrace && typeof rawGrace === 'object' && 'gracePts' in rawGrace)
      ? rawGrace as MonsterGraceState
      : createInitialGraceState((enemy.availablePrayers as PrayerType[] | undefined));
    let newGrace = updateGraceOnTurnStart(currentGrace);

    // 기원 자동 발동 (AI 결정)
    if (newGrace.gracePts > 0) {
      const prayerResults = processAutoPrayers({
        graceState: newGrace,
        enemyHp: updatedEnemy.hp,
        enemyMaxHp: updatedEnemy.maxHp || updatedEnemy.hp,
        enemyEtherPts: updatedEnemy.etherPts || 0,
        playerEtherPts: player.etherPts || 0,
        turnNumber
      });

      // 기원 효과 적용
      for (const result of prayerResults) {
        addLog(result.log);
        newGrace = result.graceState;

        // 몬스터 상태 변경 적용
        if (result.enemyChanges.healAmount) {
          const newHp = Math.min(
            updatedEnemy.maxHp || updatedEnemy.hp,
            updatedEnemy.hp + result.enemyChanges.healAmount
          );
          updatedEnemy = { ...updatedEnemy, hp: newHp };
        }
        if (result.enemyChanges.blockGain) {
          updatedEnemy = {
            ...updatedEnemy,
            block: (updatedEnemy.block || 0) + result.enemyChanges.blockGain,
            def: true
          };
        }
        if (result.enemyChanges.evadeGain) {
          const evadeResult = addToken(updatedEnemy, 'evade', result.enemyChanges.evadeGain);
          updatedEnemy = { ...updatedEnemy, tokens: evadeResult.tokens };
        }
      }
    }

    // 은총 상태 업데이트
    updatedEnemy = { ...updatedEnemy, grace: newGrace };

    // 스택 처리 (F형 자동 증가)
    if (updatedEnemy.stack) {
      const stackResult = processTurnStartStack(updatedEnemy.stack);
      updatedEnemy = { ...updatedEnemy, stack: stackResult.newStack };

      // 스택 효과 발동 시 처리
      if (stackResult.triggeredEffect) {
        const effect = stackResult.triggeredEffect;
        addLog(`💀 스택 효과 발동! (${updatedEnemy.stack.config.type}형)`);

        // 고정 피해 (F형)
        if (effect.damage) {
          const gameState = useGameStore.getState();
          const newPlayerHp = Math.max(0, gameState.hp - effect.damage);
          useGameStore.getState().setHp(newPlayerHp);
          addLog(`💥 ${effect.damage} 고정 피해!`);
        }

        // 적 토큰 부여
        if (effect.selfTokens) {
          for (const token of effect.selfTokens) {
            const tokenResult = addToken(updatedEnemy, token.id, token.stacks || 1);
            updatedEnemy = { ...updatedEnemy, tokens: tokenResult.tokens };
            addLog(`✨ 적에게 ${token.id} 토큰 부여`);
          }
        }

        // 플레이어 토큰 부여
        if (effect.playerTokens) {
          for (const token of effect.playerTokens) {
            addLog(`⚠️ 플레이어에게 ${token.id} 토큰 부여`);
            // 플레이어 토큰은 별도 처리 필요 (현재는 로그만)
          }
        }
      }
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
      const hasCharacterBuild = currentBuild && (currentBuild.mainSpecials?.length ?? 0) > 0 || (currentBuild.subSpecials?.length ?? 0) > 0 || (currentBuild.ownedCards?.length ?? 0) > 0;

      if (hasCharacterBuild) {
        // 현재 손패를 무덤으로 이동
        const currentHand = battle.hand || [];
        let currentDeck = (battle.deck || []) as import('../../../types').HandCard[];
        let currentDiscard = [...((battle.discardPile || []) as import('../../../types').HandCard[]), ...(currentHand as import('../../../types').HandCard[])];

        // 덱에서 카드 드로우 (소멸된 카드는 제외)
        const vanishedCardIds = (battle.vanishedCards || []).map((c) => typeof c === 'string' ? c : c.id);
        const mainSpecialOnly = nextTurnEffects?.mainSpecialOnly ?? false;
        // 상징 패시브 효과: 추가 드로우 (금단의지혜)
        const bonusDrawCount = passiveRelicEffects.drawPerTurn || 0;
        const totalDrawCount = DEFAULT_DRAW_COUNT + bonusDrawCount;
        if (bonusDrawCount > 0) {
          addLog(`📚 금단의지혜: 추가 드로우 +${bonusDrawCount}장`);
        }
        const drawResult = drawFromDeck(currentDeck, currentDiscard, totalDrawCount, escapeBanRef.current, vanishedCardIds, { mainSpecialOnly });

        actions.setDeck(drawResult.newDeck);
        actions.setDiscardPile(drawResult.newDiscardPile);
        actions.setHand(drawResult.drawnCards);

        if (mainSpecialOnly) {
          addLog('⚠️ 파탄 효과로 주특기 카드만 뽑혔습니다!');
          // 파탄 효과 사용 후 초기화
          actions.updateNextTurnEffects({ mainSpecialOnly: false });
        }
        if (drawResult.reshuffled) {
          addLog('🔄 덱이 소진되어 무덤을 섞어 새 덱을 만들었습니다.');
        }
      } else {
        const rawHand = CARDS.slice(0, 10).map((card, idx) => ({ ...card, __handUid: generateHandUid(card.id, idx) }));
        actions.setHand(rawHand);
      }
      actions.setSelected([]);
    }

    // 적 성향/행동을 턴 시작에 즉시 결정 (몬스터별 가중치 적용)
    const mode = battle.enemyPlan.mode || decideEnemyMode(enemy);
    if (!battle.enemyPlan.mode) {
      const modeName = typeof mode === 'string' ? mode : (mode as import('../../../types').AIMode).name;
      addLog(`🤖 적 성향 힌트: ${modeName}`);
    }

    const refEnemyPlan = battleRef.current?.enemyPlan as EnemyPlan | undefined;
    const latestManuallyModified = battle.enemyPlan.manuallyModified || refEnemyPlan?.manuallyModified;

    // 영혼 기절 체크 - 기절 상태면 카드를 내지 않음
    const allEnemyTokens = getAllTokens(enemy);
    const hasSoulStun = allEnemyTokens.some(t => t.id === 'soulStun');
    if (hasSoulStun) {
      addLog('💫 적이 영혼 기절 상태로 행동할 수 없습니다!');
      actions.setEnemyPlan({ mode, actions: [] });
      return;
    }

    if (latestManuallyModified) {
      const currentActions = refEnemyPlan?.actions || battle.enemyPlan.actions;
      actions.setEnemyPlan({ mode, actions: currentActions, manuallyModified: true });
    } else {
      const slots = etherSlots((enemy?.etherPts as number | undefined) || 0);
      const units = (enemy?.units || []) as EnemyUnit[];
      // count 기반 다중 몬스터 여부 확인 (들쥐x4 등)
      const totalCount = units.reduce((sum, u) => sum + ((u as { count?: number }).count || 1), 0);
      const isCountBasedMultiEnemy = units.length === 1 && totalCount > 1;
      // count 기반 다중 몬스터는 1개 카드만 생성 (유령으로 확장됨)
      const singleEnemyCards = isCountBasedMultiEnemy ? 1 : (enemy?.cardsPerTurn || 1);
      const rawActions = generateEnemyActions(enemy, mode, slots, singleEnemyCards, Math.min(1, singleEnemyCards));
      // 다중 몬스터: 실제 카드 + 유령카드로 확장
      const planActions = expandActionsWithGhosts(rawActions, units);
      actions.setEnemyPlan({ mode, actions: planActions });
    }
  }, [battle.phase, enemy, enemyPlan.mode, enemyPlan.manuallyModified, nextTurnEffects]);
}
