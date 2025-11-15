import Phaser from "phaser";
import { PlaceholderScene } from "./PlaceholderScene";
import { BattleScene } from "./BattleScene";

export const createPhaserGame = (parent) => {
  const config = {
    type: Phaser.AUTO,
    width: 480,
    height: 360,
    parent,
    backgroundColor: "#0d111f",
    scene: [PlaceholderScene, BattleScene],
    physics: {
      default: "arcade",
      arcade: { debug: false },
    },
  };
  return new Phaser.Game(config);
};
