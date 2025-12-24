#!/bin/bash
# GPT Codex & Claude 협업 - Git 동기화 스크립트
# 사용법: ./sync-workspace.sh [pull|push|status]

set -e  # 오류 발생 시 즉시 종료

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 설정
ROOT_REPO="."
GAME_REPO="new/strategy-map"
BRANCH_DOCS="claude/game-development-collab-016AHeBc1gjCpKT5y2DspZE7"
BRANCH_GAME="master"

# 함수: 헤더 출력
print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 함수: 상태 확인
check_status() {
    local repo_path=$1
    local repo_name=$2

    if [ ! -d "$repo_path/.git" ]; then
        echo -e "${YELLOW}⚠️  $repo_name: Git 저장소가 아님${NC}"
        return 1
    fi

    cd "$repo_path"

    echo -e "${GREEN}📂 $repo_name${NC}"
    echo -e "   위치: $(pwd)"
    echo -e "   브랜치: $(git branch --show-current)"
    echo -e "   커밋: $(git rev-parse --short HEAD) - $(git log -1 --pretty=%s)"

    if [ -n "$(git status --porcelain)" ]; then
        echo -e "   ${YELLOW}⚠️  변경사항 있음:${NC}"
        git status --short | sed 's/^/      /'
    else
        echo -e "   ${GREEN}✅ 깨끗한 상태${NC}"
    fi

    echo ""
    cd - > /dev/null
}

# 함수: Pull
do_pull() {
    local repo_path=$1
    local branch=$2
    local repo_name=$3

    if [ ! -d "$repo_path/.git" ]; then
        echo -e "${YELLOW}⚠️  $repo_name: 건너뛰기 (Git 저장소 아님)${NC}"
        return
    fi

    cd "$repo_path"

    echo -e "${GREEN}📥 $repo_name: Pull 시작...${NC}"

    # 변경사항이 있으면 경고
    if [ -n "$(git status --porcelain)" ]; then
        echo -e "${YELLOW}⚠️  커밋되지 않은 변경사항이 있습니다. 계속하시겠습니까? (y/N)${NC}"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            echo -e "${RED}❌ Pull 취소${NC}"
            cd - > /dev/null
            return
        fi
    fi

    git pull origin "$branch" && echo -e "${GREEN}✅ Pull 완료${NC}" || echo -e "${RED}❌ Pull 실패${NC}"

    cd - > /dev/null
}

# 함수: Push
do_push() {
    local repo_path=$1
    local branch=$2
    local repo_name=$3

    if [ ! -d "$repo_path/.git" ]; then
        echo -e "${YELLOW}⚠️  $repo_name: 건너뛰기 (Git 저장소 아님)${NC}"
        return
    fi

    cd "$repo_path"

    echo -e "${GREEN}📤 $repo_name: Push 시작...${NC}"

    # 변경사항 확인
    if [ -z "$(git status --porcelain)" ]; then
        echo -e "${YELLOW}⚠️  변경사항 없음${NC}"
        cd - > /dev/null
        return
    fi

    # 상태 표시
    git status --short

    echo -e "${YELLOW}위 파일들을 커밋하시겠습니까? (y/N)${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Push 취소${NC}"
        cd - > /dev/null
        return
    fi

    # 커밋 메시지 입력
    echo -e "${BLUE}커밋 메시지를 입력하세요:${NC}"
    read -r commit_msg

    if [ -z "$commit_msg" ]; then
        echo -e "${RED}❌ 커밋 메시지가 비어있습니다${NC}"
        cd - > /dev/null
        return
    fi

    # 커밋 & 푸시
    git add -A
    git commit -m "$commit_msg"
    git push -u origin "$branch" && echo -e "${GREEN}✅ Push 완료${NC}" || echo -e "${RED}❌ Push 실패${NC}"

    cd - > /dev/null
}

# 메인 로직
COMMAND=${1:-status}

case "$COMMAND" in
    status|s)
        print_header "📊 저장소 상태 확인"
        check_status "$ROOT_REPO" "📄 문서 레포 (hahahahgo)"

        if [ -d "$GAME_REPO" ]; then
            check_status "$GAME_REPO" "🎮 게임 레포 (strategy-map)"
        else
            echo -e "${YELLOW}⚠️  게임 레포 ($GAME_REPO)가 없습니다${NC}"
        fi
        ;;

    pull|p)
        print_header "📥 최신 코드 받기 (Pull)"
        do_pull "$ROOT_REPO" "$BRANCH_DOCS" "📄 문서 레포"

        if [ -d "$GAME_REPO" ]; then
            do_pull "$GAME_REPO" "$BRANCH_GAME" "🎮 게임 레포"

            # npm install 필요 시
            if [ -f "$GAME_REPO/package.json" ]; then
                echo -e "${BLUE}📦 npm install을 실행하시겠습니까? (y/N)${NC}"
                read -r response
                if [[ "$response" =~ ^[Yy]$ ]]; then
                    cd "$GAME_REPO"
                    npm install && echo -e "${GREEN}✅ 의존성 설치 완료${NC}"
                    cd - > /dev/null
                fi
            fi
        fi
        ;;

    push|P)
        print_header "📤 변경사항 업로드 (Push)"
        do_push "$ROOT_REPO" "$BRANCH_DOCS" "📄 문서 레포"

        if [ -d "$GAME_REPO" ]; then
            do_push "$GAME_REPO" "$BRANCH_GAME" "🎮 게임 레포"
        fi
        ;;

    *)
        echo "사용법: $0 [status|pull|push]"
        echo ""
        echo "명령어:"
        echo "  status (s)  - 저장소 상태 확인"
        echo "  pull (p)    - 최신 코드 받기"
        echo "  push (P)    - 변경사항 업로드"
        exit 1
        ;;
esac

print_header "✅ 완료"
