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

# .env 파일 로드 (realpick-marketing-bot 루트에서)
from dotenv import load_dotenv
# realpick-marketing-bot/.env.local 파일 사용
bot_root = Path(__file__).parent.parent  # realpick-marketing-bot/
env_path = bot_root / '.env.local'
if env_path.exists():
    load_dotenv(dotenv_path=env_path, override=True)
    print(f"[Bridge] .env.local 로드됨: {env_path}", file=sys.stderr)
else:
    # 로컬 .env도 시도
    local_env = Path(__file__).parent / '.env'
    if local_env.exists():
        load_dotenv(dotenv_path=local_env)
    else:
        print(f"[Bridge] 경고: .env.local 파일을 찾을 수 없습니다: {env_path}", file=sys.stderr)

from modules.youtube_crawler import YouTubeCrawler
from modules.gemini_analyzer import GeminiAnalyzer
from modules.firebase_manager import FirebaseManager
from modules.email_sender import EmailSender
from modules.community_crawler import CommunityCrawler
from modules.auto_commenter import AutoCommenter
try:
    from modules.naver_cafe_crawler import NaverCafeCrawler
    HAS_NAVER_CAFE = True
except ImportError:
    HAS_NAVER_CAFE = False
try:
    from youtube_transcript_api import YouTubeTranscriptApi
    HAS_TRANSCRIPT = True
except ImportError:
    HAS_TRANSCRIPT = False
import google.generativeai as genai
import random
import string
import time
from datetime import timedelta
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
        hours_back = int(getattr(args, 'hours_back', 24))  # 기본값 24시간
        
        crawler = YouTubeCrawler(api_key)
        
        # 키워드로 영상 직접 검색 (채널 검색이 아님)
        # 최근 24시간 이내 업로드된 영상 중 조회수 상위 영상 반환
        videos = crawler.search_videos_by_keyword(keywords, max_results, hours_back=hours_back)
        
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
                print(f"DEBUG: Fetching transcript for {video_id}", file=sys.stderr)
                transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['ko', 'en'])
                transcript_text = " ".join([t['text'] for t in transcript_list])
                print(f"DEBUG: Transcript length: {len(transcript_text)}", file=sys.stderr)
            except Exception as e:
                # 자막이 없어도 계속 진행
                print(f"DEBUG: Transcript error: {str(e)}", file=sys.stderr)
                transcript_text = f"자막 없음. 제목과 설명으로 분석합니다. (오류: {str(e)})"
        else:
            print("DEBUG: HAS_TRANSCRIPT is False", file=sys.stderr)
            transcript_text = "자막 API가 설치되지 않았습니다. 제목과 설명으로 분석합니다."
        
        # Gemini로 분석 (크롤링 시 선택한 프로그램 키워드 전달 → 자막과 맞는 프로그램 분류용)
        keyword = getattr(args, 'keyword', '') or ''
        if isinstance(keyword, str):
            keyword = keyword.strip().strip('"')
        print(f"DEBUG: Analyzing with Gemini. Title: {title[:20]}, keyword: {keyword}", file=sys.stderr)
        analyzer = GeminiAnalyzer(gemini_key)
        video_info = {
            'title': title.strip('"'),
            'description': desc.strip('"'),
            'video_id': video_id,
            'keyword': keyword
        }
        
        result = analyzer.analyze_with_transcript(video_info, transcript_text)
        print(f"DEBUG: Gemini result: {str(result)[:100]}", file=sys.stderr)
        
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

def crawl_naver_cafe(args):
    """네이버 카페 크롤링 (Selenium 기반)"""
    try:
        if not HAS_NAVER_CAFE:
            return {
                "success": False,
                "error": "네이버 카페 크롤러가 설치되지 않았습니다. pip install selenium undetected-chromedriver"
            }
        
        # 파라미터 추출
        cafe_url = getattr(args, 'cafe_url', None)
        keywords_str = getattr(args, 'keywords', None)
        start_date_str = getattr(args, 'start_date', None)
        end_date_str = getattr(args, 'end_date', None)
        exclude_boards = getattr(args, 'exclude_boards', '').split(',') if getattr(args, 'exclude_boards', None) else []
        max_pages = int(getattr(args, 'max_pages', 50))
        use_browser = getattr(args, 'use_browser', 'true').lower() == 'true'
        
        if not cafe_url:
            return {"success": False, "error": "cafe_url이 필요합니다."}
        
        # 키워드 파싱
        keywords = []
        if keywords_str:
            keywords = [kw.strip() for kw in keywords_str.split(',') if kw.strip()]
        
        if not keywords:
            # 기본 키워드 (리얼픽 주요 프로그램)
            keywords = ["나는솔로", "나솔", "최강야구", "나솔사계", "돌싱글즈", "환승연애", "솔로지옥"]
        
        # 날짜 파싱 (기본값: 최근 24시간)
        from datetime import datetime
        if start_date_str:
            start_date = datetime.fromisoformat(start_date_str)
        else:
            start_date = datetime.now() - timedelta(hours=24)  # 24시간 전
        
        if end_date_str:
            end_date = datetime.fromisoformat(end_date_str)
        else:
            end_date = datetime.now()
        
        # Firestore에서 기존 수집된 post_id 확인 (스마트 재개)
        existing_post_ids = set()
        try:
            from modules.firebase_manager import FirebaseManager
            fb_manager = FirebaseManager()
            # viral_posts 컬렉션에서 해당 카페의 post_id 목록 가져오기
            # 실제 구현은 FirebaseManager에 메서드 추가 필요
        except:
            pass
        
        crawler = NaverCafeCrawler(headless=False, visible=True)
        
        if use_browser:
            # 브라우저 시작
            if not crawler.start_browser():
                return {"success": False, "error": "브라우저 시작 실패"}
            
            # [스마트 로그인] 저장된 쿠키로 자동 로그인 시도
            print("[Naver Cafe Crawl] 저장된 쿠키로 자동 로그인 시도 중...", file=sys.stderr)
            cookie_loaded = crawler.load_login_cookies()
            
            if not cookie_loaded:
                # 쿠키 로드 실패 시 수동 로그인
                print("[Naver Cafe Crawl] 쿠키 없음 - 수동 로그인 필요", file=sys.stderr)
                if not crawler.wait_for_login(timeout=300, save_cookies=True):
                    crawler.close()
                    return {"success": False, "error": "로그인 대기 시간 초과"}
            else:
                print("[Naver Cafe Crawl] ✅ 쿠키로 자동 로그인 성공", file=sys.stderr)
        
        # 목록 수집 (키워드 기반)
        print(f"[Naver Cafe Crawl] 목록 수집 시작: {cafe_url}, 키워드: {keywords}", file=sys.stderr)
        print(f"[Naver Cafe Crawl] 🚀 Gemini 3단계 전략 적용:", file=sys.stderr)
        print(f"[Naver Cafe Crawl]   1️⃣ 목록 뷰 강제 (viewType=L)", file=sys.stderr)
        print(f"[Naver Cafe Crawl]   2️⃣ 정규식 날짜 패턴 (9가지)", file=sys.stderr)
        print(f"[Naver Cafe Crawl]   3️⃣ 상세 페이지 Fallback (최초 10개)", file=sys.stderr)
        posts_list = crawler.crawl_article_list(
            cafe_url=cafe_url,
            keywords=keywords,
            start_date=start_date,
            end_date=end_date,
            exclude_boards=exclude_boards,
            max_pages=max_pages
        )
        
        print(f"[Naver Cafe Crawl] 목록 수집 완료: {len(posts_list)}개", file=sys.stderr)
        
        # 상세 수집 (스마트 재개: 기존 post_id는 스킵)
        all_posts = []
        for post_info in posts_list:
            post_id = post_info.get('post_id')
            
            # 스마트 재개: 이미 수집된 게시글은 스킵
            if post_id in existing_post_ids:
                print(f"[Naver Cafe Crawl] 스킵 (이미 수집됨): {post_id}", file=sys.stderr)
                continue
            
            url = post_info.get('url')
            if not url:
                continue
            
            # 상세 수집
            detail = crawler.crawl_article_detail(url, post_id)
            if detail:
                # 목록 정보와 상세 정보 병합
                merged_post = {
                    **post_info,
                    'content': detail.get('content', ''),
                    'member_id': detail.get('member_id') or post_info.get('member_id'),
                    'nickname': detail.get('nickname') or post_info.get('nickname'),
                    'comments': detail.get('comments', []),
                    'viewCount': 0,  # 필요시 추가
                    'commentCount': len(detail.get('comments', []))
                }
                all_posts.append(merged_post)
                existing_post_ids.add(post_id)
            
            # Rate limiting
            time.sleep(random.uniform(3, 7))
        
        return {
            "success": True,
            "posts": all_posts,
            "total": len(all_posts)
        }
        
    except Exception as e:
        import traceback
        print(f"[Naver Cafe Crawl] 오류: {e}", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        return {
            "success": False,
            "error": str(e)
        }
    finally:
        # 브라우저 안전하게 종료
        if use_browser and crawler:
            try:
                crawler.close()
            except Exception as e:
                print(f"[Naver Cafe Crawl] 브라우저 종료 오류 (무시 가능): {e}", file=sys.stderr)

def crawl_community(args):
    """커뮤니티 이슈 크롤링 및 댓글 생성"""
    try:
        gemini_key = os.getenv('GEMINI_API_KEY')
        if not gemini_key:
            return {"success": False, "error": "Gemini API 키가 필요합니다."}
            
        analyzer = GeminiAnalyzer(gemini_key)
        
        # limit 파라미터 받기 (기본값 30)
        limit = int(getattr(args, 'limit', 30))

        # 선택된 프로그램(쇼) ID들 (대시보드에서 전달)
        selected_show_ids_raw = getattr(args, 'selectedShowIds', None) or getattr(args, 'selected_show_ids', None) or ''
        selected_show_ids = []
        if isinstance(selected_show_ids_raw, str) and selected_show_ids_raw.strip():
            selected_show_ids = [s.strip() for s in selected_show_ids_raw.split(',') if s.strip()]
        elif isinstance(selected_show_ids_raw, list):
            selected_show_ids = [str(s).strip() for s in selected_show_ids_raw if str(s).strip()]

        # 게시판형/카페 포함 여부
        mode = (getattr(args, 'mode', None) or 'board').strip().lower()
        include_mamacafe = False if mode == 'board' else True
        only_mamacafe = True if mode == 'cafe' else False

        # board 모드에서는 맘카페 리스트 로드 불필요 (속도 개선 + 불필요한 로그 제거)
        # 에펨코리아 등 봇 차단이 심한 사이트 대응을 위해 use_browser=True 설정
        crawler = CommunityCrawler(load_mamacafe=(include_mamacafe or only_mamacafe), use_browser=True)
        
        # 브라우저 시작 (명시적 호출)
        if not crawler.start_browser():
            return {"success": False, "error": "브라우저 시작 실패"}
        
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

        # 선택된 프로그램만 크롤링하도록 필터링 (핵심: 나솔 선택했는데 환승이 같이 나오는 문제 해결)
        if selected_show_ids:
            program_keywords = [p for p in program_keywords if p.get("showId") in selected_show_ids]
        
        # 크롤링할 대상 사이트 선택 (기본값: 전체)
        target_sites_str = getattr(args, 'target_sites', '')
        target_sites = []
        if target_sites_str:
            target_sites = [s.strip() for s in target_sites_str.split(',') if s.strip()]
        
        all_results = []
        # limit에 도달하면 중단하기 위한 플래그
        reached_limit = False
        
        # 시간 단축을 위해 랜덤하게 몇 개의 프로그램만 선택하거나 순차적으로 처리
        for prog in program_keywords:
            if reached_limit:
                break
                
            show_id = prog["showId"]
            kws = prog["keywords"]
            
            # 각 프로그램별 키워드로 10대 커뮤니티 모니터링
            # limit을 전달하여 크롤링 개수 제한
            remaining_limit = limit - len(all_results)
            if remaining_limit <= 0:
                reached_limit = True
                break
                
            posts = crawler.get_hot_posts(
                show_id,
                kws,
                limit=remaining_limit,
                include_mamacafe=include_mamacafe,
                only_mamacafe=only_mamacafe,
                target_sites=target_sites  # 선택된 사이트 전달
            )
            
            for post in posts:
                # limit에 도달하면 중단
                if len(all_results) >= limit:
                    reached_limit = True
                    break
                    
                # AI 댓글 생성
                try:
                    comment = analyzer.generate_viral_comment(post.get('content', ''), post.get('title', ''))
                    post['suggestedComment'] = comment
                    # API 호출 간 딜레이 추가 (Rate Limit 방지)
                    time.sleep(2) 
                except Exception as e:
                    print(f"⚠️ 댓글 생성 실패: {e}", file=sys.stderr)
                    post['suggestedComment'] = "댓글 생성 실패"
                
                all_results.append(post)
                
        # 조회수 순으로 정렬하여 상위 결과 반환
        all_results.sort(key=lambda x: x.get('viewCount', 0), reverse=True)
        
        return {
            "success": True,
            "posts": all_results[:limit] # limit만큼만 반환
        }
    except Exception as e:
        import traceback
        print(f"[Community Crawler] 오류: {e}", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        return {"success": False, "error": str(e)}
    finally:
        # 브라우저 종료
        if crawler:
            crawler.close()

def manual_login(args):
    """수동 로그인을 통한 쿠키 저장 (환경변수 자동 로그인 지원)"""
    try:
        url = getattr(args, 'url', None)
        site_id = getattr(args, 'site_id', None)
        user_id = getattr(args, 'user_id', None)
        user_pw = getattr(args, 'user_pw', None)
        
        if not url or not site_id:
            return {"success": False, "error": "url과 site_id가 필요합니다."}
            
        # 환경 변수에서 계정 정보 로드 시도 (args에 없을 경우)
        if not user_id and site_id:
            env_map = {
                'clien': ('CLIEN_ID', 'CLIEN_PW'),
                'dcinside': ('DC_ID', 'DC_PW'),
                'fmkorea': ('FM_ID', 'FM_PW'),
                'nate': ('NATE_ID', 'NATE_PW'),
                'ruliweb': ('RULIWEB_ID', 'RULIWEB_PW'),
                'ppomppu': ('PPOMPPU_ID', 'PPOMPPU_PW'),
            }
            if site_id in env_map:
                id_key, pw_key = env_map[site_id]
                env_id = os.getenv(id_key)
                env_pw = os.getenv(pw_key)
                if env_id and env_pw:
                    user_id = env_id
                    user_pw = env_pw
                    print(f"[Bridge] {site_id} 계정 정보를 환경 변수({id_key})에서 로드함: {user_id[:2]}***", file=sys.stderr)

        commenter = AutoCommenter(headless=False)
        if not commenter.start_browser():
            return {"success": False, "error": "브라우저 시작 실패"}
            
        # 1. 전달받은 계정 정보가 있으면 자동 입력 시도
        if user_id and user_pw:
            print(f"[Bridge] {site_id} 자동 로그인 시도 중...", file=sys.stderr)
            if site_id == 'clien':
                commenter._login_clien(user_id, user_pw)
            elif site_id == 'dcinside':
                commenter._login_dcinside(user_id, user_pw)
            elif site_id == 'fmkorea':
                commenter._login_fmkorea(user_id, user_pw)
            elif site_id == 'ruliweb':
                commenter._login_ruliweb(user_id, user_pw)
            elif site_id == 'ppomppu':
                commenter._login_ppomppu(user_id, user_pw)
            elif site_id == 'nate':
                commenter._login_nate(user_id, user_pw)
        
        # 2. 수동 로그인 대기 및 쿠키 저장
        result = commenter.manual_login(url, site_id)
        commenter.close()
        return result
    except Exception as e:
        return {"success": False, "error": str(e)}

def auto_comment(args):
    """크롤링된 게시글에 자동으로 댓글 등록"""
    try:
        # 디버깅: 환경 변수 로드 상태 확인
        clien_id = os.getenv('CLIEN_ID')
        if clien_id:
            print(f"[Bridge] CLIEN_ID 환경변수 확인됨: {clien_id[:2]}***", file=sys.stderr)
        else:
            print(f"[Bridge] ⚠️ 경고: CLIEN_ID가 환경변수에 없습니다.", file=sys.stderr)
            # 비상: 다시 한 번 로드 시도
            try:
                bot_root = Path(__file__).parent.parent
                env_path = bot_root / '.env.local'
                if env_path.exists():
                    load_dotenv(dotenv_path=env_path, override=True)
                    print(f"[Bridge] .env.local 재로드 시도 완료", file=sys.stderr)
            except:
                pass

        from modules.auto_commenter import AutoCommenter, HAS_SELENIUM

        if not HAS_SELENIUM:
            return {
                "success": False,
                "error": "Selenium이 설치되어 있지 않습니다. pip install undetected-chromedriver selenium"
            }

        url = getattr(args, 'url', None)
        comment_text = getattr(args, 'comment', None)
        site_id = getattr(args, 'site_id', None) or None
        headless = str(getattr(args, 'headless', 'false')).lower() == 'true'

        if not url:
            return {"success": False, "error": "url이 필요합니다."}
        if not comment_text:
            return {"success": False, "error": "comment 텍스트가 필요합니다."}

        commenter = AutoCommenter(headless=headless)
        try:
            result = commenter.post_comment(url, comment_text, site_id)
            return result
        finally:
            commenter.close()

    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": str(e),
            "trace": traceback.format_exc()
        }


def main():
    # 모든 경고 메시지를 무시하여 JSON 출력만 깨끗하게 유지
    import warnings
    warnings.filterwarnings("ignore")
    
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
        elif args.command == 'crawl-naver-cafe':
            result = crawl_naver_cafe(args)
        elif args.command == 'manual-login':
            result = manual_login(args)
        elif args.command == 'auto-comment':
            result = auto_comment(args)
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
