import { useEffect, useRef, memo } from "react";
import { createPhaserGame } from "../../phaser/createGame";

export const PhaserCanvas = memo(function PhaserCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

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
});
