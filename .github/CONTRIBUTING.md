# 개발 가이드라인

## 핵심 원칙 (필수)

1. **새 유틸 함수 → 테스트 작성**
2. **큰 파일 (500줄+) → 분리 고려**
3. **PR 전 → `npm test` 통과**

---

## 코드 구조

```
src/
├── components/
│   └── battle/
│       ├── hooks/          # 커스텀 훅 (상태 로직)
│       ├── utils/          # 순수 함수 (테스트 용이)
│       ├── ui/             # UI 컴포넌트
│       └── logic/          # 핵심 비즈니스 로직
├── lib/                    # 공용 유틸리티
└── data/                   # 정적 데이터
```

### 파일 분리 기준

| 상황 | 행동 |
|------|------|
| 상태 관리 로직 | `hooks/` 폴더로 분리 |
| 순수 계산 함수 | `utils/` 폴더로 분리 |
| 컴포넌트 500줄 초과 | UI 분리 검토 |

---

## 네이밍 규칙

| 종류 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `BattleApp.jsx` |
| 훅 | use + 기능 | `useBattleState.js` |
| 유틸 | 기능명 | `combatUtils.js` |
| 테스트 | 원본 + .test | `combatUtils.test.js` |

---

## 테스트

### 새 유틸 함수 추가 시

```javascript
// 1. utils/myFunction.js 작성
export function myFunction(input) {
  return input * 2;
}

// 2. utils/myFunction.test.js 작성
/**
 * @file myFunction.test.js
 * @description myFunction 테스트
 *
 * ## 테스트 대상
 * - myFunction: 입력값을 2배로 반환
 *
 * ## 주요 테스트 케이스
 * - 양수 입력
 * - 0 입력
 * - 음수 입력
 */
import { describe, it, expect } from 'vitest';
import { myFunction } from './myFunction';

describe('myFunction', () => {
  it('입력값을 2배로 반환', () => {
    expect(myFunction(5)).toBe(10);
  });
});
```

### 테스트 실행

```bash
npm test           # 전체 테스트
npm test -- --run  # 워치 모드 없이 1회 실행
```

---

## 커밋 메시지

```
feat: 새 기능 추가
fix: 버그 수정
refactor: 코드 개선 (기능 변경 없음)
test: 테스트 추가/수정
docs: 문서/주석 수정
```

### 예시

```
feat: 카드 콤보 시스템 추가
fix: 에테르 계산 오류 수정
refactor: BattleApp에서 훅 분리
test: comboDetection 테스트 추가
docs: 테스트 파일 JSDoc 보강
```

---

## PR 체크리스트

- [ ] `npm test` 통과
- [ ] `npm run lint` 새 에러 없음
- [ ] 새 유틸 함수에 테스트 있음
- [ ] 500줄 넘는 새 파일 없음

---

## 현재 코드 상태 (2024.12)

- 테스트: 914개
- 테스트 파일: 42개 (JSDoc 완료)
- 린트 에러: 136개 (미사용 변수, 점진적 해결)
