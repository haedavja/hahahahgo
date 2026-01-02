/**
 * @file useBattleRefSync.ts
 * @description 전투 상태 ref 동기화 훅
 *
 * ## 주요 기능
 * - battle 상태와 battleRef 동기화
 * - resolve 단계 진입 시 에테르 배율 캡처
 * - devForceAllCards ref 동기화
 * - relic order 병합
 */

import { useEffect, useRef, type MutableRefObject } from 'react';
import type { BattlePhase } from '../reducer/battleReducerActions';

interface BattleState {
  phase: BattlePhase;
  nextTurnEffects?: Record<string, unknown>;
  [key: string]: unknown;
}

interface PlayerState {
  etherMultiplier?: number;
  [key: string]: unknown;
}

interface UseBattleRefSyncParams {
  // battle/ref 동기화
  battle: BattleState;
  battleRef: MutableRefObject<BattleState>;

  // 에테르 배율 캡처
  player: PlayerState;
  displayEtherMultiplierRef: MutableRefObject<number>;

  // devForceAllCards
  devForceAllCards: boolean;
  devForceAllCardsRef: MutableRefObject<boolean>;

  // relic order
  relics: string[];
  orderedRelicList: string[];
  mergeRelicOrder: (relics: string[], orderedList: string[]) => string[];
  actions: {
    setOrderedRelics: (relics: string[]) => void;
  };
}

/**
 * 전투 상태 ref 동기화 훅
 */
export function useBattleRefSync(params: UseBattleRefSyncParams): void {
  const {
    battle,
    battleRef,
    player,
    displayEtherMultiplierRef,
    devForceAllCards,
    devForceAllCardsRef,
    relics,
    orderedRelicList,
    mergeRelicOrder,
    actions
  } = params;

  // actions.setOrderedRelics를 ref로 저장하여 의존성 배열에서 actions 제거
  // (actions 객체가 매 렌더링마다 새로 생성되어 무한 루프 발생 방지)
  const setOrderedRelicsRef = useRef(actions.setOrderedRelics);
  setOrderedRelicsRef.current = actions.setOrderedRelics;

  // devForceAllCards ref 동기화
  useEffect(() => {
    devForceAllCardsRef.current = devForceAllCards;
  }, [devForceAllCards, devForceAllCardsRef]);

  // battle 상태가 변경될 때마다 ref 업데이트
  // nextTurnEffects는 동기적으로 업데이트되므로 기존 값 보존
  useEffect(() => {
    const currentNextTurnEffects = battleRef.current?.nextTurnEffects;
    battleRef.current = {
      ...battle,
      // nextTurnEffects가 이미 설정되어 있으면 기존 값 보존 (동기 업데이트된 값)
      nextTurnEffects: currentNextTurnEffects && Object.keys(currentNextTurnEffects).length > 0
        ? { ...battle.nextTurnEffects, ...currentNextTurnEffects }
        : battle.nextTurnEffects
    };
  }, [battle, battleRef]);

  // resolve 단계 진입 시 에테르 배율 캡처 (애니메이션 중 리셋되어도 표시 유지)
  useEffect(() => {
    if (battle.phase === 'resolve') {
      displayEtherMultiplierRef.current = (player.etherMultiplier as number) || 1;
    }
  }, [battle.phase, player.etherMultiplier, displayEtherMultiplierRef]);

  // 새 상징 추가/제거 시 기존 순서를 유지하면서 병합
  // 진행 단계에서는 동기화/변경을 막아 일관성 유지
  useEffect(() => {
    if (battle.phase === 'resolve') return;
    setOrderedRelicsRef.current(mergeRelicOrder(relics, orderedRelicList));
  }, [relics, mergeRelicOrder, battle.phase, orderedRelicList]);
}
