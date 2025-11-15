import { useMemo, useCallback } from "react";
import { useGameStore } from "../../state/gameStore";
import { LegacyBattleApp } from "./LegacyBattleApp";

const buildBattlePayload = (battle, etherPts) => {
  if (!battle) return null;
  const initialPlayer = battle.simulation?.initialState?.player;
  const initialEnemy = battle.simulation?.initialState?.enemy;
  return {
    player: {
      hp: initialPlayer?.hp ?? 30,
      maxHp: initialPlayer?.hp ?? 30,
      energy: 6,
      etherPts,
    },
    enemy: {
      name: battle.label ?? "Enemy",
      hp: initialEnemy?.hp ?? 30,
    },
  };
};

export function LegacyBattleScreen() {
  const activeBattle = useGameStore((state) => state.activeBattle);
  const resolveBattle = useGameStore((state) => state.resolveBattle);
  const applyAetherDelta = useGameStore((state) => state.applyAetherDelta);
  const lastBattleResult = useGameStore((state) => state.lastBattleResult);
  const playerAether = useGameStore((state) => state.resources.aether ?? 0);
  const payload = useMemo(() => buildBattlePayload(activeBattle, playerAether), [activeBattle, playerAether]);
  const frameKey = activeBattle ? `${activeBattle.nodeId}-${activeBattle.kind}` : "idle";

  const handleBattleResult = useCallback(
    ({ result, playerEther, deltaAether }) => {
      const finalResult = result === "victory" ? "victory" : "defeat";
      const isFirstBattle = !lastBattleResult;

      if (typeof deltaAether === "number" && deltaAether !== 0) {
        // 첫 전투 후 비정상적인 +5 보정
        const correctedDelta = isFirstBattle ? deltaAether - 5 : deltaAether;
        applyAetherDelta(correctedDelta);
      } else if (typeof playerEther === "number") {
        const current = useGameStore.getState().resources.aether ?? 0;
        let diff = playerEther - current;
        // 첫 전투 후 비정상적인 +5 보정
        if (isFirstBattle) diff -= 5;
        if (diff) applyAetherDelta(diff);
      }
      resolveBattle({ result: finalResult, etherPts: playerEther });
    },
    [applyAetherDelta, resolveBattle, lastBattleResult],
  );

  if (!activeBattle) return null;

  return (
    <div className="battle-fullscreen" key={frameKey}>
      <LegacyBattleApp
        initialPlayer={payload?.player}
        initialEnemy={payload?.enemy}
        playerEther={playerAether}
        onBattleResult={handleBattleResult}
      />
    </div>
  );
}
