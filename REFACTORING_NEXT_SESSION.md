# 타입 리팩토링 다음 세션 준비 자료

## 완료된 작업 (이번 세션)

### 커밋 히스토리
```
93d56c2 refactor: types/index.ts 중복 인터페이스 정리
d963463 refactor: object 타입을 구체적인 인터페이스로 교체
5078936 refactor: 중복 Battle 인터페이스를 공유 타입으로 통합
e401f4b refactor: unknown 타입을 구체적인 타입으로 대체
8a6b95d refactor: BattleApp any 타입을 공유 타입으로 교체
```

### 완료 내역
- [x] `any` 타입 6개 제거 (BattleApp.tsx)
- [x] `unknown` 타입 주요 항목 구체화
- [x] `object` 타입 → 구체적 인터페이스
- [x] 중복 Battle 인터페이스 통합 (PhaseBattle)
- [x] IconProps, ForcedAnomaly 중복 제거

---

## 남은 작업: 동명이인 인터페이스 (11개)

### 1. ComboResult (완전히 다른 구조)
| 위치 | 용도 | 속성 |
|------|------|------|
| Line 405 | 콤보 감지 결과 | type, rank, multiplier, cards, description |
| Line 1094 | 콤보 계산 결과 | name, bonusKeys |

**권장 리네이밍:**
- Line 405: `DetectedCombo`
- Line 1094: `ComboCalculation`

### 2. TokenState (다른 타입 사용)
| 위치 | 용도 | 속성 타입 |
|------|------|----------|
| Line 481 | 전투 로직용 | `TokenInstance[]` |
| Line 2767 | UI 표시용 | `unknown[]` |

**권장 리네이밍:**
- Line 481: 유지 (더 구체적)
- Line 2767: `UITokenState`

### 3. TimelineAction (완전히 다른 구조)
| 위치 | 용도 | 주요 속성 |
|------|------|----------|
| Line 2073 | 전투 로직 | actor, cardId, speedCost, priorityWeight |
| Line 2791 | UI 표시 | sp, card, actor |

**권장 리네이밍:**
- Line 2073: `BattleTimelineAction`
- Line 2791: `UITimelineAction`

### 4. MapNode (다른 필수 속성)
| 위치 | 용도 | 필수 속성 |
|------|------|----------|
| Line 216 | 게임 로직 | id, type, layer, cleared, selectable, connections |
| Line 3495 | UI 표시 | id, type (layer, cleared 선택적) |

**권장 리네이밍:**
- Line 216: 유지 (더 완전)
- Line 3495: `UIMapNode`

### 5. HandCard (다른 상속)
| 위치 | 용도 | 상속 |
|------|------|------|
| Line 1108 | 전투 로직 | extends Card |
| Line 2891 | UI 표시 | 독립 인터페이스 |

**권장 리네이밍:**
- Line 1108: 유지
- Line 2891: `UIHandCard`

### 6. CharacterBuild (유사하지만 다름)
| 위치 | 용도 |
|------|------|
| Line 1116 | 전투 로직용 |
| Line 3016 | DevTools용 |

**권장:** 병합 또는 상속 관계 정립

### 7. SimulationResult (유사)
| 위치 | 용도 |
|------|------|
| Line 1364 | 전투 시뮬레이션 |
| Line 3124 | UI 표시용 |

**권장:** 병합 검토

### 8. PostCombatOptions (유사)
| 위치 | 용도 |
|------|------|
| Line 1855 | 전투 로직 |
| Line 3133 | UI 표시 |

**권장:** 병합 검토

### 9. EnemyPlan (다른 속성)
| 위치 | 용도 | 속성 |
|------|------|------|
| Line 1013 | 전투 로직 | actions, [key: string]: unknown |
| Line 2684 | 훅용 | actions, mode |

**권장 리네이밍:**
- Line 1013: `BattleEnemyPlan`
- Line 2684: `HookEnemyPlan`

### 10. RelicsMap (다른 값 타입)
| 위치 | 값 타입 |
|------|--------|
| Line 1911 | RelicData |
| Line 2980 | UIRelic |

**권장 리네이밍:**
- Line 1911: 유지
- Line 2980: `UIRelicsMap`

### 11. TokenEntity, RelicData (유사)
중복 확인 후 병합 검토

---

## 대형 파일 분할 작업

### 1. BattleApp.tsx (2998줄)
```
src/components/battle/BattleApp.tsx
- Game 함수: ~2855줄 (line 122-2977)
```

**분할 제안:**
- `BattleApp.tsx` - 메인 컴포넌트
- `useBattleGame.ts` - Game 로직 훅
- `BattleRendering.tsx` - 렌더링 로직

### 2. gameStore.ts (1740줄)
```
src/state/gameStore.ts
```

**분할 제안:**
- `gameStore.ts` - 메인 스토어
- `battleActions.ts` - 전투 관련 액션
- `mapActions.ts` - 맵 관련 액션
- `devActions.ts` - 개발자 도구 액션

### 3. types/index.ts (3600줄)
```
src/types/index.ts
```

**분할 제안:**
- `types/card.ts` - 카드 관련
- `types/battle.ts` - 전투 관련
- `types/map.ts` - 맵 관련
- `types/ui.ts` - UI 컴포넌트 관련
- `types/index.ts` - re-export

---

## 테스트 현황

- 총 테스트: 1009개
- 상태: 모두 통과 ✅
- 커버리지: 전투 유틸리티 중심

---

## 작업 순서 권장

1. **동명이인 인터페이스 해결** (중간 난이도)
   - 리네이밍 후 import 경로 수정
   - 영향 범위: types 사용 파일들

2. **types/index.ts 분할** (중간 난이도)
   - 도메인별 파일 분리
   - re-export 패턴 사용

3. **gameStore.ts 분할** (높은 난이도)
   - 액션 그룹별 분리
   - 순환 참조 주의

4. **BattleApp.tsx 분할** (높은 난이도)
   - 커스텀 훅 추출
   - 렌더링 분리

---

## 주의사항

- 모든 변경 후 `npm test -- --run` 실행
- 한 번에 하나의 리네이밍만 진행
- import 경로 자동 수정 도구 활용 권장
