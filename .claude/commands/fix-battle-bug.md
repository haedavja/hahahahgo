# 전투 버그 수정

전투 시스템 버그를 진단하고 수정합니다.

## 진단 순서
1. 버그 재현 조건 파악
2. 관련 파일 탐색:
   - `src/components/battle/BattleApp.tsx` - 메인 전투 로직
   - `src/components/battle/logic/` - 카드 실행 로직
   - `src/components/battle/reducer/` - 상태 관리
3. 콘솔 로그 확인
4. 타이밍 동기화 확인 (CLAUDE.md 참조)
5. 수정 및 테스트

## 주요 타이밍 값
- 시곗바늘 이동: 250ms
- 카드 발동 대기: 250ms
- 자동진행 딜레이: 450ms (미만 금지!)

## 버그 설명
$ARGUMENTS
