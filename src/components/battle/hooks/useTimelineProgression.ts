/**
 * @file useTimelineProgression.ts
 * @description 타임라인 진행 로직을 담당하는 훅
 *
 * BattleApp.tsx의 stepOnce 함수를 모듈화
 * - 타임라인 progress 애니메이션
 * - 방어자세 실시간 방어력 업데이트
 * - 카드 실행 타이밍 관리 (흔들림, 소멸 애니메이션)
 */

import { useCallback, type MutableRefObject } from 'react';
import { flushSync } from 'react-dom';
import { TIMING } from '../logic/battleExecution';
import { hasTrait } from '../utils/battleUtils';
import { DEFAULT_PLAYER_MAX_SPEED, DEFAULT_ENEMY_MAX_SPEED } from '../battleData';
import type { Card, HandAction, BreachSelection, TokenEntity, ParryReadyState } from '../../../types';
import type { BattleActions } from './useBattleState';

/** 방어자세 상태 */
export interface GrowingDefenseState {
  activatedSp: number;
  totalDefenseApplied?: number;
}

/** 타임라인 진행 의존성 */
export interface TimelineProgressionDeps {
  // Refs
  battleRef: MutableRefObject<{
    queue: HandAction[];
    qIndex: number;
    player: TokenEntity & { hp: number; block?: number; def?: boolean; maxSpeed?: number };
    enemy: TokenEntity & { hp: number; block?: number; def?: boolean; maxSpeed?: number };
    timelineProgress?: number;
    usedCardIndices?: number[];
    disappearingCards?: number[];
    hiddenCards?: number[];
  } | null>;
  breachSelectionRef: MutableRefObject<BreachSelection | null>;
  timelineAnimationRef: MutableRefObject<number | null>;
  growingDefenseRef: MutableRefObject<GrowingDefenseState | null>;
  escapeUsedThisTurnRef: MutableRefObject<Set<string>>;
  stepOnceRef: MutableRefObject<(() => void) | null>;

  // State
  player: TokenEntity & { hp: number; block?: number; maxSpeed?: number };
  enemy: TokenEntity & { hp: number; block?: number; maxSpeed?: number };

  // Actions
  actions: Pick<BattleActions,
    | 'setQIndex'
    | 'setTimelineProgress'
    | 'setExecutingCardIndex'
    | 'setUsedCardIndices'
    | 'setTimelineIndicatorVisible'
    | 'setDisappearingCards'
    | 'setHiddenCards'
    | 'setPlayer'
  >;
  addLog: (msg: string) => void;

  // Callbacks
  executeCardAction: () => void;
}

/**
 * 타임라인 진행 로직을 제공하는 훅
 *
 * @returns stepOnce 함수 - 타임라인 한 스텝 진행
 */
export function useTimelineProgression(deps: TimelineProgressionDeps) {
  const {
    battleRef,
    breachSelectionRef,
    timelineAnimationRef,
    growingDefenseRef,
    escapeUsedThisTurnRef,
    stepOnceRef,
    player,
    enemy,
    actions,
    addLog,
    executeCardAction,
  } = deps;

  const stepOnce = useCallback(() => {
    // 브리치 선택 대기 중이면 진행 차단
    if (breachSelectionRef.current) return;

    const currentBattle = battleRef.current;
    if (!currentBattle || currentBattle.qIndex >= currentBattle.queue.length) return;
    const a = currentBattle.queue[currentBattle.qIndex];

    // 죽은 적의 카드 스킵 (적 체력 0 이하이고 적 카드인 경우)
    const currentEnemy = currentBattle.enemy || enemy;
    if (a.actor === 'enemy' && currentEnemy.hp <= 0) {
      const newQIndex = currentBattle.qIndex + 1;
      actions.setQIndex(newQIndex);
      battleRef.current = { ...battleRef.current!, qIndex: newQIndex };
      return;
    }

    // 타임라인 밖 적 카드 스킵 (sp > maxSpeed인 경우)
    const enemyMaxSpeedCheck = currentEnemy.maxSpeed || DEFAULT_ENEMY_MAX_SPEED;
    if (a.actor === 'enemy' && (a.sp ?? 0) > enemyMaxSpeedCheck) {
      addLog(`🚫 "${a.card?.name}" 타임라인 범위 초과로 실행 불가 (sp: ${a.sp} > ${enemyMaxSpeedCheck})`);
      const newQIndex = currentBattle.qIndex + 1;
      actions.setQIndex(newQIndex);
      battleRef.current = { ...battleRef.current!, qIndex: newQIndex };
      return;
    }

    const currentQIndex = currentBattle.qIndex;

    // 타임라인 progress 업데이트 (공통 최대 속도 기준 비율로)
    const playerMaxSpeed = player?.maxSpeed || DEFAULT_PLAYER_MAX_SPEED;
    const enemyMaxSpeed = enemy?.maxSpeed || DEFAULT_ENEMY_MAX_SPEED;
    const commonMaxSpeed = Math.max(playerMaxSpeed, enemyMaxSpeed);
    const targetProgress = ((a.sp ?? 0) / commonMaxSpeed) * 100;

    // 이전 애니메이션 정리
    if (timelineAnimationRef.current) {
      cancelAnimationFrame(timelineAnimationRef.current);
      timelineAnimationRef.current = null;
    }

    // 부드러운 타임라인 진행 애니메이션 (방어자세 실시간 방어력용)
    const startProgress = currentBattle.timelineProgress || 0;
    const animationDuration = TIMING.CARD_EXECUTION_DELAY;
    const startTime = performance.now();

    const animateProgress = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      const currentProgress = startProgress + (targetProgress - startProgress) * progress;

      // 방어자세 실시간 방어력 업데이트
      if (growingDefenseRef.current && battleRef.current) {
        const currentTimelineSp = Math.floor((currentProgress / 100) * commonMaxSpeed);
        const { activatedSp, totalDefenseApplied = 0 } = growingDefenseRef.current;
        const totalDefenseNeeded = Math.max(0, currentTimelineSp - activatedSp);
        const defenseDelta = totalDefenseNeeded - totalDefenseApplied;
        if (defenseDelta > 0) {
          const currentPlayer = battleRef.current.player || player;
          const newBlock = (currentPlayer.block || 0) + defenseDelta;
          actions.setPlayer({ ...currentPlayer, block: newBlock, def: true });
          if (battleRef.current) {
            battleRef.current.player = { ...battleRef.current.player, block: newBlock, def: true };
          }
          growingDefenseRef.current.totalDefenseApplied = totalDefenseNeeded;
        }
      }

      // flushSync로 강제 동기 렌더링 (방어자세 실시간 업데이트용)
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

    // 시곗바늘 이동 완료 후 카드 발동 및 실행
    setTimeout(() => {
      // 실행 중인 카드 표시 (흔들림 애니메이션)
      actions.setExecutingCardIndex(currentQIndex);

      // 흔들림 애니메이션 종료 후 빛 바래짐 처리
      setTimeout(() => {
        actions.setExecutingCardIndex(null);
        const currentBattle = battleRef.current;
        if (currentBattle) {
          const currentUsedIndices = currentBattle.usedCardIndices || [];
          actions.setUsedCardIndices([...currentUsedIndices, currentQIndex]);
        }
      }, TIMING.CARD_SHAKE_DURATION);

      // 마지막 카드면 페이드아웃
      if (currentQIndex >= currentBattle.queue.length - 1) {
        setTimeout(() => {
          actions.setTimelineIndicatorVisible(false);
        }, TIMING.CARD_FADEOUT_DELAY);
      }

      // 카드 소멸 이펙트는 플레이어만 적용
      if (a.actor === 'player') {
        if (hasTrait(a.card, 'escape' as import("../../../types/core").CardTrait)) {
          escapeUsedThisTurnRef.current.add(a.card.id);
        }
        setTimeout(() => {
          const currentBattle = battleRef.current;
          if (currentBattle) {
            const currentDisappearing = currentBattle.disappearingCards || [];
            actions.setDisappearingCards([...currentDisappearing, currentQIndex]);
            setTimeout(() => {
              const currentBattle = battleRef.current;
              if (currentBattle) {
                const currentHidden = currentBattle.hiddenCards || [];
                const currentDisappearing2 = currentBattle.disappearingCards || [];
                actions.setHiddenCards([...currentHidden, currentQIndex]);
                actions.setDisappearingCards(currentDisappearing2.filter(i => i !== currentQIndex));
              }
            }, TIMING.CARD_DISAPPEAR_DURATION);
          }
        }, TIMING.CARD_DISAPPEAR_START);
      }

      executeCardAction();
    }, TIMING.CARD_EXECUTION_DELAY);
  }, [
    battleRef,
    breachSelectionRef,
    timelineAnimationRef,
    growingDefenseRef,
    escapeUsedThisTurnRef,
    player,
    enemy,
    actions,
    addLog,
    executeCardAction,
  ]);

  // stepOnceRef에 저장 (브리치 선택 후 진행 재개용)
  stepOnceRef.current = stepOnce;

  return { stepOnce };
}
