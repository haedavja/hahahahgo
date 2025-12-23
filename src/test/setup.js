/**
 * Vitest 테스트 셋업 파일
 */
import '@testing-library/jest-dom';

// 전역 모킹 (필요시)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Audio API 모킹
global.AudioContext = class AudioContext {
  createOscillator() {
    return {
      connect: () => {},
      start: () => {},
      stop: () => {},
      frequency: { setValueAtTime: () => {} },
      type: 'sine'
    };
  }
  createGain() {
    return {
      connect: () => {},
      gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {} }
    };
  }
  get destination() { return {}; }
  get currentTime() { return 0; }
};
