import { useEffect, useRef } from "react";
import { createPhaserGame } from "../../phaser/createGame";

export function PhaserCanvas() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const game = createPhaserGame(containerRef.current);
    return () => {
      game.destroy(true);
    };
  }, []);

  return (
    <div className="phaser-wrapper">
      <div className="phaser-canvas" ref={containerRef} />
    </div>
  );
}
