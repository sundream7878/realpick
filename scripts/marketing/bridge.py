#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Realpick Marketing Bridge
Next.js에서 Python 기능을 호출하기 위한 브릿지 스크립트
"""

import sys
import io
import json
import argparse
import os
from pathlib import Path

# Windows 인코딩 문제 해결
if sys.platform == 'win32':
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8')
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# .env 파일 로드 (프로젝트 루트에서)
from dotenv import load_dotenv
# 프로젝트 루트의 .env.local 파일 사용
project_root = Path(__file__).parent.parent.parent
env_path = project_root / '.env.local'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    # 로컬 .env도 시도
    local_env = Path(__file__).parent / '.env'
    if local_env.exists():
        load_dotenv(dotenv_path=local_env)

from modules.youtube_crawler import YouTubeCrawler
from modules.gemini_analyzer import GeminiAnalyzer
from modules.firebase_manager import FirebaseManager
from modules.email_sender import EmailSender
from modules.community_crawler import CommunityCrawler
try:
    from youtube_transcript_api import YouTubeTranscriptApi
    HAS_TRANSCRIPT = True
except ImportError:
    HAS_TRANSCRIPT = False
import google.generativeai as genai
import random
import string
from firebase_admin import firestore

def crawl_youtube(args):
    """YouTube 크롤링 (키워드로 영상 직접 검색)"""
    try:
        api_key = os.getenv('YOUTUBE_API_KEY')
        if not api_key:
            return {
                "success": False,
                "error": "YouTube API 키가 설정되지 않았습니다."
            }
        
        keywords = args.keywords
        max_results = int(getattr(args, 'max_results', 5))
        
        crawler = YouTubeCrawler(api_key)
        
        # 키워드로 영상 직접 검색 (채널 검색이 아님)
        videos = crawler.search_videos_by_keyword(keywords, max_results)
        
        if not videos:
            return {
                "success": False,
                "error": f"'{keywords}' 키워드로 영상을 찾을 수 없습니다. 다른 키워드를 시도해보세요."
            }
        
        return {
            "success": True,
            "count": len(videos),
            "videos": videos
        }
    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": str(e),
            "trace": traceback.format_exc()
        }

def analyze_video(args):
    """영상 분석 및 AI 미션 생성"""
    try:
        video_id = getattr(args, 'video_id', None)
        title = getattr(args, 'title', '')
        desc = getattr(args, 'desc', '')
        
        if not video_id:
            return {
                "success": False,
                "error": "video_id가 필요합니다."
            }
        
        # Gemini API 키 확인
        gemini_key = os.getenv('GEMINI_API_KEY')
        if not gemini_key:
            return {
                "success": False,
                "error": "Gemini API 키가 설정되지 않았습니다."
            }
        
        # 자막 가져오기
        transcript_text = ""
        if HAS_TRANSCRIPT:
            try:
                transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['ko', 'en'])
                transcript_text = " ".join([t['text'] for t in transcript_list])
            except Exception as e:
                # 자막이 없어도 계속 진행
                transcript_text = f"자막 없음. 제목과 설명으로 분석합니다. (오류: {str(e)})"
        else:
            transcript_text = "자막 API가 설치되지 않았습니다. 제목과 설명으로 분석합니다."
        
        # Gemini로 분석
        analyzer = GeminiAnalyzer(gemini_key)
        video_info = {
            'title': title.strip('"'),
            'description': desc.strip('"'),
            'video_id': video_id
        }
        
        result = analyzer.analyze_with_transcript(video_info, transcript_text)
        
        if result and 'missions' in result:
            return {
                "success": True,
                "missions": result['missions']
            }
        else:
            return {
                "success": False,
                "error": "미션 생성에 실패했습니다. Gemini 응답을 확인해주세요."
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def crawl_community(args):
    """커뮤니티 이슈 크롤링 및 댓글 생성"""
    try:
        gemini_key = os.getenv('GEMINI_API_KEY')
        if not gemini_key:
            return {"success": False, "error": "Gemini API 키가 필요합니다."}
            
        crawler = CommunityCrawler()
        analyzer = GeminiAnalyzer(gemini_key)
        
        # 리얼픽 주요 프로그램 키워드
        program_keywords = [
            {"showId": "nasolo", "keywords": ["나는솔로", "나솔", "남규홍"]},
            {"showId": "choegang-yagu-2025", "keywords": ["최강야구", "몬스터즈", "김성근"]},
            {"showId": "nasolsagye", "keywords": ["나솔사계", "사랑은 계속된다"]},
            {"showId": "dolsingles6", "keywords": ["돌싱글즈", "돌싱"]},
            {"showId": "hwanseung4", "keywords": ["환승연애", "환연"]},
            {"showId": "solojihuk5", "keywords": ["솔로지옥"]},
            {"showId": "culinary-class-wars2", "keywords": ["흑백요리사", "안성재", "백종원"]},
            {"showId": "goal-girls-8", "keywords": ["골때녀", "골 때리는 그녀들"]}
        ]
        
        all_results = []
        # 시간 단축을 위해 랜덤하게 몇 개의 프로그램만 선택하거나 순차적으로 처리
        for prog in program_keywords:
            show_id = prog["showId"]
            kws = prog["keywords"]
            
            # 각 프로그램별 키워드로 10대 커뮤니티 모니터링
            posts = crawler.get_hot_posts(show_id, kws)
            
            for post in posts:
                # AI 댓글 생성
                comment = analyzer.generate_viral_comment(post.get('content', ''), post.get('title', ''))
                post['suggestedComment'] = comment
                all_results.append(post)
                
        # 조회수 순으로 정렬하여 상위 결과 반환
        all_results.sort(key=lambda x: x.get('viewCount', 0), reverse=True)
        
        return {
            "success": True,
            "posts": all_results[:30] # 상위 30개만 반환
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    # 모든 print를 stderr로 리다이렉트 (JSON 출력만 stdout에)
    original_stdout = sys.stdout
    sys.stdout = sys.stderr
    
    try:
        parser = argparse.ArgumentParser(description='Realpick Marketing Bridge')
        parser.add_argument('--args-file', type=str, help='JSON file with arguments')
        parser.add_argument('command', type=str, nargs='?', help='Command to execute')
        
        # 공통 인자
        parser.add_argument('--keywords', type=str, help='Search keywords')
        parser.add_argument('--max-results', type=int, help='Maximum results')
        parser.add_argument('--video-id', type=str, help='YouTube video ID')
        parser.add_argument('--title', type=str, help='Video title')
        parser.add_argument('--desc', type=str, help='Video description')
        
        args, _ = parser.parse_known_args()
        
        # --args-file이 제공되면 JSON 파일에서 인자 로드
        if args.args_file and os.path.exists(args.args_file):
            with open(args.args_file, 'r', encoding='utf-8') as f:
                json_args = json.load(f)
            
            # JSON 인자를 argparse.Namespace로 변환
            for key, value in json_args.items():
                if key == 'command':
                    args.command = value
                else:
                    setattr(args, key.replace('-', '_'), value)
        
        # 명령어에 따라 함수 실행
        result = None
        if args.command == 'crawl-youtube':
            result = crawl_youtube(args)
        elif args.command == 'analyze-video':
            result = analyze_video(args)
        elif args.command == 'crawl-community':
            result = crawl_community(args)
        else:
            result = {
                "success": False,
                "error": f"Unknown command: {args.command}"
            }
        
        # JSON 출력 (반드시 stdout에 한 줄로)
        sys.stdout = original_stdout
        print(json.dumps(result, ensure_ascii=False))
        sys.stdout.flush()
        
    except Exception as e:
        import traceback
        # 오류도 stdout으로 JSON 형식으로
        sys.stdout = original_stdout
        print(json.dumps({
            "success": False, 
            "error": str(e),
            "trace": traceback.format_exc()
        }, ensure_ascii=False))
        sys.stdout.flush()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        # 오류 발생 시에도 JSON 형식으로 출력
        print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))
        sys.stdout.flush()
        sys.exit(1)
