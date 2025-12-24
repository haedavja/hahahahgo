/**
 * @file useMultiTargetSelection.js
 * @description 다중 타겟 선택 훅
 * @typedef {import('../../../types').Card} Card
 *
 * ## 기능
 * - multiTarget 특성 카드의 타겟 선택
 * - 피해량 분배 처리
 * - 유닛별 타겟 지정
 */

import { useCallback } from 'react';

/**
 * 다중 타겟 선택 훅
 * @param {Object} params
 * @param {Card|null} params.battlePendingDistributionCard - 분배 대기 카드
 * @param {Object} params.battleDamageDistribution - 피해 분배 상태
 * @param {Object[]} params.enemyUnits - 적 유닛 배열
 * @param {Function} params.addLog - 로그 추가
 * @param {Object} params.actions - 상태 업데이트 액션
 * @returns {{handleConfirmDistribution: Function, handleTargetClick: Function}}
 */
export function useMultiTargetSelection({
  battlePendingDistributionCard,
  battleDamageDistribution,
  enemyUnits,
  addLog,
  actions
}) {
  // 타겟 선택 확정: 카드에 선택된 타겟 목록을 저장하고 선택에 추가
  const handleConfirmDistribution = useCallback(() => {
    const pendingCard = battlePendingDistributionCard;
    if (!pendingCard) return;

    const targetSelection = battleDamageDistribution;
    // 선택된 타겟 목록 추출
    const selectedTargets = Object.entries(targetSelection)
      .filter(([_, isSelected]) => isSelected === true)
      .map(([unitId]) => parseInt(unitId, 10));

    if (selectedTargets.length === 0) {
      actions.resetDistribution();
      return;
    }

    // 타겟 목록을 카드에 저장
    const cardWithTargets = {
      ...pendingCard,
      __targetUnitIds: selectedTargets,
    };

    // 선택에 추가
    actions.addSelected(cardWithTargets);
    actions.resetDistribution();

    const targetNames = selectedTargets.map(id => {
      const unit = enemyUnits.find(u => u.unitId === id);
      return unit?.name || `유닛${id}`;
    });
    addLog(`🎯 다중 타겟: ${targetNames.join(', ')}`);
  }, [battlePendingDistributionCard, battleDamageDistribution, actions, addLog, enemyUnits]);

  // 타겟 선택 취소
  const handleCancelDistribution = useCallback(() => {
    actions.resetDistribution();
  }, [actions]);

  // 타겟 선택 모드 시작 (공격 카드 선택 시)
  const startDamageDistribution = useCallback((card) => {
    actions.setPendingDistributionCard(card);
    actions.setDamageDistribution({});
    actions.setDistributionMode(true);
  }, [actions]);

  return {
    handleConfirmDistribution,
    handleCancelDistribution,
    startDamageDistribution
  };
}
