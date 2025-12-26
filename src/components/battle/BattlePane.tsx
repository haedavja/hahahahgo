/**
 * BattlePane.tsx
 *
 * 레거시 전투 모드 패널 컴포넌트
 */

import { FC } from 'react';
import { useGameStore, type ActiveBattle } from "../../state/gameStore";

export const BattlePane: FC = () => {
  const activeBattle = useGameStore((state) => (state as { activeBattle?: ActiveBattle }).activeBattle);

  if (!activeBattle) return null;

  const openWindow = (): void => {
    window.open("/battle-legacy.html", "_blank", "noopener,noreferrer");
  };

  return (
    <section className="legacy-pane">
      <header className="legacy-pane-header">
        <div>
          <strong>레거시 전투 모드</strong>
          <p>
            {activeBattle.label} ({activeBattle.kind.toUpperCase()})
          </p>
        </div>
        <button type="button" onClick={openWindow}>
          새 창으로 보기
        </button>
      </header>
      <p className="legacy-pane-desc">
        기존 battle.html 기반 전투를 그대로 불러옵니다. 전투 방식과 UI는 이전 프로토타입과 동일하게 작동합니다.
      </p>
      <iframe title="legacy battle" src="/battle-legacy.html" className="legacy-pane-frame" />
    </section>
  );
};
