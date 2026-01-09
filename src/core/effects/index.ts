/**
 * @file index.ts
 * @description 효과 시스템 공개 API
 */

export { RELIC_AUDIO, RELIC_TONE_BY_TYPE } from './effect-audio';
export type { RelicAudioConfig } from './effect-audio';

export {
  CARD_AUDIO,
  COMBAT_AUDIO,
  ETHER_AUDIO,
  PHASE_AUDIO,
  UI_AUDIO,
} from './ui-audio';
export type { AudioConfig } from './ui-audio';

export {
  EffectRegistry,
  EFFECT_TIMING_DESCRIPTIONS,
} from './effects';

export type {
  EffectTiming,
  EffectContext,
  EffectResult,
  EffectHandler,
  TurnState,
} from './effects';

export {
  registerAllRelicEffects,
  registerRelicEffect,
  unregisterRelicEffect,
  clearRegistry,
  executeDamageTakenEffects,
  executeRelicActivateEffects,
  executeCombatStartEffects,
  executeCombatEndEffects,
  executeTurnStartEffects,
  executeTurnEndEffects,
  executeShopEnterEffects,
  executeShopPurchaseEffects,
  executeCardPlayedEffects,
  executeCardExhaustEffects,
} from './relic-registration';

export {
  BATTLE_TIMING,
  UI_TIMING,
  MESSAGE_TIMING,
  INIT_TIMING,
} from './animation-timing';
export type { AnimationTiming } from './animation-timing';
