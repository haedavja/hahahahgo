#!/usr/bin/env python3
"""
Phase 1: phase 상태 마이그레이션
- phase → battle.phase
- setPhase → actions.setPhase
"""

import re

file_path = r"Z:\바이브코딩\memory bank\hahahahgo\src\components\battle\LegacyBattleApp.jsx"

# 파일 읽기
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 백업
with open(file_path + '.phase_backup', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ 백업 생성: LegacyBattleApp.jsx.phase_backup")

# 변경 카운터
changes = 0

# 1. setPhase( → actions.setPhase(
# 정확한 매치를 위해 word boundary 사용
pattern1 = r'\bsetPhase\('
replacement1 = r'actions.setPhase('
content, count1 = re.subn(pattern1, replacement1, content)
changes += count1
print(f"✅ setPhase → actions.setPhase: {count1}개 변경")

# 2. phase === → battle.phase ===
pattern2 = r'\bphase\s*==='
replacement2 = r'battle.phase ==='
content, count2 = re.subn(pattern2, replacement2, content)
changes += count2
print(f"✅ phase === → battle.phase ===: {count2}개 변경")

# 3. phase !== → battle.phase !==
pattern3 = r'\bphase\s*!=='
replacement3 = r'battle.phase !=='
content, count3 = re.subn(pattern3, replacement3, content)
changes += count3
print(f"✅ phase !== → battle.phase !==: {count3}개 변경")

# 4. (phase → (battle.phase (괄호 안)
pattern4 = r'\(\s*phase\b'
replacement4 = r'(battle.phase'
content, count4 = re.subn(pattern4, replacement4, content)
changes += count4
print(f"✅ (phase → (battle.phase: {count4}개 변경")

# 5. , phase → , battle.phase (함수 인자)
pattern5 = r',\s*phase\b'
replacement5 = r', battle.phase'
content, count5 = re.subn(pattern5, replacement5, content)
changes += count5
print(f"✅ , phase → , battle.phase: {count5}개 변경")

# 6. { phase → { battle.phase (객체 안)
pattern6 = r'\{\s*phase\b'
replacement6 = r'{ battle.phase'
content, count6 = re.subn(pattern6, replacement6, content)
changes += count6
print(f"✅ {{ phase → {{ battle.phase: {count6}개 변경")

# 7. [phase → [battle.phase (배열 의존성)
pattern7 = r'\[\s*phase\b'
replacement7 = r'[battle.phase'
content, count7 = re.subn(pattern7, replacement7, content)
changes += count7
print(f"✅ [phase → [battle.phase: {count7}개 변경")

print(f"\n총 {changes}개 변경")

# 파일 저장
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✅ 파일 저장 완료: {file_path}")
print("\n다음 단계:")
print("1. npm run build 로 빌드 테스트")
print("2. 문제 있으면: mv LegacyBattleApp.jsx.phase_backup LegacyBattleApp.jsx")
print("3. 성공하면: 다음 Phase로 진행")
