/**
 * @file server.ts
 * @description 실시간 WebSocket 대시보드 서버
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
// @ts-ignore - ws module may not have type declarations
import { WebSocketServer, WebSocket } from 'ws';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';
import type {
  DashboardState,
  SimulationProgress,
  SimulationResult,
  SystemStats,
} from '../core/types';
import { getDefaultStorage } from '../persistence/storage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==================== 대시보드 서버 ====================

export interface DashboardServerOptions {
  port: number;
  host: string;
  staticDir?: string;
}

// WebSocket 메시지 타입
interface ClientMessage {
  type: 'subscribe' | 'command' | 'ping';
  payload?: CommandPayload;
}

interface CommandPayload {
  action: string;
  data?: Record<string, unknown>;
}

interface ServerMessage {
  type: 'init' | 'progress' | 'complete' | 'stats' | 'pong';
  payload?: unknown;
}

export class DashboardServer extends EventEmitter {
  private httpServer: ReturnType<typeof createServer>;
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private state: DashboardState;
  private options: Required<DashboardServerOptions>;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(options: Partial<DashboardServerOptions> = {}) {
    super();

    this.options = {
      port: options.port || 3001,
      host: options.host || 'localhost',
      staticDir: options.staticDir || join(__dirname, 'public'),
    };

    this.state = {
      activeSimulations: [],
      recentResults: [],
      systemStats: {
        cpuUsage: 0,
        memoryUsage: 0,
        activeWorkers: 0,
        totalSimulations: 0,
        avgSimulationTime: 0,
      },
    };

    // HTTP 서버 생성
    this.httpServer = createServer(this.handleHttpRequest.bind(this));

    // WebSocket 서버 생성
    this.wss = new WebSocketServer({ server: this.httpServer });
    this.wss.on('connection', this.handleConnection.bind(this));
  }

  // ==================== 서버 시작/종료 ====================

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer.listen(this.options.port, this.options.host, () => {
        console.log(`📊 대시보드 서버 시작: http://${this.options.host}:${this.options.port}`);

        // 주기적 상태 업데이트 시작
        this.updateInterval = setInterval(() => this.updateSystemStats(), 1000);

        this.emit('started');
        resolve();
      });

      this.httpServer.on('error', reject);
    });
  }

  async stop(): Promise<void> {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // 모든 클라이언트 연결 종료
    for (const client of this.clients) {
      client.close();
    }

    return new Promise((resolve) => {
      this.wss.close(() => {
        this.httpServer.close(() => {
          this.emit('stopped');
          resolve();
        });
      });
    });
  }

  // ==================== HTTP 핸들러 ====================

  private handleHttpRequest(req: IncomingMessage, res: ServerResponse): void {
    const url = req.url || '/';

    // API 엔드포인트
    if (url.startsWith('/api/')) {
      this.handleApiRequest(url, req, res);
      return;
    }

    // 정적 파일 제공
    let filePath: string;
    if (url === '/' || url === '/index.html') {
      filePath = join(this.options.staticDir, 'index.html');
    } else {
      filePath = join(this.options.staticDir, url);
    }

    // 파일이 없으면 기본 대시보드 HTML 반환
    if (!existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(this.getDefaultDashboardHtml());
      return;
    }

    try {
      const content = readFileSync(filePath);
      const contentType = this.getContentType(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not Found');
    }
  }

  private handleApiRequest(url: string, req: IncomingMessage, res: ServerResponse): void {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (url === '/api/state') {
      res.writeHead(200);
      res.end(JSON.stringify(this.state));
    } else if (url === '/api/history') {
      this.getHistory().then((history) => {
        res.writeHead(200);
        res.end(JSON.stringify(history));
      });
    } else if (url === '/api/stats') {
      res.writeHead(200);
      res.end(JSON.stringify(this.state.systemStats));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
  }

  private getContentType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const types: Record<string, string> = {
      html: 'text/html',
      css: 'text/css',
      js: 'application/javascript',
      json: 'application/json',
      png: 'image/png',
      jpg: 'image/jpeg',
      svg: 'image/svg+xml',
    };
    return types[ext || ''] || 'application/octet-stream';
  }

  // ==================== WebSocket 핸들러 ====================

  private handleConnection(ws: WebSocket): void {
    this.clients.add(ws);
    console.log(`📡 클라이언트 연결 (총 ${this.clients.size}명)`);

    // 초기 상태 전송
    this.sendToClient(ws, {
      type: 'init',
      payload: this.state,
    });

    ws.on('message', (data: unknown) => {
      try {
        const message = JSON.parse(String(data));
        this.handleClientMessage(ws, message);
      } catch {
        console.error('Invalid message received');
      }
    });

    ws.on('close', () => {
      this.clients.delete(ws);
      console.log(`📡 클라이언트 연결 해제 (총 ${this.clients.size}명)`);
    });

    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      this.clients.delete(ws);
    });
  }

  private handleClientMessage(ws: WebSocket, message: ClientMessage): void {
    switch (message.type) {
      case 'subscribe':
        // 특정 이벤트 구독
        break;

      case 'command':
        // 명령 처리
        this.handleCommand(message.payload);
        break;

      case 'ping':
        this.sendToClient(ws, { type: 'pong' });
        break;
    }
  }

  private handleCommand(command: CommandPayload | undefined): void {
    if (command) {
      this.emit('command', command);
    }
  }

  // ==================== 브로드캐스트 ====================

  private sendToClient(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  broadcast(message: ServerMessage): void {
    const data = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  // ==================== 상태 업데이트 ====================

  updateSimulationProgress(progress: SimulationProgress): void {
    const idx = this.state.activeSimulations.findIndex(s => s.id === progress.id);

    if (idx >= 0) {
      this.state.activeSimulations[idx] = progress;
    } else {
      this.state.activeSimulations.push(progress);
    }

    this.broadcast({
      type: 'progress',
      payload: progress,
    });
  }

  completeSimulation(result: SimulationResult): void {
    // 활성 시뮬레이션에서 제거
    this.state.activeSimulations = this.state.activeSimulations.filter(
      s => !result.config.enemyIds.includes(s.id)
    );

    // 최근 결과에 추가
    this.state.recentResults.unshift(result);
    if (this.state.recentResults.length > 10) {
      this.state.recentResults.pop();
    }

    this.state.systemStats.totalSimulations++;

    this.broadcast({
      type: 'complete',
      payload: result,
    });
  }

  private updateSystemStats(): void {
    const memUsage = process.memoryUsage();

    this.state.systemStats = {
      ...this.state.systemStats,
      cpuUsage: process.cpuUsage().user / 1000000,
      memoryUsage: memUsage.heapUsed / memUsage.heapTotal,
      activeWorkers: this.state.activeSimulations.length,
    };

    this.broadcast({
      type: 'stats',
      payload: this.state.systemStats,
    });
  }

  private async getHistory(): Promise<import('../core/types').HistoryEntry[]> {
    try {
      const storage = getDefaultStorage();
      return await storage.query({ limit: 50 });
    } catch {
      return [];
    }
  }

  // ==================== 기본 대시보드 HTML ====================

  private getDefaultDashboardHtml(): string {
    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>시뮬레이터 대시보드</title>
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
    }

    .header {
      background: var(--card);
      padding: 20px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .header h1 {
      font-size: 1.5rem;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .status {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--success);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      padding: 20px;
    }

    .card {
      background: var(--card);
      border-radius: 12px;
      padding: 20px;
    }

    .card h2 {
      font-size: 1rem;
      color: rgba(255,255,255,0.7);
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .stat {
      font-size: 2.5rem;
      font-weight: bold;
    }

    .stat.success { color: var(--success); }
    .stat.accent { color: var(--accent); }
    .stat.info { color: var(--info); }

    .chart {
      height: 200px;
      display: flex;
      align-items: flex-end;
      gap: 4px;
    }

    .bar {
      flex: 1;
      background: var(--info);
      border-radius: 4px 4px 0 0;
      transition: height 0.3s;
    }

    .log {
      max-height: 300px;
      overflow-y: auto;
      font-family: monospace;
      font-size: 0.85rem;
    }

    .log-entry {
      padding: 8px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }

    .log-entry.success { border-left: 3px solid var(--success); }
    .log-entry.error { border-left: 3px solid var(--accent); }

    .progress-bar {
      height: 8px;
      background: rgba(255,255,255,0.1);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 10px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--info), var(--success));
      transition: width 0.3s;
    }

    .simulation-item {
      padding: 12px;
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
      margin-bottom: 10px;
    }

    .no-data {
      color: rgba(255,255,255,0.5);
      text-align: center;
      padding: 40px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>
      <span class="status" id="status"></span>
      시뮬레이터 대시보드
    </h1>
  </div>

  <div class="container">
    <div class="card">
      <h2>총 시뮬레이션</h2>
      <div class="stat info" id="totalSims">0</div>
    </div>

    <div class="card">
      <h2>평균 승률</h2>
      <div class="stat success" id="avgWinRate">-</div>
    </div>

    <div class="card">
      <h2>활성 워커</h2>
      <div class="stat accent" id="activeWorkers">0</div>
    </div>

    <div class="card">
      <h2>메모리 사용률</h2>
      <div class="stat info" id="memoryUsage">0%</div>
    </div>

    <div class="card" style="grid-column: span 2;">
      <h2>활성 시뮬레이션</h2>
      <div id="activeSimulations">
        <div class="no-data">활성 시뮬레이션 없음</div>
      </div>
    </div>

    <div class="card" style="grid-column: span 2;">
      <h2>실시간 로그</h2>
      <div class="log" id="log">
        <div class="log-entry">대시보드가 시작되었습니다.</div>
      </div>
    </div>
  </div>

  <script>
    const wsUrl = 'ws://' + window.location.host;
    let ws;
    let reconnectAttempts = 0;

    function connect() {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        document.getElementById('status').style.background = 'var(--success)';
        addLog('WebSocket 연결됨', 'success');
        reconnectAttempts = 0;
      };

      ws.onclose = () => {
        document.getElementById('status').style.background = 'var(--accent)';
        addLog('연결 끊김, 재연결 시도...', 'error');

        if (reconnectAttempts < 5) {
          reconnectAttempts++;
          setTimeout(connect, 2000 * reconnectAttempts);
        }
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleMessage(message);
      };
    }

    function handleMessage(message) {
      switch (message.type) {
        case 'init':
          updateState(message.payload);
          break;

        case 'progress':
          updateProgress(message.payload);
          break;

        case 'complete':
          handleComplete(message.payload);
          break;

        case 'stats':
          updateStats(message.payload);
          break;
      }
    }

    function updateState(state) {
      updateStats(state.systemStats);

      if (state.recentResults.length > 0) {
        const avgWinRate = state.recentResults.reduce((sum, r) =>
          sum + r.summary.winRate, 0) / state.recentResults.length;
        document.getElementById('avgWinRate').textContent =
          (avgWinRate * 100).toFixed(1) + '%';
      }
    }

    function updateProgress(progress) {
      const container = document.getElementById('activeSimulations');
      let item = document.getElementById('sim-' + progress.id);

      if (!item) {
        item = document.createElement('div');
        item.id = 'sim-' + progress.id;
        item.className = 'simulation-item';
        container.innerHTML = '';
        container.appendChild(item);
      }

      item.innerHTML = \`
        <div><strong>\${progress.id}</strong></div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: \${progress.progress * 100}%"></div>
        </div>
        <div style="margin-top: 5px; font-size: 0.85rem; opacity: 0.7;">
          \${(progress.progress * 100).toFixed(1)}%
        </div>
      \`;
    }

    function handleComplete(result) {
      document.getElementById('totalSims').textContent =
        parseInt(document.getElementById('totalSims').textContent) + 1;

      addLog(\`시뮬레이션 완료: 승률 \${(result.summary.winRate * 100).toFixed(1)}%\`,
        result.summary.winRate > 0.5 ? 'success' : 'error');
    }

    function updateStats(stats) {
      document.getElementById('totalSims').textContent = stats.totalSimulations;
      document.getElementById('activeWorkers').textContent = stats.activeWorkers;
      document.getElementById('memoryUsage').textContent =
        (stats.memoryUsage * 100).toFixed(1) + '%';
    }

    function addLog(message, type = '') {
      const log = document.getElementById('log');
      const entry = document.createElement('div');
      entry.className = 'log-entry ' + type;
      entry.textContent = new Date().toLocaleTimeString() + ' - ' + message;
      log.insertBefore(entry, log.firstChild);

      while (log.children.length > 50) {
        log.removeChild(log.lastChild);
      }
    }

    connect();
  </script>
</body>
</html>`;
  }
}

// ==================== 헬퍼 함수 ====================

export async function startDashboard(port: number = 3001): Promise<DashboardServer> {
  const server = new DashboardServer({ port });
  await server.start();
  return server;
}
