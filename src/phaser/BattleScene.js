import Phaser from "phaser";
import { useGameStore } from "../state/gameStore";

export class BattleScene extends Phaser.Scene {
  constructor() {
    super("BattleScene");
    this.unsubscribes = [];
    this.currentBattle = null;
    this.titleText = null;
    this.infoText = null;
    this.timelineText = null;
    this.handText = null;
    this.hintText = null;
  }

  preload() {}

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x05070f, 0.95);

    this.titleText = this.add
      .text(width / 2, height / 2 - 70, "전투 대기", {
        fontFamily: "Pretendard, sans-serif",
        fontSize: "26px",
        color: "#f4f6ff",
      })
      .setOrigin(0.5);

    this.infoText = this.add
      .text(width / 2, height / 2 - 35, "", {
        fontFamily: "Pretendard, sans-serif",
        fontSize: "18px",
        color: "#8fd3ff",
      })
      .setOrigin(0.5);

    this.timelineText = this.add
      .text(width / 2, height / 2 + 10, "", {
        fontFamily: "Pretendard, sans-serif",
        fontSize: "14px",
        color: "#b7c9ff",
        align: "center",
      })
      .setOrigin(0.5);

    this.handText = this.add
      .text(width / 2, height / 2 + 80, "", {
        fontFamily: "Pretendard, sans-serif",
        fontSize: "13px",
        color: "#f9f3c2",
        align: "center",
      })
      .setOrigin(0.5);

    this.logText = this.add
      .text(width / 2, height / 2 + 130, "", {
        fontFamily: "Pretendard, sans-serif",
        fontSize: "12px",
        color: "#d9e1ff",
        align: "center",
        wordWrap: { width: width - 60 },
      })
      .setOrigin(0.5);

    this.hintText = this.add
      .text(width / 2, height / 2 + 170, "SPACE 또는 클릭으로 전투를 마무리하세요.", {
        fontFamily: "Pretendard, sans-serif",
        fontSize: "14px",
        color: "#ffd199",
      })
      .setOrigin(0.5);

    this.currentBattle = useGameStore.getState().activeBattle;
    if (!this.currentBattle) {
      this.scene.start("PlaceholderScene");
      return;
    }
    this.updateTexts(this.currentBattle);

    this.unsubscribes.push(
      useGameStore.subscribe(
        (state) => state.activeBattle,
        (battle) => {
          this.currentBattle = battle;
          if (!battle) {
            this.scene.start("PlaceholderScene");
          } else {
            this.updateTexts(battle);
          }
        },
      ),
    );

    const finishBattle = () => {
      useGameStore.getState().resolveBattle({ result: "victory" });
    };

    this.input.on("pointerdown", finishBattle);
    this.input.keyboard?.on("keydown-SPACE", finishBattle);

    this.unsubscribes.push(() => this.input.off("pointerdown", finishBattle));
    if (this.input.keyboard) {
      this.unsubscribes.push(() => this.input.keyboard.off("keydown-SPACE", finishBattle));
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.cleanup());
  }

  updateTexts(battle) {
    if (!battle) return;
    this.titleText?.setText(`전투: ${battle.label}`);
    this.infoText?.setText(`유형 ${battle.kind.toUpperCase()} | 난이도 ${battle.difficulty}`);
    if (battle.preview) {
      const timelineLines = battle.preview.timeline
        .map((entry) => `${entry.order}. [${entry.actor === "player" ? "P" : "E"}] ${entry.name} • ${entry.speedCost}TU (누적 ${entry.tu})`)
        .join("\n");
      this.timelineText?.setText(timelineLines || "타임라인 없음");
      const handLines = [
        `플레이어 패: ${battle.preview.playerHand.map((card) => card.name).join(", ") || "-"}`,
        `적 패: ${battle.preview.enemyHand.map((card) => card.name).join(", ") || "-"}`,
      ].join("\n");
      this.handText?.setText(handLines);
    } else {
      this.timelineText?.setText("");
      this.handText?.setText("");
      if (battle.simulation?.log?.length) {
        const recent = battle.simulation.log
          .slice(0, 4)
          .map((entry) =>
            `${entry.order}. ${entry.actor === "player" ? "P" : "E"} ${entry.name}` +
            (entry.detail?.type === "attack"
              ? ` - 피해 ${entry.detail.hpDamage}`
              : entry.detail?.type === "block"
                ? ` - 방어 +${entry.detail.block}`
                : " - 보조"),
          )
          .join("\n");
        this.logText?.setText(recent);
      } else {
        this.logText?.setText("");
      }
    }
  }

  cleanup() {
    this.unsubscribes.forEach((fn) => {
      try {
        fn();
      } catch (_) {
        // ignore
      }
    });
    this.unsubscribes = [];
  }
}
