#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import sys
from pathlib import Path

# Windows 인코딩 문제 해결
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from dotenv import load_dotenv

# .env.local 로드
env_path = Path('.env.local')
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

gemini = os.getenv('GEMINI_API_KEY')
youtube = os.getenv('YOUTUBE_API_KEY')

print('=' * 50)
print('[API 키 설정 상태 확인]')
print('=' * 50)
print()

# GEMINI_API_KEY
if gemini:
    print(f'[OK] GEMINI_API_KEY: 설정됨 ({len(gemini)}자)')
    print(f'     미리보기: {gemini[:20]}...')
else:
    print('[X] GEMINI_API_KEY: 설정 안됨')

print()

# YOUTUBE_API_KEY
if youtube:
    print(f'[OK] YOUTUBE_API_KEY: 설정됨 ({len(youtube)}자)')
    print(f'     미리보기: {youtube[:20]}...')
else:
    print('[X] YOUTUBE_API_KEY: 설정 안됨')

print()
print('=' * 50)

# 테스트 가능 여부
if gemini and youtube:
    print('[OK] 모든 API 키 설정 완료! 테스트 가능합니다.')
elif not gemini and not youtube:
    print('[ERROR] API 키가 설정되지 않았습니다.')
    print('        .env.local 파일에 다음 항목을 추가하세요:')
    print('        GEMINI_API_KEY=your_key_here')
    print('        YOUTUBE_API_KEY=your_key_here')
elif not gemini:
    print('[WARNING] GEMINI_API_KEY가 없습니다.')
    print('          AI 미션 생성이 불가능합니다.')
else:
    print('[WARNING] YOUTUBE_API_KEY가 없습니다.')
    print('          영상 크롤링이 불가능합니다.')

print('=' * 50)
