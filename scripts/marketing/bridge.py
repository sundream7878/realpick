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

# Firebase 초기화 (전역으로 한 번만 실행, 실패해도 계속 진행)
FIREBASE_AVAILABLE = False
try:
    firebase_manager = FirebaseManager()
    if firebase_manager.db:
        FIREBASE_AVAILABLE = True
        print("[Bridge] ✅ Firebase 초기화 완료", file=sys.stderr)
    else:
        print("[Bridge] ⚠️ Firebase 키 파일 없음 - 진행 상황 업데이트 비활성화", file=sys.stderr)
except Exception as e:
    print(f"[Bridge] ⚠️ Firebase 초기화 실패: {e} - 진행 상황 업데이트 비활성화", file=sys.stderr)
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
        
        # Gemini로 분석
        print(f"DEBUG: Analyzing with Gemini. Title: {title[:20]}", file=sys.stderr)
        analyzer = GeminiAnalyzer(gemini_key)
        video_info = {
            'title': title.strip('"'),
            'description': desc.strip('"'),
            'video_id': video_id
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
        cafe_list_str = getattr(args, 'cafe_list', None)
        keywords_str = getattr(args, 'keywords', None)
        start_date_str = getattr(args, 'start_date', None)
        end_date_str = getattr(args, 'end_date', None)
        exclude_boards = getattr(args, 'exclude_boards', '').split(',') if getattr(args, 'exclude_boards', None) else []
        max_pages = int(getattr(args, 'max_pages', 50))
        use_browser = getattr(args, 'use_browser', 'true').lower() == 'true'
        limit = int(getattr(args, 'limit', 30))
        
        # cafe_list가 있으면 여러 카페 순회
        cafe_urls = []
        if cafe_list_str:
            cafe_urls = [url.strip() for url in cafe_list_str.split(',') if url.strip()]
            print(f"[Naver Cafe Crawl] {len(cafe_urls)}개 카페 순회 예정", file=sys.stderr)
        elif cafe_url:
            cafe_urls = [cafe_url]
        
        if not cafe_urls:
            return {"success": False, "error": "cafe_url 또는 cafe_list가 필요합니다."}
        
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
        all_posts = []
        
        if use_browser:
            # 브라우저 시작
            if not crawler.start_browser():
                return {"success": False, "error": "브라우저 시작 실패"}
            
            # [2026-02-10 수정] 쿠키 자동 로그인 비활성화 → 항상 수동 로그인
            print("[Naver Cafe Crawl] ============================================", file=sys.stderr)
            print("[Naver Cafe Crawl] 🔐 수동 로그인 모드", file=sys.stderr)
            print("[Naver Cafe Crawl] ============================================", file=sys.stderr)
            print("[Naver Cafe Crawl]", file=sys.stderr)
            print("[Naver Cafe Crawl] 📌 Chrome 브라우저가 열렸습니다.", file=sys.stderr)
            print("[Naver Cafe Crawl] 📌 네이버 로그인 페이지에서 직접 로그인해주세요.", file=sys.stderr)
            print("[Naver Cafe Crawl] 📌 로그인 완료 후 자동으로 크롤링이 시작됩니다.", file=sys.stderr)
            print("[Naver Cafe Crawl]", file=sys.stderr)
            print("[Naver Cafe Crawl] ⏳ 로그인을 기다리는 중... (최대 5분)", file=sys.stderr)
            print("[Naver Cafe Crawl] ============================================", file=sys.stderr)
            
            # 수동 로그인 대기 (쿠키 저장 안 함)
            if not crawler.wait_for_login(timeout=300, save_cookies=False):
                crawler.close()
                return {"success": False, "error": "로그인 대기 시간 초과 (5분)"}
            
            print("[Naver Cafe Crawl] ✅ 로그인 완료! 크롤링을 시작합니다.", file=sys.stderr)
        
        # Firestore Progress 업데이트 함수 (Firebase 사용 가능 시에만)
        progress_id = getattr(args, 'progress_id', None) or f"naver_cafe_{int(time.time())}"
        
        def update_progress(current, total, message, status="running", add_log=None):
            if not FIREBASE_AVAILABLE:
                # Firebase 없으면 콘솔에만 출력
                print(f"[Progress] {status}: {message} ({current}/{total})", file=sys.stderr)
                return
            try:
                db = firestore.client()
                doc_ref = db.collection('crawl_progress').document(progress_id)
                
                update_data = {
                    'current': current,
                    'total': total,
                    'message': message,
                    'status': status,
                    'updatedAt': firestore.SERVER_TIMESTAMP
                }
                
                # 로그 추가 (배열에 append)
                if add_log:
                    from datetime import datetime
                    log_entry = {
                        'timestamp': datetime.now().isoformat(),
                        'message': add_log
                    }
                    update_data['logs'] = firestore.ArrayUnion([log_entry])
                
                doc_ref.set(update_data, merge=True)
            except Exception as e:
                print(f"[Progress Update Error] {e}", file=sys.stderr)
        
        # 여러 카페를 순회하면서 limit 개수만큼 수집
        collected_count = 0
        update_progress(0, limit, "🌐 Chrome 브라우저로 카페 접속 중...", "running", add_log="🚀 크롤링 시작")
        
        print(f"[Naver Cafe Crawl] ============================================", file=sys.stderr)
        print(f"[Naver Cafe Crawl] 🎯 목표: {limit}개 게시글 수집", file=sys.stderr)
        print(f"[Naver Cafe Crawl] 📂 순회할 카페: {len(cafe_urls)}개", file=sys.stderr)
        print(f"[Naver Cafe Crawl] ⏰ 날짜 범위: 최근 24시간", file=sys.stderr)
        print(f"[Naver Cafe Crawl] ============================================", file=sys.stderr)
        
        for cafe_idx, cafe_url in enumerate(cafe_urls):
            if collected_count >= limit:
                print(f"\n[Naver Cafe Crawl] ✅ 목표 개수 달성: {collected_count}/{limit}개", file=sys.stderr)
                update_progress(collected_count, limit, f"✅ 목표 개수 달성: {collected_count}개 수집 완료", "completed")
                break
            
            remaining = limit - collected_count
            print(f"\n[Naver Cafe Crawl] ═══════════════════════════════════════════", file=sys.stderr)
            print(f"[Naver Cafe Crawl] 📍 카페 [{cafe_idx+1}/{len(cafe_urls)}]: {cafe_url}", file=sys.stderr)
            print(f"[Naver Cafe Crawl] 🎯 현재: {collected_count}개 / 목표: {limit}개 (남은 개수: {remaining}개)", file=sys.stderr)
            print(f"[Naver Cafe Crawl] ═══════════════════════════════════════════", file=sys.stderr)
            
            update_progress(collected_count, limit, f"📂 [{cafe_idx+1}/{len(cafe_urls)}] 카페 크롤링 중... ({collected_count}/{limit}개 수집)", "running", add_log=f"📂 카페 [{cafe_idx+1}/{len(cafe_urls)}] 접속 중 (남은 개수: {remaining}개)")
            
            # 카페 크롤링 시작 시간 기록
            cafe_start_time = time.time()
            
            # 목록 수집 (키워드 기반)
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
            
            if len(posts_list) == 0:
                print(f"[Naver Cafe Crawl] ⚠️ 이 카페에서 게시글 없음. 다음 카페로 즉시 이동... (딜레이 없음)", file=sys.stderr)
                update_progress(collected_count, limit, f"⚠️ 게시글 없음, 다음 카페로 이동 중...", "running", add_log=f"⚠️ 카페 [{cafe_idx+1}] 게시글 없음")
                # 게시글이 없으면 대기 없이 즉시 다음 카페로
                continue
            
            update_progress(collected_count, limit, f"📝 게시글 {len(posts_list)}개 발견, 상세 수집 중...", "running", add_log=f"📝 카페 [{cafe_idx+1}] 게시글 {len(posts_list)}개 발견")
            
            # 상세 수집 (limit 개수까지만)
            for idx, post_info in enumerate(posts_list):
                if collected_count >= limit:
                    break
                
                post_id = post_info.get('post_id')
                
                # 스마트 재개: 이미 수집된 게시글은 스킵
                if post_id in existing_post_ids:
                    print(f"[Naver Cafe Crawl] 스킵 (이미 수집됨): {post_id}", file=sys.stderr)
                    continue
                
                url = post_info.get('url')
                if not url:
                    continue
                
                # 10개마다 로그인 상태 확인
                if idx > 0 and idx % 10 == 0:
                    print(f"[Naver Cafe Crawl] 로그인 상태 확인 중... ({idx}번째 게시글)", file=sys.stderr)
                    update_progress(collected_count, limit, f"🔐 로그인 상태 확인 중...", "running", add_log=f"🔐 로그인 상태 확인 ({idx}번째)")
                    if not crawler.check_login_status():
                        print(f"[Naver Cafe Crawl] ⚠️ 로그인이 필요합니다. 다시 로그인해주세요.", file=sys.stderr)
                        update_progress(collected_count, limit, f"⚠️ 로그인 필요, 다시 로그인해주세요", "running", add_log=f"⚠️ 로그인 세션 만료, 재로그인 필요")
                        if not crawler.wait_for_login(timeout=300, save_cookies=False):
                            print(f"[Naver Cafe Crawl] ❌ 로그인 실패. 크롤링을 중단합니다.", file=sys.stderr)
                            update_progress(collected_count, limit, f"❌ 로그인 실패", "failed", add_log=f"❌ 로그인 실패로 중단")
                            break
                
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
                    collected_count += 1
                    post_title = merged_post.get('title', '제목 없음')[:30]
                    update_progress(collected_count, limit, f"📝 게시글 수집 중: {collected_count}/{limit}개 (카페 {cafe_idx+1}/{len(cafe_urls)})", "running", add_log=f"✅ 수집: {post_title}... ({collected_count}/{limit})")
                    print(f"[Naver Cafe Crawl] ✅ 수집 진행: {collected_count}/{limit}개", file=sys.stderr)
                    
                    # Rate limiting (성공 시에만 긴 딜레이)
                    time.sleep(random.uniform(2, 4))
                else:
                    # 상세 수집 실패 시 짧은 딜레이
                    time.sleep(0.5)
        
            # 카페별 수집 결과 체크
            cafe_collected = len([p for p in all_posts if p.get('cafe_url') == cafe_url])
            cafe_elapsed = time.time() - cafe_start_time
            
            print(f"\n[Naver Cafe Crawl] 📊 카페 [{cafe_idx+1}/{len(cafe_urls)}] 결과:", file=sys.stderr)
            if cafe_collected == 0:
                print(f"[Naver Cafe Crawl]   ⚠️ 수집 실패: 0개 (소요: {cafe_elapsed:.1f}초)", file=sys.stderr)
                print(f"[Naver Cafe Crawl]   🚀 다음 카페로 즉시 이동...", file=sys.stderr)
                update_progress(collected_count, limit, f"🚀 다음 카페로 이동 중...", "running", add_log=f"📊 카페 [{cafe_idx+1}] 완료: 0개")
                # 수집 실패 시 대기 없이 다음 카페로
            else:
                print(f"[Naver Cafe Crawl]   ✅ 수집 성공: {cafe_collected}개 (소요: {cafe_elapsed:.1f}초)", file=sys.stderr)
                print(f"[Naver Cafe Crawl]   📈 누적: {collected_count}/{limit}개", file=sys.stderr)
                update_progress(collected_count, limit, f"📊 누적: {collected_count}/{limit}개", "running", add_log=f"📊 카페 [{cafe_idx+1}] 완료: {cafe_collected}개 수집 ({cafe_elapsed:.1f}초)")
                # 수집 성공 시 다음 카페로 넘어가기 전 짧은 대기
                time.sleep(1)
            
            # 아직 목표에 도달하지 못했으면 계속 진행
            if collected_count < limit and cafe_idx < len(cafe_urls) - 1:
                print(f"[Naver Cafe Crawl] 🔄 목표 미달성 → 다음 카페로 계속...", file=sys.stderr)
        
        # 크롤링 완료 진행 상황 업데이트
        print(f"\n[Naver Cafe Crawl] ============================================", file=sys.stderr)
        print(f"[Naver Cafe Crawl] 🏁 크롤링 완료", file=sys.stderr)
        print(f"[Naver Cafe Crawl] 📊 최종 결과: {collected_count}/{limit}개 수집", file=sys.stderr)
        print(f"[Naver Cafe Crawl] 📂 순회한 카페: {min(cafe_idx + 1, len(cafe_urls))}/{len(cafe_urls)}개", file=sys.stderr)
        print(f"[Naver Cafe Crawl] ============================================", file=sys.stderr)
        
        if collected_count >= limit:
            update_progress(collected_count, limit, f"✅ 목표 달성: {collected_count}개 수집 완료", "completed", add_log=f"🏁 크롤링 완료: {collected_count}개 수집 성공")
        else:
            update_progress(collected_count, limit, f"⚠️ 목표 미달: {collected_count}/{limit}개 수집 (모든 카페 순회 완료)", "completed", add_log=f"🏁 크롤링 완료: {collected_count}/{limit}개 수집")
        
        return {
            "success": True,
            "posts": all_posts,
            "total": len(all_posts)
        }
        
    except Exception as e:
        import traceback
        print(f"[Naver Cafe Crawl] 오류: {e}", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        
        # 실패 진행 상황 업데이트 (Firebase 사용 가능 시에만)
        if FIREBASE_AVAILABLE:
            try:
                db = firestore.client()
                progress_id = getattr(args, 'progress_id', None) or f"naver_cafe_{int(time.time())}"
                db.collection('crawl_progress').document(progress_id).set({
                    'status': 'failed',
                    'message': f"❌ 오류 발생: {str(e)}",
                    'updatedAt': firestore.SERVER_TIMESTAMP
                }, merge=True)
            except:
                pass
        
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
            
        crawler = CommunityCrawler()
        analyzer = GeminiAnalyzer(gemini_key)
        
        # 파라미터 받기
        limit = int(getattr(args, 'limit', 30))
        selected_show_ids = getattr(args, 'selected_show_ids', '')
        start_date_str = getattr(args, 'start_date', None)
        end_date_str = getattr(args, 'end_date', None)
        
        # 날짜 범위 설정
        from datetime import datetime
        if start_date_str:
            start_date = datetime.fromisoformat(start_date_str)
        else:
            start_date = datetime.now() - timedelta(days=1)  # 기본값: 1일 전
        
        if end_date_str:
            end_date = datetime.fromisoformat(end_date_str)
        else:
            end_date = datetime.now()
        
        print(f"[Community Crawl] 날짜 범위: {start_date.strftime('%Y-%m-%d')} ~ {end_date.strftime('%Y-%m-%d')}", file=sys.stderr)
        
        # 전체 프로그램 키워드 맵
        all_program_keywords = {
            "nasolo": {"showId": "nasolo", "keywords": ["나는솔로", "나솔", "남규홍"]},
            "choegang-yagu-2025": {"showId": "choegang-yagu-2025", "keywords": ["최강야구", "몬스터즈", "김성근"]},
            "nasolsagye": {"showId": "nasolsagye", "keywords": ["나솔사계", "사랑은 계속된다"]},
            "dolsingles6": {"showId": "dolsingles6", "keywords": ["돌싱글즈", "돌싱"]},
            "hwanseung4": {"showId": "hwanseung4", "keywords": ["환승연애", "환연"]},
            "solojihuk5": {"showId": "solojihuk5", "keywords": ["솔로지옥"]},
            "culinary-class-wars2": {"showId": "culinary-class-wars2", "keywords": ["흑백요리사", "안성재", "백종원"]},
            "goal-girls-8": {"showId": "goal-girls-8", "keywords": ["골때녀", "골 때리는 그녀들"]}
        }
        
        # 선택된 프로그램만 필터링
        if selected_show_ids:
            selected_ids = [sid.strip() for sid in selected_show_ids.split(',') if sid.strip()]
            program_keywords = [all_program_keywords[sid] for sid in selected_ids if sid in all_program_keywords]
            print(f"[Community Crawl] 선택된 프로그램: {len(program_keywords)}개", file=sys.stderr)
        else:
            # 기본값: 모든 프로그램
            program_keywords = list(all_program_keywords.values())
            print(f"[Community Crawl] 전체 프로그램 크롤링: {len(program_keywords)}개", file=sys.stderr)
        
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
                
            posts = crawler.get_hot_posts(show_id, kws, limit=remaining_limit)
            
            for post in posts:
                # limit에 도달하면 중단
                if len(all_results) >= limit:
                    reached_limit = True
                    break
                    
                # AI 댓글 생성
                comment = analyzer.generate_viral_comment(post.get('content', ''), post.get('title', ''))
                post['suggestedComment'] = comment
                all_results.append(post)
                
        # 조회수 순으로 정렬하여 상위 결과 반환
        all_results.sort(key=lambda x: x.get('viewCount', 0), reverse=True)
        
        return {
            "success": True,
            "posts": all_results[:limit] # limit만큼만 반환
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

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
