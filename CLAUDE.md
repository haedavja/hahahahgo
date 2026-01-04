# Claude 작업 규칙 및 프로젝트 가이드

**최종 업데이트**: 2026-01-04
**프로젝트**: 하하하GO (턴제 전략 카드 게임)

---

## 1. 기본 작업 규칙

### 세션 시작 시 필수 확인 (Continuation 포함)
```bash
# 1. 최근 커밋 확인 - 이미 완료된 작업인지 체크
git log --oneline -10

# 2. 현재 변경사항 확인
git status

# 3. 최근 변경 파일 확인
git diff HEAD~3 --stat
```
**⚠️ Summary만 믿지 말고 실제 코드 상태를 먼저 확인할 것**

### 필수 준수 사항
1. **Git bash만 사용** - PowerShell 사용 금지
2. **작업 후 버전 태그 갱신** - 게임 내 맵 하단의 버전 태그를 한국시간 기준으로 갱신 (예: `12-31 14:30`)
3. **작업 완료 후 커밋** - 의미 있는 커밋 메시지와 함께 커밋
4. **한글로 응답** - 영어 대신 한글로 대답
5. **솔직한 한계 인정** - 할 수 없는 작업은 솔직히 말하고, 다른 AI에게 전달할 수 있도록 문제점 정리
6. **빌드 테스트 필수** - 코드 변경 후 반드시 `npm run build` 실행

---

## 2. 프로젝트 개요

### 기술 스택
- **프레임워크**: React 18.3.1
- **빌드 도구**: Vite
- **상태 관리**: Zustand
- **스타일링**: Tailwind CSS, CSS-in-JS
- **언어**: TypeScript

### 게임 컨셉
- 포커 조합 기반 전략 카드 게임
- 플레이어 vs 적 턴제 전투 시스템
- 카드 특성(Traits), 에테르(Ether), 상징(Relics) 시스템

---

## 3. 프로젝트 구조

```
src/
├── components/
│   ├── battle/           # 전투 시스템
│   │   ├── BattleApp.tsx       # 메인 전투 컴포넌트
│   │   ├── BattleScreen.tsx    # 전투 화면
│   │   ├── context/            # 전투 컨텍스트
│   │   ├── hooks/              # 전투 관련 훅
│   │   ├── logic/              # 전투 로직
│   │   ├── reducer/            # 전투 리듀서
│   │   ├── ui/                 # UI 컴포넌트
│   │   │   ├── HandArea.tsx
│   │   │   ├── TimelineDisplay.tsx
│   │   │   ├── RelicDisplay.tsx
│   │   │   ├── PlayerHpBar.tsx
│   │   │   ├── EnemyHpBar.tsx
│   │   │   └── ...
│   │   └── utils/              # 전투 유틸리티
│   ├── dungeon/          # 던전 탐험 시스템
│   ├── map/              # 맵 시스템
│   ├── shop/             # 상점 시스템
│   ├── dev/              # 개발자 도구
│   └── character/        # 캐릭터 시트
├── data/                 # 게임 데이터
│   ├── anomalies.ts      # 이변 데이터
│   ├── cards.ts          # 카드 데이터
│   ├── relics.ts         # 상징 데이터
│   ├── tokens.ts         # 토큰 데이터
│   └── ...
├── lib/                  # 유틸리티 라이브러리
├── state/                # Zustand 상태 관리
│   ├── gameStore.ts
│   └── slices/           # 상태 슬라이스
└── types/                # TypeScript 타입 정의
```

---

## 4. 전투 시스템 핵심

### 전투 흐름
```
[select] 카드 선택 → [respond] 대응 → [resolve] 타임라인 진행 → [턴 종료]
                                              ↓
                                    stepOnce() 반복 호출
                                              ↓
                                    시곗바늘 이동 (250ms)
                                              ↓
                                    카드 발동 + 흔들림 (200ms)
                                              ↓
                                    executeCardAction()
                                              ↓
                                    자동진행 대기 (450ms)
```

### 타이밍 동기화 (중요!)
| 항목 | 값 | 파일 위치 |
|------|-----|----------|
| 시곗바늘 이동 | 0.25s | TimelineDisplay.tsx |
| 카드 발동 대기 | 250ms | BattleApp.tsx |
| 카드 흔들림 | 200ms | BattleApp.tsx |
| 자동진행 딜레이 | 450ms | BattleApp.tsx |

**주의**: 자동진행 딜레이를 450ms 미만으로 줄이면 카드 실행 버그 발생!

### 통찰 레벨 시스템
| 레벨 | 이름 | 효과 |
|------|------|------|
| -3 | 망각 | 타임라인, 적 체력/에테르 확인 불가 |
| -2 | 미련 | 진행단계에서 적 타임라인 확인 불가 |
| -1 | 우둔 | 대응단계에서 적 타임라인 확인 불가 |
| 0 | 평온 | 선택단계에서 적 카드 3개 확인 |
| +1 | 예측 | 선택단계에서 적 카드 2개 확인 |
| +2 | 독심 | 선택단계에서 적 카드 모두 확인 |
| +3 | 혜안 | 적 카드 모두 + 카드 정보 확인 |

---

## 5. 개발 주의사항

### 코드 작성 원칙
1. **Read 먼저** - Edit/Write 전에 반드시 Read로 파일 읽기
2. **Props 파악** - 원본 코드에서 모든 필요한 props 추출
3. **lucide-react 지양** - 인라인 SVG로 대체 (빌드 에러 방지)
4. **상태 관리** - Zustand `useGameStore` 사용

### 상태 접근 방식
```typescript
// 컴포넌트 외부
useGameStore.getState()

// 컴포넌트 내부
const value = useGameStore(state => state.someValue)
```

### 테스트 실행
```bash
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm test         # 테스트 실행
```

---

## 6. 문서 참조

### 게임 설계 문서
- `에테르.md` - 에테르 시스템
- `통합규칙.md` - 게임 규칙
- `# 상태이상.MD` - 상태이상 정의
- `# 유물.txt` - 유물/상징 정보
- `card A #1.md` - 카드 설정
- `Characteristic #1.md` - 특성 설정

### 개발 문서
- `DEVLOG.md` - 개발 로그
- `HANDOVER.md` - 프로젝트 인수인계
- `인수인계.md` - 상세 인수인계
- `COLLABORATION-GUIDE.md` - 협업 가이드
- `docs/STATE_MANAGEMENT_GUIDELINES.md` - 상태 관리 가이드

### 변경 이력
- `CHANGELOG/` 폴더 - 버전별 변경 이력

---

## 7. 자주 발생하는 문제

### 빌드 오류
1. **lucide-react import 오류** → 인라인 SVG로 교체
2. **JSX 구조 오류** → wrapper div 누락 확인

### 전투 버그
1. **카드 실행 순서 오류** → 자동진행 딜레이 확인 (450ms 이상)
2. **시곗바늘 동기화 오류** → transition 값 확인 (0.25s)

### Git 관련
- LF → CRLF 변환 경고는 무시해도 됨

---

## 8. 커밋 컨벤션

```
feat: 새로운 기능 추가
fix: 버그 수정
perf: 성능 최적화
refactor: 코드 리팩토링
docs: 문서 수정
style: 코드 스타일 변경
test: 테스트 추가/수정
chore: 기타 작업
```

---

## 9. 현재 상태 요약

- **브랜치**: `claude/setup-new-workspace-cY0dl`
- **주요 완료 작업**:
  - UI 컴포넌트 리팩토링 (Phase 1-3)
  - 타임라인 속도 최적화 (55% 향상)
  - 상징 시각적 피드백 개선
  - 통찰 레벨 시스템 구현
  - 이변(Anomaly) 시스템 구현
  - TypeScript 마이그레이션
  - 성능 최적화 (React.memo, useMemo)

---

## 10. 에이전트 활용 정책 (필수)

### 🔴 에이전트 우선 원칙
**직접 도구(Grep, Glob, Read) 사용 전에 에이전트 사용을 먼저 고려할 것**

### 에이전트 종류별 활용 가이드

| 에이전트 | 트리거 조건 | 사용 예시 |
|----------|------------|----------|
| **Explore** | 코드 흐름 파악, 2개+ 파일 검색 | "전투 승리 조건 추적", "최적화 기회 탐색" |
| **Plan** | 3개+ 파일 수정 예상, 새 기능/리팩토링 | "에테르 시스템 리팩토링 계획" |
| **general-purpose** | 복잡한 다단계 검색, 넓은 범위 조사 | "모든 as any 사용처 및 수정 방안" |
| **claude-code-guide** | Claude Code 기능 질문 | "MCP 서버 설정 방법" |

### ⚡ 병렬 에이전트 실행 규칙

**독립적인 조사가 필요할 때 반드시 병렬 실행:**

```typescript
// ❌ 나쁜 예: 순차 실행
Task(subagent_type='Explore', prompt='성능 최적화 기회')
// ... 결과 기다림
Task(subagent_type='Explore', prompt='타입 안전성 문제')

// ✅ 좋은 예: 병렬 실행 (단일 메시지에 여러 Task)
Task(subagent_type='Explore', prompt='성능 최적화 (useMemo, useCallback 누락)')
Task(subagent_type='Explore', prompt='번들 크기 최적화 (동적 import 가능)')
Task(subagent_type='Explore', prompt='타입 안전성 (as any, as unknown 사용)')
```

### 📋 필수 에이전트 사용 체크리스트

| 작업 유형 | 필수 에이전트 | 시점 |
|----------|--------------|------|
| 버그 수정 | Explore | 원인 파악 전 |
| 새 기능 구현 | Plan → Explore | 코드 작성 전 |
| 리팩토링 (3개+ 파일) | Plan | 코드 수정 전 |
| 최적화 | Explore (병렬 3개) | 분석 시 |
| 코드 흐름 추적 | Explore (very thorough) | 항상 |

### 🚫 직접 도구 사용 허용 조건

다음 경우에만 Grep/Glob/Read 직접 사용:
1. **단일 파일** 내 특정 라인 확인
2. **이미 위치를 아는** 코드 수정
3. **단순 문자열** 검색 (클래스명, 함수명 등)

### 📝 에이전트 프롬프트 작성 가이드

```markdown
## 필수 포함 요소:
1. 목적: 무엇을 찾거나 분석하는지
2. 범위: 어떤 파일/디렉토리를 대상으로
3. 출력 형식: 파일명:라인번호 형식 요청
4. 제약: 연구만 / 코드 변경 금지 명시

## 예시:
"src/components/battle/ 디렉토리에서 useMemo/useCallback이
누락된 곳을 찾아주세요. 각 위치를 파일명:라인번호 형식으로
알려주고, 최적화 우선순위를 제안해주세요. 연구만 하고
코드 변경은 하지 마세요."
```

### ⚠️ 위반 시 문제점

| 위반 | 결과 |
|------|------|
| Explore 미사용 | 파일 간 연결 누락, 불완전한 수정 |
| Plan 미사용 | 방향 혼란, 재작업 필요 |
| 병렬 미실행 | 시간 낭비, 컨텍스트 비효율 |
| 프롬프트 불충분 | 부정확한 결과, 재조사 필요 |

---

## 11. 통계 시스템 아키텍처 원칙

### 핵심 원칙: 단일 소스 (Single Source of Truth)
**게임 통계와 시뮬레이터 통계는 반드시 동일한 도구를 사용해야 합니다.**

### 아키텍처 구조
```
StatsCollector (detailed-stats.ts)
        ↓
    stats-bridge.ts (게임↔시뮬레이터 브릿지)
        ↓
    ┌───────────────┬───────────────┐
    │ StatsWidget   │ SimulatorTab  │
    │ (게임 UI)     │ (시뮬레이터 UI)│
    └───────────────┴───────────────┘
```

### 통계 작업 시 필수 체크리스트
1. **새 통계 추가 시**:
   - [ ] `detailed-stats.ts`에 수집 로직 추가
   - [ ] `stats-bridge.ts`에 기록 함수 추가 (recordXxx)
   - [ ] `StatsBridge` export 객체에 함수 추가
   - [ ] `StatsWidget.tsx`에 표시 UI 추가
   - [ ] `SimulatorTab.tsx`에 동일한 표시 UI 추가
   - [ ] 게임 시스템에서 기록 함수 호출 연결

2. **통계 UI 수정 시**:
   - [ ] StatsWidget과 SimulatorTab 동시 수정
   - [ ] 동일한 데이터 형식 사용 확인

### 금지 사항
- ❌ StatsWidget에만 있고 SimulatorTab에 없는 통계
- ❌ SimulatorTab에만 있고 StatsWidget에 없는 통계
- ❌ stats-bridge를 거치지 않는 직접 통계 기록
- ❌ 별도의 통계 수집 로직 생성

### 통계 관련 파일 위치
| 역할 | 파일 |
|------|------|
| 수집 로직 | `src/simulator/analysis/detailed-stats.ts` |
| 타입 정의 | `src/simulator/analysis/detailed-stats-types.ts` |
| 게임 브릿지 | `src/simulator/bridge/stats-bridge.ts` |
| 게임 UI | `src/components/map/ui/StatsWidget.tsx` |
| 시뮬레이터 UI | `src/components/dev/tabs/SimulatorTab.tsx` |
| 분석 프레임워크 | `src/simulator/analysis/stats-analysis-framework.ts` |
| 밸런스 인사이트 | `src/simulator/analysis/balance-insights.ts` |

### 향후 개선 방향 (TODO)
- [x] 공통 통계 탭 컴포넌트 라이브러리 생성 (`src/components/stats/`) ✅ 완료
- [ ] StatsWidget/SimulatorTab에서 공용 컴포넌트 더 적극 활용
- [ ] 통계 탭별 공용 컴포넌트 분리

---

## 12. 자동화 Hook 및 버전 태그

### SessionStart Hook
세션 시작 시 자동으로 Git 상태 출력 (`.claude/hooks/session-start.sh`)
- 최근 커밋 10개
- 현재 변경사항
- 중복 작업 방지

### PreCommit Hook
커밋 전 버전 태그 갱신 여부 확인 (`.claude/hooks/pre-commit-check.sh`)
- 버전 태그 미갱신 시 커밋 차단
- `src/` 파일 수정 시 필수

### 버전 태그 갱신 절차
```bash
# 1. 한국시간 확인
TZ='Asia/Seoul' date '+%m-%d %H:%M'

# 2. mapConfig.ts의 PATCH_VERSION_TAG 수정
# 파일: src/components/map/utils/mapConfig.ts
```

### 커스텀 커맨드 (`.claude/commands/`)
| 커맨드 | 설명 |
|--------|------|
| `/add-card` | 새 카드 추가 |
| `/add-enemy` | 새 적 추가 |
| `/balance-check` | 밸런스 검사 |
| `/simulate-battle` | 전투 시뮬레이션 |
| `/fix-battle-bug` | 전투 버그 수정 |

---

**이 문서는 Claude가 프로젝트를 이어받아 작업할 때 참조하는 가이드입니다.**
