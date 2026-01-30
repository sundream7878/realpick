import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
from typing import List, Dict

class CommunityCrawler:
    """대한민국 주요 커뮤니티 크롤러"""
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        # 프로그램별/카테고리별 타겟 커뮤니티 매핑
        self.target_sites = {
            'dcinside': '디시인사이드',
            'fmkorea': '에펨코리아',
            'theqoo': '더쿠',
            'ruliweb': '루리웹',
            'arcalive': '아카라이브',
            'mlbpark': '엠팍',
            'ppomppu': '뽐뿌',
            'inven': '인벤',
            'nate': '네이트판',
            'clien': '클리앙'
        }

    def get_community_search_url(self, site: str, keyword: str) -> str:
        """커뮤니티별 검색 URL 생성"""
        urls = {
            'dcinside': f"https://search.dcinside.com/combine/q/{keyword}",
            'fmkorea': f"https://www.fmkorea.com/search.php?mid=home&search_keyword={keyword}",
            'theqoo': f"https://theqoo.net/index.php?mid=home&search_keyword={keyword}",
            'nate': f"https://pann.nate.com/search/pann?q={keyword}",
            'mlbpark': f"https://mlbpark.donga.com/mp/b.php?searchSelect=s&searchKeyword={keyword}",
            'ppomppu': f"https://www.ppomppu.co.kr/search_bbs.php?search_type=sub_memo&keyword={keyword}",
            'clien': f"https://www.clien.net/service/search?q={keyword}",
            'ruliweb': f"https://m.ruliweb.com/search?q={keyword}",
            'inven': f"https://www.inven.co.kr/search/web/q/{keyword}",
            'arcalive': f"https://arca.live/b/search?q={keyword}"
        }
        return urls.get(site, "")

    def get_hot_posts(self, show_id: str, keywords: List[str]) -> List[Dict]:
        """주요 커뮤니티에서 프로그램 관련 핫게시물 수집"""
        all_posts = []
        
        # 실제 구현 시에는 각 사이트별 BeautifulSoup 파싱 로직이 들어갑니다.
        # 현재는 구조적 설계를 위해 각 사이트별 검색 결과 객체를 생성하는 예시입니다.
        for site_id, site_name in self.target_sites.items():
            for kw in keywords:
                search_url = self.get_community_search_url(site_id, kw)
                if not search_url: continue
                
                # 임시 데이터 구조 (실제 크롤링 시 제목뿐만 아니라 본문 내용도 파싱)
                # 게시 날짜(publishedAt) 필드 추가
                all_posts.append({
                    'id': f"{site_id}_{datetime.now().timestamp()}",
                    'source': site_id,
                    'sourceName': site_name,
                    'title': f"[{kw}] 관련 커뮤니티 인기글",
                    'content': f"본문 내용 분석: {kw} 방송의 이번 회차에서 발생한 논란과 유저들의 실시간 반응을 포함한 상세 본문 텍스트입니다. 제목보다 본문의 맥락이 바이럴 댓글 생성에 더 중요하게 작용합니다.",
                    'url': search_url,
                    'viewCount': 1000,
                    'commentCount': 50,
                    'showId': show_id,
                    'publishedAt': datetime.now().isoformat(),
                    'createdAt': datetime.now().isoformat()
                })
        
        return all_posts
