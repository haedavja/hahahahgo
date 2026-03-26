# 테스트

## 테스트 스택

- **Vitest** - 단위/통합 테스트
- **Testing Library** - 컴포넌트 테스트
- **Playwright** - E2E 테스트
- **Storybook** - 시각적 테스트

## 단위 테스트

```bash
# 모든 테스트 실행
npm test

# 감시 모드
npm run test:watch

# 커버리지 리포트
npm run test:coverage
```

### 테스트 파일 위치

테스트 파일은 소스 파일과 같은 디렉토리에 위치:

```
src/lib/
├── etherUtils.ts
└── etherUtils.test.ts
```

### 테스트 작성 예시

```typescript
import { describe, it, expect } from 'vitest';
import { calculateDamage } from './battleResolver';

describe('calculateDamage', () => {
  it('기본 데미지 계산', () => {
    const result = calculateDamage(10, 0, 0);
    expect(result).toBe(10);
  });

  it('방어력 적용', () => {
    const result = calculateDamage(10, 5, 0);
    expect(result).toBe(5);
  });
});
```

## E2E 테스트

```bash
# Playwright 설치
npx playwright install

# E2E 테스트 실행
npm run test:e2e

# UI 모드
npm run test:e2e:ui

# 디버그 모드
npm run test:e2e:debug
```

### E2E 테스트 예시

```typescript
import { test, expect } from '@playwright/test';

test('전투 시작', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="start-battle"]');
  await expect(page.locator('.battle-screen')).toBeVisible();
});
```

## 커버리지 목표

| 항목 | 목표 |
|-----|-----|
| Statements | 60% |
| Branches | 50% |
| Functions | 60% |
| Lines | 60% |

CI에서 임계값 미달 시 빌드 실패.

## Storybook 테스트

```bash
npm run storybook
```

인터랙션 테스트 예시:

```typescript
export const InteractionTest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button'));
    await expect(canvas.getByText('Clicked!')).toBeVisible();
  },
};
```
