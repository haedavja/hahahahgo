# 프로젝트 구조

```
src/
├── components/          # React 컴포넌트
│   ├── battle/          # 전투 시스템
│   │   ├── ui/          # UI 컴포넌트
│   │   ├── hooks/       # 전투 훅
│   │   ├── logic/       # 전투 로직
│   │   └── reducer/     # 상태 리듀서
│   ├── dungeon/         # 던전 탐험
│   ├── growth/          # 성장 시스템
│   ├── map/             # 맵 시스템
│   ├── shop/            # 상점
│   └── dev/             # 개발자 도구
│
├── data/                # 게임 데이터
│   ├── cards.ts         # 카드 데이터
│   ├── relics.ts        # 상징 데이터
│   ├── anomalies.ts     # 이변 데이터
│   └── tokens.ts        # 토큰 데이터
│
├── lib/                 # 유틸리티 라이브러리
│   ├── speedQueue.ts    # 속도 큐
│   ├── etherUtils.ts    # 에테르 계산
│   └── relicEffects.ts  # 상징 효과
│
├── state/               # Zustand 상태 관리
│   ├── gameStore.ts     # 메인 스토어
│   └── slices/          # 상태 슬라이스
│
├── types/               # TypeScript 타입
│
└── test/                # 테스트 설정
```

## 주요 디렉토리

### `components/battle/`

전투 시스템의 핵심 컴포넌트:

- `BattleApp.tsx` - 메인 전투 컨테이너
- `BattleScreen.tsx` - 전투 화면
- `ui/HandArea.tsx` - 카드 핸드
- `ui/TimelineDisplay.tsx` - 타임라인 표시

### `data/`

게임 데이터 정의:

- 카드, 상징, 토큰, 이변 등
- 적 데이터, 던전 노드 데이터

### `state/`

Zustand 기반 상태 관리:

```typescript
// 상태 접근
const value = useGameStore(state => state.someValue);

// 컴포넌트 외부에서 접근
useGameStore.getState().someAction();
```
