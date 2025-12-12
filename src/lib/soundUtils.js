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

/**
 * 진행 버튼 사운드 재생 (상승하는 주파수, 확정적인 톤)
 */
export function playProceedSound() {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // 상승하는 주파수 (400Hz → 600Hz) - 진행 확정 소리
    oscillator.frequency.setValueAtTime(400, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
    oscillator.type = 'square';

    // 볼륨 엔벨로프
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  } catch (error) {
    console.warn('Failed to play proceed sound:', error);
  }
}

/**
 * 카드 파괴 사운드 재생 (찢기는 소리 - 노이즈 + 하강 주파수)
 */
export function playCardDestroySound() {
  try {
    const ctx = getAudioContext();

    // 노이즈 생성 (찢기는 효과)
    const bufferSize = ctx.sampleRate * 0.3;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    // 필터 (고주파 노이즈 - 종이 찢는 소리)
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;

    const noiseGain = ctx.createGain();
    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noiseGain.gain.setValueAtTime(0.25, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    noiseSource.start(ctx.currentTime);
    noiseSource.stop(ctx.currentTime + 0.25);

    // 하강 톤 (파괴 효과)
    const oscillator = ctx.createOscillator();
    const oscGain = ctx.createGain();
    oscillator.connect(oscGain);
    oscGain.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(300, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.2);
    oscillator.type = 'sawtooth';

    oscGain.gain.setValueAtTime(0.15, ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  } catch (error) {
    console.warn('Failed to play card destroy sound:', error);
  }
}

/**
 * 빙결 사운드 재생 (얼어붙는 소리 - 고음 + 결정화 효과)
 */
export function playFreezeSound() {
  try {
    const ctx = getAudioContext();

    // 메인 빙결 톤 (상승하는 고음)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.frequency.setValueAtTime(800, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.3);
    osc1.type = 'sine';

    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.4);

    // 결정화 효과 (빠른 트릴)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.frequency.setValueAtTime(1200, ctx.currentTime);
    osc2.type = 'triangle';

    // LFO로 트릴 효과
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.connect(lfoGain);
    lfoGain.connect(osc2.frequency);
    lfo.frequency.value = 20;
    lfoGain.gain.value = 200;

    gain2.gain.setValueAtTime(0.1, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    lfo.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    lfo.stop(ctx.currentTime + 0.35);
    osc2.stop(ctx.currentTime + 0.35);

    // 얼음 깨지는 클릭음
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.connect(gain3);
    gain3.connect(ctx.destination);

    osc3.frequency.value = 3000;
    osc3.type = 'square';

    gain3.gain.setValueAtTime(0.08, ctx.currentTime + 0.05);
    gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc3.start(ctx.currentTime + 0.05);
    osc3.stop(ctx.currentTime + 0.1);
  } catch (error) {
    console.warn('Failed to play freeze sound:', error);
  }
}
