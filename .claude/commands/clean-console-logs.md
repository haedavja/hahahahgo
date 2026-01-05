---
name: clean-console-logs
description: 콘솔 로그 정리 및 분석
---

# Console Log 정리 커맨드

## 작업 순서

1. **현황 파악**
   - `grep -rn "console\.log" src/ --include="*.ts" --include="*.tsx" | head -50`
   - 파일별 로그 수 확인

2. **분류**
   - 제거 가능: 순수 디버그 로그
   - 교체 필요: 유의미한 로깅 (getLogger로 교체)
   - 유지: 의도적인 사용자 메시지

3. **정리 실행**
   - ESLint 자동 수정: `npm run lint -- --fix`
   - 수동 정리가 필요한 경우 파일별로 처리

4. **검증**
   - 빌드 확인: `npm run build`
   - 테스트 확인: `npm test`

## 주의사항

- 테스트 파일(*.test.ts)의 console.log는 유지 가능
- 개발 도구(DevTools) 관련 로그는 조건부 유지
- 에러 핸들링의 console.error는 유지
