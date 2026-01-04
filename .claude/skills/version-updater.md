---
name: Version Tag Updater
description: 작업 완료 후 게임 내 버전 태그를 한국시간으로 자동 갱신
---

# 버전 태그 자동 업데이트

CLAUDE.md 규칙: "작업 후 버전 태그 갱신 - 게임 내 맵 하단의 버전 태그를 한국시간 기준으로 갱신 (예: 12-31 14:30)"

## 트리거 조건
- src/ 폴더의 파일 수정 후
- 커밋 전

## 자동 수행 작업
1. 현재 한국시간(KST) 확인: `TZ='Asia/Seoul' date '+%m-%d %H:%M'`
2. `src/components/map/utils/mapConfig.ts`의 `PATCH_VERSION_TAG` 업데이트
3. 형식: "MM-DD HH:MM"

## 관련 파일
- src/components/map/utils/mapConfig.ts - PATCH_VERSION_TAG 상수
