/**
 * etherAccumulationProcessing.js
 *
 * 카드 사용 시 에테르 누적 처리 시스템
 */

/**
 * 플레이어 카드 사용 시 에테르 누적 처리
 * @param {Object} params - 파라미터
 * @param {Object} params.card - 사용한 카드
 * @param {number} params.turnEtherAccumulated - 현재 턴 누적 에테르
 * @param {Array} params.orderedRelicList - 정렬된 상징 ID 목록
 * @param {Object} params.cardUpgrades - 카드 업그레이드 정보
 * @param {number} params.resolvedPlayerCards - 해결된 플레이어 카드 수
 * @param {Array} params.playerTimeline - 플레이어 타임라인
 * @param {Array} params.relics - 상징 목록
 * @param {Object} params.triggeredRefs - 발동 추적 ref 객체
 * @param {Function} params.calculatePassiveEffects - 패시브 효과 계산 함수
 * @param {Function} params.getCardEtherGain - 카드 에테르 획득 계산 함수
 * @param {Function} params.collectTriggeredRelics - 발동할 상징 수집 함수
 * @param {Function} params.playRelicActivationSequence - 상징 애니메이션 재생 함수
 * @param {Function} params.flashRelic - 상징 플래시 함수
 * @param {Object} params.actions - 상태 업데이트 함수 모음
 * @returns {Object} { newTurnEther, newResolvedPlayerCards }
 */
export function processPlayerEtherAccumulation({
  card,
  turnEtherAccumulated,
  orderedRelicList,
  cardUpgrades,
  resolvedPlayerCards,
  playerTimeline,
  relics,
  triggeredRefs,
  calculatePassiveEffects,
  getCardEtherGain,
  collectTriggeredRelics,
  playRelicActivationSequence,
  flashRelic,
  actions
}) {
  // 유령카드는 에테르 획득 제외
  if (card.isGhost) {
    const newCount = resolvedPlayerCards + 1;
    actions.setResolvedPlayerCards(newCount);
    return { newTurnEther: turnEtherAccumulated, newResolvedPlayerCards: newCount };
  }

  // 희귀한 조약돌 효과: 카드당 획득 에테르 2배
  const passiveRelicEffects = calculatePassiveEffects(orderedRelicList);
  const upgradedRarity = cardUpgrades[card.id];
  const cardForEther = upgradedRarity ? { ...card, rarity: upgradedRarity } : card;
  const etherPerCard = Math.floor(getCardEtherGain(cardForEther) * passiveRelicEffects.etherMultiplier);

  const newTurnEther = turnEtherAccumulated + etherPerCard;
  actions.setTurnEtherAccumulated(newTurnEther);

  // PT 증가 애니메이션
  actions.setEtherPulse(true);
  setTimeout(() => actions.setEtherPulse(false), 300);

  // 플레이어 카드 진행 시 상징 발동
  const newCount = resolvedPlayerCards + 1;

  // 상징이 있으면 발동 애니메이션 및 사운드 (좌→우 순차 재생)
  if (relics.length > 0) {
    const triggered = collectTriggeredRelics({
      orderedRelicList,
      resolvedPlayerCards,
      playerTimeline,
      triggeredRefs
    });

    playRelicActivationSequence(triggered, flashRelic, actions.setRelicActivated);
  }

  actions.setResolvedPlayerCards(newCount);

  return { newTurnEther, newResolvedPlayerCards: newCount };
}

/**
 * 적 카드 사용 시 에테르 누적 처리
 * @param {Object} params - 파라미터
 * @param {Object} params.card - 사용한 카드
 * @param {number} params.enemyTurnEtherAccumulated - 현재 턴 누적 적 에테르
 * @param {Function} params.getCardEtherGain - 카드 에테르 획득 계산 함수
 * @param {Object} params.actions - 상태 업데이트 함수 모음
 * @returns {number} 새로운 적 에테르 누적값
 */
export function processEnemyEtherAccumulation({
  card,
  enemyTurnEtherAccumulated,
  getCardEtherGain,
  actions
}) {
  // 유령카드는 에테르 획득 제외
  if (card.isGhost) {
    return enemyTurnEtherAccumulated;
  }

  const newEnemyTurnEther = enemyTurnEtherAccumulated + getCardEtherGain(card);
  actions.setEnemyTurnEtherAccumulated(newEnemyTurnEther);
  return newEnemyTurnEther;
}
