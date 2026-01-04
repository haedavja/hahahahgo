/**
 * @file useBattleResultCallbacks.ts
 * @description 전투 결과 콜백 훅
 *
 * ## 주요 기능
 * - 전투 결과 알림
 * - 캐릭터 시트 닫기
 * - 맵으로 나가기
 */

import { useCallback, type MutableRefObject } from 'react';
import type { BattleResult } from '../../../types';

interface PlayerState {
  etherPts?: number;
  hp?: number;
  maxHp?: number;
  [key: string]: unknown;
}

interface EnemyState {
  hp?: number;
  [key: string]: unknown;
}

interface PostCombatOptions {
  type?: 'victory' | 'defeat';
  isEtherVictory?: boolean;
  [key: string]: unknown;
}

interface UseBattleResultCallbacksParams {
  player: PlayerState;
  enemy: EnemyState | null;
  postCombatOptions: PostCombatOptions | null;
  initialEtherRef: MutableRefObject<number>;
  resultSentRef: MutableRefObject<boolean>;
  onBattleResult?: (result: BattleResult) => void;
  actions: {
    setShowCharacterSheet: (show: boolean) => void;
  };
}

interface BattleResultCallbacks {
  notifyBattleResult: (resultType: string, isEtherVictory?: boolean) => void;
  closeCharacterSheet: () => void;
  handleExitToMap: () => void;
}

/**
 * 전투 결과 콜백 훅
 */
export function useBattleResultCallbacks(params: UseBattleResultCallbacksParams): BattleResultCallbacks {
  const {
    player,
    enemy,
    postCombatOptions,
    initialEtherRef,
    resultSentRef,
    onBattleResult,
    actions
  } = params;

  const notifyBattleResult = useCallback((resultType: string, isEtherVictoryOverride?: boolean) => {
    if (!resultType || resultSentRef.current) return;
    const finalEther = (player.etherPts as number);
    const delta = finalEther - ((initialEtherRef.current as number) ?? 0);
    // isEtherVictoryOverride가 명시적으로 전달되면 사용, 아니면 postCombatOptions에서 가져옴
    const isEtherVictory = isEtherVictoryOverride ?? postCombatOptions?.isEtherVictory ?? false;
    onBattleResult?.({
      result: resultType as BattleResult['result'],
      playerEther: finalEther,
      deltaEther: delta,
      playerHp: player.hp,
      playerMaxHp: player.maxHp,
      isEtherVictory
    });
    resultSentRef.current = true;
  }, [player.etherPts, player.hp, player.maxHp, onBattleResult, initialEtherRef, resultSentRef, postCombatOptions?.isEtherVictory]);

  const closeCharacterSheet = useCallback(() => {
    actions.setShowCharacterSheet(false);
  }, [actions]);

  const handleExitToMap = useCallback(() => {
    const outcome = postCombatOptions?.type || (enemy && enemy.hp !== undefined && enemy.hp <= 0 ? 'victory' : (player && player.hp !== undefined && player.hp <= 0 ? 'defeat' : null));
    if (!outcome) return;
    // 영혼파괴 여부도 함께 전달
    notifyBattleResult(outcome, postCombatOptions?.isEtherVictory);
    if (typeof window !== 'undefined' && window.top === window) {
      setTimeout(() => { window.location.href = '/'; }, 100);
    }
  }, [postCombatOptions, enemy, player, notifyBattleResult]);

  return {
    notifyBattleResult,
    closeCharacterSheet,
    handleExitToMap
  };
}
