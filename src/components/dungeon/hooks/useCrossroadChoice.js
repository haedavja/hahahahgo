/**
 * useCrossroadChoice.js
 *
 * 던전 기로 선택지 상태 및 로직
 * DungeonExploration.jsx에서 분리됨
 */

import { useCallback } from 'react';
import { useGameStore } from '../../../state/gameStore';
import { playChoiceSelectSound, playDangerSound } from '../../../lib/soundUtils';

/**
 * 기로 선택지 관련 훅
 */
export function useCrossroadChoice({
  crossroadModal,
  dungeonDeltas,
  setDungeonDeltas,
  currentRoomKey,
  startBattle,
  segment,
  actions,
}) {
  // 플레이어 스탯 가져오기
  const playerStrength = useGameStore((s) => s.playerStrength) || 0;
  const playerAgility = useGameStore((s) => s.playerAgility) || 0;
  const playerInsight = useGameStore((s) => s.playerInsight) || 0;

  // 스탯 요구조건 충족 여부 확인
  const checkRequirement = useCallback((choice, attemptCount = 0) => {
    const req = choice.requirements || {};
    const scaling = choice.scalingRequirement;

    // 기본 요구조건 체크
    if (req.strength && playerStrength < req.strength) return false;
    if (req.agility && playerAgility < req.agility) return false;
    if (req.insight && playerInsight < req.insight) return false;

    // 스케일링 요구조건 체크 (시도 횟수에 따라 증가)
    if (scaling) {
      const requiredValue = scaling.baseValue + (scaling.increment * attemptCount);
      const statValue = scaling.stat === 'strength' ? playerStrength :
                        scaling.stat === 'agility' ? playerAgility :
                        scaling.stat === 'insight' ? playerInsight : 0;
      if (statValue < requiredValue) return false;
    }

    return true;
  }, [playerStrength, playerAgility, playerInsight]);

  // 스탯 여유도 계산 (얼마나 여유있게 충족하는지)
  const getStatMargin = useCallback((choice, attemptNum) => {
    if (!choice.scalingRequirement) return Infinity;

    const { stat, baseValue, increment } = choice.scalingRequirement;
    const requiredValue = baseValue + (attemptNum * increment);

    const statMap = {
      strength: playerStrength,
      agility: playerAgility,
      insight: playerInsight,
    };
    const playerStat = statMap[stat] || 0;

    return playerStat - requiredValue;
  }, [playerStrength, playerAgility, playerInsight]);

  // 랜덤 적 가져오기 헬퍼
  const getRandomEnemy = useCallback((tier) => {
    // 간단한 구현 - 실제로는 enemyData에서 가져와야 함
    return { id: 'goblin', name: '고블린' };
  }, []);

  // 선택지 결과 적용
  const applyChoiceOutcome = useCallback((outcome, obj) => {
    if (!outcome?.effect) return;

    const effect = outcome.effect;

    // 피해 적용
    if (effect.damage) {
      const currentHp = useGameStore.getState().playerHp || 50;
      useGameStore.setState({ playerHp: Math.max(0, currentHp - effect.damage) });
    }

    // 보상 적용
    if (effect.reward) {
      const newDeltas = { ...dungeonDeltas };
      if (effect.reward.gold) {
        const gold = typeof effect.reward.gold === 'object'
          ? effect.reward.gold.min + Math.floor(Math.random() * (effect.reward.gold.max - effect.reward.gold.min + 1))
          : effect.reward.gold;
        newDeltas.gold += gold;
      }
      if (effect.reward.loot) {
        newDeltas.loot += effect.reward.loot;
      }
      setDungeonDeltas(newDeltas);
    }

    // 전투 트리거
    if (effect.triggerCombat) {
      if (effect.triggerCombat === 'mimic') {
        startBattle({
          nodeId: `dungeon-crossroad-${currentRoomKey}`,
          kind: "combat",
          label: "미믹",
          enemyHp: 40,
          rewards: {},
        });
      } else {
        const tier = Math.min(3, Math.max(1, Math.floor((segment?.depth || 0) / 2) + 1));
        const enemy = getRandomEnemy(tier);
        startBattle({
          nodeId: `dungeon-crossroad-${currentRoomKey}`,
          kind: "combat",
          label: enemy?.name || "습격",
          enemyId: enemy?.id,
          tier,
          rewards: {},
        });
      }
    }
  }, [dungeonDeltas, setDungeonDeltas, currentRoomKey, startBattle, segment, getRandomEnemy]);

  // 선택지 실행
  const executeChoice = useCallback((choice, choiceState) => {
    if (!crossroadModal) return;

    playChoiceSelectSound();

    const { obj } = crossroadModal;
    const attemptCount = choiceState[choice.id]?.attempts || 0;

    // 반복 선택 가능한 선택지인 경우
    if (choice.repeatable) {
      const newAttempts = attemptCount + 1;
      const maxAttempts = choice.maxAttempts || 5;

      const hasScalingReq = !!choice.scalingRequirement;
      const meetsRequirement = hasScalingReq ? checkRequirement(choice, newAttempts) : true;
      const statMargin = hasScalingReq ? getStatMargin(choice, newAttempts) : Infinity;

      // 화면 흔들림 효과
      if (choice.screenEffect === 'shake') {
        actions.setScreenShake(true);
        setTimeout(() => actions.setScreenShake(false), 200);
      }

      // 스탯 미달 시 즉시 실패
      if (hasScalingReq && !meetsRequirement) {
        playDangerSound();

        const strainIdx = Math.min(newAttempts - 1, (choice.strainText?.length || 1) - 1);
        const strainMsg = choice.strainText?.[strainIdx];

        const outcome = choice.outcomes.failure;
        const finalMsg = strainMsg
          ? `${strainMsg}\n\n${outcome.text}`
          : outcome.text;

        applyChoiceOutcome(outcome, obj);
        actions.setMessage(finalMsg);

        obj.used = true;
        actions.setCrossroadModal(null);

        setTimeout(() => actions.setMessage(''), 4000);
        return;
      }

      // 경고 체크
      if (choice.warningAtAttempt && newAttempts === choice.warningAtAttempt) {
        actions.setMessage(choice.warningText || '뭔가 이상한 기운이...');
      }

      // 최대 시도 횟수 도달 시
      if (newAttempts >= maxAttempts) {
        const isSuccess = hasScalingReq ? true : (Math.random() < (choice.successRate ?? 0.5));
        const outcome = isSuccess ? choice.outcomes.success : choice.outcomes.failure;

        applyChoiceOutcome(outcome, obj);
        actions.setMessage(outcome.text);

        obj.used = true;
        actions.setCrossroadModal(null);

        setTimeout(() => actions.setMessage(''), 3000);
      } else {
        // 진행 중 - 진행 텍스트 표시
        const progressIdx = Math.min(newAttempts - 1, (choice.progressText?.length || 1) - 1);
        let progressMsg = choice.progressText?.[progressIdx] || `시도 ${newAttempts}/${maxAttempts}`;

        // 스탯이 빠듯하면 strainText도 함께 표시
        if (hasScalingReq && statMargin >= 0 && statMargin <= 1 && choice.strainText) {
          const strainIdx = Math.min(newAttempts - 1, choice.strainText.length - 1);
          const strainMsg = choice.strainText[strainIdx];
          if (strainMsg) {
            progressMsg = `${progressMsg}\n\n${strainMsg}`;
          }
        }

        // 다음 시도 요구 스탯 미리 체크하여 경고
        const nextMargin = hasScalingReq ? getStatMargin(choice, newAttempts + 1) : Infinity;
        if (hasScalingReq && nextMargin < 0 && choice.strainText) {
          const strainIdx = Math.min(newAttempts - 1, choice.strainText.length - 1);
          const strainMsg = choice.strainText[strainIdx];
          if (strainMsg && !progressMsg.includes(strainMsg)) {
            progressMsg = `${progressMsg}\n\n⚠️ ${strainMsg}`;
          }
        }

        actions.setMessage(progressMsg);

        const newChoiceState = {
          ...choiceState,
          [choice.id]: { attempts: newAttempts },
        };
        obj.choiceState = newChoiceState;
        actions.setCrossroadModal({
          ...crossroadModal,
          choiceState: newChoiceState,
        });
      }
    } else {
      // 일회성 선택지
      const hasSuccessRate = choice.successRate !== undefined;
      const isSuccess = hasSuccessRate ? (Math.random() < choice.successRate) : true;
      const outcome = isSuccess ? choice.outcomes.success : choice.outcomes.failure;

      applyChoiceOutcome(outcome, obj);
      actions.setMessage(outcome.text);

      obj.used = true;
      actions.setCrossroadModal(null);

      setTimeout(() => actions.setMessage(''), 3000);
    }
  }, [crossroadModal, checkRequirement, getStatMargin, applyChoiceOutcome, actions]);

  // 기로 모달 닫기
  const closeCrossroadModal = useCallback(() => {
    actions.setCrossroadModal(null);
  }, [actions]);

  return {
    checkRequirement,
    getStatMargin,
    executeChoice,
    applyChoiceOutcome,
    closeCrossroadModal,
    playerStrength,
    playerAgility,
    playerInsight,
  };
}
