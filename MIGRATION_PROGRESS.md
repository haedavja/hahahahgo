# useState → useReducer 마이그레이션 진행 현황

**최종 업데이트**: 2025-12-03 14:00

---

## ✅ 완료된 작업

### Infrastructure (100%)
1. **battleReducer.js**: 모든 70+ 상태 및 액션 정의 ✅
2. **useBattleState.js**: Custom Hook 구현 ✅
3. **LegacyBattleApp.jsx**: 초기화 완료 ✅

### Phase 1: phase 상태 (100% ✅)
- **변경**: 134개
  - `phase` → `battle.phase`: 124개
  - `setPhase()` → `actions.setPhase()`: 10개
- **빌드 테스트**: ✅ 통과
- **커밋**: `7905239`
- **스크립트**: `migrate_phase.cjs`

---

## 📊 전체 진행률

| 단계 | 상태 | 진행률 |
|------|------|--------|
| 인프라 구축 | ✅ 완료 | 100% |
| Phase 1: phase | ✅ 완료 | 100% |
| Phase 2: 배열 상태 | ⏳ 대기 | 0% |
| Phase 3: player/enemy | ⏳ 대기 | 0% |
| 런타임 테스트 | ⏳ 대기 | 0% |
| **전체** | **⚠️ 진행 중** | **약 50%** |

---

## 🎯 다음 단계 (Phase 2)

### 배열 상태 마이그레이션

우선순위가 높은 상태들:
- `hand` → `battle.hand` (약 50개 참조)
- `selected` → `battle.selected` (약 60개 참조)
- `queue` → `battle.queue` (약 40개 참조)
- `qIndex` → `battle.qIndex` (약 20개 참조)
- `log` → `battle.log` (약 30개 참조)

**예상 변경**: ~200개
**예상 소요 시간**: 30-40분

### Phase 3: player/enemy 상태

가장 복잡한 부분:
- `player` → `battle.player` (155개 참조)
- `enemy` → `battle.enemy` (123개 참조)
- `setPlayer(prev => ...)` → `actions.updatePlayer({...})`
- `setEnemy(prev => ...)` → `actions.updateEnemy({...})`

**예상 변경**: ~300개
**예상 소요 시간**: 1-1.5시간

---

## 📝 Git 커밋 히스토리

1. **f83ba23**: 인프라 구축
2. **c12b5a3**: 마이그레이션 가이드
3. **7905239**: Phase 1 - phase 상태 ✅

---

## 🔧 사용된 도구

- **migrate_phase.cjs**: Node.js 자동 마이그레이션 스크립트
- **정규식 패턴**:
  - `\bsetPhase\(` → `actions.setPhase(`
  - `\bphase\s*===` → `battle.phase ===`
  - `\bphase\s*!==` → `battle.phase !==`
  - `, phase\b` → `, battle.phase`
  - `[phase\b` → `[battle.phase`

---

## ⚠️ 주의사항

### 수동 수정이 필요했던 부분

1. **함수 매개변수 destructuring**
   ```javascript
   // ❌ 잘못된 변경
   function Component({ battle.phase }) { }

   // ✅ 올바른 변경
   function Component({ phase }) { }
   ```

2. **객체 리터럴 키**
   ```javascript
   // ❌ 잘못된 변경
   { battle.phase: 'select' }

   // ✅ 올바른 변경
   { phase: 'select' }
   ```

3. **Props로 받는 컴포넌트**
   - ExpectedDamagePreview는 phase를 props로 받으므로
   - 함수 내부에서는 `phase` 그대로 사용

---

## 💡 교훈

1. **자동화 스크립트 유용**: 134개 변경을 수동으로 하면 실수 가능성 높음
2. **작은 단위로 커밋**: Phase별로 나누어 진행하니 문제 발생 시 롤백 쉬움
3. **빌드 테스트 필수**: 각 Phase 후 반드시 빌드 테스트
4. **패턴 인식 중요**: 함수 매개변수, 객체 키 등 예외 케이스 파악 필요

---

## 🚀 진행 방법

각 Phase마다:
1. ✅ 자동 마이그레이션 스크립트 작성
2. ✅ 스크립트 실행
3. ✅ 빌드 에러 확인
4. ✅ 수동으로 예외 케이스 수정
5. ✅ 빌드 테스트 통과
6. ✅ Git 커밋
7. ⏩ 다음 Phase

---

**현재 상태**: Phase 1 완료, Phase 2 준비 중
**다음 작업**: hand, selected, queue 등 배열 상태 마이그레이션
