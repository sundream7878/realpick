import requests
from bs4 import BeautifulSoup
import json
import sys
import time
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

    def fetch_post_content(self, post_url: str, site_id: str) -> Dict:
        """게시글 URL에서 실제 본문 내용 크롤링"""
        try:
            response = requests.get(post_url, headers=self.headers, timeout=10)
            response.encoding = 'utf-8'
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 사이트별 본문 선택자 (주요 사이트만 구현)
            content_selectors = {
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
            
            return {
                'content': content_text[:2000] if content_text else "",  # 최대 2000자
                'success': len(content_text) > 50
            }
        except Exception as e:
            print(f"[Community Crawler] 게시글 본문 크롤링 실패 ({post_url}): {e}", file=sys.stderr)
            return {'content': '', 'success': False}

    def get_hot_posts(self, show_id: str, keywords: List[str], limit: int = 10) -> List[Dict]:
        """주요 커뮤니티에서 프로그램 관련 핫게시물 수집 (실제 크롤링)"""
        all_posts = []
        
        # 실제 크롤링 가능한 사이트만 선택 (테스트용)
        crawlable_sites = ['dcinside', 'fmkorea', 'theqoo', 'clien', 'nate']
        
        for site_id, site_name in self.target_sites.items():
            if site_id not in crawlable_sites:
                continue
                
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
                    
                    if site_id == 'dcinside':
                        # 디시인사이드 검색 결과 파싱
                        for link in soup.select('a[href*="/board/"]')[:5]:
                            href = link.get('href', '')
                            if href and href.startswith('/'):
                                href = f"https://gall.dcinside.com{href}"
                            post_links.append((href, link.get_text(strip=True)))
                    elif site_id == 'fmkorea':
                        # 에펨코리아 검색 결과 파싱
                        for link in soup.select('a.subject_link')[:5]:
                            href = link.get('href', '')
                            if href and not href.startswith('http'):
                                href = f"https://www.fmkorea.com{href}"
                            post_links.append((href, link.get_text(strip=True)))
                    elif site_id == 'theqoo':
                        # 더쿠 검색 결과 파싱
                        for link in soup.select('a.title_link, a[href*="/index.php"]')[:5]:
                            href = link.get('href', '')
                            if href and not href.startswith('http'):
                                href = f"https://theqoo.net{href}"
                            post_links.append((href, link.get_text(strip=True)))
                    elif site_id == 'clien':
                        # 클리앙 검색 결과 파싱
                        for link in soup.select('a.subject_fixed, a.list_subject')[:5]:
                            href = link.get('href', '')
                            if href and not href.startswith('http'):
                                href = f"https://www.clien.net{href}"
                            post_links.append((href, link.get_text(strip=True)))
                    
                    # 각 게시글의 본문 크롤링
                    for post_url, title in post_links:
                        if len(all_posts) >= limit:
                            break
                            
                        if not post_url or not title:
                            continue
                        
                        # 본문 크롤링
                        content_data = self.fetch_post_content(post_url, site_id)
                        
                        if content_data['success'] and content_data['content']:
                            all_posts.append({
                                'id': f"{site_id}_{int(time.time())}",
                                'source': site_id,
                                'sourceName': site_name,
                                'title': title[:200],  # 제목 최대 200자
                                'content': content_data['content'],  # 실제 본문 내용
                                'url': post_url,
                                'viewCount': 0,  # 실제로는 파싱 필요
                                'commentCount': 0,  # 실제로는 파싱 필요
                                'showId': show_id,
                                'publishedAt': datetime.now().isoformat(),
                                'createdAt': datetime.now().isoformat()
                            })
                            
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
