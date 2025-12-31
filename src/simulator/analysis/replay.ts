/**
 * @file replay.ts
 * @description 시뮬레이션 리플레이 시스템 - 전투 과정 저장 및 재생
 *
 * 기능:
 * - 전투 이벤트 기록
 * - JSON 형태 저장/로드
 * - HTML 리플레이 뷰어 생성
 * - 단계별 재생
 * - 분석용 스냅샷
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { BattleResult, SimPlayerState, SimEnemyState } from '../core/types';
import type { BattleEvent } from '../core/battle-engine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==================== 리플레이 타입 ====================

export interface ReplayData {
  id: string;
  version: string;
  timestamp: number;
  duration: number;
  config: ReplayConfig;
  result: ReplaySummary;
  events: ReplayEvent[];
  snapshots: StateSnapshot[];
}

export interface ReplayConfig {
  playerDeck: string[];
  playerRelics: string[];
  enemyId: string;
  enemyName: string;
  maxTurns: number;
}

export interface ReplaySummary {
  winner: 'player' | 'enemy' | 'draw';
  turns: number;
  playerDamageDealt: number;
  enemyDamageDealt: number;
  finalPlayerHp: number;
  finalEnemyHp: number;
  combosTriggered: string[];
  cardsPlayed: number;
}

export interface ReplayEvent {
  id: number;
  turn: number;
  phase: 'start' | 'player' | 'enemy' | 'end';
  type: string;
  actor: 'player' | 'enemy' | 'system';
  data: Record<string, unknown>;
  description: string;
  timestamp: number;
}

export interface StateSnapshot {
  turn: number;
  phase: string;
  player: {
    hp: number;
    maxHp: number;
    block: number;
    energy: number;
    hand: string[];
    deck: number;
    discard: number;
    tokens: Record<string, number>;
  };
  enemy: {
    hp: number;
    maxHp: number;
    block: number;
    tokens: Record<string, number>;
  };
}

// ==================== 리플레이 레코더 ====================

export class ReplayRecorder {
  private events: ReplayEvent[] = [];
  private snapshots: StateSnapshot[] = [];
  private eventId = 0;
  private startTime: number = 0;
  private config: ReplayConfig | null = null;

  startRecording(config: ReplayConfig): void {
    this.events = [];
    this.snapshots = [];
    this.eventId = 0;
    this.startTime = Date.now();
    this.config = config;

    this.addEvent({
      turn: 0,
      phase: 'start',
      type: 'battle_start',
      actor: 'system',
      data: { config },
      description: `전투 시작: vs ${config.enemyName}`,
    });
  }

  recordTurnStart(turn: number, player: SimPlayerState, enemy: SimEnemyState): void {
    this.addEvent({
      turn,
      phase: 'start',
      type: 'turn_start',
      actor: 'system',
      data: { playerHp: player.hp, enemyHp: enemy.hp },
      description: `턴 ${turn} 시작`,
    });

    this.takeSnapshot(turn, 'start', player, enemy);
  }

  recordCardPlay(
    turn: number,
    actor: 'player' | 'enemy',
    cardId: string,
    cardName: string,
    effects: Record<string, unknown>
  ): void {
    this.addEvent({
      turn,
      phase: actor,
      type: 'card_play',
      actor,
      data: { cardId, cardName, effects },
      description: `${actor === 'player' ? '플레이어' : '적'}가 ${cardName} 사용`,
    });
  }

  recordDamage(
    turn: number,
    actor: 'player' | 'enemy',
    damage: number,
    actualDamage: number,
    blocked: number,
    isCritical: boolean
  ): void {
    const target = actor === 'player' ? '적' : '플레이어';
    let desc = `${target}에게 ${actualDamage} 피해`;
    if (blocked > 0) desc += ` (${blocked} 방어)`;
    if (isCritical) desc += ' 💥치명타!';

    this.addEvent({
      turn,
      phase: actor,
      type: 'damage',
      actor,
      data: { damage, actualDamage, blocked, isCritical },
      description: desc,
    });
  }

  recordHeal(turn: number, actor: 'player' | 'enemy', amount: number): void {
    this.addEvent({
      turn,
      phase: actor,
      type: 'heal',
      actor,
      data: { amount },
      description: `${actor === 'player' ? '플레이어' : '적'} ${amount} 회복`,
    });
  }

  recordCombo(turn: number, comboName: string, multiplier: number): void {
    this.addEvent({
      turn,
      phase: 'player',
      type: 'combo',
      actor: 'player',
      data: { comboName, multiplier },
      description: `🎴 콤보 발동: ${comboName} (x${multiplier})`,
    });
  }

  recordTokenChange(
    turn: number,
    actor: 'player' | 'enemy',
    tokenId: string,
    change: number
  ): void {
    const action = change > 0 ? '획득' : '소모';
    this.addEvent({
      turn,
      phase: actor,
      type: 'token_change',
      actor,
      data: { tokenId, change },
      description: `${tokenId} ${Math.abs(change)} ${action}`,
    });
  }

  recordTurnEnd(turn: number, player: SimPlayerState, enemy: SimEnemyState): void {
    this.addEvent({
      turn,
      phase: 'end',
      type: 'turn_end',
      actor: 'system',
      data: { playerHp: player.hp, enemyHp: enemy.hp },
      description: `턴 ${turn} 종료`,
    });

    this.takeSnapshot(turn, 'end', player, enemy);
  }

  recordBattleEnd(result: BattleResult): void {
    this.addEvent({
      turn: result.turns,
      phase: 'end',
      type: 'battle_end',
      actor: 'system',
      data: { result },
      description: `전투 종료: ${result.winner === 'player' ? '승리' : result.winner === 'enemy' ? '패배' : '무승부'}`,
    });
  }

  finishRecording(result: BattleResult): ReplayData {
    const summary: ReplaySummary = {
      winner: result.winner,
      turns: result.turns,
      playerDamageDealt: result.playerDamageDealt,
      enemyDamageDealt: result.enemyDamageDealt,
      finalPlayerHp: result.playerFinalHp,
      finalEnemyHp: result.enemyFinalHp,
      combosTriggered: Object.keys(result.comboStats),
      cardsPlayed: Object.values(result.cardUsage).reduce((a, b) => a + b, 0),
    };

    return {
      id: `replay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      version: '1.0.0',
      timestamp: this.startTime,
      duration: Date.now() - this.startTime,
      config: this.config!,
      result: summary,
      events: this.events,
      snapshots: this.snapshots,
    };
  }

  private addEvent(event: Omit<ReplayEvent, 'id' | 'timestamp'>): void {
    this.events.push({
      ...event,
      id: this.eventId++,
      timestamp: Date.now() - this.startTime,
    });
  }

  private takeSnapshot(turn: number, phase: string, player: SimPlayerState, enemy: SimEnemyState): void {
    this.snapshots.push({
      turn,
      phase,
      player: {
        hp: player.hp,
        maxHp: player.maxHp,
        block: player.block,
        energy: player.energy,
        hand: [...player.hand],
        deck: player.deck.length,
        discard: player.discard.length,
        tokens: { ...player.tokens },
      },
      enemy: {
        hp: enemy.hp,
        maxHp: enemy.maxHp,
        block: enemy.block,
        tokens: { ...enemy.tokens },
      },
    });
  }
}

// ==================== 리플레이 저장/로드 ====================

export class ReplayStorage {
  private dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || join(__dirname, '../../data/replays');

    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
  }

  save(replay: ReplayData): string {
    const filename = `${replay.id}.json`;
    const filepath = join(this.dataDir, filename);
    writeFileSync(filepath, JSON.stringify(replay, null, 2), 'utf-8');
    return filepath;
  }

  load(replayId: string): ReplayData | null {
    const filepath = join(this.dataDir, `${replayId}.json`);
    if (!existsSync(filepath)) return null;

    try {
      return JSON.parse(readFileSync(filepath, 'utf-8'));
    } catch {
      return null;
    }
  }

  list(): string[] {
    const fs = require('fs');
    const files = fs.readdirSync(this.dataDir) as string[];
    return files
      .filter((f: string) => f.endsWith('.json'))
      .map((f: string) => f.replace('.json', ''));
  }

  delete(replayId: string): boolean {
    const filepath = join(this.dataDir, `${replayId}.json`);
    if (!existsSync(filepath)) return false;

    require('fs').unlinkSync(filepath);
    return true;
  }
}

// ==================== 리플레이 플레이어 ====================

export class ReplayPlayer {
  private replay: ReplayData;
  private currentIndex = 0;
  private isPlaying = false;
  private speed = 1;
  private onEvent?: (event: ReplayEvent, snapshot?: StateSnapshot) => void;

  constructor(replay: ReplayData) {
    this.replay = replay;
  }

  setEventHandler(handler: (event: ReplayEvent, snapshot?: StateSnapshot) => void): void {
    this.onEvent = handler;
  }

  setSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(10, speed));
  }

  async play(): Promise<void> {
    this.isPlaying = true;

    while (this.isPlaying && this.currentIndex < this.replay.events.length) {
      const event = this.replay.events[this.currentIndex];
      const snapshot = this.replay.snapshots.find(
        s => s.turn === event.turn && s.phase === event.phase
      );

      if (this.onEvent) {
        this.onEvent(event, snapshot);
      }

      // 다음 이벤트까지 대기
      const nextEvent = this.replay.events[this.currentIndex + 1];
      if (nextEvent) {
        const delay = (nextEvent.timestamp - event.timestamp) / this.speed;
        await this.sleep(Math.min(delay, 1000));  // 최대 1초
      }

      this.currentIndex++;
    }

    this.isPlaying = false;
  }

  pause(): void {
    this.isPlaying = false;
  }

  stop(): void {
    this.isPlaying = false;
    this.currentIndex = 0;
  }

  stepForward(): ReplayEvent | null {
    if (this.currentIndex >= this.replay.events.length) return null;
    return this.replay.events[this.currentIndex++];
  }

  stepBackward(): ReplayEvent | null {
    if (this.currentIndex <= 0) return null;
    return this.replay.events[--this.currentIndex];
  }

  seekToTurn(turn: number): void {
    const idx = this.replay.events.findIndex(e => e.turn === turn);
    if (idx >= 0) this.currentIndex = idx;
  }

  getProgress(): { current: number; total: number; percent: number } {
    return {
      current: this.currentIndex,
      total: this.replay.events.length,
      percent: this.replay.events.length > 0
        ? (this.currentIndex / this.replay.events.length) * 100
        : 0,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ==================== HTML 리플레이 뷰어 생성 ====================

export function generateReplayViewer(replay: ReplayData, outputPath?: string): string {
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>전투 리플레이 - ${replay.id}</title>
  <style>
    :root {
      --bg: #1a1a2e;
      --card: #16213e;
      --text: #e8e8e8;
      --accent: #e94560;
      --success: #4ade80;
      --info: #60a5fa;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Segoe UI', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 20px;
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
    }

    .header h1 { color: var(--info); }

    .battle-info {
      display: flex;
      justify-content: center;
      gap: 40px;
      margin-bottom: 30px;
    }

    .combatant {
      text-align: center;
      background: var(--card);
      padding: 20px;
      border-radius: 12px;
      min-width: 200px;
    }

    .hp-bar {
      height: 20px;
      background: #333;
      border-radius: 10px;
      overflow: hidden;
      margin-top: 10px;
    }

    .hp-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent), var(--success));
      transition: width 0.3s;
    }

    .controls {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-bottom: 30px;
    }

    .controls button {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      background: var(--info);
      color: white;
      cursor: pointer;
      font-size: 1rem;
    }

    .controls button:hover { opacity: 0.8; }
    .controls button:disabled { opacity: 0.5; cursor: not-allowed; }

    .timeline {
      background: var(--card);
      border-radius: 12px;
      padding: 20px;
      max-height: 400px;
      overflow-y: auto;
    }

    .event {
      padding: 10px;
      border-left: 3px solid var(--info);
      margin-bottom: 10px;
      background: rgba(255,255,255,0.05);
      border-radius: 0 8px 8px 0;
    }

    .event.player { border-left-color: var(--success); }
    .event.enemy { border-left-color: var(--accent); }
    .event.combo { border-left-color: gold; }
    .event.damage { border-left-color: var(--accent); }
    .event.current { background: rgba(96, 165, 250, 0.2); }

    .event-turn { font-size: 0.8rem; opacity: 0.7; }
    .event-desc { margin-top: 5px; }

    .progress-bar {
      height: 8px;
      background: #333;
      border-radius: 4px;
      margin-bottom: 20px;
      cursor: pointer;
    }

    .progress-fill {
      height: 100%;
      background: var(--info);
      border-radius: 4px;
      transition: width 0.1s;
    }

    .result {
      text-align: center;
      font-size: 1.5rem;
      margin-top: 20px;
      padding: 20px;
      background: var(--card);
      border-radius: 12px;
    }

    .result.win { color: var(--success); }
    .result.lose { color: var(--accent); }
  </style>
</head>
<body>
  <div class="header">
    <h1>⚔️ 전투 리플레이</h1>
    <p>vs ${replay.config.enemyName} | ${replay.result.turns}턴</p>
  </div>

  <div class="battle-info">
    <div class="combatant">
      <h3>플레이어</h3>
      <div id="playerHp">HP: 100/100</div>
      <div class="hp-bar">
        <div class="hp-fill" id="playerHpBar" style="width: 100%"></div>
      </div>
    </div>
    <div class="combatant">
      <h3>${replay.config.enemyName}</h3>
      <div id="enemyHp">HP: ???/???</div>
      <div class="hp-bar">
        <div class="hp-fill" id="enemyHpBar" style="width: 100%"></div>
      </div>
    </div>
  </div>

  <div class="progress-bar" id="progressBar">
    <div class="progress-fill" id="progressFill" style="width: 0%"></div>
  </div>

  <div class="controls">
    <button onclick="stepBack()">⏮ 이전</button>
    <button onclick="togglePlay()" id="playBtn">▶️ 재생</button>
    <button onclick="stepForward()">다음 ⏭</button>
    <button onclick="reset()">🔄 처음</button>
    <select onchange="setSpeed(this.value)" id="speedSelect">
      <option value="0.5">0.5x</option>
      <option value="1" selected>1x</option>
      <option value="2">2x</option>
      <option value="5">5x</option>
    </select>
  </div>

  <div class="timeline" id="timeline"></div>

  <div class="result ${replay.result.winner === 'player' ? 'win' : 'lose'}">
    ${replay.result.winner === 'player' ? '🏆 승리!' : replay.result.winner === 'enemy' ? '💀 패배' : '🤝 무승부'}
  </div>

  <script>
    const replayData = ${JSON.stringify(replay)};
    const events = replayData.events;
    const snapshots = replayData.snapshots;
    let currentIndex = 0;
    let isPlaying = false;
    let speed = 1;
    let playInterval;

    function render() {
      const timeline = document.getElementById('timeline');
      timeline.innerHTML = '';

      for (let i = 0; i <= currentIndex && i < events.length; i++) {
        const e = events[i];
        const div = document.createElement('div');
        div.className = 'event ' + e.actor + (e.type === 'combo' ? ' combo' : '') + (e.type === 'damage' ? ' damage' : '') + (i === currentIndex ? ' current' : '');
        div.innerHTML = '<div class="event-turn">턴 ' + e.turn + '</div><div class="event-desc">' + e.description + '</div>';
        timeline.appendChild(div);
      }

      timeline.scrollTop = timeline.scrollHeight;

      // 진행률
      const progress = (currentIndex / events.length) * 100;
      document.getElementById('progressFill').style.width = progress + '%';

      // 스냅샷 업데이트
      const snapshot = findSnapshot(events[currentIndex]?.turn || 0);
      if (snapshot) {
        document.getElementById('playerHp').textContent = 'HP: ' + snapshot.player.hp + '/' + snapshot.player.maxHp;
        document.getElementById('playerHpBar').style.width = (snapshot.player.hp / snapshot.player.maxHp * 100) + '%';
        document.getElementById('enemyHp').textContent = 'HP: ' + snapshot.enemy.hp + '/' + snapshot.enemy.maxHp;
        document.getElementById('enemyHpBar').style.width = (snapshot.enemy.hp / snapshot.enemy.maxHp * 100) + '%';
      }
    }

    function findSnapshot(turn) {
      return snapshots.filter(s => s.turn <= turn).pop();
    }

    function stepForward() {
      if (currentIndex < events.length - 1) {
        currentIndex++;
        render();
      }
    }

    function stepBack() {
      if (currentIndex > 0) {
        currentIndex--;
        render();
      }
    }

    function togglePlay() {
      isPlaying = !isPlaying;
      document.getElementById('playBtn').textContent = isPlaying ? '⏸ 일시정지' : '▶️ 재생';

      if (isPlaying) {
        playInterval = setInterval(() => {
          if (currentIndex < events.length - 1) {
            stepForward();
          } else {
            togglePlay();
          }
        }, 500 / speed);
      } else {
        clearInterval(playInterval);
      }
    }

    function reset() {
      if (isPlaying) togglePlay();
      currentIndex = 0;
      render();
    }

    function setSpeed(val) {
      speed = parseFloat(val);
      if (isPlaying) {
        togglePlay();
        togglePlay();
      }
    }

    // 진행바 클릭
    document.getElementById('progressBar').onclick = function(e) {
      const rect = this.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      currentIndex = Math.floor(percent * events.length);
      render();
    };

    render();
  </script>
</body>
</html>`;

  if (outputPath) {
    writeFileSync(outputPath, html, 'utf-8');
    return outputPath;
  }

  return html;
}

// ==================== 콘솔 리플레이 ====================

export function playReplayInConsole(replay: ReplayData): void {
  console.log('\n' + '═'.repeat(60));
  console.log(`⚔️ 전투 리플레이: vs ${replay.config.enemyName}`);
  console.log('═'.repeat(60));

  let lastTurn = 0;

  for (const event of replay.events) {
    if (event.turn !== lastTurn) {
      console.log(`\n--- 턴 ${event.turn} ---`);
      lastTurn = event.turn;
    }

    const prefix = event.actor === 'player' ? '🟢' :
      event.actor === 'enemy' ? '🔴' : '⚪';

    console.log(`${prefix} ${event.description}`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`결과: ${replay.result.winner === 'player' ? '🏆 승리' : '💀 패배'}`);
  console.log(`총 ${replay.result.turns}턴, 피해량: ${replay.result.playerDamageDealt}`);
  console.log('═'.repeat(60) + '\n');
}
