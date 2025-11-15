import "./App.css";
import { MapDemo } from "./components/map/MapDemo";
import { useGameStore } from "./state/gameStore";
import { LegacyBattleScreen } from "./components/battle/LegacyBattleScreen";

function App() {
  const activeBattle = useGameStore((state) => state.activeBattle);

  if (activeBattle) {
    return (
      <div className="battle-fullscreen">
        <LegacyBattleScreen />
      </div>
    );
  }

  return <MapDemo />;
}

export default App;
