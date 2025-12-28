/**
 * @file createGame.js
 * @description Phaser 게임 인스턴스 생성
 *
 * ## 설정
 * - 480x360 해상도
 * - Arcade 물리엔진
 * - PlaceholderScene, BattleScene 등록
 */

import Phaser from "phaser";
import { PlaceholderScene } from "./PlaceholderScene";
import { BattleScene } from "./BattleScene";

export const createPhaserGame = (parent: any) => {
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
