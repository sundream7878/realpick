#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
네이버 카페 크롤링 테스트 스크립트
"""

import sys
import os
from pathlib import Path

# 프로젝트 루트 경로 추가
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# .env 파일 로드
from dotenv import load_dotenv
env_path = project_root / '.env.local'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

from modules.naver_cafe_crawler import NaverCafeCrawler
from datetime import datetime, timedelta

def test_naver_cafe_crawl():
    """네이버 카페 크롤링 테스트"""
    print("=" * 60)
    print("네이버 카페 크롤링 테스트")
    print("=" * 60)
    
    # 테스트 카페 URL 3개
    cafes = [
        {"id": "no1sejong", "name": "세종맘카페", "url": "https://cafe.naver.com/no1sejong"},
        {"id": "chengnamomlife", "name": "달콤한 청라맘스", "url": "https://cafe.naver.com/chengnamomlife"},
        {"id": "2008bunsamo", "name": "분따 (분당.판교.위례)", "url": "https://cafe.naver.com/2008bunsamo"}
    ]
    
    # 날짜 범위 (최근 30일 - 테스트용)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)  # 30일 전
    
    # 리얼픽 현재 운영 프로그램 키워드
    keywords = [
        "나는솔로", "나솔",
        "최강야구", "몬스터즈",
        "나솔사계",
        "돌싱글즈", "돌싱",
        "환승연애", "환연",
        "솔로지옥",
        "흑백요리사", "안성재", "백종원",
        "골때녀", "골 때리는 그녀들"
    ]
    
    print(f"\n📌 테스트 설정:")
    print(f"  카페 수: {len(cafes)}개")
    for cafe in cafes:
        print(f"    - {cafe['name']}: {cafe['url']}")
    print(f"  키워드 수: {len(keywords)}개")
    print(f"  키워드: {', '.join(keywords[:5])}... (총 {len(keywords)}개)")
    print(f"  시작 시간: {start_date.strftime('%Y-%m-%d %H:%M')} (30일 전)")
    print(f"  종료 시간: {end_date.strftime('%Y-%m-%d %H:%M')} (현재)")
    print(f"  최대 페이지: 2 (테스트용)")
    
    print(f"\n🚀 전문가 검증 3단계 날짜 추출 전략:")
    print(f"  1️⃣ API 우선: 네이버 Article API로 날짜/본문 확보")
    print(f"  2️⃣ 상세 페이지: PC 표준 URL + iframe + 다중 셀렉터")
    print(f"  3️⃣ 정규식 Fallback: 9가지 날짜 패턴 (시간 정보 포함)")
    
    # 크롤러 생성
    crawler = NaverCafeCrawler(headless=False, visible=True)
    
    try:
        # 1. 브라우저 시작
        print(f"\n🚀 1단계: 브라우저 시작...")
        if not crawler.start_browser():
            print("❌ 브라우저 시작 실패")
            return
        
        # 2. 로그인 대기
        print(f"\n⏳ 2단계: 네이버 로그인 대기 중...")
        print("   브라우저가 열렸습니다. 네이버에 로그인해주세요.")
        print("   로그인 완료 후 자동으로 진행됩니다...")
        
        if not crawler.wait_for_login(timeout=300):
            print("❌ 로그인 대기 시간 초과")
            crawler.close()
            return
        
        print("✅ 로그인 완료!")
        
        # 3. URL 정규화 테스트
        print(f"\n🔧 3단계: URL 정규화 테스트...")
        test_urls = [
            "https://cafe.naver.com/f-e/cafes/123456/articles/789012",
            "https://cafe.naver.com/ca-fe/web/articles/123456/789012",
            "https://cafe.naver.com/ArticleRead.nhn?clubid=123456&articleid=789012"
        ]
        
        for url in test_urls:
            normalized = crawler.normalize_article_url(url)
            print(f"  원본: {url[:60]}...")
            print(f"  정규화: {normalized}")
        
        # 4. 목록 수집 테스트 (3개 카페 순회)
        print(f"\n📋 4단계: 게시글 목록 수집 테스트 (3개 카페, 2페이지)")
        print(f"   키워드: {', '.join(keywords[:3])}... (총 {len(keywords)}개)")
        
        all_posts = []
        for cafe_idx, cafe in enumerate(cafes, 1):
            print(f"\n🏠 카페 {cafe_idx}/{len(cafes)}: {cafe['name']}")
            print(f"   URL: {cafe['url']}")
            
            posts_list = crawler.crawl_article_list(
                cafe_url=cafe['url'],
                keywords=keywords,
                start_date=start_date,
                end_date=end_date,
                exclude_boards=["먹거리", "맛집", "프리마켓"],
                max_pages=2
            )
            
            all_posts.extend(posts_list)
            print(f"   ✅ {cafe['name']}: {len(posts_list)}개 수집")
        
        print(f"\n✅ 전체 수집 완료: {len(all_posts)}개 게시글")
        
        if all_posts:
            print(f"\n📝 수집된 게시글 샘플 (최대 3개):")
            for i, post in enumerate(all_posts[:3], 1):
                print(f"\n{'='*80}")
                print(f"[{i}] 제목: {post.get('title', 'N/A')}")
                print(f"{'='*80}")
                print(f"카페: {post.get('cafe_url', 'N/A').split('/')[-1]}")
                print(f"날짜: {post.get('date', 'N/A')}")
                print(f"조회수: {post.get('viewCount', 0)}")
                print(f"댓글수: {post.get('commentCount', len(post.get('comments', [])))}")
                print(f"작성자: {post.get('nickname', 'N/A')}")
                print(f"게시판: {post.get('board_name', 'N/A')}")
                print(f"\n📄 본문 내용:")
                print(f"{'-'*80}")
                content = post.get('content', '')
                if content:
                    # 본문 내용 출력 (최대 500자까지)
                    if len(content) > 500:
                        print(content[:500] + f"\n... (총 {len(content)}자)")
                    else:
                        print(content)
                else:
                    print("(본문 없음)")
                print(f"{'-'*80}")
        
        # 5. 상세 수집 여부 확인
        has_content = any(post.get('content') and len(post.get('content', '')) > 100 for post in all_posts)
        if has_content:
            print(f"\n✅ 상세 정보(본문) 수집 완료: 일부 게시글에 본문 포함")
        else:
            print(f"\n⚠️ 상세 정보 없음: 날짜만 수집됨")
        
        print(f"\n✅ 테스트 완료!")
        print(f"\n📊 수집 요약:")
        print(f"   - 카페 수: {len(cafes)}개")
        print(f"   - 키워드 수: {len(keywords)}개")
        print(f"   - 수집된 게시글: {len(all_posts)}개")
        if all_posts:
            # 카페별 통계
            cafe_stats = {}
            for post in all_posts:
                cafe_id = post.get('cafe_url', '').split('/')[-1]
                cafe_stats[cafe_id] = cafe_stats.get(cafe_id, 0) + 1
            
            print(f"   - 카페별:")
            for cafe_id, count in cafe_stats.items():
                cafe_name = next((c['name'] for c in cafes if cafe_id in c['url']), cafe_id)
                print(f"     • {cafe_name}: {count}개")
        
        print(f"\n💡 다음 단계:")
        print(f"   1. 전체 크롤링을 원하면 max_pages를 늘리세요")
        print(f"   2. 더 많은 카페를 추가하려면 cafes 리스트를 수정하세요")
        print(f"   3. API를 통해 크롤링하려면 /api/admin/marketer/naver-cafe/crawl 사용")
        
    except KeyboardInterrupt:
        print(f"\n\n⚠️ 사용자에 의해 중단되었습니다.")
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # 브라우저 종료
        print(f"\n🔒 브라우저 종료 중...")
        crawler.close()
        print(f"✅ 완료")

if __name__ == "__main__":
    test_naver_cafe_crawl()
