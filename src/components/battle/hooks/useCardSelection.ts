/**
 * @file useCardSelection.js
 * @description 카드 선택/해제 및 순서 변경 처리 훅
 * @typedef {import('../../../types').Card} Card
 */

import { useCallback } from 'react';
import { applyAgility } from '../../../lib/agilityUtils';
import { detectPokerCombo, applyPokerBonus } from '../utils/comboDetection';
import { createFixedOrder } from '../utils/cardOrdering';
import type { OrderingCardInfo, Card, PlayerBattleState, EnemyUnit } from '../../../types';
import { getAllTokens } from '../../../lib/tokenUtils';

/**
 * 카드 선택 훅
 * 카드 선택/해제, 순서 변경 처리
 *
 * @param {Object} params
 * @param {string} params.battlePhase - 현재 페이즈
 * @param {Card[]} params.battleSelected - 선택된 카드들
 * @param {number} params.effectiveAgility - 유효 민첩
 * @param {number} params.effectiveMaxSubmitCards - 최대 제출 카드 수
 * @returns {{toggleCard: Function, reorderCard: Function, checkRequiredTokens: Function}}
 */
export function useCardSelection({
  battlePhase,
  battleSelected,
  selected,
  effectiveAgility,
  effectiveMaxSubmitCards,
  totalSpeed,
  totalEnergy,
  player,
  enemyUnits,
  hasMultipleUnits,
  selectedTargetUnit,
  enemyPlanActions,
  startDamageDistribution,
  playSound,
  addLog,
  actions
}: {
  battlePhase: string;
  battleSelected: Card[];
  selected: Card[];
  effectiveAgility: number;
  effectiveMaxSubmitCards: number;
  totalSpeed: number;
  totalEnergy: number;
  player: PlayerBattleState;
  enemyUnits: EnemyUnit[];
  hasMultipleUnits: boolean;
  selectedTargetUnit: any;
  enemyPlanActions: Card[];
  startDamageDistribution: any;
  playSound: any;
  addLog: any;
  actions: any;
}) {
  // 카드의 requiredTokens 요구사항 체크
  const checkRequiredTokens = useCallback((card: any, currentSelected: any) => {
    if (!card.requiredTokens || card.requiredTokens.length === 0) return { ok: true };

    const playerTokens = getAllTokens(player);

    for (const req of card.requiredTokens) {
      // 이미 선택된 카드들이 소모하는 해당 토큰 수 계산
      const alreadyReserved = currentSelected.reduce((sum: any, c: any) => {
        if (!c.requiredTokens) return sum;
        const sameReq = c.requiredTokens.find((r: any) => r.id === req.id);
        return sum + (sameReq ? sameReq.stacks : 0);
      }, 0);

      // 플레이어가 보유한 해당 토큰 수
      const playerToken = playerTokens.find((t: any) => t.id === req.id);
      const playerStacks = playerToken?.stacks || 0;

      // 사용 가능한 토큰 수 = 보유량 - 이미 선택된 카드가 요구하는 양
      const available = playerStacks - alreadyReserved;

      if (available < req.stacks) {
        const tokenName = playerToken?.name || req.id;
        return { ok: false, message: `⚠️ ${tokenName} 부족 (필요: ${req.stacks}, 사용 가능: ${available})` };
      }
    }
    return { ok: true };
  }, [player]);

  // 카드 선택/해제 토글
  const toggle = useCallback((card: any) => {
    if (battlePhase !== 'select' && battlePhase !== 'respond') return;
    // __handUid 또는 __uid로 개별 카드 식별
    const cardUid = card.__handUid || card.__uid;
    const exists = selected.some((s: any) => (s.__handUid || s.__uid) === cardUid);
    if (battlePhase === 'respond') {
      let next;
      const cardSpeed = applyAgility(card.speedCost, effectiveAgility);
      if (exists) {
        next = selected.filter((s: any) => (s.__handUid || s.__uid) !== cardUid);
        playSound(400, 80);
      }
      else {
        if (selected.length >= effectiveMaxSubmitCards) { addLog(`⚠️ 최대 ${effectiveMaxSubmitCards}장의 카드만 제출할 수 있습니다`); return; }
        if (totalSpeed + cardSpeed > (player.maxSpeed ?? 30)) { addLog('⚠️ 속도 초과'); return; }
        if (totalEnergy + card.actionCost > player.maxEnergy) { addLog('⚠️ 행동력 부족'); return; }
        const tokenCheck = checkRequiredTokens(card, selected);
        if (!tokenCheck.ok) { addLog(tokenCheck.message); return; }

        // 다중 타겟 카드 (multiTarget 특성): 타겟 선택 모드 진입
        const aliveUnitsCount = enemyUnits.filter((u: any) => u.hp > 0).length;
        const isMultiTargetCard = card.traits?.includes('multiTarget');
        if (isMultiTargetCard && hasMultipleUnits && aliveUnitsCount > 1) {
          const cardWithUid = {
            ...card,
            __uid: card.__handUid || Math.random().toString(36).slice(2),
          };
          startDamageDistribution(cardWithUid);
          playSound(600, 80);
          return;
        }

        // 공격 카드인 경우 현재 선택된 타겟 유닛 ID 저장
        const cardWithTarget = {
          ...card,
          __uid: card.__handUid || Math.random().toString(36).slice(2),
          __targetUnitId: card.type === 'attack' && hasMultipleUnits ? selectedTargetUnit : null
        };
        next = [...selected, cardWithTarget];
        playSound(800, 80);
      }
      const combo = detectPokerCombo(next as any);
      const enhanced = applyPokerBonus(next as any, combo);
      const withSp = createFixedOrder(enhanced as unknown as OrderingCardInfo[], enemyPlanActions as any, effectiveAgility);
      actions.setFixedOrder(withSp);
      actions.setSelected(next);
      return;
    }
    const cardSpeed = applyAgility(card.speedCost, effectiveAgility);
    if (exists) {
      actions.setSelected(battleSelected.filter((s: any) => (s.__handUid || s.__uid) !== cardUid));
      playSound(400, 80);
      return;
    }
    if (battleSelected.length >= effectiveMaxSubmitCards) return addLog(`⚠️ 최대 ${effectiveMaxSubmitCards}장의 카드만 제출할 수 있습니다`);
    if (totalSpeed + cardSpeed > (player.maxSpeed ?? 30)) return addLog('⚠️ 속도 초과');
    if (totalEnergy + card.actionCost > player.maxEnergy) return addLog('⚠️ 행동력 부족');
    const tokenCheck = checkRequiredTokens(card, selected);
    if (!tokenCheck.ok) return addLog(tokenCheck.message);

    // 다중 타겟 카드 (multiTarget 특성): 타겟 선택 모드 진입
    const aliveUnitsCount = enemyUnits.filter((u: any) => u.hp > 0).length;
    const isMultiTargetCard = card.traits?.includes('multiTarget');
    if (isMultiTargetCard && hasMultipleUnits && aliveUnitsCount > 1) {
      const cardWithUid = {
        ...card,
        __uid: card.__handUid || Math.random().toString(36).slice(2),
      };
      startDamageDistribution(cardWithUid);
      playSound(600, 80);
      return;
    }

    // 공격 카드인 경우 현재 선택된 타겟 유닛 ID 저장
    const cardWithTarget = {
      ...card,
      __uid: card.__handUid || Math.random().toString(36).slice(2),
      __targetUnitId: card.type === 'attack' && hasMultipleUnits ? selectedTargetUnit : null
    };
    actions.setSelected([...selected, cardWithTarget]);
    playSound(800, 80);
  }, [battlePhase, battleSelected, selected, effectiveAgility, effectiveMaxSubmitCards, totalSpeed, totalEnergy, player, enemyUnits, hasMultipleUnits, selectedTargetUnit, enemyPlanActions, startDamageDistribution, playSound, addLog, actions, checkRequiredTokens]);

  // 카드 순서 위로 이동
  const moveUp = useCallback((i: any) => {
    if (i === 0) return;
    if (battlePhase === 'respond') {
      const n = [...selected];
      [n[i - 1], n[i]] = [n[i], n[i - 1]];

      const combo = detectPokerCombo(n as any);
      const enhanced = applyPokerBonus(n as any, combo);
      const withSp = createFixedOrder(enhanced as unknown as OrderingCardInfo[], enemyPlanActions as any, effectiveAgility);
      actions.setFixedOrder(withSp);
      actions.setSelected(n);
    } else {
      const n = [...selected];
      [n[i - 1], n[i]] = [n[i], n[i - 1]];
      actions.setSelected(n);
    }
  }, [battlePhase, selected, enemyPlanActions, effectiveAgility, actions]);

  // 카드 순서 아래로 이동
  const moveDown = useCallback((i: any) => {
    if (i === battleSelected.length - 1) return;
    if (battlePhase === 'respond') {
      const n = [...selected];
      [n[i], n[i + 1]] = [n[i + 1], n[i]];

      const combo = detectPokerCombo(n as any);
      const enhanced = applyPokerBonus(n as any, combo);
      const withSp = createFixedOrder(enhanced as unknown as OrderingCardInfo[], enemyPlanActions as any, effectiveAgility);
      actions.setFixedOrder(withSp);
      actions.setSelected(n);
    } else {
      const n = [...selected];
      [n[i], n[i + 1]] = [n[i + 1], n[i]];
      actions.setSelected(n);
    }
  }, [battlePhase, battleSelected.length, selected, enemyPlanActions, effectiveAgility, actions]);

  return {
    toggle,
    moveUp,
    moveDown,
    checkRequiredTokens
  };
}
