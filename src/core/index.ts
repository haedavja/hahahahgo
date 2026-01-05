/**
 * @file index.ts
 * @description 공통 코어 모듈 진입점
 */

// 전투 코어
export * from './combat';

// 어댑터
export * as GameTokenAdapter from './adapters/game-token-adapter';
export * as SimulatorTokenAdapter from './adapters/simulator-token-adapter';
