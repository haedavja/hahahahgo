---
name: Debug Log Cleaner
description: 디버그 로그(console.log) 자동 정리 스킬
---

# Debug Log Cleaner

콘솔 로그를 자동으로 찾아 정리하는 스킬입니다.

## 사용 시나리오

1. **프로덕션 배포 전 정리**
2. **PR 전 코드 정리**
3. **특정 파일/디렉토리 정리**

## 실행 방법

### 1. 전체 스캔 (보고만)
```bash
grep -r "console\.log" src/ --include="*.ts" --include="*.tsx" | wc -l
```

### 2. 파일별 상세 보기
```bash
grep -rn "console\.log" src/ --include="*.ts" --include="*.tsx"
```

### 3. 자동 수정 (ESLint)
```bash
npm run lint -- --fix
```

## 정리 전략

### 유지해야 할 로그
- `console.warn()` - 경고 메시지
- `console.error()` - 에러 메시지
- `console.info()` - 정보성 메시지 (프로덕션용)
- `getLogger()` 사용 로그 - 구조화된 로깅

### 제거 대상
- `console.log()` - 디버그용 로그
- 주석 처리된 console.log
- 임시 디버그 코드

## 대체 방안

디버깅이 필요한 경우 구조화된 로거 사용:

```typescript
import { getLogger } from '@/simulator/core/logger';

const logger = getLogger('ModuleName');
logger.debug('디버그 메시지', { data });
logger.info('정보 메시지');
logger.warn('경고 메시지');
logger.error('에러 메시지', error);
```

## ESLint 규칙

현재 설정: `'no-console': ['warn', { allow: ['warn', 'error', 'info'] }]`

- `console.log` 사용 시 경고
- `console.warn/error/info`는 허용
