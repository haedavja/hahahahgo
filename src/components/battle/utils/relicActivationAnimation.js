/**
 * @file relicActivationAnimation.js
 * @description 상징 발동 애니메이션 시스템
 *
 * ## 기능
 * - 카드 사용 시 상징 발동 체크
 * - 상징 발동 시퀀스 애니메이션
 * - 플래시 효과
 */

import { RELICS } from "../../../data/relics";

/**
 * 카드 사용 시 발동할 상징 목록 수집
 * @param {Object} params - 파라미터
 * @param {Array} params.orderedRelicList - 정렬된 상징 ID 목록
 * @param {number} params.resolvedPlayerCards - 해결된 플레이어 카드 수
 * @param {Array} params.playerTimeline - 플레이어 타임라인
 * @param {Object} params.triggeredRefs - 발동 추적 ref 객체
 * @returns {Array} 발동할 상징 목록 [{ id, tone, duration }, ...]
 */
export function collectTriggeredRelics({
  orderedRelicList,
  resolvedPlayerCards,
  playerTimeline,
  triggeredRefs
}) {
  const newCount = resolvedPlayerCards + 1;
  const isLastPlayerCard = playerTimeline?.length > 0 && newCount === playerTimeline.length;
  const triggered = [];

  orderedRelicList.forEach(relicId => {
    const relic = RELICS[relicId];

    // 에테르 결정: 카드마다 콤보 배율 증가 (comboMultiplierPerCard)
    if (relic?.effects?.type === 'PASSIVE' && relic?.effects?.comboMultiplierPerCard) {
      triggered.push({ id: relicId, tone: 800, duration: 500 });
    }
    // 희귀한 조약돌, 참고서 등: 에테르 배율 증가
    else if (relic?.effects?.type === 'PASSIVE' && (relic?.effects?.etherCardMultiplier || relicId === 'rareStone' || relic?.effects?.etherMultiplier)) {
      if (relicId === 'referenceBook') {
        // 참고서는 마지막 카드에서만 한 번 발동
        if (isLastPlayerCard && !triggeredRefs.referenceBookTriggered.current) {
          triggeredRefs.referenceBookTriggered.current = true;
          triggered.push({ id: relicId, tone: 820, duration: 500 });
        }
        return;
      }
      // 희귀한 조약돌 등: 카드마다 즉시 발동
      triggered.push({ id: relicId, tone: 820, duration: 400 });
    }
    // 악마의 주사위: 5장째 카드에서 발동
    else if (relic?.effects?.type === 'PASSIVE' && relic?.effects?.etherFiveCardBonus && newCount >= 5 && !triggeredRefs.devilDiceTriggered.current) {
      triggeredRefs.devilDiceTriggered.current = true;
      triggered.push({ id: relicId, tone: 980, duration: 800 });
    }
  });

  return triggered;
}

/**
 * 상징 발동 애니메이션 시퀀스 실행
 * @param {Array} triggered - 발동할 상징 목록
 * @param {Function} flashRelic - 상징 플래시 함수
 * @param {Function} setRelicActivated - 상징 활성화 상태 설정 함수
 */
export function playRelicActivationSequence(triggered, flashRelic, setRelicActivated) {
  if (triggered.length === 0) return;

  const playSeq = (idx = 0) => {
    if (idx >= triggered.length) {
      setRelicActivated(null);
      return;
    }
    const item = triggered[idx];
    flashRelic(item.id, item.tone, item.duration);
    setTimeout(() => playSeq(idx + 1), Math.max(200, item.duration * 0.6));
  };

  playSeq(0);
}
