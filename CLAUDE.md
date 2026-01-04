# Claude 작업 규칙 및 프로젝트 가이드

**최종 업데이트**: 2025-12-31
**프로젝트**: 하하하GO (턴제 전략 카드 게임)

---

## 1. 기본 작업 규칙

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

## 10. 에이전트 및 스킬 활용

### 에이전트 사용 원칙
**직접 도구보다 에이전트 우선 사용**

| 상황 | 사용할 에이전트 |
|------|----------------|
| 코드 위치/흐름 파악 | `Explore` (quick/medium/very thorough) |
| 여러 파일 동기화 확인 | `Explore` |
| 새 기능 설계 | `Plan` |
| Claude Code 기능 질문 | `claude-code-guide` |

### 필수 활용 케이스
```
# 코드 탐색 시 - 반드시 Explore 사용
Task(subagent_type='Explore', prompt='전투 승리 조건이 어떻게 처리되는지 추적해줘')

# 구현 계획 시 - Plan 사용
Task(subagent_type='Plan', prompt='에테르 시스템 리팩토링 계획을 세워줘')
```

### 커스텀 커맨드 (`.claude/commands/`)
- `/add-card` - 새 카드 추가
- `/add-enemy` - 새 적 추가
- `/balance-check` - 밸런스 검사
- `/simulate-battle` - 전투 시뮬레이션
- `/fix-battle-bug` - 전투 버그 수정

### 스킬 (`.claude/skills/`)
- `version-updater` - 버전 태그 자동 업데이트 알림
- `agent-usage` - 에이전트 활용 가이드

---

**이 문서는 Claude가 프로젝트를 이어받아 작업할 때 참조하는 가이드입니다.**
