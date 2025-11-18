// 웹 오디오 API를 사용한 사운드 효과 유틸리티

let audioContext = null;

// AudioContext 초기화 (사용자 상호작용 후 한 번만)
function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

/**
 * 피격 사운드 재생 (낮은 주파수, 짧은 지속시간)
 */
export function playHitSound() {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // 낮은 주파수 (140Hz) - 둔탁한 타격음
    oscillator.frequency.value = 140;
    oscillator.type = 'sine';

    // 볼륨 엔벨로프 (빠르게 페이드아웃)
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  } catch (error) {
    console.warn('Failed to play hit sound:', error);
  }
}

/**
 * 방어력 획득 사운드 재생 (높은 주파수, 밝은 톤)
 */
export function playBlockSound() {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // 높은 주파수 (800Hz → 1200Hz) - 방어막 전개 소리
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    oscillator.type = 'triangle';

    // 볼륨 엔벨로프
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  } catch (error) {
    console.warn('Failed to play block sound:', error);
  }
}

/**
 * 카드 제출 사운드 재생 (중간 주파수, 짧고 경쾌한 톤)
 */
export function playCardSubmitSound() {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // 중간 주파수 (523Hz - C5 음) - 카드 제출 소리
    oscillator.frequency.value = 523;
    oscillator.type = 'sine';

    // 볼륨 엔벨로프 (짧고 경쾌하게)
    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  } catch (error) {
    console.warn('Failed to play card submit sound:', error);
  }
}
