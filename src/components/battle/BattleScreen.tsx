/**
 * BattleScreen.tsx
 *
 * 전투 화면 컴포넌트 - 전투 페이로드 생성 및 BattleApp 렌더링
 */

import { FC, useMemo, useCallback, useState, useEffect } from "react";
import { useGameStore } from "../../state/gameStore";
import { BattleApp } from "./BattleApp";
import { DevTools } from "../dev/DevTools";
import { calculatePassiveEffects, applyCombatStartEffects } from "../../lib/relicEffects";
import { ENEMIES } from "./battleData";
import type {
  Card,
  TokenState,
  BattlePassives as Passives,
  BattleEnemyData as EnemyData,
  BattleEnemyUnit as EnemyUnit,
  BattleEnemyComposition as EnemyComposition,
  BattleData as Battle,
  BattlePayload,
  BattleResult,
} from '../../types';

const buildBattlePayload = (
  battle: Battle | null,
  etherPts: number,
  relics: string[],
  maxHp: number,
  playerInsight: number,
  playerEnergyBonus = 0,
  playerStrength = 0,
  playerMaxSpeedBonus = 0
): BattlePayload | null => {
  if (!battle) return null;
  const initialPlayer = battle.simulation?.initialState?.player;
  const initialEnemy = battle.simulation?.initialState?.enemy;

  let enemyCount = battle.enemyCount ?? 1;
  let enemyName = battle.label ?? "Enemy";
  let enemyHp = initialEnemy?.hp ? Math.round(initialEnemy.hp) : 30;
  let enemyDeck: Card[] = (initialEnemy?.deck as any) || [];

  let enemyComposition: EnemyComposition[] = [];
  let enemyUnits: EnemyUnit[] = [];

  if (battle.mixedEnemies && Array.isArray(battle.mixedEnemies) && battle.mixedEnemies.length > 0) {
    const mixedEnemies = battle.mixedEnemies;

    const unitMap = new Map<string, EnemyUnit>();
    mixedEnemies.forEach(e => {
      const key = e.id || e.name;
      if (!unitMap.has(key)) {
        unitMap.set(key, {
          id: e.id,
          name: e.name,
          emoji: e.emoji || "👾",
          count: 0,
          hp: 0,
          maxHp: 0,
          individualHp: e.hp || 40,
          individualMaxHp: e.maxHp || e.hp || 40,
          ether: 0,
          individualEther: e.ether || 100,
          speed: e.speed || 10,
          deck: e.deck || [],
          cardsPerTurn: 0,
          individualCardsPerTurn: e.cardsPerTurn || 2,
          passives: e.passives || {},
          tier: e.tier || 1,
          isBoss: e.isBoss || false,
          unitId: 0,
          block: 0,
          tokens: { permanent: [], turn: [], usage: [] },
        });
      }
      const unit = unitMap.get(key)!;
      unit.count += 1;
      unit.hp += e.hp || 40;
      unit.maxHp += e.maxHp || e.hp || 40;
      unit.ether += e.ether || 100;
      unit.cardsPerTurn += e.cardsPerTurn || 2;
    });

    enemyUnits = Array.from(unitMap.values()).map((unit, idx) => ({
      ...unit,
      unitId: idx,
      block: 0,
      tokens: { permanent: [], turn: [], usage: [] },
    }));

    if (!battle.label) {
      enemyName = enemyUnits.map(u => u.count > 1 ? `${u.name}×${u.count}` : u.name).join(' + ');
    }
    enemyHp = enemyUnits.reduce((sum, u) => sum + u.hp, 0);
    enemyDeck = mixedEnemies.flatMap(e => e.deck || []) as any;
    enemyCount = mixedEnemies.length;
    enemyComposition = enemyUnits.map(u => ({
      name: u.name,
      emoji: u.emoji,
      hp: u.hp,
      maxHp: u.maxHp,
      ether: u.ether,
      cardsPerTurn: u.cardsPerTurn,
      passives: u.passives,
      count: u.count,
    }));
  } else if (battle.enemies && Array.isArray(battle.enemies)) {
    const mixedEnemies = battle.enemies.map(id => ENEMIES.find((e: EnemyData) => e.id === id)).filter(Boolean) as EnemyData[];
    if (mixedEnemies.length > 0) {
      const unitMap = new Map<string, EnemyUnit>();
      mixedEnemies.forEach(e => {
        const key = e.id || e.name;
        if (!unitMap.has(key)) {
          unitMap.set(key, {
            id: e.id,
            name: e.name,
            emoji: e.emoji || "👾",
            count: 0,
            hp: 0,
            maxHp: 0,
            ether: 0,
            individualHp: e.hp || 40,
            individualEther: e.ether || 100,
            speed: e.speed || 10,
            deck: e.deck || [],
            cardsPerTurn: 0,
            individualCardsPerTurn: e.cardsPerTurn || 2,
            passives: e.passives || {},
            tier: e.tier || 1,
            unitId: 0,
            block: 0,
            tokens: { permanent: [], turn: [], usage: [] },
          });
        }
        const unit = unitMap.get(key)!;
        unit.count += 1;
        unit.hp += e.hp || 40;
        unit.maxHp += e.hp || 40;
        unit.ether += e.ether || 100;
        unit.cardsPerTurn += e.cardsPerTurn || 2;
      });

      enemyUnits = Array.from(unitMap.values()).map((unit, idx) => ({
        ...unit,
        unitId: idx,
        block: 0,
        tokens: { permanent: [], turn: [], usage: [] },
      }));

      if (!battle.label) {
        enemyName = enemyUnits.map(u => u.count > 1 ? `${u.name}×${u.count}` : u.name).join(' + ');
      }
      enemyHp = enemyUnits.reduce((sum, u) => sum + u.hp, 0);
      enemyDeck = mixedEnemies.flatMap(e => e.deck || []) as any;
      enemyCount = mixedEnemies.length;
      enemyComposition = enemyUnits.map(u => ({
        name: u.name,
        emoji: u.emoji,
        hp: u.hp,
        maxHp: u.maxHp,
        ether: u.ether,
        count: u.count,
      }));
    }
  } else {
    const baseEmoji = "👾";
    const singleName = battle.label ?? "Enemy";
    const singleHp = initialEnemy?.hp ?? 40;
    const singleEther = initialEnemy?.ether ?? 100;

    enemyUnits = [{
      unitId: 0,
      id: 'default',
      name: singleName,
      emoji: baseEmoji,
      count: enemyCount,
      hp: singleHp * enemyCount,
      maxHp: singleHp * enemyCount,
      ether: singleEther * enemyCount,
      individualHp: singleHp,
      individualEther: singleEther,
      speed: initialEnemy?.speed || 10,
      deck: enemyDeck,
      cardsPerTurn: 2 * enemyCount,
      individualCardsPerTurn: 2,
      passives: {},
      tier: 1,
      block: 0,
      tokens: { permanent: [], turn: [], usage: [] },
    }];

    enemyName = enemyCount > 1 ? `${singleName} x${enemyCount}` : singleName;
    enemyComposition = [{ name: singleName, emoji: baseEmoji, hp: singleHp * enemyCount, maxHp: singleHp * enemyCount, ether: singleEther * enemyCount, count: enemyCount }];
  }

  const passiveEffects = calculatePassiveEffects(relics);
  const baseEnergy = 6 + (playerEnergyBonus || 0) + (passiveEffects.maxEnergy || 0);
  const maxEnergy = baseEnergy;

  const combatStartEffects = applyCombatStartEffects(relics, {});

  const startingHp = Math.max(
    1,
    Math.min(
      maxHp,
      (initialPlayer?.hp ?? maxHp) - combatStartEffects.damage + combatStartEffects.heal
    )
  );

  const startingStrength = (playerStrength || 0) + (combatStartEffects.strength || 0);
  const startingMaxSpeed = 30 + (playerMaxSpeedBonus || 0);

  const totalEnemyEther = enemyUnits.reduce((sum, u) => sum + (u.ether || u.individualEther * u.count || 100), 0);
  const totalEnemyMaxSpeed = enemyUnits.reduce((sum, u) => sum + (u.speed || 10), 0);

  return {
    player: {
      hp: startingHp,
      maxHp: maxHp,
      energy: maxEnergy + combatStartEffects.energy,
      maxEnergy: maxEnergy + combatStartEffects.energy,
      block: combatStartEffects.block,
      strength: startingStrength,
      insight: playerInsight ?? 0,
      maxSpeed: startingMaxSpeed,
      etherPts,
    },
    enemy: {
      name: enemyName,
      hp: enemyHp,
      maxHp: enemyHp,
      deck: enemyDeck,
      composition: enemyComposition,
      etherPts: totalEnemyEther,
      etherCapacity: totalEnemyEther,
      enemyCount: enemyCount,
      maxSpeed: totalEnemyMaxSpeed,
      passives: enemyComposition[0]?.passives || {},
      cardsPerTurn: enemyUnits.reduce((sum, u) => sum + (u.cardsPerTurn || 2), 0),
      ether: totalEnemyEther,
      units: enemyUnits,
    },
  };
};

export const BattleScreen: FC = () => {
  const activeBattle = useGameStore((state) => (state as { activeBattle?: Battle }).activeBattle);
  const resolveBattle = useGameStore((state) => (state as { resolveBattle: (result: BattleResult) => void }).resolveBattle);
  const applyEtherDelta = useGameStore((state) => (state as { applyEtherDelta: (delta: number) => void }).applyEtherDelta);
  const playerEther = useGameStore((state) => (state as { resources: { etherPts?: number } }).resources.etherPts ?? 0);
  const relics = useGameStore((state) => (state as { relics: string[] }).relics);
  const maxHp = useGameStore((state) => (state as { maxHp: number }).maxHp);
  const playerInsight = useGameStore((state) => (state as { playerInsight?: number }).playerInsight ?? 0);
  const playerEnergyBonus = useGameStore((state) => (state as { playerEnergyBonus?: number }).playerEnergyBonus ?? 0);
  const playerStrength = useGameStore((state) => (state as { playerStrength?: number }).playerStrength ?? 0);
  const playerMaxSpeedBonus = useGameStore((state) => (state as { playerMaxSpeedBonus?: number }).playerMaxSpeedBonus ?? 0);
  const itemBuffs = useGameStore((state) => (state as { itemBuffs?: Record<string, number> }).itemBuffs || {});

  const effectiveStrength = playerStrength + (itemBuffs.strength || 0);
  const effectiveInsight = playerInsight + (itemBuffs.insight || 0);

  const [battleInsight, setBattleInsight] = useState(effectiveInsight || 0);
  useEffect(() => {
    if (activeBattle) {
      setBattleInsight(effectiveInsight || 0);
    }
  }, [activeBattle, effectiveInsight]);

  const payload = useMemo(() => {
    return buildBattlePayload(
      activeBattle || null,
      playerEther,
      relics,
      maxHp,
      battleInsight,
      playerEnergyBonus,
      effectiveStrength,
      playerMaxSpeedBonus
    );
  }, [activeBattle, playerEther, relics, maxHp, battleInsight, playerEnergyBonus, effectiveStrength, playerMaxSpeedBonus]);

  const [devToolsOpen, setDevToolsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        setDevToolsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleBattleResult = useCallback(
    ({ result, playerEther: resultEther, deltaEther, playerHp, playerMaxHp }: BattleResult): void => {
      const finalResult = result === "victory" ? "victory" : "defeat";

      if (typeof deltaEther === "number" && deltaEther !== 0) {
        if (deltaEther > 0) {
          applyEtherDelta(deltaEther);
        }
      } else if (typeof resultEther === "number") {
        const current = (useGameStore.getState() as { resources: { etherPts?: number } }).resources.etherPts ?? 0;
        const diff = resultEther - current;
        if (diff > 0) applyEtherDelta(diff);
      }
      resolveBattle({
        result: finalResult,
        playerHp: playerHp,
        playerMaxHp: playerMaxHp
      } as any);
    },
    [applyEtherDelta, resolveBattle],
  );

  if (!activeBattle) return null;

  return (
    <div className="battle-fullscreen">
      <BattleApp
        initialPlayer={payload?.player}
        initialEnemy={payload?.enemy}
        playerEther={playerEther}
        liveInsight={effectiveInsight}
        onBattleResult={handleBattleResult}
      />

      <DevTools isOpen={devToolsOpen} onClose={() => setDevToolsOpen(false)} showAllCards={false} setShowAllCards={() => {}} />
    </div>
  );
};
