#!/usr/bin/env node
/**
 * @file enhanced-cli.ts
 * @description 향상된 시뮬레이터 CLI - 다양한 출력 형식, 필터, 진행바 지원
 *
 * 기능:
 * - JSON/CSV/Markdown 출력
 * - 결과 필터링
 * - 진행바 표시
 * - 대화형 모드
 * - 프로필 저장/로드
 * - 배치 실행
 */

import { createInterface } from 'readline';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadCards, loadEnemies, loadPresets } from '../data/loader';
import { getDefaultCache, formatCacheStats } from '../cache';
import type { SimulationConfig, SimulationResult, BattleResult } from '../core/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==================== 타입 정의 ====================

export interface CLIOptions {
  output: 'console' | 'json' | 'csv' | 'markdown';
  outputFile?: string;
  filter?: FilterOptions;
  verbose: boolean;
  noCache: boolean;
  profile?: string;
  batchFile?: string;
  interactive: boolean;
}

export interface FilterOptions {
  minWinRate?: number;
  maxWinRate?: number;
  minTurns?: number;
  maxTurns?: number;
  winner?: 'player' | 'enemy';
  cardUsed?: string[];
  enemyId?: string;
}

export interface SimulationProfile {
  name: string;
  config: SimulationConfig;
  created: number;
  lastRun?: number;
}

// ==================== 진행바 ====================

export class ProgressBar {
  private total: number;
  private current: number = 0;
  private width: number;
  private startTime: number = Date.now();
  private lastUpdate: number = 0;

  constructor(total: number, width: number = 40) {
    this.total = total;
    this.width = width;
  }

  update(current: number): void {
    this.current = current;
    const now = Date.now();

    // 100ms마다 업데이트
    if (now - this.lastUpdate < 100 && current < this.total) return;
    this.lastUpdate = now;

    const percent = this.total > 0 ? this.current / this.total : 0;
    const filled = Math.round(this.width * percent);
    const empty = this.width - filled;

    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const percentStr = (percent * 100).toFixed(1).padStart(5);

    // ETA 계산
    const elapsed = (now - this.startTime) / 1000;
    const rate = this.current / elapsed;
    const remaining = this.total - this.current;
    const eta = rate > 0 ? remaining / rate : 0;
    const etaStr = this.formatTime(eta);

    process.stdout.write(`\r[${bar}] ${percentStr}% | ${this.current}/${this.total} | ETA: ${etaStr}`);

    if (current >= this.total) {
      process.stdout.write('\n');
    }
  }

  private formatTime(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }

  finish(): void {
    this.update(this.total);
    const elapsed = (Date.now() - this.startTime) / 1000;
    console.log(`✓ 완료 (${this.formatTime(elapsed)})`);
  }
}

// ==================== 출력 포맷터 ====================

export class OutputFormatter {
  static toJSON(result: SimulationResult, pretty: boolean = true): string {
    return pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result);
  }

  static toCSV(results: BattleResult[]): string {
    const headers = [
      'battleId',
      'winner',
      'turns',
      'playerHp',
      'enemyHp',
      'playerDamage',
      'enemyDamage',
      'cardsUsed',
    ];

    const rows = results.map(r => [
      r.battleId || '',
      r.winner,
      r.turns,
      r.playerFinalHp,
      r.enemyFinalHp,
      r.playerDamageDealt,
      r.enemyDamageDealt,
      Object.keys(r.cardUsage).join(';'),
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');
  }

  static toMarkdown(result: SimulationResult): string {
    const lines = [
      '# 시뮬레이션 결과',
      '',
      '## 요약',
      '',
      `| 항목 | 값 |`,
      `|------|-----|`,
      `| 총 전투 | ${result.summary.totalBattles} |`,
      `| 승리 | ${result.summary.wins} |`,
      `| 패배 | ${result.summary.losses} |`,
      `| 승률 | ${(result.summary.winRate * 100).toFixed(1)}% |`,
      `| 평균 턴 | ${result.summary.avgTurns.toFixed(1)} |`,
      `| 평균 플레이어 피해 | ${result.summary.avgPlayerDamage.toFixed(1)} |`,
      `| 평균 적 피해 | ${result.summary.avgEnemyDamage.toFixed(1)} |`,
      '',
    ];

    if (result.summary.topCards && result.summary.topCards.length > 0) {
      lines.push('## 상위 카드');
      lines.push('');
      lines.push('| 순위 | 카드 | 사용 횟수 |');
      lines.push('|------|------|----------|');
      result.summary.topCards.forEach((card, i) => {
        lines.push(`| ${i + 1} | ${card.cardId} | ${card.count} |`);
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  static toConsole(result: SimulationResult): void {
    console.log('\n' + '═'.repeat(60));
    console.log('📊 시뮬레이션 결과');
    console.log('═'.repeat(60));

    console.log(`\n📈 전체 통계:`);
    console.log(`   총 전투: ${result.summary.totalBattles}`);
    console.log(`   승리: ${result.summary.wins} | 패배: ${result.summary.losses}`);
    console.log(`   승률: ${(result.summary.winRate * 100).toFixed(1)}%`);
    console.log(`   평균 턴: ${result.summary.avgTurns.toFixed(1)}`);

    console.log(`\n💥 피해 통계:`);
    console.log(`   평균 플레이어 피해: ${result.summary.avgPlayerDamage.toFixed(1)}`);
    console.log(`   평균 적 피해: ${result.summary.avgEnemyDamage.toFixed(1)}`);

    if (result.summary.topCards && result.summary.topCards.length > 0) {
      console.log(`\n🃏 상위 카드:`);
      result.summary.topCards.slice(0, 5).forEach((card, i) => {
        console.log(`   ${i + 1}. ${card.cardId}: ${card.count}회`);
      });
    }

    console.log('\n' + '═'.repeat(60));
  }
}

// ==================== 결과 필터 ====================

export class ResultFilter {
  static filter(results: BattleResult[], options: FilterOptions): BattleResult[] {
    return results.filter(r => {
      if (options.winner && r.winner !== options.winner) return false;
      if (options.minTurns && r.turns < options.minTurns) return false;
      if (options.maxTurns && r.turns > options.maxTurns) return false;
      if (options.enemyId && r.enemyId !== options.enemyId) return false;

      if (options.cardUsed && options.cardUsed.length > 0) {
        const usedCards = Object.keys(r.cardUsage);
        if (!options.cardUsed.every(c => usedCards.includes(c))) return false;
      }

      return true;
    });
  }

  static filterByWinRate(result: SimulationResult, min?: number, max?: number): boolean {
    if (min !== undefined && result.summary.winRate < min) return false;
    if (max !== undefined && result.summary.winRate > max) return false;
    return true;
  }
}

// ==================== 프로필 관리 ====================

export class ProfileManager {
  private profilesPath: string;

  constructor(basePath?: string) {
    this.profilesPath = basePath || join(__dirname, '../../data/profiles');
    if (!existsSync(this.profilesPath)) {
      mkdirSync(this.profilesPath, { recursive: true });
    }
  }

  save(profile: SimulationProfile): void {
    const filePath = join(this.profilesPath, `${profile.name}.json`);
    writeFileSync(filePath, JSON.stringify(profile, null, 2), 'utf-8');
    console.log(`✓ 프로필 저장: ${profile.name}`);
  }

  load(name: string): SimulationProfile | null {
    const filePath = join(this.profilesPath, `${name}.json`);
    if (!existsSync(filePath)) {
      console.error(`✗ 프로필 없음: ${name}`);
      return null;
    }
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  }

  list(): string[] {
    if (!existsSync(this.profilesPath)) return [];
    const files = require('fs').readdirSync(this.profilesPath);
    return files
      .filter((f: string) => f.endsWith('.json'))
      .map((f: string) => f.replace('.json', ''));
  }

  delete(name: string): boolean {
    const filePath = join(this.profilesPath, `${name}.json`);
    if (existsSync(filePath)) {
      require('fs').unlinkSync(filePath);
      return true;
    }
    return false;
  }
}

// ==================== 배치 실행기 ====================

export interface BatchJob {
  name: string;
  config: SimulationConfig;
}

export interface BatchResult {
  job: BatchJob;
  result: SimulationResult;
  duration: number;
}

export class BatchRunner {
  private jobs: BatchJob[] = [];

  loadFromFile(filePath: string): void {
    if (!existsSync(filePath)) {
      throw new Error(`배치 파일 없음: ${filePath}`);
    }
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    this.jobs = data.jobs || [];
    console.log(`✓ ${this.jobs.length}개 작업 로드됨`);
  }

  addJob(job: BatchJob): void {
    this.jobs.push(job);
  }

  async run(
    simulator: (config: SimulationConfig) => Promise<SimulationResult>,
    onProgress?: (completed: number, total: number, current: BatchJob) => void
  ): Promise<BatchResult[]> {
    const results: BatchResult[] = [];

    for (let i = 0; i < this.jobs.length; i++) {
      const job = this.jobs[i];
      onProgress?.(i, this.jobs.length, job);

      const start = Date.now();
      const result = await simulator(job.config);
      const duration = Date.now() - start;

      results.push({ job, result, duration });
    }

    return results;
  }

  generateReport(results: BatchResult[]): string {
    const lines = [
      '# 배치 실행 결과',
      '',
      '| 작업 | 전투 수 | 승률 | 평균 턴 | 소요 시간 |',
      '|------|---------|------|---------|----------|',
    ];

    for (const r of results) {
      lines.push(
        `| ${r.job.name} | ${r.result.summary.totalBattles} | ` +
        `${(r.result.summary.winRate * 100).toFixed(1)}% | ` +
        `${r.result.summary.avgTurns.toFixed(1)} | ` +
        `${(r.duration / 1000).toFixed(1)}s |`
      );
    }

    return lines.join('\n');
  }
}

// ==================== 대화형 모드 ====================

export class InteractiveCLI {
  private rl: ReturnType<typeof createInterface>;
  private cards: Record<string, unknown>;
  private enemies: Record<string, unknown>;
  private profileManager: ProfileManager;
  private running: boolean = true;

  constructor() {
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.cards = loadCards();
    this.enemies = loadEnemies();
    this.profileManager = new ProfileManager();
  }

  private prompt(question: string): Promise<string> {
    return new Promise(resolve => {
      this.rl.question(question, resolve);
    });
  }

  async start(): Promise<void> {
    console.log('\n🎮 하하하GO 시뮬레이터 대화형 모드');
    console.log('═'.repeat(50));
    console.log('명령어: help, cards, enemies, simulate, profile, cache, quit');
    console.log('');

    while (this.running) {
      const input = await this.prompt('sim> ');
      await this.processCommand(input.trim());
    }

    this.rl.close();
  }

  private async processCommand(input: string): Promise<void> {
    const [command, ...args] = input.split(' ');

    switch (command.toLowerCase()) {
      case 'help':
        this.showHelp();
        break;

      case 'cards':
        this.listCards(args[0]);
        break;

      case 'enemies':
        this.listEnemies();
        break;

      case 'simulate':
      case 'sim':
        await this.runSimulation();
        break;

      case 'profile':
        await this.handleProfile(args);
        break;

      case 'cache':
        this.showCacheStats();
        break;

      case 'quit':
      case 'exit':
      case 'q':
        this.running = false;
        console.log('👋 종료합니다.');
        break;

      case '':
        break;

      default:
        console.log(`알 수 없는 명령: ${command}. 'help'로 도움말을 확인하세요.`);
    }
  }

  private showHelp(): void {
    console.log(`
명령어:
  help              도움말 표시
  cards [type]      카드 목록 (타입 필터: attack, defense, skill)
  enemies           적 목록
  simulate          시뮬레이션 실행 (대화형)
  profile list      저장된 프로필 목록
  profile load <n>  프로필 로드
  profile save <n>  현재 설정을 프로필로 저장
  cache             캐시 통계
  quit              종료
`);
  }

  private listCards(typeFilter?: string): void {
    console.log('\n🃏 카드 목록:');
    let count = 0;
    for (const [id, card] of Object.entries(this.cards)) {
      const c = card as { name: string; type: string; attack?: number; defense?: number };
      if (typeFilter && c.type !== typeFilter) continue;

      const stats = c.attack ? `⚔${c.attack}` : c.defense ? `🛡${c.defense}` : '';
      console.log(`  ${id}: ${c.name} [${c.type}] ${stats}`);
      count++;
    }
    console.log(`\n총 ${count}개 카드`);
  }

  private listEnemies(): void {
    console.log('\n👹 적 목록:');
    for (const [id, enemy] of Object.entries(this.enemies)) {
      const e = enemy as { name: string; maxHp: number };
      console.log(`  ${id}: ${e.name} (HP: ${e.maxHp})`);
    }
  }

  private async runSimulation(): Promise<void> {
    console.log('\n📊 시뮬레이션 설정');

    const battlesStr = await this.prompt('전투 수 [100]: ');
    const battles = parseInt(battlesStr) || 100;

    const enemyInput = await this.prompt('적 ID (쉼표 구분) [ghoul]: ');
    const enemyIds = enemyInput ? enemyInput.split(',').map(s => s.trim()) : ['ghoul'];

    const deckInput = await this.prompt('덱 (쉼표 구분) [slash,slash,defend,defend]: ');
    const deck = deckInput
      ? deckInput.split(',').map(s => s.trim())
      : ['slash', 'slash', 'defend', 'defend'];

    console.log(`\n설정: ${battles}회 전투, 적: ${enemyIds.join(', ')}, 덱: ${deck.join(', ')}`);
    const confirm = await this.prompt('실행? (y/n) [y]: ');

    if (confirm.toLowerCase() !== 'n') {
      console.log('\n시뮬레이션 실행 중... (실제 실행은 simulator 모듈 필요)');
      // 실제 시뮬레이션은 simulator 모듈 연동 필요
    }
  }

  private async handleProfile(args: string[]): Promise<void> {
    const [action, name] = args;

    switch (action) {
      case 'list':
        const profiles = this.profileManager.list();
        console.log('\n저장된 프로필:');
        profiles.forEach(p => console.log(`  - ${p}`));
        break;

      case 'load':
        if (!name) {
          console.log('사용법: profile load <이름>');
          return;
        }
        const loaded = this.profileManager.load(name);
        if (loaded) {
          console.log(`프로필 로드됨: ${loaded.name}`);
          console.log(`설정: ${JSON.stringify(loaded.config, null, 2)}`);
        }
        break;

      case 'save':
        if (!name) {
          console.log('사용법: profile save <이름>');
          return;
        }
        // 현재 설정 저장 로직
        console.log(`프로필 저장: ${name}`);
        break;

      default:
        console.log('사용법: profile [list|load|save] [이름]');
    }
  }

  private showCacheStats(): void {
    const cache = getDefaultCache();
    // 캐시 통계는 TieredCache에서 가져옴
    console.log('\n📦 캐시 통계:');
    console.log('  (캐시 상세 정보는 cache 모듈 참조)');
  }
}

// ==================== 메인 CLI ====================

export function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    output: 'console',
    verbose: false,
    noCache: false,
    interactive: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--output':
      case '-o':
        options.output = args[++i] as CLIOptions['output'];
        break;

      case '--output-file':
      case '-f':
        options.outputFile = args[++i];
        break;

      case '--verbose':
      case '-v':
        options.verbose = true;
        break;

      case '--no-cache':
        options.noCache = true;
        break;

      case '--profile':
      case '-p':
        options.profile = args[++i];
        break;

      case '--batch':
      case '-b':
        options.batchFile = args[++i];
        break;

      case '--interactive':
      case '-i':
        options.interactive = true;
        break;

      case '--filter-winner':
        options.filter = options.filter || {};
        options.filter.winner = args[++i] as 'player' | 'enemy';
        break;

      case '--filter-min-turns':
        options.filter = options.filter || {};
        options.filter.minTurns = parseInt(args[++i]);
        break;

      case '--filter-max-turns':
        options.filter = options.filter || {};
        options.filter.maxTurns = parseInt(args[++i]);
        break;

      case '--filter-card':
        options.filter = options.filter || {};
        options.filter.cardUsed = options.filter.cardUsed || [];
        options.filter.cardUsed.push(args[++i]);
        break;
    }
  }

  return options;
}

export async function runEnhancedCLI(args: string[]): Promise<void> {
  const options = parseArgs(args);

  if (options.interactive) {
    const cli = new InteractiveCLI();
    await cli.start();
    return;
  }

  console.log('향상된 CLI 옵션:', options);
  console.log('사용: npx ts-node enhanced-cli.ts --interactive');
}

// 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  runEnhancedCLI(process.argv.slice(2));
}
