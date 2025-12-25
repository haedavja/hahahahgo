import "./App.css";
import { lazy, Suspense } from "react";
import { useGameStore } from "./state/gameStore";
import { ErrorBoundary } from "./components/ErrorBoundary";

// 동적 import로 코드 스플리팅
const MapDemo = lazy(() => import("./components/map/MapDemo").then(m => ({ default: m.MapDemo })));
const BattleScreen = lazy(() => import("./components/battle/BattleScreen").then(m => ({ default: m.BattleScreen })));

// 로딩 컴포넌트
function LoadingFallback() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#0f172a',
      color: '#94a3b8',
      fontSize: '1.2rem'
    }}>
      로딩 중...
    </div>
  );
}

function App() {
  const activeBattle = useGameStore((state) => state.activeBattle);

  return (
    <ErrorBoundary>
      {activeBattle ? (
        <Suspense fallback={<LoadingFallback />}>
          <div className="battle-fullscreen">
            <BattleScreen />
          </div>
        </Suspense>
      ) : (
        <Suspense fallback={<LoadingFallback />}>
          <MapDemo />
        </Suspense>
      )}
    </ErrorBoundary>
  );
}

export default App;
