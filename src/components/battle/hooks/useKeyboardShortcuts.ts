/**
 * @file useKeyboardShortcuts.ts
 * @description 전투 화면 키보드 단축키 처리 훅
 *
 * ## 지원 단축키
 * - Enter/Space: 진행/확인
 * - 1-5: 손패 카드 선택
 * - R: 리드로우
 * - O: 에테르 폭주 토글
 * - ESC: 선택 취소/메뉴
 */

import { useEffect, useRef } from 'react';
import { calculateEtherSlots } from '../../../lib/etherUtils';
import { setStorageString } from '../../../lib/storageUtils';
import { UI_AUDIO } from '../../../core/effects';
import type { Card, PlayerBattleState, OrderItem } from '../../../types';
import type { BattlePhase } from '../reducer/battleReducerActions';

/**
 * 키보드 단축키 훅 파라미터에서 사용되는 전투 상태 일부
 */
interface KeyboardShortcutsBattleState {
  phase: BattlePhase;
  selected: Card[];
  qIndex: number;
  queue: OrderItem[];
}

/**
 * 키보드 단축키 훅에서 사용되는 액션 함수들
 */
interface KeyboardShortcutsActions {
  setShowCharacterSheet: (value: boolean | ((prev: boolean) => boolean)) => void;
  setIsSimplified: (value: boolean | ((prev: boolean) => boolean)) => void;
  setWillOverdrive: (value: boolean | ((prev: boolean) => boolean)) => void;
  setAutoProgress: (value: boolean) => void;
}

/**
 * 전투 키보드 단축키 훅
 * @param params - 키보드 단축키 설정 파라미터
 * @param params.battle - 전투 상태
 * @param params.player - 플레이어 상태
 * @param params.canRedraw - 리드로우 가능 여부
 * @param params.autoProgress - 자동 진행 여부
 * @param params.etherFinalValue - 에테르 최종값
 * @param params.actions - 상태 업데이트 함수 모음
 * @param params.startResolve - 진행 시작 함수
 * @param params.beginResolveFromRespond - 대응에서 진행 시작 함수
 * @param params.redrawHand - 손패 리드로우 함수
 * @param params.finishTurn - 턴 종료 함수
 * @param params.cycleSortType - 정렬 타입 순환 함수
 * @param params.playSound - 사운드 재생 함수
 */
export function useKeyboardShortcuts({
  battle,
  player,
  canRedraw,
  autoProgress,
  etherFinalValue,
  actions,
  startResolve,
  beginResolveFromRespond,
  redrawHand,
  finishTurn,
  cycleSortType,
  playSound
}: {
  battle: KeyboardShortcutsBattleState;
  player: PlayerBattleState;
  canRedraw: boolean;
  autoProgress: boolean;
  etherFinalValue: number | null;
  actions: KeyboardShortcutsActions;
  startResolve: () => void;
  beginResolveFromRespond: () => void;
  redrawHand: () => void;
  finishTurn: (reason: string) => void;
  cycleSortType: () => void;
  playSound: (frequency: number, duration: number) => void;
}) {
  // Refs로 최신 함수 참조 유지 (stale closure 방지)
  const callbacksRef = useRef({
    startResolve,
    beginResolveFromRespond,
    redrawHand,
    finishTurn,
    cycleSortType,
    playSound,
    actions
  });

  // 매 렌더마다 최신 함수로 업데이트
  useEffect(() => {
    callbacksRef.current = {
      startResolve,
      beginResolveFromRespond,
      redrawHand,
      finishTurn,
      cycleSortType,
      playSound,
      actions
    };
  });

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const { actions, startResolve, beginResolveFromRespond, redrawHand, finishTurn, cycleSortType, playSound } = callbacksRef.current;

      // C 키: 캐릭터 창 토글
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        e.stopPropagation();
        actions.setShowCharacterSheet((prev: boolean) => !prev);
      }

      // Q 키: 간소화 모드 토글 (선택 단계)
      if ((e.key === "q" || e.key === "Q") && battle.phase === 'select') {
        e.preventDefault();
        actions.setIsSimplified((prev: boolean) => {
          const newVal = !prev;
          setStorageString('battleIsSimplified', newVal.toString());
          return newVal;
        });
      }

      // E 키: 선택 단계에서 제출
      if ((e.key === "e" || e.key === "E") && battle.phase === 'select' && battle.selected.length > 0) {
        e.preventDefault();
        startResolve();
        playSound(UI_AUDIO.SHORTCUT.tone, UI_AUDIO.SHORTCUT.duration);
      }

      // E 키: 대응 단계에서 진행
      if ((e.key === "e" || e.key === "E") && battle.phase === 'respond') {
        e.preventDefault();
        beginResolveFromRespond();
      }

      // R 키: 리드로우 (선택 단계)
      if ((e.key === "r" || e.key === "R") && battle.phase === 'select' && canRedraw) {
        e.preventDefault();
        redrawHand();
      }

      // 스페이스바: 기원 토글 (선택/대응 단계)
      if (e.key === " " && (battle.phase === 'select' || battle.phase === 'respond')) {
        e.preventDefault(); // 스페이스바 기본 동작 방지 (스크롤)
        const etherSlots = calculateEtherSlots(player.etherPts || 0);
        if (etherSlots > 0) {
          actions.setWillOverdrive((v: boolean) => !v);
        }
      }

      // E 키: 진행 단계에서 자동 진행 토글 또는 턴 종료
      if ((e.key === "e" || e.key === "E") && battle.phase === 'resolve') {
        e.preventDefault();
        if (battle.qIndex < battle.queue.length) {
          // 타임라인 진행 중이면 진행 토글
          actions.setAutoProgress(!autoProgress);
        } else if (etherFinalValue !== null) {
          // 타임라인 끝나고 최종값 표시되면 턴 종료
          finishTurn('키보드 단축키 (E)');
        }
      }

      // F 키: 카드 정렬 (선택 단계)
      if ((e.key === "f" || e.key === "F") && battle.phase === 'select') {
        e.preventDefault();
        cycleSortType();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);

  }, [
    battle.phase,
    battle.selected,
    battle.qIndex,
    battle.queue.length,
    canRedraw,
    player.etherPts,
    autoProgress,
    etherFinalValue
  ]);
}
