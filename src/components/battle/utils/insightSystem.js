/**
 * insightSystem.js
 *
 * 통찰(Insight) 시스템 - 적 정보 공개 레벨 관리
 */

/**
 * 유효 통찰 계산: 플레이어 통찰 - 적의 장막
 * @param {number} playerInsight - 플레이어 통찰
 * @param {number} enemyShroud - 적의 장막
 * @returns {number} 유효 통찰
 */
export const calculateEffectiveInsight = (playerInsight, enemyShroud) => {
  return Math.max(0, (playerInsight || 0) - (enemyShroud || 0));
};

/**
 * 통찰 레벨별 적 정보 공개
 * @param {number} effectiveInsight - 유효 통찰 (player.insight - enemy.shroud)
 * @param {Array} enemyActions - 적의 행동 계획
 * @returns {object} 공개할 정보 레벨
 */
export const getInsightRevealLevel = (effectiveInsight, enemyActions) => {
  if (!enemyActions || enemyActions.length === 0) {
    return { level: 0, visible: false };
  }

  if (effectiveInsight === 0) {
    // 레벨 0: 정보 없음
    return { level: 0, visible: false };
  }

  if (effectiveInsight === 1) {
    // 레벨 1: 카드 개수와 대략적 순서
    return {
      level: 1,
      visible: true,
      cardCount: enemyActions.length,
      showRoughOrder: true,
      actions: enemyActions.map((action, idx) => ({
        index: idx,
        isFirst: idx === 0,
        isLast: idx === enemyActions.length - 1,
      })),
    };
  }

  if (effectiveInsight === 2) {
    // 레벨 2: 정확한 카드 이름과 속도
    return {
      level: 2,
      visible: true,
      cardCount: enemyActions.length,
      showCards: true,
      showSpeed: true,
      actions: enemyActions.map((action, idx) => ({
        index: idx,
        card: action.card,
        speed: action.speed,
      })),
    };
  }

  // 레벨 3+: 모든 정보 (특수 패턴, 면역 등)
  return {
    level: 3,
    visible: true,
    cardCount: enemyActions.length,
    showCards: true,
    showSpeed: true,
    showEffects: true,
    fullDetails: true,
    actions: enemyActions.map((action, idx) => ({
      index: idx,
      card: action.card,
      speed: action.speed,
      effects: action.card?.effects,
      traits: action.card?.traits,
    })),
  };
};

/**
 * 통찰 레벨에 따른 짧은 효과음
 * @param {number} level - 통찰 레벨 (1, 2, 3+)
 */
export const playInsightSound = (level = 1) => {
  try {
    // eslint-disable-next-line no-undef
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextClass();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    const base = level === 3 ? 880 : level === 2 ? 720 : 560;
    osc.frequency.value = base;
    osc.type = 'triangle';
    gain.gain.setValueAtTime(0.16, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.45);
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.5);
  } catch {
    // 사운드 실패 시 무시
  }
};
