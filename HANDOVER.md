# 프로젝트 인수인계 문서

**작성일**: 2025-12-05
**프로젝트**: 하하하GO (전략 카드 게임)
**현재 상태**: UI 컴포넌트 리팩토링 Phase 3 완료

---

## 1. 프로젝트 개요

### 기본 정보
- **프로젝트명**: 하하하GO (Strategy Card Game)
- **기술 스택**:
  - React 18.3.1
  - Vite 7.2.2
  - Zustand (상태 관리)
  - Tailwind CSS
- **주요 디렉토리**: `src/components/battle/`

### 게임 컨셉
- 포커 조합 기반 전략 카드 게임
- 플레이어 vs 적 턴제 전투 시스템
- 카드 특성(Traits), 에테르(Ether), 상징(Relics) 시스템

---

## 2. 최근 완료 작업 (UI 리팩토링)

### Phase 1: HP Bar & Ether 컴포넌트 분리
**분리된 컴포넌트 (7개)**:
1. `PlayerHpBar.jsx` - 플레이어 HP 바
2. `PlayerEtherBox.jsx` - 플레이어 에테르 박스
3. `PlayerBuffsPanel.jsx` - 플레이어 버프 패널
4. `EnemyHpBar.jsx` - 적 HP 바
5. `EnemyEtherBox.jsx` - 적 에테르 박스
6. `CentralPhaseDisplay.jsx` - 중앙 페이즈 표시
7. `EtherComparisonBar.jsx` - 에테르 비교 바

### Phase 2: 주요 UI 컴포넌트 분리
**분리된 컴포넌트 (3개)**:
1. `BattleLog.jsx` (28줄)
   - 전투 로그 표시
   - resolve phase에서만 표시
   - 자동 스크롤 기능

2. `RelicDisplay.jsx` (138줄)
   - 상단 상징 표시 UI
   - 드래그앤드롭으로 상징 순서 변경
   - 상징 희귀도별 색상 표시
   - 호버 툴팁

3. `TimelineDisplay.jsx` (253줄)
   - 타임라인 및 숫자 오버레이
   - 플레이어/적 타임라인 레인
   - 통찰(Insight) 레벨별 애니메이션
   - 내부에 Sword, Shield SVG 아이콘 정의

### Phase 3: HandArea 컴포넌트 분리
**분리된 컴포넌트 (1개)**:
1. `HandArea.jsx` (340줄)
   - 하단 고정 손패 영역
   - 3가지 battle phase별 렌더링:
     - **select**: 손패에서 카드 선택, 포커 조합 감지
     - **respond**: 카드 순서 조정
     - **resolve**: 실행 중인 카드 표시
   - 협동(Cooperation) 특성 시각 효과
   - 내부에 X 아이콘 SVG 정의 (lucide-react 의존성 제거)

### 파일 크기 변화
- **시작**: 4658줄 (LegacyBattleApp.jsx)
- **현재**: 3618줄
- **감소**: 1040줄 (22% 감소)

### 커밋 이력
- Phase 2: `refactor: Extract BattleLog, RelicDisplay, TimelineDisplay components`
- Phase 3: `refactor: Extract HandArea component from LegacyBattleApp.jsx` (c0d0dc1)

---

## 3. 프로젝트 구조

### 주요 파일
```
src/
├── components/
│   ├── battle/
│   │   ├── LegacyBattleApp.jsx (3618줄) - 메인 전투 컴포넌트
│   │   ├── battleData.js - 카드, 특성, 상징 데이터
│   │   ├── ui/ (UI 컴포넌트 폴더)
│   │   │   ├── PlayerHpBar.jsx
│   │   │   ├── PlayerEtherBox.jsx
│   │   │   ├── PlayerBuffsPanel.jsx
│   │   │   ├── EnemyHpBar.jsx
│   │   │   ├── EnemyEtherBox.jsx
│   │   │   ├── CentralPhaseDisplay.jsx
│   │   │   ├── EtherComparisonBar.jsx
│   │   │   ├── BattleLog.jsx
│   │   │   ├── RelicDisplay.jsx
│   │   │   ├── TimelineDisplay.jsx
│   │   │   └── HandArea.jsx
│   │   └── utils/
│   │       ├── battleUtils.js - 전투 유틸리티
│   │       └── comboDetection.js - 포커 조합 감지
│   └── character/
│       └── CharacterSheet.jsx - 캐릭터 시트 모달
├── state/
│   └── gameStore.js - Zustand 전역 상태
└── lib/
    └── etherUtils.js - 에테르 계산 유틸리티
```

### 자동화 스크립트
```
프로젝트 루트/
├── replace_timeline.cjs - 타임라인 교체 스크립트
├── replace_handarea.cjs - HandArea 교체 스크립트
└── replace_ui_components_phase2.cjs - Phase 2 일괄 교체 스크립트
```

---

## 4. 남은 작업

### 분리 가능한 컴포넌트
**Line 3497-3603 (~107줄)**:
1. **특성 툴팁** (Line 3497-3567, ~70줄)
   - 카드 특성 정보 툴팁
   - 특성 효과 계산 표시

2. **통찰 툴팁** (Line 3568-3603, ~35줄)
   - 적 행동 정보 툴팁
   - 통찰 레벨 3 이상에서 표시

**예상 효과**: 툴팁 분리 시 3500줄 정도까지 감소 가능

### 기타 개선 사항
- 나머지는 핵심 로직, 상태 관리, useEffect로 더 분리하기 어려움
- 추가 리팩토링보다는 기능 개발에 집중 권장

---

## 5. 빌드 & 실행

### 개발 서버
```bash
npm run dev
```

### 프로덕션 빌드
```bash
npm run build
```

### 빌드 확인
- 빌드 성공 확인됨 (2025-12-05, exit code 0)
- 모든 UI 컴포넌트 정상 작동

---

## 6. 주요 개념

### 전투 시스템
1. **Phase 흐름**:
   - `select` → `respond` → `resolve` → 반복

2. **에테르 (Ether)**:
   - 행동력 자원
   - 카드 사용 시 소모
   - 매 턴 회복

3. **타임라인 (Timeline)**:
   - 속도 기반 행동 순서 결정
   - 플레이어/적 마커로 표시

4. **통찰 (Insight)**:
   - 적의 행동 정보 공개 레벨
   - Lv1: 글리치 효과
   - Lv2: 스캔 효과
   - Lv3: 적 카드 정보 완전 공개

### 카드 시스템
1. **포커 조합**:
   - 원페어, 투페어, 트리플, 스트레이트, 플러쉬 등
   - 조합 성공 시 보너스 효과

2. **카드 특성 (Traits)**:
   - positive/negative 타입
   - 협동(Cooperation): 조합에 포함 시 강화
   - 사용 횟수에 따른 동적 효과

3. **상징 (Relics)**:
   - 패시브 효과
   - 희귀도: COMMON, RARE, EPIC, LEGENDARY
   - 드래그앤드롭으로 순서 변경

---

## 7. 개발 시 주의사항

### 1. 컴포넌트 분리 원칙
- **Read 먼저**: Edit/Write 전에 반드시 Read로 파일 읽기
- **Props 파악**: 원본 코드에서 모든 필요한 props 추출
- **빌드 테스트**: 변경 후 반드시 `npm run build` 실행
- **커밋**: 작업 완료 시 의미 있는 커밋 메시지 작성

### 2. 의존성 관리
- **lucide-react 지양**: 인라인 SVG로 대체 (빌드 에러 방지)
- **TimelineDisplay, HandArea**: 내부에 아이콘 SVG 정의

### 3. 자동화 스크립트 사용
- 큰 코드 블록 교체 시 `.cjs` 스크립트 활용
- 뒤에서 앞으로 교체 (인덱스 변경 방지)
- 마커 기반 검색으로 정확한 위치 찾기

### 4. 상태 관리
- Zustand `useGameStore` 사용
- `getState()` vs `useGameStore(state => ...)`
- 컴포넌트 내부: `useGameStore.getState()`

---

## 8. 문제 해결 가이드

### 빌드 오류
1. **"lucide-react" import 오류**
   - 해결: 인라인 SVG로 교체

2. **JSX 구조 오류**
   - 자동화 스크립트 사용 시 wrapper div 누락 가능
   - 수동으로 확인 및 수정

### Git 관련
- LF → CRLF 변환 경고는 무시해도 됨
- 현재 브랜치: `claude/check-responsiveness-01WbgS136iR7Qv8ZmsANG367`
- 77개 커밋 ahead of origin

---

## 9. 연락처 및 참고 자료

### 문서
- `README.md` - 프로젝트 개요
- `DEVLOG.md` - 개발 로그
- `HOOKS_GUIDE.md` - 훅 가이드
- `COLLABORATION-GUIDE.md` - 협업 가이드

### 게임 설정 문서
- `card A #1.md` - 카드 설정
- `Characteristic #1.md` - 특성 설정
- `에테르.md` - 에테르 시스템
- `통합규칙.md` - 게임 규칙

---

## 10. 다음 작업 추천

### 우선순위 높음
1. ✅ UI 컴포넌트 분리 (Phase 1-3 완료)
2. ⏳ 툴팁 컴포넌트 분리 (선택사항)
3. 🔜 새로운 게임 기능 개발

### 우선순위 낮음
- 추가 리팩토링은 필요 시에만
- 코드 구조가 충분히 개선됨

---

**인수인계 완료일**: 2025-12-05
**다음 개발자**: 해당 문서를 숙지 후 작업 시작
**질문사항**: DEVLOG.md에 기록 또는 Git 이슈 생성
