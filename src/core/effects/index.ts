/**
 * @file index.ts
 * @description 효과 시스템 공개 API
 */

export { RELIC_AUDIO, RELIC_TONE_BY_TYPE } from './effect-audio';
export type { RelicAudioConfig } from './effect-audio';

export {
  EffectRegistry,
  EFFECT_TIMING_DESCRIPTIONS,
} from './effects';

export type {
  EffectTiming,
  EffectContext,
  EffectResult,
  EffectHandler,
} from './effects';
