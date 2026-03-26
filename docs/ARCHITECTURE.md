# 하하하GO 아키텍처 문서

**최종 업데이트**: 2026-01-01
**프로젝트**: 하하하GO (턴제 전략 카드 게임)

---

## 1. 시스템 개요

하하하GO는 포커 조합 기반의 턴제 전략 카드 게임입니다. React 기반의 SPA(Single Page Application)로 구현되어 있으며, Zustand를 사용한 중앙 집중식 상태 관리를 채택하고 있습니다.

### 핵심 게임 시스템
- **전투 시스템**: 포커 조합 기반 턴제 전투 (select → respond → resolve)
- **던전 탐험**: 노드 기반 탐험 시스템
- **성장 시스템**: 피라미드 형태의 카드 성장 트리
- **상징(Relic) 시스템**: 빌드 다양성을 제공하는 패시브 효과
- **이변(Anomaly) 시스템**: 게임플레이를 변화시키는 특수 룰
- **통찰 시스템**: 적 정보 가시성을 조절하는 레벨 시스템 (-3 ~ +3)

### 기술적 특징
- **코드 스플리팅**: 메인 화면과 전투 화면을 lazy loading으로 분리
- **슬라이스 패턴**: 관심사별로 상태와 액션을 분리하여 관리
- **타입 안정성**: 엄격한 TypeScript 타입 시스템 적용
- **테스트 커버리지**: Vitest 단위 테스트 + Playwright E2E 테스트

---

## 2. 기술 스택

### 프론트엔드 프레임워크
- **React 19.2.0**: UI 렌더링
- **TypeScript 5.9.3**: 정적 타입 시스템
- **Vite 7.2.2**: 빌드 도구 (빠른 HMR, 최적화된 프로덕션 빌드)

### 상태 관리
- **Zustand 5.0.8**: 경량 상태 관리 라이브러리
  - `subscribeWithSelector` 미들웨어 사용
  - 슬라이스 패턴으로 상태 분리

### 스타일링
- **Tailwind CSS**: 유틸리티 우선 CSS 프레임워크
- **CSS-in-JS**: 동적 스타일링
- 커스텀 CSS 모듈

### 테스팅
- **Vitest 4.0.15**: 단위 테스트 및 통합 테스트
- **Playwright 1.57.0**: E2E 테스트
- **Testing Library**: React 컴포넌트 테스트

### 개발 도구
- **ESLint**: 코드 품질 관리
- **Husky + lint-staged**: Git hooks를 통한 자동 검증
- **TypeScript Strict Mode**: 엄격한 타입 체킹

---

## 3. 폴더 구조 및 역할

```
/home/user/hahahahgo/
├── src/
│   ├── components/          # UI 컴포넌트
│   │   ├── battle/          # 전투 시스템 (핵심)
│   │   │   ├── context/     # React Context (BattleContext)
│   │   │   ├── hooks/       # 전투 로직 커스텀 훅 (40+ 훅)
│   │   │   ├── logic/       # 순수 전투 로직 함수
│   │   │   ├── reducer/     # 전투 상태 리듀서 (useReducer)
│   │   │   ├── ui/          # 전투 UI 컴포넌트
│   │   │   │   ├── constants/  # UI 상수
│   │   │   │   ├── hand/       # 손패 관련 UI
│   │   │   │   └── timeline/   # 타임라인 관련 UI
│   │   │   └── utils/       # 전투 유틸리티
│   │   ├── dungeon/         # 던전 탐험 시스템
│   │   │   ├── hooks/       # 던전 로직 훅
│   │   │   ├── reducer/     # 던전 상태 리듀서
│   │   │   └── ui/          # 던전 UI
│   │   ├── map/             # 맵 네비게이션 시스템
│   │   │   ├── hooks/       # 맵 로직 훅
│   │   │   ├── reducer/     # 맵 상태 리듀서
│   │   │   ├── ui/          # 맵 UI
│   │   │   │   ├── cardGrowth/  # 카드 성장 UI
│   │   │   │   └── rest/        # 휴식 UI
│   │   │   └── utils/       # 맵 유틸리티
│   │   ├── growth/          # 성장 시스템
│   │   ├── shop/            # 상점 시스템
│   │   ├── character/       # 캐릭터 시트
│   │   ├── relics/          # 상징 UI
│   │   ├── dev/             # 개발자 도구
│   │   │   └── tabs/        # 개발자 탭
│   │   ├── common/          # 공통 UI 컴포넌트
│   │   │   └── card/        # 카드 공통 컴포넌트
│   │   └── phaser/          # Phaser 게임 엔진 컴포넌트
│   │
│   ├── state/               # Zustand 상태 관리
│   │   ├── slices/          # 상태 슬라이스 (관심사 분리)
│   │   │   ├── playerSlice.ts    # 플레이어 HP, 스탯, 자원
│   │   │   ├── mapSlice.ts       # 맵 네비게이션, 위험도
│   │   │   ├── dungeonSlice.ts   # 던전 탐험
│   │   │   ├── battleSlice.ts    # 전투 시작/종료
│   │   │   ├── eventSlice.ts     # 이벤트 처리
│   │   │   ├── buildSlice.ts     # 캐릭터 빌드, 카드 관리
│   │   │   ├── relicSlice.ts     # 상징 추가/제거
│   │   │   ├── itemSlice.ts      # 아이템 관리
│   │   │   ├── restSlice.ts      # 휴식, 각성, 자아 형성
│   │   │   ├── shopSlice.ts      # 상점 열기/닫기
│   │   │   ├── devSlice.ts       # 개발자 도구
│   │   │   ├── growthSlice.ts    # 성장 시스템
│   │   │   └── types.ts          # 슬라이스 타입 정의
│   │   ├── gameStore.ts     # 메인 스토어 (슬라이스 조합)
│   │   └── useGameState.ts  # 초기 상태 생성
│   │
│   ├── data/                # 게임 데이터 (JSON-like)
│   │   ├── cards.ts         # 카드 데이터
│   │   ├── relics.ts        # 상징 데이터
│   │   ├── tokens.ts        # 토큰(상태이상) 데이터
│   │   ├── anomalies.ts     # 이변 데이터
│   │   ├── events.ts        # 이벤트 데이터
│   │   ├── items.ts         # 아이템 데이터
│   │   ├── shop.ts          # 상점 데이터
│   │   ├── enemyPatterns.ts # 적 AI 패턴
│   │   ├── dungeonNodes.ts  # 던전 노드 데이터
│   │   ├── monsterEther.ts  # 몬스터 에테르 데이터
│   │   ├── reflections.ts   # 자아 형성 데이터
│   │   └── growth/          # 성장 관련 데이터
│   │
│   ├── types/               # TypeScript 타입 정의
│   │   ├── index.ts         # 타입 배럴 파일
│   │   ├── core.ts          # 핵심 타입 (Card, Relic, Token 등)
│   │   ├── combat.ts        # 전투 관련 타입
│   │   ├── battle.ts        # 전투 화면 타입
│   │   ├── game.ts          # 게임 상태 타입
│   │   ├── systems.ts       # 시스템 타입
│   │   ├── enemy.ts         # 적 관련 타입
│   │   ├── dungeon.ts       # 던전 타입
│   │   ├── ui.ts            # UI 컴포넌트 타입
│   │   ├── hooks.ts         # 훅 파라미터 타입
│   │   └── guards.ts        # 타입 가드 함수
│   │
│   ├── lib/                 # 유틸리티 라이브러리
│   │   └── tests/           # 라이브러리 테스트
│   │
│   ├── simulator/           # AI 시뮬레이터 (게임 밸런스 테스트)
│   │   ├── ai/              # AI 플레이어 로직
│   │   ├── core/            # 시뮬레이터 코어
│   │   ├── analysis/        # 결과 분석
│   │   ├── benchmark/       # 벤치마크
│   │   ├── dashboard/       # 대시보드
│   │   ├── experiments/     # 실험 시스템
│   │   └── ...
│   │
│   ├── hooks/               # 공통 커스텀 훅
│   ├── styles/              # 전역 스타일
│   ├── test/                # 테스트 유틸리티
│   └── assets/              # 정적 자산
│
├── docs/                    # 프로젝트 문서
├── CHANGELOG/               # 버전별 변경 이력
└── public/                  # 공개 자산
```

---

## 4. 데이터 흐름 (Zustand 상태 관리)

### 4.1 아키텍처 패턴

하하하GO는 **슬라이스 패턴**을 사용하여 상태를 관심사별로 분리합니다.

```
┌─────────────────────────────────────────────────────────────┐
│                      gameStore.ts                           │
│                   (메인 Zustand 스토어)                      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         createInitialState()                         │  │
│  │         + applyInitialRelicEffects()                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↓                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Slices (각 슬라이스는 독립적인 액션 함수 제공)      │  │
│  │  ├── playerSlice      (플레이어 HP, 스탯, 자원)     │  │
│  │  ├── mapSlice         (맵 네비게이션, 위험도)       │  │
│  │  ├── dungeonSlice     (던전 탐험)                   │  │
│  │  ├── battleSlice      (전투 시작/종료)              │  │
│  │  ├── eventSlice       (이벤트 처리)                 │  │
│  │  ├── buildSlice       (캐릭터 빌드, 카드 관리)      │  │
│  │  ├── relicSlice       (상징 추가/제거)              │  │
│  │  ├── itemSlice        (아이템 관리)                 │  │
│  │  ├── restSlice        (휴식, 각성, 자아 형성)       │  │
│  │  ├── shopSlice        (상점)                        │  │
│  │  ├── devSlice         (개발자 도구)                 │  │
│  │  └── growthSlice      (성장 시스템)                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
┌───────────────────┐                 ┌──────────────────┐
│  UI Components    │                 │  Local State     │
│  - useGameStore() │                 │  - useReducer    │
│  - 셀렉터 사용    │                 │  - useState      │
└───────────────────┘                 └──────────────────┘
```

### 4.2 상태 접근 방식

#### 컴포넌트 내부
```typescript
// 특정 값만 구독 (리렌더링 최적화)
const hp = useGameStore(state => state.hp);
const gold = useGameStore(state => state.resources.gold);

// 액션 호출
const takeDamage = useGameStore(state => state.takeDamage);
takeDamage(10);
```

#### 컴포넌트 외부 (이벤트 핸들러, 유틸리티)
```typescript
// getState()로 현재 상태 읽기
const currentHp = useGameStore.getState().hp;

// setState()로 직접 상태 변경 (권장하지 않음)
useGameStore.setState({ hp: 100 });

// 액션 호출 (권장)
useGameStore.getState().takeDamage(10);
```

### 4.3 전투 시스템의 이중 상태 구조

전투 시스템은 **Zustand(전역) + useReducer(로컬)** 하이브리드 구조를 사용합니다.

```
┌─────────────────────────────────────────────────────────┐
│  BattleScreen.tsx                                       │
│  ┌───────────────────────────────────────────────────┐ │
│  │  BattleContext (useReducer)                       │ │
│  │  - 전투 로컬 상태 (phase, timeline, currentTurn)  │ │
│  │  - 빠른 상태 업데이트 (리렌더링 격리)             │ │
│  └───────────────────────────────────────────────────┘ │
│                        ↕                                │
│  ┌───────────────────────────────────────────────────┐ │
│  │  useGameStore (Zustand)                           │ │
│  │  - 전역 상태 (hp, ether, cards, relics)          │ │
│  │  - 전투 종료 시 결과 반영                         │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**왜 이렇게 설계했는가?**
- **성능**: 전투는 빠른 상태 변경이 많아 전역 상태로 관리 시 과도한 리렌더링 발생
- **격리**: 전투 로직을 전역 상태에서 분리하여 복잡도 감소
- **동기화**: 전투 종료 시 최종 결과만 Zustand에 반영

---

## 5. 주요 모듈 간 의존성

### 5.1 컴포넌트 계층 구조

```
App.tsx (라우터 역할)
  ├── MapDemo (맵 화면)
  │     ├── 맵 네비게이션
  │     ├── 던전 입장 UI
  │     ├── 휴식 UI (각성, 자아 형성)
  │     ├── 상점 UI
  │     └── 캐릭터 시트
  │
  └── BattleScreen (전투 화면)
        ├── BattleContext (전투 상태 Provider)
        ├── BattleApp (전투 메인 로직)
        │     ├── 40+ 커스텀 훅 (로직 분리)
        │     └── 전투 UI 컴포넌트 조합
        └── BattleUI
              ├── HandArea (손패)
              ├── TimelineDisplay (타임라인)
              ├── EnemyUnitsDisplay (적 표시)
              ├── PlayerHpBar, EnemyHpBar
              ├── RelicDisplay (상징 표시)
              ├── AnomalyDisplay (이변 표시)
              └── BattleLog (전투 로그)
```

### 5.2 핵심 의존성 그래프

```
data/ (게임 데이터)
  ↓
types/ (타입 정의)
  ↓
state/ (Zustand 스토어)
  ↓
components/ (UI)
  ├── battle/hooks → battle/logic → battle/reducer
  ├── dungeon/hooks → dungeon/reducer
  └── map/hooks → map/reducer
```

### 5.3 전투 시스템 내부 의존성

```
BattleContext (상태 관리)
  ↓
BattleApp (메인 컴포넌트)
  ├── hooks/ (커스텀 훅)
  │     ├── useBattleState
  │     ├── useCardSelection
  │     ├── useTimeline
  │     ├── useComboSystem
  │     ├── useEtherSystem
  │     └── ... (40+ 훅)
  │
  ├── logic/ (순수 함수)
  │     ├── combatActions.ts
  │     ├── cardExecutionCore.ts
  │     ├── hitCalculation.ts
  │     ├── defenseLogic.ts
  │     └── statusEffects.ts
  │
  └── ui/ (프레젠테이션 컴포넌트)
        ├── HandArea.tsx
        ├── TimelineDisplay.tsx
        └── ...
```

---

## 6. AI 에이전트를 위한 작업 영역 가이드

AI가 특정 작업을 수행할 때 참조해야 할 폴더와 파일을 빠르게 찾을 수 있도록 안내합니다.

### 6.1 작업 유형별 참조 경로

| 작업 유형 | 주요 폴더/파일 | 설명 |
|----------|---------------|------|
| **전투 로직 수정** | `src/components/battle/logic/` | 순수 전투 로직 함수 |
| **전투 UI 수정** | `src/components/battle/ui/` | 전투 화면 컴포넌트 |
| **전투 훅 추가/수정** | `src/components/battle/hooks/` | 전투 커스텀 훅 (40+) |
| **전투 상태 관리** | `src/components/battle/reducer/` | battleReducer, actions, state |
| **카드 데이터 추가** | `src/data/cards.ts` | 카드 정의 |
| **상징 데이터 추가** | `src/data/relics.ts` | 상징 정의 |
| **토큰 데이터 추가** | `src/data/tokens.ts` | 토큰(상태이상) 정의 |
| **이변 추가** | `src/data/anomalies.ts` | 이변 규칙 정의 |
| **맵 시스템 수정** | `src/components/map/` | 맵 네비게이션, 휴식, 성장 |
| **던전 시스템 수정** | `src/components/dungeon/` | 던전 탐험 로직 |
| **상점 시스템 수정** | `src/components/shop/` | 상점 UI 및 로직 |
| **플레이어 상태 관리** | `src/state/slices/playerSlice.ts` | HP, 스탯, 자원 |
| **빌드 시스템** | `src/state/slices/buildSlice.ts` | 카드 추가/제거/강화 |
| **성장 시스템** | `src/state/slices/growthSlice.ts` | 피라미드 성장 트리 |
| **타입 정의** | `src/types/` | TypeScript 타입 |
| **테스트 작성** | 해당 파일 옆에 `.test.ts` | Vitest 단위 테스트 |
| **개발자 도구** | `src/components/dev/` | 디버깅 도구 |

### 6.2 일반적인 작업 흐름

#### 🔹 새로운 카드 추가
1. `src/data/cards.ts`에 카드 데이터 추가
2. 카드 효과가 새로운 로직이면 `src/components/battle/logic/combatActions.ts` 수정
3. 타입 정의가 필요하면 `src/types/core.ts` 확인/수정
4. 테스트 작성: `src/data/cards.test.ts`

#### 🔹 새로운 상징 추가
1. `src/data/relics.ts`에 상징 데이터 추가
2. 상징 효과가 전투에 영향을 주면 `src/components/battle/hooks/` 또는 `logic/` 수정
3. 상징 초기 효과 적용은 `src/state/gameStoreHelpers.ts`
4. 테스트 작성: `src/data/relics.test.ts`

#### 🔹 전투 UI 개선
1. `src/components/battle/ui/` 에서 해당 컴포넌트 수정
2. 필요한 상태는 `BattleContext` 또는 `useGameStore`에서 가져오기
3. 스타일은 Tailwind 또는 인라인 스타일 사용
4. 타이밍 동기화 주의 (CLAUDE.md 참조)

#### 🔹 새로운 게임 시스템 추가
1. `src/types/`에 타입 정의
2. `src/data/`에 데이터 정의
3. `src/state/slices/`에 새 슬라이스 생성
4. `src/components/`에 UI 컴포넌트 추가
5. `src/state/gameStore.ts`에 슬라이스 통합

### 6.3 빠른 참조: 핵심 파일

| 파일 | 용도 |
|------|------|
| `src/App.tsx` | 앱 라우터 (맵 ↔ 전투 전환) |
| `src/state/gameStore.ts` | 전역 상태 메인 스토어 |
| `src/components/battle/BattleApp.tsx` | 전투 메인 컴포넌트 |
| `src/components/battle/context/BattleContext.tsx` | 전투 상태 Context |
| `src/components/battle/reducer/battleReducer.ts` | 전투 상태 리듀서 |
| `src/components/map/MapDemo.tsx` | 맵 메인 컴포넌트 |
| `src/data/cards.ts` | 모든 카드 정의 |
| `src/data/relics.ts` | 모든 상징 정의 |
| `src/types/index.ts` | 타입 배럴 파일 |

### 6.4 디버깅 팁

- **전투 디버깅**: 개발자 도구(`src/components/dev/`) 활성화
  - `Shift + D` 단축키로 개발 모드 토글
  - 전투 상태, 타임라인, 로그 실시간 확인
- **상태 디버깅**: Zustand DevTools (브라우저 확장) 사용
- **빌드 테스트**: `npm run build` (필수!)
- **단위 테스트**: `npm run test` 또는 `npm run test:watch`
- **E2E 테스트**: `npm run test:e2e`

---

## 7. 성능 최적화 전략

### 7.1 React 최적화
- **React.memo**: 불필요한 리렌더링 방지
- **useMemo**: 비싼 계산 결과 캐싱
- **useCallback**: 함수 참조 안정화
- **코드 스플리팅**: `React.lazy()` + `Suspense`

### 7.2 Zustand 최적화
- **셀렉터 사용**: 필요한 상태만 구독
```typescript
// ✅ Good
const hp = useGameStore(state => state.hp);

// ❌ Bad (전체 상태 구독)
const state = useGameStore();
const hp = state.hp;
```

### 7.3 전투 시스템 최적화
- **타이밍 제어**: 애니메이션 동기화 (CLAUDE.md 참조)
- **로컬 상태**: useReducer로 빠른 업데이트
- **메모이제이션**: 복잡한 계산 캐싱

---

## 8. 테스트 전략

### 8.1 테스트 계층
```
E2E 테스트 (Playwright)
    ↓
통합 테스트 (Vitest + Testing Library)
    ↓
단위 테스트 (Vitest)
```

### 8.2 테스트 위치
- **단위 테스트**: 해당 파일 옆에 `.test.ts` 또는 `.test.tsx`
- **통합 테스트**: `src/test/` 또는 각 모듈의 `tests/` 폴더
- **E2E 테스트**: `e2e/` (프로젝트 루트)

### 8.3 테스트 명령어
```bash
npm run test              # 단위 테스트 실행
npm run test:watch        # 테스트 watch 모드
npm run test:coverage     # 커버리지 리포트
npm run test:e2e          # E2E 테스트
npm run test:all          # 모든 테스트
```

---

## 9. 배포 및 빌드

### 9.1 빌드 프로세스
```bash
npm run build    # Vite 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
```

### 9.2 빌드 최적화
- **Tree Shaking**: 사용하지 않는 코드 제거
- **Minification**: Terser로 코드 압축
- **Code Splitting**: 라우트별 번들 분리
- **Asset Optimization**: 이미지, 폰트 최적화

---

## 10. 주의사항 및 베스트 프랙티스

### 10.1 코드 작성 규칙
1. **Read 먼저**: Edit/Write 전에 반드시 Read로 파일 읽기
2. **타입 안정성**: any 사용 금지, 엄격한 타입 정의
3. **lucide-react 지양**: 인라인 SVG 사용 (빌드 에러 방지)
4. **Props 명시**: 컴포넌트 Props 타입 명확히 정의

### 10.2 상태 관리 규칙
1. **슬라이스 패턴**: 새로운 기능은 새로운 슬라이스로 분리
2. **셀렉터 사용**: 필요한 상태만 구독
3. **액션 함수**: 상태 변경은 반드시 액션 함수 사용
4. **불변성**: 상태 직접 변경 금지 (`set()` 사용)

### 10.3 Git 규칙
- **커밋 컨벤션**: `feat:`, `fix:`, `refactor:` 등 (CLAUDE.md 참조)
- **브랜치 전략**: 기능별 브랜치 생성
- **Husky**: 커밋 전 자동 테스트 + 린트

---

## 11. 추가 문서

- **CLAUDE.md**: AI 작업 가이드 및 프로젝트 개요
- **DEVLOG.md**: 개발 로그
- **HANDOVER.md**: 프로젝트 인수인계
- **docs/STATE_MANAGEMENT_GUIDELINES.md**: 상태 관리 가이드
- **통합규칙.md**: 게임 규칙 상세
- **에테르.md**: 에테르 시스템 설명

---

**이 문서는 AI 에이전트가 프로젝트 구조를 빠르게 파악하고 효율적으로 작업할 수 있도록 작성되었습니다.**
