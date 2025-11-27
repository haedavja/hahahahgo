## 상태 요약 (2025-11-27 22:45 KST)

### 최근 작업 (이번 세션)
**통찰(Insight) 시스템 완전 구현** (커밋 06fa869, 2fba0b8, 8cc25be)

#### 구현 내역
1. **기본 구조 추가** ✅
   - `useGameState.js`: `playerInsight: 0` 필드 추가
   - `gameStore.js`: `updatePlayerInsight(insight)` 액션 추가
   - 전투 시스템 전달: `LegacyBattleScreen` → `LegacyBattleApp` 파이프라인 구축

2. **UI 표시** ✅
   - 전투 화면 플레이어 스탯에 `👁️ 통찰: {value}` 표시 (값이 0보다 클 때만)
   - 보라색(#a78bfa) 색상으로 표시

3. **개발자 도구** ✅
   - DevTools 전투 탭에 통찰 설정 컨트롤 추가
   - 0~99 범위 입력 가능
   - 설명: "이벤트 추가 선택지, 적 타임라인 정보 제공"

4. **적(Enemy) 구조** ✅
   - `shroud` 필드 추가 (기본값 0)
   - 개념만 구조화, 아직 값 할당 안 함

5. **통찰 레벨별 타임라인 정보 공개** ✅ **NEW!**
   - `calculateEffectiveInsight()`: 유효 통찰 = player.insight - enemy.shroud
   - `getInsightRevealLevel()`: 레벨별 공개 정보 결정
   - select 단계에서 적 정보 아래에 통찰 UI 자동 렌더링

   **레벨별 공개 정보:**
   - **Lv.0** (통찰 = 0): 정보 없음
   - **Lv.1** (통찰 = 1): 카드 개수 + 대략적 순서 ("첫번째", "마지막" 등)
   - **Lv.2** (통찰 = 2): 정확한 카드명 + 속도 값
   - **Lv.3** (통찰 ≥ 3): 전체 정보 (카드 효과, 특성 포함)

#### 다음 단계 (미구현 기능)
- **이벤트 시스템 연동**: 통찰 값에 따른 추가 선택지 제공
- **유물/카드 연동**: 통찰을 증가/감소시키는 유물 및 카드 추가
- **적 데이터**: 실제 적에게 shroud 값 할당

---

### 이전 작업 (GPT Codex 세션)

#### 해결된 이슈
1. **무한방패 턴 시작 중복 실행 버그** ✅
   - `turnStartProcessedRef` useRef 플래그 추가
   - useEffect 의존성 배열에서 `player.etherPts` 제거
   - 턴 시작 방어력 부여 시 `def: true` 설정

2. **전투 HP 동기화 버그** ✅
   - `resolveBattle`에서 실제 전투 결과 HP 사용하도록 수정
   - `notifyBattleResult`에 `playerHp`, `playerMaxHp` 추가

3. **피의 족쇄 유물 추가** ✅
   - ON_COMBAT_START 유물: 전투마다 체력 -5, 힘 +2
   - 전투 중 지속 강조 표시 (노란색 테두리)
   - `applyCombatStartEffects`에 damage/strength 지원 추가

#### 알려진 이슈
⚠️ **힘(Strength) UI 표시 버그** (우선순위: 중)
- 증상: 실제 힘은 정상 작동하나 UI에 `💪 힘: 0`으로 표시
- 영향: 게임플레이 정상, UI만 잘못 표시
- 조사 결과:
  - `initialPlayerState.strength: 2` ✓
  - `useState` 직후 `player.strength: 0` ✗
  - 실제 데미지 계산은 정상 작동 ✓
- 추정 원인: React Strict Mode 더블 렌더링 타이밍 이슈
- 다음 개발자에게 위임

---

## 아키텍처 노트

### 통찰 시스템 데이터 흐름
```
useGameState (playerInsight: 0)
    ↓
gameStore.playerInsight
    ↓
LegacyBattleScreen.buildBattlePayload(playerInsight)
    ↓
payload.player.insight
    ↓
LegacyBattleApp.initialPlayerState.insight
    ↓
player.insight (전투 중 변동 가능, 카드/유물로)
    ↓
UI 표시 (👁️ 통찰)
```

### 장막 시스템 (구조만 존재)
```
Enemy 데이터에 shroud 필드 (기본값 0)
    ↓
유효 통찰 = max(0, player.insight - enemy.shroud)
    ↓
타임라인 표시 여부 결정
```

---

## 개발 가이드라인

### 통찰 기능 구현 시 고려사항
1. **이벤트 선택지 잠금 해제**
   - `eventLibrary`의 각 choice에 `requiredInsight` 필드 추가
   - EventPanel에서 `playerInsight >= requiredInsight` 체크

2. **적 타임라인 정보 표시**
   - select 단계에서 `player.insight > enemy.shroud`일 때
   - enemyPlan의 일부 또는 전체 표시
   - 장막이 높을수록 정보 제한

3. **통찰 조정 메커니즘**
   - 카드 효과: `{ type: 'modifyInsight', amount: +1/-1 }`
   - 유물 효과: PASSIVE로 기본 통찰 증가
   - 버프/디버프 형태로 전투 중 변동

### 패치 버전 갱신
- 파일: `src/components/map/MapDemo.jsx`
- 변수: `PATCH_VERSION_TAG`
- 형식: "월-일-시:분" (KST)
- 현재: "11-27-22:45"

---

## 테스트 체크리스트

### 통찰 시스템
- [x] DevTools에서 통찰 값 설정 가능
- [x] 설정한 통찰 값이 gameStore에 반영
- [x] 전투 진입 시 통찰 값이 payload에 전달
- [x] 전투 화면에서 통찰 값 UI 표시 (0일 때 숨김)
- [x] 전투 select 단계에서 통찰 레벨별 적 타임라인 정보 표시 ✅
- [x] 유효 통찰 계산 (player.insight - enemy.shroud) ✅
- [x] 레벨 1: 카드 개수 + 대략적 순서 표시 ✅
- [x] 레벨 2: 정확한 카드명 + 속도 표시 ✅
- [x] 레벨 3: 카드 효과 + 특성까지 전체 표시 ✅
- [ ] 이벤트에서 통찰 기반 선택지 표시 (미구현)
- [ ] 통찰을 조정하는 유물/카드 추가 (미구현)

### 테스트 방법
**통찰 레벨별 정보 확인:**
1. Alt+D로 DevTools 열기
2. 전투 탭에서 통찰 값 설정 (0~3)
3. 맵에서 전투 노드 선택
4. select 단계에서 적 정보 우측에 통찰 UI 확인
   - 통찰 0: 아무것도 표시 안 됨
   - 통찰 1: "적의 행동 3개 (순서: 첫번째, 2번째, 마지막)"
   - 통찰 2: 각 카드명과 속도 표시
   - 통찰 3: 카드 효과(피해/방어) 및 특성까지 표시

### 회귀 테스트
- [x] 무한방패 턴 시작 중복 실행 없음
- [x] 전투 후 HP 정상 반영
- [x] 피의 족쇄 정상 작동 (체력 -5, 힘 +2)
- [ ] 힘 UI 표시 정상화 (알려진 이슈)

---

## 파일 변경 이력 (이번 세션)

### 수정된 파일
1. `src/state/useGameState.js`
   - Line 150: `playerInsight: 0` 추가

2. `src/state/gameStore.js`
   - Line 786-790: `updatePlayerInsight` 액션 추가

3. `src/components/battle/LegacyBattleScreen.jsx`
   - Line 7: buildBattlePayload에 playerInsight 파라미터 추가
   - Line 40: payload.player.insight 필드 추가
   - Line 57-58: useGameStore에서 playerInsight 가져오기
   - Line 60-61: useMemo 의존성에 playerInsight 추가

4. `src/components/battle/LegacyBattleApp.jsx`
   - Line 44-49: `calculateEffectiveInsight()` 함수 추가
   - Line 51-115: `getInsightRevealLevel()` 함수 추가 (레벨별 정보 공개 로직)
   - Line 1003: startingInsight 계산
   - Line 1023: initialPlayerState.insight 추가
   - Line 1029: enemy 상태에 shroud 필드 추가
   - Line 1114-1122: effectiveInsight, insightReveal useMemo 계산
   - Line 2930-2931: 플레이어 통찰 UI 표시
   - Line 3087-3184: select 단계 적 정보 영역에 통찰 레벨별 UI 렌더링
     - Lv.1: 카드 개수 + 순서
     - Lv.2: 카드명 + 속도
     - Lv.3: 카드 효과 + 특성

5. `src/components/dev/DevTools.jsx`
   - Line 19, 29: playerInsight, updatePlayerInsight 추가
   - Line 142, 147: BattleTab에 props 전달
   - Line 397, 400, 410-412: insightInput 상태 및 useEffect
   - Line 520-566: 통찰 입력 컨트롤 UI

6. `src/components/map/MapDemo.jsx`
   - Line 119: PATCH_VERSION_TAG = "11-27-22:30"

---

## 참고 사항

- 통찰 시스템은 완전히 선택적 기능으로 설계됨 (기본값 0이면 영향 없음)
- DevTools를 통해 언제든 통찰 값 조정 가능
- 장막 시스템은 구조만 존재하므로 적 데이터에 shroud 값을 할당하기 전까지 효과 없음
- 이벤트/타임라인 기능은 향후 구현 필요

---

**다음 개발자에게:**
통찰 시스템의 기반 구조가 완성되었습니다. 이제 다음 단계는:
1. 이벤트 시스템에 통찰 기반 선택지 추가
2. 전투 UI에서 통찰에 따른 적 정보 표시
3. 통찰을 조정하는 카드/유물 추가
4. 적 데이터에 장막 값 할당

각 기능은 독립적으로 구현 가능하며, 우선순위는 사용자 요구사항에 따라 조정하세요.
