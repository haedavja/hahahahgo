import { useMemo, useCallback, useState, useEffect } from "react";
import { useGameStore } from "../../state/gameStore";
import { LegacyBattleApp } from "./LegacyBattleApp";
import { DevTools } from "../dev/DevTools";
import { calculatePassiveEffects, applyCombatStartEffects } from "../../lib/relicEffects";
import { ENEMIES } from "./battleData";

const buildBattlePayload = (battle, etherPts, relics, maxHp, playerInsight, playerEnergyBonus = 0, playerStrength = 0, playerMaxSpeedBonus = 0) => {
  if (!battle) return null;
  const initialPlayer = battle.simulation?.initialState?.player;
  const initialEnemy = battle.simulation?.initialState?.enemy;
  const enemyEtherCapacity = battle.enemyEtherCapacity ?? 300; // 기본 몬스터 에테르 소지량

  let enemyCount = battle.enemyCount ?? 1;
  let enemyName = battle.label ?? "Enemy";
  let enemyHp = initialEnemy?.hp ? Math.round(initialEnemy.hp) : 30;
  let enemyDeck = initialEnemy?.deck || [];

  let enemyComposition = [];

  if (battle.enemies && Array.isArray(battle.enemies)) {
    const mixedEnemies = battle.enemies.map(id => ENEMIES.find(e => e.id === id)).filter(Boolean);
    if (mixedEnemies.length > 0) {
      enemyName = mixedEnemies.map(e => e.name).join(" & ");
      enemyHp = mixedEnemies.reduce((sum, e) => sum + e.hp, 0);
      enemyDeck = mixedEnemies.flatMap(e => e.deck);
      enemyCount = mixedEnemies.length;
      enemyComposition = mixedEnemies.map(e => ({ name: e.name, emoji: e.emoji || "👾" }));
    }
  } else {
    const baseEmoji = "👾";
    if (enemyCount > 1) {
      enemyName = `${enemyName} x${enemyCount}`;
      enemyComposition = Array(enemyCount).fill({ name: battle.label ?? "Enemy", emoji: baseEmoji });
    } else {
      enemyComposition = [{ name: enemyName, emoji: baseEmoji }];
    }
  }

  // 유물 패시브 효과 계산
  const passiveEffects = calculatePassiveEffects(relics);
  // 행동력: 기본 6 + 활력 보너스 + 유물 패시브
  const baseEnergy = 6 + (playerEnergyBonus || 0) + (passiveEffects.maxEnergy || 0);
  const maxEnergy = baseEnergy;

  // 전투 시작 효과 계산
  const combatStartEffects = applyCombatStartEffects(relics, {});

  // 전투 시작 시 체력/방어력 보너스 적용
  // 피의 족쇄 등의 피해를 적용하고 회복 효과를 더함
  const startingHp = Math.max(
    1, // 최소 체력 1
    Math.min(
      maxHp,
      (initialPlayer?.hp ?? maxHp) - combatStartEffects.damage + combatStartEffects.heal
    )
  );

  // 피의 족쇄 등의 힘 보너스 계산
  // 힘: 스토어 값 + 전투 시작 보너스 (패시브는 스토어에 반영된다고 가정)
  const startingStrength = (playerStrength || 0) + (combatStartEffects.strength || 0);
  const startingMaxSpeed = 30 + (playerMaxSpeedBonus || 0);

  return {
    player: {
      hp: startingHp,
      maxHp: maxHp, // gameStore의 maxHp 사용 (유물 효과가 이미 적용됨)
      energy: maxEnergy + combatStartEffects.energy, // 시작 에너지 = maxEnergy + 전투 시작 보너스
      maxEnergy: maxEnergy + combatStartEffects.energy,
      block: combatStartEffects.block, // 시작 방어력
      strength: startingStrength, // 시작 힘
      insight: playerInsight ?? 0, // 통찰
      maxSpeed: startingMaxSpeed,
      etherPts,
    },
    enemy: {
      name: enemyName,
      hp: enemyHp,
      deck: enemyDeck,
      composition: enemyComposition,
      etherPts: enemyEtherCapacity,
      etherCapacity: enemyEtherCapacity,
      enemyCount: enemyCount,
    },
  };
};

export function LegacyBattleScreen() {
  const activeBattle = useGameStore((state) => state.activeBattle);
  const resolveBattle = useGameStore((state) => state.resolveBattle);
  const applyEtherDelta = useGameStore((state) => state.applyEtherDelta);
  const lastBattleResult = useGameStore((state) => state.lastBattleResult);
  const playerEther = useGameStore((state) => state.resources.etherPts ?? 0);
  const relics = useGameStore((state) => state.relics);
  const maxHp = useGameStore((state) => state.maxHp);
  const playerInsight = useGameStore((state) => state.playerInsight ?? 0);
  const playerEnergyBonus = useGameStore((state) => state.playerEnergyBonus ?? 0);
  const playerStrength = useGameStore((state) => state.playerStrength ?? 0);
  const playerMaxSpeedBonus = useGameStore((state) => state.playerMaxSpeedBonus ?? 0);

  // 전투 시작 시의 통찰 값을 고정해 payload를 재생성하지 않도록 저장
  const [battleInsight, setBattleInsight] = useState(playerInsight || 0);
  useEffect(() => {
    if (activeBattle) {
      setBattleInsight(playerInsight || 0);
    }
  }, [activeBattle]);

  const payload = useMemo(() => {
    return buildBattlePayload(
      activeBattle,
      playerEther,
      relics,
      maxHp,
      battleInsight,
      playerEnergyBonus,
      playerStrength,
      playerMaxSpeedBonus
    );
  }, [activeBattle, playerEther, relics, maxHp, battleInsight, playerEnergyBonus, playerStrength, playerMaxSpeedBonus]);
  const frameKey = activeBattle ? `${activeBattle.nodeId}-${activeBattle.kind}` : "idle";

  const [devToolsOpen, setDevToolsOpen] = useState(false);

  // Alt+D 단축키
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        setDevToolsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleBattleResult = useCallback(
    ({ result, playerEther, deltaEther, playerHp, playerMaxHp }) => {
      const finalResult = result === "victory" ? "victory" : "defeat";

      if (typeof deltaEther === "number" && deltaEther !== 0) {
        applyEtherDelta(deltaEther);
      } else if (typeof playerEther === "number") {
        const current = useGameStore.getState().resources.etherPts ?? 0;
        const diff = playerEther - current;
        if (diff) applyEtherDelta(diff);
      }
      resolveBattle({
        result: finalResult,
        etherPts: playerEther,
        playerHp: playerHp, // 실제 전투 결과 체력 전달
        playerMaxHp: playerMaxHp
      });
    },
    [applyEtherDelta, resolveBattle],
  );

  if (!activeBattle) return null;

  return (
    <div className="battle-fullscreen" key={frameKey}>
      <LegacyBattleApp
        initialPlayer={payload?.player}
        initialEnemy={payload?.enemy}
        playerEther={playerEther}
        liveInsight={playerInsight}
        onBattleResult={handleBattleResult}
      />

      <DevTools isOpen={devToolsOpen} onClose={() => setDevToolsOpen(false)} />
    </div>
  );
}
