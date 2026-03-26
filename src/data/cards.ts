/**
 * @file cards.ts
 * @description 카드 라이브러리 정의
 *
 * 이 파일은 battleData.ts의 카드 데이터를 레거시 호환용으로 재export합니다.
 * 새로운 코드에서는 battleData.ts의 CARDS를 직접 사용하세요.
 */

import type { Card } from '../types';
import { CARDS, DEFAULT_STARTING_DECK } from '../components/battle/battleData';

// battleData.ts의 카드 배열을 Record 형식으로 변환
function buildCardLibrary(): Record<string, Card> {
  const library: Record<string, Card> = {};

  for (const card of CARDS) {
    library[card.id] = {
      id: card.id,
      name: card.name,
      type: card.type as Card['type'],
      tags: card.traits || [],
      speedCost: card.speedCost,
      actionCost: card.actionCost,
      priority: 'normal',
      damage: card.damage,
      block: card.block,
      description: card.description,
    };
  }

  return library;
}

/** 카드 라이브러리 (battleData.ts 기반) */
export const CARD_LIBRARY: Record<string, Card> = buildCardLibrary();

/** 플레이어 시작 덱 (battleData.ts 기반) */
export const PLAYER_STARTER_DECK = DEFAULT_STARTING_DECK;

/** 적 덱 (battleData.ts의 ENEMY_CARDS 사용) */
export const ENEMY_DECKS = {
  // 구울 덱
  ghoul: ["ghoul_attack", "ghoul_attack", "ghoul_block", "ghoul_block"],
  // 약탈자 덱
  marauder: ["marauder_attack", "marauder_block"],
  // 탈영병 덱
  deserter: ["deserter_attack", "deserter_block", "deserter_double", "deserter_offense"],
  // 살육자 덱
  slaughterer: ["slaughterer_heavy", "slaughterer_blur_block", "slaughterer_quick", "slaughterer_rest"],
  // 1막 신규 - 들쥐
  wildrat: ["wildrat_bite", "wildrat_bite", "wildrat_swarm", "wildrat_flee"],
  // 1막 신규 - 폭주자
  berserker: ["berserker_slam", "berserker_rage", "berserker_charge", "berserker_roar"],
  // 1막 신규 - 오염체
  polluted: ["polluted_spit", "polluted_spit", "polluted_cloud", "polluted_explode"],
  // 1막 신규 - 현상금 사냥꾼
  hunter: ["hunter_shoot", "hunter_shoot", "hunter_trap", "hunter_aim", "hunter_execute"],
  // 1막 보스 - 탈영병 대장
  captain: ["captain_slash", "captain_slash", "captain_command", "captain_rally", "captain_execution", "captain_fortify"],
  // 기본 (폴백)
  default: ["ghoul_attack", "ghoul_block", "marauder_attack"],
};
