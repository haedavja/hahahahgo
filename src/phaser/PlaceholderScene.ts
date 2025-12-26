/**
 * @file PlaceholderScene.js
 * @description Phaser 플레이스홀더 씬
 *
 * ## 용도
 * - 개발 중 임시 화면
 * - mapRisk 실시간 표시
 */

import Phaser from "phaser";
import { useGameStore } from "../state/gameStore";

export class PlaceholderScene extends Phaser.Scene {
  unsubscribes: Array<() => void>;
  riskText: Phaser.GameObjects.Text | null;

  constructor() {
    super("PlaceholderScene");
    this.unsubscribes = [];
    this.riskText = null;
  }

  preload() {}

  create() {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 20, "Phaser Placeholder", {
        fontFamily: "Pretendard, sans-serif",
        fontSize: "24px",
        color: "#f4f6ff",
      })
      .setOrigin(0.5);

    this.riskText = this.add
      .text(width / 2, height / 2 + 20, this.formatRisk(useGameStore.getState().mapRisk), {
        fontFamily: "Pretendard, sans-serif",
        fontSize: "18px",
        color: "#ffb6c1",
      })
      .setOrigin(0.5);

    this.unsubscribes.push(
      (useGameStore.subscribe as any)(
        (state: any) => state.mapRisk,
        (mapRisk: number) => {
          if (this.riskText) {
            this.riskText.setText(this.formatRisk(mapRisk));
          }
        },
      ),
    );

    this.unsubscribes.push(
      (useGameStore.subscribe as any)(
        (state: any) => state.activeBattle,
        (battle: any) => {
          if (battle) {
            this.scene.start("BattleScene");
          }
        },
      ),
    );

    if (useGameStore.getState().activeBattle) {
      this.scene.start("BattleScene");
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.cleanup());
  }

  cleanup() {
    this.unsubscribes.forEach((fn: () => void) => {
      try {
        fn();
      } catch (_) {
        // ignore
      }
    });
    this.unsubscribes = [];
  }

  formatRisk(mapRisk: number): string {
    return `���赵 ${mapRisk}%`;
  }
}
