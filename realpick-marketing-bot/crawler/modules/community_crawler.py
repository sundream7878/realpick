import requests
from bs4 import BeautifulSoup
import json
import sys
import time
import re
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class CommunityCrawler:
    """대한민국 주요 커뮤니티 크롤러 - 맘카페 중심"""
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        # 프로그램별/카테고리별 타겟 커뮤니티 매핑
        # 맘카페가 핵심 타겟 커뮤니티
        self.target_sites = {
            'mamacafe': '맘카페',  # 핵심 타겟
            '82cook': '82쿡',  # 요리 커뮤니티
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

        # 맘카페 리스트 로드
        self.mamacafe_list = self._load_mamacafe_list()
    
    def _load_mamacafe_list(self) -> List[Dict]:
        """맘카페 리스트 로드 (Firestore 우선, 없으면 JSON 파일)"""
        # 1순위: Firestore에서 로드 시도
        try:
            from modules.firebase_manager import FirebaseManager
            fb_manager = FirebaseManager()
            if fb_manager.db:
                cafes_ref = fb_manager.db.collection('mamacafe_list')
                docs = cafes_ref.stream()
                cafes = []
                for doc in docs:
                    cafe_data = doc.to_dict()
                    if cafe_data:
                        cafes.append({
                            'id': doc.id,
                            'name': cafe_data.get('name', ''),
                            'url': cafe_data.get('url', ''),
                            'region': cafe_data.get('region', '')
                        })
                if cafes:
                    print(f"[Community Crawler] 맘카페 리스트 Firestore에서 로드 완료: {len(cafes)}개 카페", file=sys.stderr)
                    return cafes
        except Exception as e:
            print(f"[Community Crawler] Firestore 로드 실패, JSON 파일 시도: {e}", file=sys.stderr)
        
        # 2순위: JSON 파일에서 로드
        try:
            # 여러 경로 시도
            possible_paths = [
                os.path.join(os.path.dirname(__file__), '..', 'config', 'mamacafe_list.json'),
                os.path.join(os.getcwd(), 'scripts', 'marketing', 'config', 'mamacafe_list.json'),
                os.path.join(os.path.dirname(__file__), '..', '..', 'config', 'mamacafe_list.json'),
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    with open(path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        print(f"[Community Crawler] 맘카페 리스트 JSON 파일에서 로드 완료: {len(data)}개 카페", file=sys.stderr)
                        return data
            
            print(f"[Community Crawler] ⚠️ 맘카페 리스트 파일을 찾을 수 없습니다. 기본 검색 모드로 동작합니다.", file=sys.stderr)
            return []
        except Exception as e:
            print(f"[Community Crawler] 맘카페 리스트 로드 오류: {e}", file=sys.stderr)
            return []

    def get_community_search_url(self, site: str, keyword: str, cafe_id: str = None) -> str:
        """커뮤니티별 검색 URL 생성
        
        Args:
            site: 사이트 ID
            keyword: 검색 키워드
            cafe_id: 맘카페 ID (맘카페인 경우)
        """
        if site == 'mamacafe' and cafe_id:
            # 특정 맘카페 내 검색
            return f"https://cafe.naver.com/{cafe_id}?iframe_url=/ArticleSearchList.nhn%3Fsearch.clubid={cafe_id}%26search.searchBy=0%26search.query={keyword}%26search.sortBy=date"
        elif site == 'mamacafe':
            # 전체 맘카페 검색 (모바일)
            return f"https://m.cafe.naver.com/ca-fe/web/search/articles?q={keyword}&searchBy=0&sortBy=date&page=1"
        
        urls = {
            '82cook': f"https://www.82cook.com/entiz/enti.php?bn=15&search={keyword}",
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

    def parse_published_date(self, soup: BeautifulSoup, site_id: str, post_url: str) -> Optional[datetime]:
        """게시글 작성일 파싱 (오늘 기준 2일 이내 확인용)"""
        try:
            if site_id == 'dcinside':
                # 디시인사이드 날짜 파싱
                date_elem = soup.select_one('.gall_date, .date, time[datetime]')
                if date_elem:
                    date_text = date_elem.get_text(strip=True) or date_elem.get('datetime', '')
                    # "2024.01.15 12:34:56" 형식
                    date_match = re.search(r'(\d{4})\.(\d{2})\.(\d{2})', date_text)
                    if date_match:
                        year, month, day = map(int, date_match.groups())
                        return datetime(year, month, day)
            elif site_id == 'fmkorea':
                # 에펨코리아 날짜 파싱
                date_elem = soup.select_one('.date, .time, time[datetime]')
                if date_elem:
                    date_text = date_elem.get_text(strip=True) or date_elem.get('datetime', '')
                    # "2024-01-15 12:34" 또는 "01-15 12:34" 형식
                    date_match = re.search(r'(\d{4})-(\d{2})-(\d{2})', date_text)
                    if date_match:
                        year, month, day = map(int, date_match.groups())
                        return datetime(year, month, day)
                    # 올해인 경우 년도 생략 가능
                    date_match = re.search(r'(\d{2})-(\d{2})', date_text)
                    if date_match:
                        month, day = map(int, date_match.groups())
                        now = datetime.now()
                        return datetime(now.year, month, day)
            elif site_id == 'theqoo':
                # 더쿠 날짜 파싱
                date_elem = soup.select_one('.date, .time, time[datetime]')
                if date_elem:
                    date_text = date_elem.get_text(strip=True) or date_elem.get('datetime', '')
                    date_match = re.search(r'(\d{4})\.(\d{2})\.(\d{2})', date_text)
                    if date_match:
                        year, month, day = map(int, date_match.groups())
                        return datetime(year, month, day)
            elif site_id == 'clien':
                # 클리앙 날짜 파싱
                date_elem = soup.select_one('.timestamp, .date, time[datetime]')
                if date_elem:
                    date_text = date_elem.get_text(strip=True) or date_elem.get('datetime', '')
                    date_match = re.search(r'(\d{4})-(\d{2})-(\d{2})', date_text)
                    if date_match:
                        year, month, day = map(int, date_match.groups())
                        return datetime(year, month, day)
            elif site_id == 'nate':
                # 네이트판 날짜 파싱
                date_elem = soup.select_one('.date, .time, time[datetime]')
                if date_elem:
                    date_text = date_elem.get_text(strip=True) or date_elem.get('datetime', '')
                    date_match = re.search(r'(\d{4})\.(\d{2})\.(\d{2})', date_text)
                    if date_match:
                        year, month, day = map(int, date_match.groups())
                        return datetime(year, month, day)
            elif site_id == 'mamacafe':
                # 맘카페 날짜 파싱 (네이버 카페 형식)
                date_elem = soup.select_one('.date, .time, time[datetime], .article_date, .date_text')
                if date_elem:
                    date_text = date_elem.get_text(strip=True) or date_elem.get('datetime', '')
                    # "2024.01.15" 또는 "2024-01-15" 형식
                    date_match = re.search(r'(\d{4})[\.\-](\d{2})[\.\-](\d{2})', date_text)
                    if date_match:
                        year, month, day = map(int, date_match.groups())
                        return datetime(year, month, day)
                    # "01.15" 형식 (올해)
                    date_match = re.search(r'(\d{2})[\.\-](\d{2})', date_text)
                    if date_match:
                        month, day = map(int, date_match.groups())
                        now = datetime.now()
                        return datetime(now.year, month, day)
            elif site_id == '82cook':
                # 82쿡 날짜 파싱
                date_elem = soup.select_one('.date, .time, time[datetime], .post_date, .write_date')
                if date_elem:
                    date_text = date_elem.get_text(strip=True) or date_elem.get('datetime', '')
                    # "2024.01.15" 또는 "2024-01-15" 형식
                    date_match = re.search(r'(\d{4})[\.\-](\d{2})[\.\-](\d{2})', date_text)
                    if date_match:
                        year, month, day = map(int, date_match.groups())
                        return datetime(year, month, day)
                    # "01.15" 형식 (올해)
                    date_match = re.search(r'(\d{2})[\.\-](\d{2})', date_text)
                    if date_match:
                        month, day = map(int, date_match.groups())
                        now = datetime.now()
                        return datetime(now.year, month, day)
            
            # 파싱 실패 시 None 반환 (필터링에서 제외하지 않음)
            return None
        except Exception as e:
            print(f"[Community Crawler] 날짜 파싱 오류 ({site_id}): {e}", file=sys.stderr)
            return None

    def parse_view_and_comment_count(self, soup: BeautifulSoup, site_id: str) -> Dict[str, int]:
        """사이트별 조회수와 댓글 수 파싱"""
        view_count = 0
        comment_count = 0
        
        try:
            if site_id == 'dcinside':
                # 디시인사이드 조회수/댓글 파싱
                view_elem = soup.select_one('.gall_count, .view_count, span[class*="view"]')
                if view_elem:
                    view_text = view_elem.get_text(strip=True)
                    # 숫자만 추출
                    view_match = re.search(r'(\d+)', view_text.replace(',', ''))
                    if view_match:
                        view_count = int(view_match.group(1))
                
                comment_elem = soup.select_one('.reply_num, .comment_count, span[class*="reply"]')
                if comment_elem:
                    comment_text = comment_elem.get_text(strip=True)
                    comment_match = re.search(r'(\d+)', comment_text.replace(',', ''))
                    if comment_match:
                        comment_count = int(comment_match.group(1))
                        
            elif site_id == 'fmkorea':
                # 에펨코리아 조회수/댓글 파싱
                view_elem = soup.select_one('.view_count, .hit, span[class*="view"]')
                if view_elem:
                    view_text = view_elem.get_text(strip=True)
                    view_match = re.search(r'(\d+)', view_text.replace(',', ''))
                    if view_match:
                        view_count = int(view_match.group(1))
                
                comment_elem = soup.select_one('.comment_count, .reply_count, span[class*="comment"]')
                if comment_elem:
                    comment_text = comment_elem.get_text(strip=True)
                    comment_match = re.search(r'(\d+)', comment_text.replace(',', ''))
                    if comment_match:
                        comment_count = int(comment_match.group(1))
                        
            elif site_id == 'theqoo':
                # 더쿠 조회수/댓글 파싱
                view_elem = soup.select_one('.view_count, .hit, span[class*="view"]')
                if view_elem:
                    view_text = view_elem.get_text(strip=True)
                    view_match = re.search(r'(\d+)', view_text.replace(',', ''))
                    if view_match:
                        view_count = int(view_match.group(1))
                
                comment_elem = soup.select_one('.comment_count, .reply_count')
                if comment_elem:
                    comment_text = comment_elem.get_text(strip=True)
                    comment_match = re.search(r'(\d+)', comment_text.replace(',', ''))
                    if comment_match:
                        comment_count = int(comment_match.group(1))
                        
            elif site_id == 'clien':
                # 클리앙 조회수/댓글 파싱
                view_elem = soup.select_one('.view_count, .hit_count, span[class*="view"]')
                if view_elem:
                    view_text = view_elem.get_text(strip=True)
                    view_match = re.search(r'(\d+)', view_text.replace(',', ''))
                    if view_match:
                        view_count = int(view_match.group(1))
                
                comment_elem = soup.select_one('.comment_count, .reply_count')
                if comment_elem:
                    comment_text = comment_elem.get_text(strip=True)
                    comment_match = re.search(r'(\d+)', comment_text.replace(',', ''))
                    if comment_match:
                        comment_count = int(comment_match.group(1))
                        
            elif site_id == 'nate':
                # 네이트판 조회수/댓글 파싱
                view_elem = soup.select_one('.view_count, .hit, span[class*="view"]')
                if view_elem:
                    view_text = view_elem.get_text(strip=True)
                    view_match = re.search(r'(\d+)', view_text.replace(',', ''))
                    if view_match:
                        view_count = int(view_match.group(1))
                
                comment_elem = soup.select_one('.comment_count, .reply_count')
                if comment_elem:
                    comment_text = comment_elem.get_text(strip=True)
                    comment_match = re.search(r'(\d+)', comment_text.replace(',', ''))
                    if comment_match:
                        comment_count = int(comment_match.group(1))
            elif site_id == '82cook':
                # 82쿡 조회수/댓글 파싱
                view_elem = soup.select_one('.view_count, .hit, .read_count, span[class*="view"]')
                if view_elem:
                    view_text = view_elem.get_text(strip=True)
                    view_match = re.search(r'(\d+)', view_text.replace(',', ''))
                    if view_match:
                        view_count = int(view_match.group(1))
                
                comment_elem = soup.select_one('.comment_count, .reply_count, .cmt_count')
                if comment_elem:
                    comment_text = comment_elem.get_text(strip=True)
                    comment_match = re.search(r'(\d+)', comment_text.replace(',', ''))
                    if comment_match:
                        comment_count = int(comment_match.group(1))
            elif site_id == 'mamacafe':
                # 맘카페 조회수/댓글 파싱 (네이버 카페 형식)
                view_elem = soup.select_one('.view_count, .hit, .article_count, span[class*="view"], span[class*="count"]')
                if view_elem:
                    view_text = view_elem.get_text(strip=True)
                    view_match = re.search(r'(\d+)', view_text.replace(',', ''))
                    if view_match:
                        view_count = int(view_match.group(1))
                
                comment_elem = soup.select_one('.comment_count, .reply_count, .comment_cnt, span[class*="comment"], span[class*="reply"]')
                if comment_elem:
                    comment_text = comment_elem.get_text(strip=True)
                    comment_match = re.search(r'(\d+)', comment_text.replace(',', ''))
                    if comment_match:
                        comment_count = int(comment_match.group(1))
                        
        except Exception as e:
            print(f"[Community Crawler] 조회수/댓글 파싱 오류 ({site_id}): {e}", file=sys.stderr)
        
        return {'viewCount': view_count, 'commentCount': comment_count}

    def fetch_post_content(self, post_url: str, site_id: str) -> Dict:
        """게시글 URL에서 실제 본문 내용, 조회수, 댓글 수, 작성일 크롤링"""
        try:
            response = requests.get(post_url, headers=self.headers, timeout=10)
            response.encoding = 'utf-8'
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 사이트별 본문 선택자 (주요 사이트만 구현)
            content_selectors = {
                'mamacafe': ['.article_viewer', '.se-main-container', '.article_body', '.view_content', '.content'],
                '82cook': ['.content_view', '.post_content', '.article_content', '.content'],
                'dcinside': ['div.view_content_wrap', 'div.view_content', '.writing_view_box'],
                'fmkorea': ['.xe_content', '.content_wrapper', '.content'],
                'theqoo': ['.xe_content', '.content', 'div[class*="content"]'],
                'clien': ['.post_content', '.content_view', '.post-view'],
                'nate': ['.view_content', '.content', 'div[class*="content"]'],
            }
            
            content_text = ""
            selectors = content_selectors.get(site_id, ['.content', 'article', 'main'])
            
            for selector in selectors:
                content_elem = soup.select_one(selector)
                if content_elem:
                    # 스크립트와 스타일 태그 제거
                    for script in content_elem(["script", "style"]):
                        script.decompose()
                    content_text = content_elem.get_text(separator=' ', strip=True)
                    if len(content_text) > 100:  # 충분한 내용이 있으면 중단
                        break
            
            # 조회수와 댓글 수 파싱
            stats = self.parse_view_and_comment_count(soup, site_id)
            
            # 작성일 파싱
            published_date = self.parse_published_date(soup, site_id, post_url)
            
            return {
                'content': content_text[:2000] if content_text else "",  # 최대 2000자
                'success': len(content_text) > 50,
                'viewCount': stats['viewCount'],
                'commentCount': stats['commentCount'],
                'publishedDate': published_date.isoformat() if published_date else None
            }
        except Exception as e:
            print(f"[Community Crawler] 게시글 본문 크롤링 실패 ({post_url}): {e}", file=sys.stderr)
            return {'content': '', 'success': False, 'viewCount': 0, 'commentCount': 0, 'publishedDate': None}

    def is_relevant_post(self, title: str, content: str, keywords: List[str]) -> bool:
        """게시글이 키워드와 관련이 있는지 확인"""
        if not title or not content:
            return False
        
        # 제목과 본문을 합쳐서 검색
        combined_text = (title + " " + content).lower()
        
        # 키워드 중 하나라도 포함되어 있으면 관련 게시글
        for keyword in keywords:
            if keyword.lower() in combined_text:
                return True
        
        return False

    def get_hot_posts(self, show_id: str, keywords: List[str], limit: int = 10) -> List[Dict]:
        """주요 커뮤니티에서 프로그램 관련 핫게시물 수집 (실제 크롤링)
        오늘 기준 2일 이내 게시글만 수집"""
        all_posts = []
        
        # 오늘 기준 2일 전 날짜 계산
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        two_days_ago = today - timedelta(days=2)
        
        # 실제 크롤링 가능한 사이트만 선택 (맘카페가 핵심)
        crawlable_sites = ['mamacafe', '82cook', 'dcinside', 'fmkorea', 'theqoo', 'clien', 'nate']
        
        # 맘카페 우선 크롤링 (각 맘카페별로 검색)
        if 'mamacafe' in crawlable_sites and self.mamacafe_list:
            print(f"[Community Crawler] 맘카페 크롤링 시작: {len(self.mamacafe_list)}개 카페", file=sys.stderr)
            
            # 각 맘카페별로 키워드 검색
            for cafe in self.mamacafe_list:
                if len(all_posts) >= limit:
                    break
                
                cafe_id = cafe.get('id')
                cafe_name = cafe.get('name', '')
                
                for kw in keywords:
                    if len(all_posts) >= limit:
                        break
                    
                    # 특정 맘카페 내 검색
                    search_url = self.get_community_search_url('mamacafe', kw, cafe_id)
                    if not search_url:
                        continue
                    
                    try:
                        print(f"[Community Crawler] {cafe_name}에서 '{kw}' 검색 중...", file=sys.stderr)
                        
                        # 검색 결과 페이지 크롤링
                        response = requests.get(search_url, headers=self.headers, timeout=10)
                        response.encoding = 'utf-8'
                        soup = BeautifulSoup(response.text, 'html.parser')
                        
                        # 네이버 카페 검색 결과 파싱
                        post_links = []
                        for link in soup.select('a[href*="/ArticleRead.nhn"], a[href*="/article/"], .article_item a, .search_item a, .article-board a')[:5]:
                            href = link.get('href', '')
                            if href:
                                if href.startswith('/'):
                                    href = f"https://cafe.naver.com{href}"
                                elif not href.startswith('http'):
                                    href = f"https://cafe.naver.com/{cafe_id}{href}"
                                title = link.get_text(strip=True) or link.get('title', '')
                                if title and href and '/ArticleRead.nhn' in href:
                                    post_links.append((href, title))
                        
                        # 각 게시글의 본문 크롤링 및 필터링
                        for post_url, title in post_links:
                            if len(all_posts) >= limit:
                                break
                            
                            if not post_url or not title:
                                continue
                            
                            # 제목에서 키워드 확인
                            if not any(kw.lower() in title.lower() for kw in keywords):
                                continue
                            
                            # 본문 크롤링
                            content_data = self.fetch_post_content(post_url, 'mamacafe')
                            
                            if not content_data['success'] or not content_data['content']:
                                continue
                            
                            # 작성일 확인: 오늘 기준 2일 이내인지 체크
                            if content_data.get('publishedDate'):
                                try:
                                    published_date = datetime.fromisoformat(content_data['publishedDate'].replace('Z', '+00:00'))
                                    published_date = published_date.replace(tzinfo=None)
                                    if published_date < two_days_ago:
                                        continue
                                except Exception:
                                    pass
                            
                            # 본문에서도 키워드 확인
                            if not self.is_relevant_post(title, content_data['content'], keywords):
                                continue
                            
                            # 관련 있는 게시글만 추가
                            published_at = content_data.get('publishedDate') or datetime.now().isoformat()
                            all_posts.append({
                                'id': f"mamacafe_{cafe_id}_{int(time.time())}",
                                'source': 'mamacafe',
                                'sourceName': cafe_name,
                                'title': title[:200],
                                'content': content_data['content'],
                                'url': post_url,
                                'viewCount': content_data.get('viewCount', 0),
                                'commentCount': content_data.get('commentCount', 0),
                                'showId': show_id,
                                'publishedAt': published_at,
                                'createdAt': datetime.now().isoformat()
                            })
                            
                            print(f"[Community Crawler] ✅ 맘카페 게시글 수집: {cafe_name} - {title[:50]}...", file=sys.stderr)
                            
                            # Rate limiting
                            time.sleep(1)
                    
                    except Exception as e:
                        print(f"[Community Crawler] {cafe_name} 크롤링 오류: {e}", file=sys.stderr)
                        continue
                    
                    # 카페 간 딜레이
                    time.sleep(0.5)
        
        # 기타 커뮤니티 크롤링 (맘카페가 limit에 도달하지 않은 경우)
        for site_id, site_name in self.target_sites.items():
            if site_id not in crawlable_sites or site_id == 'mamacafe':
                continue
            
            if len(all_posts) >= limit:
                break
                
            for kw in keywords:
                if len(all_posts) >= limit:
                    break
                    
                search_url = self.get_community_search_url(site_id, kw)
                if not search_url: 
                    continue
                
                try:
                    # 검색 결과 페이지 크롤링
                    response = requests.get(search_url, headers=self.headers, timeout=10)
                    response.encoding = 'utf-8'
                    soup = BeautifulSoup(response.text, 'html.parser')
                    
                    # 사이트별 검색 결과 파싱 (간단한 예시)
                    # 실제로는 각 사이트의 HTML 구조에 맞게 파싱해야 함
                    post_links = []
                    
                    if site_id == 'mamacafe':
                        # 맘카페 검색 결과 파싱 (네이버 카페 형식)
                        # 맘카페는 네이버 카페 API 또는 웹 크롤링 필요
                        # 검색 결과에서 게시글 링크 추출
                        for link in soup.select('a[href*="/ArticleRead.nhn"], a[href*="/article/"], .article_item a, .search_item a')[:10]:
                            href = link.get('href', '')
                            if href:
                                if href.startswith('/'):
                                    # 상대 경로인 경우 네이버 카페 도메인 추가
                                    href = f"https://m.cafe.naver.com{href}"
                                elif not href.startswith('http'):
                                    href = f"https://m.cafe.naver.com/{href}"
                                title = link.get_text(strip=True) or link.get('title', '')
                                if title and href:
                                    post_links.append((href, title))
                    elif site_id == 'dcinside':
                        # 디시인사이드 검색 결과 파싱
                        for link in soup.select('a[href*="/board/"]')[:10]:  # 더 많이 가져와서 필터링
                            href = link.get('href', '')
                            if href and href.startswith('/'):
                                href = f"https://gall.dcinside.com{href}"
                            post_links.append((href, link.get_text(strip=True)))
                    elif site_id == 'fmkorea':
                        # 에펨코리아 검색 결과 파싱
                        for link in soup.select('a.subject_link')[:10]:
                            href = link.get('href', '')
                            if href and not href.startswith('http'):
                                href = f"https://www.fmkorea.com{href}"
                            post_links.append((href, link.get_text(strip=True)))
                    elif site_id == 'theqoo':
                        # 더쿠 검색 결과 파싱
                        for link in soup.select('a.title_link, a[href*="/index.php"]')[:10]:
                            href = link.get('href', '')
                            if href and not href.startswith('http'):
                                href = f"https://theqoo.net{href}"
                            post_links.append((href, link.get_text(strip=True)))
                    elif site_id == 'clien':
                        # 클리앙 검색 결과 파싱
                        for link in soup.select('a.subject_fixed, a.list_subject')[:10]:
                            href = link.get('href', '')
                            if href and not href.startswith('http'):
                                href = f"https://www.clien.net{href}"
                            post_links.append((href, link.get_text(strip=True)))
                    elif site_id == '82cook':
                        # 82쿡 검색 결과 파싱
                        for link in soup.select('a[href*="/entiz/read.php"], .list_title a, .subject a')[:10]:
                            href = link.get('href', '')
                            if href:
                                if href.startswith('/'):
                                    href = f"https://www.82cook.com{href}"
                                elif not href.startswith('http'):
                                    href = f"https://www.82cook.com/{href}"
                                title = link.get_text(strip=True) or link.get('title', '')
                                if title and href:
                                    post_links.append((href, title))
                    
                    # 각 게시글의 본문 크롤링 및 필터링
                    for post_url, title in post_links:
                        if len(all_posts) >= limit:
                            break
                            
                        if not post_url or not title:
                            continue
                        
                        # 제목에서 키워드 확인 (빠른 필터링)
                        if not any(kw.lower() in title.lower() for kw in keywords):
                            # 제목에 키워드가 없으면 본문도 확인하지 않고 스킵
                            continue
                        
                        # 본문 크롤링 (조회수, 댓글 수, 작성일 포함)
                        content_data = self.fetch_post_content(post_url, site_id)
                        
                        if not content_data['success'] or not content_data['content']:
                            continue
                        
                        # 작성일 확인: 오늘 기준 2일 이내인지 체크
                        if content_data.get('publishedDate'):
                            try:
                                published_date = datetime.fromisoformat(content_data['publishedDate'].replace('Z', '+00:00'))
                                # 타임존 제거하고 비교
                                published_date = published_date.replace(tzinfo=None)
                                if published_date < two_days_ago:
                                    print(f"[Community Crawler] 2일 이전 게시글 필터링: {title[:50]}... (작성일: {published_date.date()})", file=sys.stderr)
                                    continue
                            except Exception as e:
                                print(f"[Community Crawler] 날짜 파싱 오류: {e}", file=sys.stderr)
                                # 날짜 파싱 실패 시에도 수집 (안전장치)
                        
                        # 본문에서도 키워드 확인 (더 정확한 필터링)
                        if not self.is_relevant_post(title, content_data['content'], keywords):
                            print(f"[Community Crawler] 키워드와 관련 없는 게시글 필터링: {title[:50]}...", file=sys.stderr)
                            continue
                        
                        # 관련 있는 게시글만 추가
                        published_at = content_data.get('publishedDate') or datetime.now().isoformat()
                        all_posts.append({
                            'id': f"{site_id}_{int(time.time())}",
                            'source': site_id,
                            'sourceName': site_name,
                            'title': title[:200],  # 제목 최대 200자
                            'content': content_data['content'],  # 실제 본문 내용
                            'url': post_url,
                            'viewCount': content_data.get('viewCount', 0),  # 실제 파싱한 조회수
                            'commentCount': content_data.get('commentCount', 0),  # 실제 파싱한 댓글 수
                            'showId': show_id,
                            'publishedAt': published_at,
                            'createdAt': datetime.now().isoformat()
                        })
                        
                        print(f"[Community Crawler] ✅ 관련 게시글 수집: {title[:50]}...", file=sys.stderr)
                        
                        # Rate limiting
                        time.sleep(1)
                            
                except Exception as e:
                    print(f"[Community Crawler] {site_id} 크롤링 오류: {e}", file=sys.stderr)
                    continue
                
                if len(all_posts) >= limit:
                    break
        
        # 본문이 없는 경우를 대비해 최소한의 데이터라도 반환
        if len(all_posts) == 0:
            # 폴백: 키워드 기반 더미 데이터 (하지만 실제 크롤링 시도했다는 표시)
            for kw in keywords[:limit]:
                all_posts.append({
                    'id': f"fallback_{int(time.time())}",
                    'source': 'fallback',
                    'sourceName': '크롤링 실패',
                    'title': f"[{kw}] 관련 게시글 (크롤링 필요)",
                    'content': f"{kw} 관련 게시글을 찾았지만 본문 크롤링에 실패했습니다. 실제 커뮤니티 사이트의 HTML 구조에 맞게 크롤링 로직을 개선해야 합니다.",
                    'url': '',
                    'viewCount': 0,
                    'commentCount': 0,
                    'showId': show_id,
                    'publishedAt': datetime.now().isoformat(),
                    'createdAt': datetime.now().isoformat()
                })
        
        return all_posts
