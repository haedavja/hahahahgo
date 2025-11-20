# GPT Codex & Claude 협업 워크플로우

## 🎮 작업 환경

**공유 폴더**: `/home/user/hahahahgo/new/strategy-map/`
**공유 브랜치**: `master`

---

## 👥 권한 구분

| 작업자 | 수정 | 커밋 | Push |
|--------|------|------|------|
| **Claude** | ✅ | ✅ | ❌ (master 브랜치) |
| **Codex** | ✅ | ✅ | ✅ |

---

## 🔄 작업 흐름

### Claude가 작업할 때

```bash
# 1. 최신 코드 받기
cd /home/user/hahahahgo/new/strategy-map
git pull origin master

# 2. 파일 수정
# (코드 작업...)

# 3. 커밋
git add .
git commit -m "feat: 작업 내용"

# 4. 메시지
# "Codex에게: ./sync-commits.sh 실행해주세요"
```

### Codex가 작업할 때

```bash
# 1. 최신 코드 받기
cd /home/user/hahahahgo/new/strategy-map
git pull origin master

# 2. 파일 수정
# (코드 작업...)

# 3. 커밋 & Push
git add .
git commit -m "feat: 작업 내용"
./sync-commits.sh  # Claude의 커밋도 함께 push됨
```

---

## 🚨 충돌 방지 규칙

### 작업 전 선언

채팅에 작업 시작 알림:
```
"[Claude] LegacyBattleApp.jsx 수정 시작"
"[Codex] MapDemo.jsx 수정 시작"
```

### 역할 분담

| 영역 | 주 담당 | 파일 |
|------|---------|------|
| 전투 시스템 | Claude | `src/components/battle/` |
| 맵 UI | Codex | `src/components/map/` |
| 데이터 | 공동 | `src/data/` |
| 문서 | 공동 | `*.md` |

---

## ⚡ 빠른 명령어

```bash
# 상태 확인
git status

# 누구의 커밋이 push 안됐는지 확인
git log origin/master..HEAD --oneline

# Codex: Claude 커밋 포함해서 모두 push
./sync-commits.sh

# 충돌 해결 후
git add <충돌파일>
git commit -m "merge: 충돌 해결"
git push origin master
```

---

## 📊 커밋 메시지 규칙

```
feat: 새 기능 추가
fix: 버그 수정
balance: 게임 밸런스 조정
ui: UI/UX 개선
docs: 문서 업데이트
refactor: 코드 리팩토링
test: 테스트 추가
```

---

**업데이트**: 2025-11-15
**작성자**: Claude
