/**
 * @file battleHelpers.js
 * @description 전투 관련 헬퍼 함수
 *
 * ## 기능
 * - 전투 초기화
 * - 적 생성
 * - 손패 드로우
 * - 전투 시뮬레이션
 */

import { ENEMY_DECKS } from "../data/cards";
import { CARDS, ENEMIES, getRandomEnemy, getRandomEnemyGroupByNode, getEnemyGroupDetails } from "../components/battle/battleData";
import { drawHand, buildSpeedTimeline } from "../lib/speedQueue";
import { simulateBattle } from "../lib/battleResolver";
import {
  BATTLE_TYPES,
  BATTLE_REWARDS,
  BATTLE_LABEL,
  BATTLE_STATS,
  MAX_PLAYER_SELECTION,
  cloneNodes,
  createEventPayload,
} from "./gameStoreHelpers";

// 전투에서 사용되는 카드 8종의 ID 배열
export const BATTLE_CARDS = CARDS.slice(0, 8).map(card => card.id);

export const resolveEnemyDeck = (kind) => ENEMY_DECKS[kind] ?? ENEMY_DECKS.default ?? [];

export const computeBattlePlan = (kind, playerCards, enemyCards, currentPlayerHp = null, currentMaxHp = null, enemyCount = 1) => {
  const timeline = buildSpeedTimeline(playerCards, enemyCards, 30);
  const baseStats = BATTLE_STATS[kind] ?? BATTLE_STATS.default;
  const battleStats = currentPlayerHp !== null
    ? {
        ...baseStats,
        player: {
          ...baseStats.player,
          hp: currentPlayerHp,
          maxHp: currentMaxHp ?? currentPlayerHp
        }
      }
    : baseStats;

  const scaledEnemyHp = Math.max(1, Math.round((battleStats.enemy?.hp ?? 40) * enemyCount));
  const scaledEnemy = {
    ...battleStats.enemy,
    hp: scaledEnemyHp,
    maxHp: scaledEnemyHp,
    enemyCount,
  };
  const finalStats = {
    ...battleStats,
    enemy: scaledEnemy,
  };

  return {
    preview: {
      playerHand: playerCards,
      enemyHand: enemyCards,
      timeline,
      tuLimit: 30,
    },
    simulation: simulateBattle(timeline, finalStats),
    enemyCount,
  };
};

export const drawCharacterBuildHand = (mainSpecials, subSpecials, ownedCards = []) => {
  // 1. 주특기 카드는 100% 등장
  const mainCards = mainSpecials.map((cardId) => cardId);
  // 2. 보조특기 카드는 각각 50% 확률로 등장
  const subCards = subSpecials.filter(() => Math.random() < 0.5);
  // 3. 나머지 보유 카드 (주특기/보조특기 제외) 각각 10% 확률로 등장
  const usedCardIds = new Set([...mainSpecials, ...subSpecials]);
  const otherCards = ownedCards
    .filter(cardId => !usedCardIds.has(cardId))
    .filter(() => Math.random() < 0.1);

  const cardIds = [...mainCards, ...subCards, ...otherCards];
  return drawHand(cardIds, cardIds.length);
};

export const createBattlePayload = (node, characterBuild, playerHp = null, maxHp = null) => {
  if (!node || !BATTLE_TYPES.has(node.type) || node.isStart) return null;

  const hasCharacterBuild = characterBuild && (characterBuild.mainSpecials?.length > 0 || characterBuild.subSpecials?.length > 0 || characterBuild.ownedCards?.length > 0);

  const playerLibrary = hasCharacterBuild
    ? [...characterBuild.mainSpecials, ...characterBuild.subSpecials]
    : [...BATTLE_CARDS];

  // 노드 레이어 번호를 기반으로 적 그룹 선택
  const nodeNumber = node.layer ?? 1;
  let enemyGroup;

  if (node.type === 'boss') {
    enemyGroup = getEnemyGroupDetails('slaughterer_solo');
  } else if (node.type === 'elite') {
    const eliteGroups = ['deserter_solo', 'deserter_marauders'];
    const randomId = eliteGroups[Math.floor(Math.random() * eliteGroups.length)];
    enemyGroup = getEnemyGroupDetails(randomId);
  } else {
    const group = getRandomEnemyGroupByNode(nodeNumber);
    enemyGroup = getEnemyGroupDetails(group.id);
  }

  const enemies = enemyGroup?.enemies || [];
  const enemyCount = enemies.length || 1;

  const enemyLibrary = [];
  enemies.forEach(enemy => {
    if (enemy?.deck) {
      enemyLibrary.push(...enemy.deck);
    }
  });

  if (enemyLibrary.length === 0) {
    const baseEnemyDeck = resolveEnemyDeck(node.type);
    enemyLibrary.push(...baseEnemyDeck);
  }

  const playerDrawPile = hasCharacterBuild ? [] : [...playerLibrary];
  const enemyDrawPile = [...enemyLibrary];

  const playerHand = hasCharacterBuild
    ? drawCharacterBuildHand(characterBuild.mainSpecials, characterBuild.subSpecials, characterBuild.ownedCards)
    : drawHand(playerDrawPile, 3);

  const enemyHandSize = Math.max(enemyCount, Math.min(enemyDrawPile.length, 3 * enemyCount));
  const enemyHand = drawHand(enemyDrawPile, enemyHandSize);
  const { preview, simulation } = computeBattlePlan(node.type, playerHand, enemyHand, playerHp, maxHp, enemyCount);

  const totalEnemyHp = enemies.reduce((sum, e) => sum + (e?.hp || 40), 0);

  const mixedEnemies = enemies.map(e => ({
    id: e?.id,
    name: e?.name || '적',
    emoji: e?.emoji || '👾',
    hp: e?.hp || 40,
    maxHp: e?.hp || 40,
    ether: e?.ether || 100,
    deck: e?.deck || [],
    cardsPerTurn: e?.cardsPerTurn || 2,
    passives: e?.passives || {},
    tier: e?.tier || 1,
    isBoss: e?.isBoss || false,
  }));

  return {
    nodeId: node.id,
    kind: node.type,
    label: enemyGroup?.name || node.displayLabel || BATTLE_LABEL[node.type] || node.type.toUpperCase(),
    enemyCount,
    totalEnemyHp,
    mixedEnemies,
    rewards: BATTLE_REWARDS[node.type] ?? {},
    difficulty: node.type === "boss" ? 5 : node.type === "elite" ? 4 : node.type === "dungeon" ? 3 : 2,
    playerLibrary,
    playerDrawPile,
    playerDiscardPile: [],
    enemyLibrary,
    enemyDrawPile,
    enemyDiscardPile: [],
    playerHand,
    enemyHand,
    selectedCardIds: [],
    maxSelection: MAX_PLAYER_SELECTION,
    preview,
    simulation,
    hasCharacterBuild,
    characterBuild: hasCharacterBuild ? characterBuild : null,
  };
};

export const travelToNode = (state, nodeId) => {
  const nodes = cloneNodes(state.map.nodes);
  const target = nodes.find((n) => n.id === nodeId);
  if (!target || !target.selectable || target.cleared) return null;

  nodes.forEach((node) => {
    if (!node.cleared) node.selectable = false;
  });
  target.cleared = true;
  target.connections.forEach((id) => {
    const nextNode = nodes.find((n) => n.id === id);
    if (nextNode && !nextNode.cleared) nextNode.selectable = true;
  });

  const { payload: event, usedPendingEvent } = createEventPayload(
    target, state.mapRisk, state.completedEvents || [], state.pendingNextEvent
  );

  return {
    map: { ...state.map, nodes, currentNodeId: target.id },
    event,
    battle: createBattlePayload(target, state.characterBuild, state.playerHp, state.maxHp),
    target,
    usedPendingEvent,
  };
};
