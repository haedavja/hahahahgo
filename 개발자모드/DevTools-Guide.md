# 개발자 도구 (DevTools) 가이드

## 📋 개요

게임 개발 속도를 높이기 위한 인게임 개발자 도구입니다. `Alt+D` 핫키로 토글 가능한 오버레이 UI를 통해 자원, 맵, 전투 등을 즉시 제어할 수 있습니다.

**커밋**: `5833d04`
**날짜**: 2025-11-25
**구현 단계**: Phase 1 완료

---

## 🚀 사용 방법

### 기본 사용법

1. 게임 실행
2. **`Alt+D`** 키를 눌러 개발자 도구 열기
3. 원하는 탭 선택 (자원 / 맵 / 전투 / 이벤트)
4. 설정 변경 후 즉시 적용
5. 다시 **`Alt+D`** 또는 `✕` 버튼으로 닫기

### UI 구조

```
┌─────────────────────────────────────┐
│  🛠️ Developer Tools            ✕   │
├─────────────────────────────────────┤
│ [💰 자원] [🗺️ 맵] [⚔️ 전투] [🎲 이벤트] │
├─────────────────────────────────────┤
│                                     │
│         (탭별 컨텐츠 영역)            │
│                                     │
├─────────────────────────────────────┤
│    Press Alt+D to toggle           │
└─────────────────────────────────────┘
```

---

## 📦 구현 파일

### 새로 생성된 파일
- **`src/components/dev/DevTools.jsx`**
  - 메인 DevTools 컴포넌트
  - 4개 탭 UI (자원, 맵, 전투, 이벤트)
  - 약 350줄

### 수정된 파일
- **`src/state/gameStore.js`**
  - 개발자 액션 5개 추가 (총 +80줄)

- **`src/components/map/MapDemo.jsx`**
  - DevTools import 추가
  - Alt+D 핫키 이벤트 리스너
  - DevTools 렌더링

---

## 🎮 기능 상세

### 1. 💰 자원 탭 (Resources)

#### 현재 자원 표시
실시간으로 현재 보유 자원을 표시합니다.

```
┌─────────────────────┐
│ 현재 자원:          │
│ gold: 50  intel: 2  │
│ loot: 1  material: 1│
│ aether: 0           │
└─────────────────────┘
```

#### 개별 자원 입력
각 자원을 숫자 입력으로 직접 설정할 수 있습니다.

- **gold**: 골드 (화폐)
- **intel**: 인텔 (정보)
- **loot**: 루트 (전리품)
- **material**: 머티리얼 (원자재)
- **aether**: 에테르 (특수 자원)

#### 프리셋 버튼
자주 사용하는 상황을 원클릭으로 설정합니다.

| 프리셋 | gold | intel | loot | material | aether |
|--------|------|-------|------|----------|--------|
| **풍족** | 999  | 10    | 10   | 10       | 50     |
| **초반** | 50   | 2     | 1    | 1        | 0      |
| **중반** | 200  | 5     | 5    | 3        | 10     |
| **후반** | 500  | 8     | 8    | 6        | 30     |

**사용 예시**:
1. "중반" 버튼 클릭
2. 즉시 중반 게임 자원으로 설정됨
3. 맵 진행 테스트 가능

---

### 2. 🗺️ 맵 탭 (Map)

#### 현재 노드 정보
현재 플레이어 위치를 표시합니다.

```
┌─────────────────────────┐
│ 현재 노드:              │
│ L3-N2 (전투)            │
└─────────────────────────┘
```

#### 맵 위험도 슬라이더
맵 위험도를 20~80 범위로 조정합니다.

- **20**: 가장 안전 (이벤트 우호도 85%)
- **50**: 보통 (이벤트 우호도 58%)
- **80**: 가장 위험 (이벤트 우호도 33%)

```
[━━━━━━●━━━━━━━━━━━━━━]
안전 (20)      위험 (80)
```

이벤트 우호도 계산식:
```javascript
friendlyChance = max(0.2, min(0.85, 1 - mapRisk/120))
```

#### 모든 노드 해금
모든 맵 노드를 즉시 해금합니다.

- 모든 노드 `cleared = true`
- 모든 노드 `selectable = true`
- 맵 전체 탐험 테스트에 유용

**주의**: 게임 밸런스 테스트 시에만 사용 권장

---

### 3. ⚔️ 전투 탭 (Battle)

#### 전투 정보 표시
현재 진행 중인 전투 정보를 표시합니다.

```
┌─────────────────────────┐
│ 진행 중인 전투:         │
│ 정예 (elite)            │
│ 난이도: 3               │
└─────────────────────────┘
```

전투가 없을 경우:
```
진행 중인 전투가 없습니다
```

#### 강제 승리
현재 전투를 즉시 승리로 종료합니다.

- **보상 지급**: 정상 보상 지급
- **전투 로그**: `[DEV] 강제 승리` 기록
- **lastBattleResult** 업데이트

**사용 시나리오**:
- 전투 후 이벤트 테스트
- 특정 보스 처치 후 상황 테스트
- 전투 스킵하여 빠른 진행

#### 강제 패배
현재 전투를 즉시 패배로 종료합니다.

- **보상 없음**: 아무 보상도 지급 안 됨
- **전투 로그**: `[DEV] 강제 패배` 기록
- 패배 상황 테스트에 유용

---

### 4. 🎲 이벤트 탭 (Event)

**현재 상태**: 추후 구현 예정 (Phase 2)

**계획 중인 기능**:
- 이벤트 우호도 강제 설정 (0% / 50% / 100%)
- 특정 이벤트 강제 트리거
- 이벤트 선택지 결과 미리보기

---

## 🔧 gameStore 개발자 액션

### 1. `setResources(newResources)`

자원을 직접 설정합니다.

**파라미터**:
```javascript
{
  gold?: number,      // 골드
  intel?: number,     // 정보
  loot?: number,      // 전리품
  material?: number,  // 원자재
  aether?: number     // 에테르
}
```

**예시**:
```javascript
// 골드만 변경
useGameStore.getState().setResources({ gold: 999 });

// 여러 자원 동시 변경
useGameStore.getState().setResources({
  gold: 500,
  intel: 10,
  aether: 50
});
```

**내부 동작**:
```javascript
setResources: (newResources) =>
  set((state) => ({
    ...state,
    resources: { ...state.resources, ...newResources },
  }))
```

---

### 2. `setMapRisk(value)`

맵 위험도를 설정합니다.

**파라미터**:
- `value: number` - 20~80 범위 (자동 클램핑)

**예시**:
```javascript
// 안전한 맵으로 설정
useGameStore.getState().setMapRisk(20);

// 위험한 맵으로 설정
useGameStore.getState().setMapRisk(80);

// 범위 초과 시 자동 보정
useGameStore.getState().setMapRisk(150); // → 80으로 클램핑
```

**내부 동작**:
```javascript
setMapRisk: (value) =>
  set((state) => ({
    ...state,
    mapRisk: Math.max(20, Math.min(80, value)),
  }))
```

---

### 3. `devClearAllNodes()`

모든 맵 노드를 해금합니다.

**파라미터**: 없음

**예시**:
```javascript
useGameStore.getState().devClearAllNodes();
```

**효과**:
- 모든 노드의 `cleared` 속성을 `true`로 설정
- 모든 노드의 `selectable` 속성을 `true`로 설정
- 맵 전체 탐험 가능

**내부 동작**:
```javascript
devClearAllNodes: () =>
  set((state) => {
    const updatedNodes = cloneNodes(state.map.nodes).map((node) => ({
      ...node,
      cleared: true,
      selectable: true,
    }));
    return {
      ...state,
      map: { ...state.map, nodes: updatedNodes },
    };
  })
```

---

### 4. `devForceWin()`

현재 전투를 강제로 승리 처리합니다.

**파라미터**: 없음

**조건**: `activeBattle`이 있을 때만 동작

**예시**:
```javascript
if (useGameStore.getState().activeBattle) {
  useGameStore.getState().devForceWin();
}
```

**효과**:
- 보상 지급 (정상 전투 승리와 동일)
- `activeBattle` 클리어
- `lastBattleResult`에 기록
  - `result: "victory"`
  - `log: ["[DEV] 강제 승리"]`

**내부 동작**:
```javascript
devForceWin: () =>
  set((state) => {
    if (!state.activeBattle) return state;
    const rewardsDef = state.activeBattle.rewards ?? {};
    const rewards = grantRewards(rewardsDef, state.resources);
    return {
      ...state,
      resources: rewards.next,
      activeBattle: null,
      lastBattleResult: {
        nodeId: state.activeBattle.nodeId,
        kind: state.activeBattle.kind,
        label: state.activeBattle.label,
        result: "victory",
        log: ["[DEV] 강제 승리"],
        finalState: null,
        initialState: null,
        rewards: rewards.applied,
      },
    };
  })
```

---

### 5. `devForceLose()`

현재 전투를 강제로 패배 처리합니다.

**파라미터**: 없음

**조건**: `activeBattle`이 있을 때만 동작

**예시**:
```javascript
if (useGameStore.getState().activeBattle) {
  useGameStore.getState().devForceLose();
}
```

**효과**:
- 보상 없음
- `activeBattle` 클리어
- `lastBattleResult`에 기록
  - `result: "defeat"`
  - `log: ["[DEV] 강제 패배"]`

**내부 동작**:
```javascript
devForceLose: () =>
  set((state) => {
    if (!state.activeBattle) return state;
    return {
      ...state,
      activeBattle: null,
      lastBattleResult: {
        nodeId: state.activeBattle.nodeId,
        kind: state.activeBattle.kind,
        label: state.activeBattle.label,
        result: "defeat",
        log: ["[DEV] 강제 패배"],
        finalState: null,
        initialState: null,
        rewards: {},
      },
    };
  })
```

---

## 💡 사용 시나리오 예시

### 시나리오 1: 후반 컨텐츠 테스트

**목표**: 후반 게임 밸런스 테스트

```
1. Alt+D로 DevTools 열기
2. 자원 탭 → "후반" 프리셋 클릭
   → gold: 500, intel: 8, loot: 8, material: 6, aether: 30
3. 맵 탭 → "모든 노드 해금" 클릭
4. 원하는 보스 노드로 이동
5. 전투 시작
```

### 시나리오 2: 이벤트 우호도 테스트

**목표**: 높은/낮은 위험도에서 이벤트 결과 확인

```
1. Alt+D로 DevTools 열기
2. 맵 탭 → 위험도 슬라이더를 20으로 설정
   → 이벤트 우호도 85%
3. 이벤트 노드 진입
4. 여러 번 반복하여 성공률 확인
5. 위험도를 80으로 변경
   → 이벤트 우호도 33%
6. 동일한 테스트 반복
```

### 시나리오 3: 전투 보상 확인

**목표**: 특정 전투의 보상 테이블 검증

```
1. Alt+D로 DevTools 열기
2. 원하는 전투 노드 진입
3. 전투 탭 → "강제 승리" 클릭
4. 보상 확인
5. 자원 탭 → 이전 상태로 리셋
6. 동일한 전투 반복하여 보상 범위 확인
```

### 시나리오 4: 에테르 시스템 테스트

**목표**: 특정 에테르 레벨에서 시스템 동작 확인

```
1. Alt+D로 DevTools 열기
2. 자원 탭 → aether 입력란에 50 입력 → 적용
3. 에테르 슬롯이 어떻게 표시되는지 확인
4. 전투 진입 → 에테르 오버드라이브 테스트
5. 다양한 에테르 레벨로 반복
```

---

## 🗺️ 로드맵

### ✅ Phase 1 (완료)
- [x] 기본 UI 구조 (탭, 오버레이)
- [x] Alt+D 핫키 토글
- [x] 자원 직접 수정
- [x] 자원 프리셋 (풍족, 초반, 중반, 후반)
- [x] 맵 위험도 슬라이더
- [x] 모든 노드 해금
- [x] 강제 승리/패배

### 🔨 Phase 2 (계획)
- [ ] 노드 점프 기능 (nodeId 입력으로 이동)
- [ ] 이벤트 우호도 강제 설정 (0% / 50% / 100%)
- [ ] 특정 이벤트 강제 트리거
- [ ] 전투 시뮬레이션 상세 로그 표시
- [ ] 플레이어 HP/에너지 조정
- [ ] 적 HP 조정

### 🚀 Phase 3 (고급 기능)
- [ ] 덱 편집기 (카드 추가/제거)
- [ ] 유물 추가/제거
- [ ] 세이브/로드 슬롯
- [ ] 전투 재생 (리플레이)
- [ ] 게임 속도 조절 (x2, x4)
- [ ] 콘솔 명령어 인터페이스

---

## 🔒 프로덕션 배포 시 주의사항

### 개발 환경에서만 활성화

현재는 항상 활성화되어 있지만, 프로덕션 배포 시 다음과 같이 조건부로 만들 것을 권장합니다:

```javascript
// MapDemo.jsx
{process.env.NODE_ENV === 'development' && (
  <DevTools isOpen={devToolsOpen} onClose={() => setDevToolsOpen(false)} />
)}
```

### 또는 환경 변수 사용

```javascript
// .env.development
VITE_DEV_TOOLS_ENABLED=true

// .env.production
VITE_DEV_TOOLS_ENABLED=false

// MapDemo.jsx
{import.meta.env.VITE_DEV_TOOLS_ENABLED === 'true' && (
  <DevTools isOpen={devToolsOpen} onClose={() => setDevToolsOpen(false)} />
)}
```

### 빌드 최적화

프로덕션 빌드에서 DevTools 코드를 완전히 제거하려면:

```javascript
// vite.config.js
export default defineConfig({
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
});

// MapDemo.jsx
{__DEV__ && (
  <DevTools isOpen={devToolsOpen} onClose={() => setDevToolsOpen(false)} />
)}
```

이렇게 하면 프로덕션 빌드에서 DevTools 관련 코드가 트리셰이킹됩니다.

---

## 🐛 알려진 이슈

현재 알려진 이슈는 없습니다.

이슈 발견 시 다음 정보와 함께 보고해주세요:
- 재현 방법
- 예상 동작
- 실제 동작
- 브라우저 콘솔 로그

---

## 📚 참고 자료

### 관련 파일
- `src/components/dev/DevTools.jsx` - DevTools UI
- `src/state/gameStore.js` - 게임 상태 관리 및 개발자 액션
- `src/components/map/MapDemo.jsx` - 메인 맵 UI

### 게임 시스템 문서
- 전투 시스템: `src/components/battle/LegacyBattleApp.jsx`
- 이벤트 시스템: `src/data/events.js`
- 카드 시스템: `src/data/cards.js`
- 에테르 시스템: `src/lib/etherUtils.js`

---

## 📝 변경 이력

### 2025-11-25 (v1.0.0)
- ✨ 초기 구현 (Phase 1)
- 4개 탭 구조 생성
- 자원 관리 기능 구현
- 맵 제어 기능 구현
- 전투 제어 기능 구현
- gameStore에 5개 개발자 액션 추가
- Alt+D 핫키 연동
- 커밋: `5833d04`

---

## 👨‍💻 개발자 노트

### 설계 결정사항

1. **오버레이 방식 선택**
   - 게임 UI와 분리된 독립적인 모달
   - z-index 10000으로 최상단 표시
   - 언제든지 토글 가능

2. **탭 구조 선택**
   - 기능별로 명확히 분리
   - 향후 확장 용이
   - 직관적인 네비게이션

3. **즉시 적용 vs 적용 버튼**
   - 자원: 적용 버튼 (실수 방지)
   - 맵 위험도: 즉시 적용 (슬라이더 UX)
   - 노드 해금: 즉시 적용 (단일 액션)

4. **Zustand 액션 추가 이유**
   - 상태 변경 로직 중앙화
   - 재사용성 향상
   - 콘솔에서도 사용 가능

### 성능 고려사항

- React 상태 관리로 리렌더링 최소화
- 오버레이가 열릴 때만 렌더링
- 무거운 연산 없음 (단순 상태 변경)

### 보안 고려사항

- 프로덕션에서 비활성화 권장
- 클라이언트 사이드만 영향 (서버 영향 없음)
- 로컬 게임이므로 큰 문제 없음

---

## 🤝 기여 가이드

### 새 기능 추가하기

1. **새 탭 추가**:
```javascript
// DevTools.jsx
function NewTab() {
  return <div>새 탭 컨텐츠</div>;
}

// MapDemo에서 사용
{activeTab === 'new' && <NewTab />}
```

2. **새 gameStore 액션 추가**:
```javascript
// gameStore.js
devNewAction: () =>
  set((state) => {
    // 상태 변경 로직
    return { ...state, /* 변경사항 */ };
  })
```

3. **DevTools UI 연동**:
```javascript
// DevTools.jsx
const devNewAction = useGameStore((state) => state.devNewAction);

<button onClick={devNewAction}>
  새 액션 실행
</button>
```

### 코드 스타일

- Tailwind CSS 대신 인라인 스타일 사용 (의존성 최소화)
- Monospace 폰트로 개발자 도구 느낌
- 다크 테마 (#1e293b 배경, #e2e8f0 텍스트)
- 블루 계열 강조색 (#3b82f6)

---

**마지막 업데이트**: 2025-11-25
**문서 버전**: 1.0.0
**작성자**: Claude Code
