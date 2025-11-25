import { useMemo, useCallback } from "react";
import { useGameStore } from "../../state/gameStore";
import { LegacyBattleApp } from "./LegacyBattleApp";

const buildBattlePayload = (battle, etherPts) => {
  if (!battle) return null;
  const initialPlayer = battle.simulation?.initialState?.player;
  const initialEnemy = battle.simulation?.initialState?.enemy;
  return {
    player: {
      hp: initialPlayer?.hp ?? 100,
      maxHp: initialPlayer?.maxHp ?? 100,
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
  const applyEtherDelta = useGameStore((state) => state.applyEtherDelta);
  const lastBattleResult = useGameStore((state) => state.lastBattleResult);
  const playerEther = useGameStore((state) => state.resources.etherPts ?? 0);
  const payload = useMemo(() => buildBattlePayload(activeBattle, playerEther), [activeBattle, playerEther]);
  const frameKey = activeBattle ? `${activeBattle.nodeId}-${activeBattle.kind}` : "idle";

  const handleBattleResult = useCallback(
    ({ result, playerEther, deltaEther }) => {
      const finalResult = result === "victory" ? "victory" : "defeat";

      if (typeof deltaEther === "number" && deltaEther !== 0) {
        applyEtherDelta(deltaEther);
      } else if (typeof playerEther === "number") {
        const current = useGameStore.getState().resources.etherPts ?? 0;
        const diff = playerEther - current;
        if (diff) applyEtherDelta(diff);
      }
      resolveBattle({ result: finalResult, etherPts: playerEther });
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
        onBattleResult={handleBattleResult}
      />
    </div>
  );
}
