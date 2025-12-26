/**
 * @file battleResolver.ts
 * @description 전투 해결 시뮬레이터
 *
 * ## 기능
 * - 공격/방어/지원 카드 적용
 * - 승패 판정 (victory/defeat/draw)
 * - 여러 라운드 시뮬레이션
 */

import { CARD_LIBRARY } from "../data/cards";
import type {
  ResolverActorStats as ActorStats,
  ResolverBattleStats as BattleStats,
  ResolverCard as Card,
  ResolverTimelineEntry as TimelineEntry,
  ResolverAttackResult as AttackResult,
  ResolverBlockResult as BlockResult,
  ResolverSupportResult as SupportResult,
  ResolverLogDetail as LogDetail,
  ResolverLogRecord as LogRecord,
  ResolverBattleStatus as BattleStatus,
  ResolverSimulationResult as SimulationResult
} from '../types';

const DEFAULT_STATS: BattleStats = {
  player: { hp: 50, block: 0 },
  enemy: { hp: 40, block: 0 },
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const cloneState = (stats: BattleStats = DEFAULT_STATS): BattleStats => ({
  player: { hp: stats.player?.hp ?? 50, block: stats.player?.block ?? 0 },
  enemy: { hp: stats.enemy?.hp ?? 40, block: stats.enemy?.block ?? 0 },
});

const applyAttack = (
  _attacker: ActorStats,
  defender: ActorStats,
  card: Card
): AttackResult => {
  const damage = card.damage ?? 0;
  const blocked = Math.min(defender.block, damage);
  const hpDamage = Math.max(0, damage - blocked);
  defender.block = Math.max(0, defender.block - damage);
  defender.hp = clamp(defender.hp - hpDamage, 0, defender.hp);
  return { blocked, hpDamage };
};

const applyBlock = (actor: ActorStats, card: Card): BlockResult => {
  const block = card.block ?? 0;
  actor.block = (actor.block ?? 0) + block;
  return { block };
};

const applySupport = (
  _actor: ActorStats,
  card: Card,
  status: BattleStatus
): SupportResult | null => {
  if (card.tags?.includes("buff")) {
    status[`${card.id}_buff`] = true;
    return { buff: card.id };
  }
  return null;
};

export const simulateBattle = (
  timeline: TimelineEntry[] = [],
  stats: BattleStats = DEFAULT_STATS
): SimulationResult => {
  const state = cloneState(stats);
  const initial = cloneState(stats);
  const status: BattleStatus = {};
  const log: LogRecord[] = [];
  let winner: 'player' | 'enemy' | 'draw' = 'draw';

  for (const entry of timeline) {
    if (state.player.hp <= 0 || state.enemy.hp <= 0) break;
    const card = CARD_LIBRARY[entry.cardId] as any;
    if (!card) continue;
    const actorKey = entry.actor;
    const targetKey: 'player' | 'enemy' = actorKey === "player" ? "enemy" : "player";
    const actor = state[actorKey];
    const target = state[targetKey];

    const record: LogRecord = {
      order: entry.order,
      actor: actorKey,
      cardId: card.id,
      name: card.name,
      speedCost: entry.speedCost,
      detail: null,
      actorHP: actor.hp,
      actorBlock: actor.block,
      targetHP: target.hp,
      targetBlock: target.block,
    };

    if (card.damage) {
      const result = applyAttack(actor, target, card);
      record.detail = {
        type: "attack",
        blocked: result.blocked,
        hpDamage: result.hpDamage,
        targetHP: target.hp,
        targetBlock: target.block,
      };
    } else if (card.block) {
      const result = applyBlock(actor, card);
      record.detail = {
        type: "block",
        block: result.block,
        actorBlock: actor.block,
      };
    } else {
      const result = applySupport(actor, card, status);
      record.detail = {
        type: "support",
        ...result,
      };
    }

    log.push(record);
    if (state.player.hp <= 0 || state.enemy.hp <= 0) break;
  }

  if (state.player.hp > 0 && state.enemy.hp <= 0) {
    winner = "player";
  } else if (state.enemy.hp > 0 && state.player.hp <= 0) {
    winner = "enemy";
  } else {
    winner = state.player.hp >= state.enemy.hp ? "player" : "enemy";
  }

  return {
    winner,
    log,
    finalState: state,
    initialState: initial,
    status,
  };
};

export const pickOutcome = (
  simulation: SimulationResult | null,
  fallback: string = "victory"
): string => {
  if (!simulation) return fallback;
  if (simulation.winner === "player") return "victory";
  if (simulation.winner === "enemy") return "defeat";
  return fallback;
};
