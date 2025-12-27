/**
 * @file soundUtils.ts
 * @description 웹 오디오 API 사운드 효과
 *
 * ## 사운드 종류
 * - 피격/회복/카드선택/위험 등
 * - Oscillator 기반 합성음
 *
 * ## 아키텍처
 * - playOscillator: 단순 오실레이터 사운드 헬퍼
 * - createNoise: 노이즈 버퍼 생성 헬퍼
 * - 개별 사운드 함수들은 헬퍼를 조합하여 사용
 */

let audioContext: AudioContext | null = null;

/** 개발 모드에서만 오디오 에러 로깅 */
function logAudioError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.warn(`Failed to play ${context}:`, error);
  }
}

/**
 * AudioContext 초기화 (사용자 상호작용 후 한 번만)
 */
function getAudioContext(): AudioContext {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioContext = new AudioContextClass();
  }
  return audioContext;
}

// ========== 공통 헬퍼 ==========

interface OscillatorConfig {
  frequency: number;
  endFrequency?: number;
  type?: OscillatorType;
  gain?: number;
  duration?: number;
  startDelay?: number;
  rampTime?: number;
}

/**
 * 단순 오실레이터 사운드 재생
 */
function playOscillator(ctx: AudioContext, config: OscillatorConfig): void {
  const {
    frequency,
    endFrequency,
    type = 'sine',
    gain = 0.15,
    duration = 0.15,
    startDelay = 0,
    rampTime = duration,
  } = config;

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  const startTime = ctx.currentTime + startDelay;

  if (endFrequency) {
    osc.frequency.setValueAtTime(frequency, startTime);
    osc.frequency.exponentialRampToValueAtTime(endFrequency, startTime + rampTime);
  } else {
    osc.frequency.value = frequency;
  }
  osc.type = type;

  gainNode.gain.setValueAtTime(gain, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

interface NoiseConfig {
  duration: number;
  filterType?: BiquadFilterType;
  filterFrequency?: number;
  gain?: number;
  fadeOut?: boolean;
}

/**
 * 노이즈 사운드 재생
 */
function playNoise(ctx: AudioContext, config: NoiseConfig): void {
  const {
    duration,
    filterType = 'lowpass',
    filterFrequency = 800,
    gain = 0.15,
    fadeOut = true,
  } = config;

  const bufferSize = ctx.sampleRate * duration;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = fadeOut
      ? (Math.random() * 2 - 1) * (1 - i / bufferSize)
      : Math.random() * 2 - 1;
  }

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFrequency;

  const gainNode = ctx.createGain();
  noiseSource.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  gainNode.gain.setValueAtTime(gain, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  noiseSource.start(ctx.currentTime);
  noiseSource.stop(ctx.currentTime + duration);
}

/**
 * 멜로디 (여러 음 연속 재생)
 */
function playMelody(
  ctx: AudioContext,
  notes: number[],
  interval: number,
  config: Omit<OscillatorConfig, 'frequency' | 'startDelay'> = {}
): void {
  notes.forEach((freq, i) => {
    playOscillator(ctx, {
      ...config,
      frequency: freq,
      startDelay: i * interval,
    });
  });
}

// ========== 사운드 함수 ==========

/** 피격 사운드 (낮은 주파수, 짧은 지속시간) */
export function playHitSound(): void {
  try {
    const ctx = getAudioContext();
    playOscillator(ctx, { frequency: 140, gain: 0.3, duration: 0.15 });
  } catch (error) {
    logAudioError('hit sound', error);
  }
}

/** 방어력 획득 사운드 (높은 주파수, 밝은 톤) */
export function playBlockSound(): void {
  try {
    const ctx = getAudioContext();
    playOscillator(ctx, {
      frequency: 800,
      endFrequency: 1200,
      type: 'triangle',
      gain: 0.2,
      duration: 0.2,
      rampTime: 0.1,
    });
  } catch (error) {
    logAudioError('block sound', error);
  }
}

/** 카드 제출 사운드 (중간 주파수, 짧고 경쾌한 톤) */
export function playCardSubmitSound(): void {
  try {
    const ctx = getAudioContext();
    playOscillator(ctx, { frequency: 523, gain: 0.15, duration: 0.1 });
  } catch (error) {
    logAudioError('card submit sound', error);
  }
}

/** 진행 버튼 사운드 (상승하는 주파수) */
export function playProceedSound(): void {
  try {
    const ctx = getAudioContext();
    playOscillator(ctx, {
      frequency: 400,
      endFrequency: 600,
      type: 'square',
      gain: 0.2,
      duration: 0.2,
      rampTime: 0.15,
    });
  } catch (error) {
    logAudioError('proceed sound', error);
  }
}

/** 카드 파괴 사운드 (찢기는 소리 - 노이즈 + 하강 주파수) */
export function playCardDestroySound(): void {
  try {
    const ctx = getAudioContext();
    // 노이즈 파트
    playNoise(ctx, {
      duration: 0.25,
      filterType: 'highpass',
      filterFrequency: 2000,
      gain: 0.25,
      fadeOut: false,
    });
    // 오실레이터 파트
    playOscillator(ctx, {
      frequency: 300,
      endFrequency: 80,
      type: 'sawtooth',
      gain: 0.15,
      duration: 0.2,
    });
  } catch (error) {
    logAudioError('card destroy sound', error);
  }
}

/** 빙결 사운드 (얼어붙는 소리 - 고음 + 결정화 효과) */
export function playFreezeSound(): void {
  try {
    const ctx = getAudioContext();
    // 상승 사인파
    playOscillator(ctx, {
      frequency: 800,
      endFrequency: 2000,
      gain: 0.15,
      duration: 0.4,
      rampTime: 0.3,
    });
    // 트레몰로 효과 (LFO)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1200;
    osc2.type = 'triangle';

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

    // 결정화 효과
    playOscillator(ctx, {
      frequency: 3000,
      type: 'square',
      gain: 0.08,
      duration: 0.05,
      startDelay: 0.05,
    });
  } catch (error) {
    logAudioError('freeze sound', error);
  }
}

/** 문 열기/방 이동 사운드 */
export function playDoorSound(): void {
  try {
    const ctx = getAudioContext();
    playNoise(ctx, {
      duration: 0.2,
      filterType: 'lowpass',
      filterFrequency: 400,
      gain: 0.15,
    });
    // 저음 진동
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.frequency.setValueAtTime(80, ctx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.25);
    osc.type = 'sine';

    oscGain.gain.setValueAtTime(0, ctx.currentTime);
    oscGain.gain.setValueAtTime(0.2, ctx.currentTime + 0.1);
    oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.start(ctx.currentTime + 0.1);
    osc.stop(ctx.currentTime + 0.3);
  } catch (error) {
    logAudioError('door sound', error);
  }
}

/** 아이템/보상 획득 사운드 */
export function playRewardSound(): void {
  try {
    const ctx = getAudioContext();
    playMelody(ctx, [523, 659, 784], 0.08, { duration: 0.3 });
  } catch (error) {
    logAudioError('reward sound', error);
  }
}

/** 발걸음 소리 */
export function playFootstepSound(): void {
  try {
    const ctx = getAudioContext();
    playNoise(ctx, {
      duration: 0.05,
      filterType: 'lowpass',
      filterFrequency: 800,
      gain: 0.08,
    });
  } catch (error) {
    logAudioError('footstep sound', error);
  }
}

/** 비밀 발견 사운드 */
export function playSecretSound(): void {
  try {
    const ctx = getAudioContext();
    playOscillator(ctx, {
      frequency: 440,
      endFrequency: 880,
      gain: 0.12,
      duration: 0.5,
      rampTime: 0.4,
    });
    playOscillator(ctx, {
      frequency: 880,
      endFrequency: 1760,
      type: 'triangle',
      gain: 0.08,
      duration: 0.5,
      rampTime: 0.4,
    });
  } catch (error) {
    logAudioError('secret sound', error);
  }
}

/** 던전 완료 사운드 (팡파레) */
export function playVictorySound(): void {
  try {
    const ctx = getAudioContext();
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const duration = i === 3 ? 0.6 : 0.2;
      const startTime = ctx.currentTime + i * 0.12;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = freq;
      osc.type = i === 3 ? 'triangle' : 'sine';

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch (error) {
    logAudioError('victory sound', error);
  }
}

/** 실패/위험 사운드 */
export function playDangerSound(): void {
  try {
    const ctx = getAudioContext();
    // 두 개의 detuned sawtooth로 불안한 느낌
    playOscillator(ctx, {
      frequency: 300,
      endFrequency: 100,
      type: 'sawtooth',
      gain: 0.15,
      duration: 0.35,
      rampTime: 0.3,
    });
    playOscillator(ctx, {
      frequency: 320,
      endFrequency: 90,
      type: 'sawtooth',
      gain: 0.1,
      duration: 0.35,
      rampTime: 0.3,
    });
  } catch (error) {
    logAudioError('danger sound', error);
  }
}

/** 상호작용 사운드 (오브젝트 터치) */
export function playInteractSound(): void {
  try {
    const ctx = getAudioContext();
    playOscillator(ctx, {
      frequency: 600,
      endFrequency: 800,
      gain: 0.12,
      duration: 0.1,
      rampTime: 0.08,
    });
  } catch (error) {
    logAudioError('interact sound', error);
  }
}

/** 선택지 등장 사운드 */
export function playChoiceAppearSound(): void {
  try {
    const ctx = getAudioContext();
    playMelody(ctx, [523, 659], 0.1, { gain: 0.1, duration: 0.15 });
  } catch (error) {
    logAudioError('choice appear sound', error);
  }
}

/** 선택 확정 사운드 */
export function playChoiceSelectSound(): void {
  try {
    const ctx = getAudioContext();
    playOscillator(ctx, {
      frequency: 440,
      endFrequency: 880,
      type: 'square',
      gain: 0.1,
      duration: 0.15,
      rampTime: 0.1,
    });
  } catch (error) {
    logAudioError('choice select sound', error);
  }
}

/** 패리 성공 사운드 (팅! - 높은 금속성 소리) */
export function playParrySound(): void {
  try {
    const ctx = getAudioContext();
    playOscillator(ctx, {
      frequency: 1800,
      endFrequency: 1200,
      gain: 0.25,
      duration: 0.2,
      rampTime: 0.15,
    });
    playOscillator(ctx, {
      frequency: 2800,
      endFrequency: 2000,
      type: 'triangle',
      gain: 0.12,
      duration: 0.12,
      rampTime: 0.1,
    });
  } catch (error) {
    logAudioError('parry sound', error);
  }
}
