/**
 * @file soundUtils.test.ts
 * @description 사운드 유틸리티 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// AudioContext 모킹
const mockOscillator = {
  connect: vi.fn(),
  frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  type: 'sine' as OscillatorType,
  start: vi.fn(),
  stop: vi.fn(),
};

const mockGainNode = {
  connect: vi.fn(),
  gain: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
};

const mockBiquadFilter = {
  connect: vi.fn(),
  type: 'lowpass' as BiquadFilterType,
  frequency: { value: 0 },
};

const mockBufferSource = {
  connect: vi.fn(),
  buffer: null,
  start: vi.fn(),
  stop: vi.fn(),
};

class MockAudioContext {
  currentTime = 0;
  destination = {};
  sampleRate = 44100;
  createOscillator = vi.fn(() => ({ ...mockOscillator }));
  createGain = vi.fn(() => ({ ...mockGainNode }));
  createBiquadFilter = vi.fn(() => ({ ...mockBiquadFilter }));
  createBufferSource = vi.fn(() => ({ ...mockBufferSource }));
  createBuffer = vi.fn((channels: number, length: number) => ({
    numberOfChannels: channels,
    length,
    sampleRate: this.sampleRate,
    getChannelData: vi.fn(() => new Float32Array(length)),
  }));
}

// window.AudioContext 모킹
const originalAudioContext = globalThis.AudioContext;

describe('soundUtils', () => {
  beforeEach(() => {
    vi.resetModules();
    // @ts-expect-error - 테스트용 모킹
    globalThis.AudioContext = MockAudioContext;
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.AudioContext = originalAudioContext;
  });

  describe('사운드 함수 존재 확인', () => {
    it('주요 사운드 함수가 export됨', async () => {
      const soundUtils = await import('./soundUtils');

      // 실제 export된 함수들 확인
      expect(typeof soundUtils.playHitSound).toBe('function');
      expect(typeof soundUtils.playBlockSound).toBe('function');
      expect(typeof soundUtils.playVictorySound).toBe('function');
      expect(typeof soundUtils.playDangerSound).toBe('function');
      expect(typeof soundUtils.playCardSubmitSound).toBe('function');
      expect(typeof soundUtils.playProceedSound).toBe('function');
    });

    it('playHitSound 함수가 에러 없이 호출됨', async () => {
      const { playHitSound } = await import('./soundUtils');
      expect(() => playHitSound()).not.toThrow();
    });

    it('playBlockSound 함수가 에러 없이 호출됨', async () => {
      const { playBlockSound } = await import('./soundUtils');
      expect(() => playBlockSound()).not.toThrow();
    });

    it('playVictorySound 함수가 에러 없이 호출됨', async () => {
      const { playVictorySound } = await import('./soundUtils');
      expect(() => playVictorySound()).not.toThrow();
    });

    it('playDangerSound 함수가 에러 없이 호출됨', async () => {
      const { playDangerSound } = await import('./soundUtils');
      expect(() => playDangerSound()).not.toThrow();
    });

    it('playCardSubmitSound 함수가 에러 없이 호출됨', async () => {
      const { playCardSubmitSound } = await import('./soundUtils');
      expect(() => playCardSubmitSound()).not.toThrow();
    });

    it('playProceedSound 함수가 에러 없이 호출됨', async () => {
      const { playProceedSound } = await import('./soundUtils');
      expect(() => playProceedSound()).not.toThrow();
    });
  });

  describe('추가 사운드 함수', () => {
    it('playRewardSound 함수가 존재하고 호출 가능', async () => {
      const { playRewardSound } = await import('./soundUtils');
      expect(() => playRewardSound()).not.toThrow();
    });

    it('playDoorSound 함수가 존재하고 호출 가능', async () => {
      const { playDoorSound } = await import('./soundUtils');
      expect(() => playDoorSound()).not.toThrow();
    });

    it('playParrySound 함수가 존재하고 호출 가능', async () => {
      const { playParrySound } = await import('./soundUtils');
      expect(() => playParrySound()).not.toThrow();
    });

    it('playFreezeSound 함수가 존재하고 호출 가능', async () => {
      const { playFreezeSound } = await import('./soundUtils');
      expect(() => playFreezeSound()).not.toThrow();
    });

    it('playCardDestroySound 함수가 존재하고 호출 가능', async () => {
      const { playCardDestroySound } = await import('./soundUtils');
      expect(() => playCardDestroySound()).not.toThrow();
    });

    it('playSecretSound 함수가 존재하고 호출 가능', async () => {
      const { playSecretSound } = await import('./soundUtils');
      expect(() => playSecretSound()).not.toThrow();
    });

    it('playInteractSound 함수가 존재하고 호출 가능', async () => {
      const { playInteractSound } = await import('./soundUtils');
      expect(() => playInteractSound()).not.toThrow();
    });

    it('playChoiceAppearSound 함수가 존재하고 호출 가능', async () => {
      const { playChoiceAppearSound } = await import('./soundUtils');
      expect(() => playChoiceAppearSound()).not.toThrow();
    });

    it('playChoiceSelectSound 함수가 존재하고 호출 가능', async () => {
      const { playChoiceSelectSound } = await import('./soundUtils');
      expect(() => playChoiceSelectSound()).not.toThrow();
    });

    it('playFootstepSound 함수가 존재하고 호출 가능', async () => {
      const { playFootstepSound } = await import('./soundUtils');
      expect(() => playFootstepSound()).not.toThrow();
    });
  });

  describe('playSound 범용 함수', () => {
    it('기본 인자로 호출 가능', async () => {
      const { playSound } = await import('./soundUtils');
      expect(() => playSound()).not.toThrow();
    });

    it('커스텀 주파수와 지속시간으로 호출 가능', async () => {
      const { playSound } = await import('./soundUtils');
      expect(() => playSound(440, 200)).not.toThrow();
    });
  });

  describe('에러 처리', () => {
    it('AudioContext 생성 실패 시 조용히 실패', async () => {
      // @ts-expect-error - 테스트용 에러 발생 모킹
      globalThis.AudioContext = class {
        constructor() {
          throw new Error('AudioContext 생성 실패');
        }
      };

      vi.resetModules();
      const { playHitSound } = await import('./soundUtils');

      // 에러를 throw하지 않아야 함 (조용히 실패)
      expect(() => playHitSound()).not.toThrow();
    });
  });
});
