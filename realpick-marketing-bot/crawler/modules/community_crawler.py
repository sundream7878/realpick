import requests
from bs4 import BeautifulSoup
import json
import sys
import time
import re
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional

try:
    import undetected_chromedriver as uc
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    HAS_SELENIUM = True
except ImportError:
    HAS_SELENIUM = False

class CommunityCrawler:
    """대한민국 주요 커뮤니티 크롤러
    - 게시판형 커뮤니티(디시/에펨/루리웹/네이트판/클리앙/뽐뿌 등)
    - (옵션) 맘카페/82cook 포함
    """
    
    def __init__(self, load_mamacafe: bool = False, use_browser: bool = False):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        self.target_sites = {
            'mamacafe': '맘카페',
            '82cook': '82쿡',
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
        
        # Selenium 강제 사용 (사용자가 요청함)
        self.use_browser = True if HAS_SELENIUM else False
        if not HAS_SELENIUM:
            print("[Community Crawler] Selenium이 설치되지 않아 requests 모드로 동작합니다.", file=sys.stderr)
            
        self.driver = None

        # 맘카페 크롤링이 필요한 경우에만 리스트 로드
        if load_mamacafe:
            self.mamacafe_list = self._load_mamacafe_list()
        else:
            self.mamacafe_list = []

    def start_browser(self):
        """브라우저 시작"""
        if not HAS_SELENIUM:
            print("[Community Crawler] Selenium 미설치", file=sys.stderr)
            return False
            
        if self.driver:
            return True
            
        try:
            options = uc.ChromeOptions()
            options.add_argument("--headless=new")
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-dev-shm-usage")
            options.add_argument("--disable-blink-features=AutomationControlled")
            options.add_argument("--window-size=1920,1080")
            
            self.driver = uc.Chrome(options=options, version_main=145)
            self.driver.set_page_load_timeout(30)
            print("[Community Crawler] 브라우저 시작 완료", file=sys.stderr)
            return True
        except Exception as e:
            print(f"[Community Crawler] 브라우저 시작 실패: {e}", file=sys.stderr)
            return False

    def close(self):
        """브라우저 종료"""
        if self.driver:
            try:
                self.driver.quit()
            except:
                pass
            self.driver = None

    def _fetch_url(self, url: str) -> str:
        """URL 내용을 가져옴 (브라우저 우선)"""
        if self.use_browser:
            if not self.driver:
                if not self.start_browser():
                    # 브라우저 시작 실패 시 requests로 fallback
                    print("[Community Crawler] 브라우저 시작 실패, requests로 전환", file=sys.stderr)
                    try:
                        response = requests.get(url, headers=self.headers, timeout=15)
                        response.encoding = 'utf-8'
                        return response.text
                    except:
                        return ""
            
            try:
                print(f"[Community Crawler] 브라우저로 이동: {url[:60]}...", file=sys.stderr)
                self.driver.get(url)
                
                # 페이지 로딩 대기 (5초로 증가)
                time.sleep(5) 
                
                # 스크롤 다운 (내용 로딩 유도)
                self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight/3);")
                time.sleep(1)
                
                return self.driver.page_source
            except Exception as e:
                print(f"[Community Crawler] 브라우저 로딩 실패 ({url}): {e}", file=sys.stderr)
                # 실패 시 requests로 재시도 (마지막 수단)
                try:
                    response = requests.get(url, headers=self.headers, timeout=15)
                    response.encoding = 'utf-8'
                    return response.text
                except:
                    return ""
        else:
            try:
                response = requests.get(url, headers=self.headers, timeout=15)
                response.encoding = 'utf-8'
                return response.text
            except Exception as e:
                print(f"[Community Crawler] Requests 실패 ({url}): {e}", file=sys.stderr)
                return ""
    
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
        """커뮤니티별 검색 URL 생성"""
        import urllib.parse
        kw_enc = urllib.parse.quote(keyword)

        if site == 'mamacafe' and cafe_id:
            return f"https://cafe.naver.com/{cafe_id}?iframe_url=/ArticleSearchList.nhn%3Fsearch.clubid={cafe_id}%26search.searchBy=0%26search.query={kw_enc}%26search.sortBy=date"
        elif site == 'mamacafe':
            return f"https://m.cafe.naver.com/ca-fe/web/search/articles?q={kw_enc}&searchBy=0&sortBy=date&page=1"

        urls = {
            '82cook':   f"https://www.82cook.com/entiz/enti.php?bn=15&search={kw_enc}",
            'dcinside': f"https://search.dcinside.com/combine/q/{kw_enc}",
            'fmkorea':  f"https://www.fmkorea.com/search.php?act=IS&is_keyword={kw_enc}&search_target=title_content",
            'theqoo':   f"https://theqoo.net/index.php?mid=square&search_keyword={kw_enc}&act=IS&where=document",
            'nate':     f"https://pann.nate.com/search/talk?searchType=A&q={kw_enc}",
            'ppomppu':  f"https://www.ppomppu.co.kr/search_bbs.php?keyword={kw_enc}",
            'clien':    f"https://www.clien.net/service/search?q={kw_enc}&sort=recency&boardCd=&isBoard=false",
            'ruliweb':  f"https://bbs.ruliweb.com/search?q={kw_enc}",
            'inven':    f"https://www.inven.co.kr/search/web/q/{kw_enc}",
            'arcalive': f"https://arca.live/b/search?q={kw_enc}",
            'mlbpark':  f"https://mlbpark.donga.com/mp/b.php?searchSelect=s&searchKeyword={kw_enc}",
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
            html = self._fetch_url(post_url)
            if not html:
                return {'content': '', 'success': False, 'viewCount': 0, 'commentCount': 0, 'publishedDate': None}
                
            soup = BeautifulSoup(html, 'html.parser')
            
            # 사이트별 본문 선택자 (주요 사이트만 구현)
            content_selectors = {
                'mamacafe': ['.article_viewer', '.se-main-container', '.article_body', '.view_content', '.content'],
                '82cook':   ['.content_view', '.post_content', '.article_content', '.content'],
                'dcinside': ['div.view_content_wrap', 'div.view_content', '.writing_view_box', '.write_div'],
                'fmkorea':  ['.xe_content', '.rd_body', '.content_wrapper', '.content'],
                'theqoo':   ['.xe_content', '.content', 'div[class*="content"]'],
                'clien':    ['.post_content', '.content_view', '.post-view', 'div.contents'],
                'nate':     ['.post-content', '.view_content', '.content', 'div[class*="content"]'],
                'ppomppu':  ['div.baseList-content', '.cont_area', 'td.baseList-content', '.bbsView_cont'],
                'ruliweb':  ['.view_content', '.article_content', '.content_view', 'div.cont'],
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

    def _parse_search_results(self, site_id: str, soup: BeautifulSoup, kw: str) -> List[tuple]:
        """사이트별 검색결과 HTML에서 (url, title) 리스트 반환"""
        post_links = []

        def add(href, title, base=''):
            href = href.strip()
            title = title.strip()
            if not href or not title or len(title) < 3:
                return
            if href.startswith('//'):
                href = 'https:' + href
            elif href.startswith('/'):
                href = base + href
            elif not href.startswith('http'):
                return
            post_links.append((href, title))

        try:
            if site_id == 'dcinside':
                # search.dcinside.com 검색결과 - 'a.tit-link' 또는 '.result-detail a'
                for el in soup.select('a.tit-link, .result-detail .tit a, ul.result_list li a[href*="gall.dcinside"]')[:15]:
                    add(el.get('href', ''), el.get_text(strip=True))
                # fallback: href에 gall.dcinside 포함된 링크
                if not post_links:
                    for el in soup.select('a[href*="gall.dcinside.com/board"]')[:15]:
                        title = el.get_text(strip=True) or el.get('title', '')
                        add(el.get('href', ''), title)

            elif site_id == 'fmkorea':
                # fmkorea 검색결과 - '.title a' 또는 'a.subject_link'
                # 통합검색(act=IS) 결과 구조 대응
                
                # 1. 통합검색 결과 리스트 (가장 일반적)
                # ul.searchResult li dl dt a (2026-03-10 확인된 구조)
                # ul.search_list li dl dt a (이전 구조)
                for el in soup.select('ul.searchResult li dl dt a, ul.search_list li dl dt a, .search_list li .title a'):
                    href = el.get('href', '')
                    if not href.startswith('http'):
                        href = 'https://www.fmkorea.com' + href
                    
                    # 댓글 링크 건너뛰기
                    if '#comment' in href:
                        continue
                        
                    # 검색 키워드 하이라이팅 태그 제거하고 텍스트만 추출
                    for strong in el.find_all('strong', class_='searchContextDoc'):
                        strong.unwrap()
                        
                    title = el.get_text(strip=True)
                    if title:
                        add(href, title)

                # 2. 게시판형 리스트 (search_target 지정 시)
                if not post_links:
                    for el in soup.select('.board_list tr td.title a:not([class]), .bd_lst tr td.title a:not([class])'):
                        href = el.get('href', '')
                        # 댓글 링크 및 카테고리 링크 건너뛰기
                        if '#comment' in href or 'category=' in href:
                            continue
                        if not href.startswith('http'):
                            href = 'https://www.fmkorea.com' + href
                        
                        # span 태그 제거하고 텍스트만 추출
                        for span in el.find_all('span'):
                            span.unwrap()
                            
                        title = el.get_text(strip=True)
                        if title:
                            add(href, title)

                # 3. 기존 구조 fallback
                if not post_links:
                    for el in soup.select('li.li h3.title a, .search_result_list li a, a.subject_link'):
                        href = el.get('href', '')
                        if not href.startswith('http'):
                            href = 'https://www.fmkorea.com' + href
                        
                        for span in el.find_all('span', class_='search_keyword'):
                            span.unwrap()
                            
                        title = el.get_text(strip=True)
                        if title:
                            add(href, title)
                            
                # 디버깅: 파싱 실패 시 HTML 저장
                if not post_links:
                    try:
                        debug_path = os.path.join(os.path.dirname(__file__), '..', 'debug_fmkorea.html')
                        with open(debug_path, 'w', encoding='utf-8') as f:
                            f.write(str(soup))
                        print(f"[Community Crawler] ⚠️ 에펨코리아 파싱 실패. 디버그 파일 저장됨: {debug_path}", file=sys.stderr)
                    except:
                        pass

            elif site_id == 'clien':
                # clien 검색결과 - 'a.list_subject' 또는 '.subject a'
                for el in soup.select('a.list_subject, span.subject a, .subject_fixed a, .list_title a')[:15]:
                    href = el.get('href', '')
                    if not href.startswith('http'):
                        href = 'https://www.clien.net' + href
                    add(href, el.get_text(strip=True))
                if not post_links:
                    for el in soup.select('a[href*="/service/board"]')[:15]:
                        add(el.get('href', ''), el.get_text(strip=True), 'https://www.clien.net')

            elif site_id == 'nate':
                # nate pann 검색결과
                for el in soup.select('a.list_title, .pann_list a, ul.list_cont li a, a[href*="pann.nate.com/talk"]')[:15]:
                    add(el.get('href', ''), el.get_text(strip=True))

            elif site_id == 'ppomppu':
                # 뽐뿌 검색결과 - view.php 링크
                for el in soup.select('a[href*="view.php?id="], td.baseList-title a')[:15]:
                    href = el.get('href', '')
                    if not href.startswith('http'):
                        href = 'https://www.ppomppu.co.kr/' + href.lstrip('/')
                    title = el.get_text(strip=True) or el.get('title', '')
                    if title and len(title) > 3:
                        add(href, title)

            elif site_id == 'ruliweb':
                # ruliweb 검색결과
                for el in soup.select('a.subject_link, .result_text a, a[href*="ruliweb.com/best"], a[href*="ruliweb.com/community"]')[:15]:
                    href = el.get('href', '')
                    if not href.startswith('http') and href.startswith('/'):
                        href = 'https://m.ruliweb.com' + href
                    title = el.get_text(strip=True) or el.get('title', '')
                    if title and len(title) > 3 and 'search' not in href:
                        add(href, title)

            elif site_id == 'theqoo':
                for el in soup.select('a.title_link, .list_title a, a[href*="theqoo.net/square"]')[:15]:
                    href = el.get('href', '')
                    if not href.startswith('http'):
                        href = 'https://theqoo.net' + href
                    add(href, el.get_text(strip=True))

            elif site_id == '82cook':
                for el in soup.select('a[href*="/entiz/read.php"], .list_tit a, td.title a')[:15]:
                    href = el.get('href', '')
                    if not href.startswith('http'):
                        href = 'https://www.82cook.com' + href
                    add(href, el.get_text(strip=True))

        except Exception as e:
            print(f"[Community Crawler] {site_id} 파싱 오류: {e}", file=sys.stderr)

        return post_links[:12]

    def get_hot_posts(self, show_id: str, keywords: List[str], limit: int = 10, include_mamacafe: bool = False, only_mamacafe: bool = False, target_sites: List[str] = None) -> List[Dict]:
        """주요 커뮤니티에서 프로그램 관련 핫게시물 수집 (실제 크롤링)
        오늘 기준 7일 이내 게시글만 수집"""
        all_posts = []
        
        # 오늘 기준 7일 전 날짜 계산 (더 넓은 범위로 수집)
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        two_days_ago = today - timedelta(days=7)
        
        # 실제 크롤링 가능한 사이트 선택
        crawlable_sites = []
        
        # 사용자가 명시적으로 사이트를 선택한 경우
        if target_sites:
            # target_sites에 있는 것들 중 self.target_sites에 정의된 것만 필터링
            crawlable_sites = [s for s in target_sites if s in self.target_sites]
            # 맘카페가 포함되어 있으면 리스트 로드
            if 'mamacafe' in crawlable_sites and not self.mamacafe_list:
                self.mamacafe_list = self._load_mamacafe_list()
        else:
            # 기존 로직 유지 (하위 호환성)
            if only_mamacafe:
                crawlable_sites = ['mamacafe']
                if not self.mamacafe_list:
                    self.mamacafe_list = self._load_mamacafe_list()
            else:
                # 기본: 게시판형 전체
                crawlable_sites = ['dcinside', 'fmkorea', 'clien', 'nate', 'ruliweb', 'ppomppu', 'theqoo', '82cook', 'mlbpark', 'inven']
                if include_mamacafe:
                    if not self.mamacafe_list:
                        self.mamacafe_list = self._load_mamacafe_list()
                    crawlable_sites = ['mamacafe'] + crawlable_sites
        
        print(f"[Community Crawler] 크롤링 대상 사이트: {crawlable_sites}", file=sys.stderr)

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
        
        # 게시판형 커뮤니티 크롤링
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
                    print(f"[Community Crawler] {site_name}에서 '{kw}' 검색 중... ({search_url[:80]})", file=sys.stderr)
                    
                    html = self._fetch_url(search_url)
                    if not html:
                        continue
                        
                    soup = BeautifulSoup(html, 'html.parser')

                    post_links = self._parse_search_results(site_id, soup, kw)
                    print(f"[Community Crawler] {site_name} 검색결과 파싱: {len(post_links)}개 링크 발견", file=sys.stderr)

                    for post_url, title in post_links:
                        if len(all_posts) >= limit:
                            break
                        if not post_url or not title or len(title) < 3:
                            continue

                        # 본문 크롤링
                        content_data = self.fetch_post_content(post_url, site_id)
                        content_text = content_data.get('content', '')

                        # 본문이 없으면 제목만으로 수집 (빈 본문 허용)
                        if not content_text:
                            content_text = title

                        # 날짜 필터 (날짜 파싱 성공한 경우에만 적용)
                        if content_data.get('publishedDate'):
                            try:
                                published_date = datetime.fromisoformat(content_data['publishedDate'].replace('Z', '+00:00'))
                                published_date = published_date.replace(tzinfo=None)
                                if published_date < two_days_ago:
                                    print(f"[Community Crawler] 날짜 필터(7일): {title[:40]} ({published_date.date()})", file=sys.stderr)
                                    continue
                            except Exception:
                                pass  # 날짜 파싱 실패 시 수집

                        # 제목 또는 본문에 키워드 포함 여부 확인
                        if not self.is_relevant_post(title, content_text, keywords):
                            print(f"[Community Crawler] 키워드 불일치 스킵: {title[:40]}", file=sys.stderr)
                            continue

                        published_at = content_data.get('publishedDate') or datetime.now().isoformat()
                        all_posts.append({
                            'id': f"{site_id}_{int(time.time())}_{len(all_posts)}",
                            'source': site_id,
                            'sourceName': site_name,
                            'title': title[:200],
                            'content': content_text[:2000],
                            'url': post_url,
                            'viewCount': content_data.get('viewCount', 0),
                            'commentCount': content_data.get('commentCount', 0),
                            'showId': show_id,
                            'publishedAt': published_at,
                            'createdAt': datetime.now().isoformat()
                        })
                        print(f"[Community Crawler] ✅ 수집 완료: [{site_name}] {title[:50]}", file=sys.stderr)
                        time.sleep(0.5)

                except Exception as e:
                    print(f"[Community Crawler] {site_id} 크롤링 오류: {e}", file=sys.stderr)
                    continue

                if len(all_posts) >= limit:
                    break
        
        return all_posts
