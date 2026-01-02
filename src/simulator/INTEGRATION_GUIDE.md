# 시뮬레이터 통합 가이드

## 개요

하하하GO 시뮬레이터는 게임의 전투 시스템을 시뮬레이션하여 밸런스 분석, AI 최적화, 카드 시너지 발견 등을 지원합니다.

## 주요 모듈

### 1. 데이터 동기화 (`data/sync.ts`)

게임 데이터를 시뮬레이터 형식으로 변환합니다.

```typescript
import { syncCards, syncEnemies, syncRelics, saveAllData } from './data/sync';

// 카드 데이터 동기화
const cards = syncCards();

// 전체 데이터 저장
saveAllData();
```

### 2. 게임 연동 (`core/game-adapter.ts`)

게임 상태와 시뮬레이터 간 변환을 담당합니다.

```typescript
import { getGameAdapter } from './core/game-adapter';

const adapter = getGameAdapter();

// 게임 상태 → 시뮬레이터 상태
const simState = adapter.toSimulatorState(gameState);

// 최적 액션 추천
const recommendations = adapter.getRecommendedAction(gameState, results);

// 현재 턴 분석
const analysis = adapter.analyzeTurnOptions(gameState);
```

### 3. 전투 시뮬레이션 (`parallel/worker.ts`)

병렬 전투 시뮬레이션을 실행합니다.

**토큰 시스템:**
- `strength` - 영구 공격력 증가
- `vulnerable` - 받는 피해 50% 증가 (턴마다 감소)
- `weak` - 주는 피해 25% 감소
- `burn/poison` - 턴마다 피해
- `offensive/defensive` - 일시적 공/방 증가

**콤보 시스템:**
- `double_strike` - 빠른 베기 x2: +3 피해
- `offense_defense` - 공격+방어: +2 방어, 1장 드로우
- `heavy_combo` - 충전+강타: +5 피해

### 4. 시너지 분석 (`analysis/synergy.ts`)

카드 조합의 시너지를 분석합니다.

```typescript
import { SynergyAnalyzer } from './analysis/synergy';

const analyzer = new SynergyAnalyzer(simulator);

// 기준선 설정
await analyzer.establishBaseline();

// 쌍 시너지 분석
const pair = await analyzer.analyzePairSynergy('quick_slash', 'guard');

// 3장 시너지 분석
const triple = await analyzer.analyzeTripleSynergy('slash', 'guard', 'charge');

// 최적 덱 찾기
const deck = await analyzer.findOptimalDeck(8);

// 시너지 네트워크 구축
const network = await analyzer.buildSynergyNetwork();
```

### 5. MCTS AI (`analysis/mcts.ts`)

Monte Carlo Tree Search로 최적 플레이를 찾습니다.

```typescript
import { MCTSPlayer } from './analysis/mcts';

const player = new MCTSPlayer({
  maxIterations: 500,
  timeLimit: 2000,
});

// AI 게임 플레이
const result = await player.playGame(deck, enemyId, (turn, action, state) => {
  console.log(`턴 ${turn}: ${action}`);
});
```

### 6. 대시보드 (`dashboard/server.ts`)

실시간 시뮬레이션 모니터링 대시보드입니다.

```typescript
import { startDashboard } from './dashboard/server';

const server = await startDashboard(3001);
// http://localhost:3001 에서 접속
```

### 7. 벤치마크 (`benchmark/index.ts`)

성능 측정 도구입니다.

```typescript
import { BenchmarkRunner, BENCHMARK_PRESETS } from './benchmark';

const runner = new BenchmarkRunner();

// 빠른 테스트
await runner.run(BENCHMARK_PRESETS.quick);

// 스케일링 테스트
await runner.testScaling();

// 메모리 프로파일링
await runner.profileMemory();
```

### 8. 캐시 (`cache/index.ts`)

시뮬레이션 결과를 캐싱합니다.

```typescript
import { MemoryCache, SimulationCacheManager } from './cache';

const cache = new MemoryCache({ maxSize: 1000 });
const manager = new SimulationCacheManager(cache);

// 캐시 확인
const cached = await manager.getCached(config);

// 결과 캐싱
await manager.setCached(config, result);
```

## 설정 예시

### 기본 시뮬레이션

```typescript
const config = {
  battles: 1000,
  maxTurns: 30,
  enemyIds: ['ghoul', 'marauder'],
  playerDeck: ['quick_slash', 'quick_slash', 'guard', 'guard', 'heavy_strike', 'dash'],
  playerStats: {
    hp: 100,
    maxHp: 100,
    energy: 3,
  },
  playerRelics: ['iron_will'],
};
```

### 덱 프리셋

```typescript
import { syncPresets } from './data/sync';

const presets = syncPresets();
// starter, aggressive, defensive, balanced
```

## 테스트

```bash
# 전체 테스트
npm test -- src/simulator

# 특정 테스트
npm test -- src/simulator/tests/battle-engine.test.ts
```

## 파일 구조

```
src/simulator/
├── core/
│   ├── types.ts          # 타입 정의
│   ├── battle-engine.ts  # 전투 엔진
│   └── game-adapter.ts   # 게임 연동
├── data/
│   ├── sync.ts           # 데이터 동기화
│   └── loader.ts         # 데이터 로더
├── parallel/
│   ├── worker.ts         # Worker 전투 로직
│   └── pool.ts           # Worker 풀
├── analysis/
│   ├── synergy.ts        # 시너지 분석
│   ├── mcts.ts           # MCTS AI
│   ├── trends.ts         # 트렌드 분석
│   └── balance.ts        # 밸런스 분석
├── dashboard/
│   └── server.ts         # WebSocket 대시보드
├── benchmark/
│   └── index.ts          # 성능 벤치마크
├── cache/
│   └── index.ts          # 캐싱 레이어
├── tests/
│   ├── battle-engine.test.ts
│   ├── cache.test.ts
│   └── analysis.test.ts
└── index.ts              # 메인 엔트리
```

## 주의사항

1. **데이터 동기화**: 게임 데이터 변경 시 `saveAllData()` 실행 필요
2. **Worker 메모리**: 대량 시뮬레이션 시 Worker 수 조절 필요
3. **캐시 무효화**: 카드/적 밸런스 변경 시 캐시 초기화 권장
4. **테스트**: 변경 후 테스트 실행으로 안정성 확인

## 성능 팁

- Worker 풀 크기는 CPU 코어 수의 75% 권장
- 캐시 TTL은 밸런스 안정화 정도에 따라 조절
- 대량 시뮬레이션은 배치 단위로 분할 실행
