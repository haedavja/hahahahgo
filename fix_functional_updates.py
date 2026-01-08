#!/usr/bin/env python3
"""
Functional update 패턴 제거

actions.setPlayer(prev => ({ ...prev, ... }))
→ actions.setPlayer({ ...player, ... })

actions.setEnemy(e => ({ ...e, ... }))
→ actions.setEnemy({ ...enemy, ... })
"""

import re

file_path = r"Z:\바이브코딩\memory bank\hahahahgo\src\components\battle\LegacyBattleApp.jsx"

# 파일 읽기
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 백업
with open(file_path + '.func_update_backup', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ 백업 생성: LegacyBattleApp.jsx.func_update_backup")

changes = 0

# 패턴 1: actions.setPlayer(prev => ({ ...prev, ... }))
# 한 줄짜리 패턴
pattern1 = r'actions\.setPlayer\(\s*(?:prev|p)\s*=>\s*\(\{\s*\.\.\.(?:prev|p),\s*([^}]+)\}\)\s*\)'
def replace1(m):
    global changes
    changes += 1
    fields = m.group(1)
    return f'actions.setPlayer({{ ...player, {fields}}})'

content = re.sub(pattern1, replace1, content)
print(f"✅ setPlayer 한 줄 패턴 변환: {changes}개")

# 패턴 2: actions.setEnemy(e => ({ ...e, ... }))
pattern2 = r'actions\.setEnemy\(\s*(?:prev|e)\s*=>\s*\(\{\s*\.\.\.(?:prev|e),\s*([^}]+)\}\)\s*\)'
changes_before = changes
def replace2(m):
    global changes
    changes += 1
    fields = m.group(1)
    return f'actions.setEnemy({{ ...enemy, {fields}}})'

content = re.sub(pattern2, replace2, content)
print(f"✅ setEnemy 한 줄 패턴 변환: {changes - changes_before}개")

# 패턴 3: 여러 줄에 걸친 functional update (복잡한 패턴)
# 이것은 정규식으로 처리하기 어려우므로 수동 수정이 필요함
print("\n⚠️  여러 줄 functional update는 수동 확인 필요:")
print("   - Line 1715: actions.setPlayer(p => { ... })")
print("   - Line 2872: actions.setPlayer(p => { ... })")
print("   - Line 2898: actions.setEnemy(e => { ... })")

print(f"\n총 {changes}개 자동 변환")

# 파일 저장
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✅ 파일 저장 완료: {file_path}")
print("\n다음 단계:")
print("1. npm run build로 빌드 테스트")
print("2. 여러 줄 패턴 3개 수동 수정")
print("3. 성공하면 커밋")
