#!/bin/bash
# Codex가 주기적으로 실행: Claude와 Codex의 커밋을 자동 push

cd /home/user/hahahahgo/new/strategy-map

# 로컬 커밋이 있는지 확인
if git log origin/master..HEAD --oneline | grep -q .; then
  echo "📤 로컬 커밋을 push합니다..."
  git push origin master
  echo "✅ Push 완료!"
else
  echo "✅ 모든 커밋이 이미 push됨"
fi
