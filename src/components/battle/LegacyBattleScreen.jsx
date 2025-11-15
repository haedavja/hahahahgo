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
  const playerAether = useGameStore((state) => state.resources.aether ?? 0);
  const payload = useMemo(() => buildBattlePayload(activeBattle, playerAether), [activeBattle, playerAether]);
  const frameKey = activeBattle ? `${activeBattle.nodeId}-${activeBattle.kind}` : "idle";

  const handleBattleResult = useCallback(
    ({ result, playerEther, deltaAether }) => {
      const finalResult = result === "victory" ? "victory" : "defeat";
      if (typeof deltaAether === "number" && deltaAether !== 0) {
        applyAetherDelta(deltaAether);
      } else if (typeof playerEther === "number") {
        const current = useGameStore.getState().resources.aether ?? 0;
        const diff = playerEther - current;
        if (diff) applyAetherDelta(diff);
      }
      resolveBattle({ result: finalResult, etherPts: playerEther });
    },
    [applyAetherDelta, resolveBattle],
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
