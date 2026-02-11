"""
네이버 카페 크롤러 (Selenium 기반)
PC/SPA 혼재 환경에서 안정적으로 게시글 수집
"""

import sys
import time
import re
import json
import random
import os
import pickle
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from urllib.parse import urlparse, parse_qs
from pathlib import Path

try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.common.exceptions import TimeoutException, NoSuchElementException
    import undetected_chromedriver as uc
    HAS_SELENIUM = True
except ImportError as e:
    HAS_SELENIUM = False
    print(f"[Naver Cafe Crawler] ⚠️ Selenium이 설치되지 않았습니다.", file=sys.stderr)
    print(f"[Naver Cafe Crawler] 설치 방법:", file=sys.stderr)
    print(f"[Naver Cafe Crawler]   pip install selenium undetected-chromedriver", file=sys.stderr)
    print(f"[Naver Cafe Crawler] 또는:", file=sys.stderr)
    print(f"[Naver Cafe Crawler]   pip install -r requirements.txt", file=sys.stderr)
    print(f"[Naver Cafe Crawler] 오류 상세: {e}", file=sys.stderr)

import requests
from bs4 import BeautifulSoup


class NaverCafeCrawler:
    """네이버 카페 크롤러 - Selenium + API 하이브리드"""
    
    def __init__(self, headless: bool = False, visible: bool = True):
        """
        Args:
            headless: 헤드리스 모드 (비권장)
            visible: 브라우저 표시 (권장)
        """
        self.driver = None
        self.headless = headless
        self.visible = visible
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
    
    def start_browser(self) -> bool:
        """브라우저 시작 (수동 로그인 대기)"""
        if not HAS_SELENIUM:
            print("[Naver Cafe Crawler] ❌ Selenium이 설치되지 않았습니다.", file=sys.stderr)
            return False
        
        try:
            options = uc.ChromeOptions()
            if not self.headless and self.visible:
                options.add_argument('--start-maximized')
            else:
                options.add_argument('--headless')
            
            options.add_argument('--disable-gpu')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-blink-features=AutomationControlled')
            
            self.driver = uc.Chrome(options=options, version_main=None)
            self.driver.implicitly_wait(10)
            
            print("[Naver Cafe Crawler] ✅ 브라우저 시작 완료. 네이버 로그인을 완료해주세요.", file=sys.stderr)
            return True
        except Exception as e:
            print(f"[Naver Cafe Crawler] ❌ 브라우저 시작 실패: {e}", file=sys.stderr)
            return False
    
    def check_login_status(self) -> bool:
        """현재 로그인 상태 확인"""
        if not self.driver:
            return False
        
        try:
            # 현재 페이지 저장
            current_url = self.driver.current_url
            
            # 네이버 메인으로 이동하여 로그인 상태 확인
            self.driver.get("https://www.naver.com")
            time.sleep(2)
            
            # 로그인 버튼이 있으면 로그아웃 상태
            try:
                login_buttons = self.driver.find_elements(By.CSS_SELECTOR, "a.link_login, a[href*='nidlogin']")
                if login_buttons and any(btn.is_displayed() for btn in login_buttons):
                    print("[Naver Cafe Crawler] ⚠️ 로그인 세션이 만료되었습니다.", file=sys.stderr)
                    return False
            except:
                pass
            
            # 원래 페이지로 복귀
            if current_url and 'naver.com' in current_url:
                self.driver.get(current_url)
                time.sleep(1)
            
            return True
        except Exception as e:
            print(f"[Naver Cafe Crawler] 로그인 상태 확인 오류: {e}", file=sys.stderr)
            return True  # 오류 시 일단 진행
    
    def wait_for_login(self, timeout: int = 300, save_cookies: bool = True) -> bool:
        """로그인 완료 대기 (수동) - 완료 후 쿠키 자동 저장"""
        if not self.driver:
            return False
        
        try:
            self.driver.get("https://nid.naver.com/nidlogin.login")
            print(f"[Naver Cafe Crawler] ⏳ 로그인을 완료해주세요. (최대 {timeout}초 대기)", file=sys.stderr)
            
            # 로그인 완료 확인 (네이버 메인 페이지로 이동했는지 확인)
            WebDriverWait(self.driver, timeout).until(
                lambda d: 'naver.com' in d.current_url and 'nidlogin' not in d.current_url
            )
            
            print("[Naver Cafe Crawler] ✅ 로그인 완료 확인", file=sys.stderr)
            
            # 로그인 성공 시 쿠키 자동 저장 (다음에 재사용)
            if save_cookies:
                time.sleep(2)  # 쿠키 설정 대기
                self.save_login_cookies()
                print("[Naver Cafe Crawler] 💡 쿠키가 저장되었습니다.", file=sys.stderr)
            
            return True
        except TimeoutException:
            print("[Naver Cafe Crawler] ⚠️ 로그인 대기 시간 초과", file=sys.stderr)
            return False
        except Exception as e:
            print(f"[Naver Cafe Crawler] ❌ 로그인 확인 오류: {e}", file=sys.stderr)
            return False
    
    def normalize_article_url(self, url: str) -> Optional[str]:
        """
        [2026 전문가 검증] 모든 URL을 PC 표준으로 정규화
        
        지원 형식:
        - 2026년 SPA: https://cafe.naver.com/f-e/cafes/123456/articles/789012
        - 구식 SPA: https://cafe.naver.com/cafes/123456/articles/789012
        - 모바일: https://cafe.naver.com/ca-fe/web/articles/123456/789012
        - PC 표준: https://cafe.naver.com/ArticleRead.nhn?clubid=123456&articleid=789012
        - 이중 인코딩: https://cafe.naver.com/cafeid?iframe_url_utf8=%2FArticleRead.nhn%253Fclubid%3D...
        
        반환: PC 표준 URL (iframe/본문 추출이 안정적)
        """
        if not url or 'cafe.naver.com' not in url:
            return None
        
        # 이중 인코딩 처리 (iframe_url_utf8 파라미터)
        if 'iframe_url_utf8=' in url:
            try:
                from urllib.parse import unquote
                # iframe_url_utf8 파라미터 추출
                match = re.search(r'iframe_url_utf8=([^&]+)', url)
                if match:
                    encoded_path = match.group(1)
                    # 이중 디코딩
                    decoded_path = unquote(unquote(encoded_path))
                    # clubid, articleid 추출
                    clubid_match = re.search(r'clubid[=:](\d+)', decoded_path)
                    articleid_match = re.search(r'articleid[=:](\d+)', decoded_path)
                    if clubid_match and articleid_match:
                        clubid = clubid_match.group(1)
                        articleid = articleid_match.group(1)
                        return f"https://cafe.naver.com/ArticleRead.nhn?clubid={clubid}&articleid={articleid}"
            except Exception as e:
                print(f"[Naver Cafe Crawler] 이중 인코딩 URL 파싱 오류: {e}", file=sys.stderr)
        
        clubid = None
        articleid = None
        
        # 2026년 최신 SPA 형식 (/f-e/ 포함)
        match = re.search(r'/f-e/cafes/(\d+)/articles/(\d+)', url)
        if match:
            clubid, articleid = match.groups()
        
        # 구식 SPA 형식
        if not clubid:
            match = re.search(r'/cafes/(\d+)/articles/(\d+)', url)
            if match:
                clubid, articleid = match.groups()
        
        # 모바일 형식
        if not clubid:
            match = re.search(r'/ca-fe/web/articles/(\d+)/(\d+)', url)
            if match:
                clubid, articleid = match.groups()
        
        # PC 표준 형식 (이미 PC 표준이면 그대로)
        if '/ArticleRead.nhn' in url:
            parsed = urlparse(url)
            params = parse_qs(parsed.query)
            clubid = params.get('clubid', [None])[0]
            articleid = params.get('articleid', [None])[0]
        
        # URL 파라미터에서 추출 시도
        if not clubid:
            parsed = urlparse(url)
            if 'clubid' in parsed.query and 'articleid' in parsed.query:
                params = parse_qs(parsed.query)
                clubid = params.get('clubid', [None])[0]
                articleid = params.get('articleid', [None])[0]
        
        # PC 표준 URL로 반환 (전문가 검증: iframe/본문 추출 안정)
        if clubid and articleid:
            return f"https://cafe.naver.com/ArticleRead.nhn?clubid={clubid}&articleid={articleid}"
        
        return url  # 변환 실패 시 원본 반환
    
    def save_debug_screenshot(self, filename_prefix: str):
        """디버깅용 스크린샷 저장"""
        if not self.driver:
            return
        
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            screenshot_path = f"debug_{filename_prefix}_{timestamp}.png"
            self.driver.save_screenshot(screenshot_path)
            print(f"[Naver Cafe Crawler] 📸 스크린샷 저장: {screenshot_path}", file=sys.stderr)
        except Exception as e:
            print(f"[Naver Cafe Crawler] 스크린샷 저장 실패: {e}", file=sys.stderr)
    
    def get_article_info_from_api(self, clubid: str, articleid: str) -> Optional[dict]:
        """
        [전문가 검증] Naver Article API로 날짜/본문 확보
        
        목록 DOM에 날짜가 없는 문제를 API로 해결
        """
        try:
            api_url = f"https://apis.naver.com/cafe-web/cafe-article/v1/articles/{articleid}?useCafeId=false&buid={clubid}"
            
            # 로그인 쿠키 사용
            cookies = {}
            if self.driver:
                for cookie in self.driver.get_cookies():
                    cookies[cookie['name']] = cookie['value']
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': f'https://cafe.naver.com/ArticleRead.nhn?clubid={clubid}&articleid={articleid}'
            }
            
            import requests
            response = requests.get(api_url, headers=headers, cookies=cookies, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                result = data.get('result', {})
                article = result.get('article', {})
                
                if not article:
                    print(f"[Naver Cafe Crawler] ⚠️ API 응답에 article 없음. data keys: {list(data.keys())}", file=sys.stderr)
                    return None
                
                # 날짜 추출 (여러 필드 시도)
                write_date = article.get('writeDate') or article.get('writeDateTimestamp') or article.get('createdAt')
                
                if not write_date:
                    print(f"[Naver Cafe Crawler] ⚠️ API article에 날짜 없음. article keys: {list(article.keys())}", file=sys.stderr)
                    return None
                
                print(f"[Naver Cafe Crawler] ✅ API 성공: 날짜={write_date}", file=sys.stderr)
                return {
                    'date': write_date,
                    'content': article.get('content', ''),
                    'subject': article.get('subject', ''),
                    'nickname': article.get('writerNickname', ''),
                    'member_id': article.get('writerId', '')
                }
            
            print(f"[Naver Cafe Crawler] ⚠️ API HTTP 오류: status={response.status_code}", file=sys.stderr)
            return None
            
        except Exception as e:
            print(f"[Naver Cafe Crawler] ⚠️ API 호출 오류: {e}", file=sys.stderr)
            return None
    
    def save_page_source(self, filename_prefix: str):
        """디버깅용 HTML 소스 저장"""
        if not self.driver:
            return
        
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            html_path = f"debug_{filename_prefix}_{timestamp}.html"
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(self.driver.page_source)
            print(f"[Naver Cafe Crawler] 💾 HTML 저장: {html_path}", file=sys.stderr)
        except Exception as e:
            print(f"[Naver Cafe Crawler] HTML 저장 실패: {e}", file=sys.stderr)
    
    def save_login_cookies(self, filepath: str = "naver_cookies.pkl"):
        """로그인 쿠키 저장"""
        if not self.driver:
            return
        
        try:
            cookies = self.driver.get_cookies()
            with open(filepath, 'wb') as f:
                pickle.dump(cookies, f)
            print(f"[Naver Cafe Crawler] 🍪 쿠키 저장: {filepath}", file=sys.stderr)
        except Exception as e:
            print(f"[Naver Cafe Crawler] 쿠키 저장 실패: {e}", file=sys.stderr)
    
    def load_login_cookies(self, filepath: str = "naver_cookies.pkl") -> bool:
        """저장된 쿠키 로드 (로그인 세션 재사용)"""
        if not self.driver:
            return False
        
        try:
            if not os.path.exists(filepath):
                print(f"[Naver Cafe Crawler] 저장된 쿠키 없음: {filepath}", file=sys.stderr)
                return False
            
            # 네이버 메인 페이지 먼저 방문 (쿠키 도메인 설정)
            self.driver.get("https://www.naver.com")
            time.sleep(2)
            
            with open(filepath, 'rb') as f:
                cookies = pickle.load(f)
            
            for cookie in cookies:
                try:
                    self.driver.add_cookie(cookie)
                except Exception as e:
                    # 일부 쿠키는 추가 실패할 수 있음 (도메인 불일치 등)
                    pass
            
            print(f"[Naver Cafe Crawler] 🍪 쿠키 로드 완료: {len(cookies)}개", file=sys.stderr)
            
            # 로그인 상태 확인
            self.driver.get("https://www.naver.com")
            time.sleep(2)
            
            # 로그인 상태 확인 (로그인 버튼이 없으면 로그인 상태)
            try:
                login_button = self.driver.find_elements(By.CSS_SELECTOR, "a.link_login")
                if login_button:
                    print(f"[Naver Cafe Crawler] ⚠️ 쿠키 로드했지만 로그인 상태 아님", file=sys.stderr)
                    return False
                else:
                    print(f"[Naver Cafe Crawler] ✅ 쿠키로 로그인 상태 복원 성공", file=sys.stderr)
                    return True
            except:
                return True
            
        except Exception as e:
            print(f"[Naver Cafe Crawler] 쿠키 로드 실패: {e}", file=sys.stderr)
            return False
    
    def switch_to_iframe_if_needed(self) -> bool:
        """iframe 전환 (PC 표준 페이지) - 명시적 대기 강화"""
        if not self.driver:
            return False
        
        try:
            # 기본 컨텍스트로 전환
            self.driver.switch_to.default_content()
            
            current_url = self.driver.current_url
            # SPA/모바일 URL이면 iframe 없음
            if '/f-e/' in current_url or '/ca-fe/' in current_url:
                print("[Naver Cafe Crawler] SPA 페이지 감지 (iframe 없음)", file=sys.stderr)
                return True
            
            # iframe 찾기 및 전환 (타임아웃 단축)
            try:
                iframe = WebDriverWait(self.driver, 5).until(
                    EC.frame_to_be_available_and_switch_to_it((By.ID, "cafe_main"))
                )
                print("[Naver Cafe Crawler] ✅ cafe_main 프레임 전환 성공", file=sys.stderr)
                
                # iframe 내부 콘텐츠 로딩 대기 (1초로 단축)
                time.sleep(1)
                return True
            except TimeoutException:
                # iframe이 없으면 그대로 진행
                print("[Naver Cafe Crawler] ⚠️ cafe_main iframe 없음 (계속 진행)", file=sys.stderr)
                return True
        except Exception as e:
            print(f"[Naver Cafe Crawler] ❌ iframe 전환 오류: {e}", file=sys.stderr)
            # 실패 시 스크린샷 저장
            self.save_debug_screenshot("iframe_switch_failed")
            return False
    
    def extract_member_id_from_api(self, clubid: str, articleid: str) -> Optional[Dict[str, str]]:
        """
        API 우회로 작성자 고유키(member_id) 및 닉네임 추출
        
        Returns:
            {'member_id': '...', 'nickname': '...'} 또는 None
        """
        try:
            api_url = f"https://apis.naver.com/cafe-web/cafe-article/v1/articles/{articleid}?useCafeId=false&buid={clubid}"
            response = self.session.get(api_url, timeout=10)
            
            if response.status_code != 200:
                return None
            
            data = response.json()
            
            # JSON 구조 탐색
            writer = None
            if 'result' in data and 'article' in data['result']:
                writer = data['result']['article'].get('writer')
            elif 'article' in data:
                writer = data['article'].get('writer')
            elif 'writer' in data:
                writer = data['writer']
            
            if not writer:
                return None
            
            # member_id 추출 (여러 후보)
            member_id = (
                writer.get('id') or
                writer.get('memberKey') or
                writer.get('memberId') or
                writer.get('userKey') or
                writer.get('userId') or
                None
            )
            
            # nickname 추출
            nickname = (
                writer.get('nickname') or
                writer.get('nickName') or
                writer.get('displayName') or
                writer.get('name') or
                'Unknown'
            )
            
            if member_id:
                return {'member_id': str(member_id), 'nickname': nickname}
            
            return None
        except Exception as e:
            print(f"[Naver Cafe Crawler] API member_id 추출 오류: {e}", file=sys.stderr)
            return None
    
    def _extract_clubid_from_cafe(self, cafe_url: str) -> Optional[str]:
        """
        카페 메인 페이지에서 숫자 clubid 추출
        
        Args:
            cafe_url: 카페 URL (예: https://cafe.naver.com/imsanbu)
        
        Returns:
            숫자 clubid (예: "10050146") 또는 None
        """
        if not self.driver:
            return None
        
        try:
            # 카페 메인 페이지로 이동
            print(f"[Naver Cafe Crawler] 카페 페이지 접속: {cafe_url}", file=sys.stderr)
            self.driver.get(cafe_url)
            
            # 페이지 로딩 대기 (최소화)
            time.sleep(2)
            
            # JavaScript 완료 대기 (타임아웃 단축)
            try:
                from selenium.webdriver.support.ui import WebDriverWait
                WebDriverWait(self.driver, 5).until(
                    lambda d: d.execute_script("return document.readyState") == "complete"
                )
                print(f"[Naver Cafe Crawler] ✅ 페이지 로딩 완료", file=sys.stderr)
            except:
                print(f"[Naver Cafe Crawler] ⚠️ JavaScript 로딩 대기 시간 초과 (계속 진행)", file=sys.stderr)
            
            # 추가 안정화 대기 (1초로 단축)
            time.sleep(1)
            
            # 현재 URL 확인 (리다이렉트 체크)
            current_url = self.driver.current_url
            print(f"[Naver Cafe Crawler] 현재 URL: {current_url}", file=sys.stderr)
            
            # 페이지 소스에서 clubid 추출 (여러 패턴 시도)
            page_source = self.driver.page_source
            print(f"[Naver Cafe Crawler] 페이지 소스 길이: {len(page_source)}자", file=sys.stderr)
            
            # 패턴 1: g_sClubId = "12345678"
            match = re.search(r'g_sClubId\s*=\s*["\'](\d+)["\']', page_source)
            if match:
                clubid = match.group(1)
                print(f"[Naver Cafe Crawler] ✅ clubid 추출 성공 (패턴1 g_sClubId): {clubid}", file=sys.stderr)
                return clubid
            
            # 패턴 2: clubid=12345678 (URL 파라미터)
            match = re.search(r'[?&]clubid=(\d+)', current_url, re.IGNORECASE)
            if match:
                clubid = match.group(1)
                print(f"[Naver Cafe Crawler] ✅ clubid 추출 성공 (패턴2 URL): {clubid}", file=sys.stderr)
                return clubid
            
            # 패턴 3: clubid=12345678 (페이지 소스)
            match = re.search(r'clubid[=:](\d+)', page_source, re.IGNORECASE)
            if match:
                clubid = match.group(1)
                print(f"[Naver Cafe Crawler] ✅ clubid 추출 성공 (패턴3 clubid=): {clubid}", file=sys.stderr)
                return clubid
            
            # 패턴 4: "clubId":"12345678"
            match = re.search(r'"clubId"\s*:\s*"(\d+)"', page_source)
            if match:
                clubid = match.group(1)
                print(f"[Naver Cafe Crawler] ✅ clubid 추출 성공 (패턴4 JSON clubId): {clubid}", file=sys.stderr)
                return clubid
            
            # 패턴 5: "clubId":12345678 (따옴표 없는 숫자)
            match = re.search(r'"clubId"\s*:\s*(\d+)', page_source)
            if match:
                clubid = match.group(1)
                print(f"[Naver Cafe Crawler] ✅ clubid 추출 성공 (패턴5 JSON clubId 숫자): {clubid}", file=sys.stderr)
                return clubid
            
            # 패턴 6: data-clubid="12345678"
            match = re.search(r'data-clubid\s*=\s*["\'](\d+)["\']', page_source, re.IGNORECASE)
            if match:
                clubid = match.group(1)
                print(f"[Naver Cafe Crawler] ✅ clubid 추출 성공 (패턴6 data-clubid): {clubid}", file=sys.stderr)
                return clubid
            
            # 패턴 7: cafe.naver.com/cafeid → API로 clubid 조회 시도
            cafe_name = re.search(r'cafe\.naver\.com/([^/?]+)', cafe_url)
            if cafe_name:
                cafe_name_str = cafe_name.group(1)
                # 페이지 소스에서 해당 카페명과 함께 나오는 숫자 ID 찾기
                pattern = rf'{cafe_name_str}[^0-9]*?(\d{{7,10}})'
                match = re.search(pattern, page_source)
                if match:
                    clubid = match.group(1)
                    print(f"[Naver Cafe Crawler] ✅ clubid 추출 성공 (패턴7 카페명 근처): {clubid}", file=sys.stderr)
                    return clubid
            
            # 실패 시 디버깅 정보
            print(f"[Naver Cafe Crawler] ❌ clubid 추출 실패", file=sys.stderr)
            print(f"[Naver Cafe Crawler] 페이지 소스 샘플 (처음 1000자):", file=sys.stderr)
            print(f"{page_source[:1000]}", file=sys.stderr)
            print(f"\n[Naver Cafe Crawler] 페이지 소스 샘플 (마지막 500자):", file=sys.stderr)
            print(f"{page_source[-500:]}", file=sys.stderr)
            
            # 가입 필요 메시지 체크
            if '가입하기' in page_source or '카페 가입' in page_source or '멤버 가입' in page_source:
                print(f"[Naver Cafe Crawler] ⚠️ 카페 가입이 필요한 것으로 보입니다.", file=sys.stderr)
            
            if '비공개' in page_source or '접근 권한' in page_source:
                print(f"[Naver Cafe Crawler] ⚠️ 비공개 카페이거나 접근 권한이 없습니다.", file=sys.stderr)
            
            # 로그인 상태 체크
            if '로그인' in page_source and 'login' in page_source.lower():
                print(f"[Naver Cafe Crawler] ⚠️ 로그인이 필요하거나 세션이 만료되었을 수 있습니다.", file=sys.stderr)
            
            # 디버깅용 HTML 저장
            try:
                cafe_name = re.search(r'cafe\.naver\.com/([^/?]+)', cafe_url)
                if cafe_name:
                    cafe_name_str = cafe_name.group(1)
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    debug_file = f"debug_cafe_{cafe_name_str}_{timestamp}.html"
                    with open(debug_file, 'w', encoding='utf-8') as f:
                        f.write(page_source)
                    print(f"[Naver Cafe Crawler] 💾 디버깅용 HTML 저장: {debug_file}", file=sys.stderr)
            except:
                pass
            
            return None
            
        except Exception as e:
            print(f"[Naver Cafe Crawler] clubid 추출 오류: {e}", file=sys.stderr)
            return None
    
    def parse_date_from_text(self, text: str) -> Optional[datetime]:
        """날짜 텍스트 파싱 (다양한 형식 지원)"""
        if not text:
            return None
        
        now = datetime.now()
        
        # [최우선] 시간 정보 포함 형식
        # YYYY.MM.DD. HH:MM (네이버 카페 표준)
        match = re.search(r'(\d{4})\.(\d{2})\.(\d{2})\.?\s+(\d{1,2}):(\d{2})', text)
        if match:
            year, month, day, hour, minute = map(int, match.groups())
            try:
                return datetime(year, month, day, hour, minute)
            except:
                pass
        
        # YYYY.MM.DD HH:MM (공백 포함)
        match = re.search(r'(\d{4})\.(\d{2})\.(\d{2})\s+(\d{1,2}):(\d{2})', text)
        if match:
            year, month, day, hour, minute = map(int, match.groups())
            try:
                return datetime(year, month, day, hour, minute)
            except:
                pass
        
        # YYYY-MM-DD HH:MM
        match = re.search(r'(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})', text)
        if match:
            year, month, day, hour, minute = map(int, match.groups())
            try:
                return datetime(year, month, day, hour, minute)
            except:
                pass
        
        # HH:MM 형식만 있으면 오늘 날짜로
        match = re.search(r'^(\d{2}):(\d{2})$', text.strip())
        if match:
            hour, minute = map(int, match.groups())
            try:
                return datetime(now.year, now.month, now.day, hour, minute)
            except:
                return now
        
        # YYYY.MM.DD 형식 (시간 없음)
        match = re.search(r'(\d{4})\.(\d{2})\.(\d{2})\.?', text)
        if match:
            year, month, day = map(int, match.groups())
            try:
                return datetime(year, month, day)
            except:
                pass
        
        # YYYY-MM-DD 형식 (시간 없음)
        match = re.search(r'(\d{4})-(\d{2})-(\d{2})', text)
        if match:
            year, month, day = map(int, match.groups())
            try:
                return datetime(year, month, day)
            except:
                pass
        
        # MM.DD 형식 (올해)
        match = re.search(r'(\d{2})\.(\d{2})', text)
        if match:
            month, day = map(int, match.groups())
            try:
                return datetime(now.year, month, day)
            except:
                pass
        
        # MM/DD 형식 (올해)
        match = re.search(r'(\d{2})/(\d{2})', text)
        if match:
            month, day = map(int, match.groups())
            try:
                return datetime(now.year, month, day)
            except:
                pass
        
        # "오늘", "어제" 등 상대적 날짜
        text_lower = text.lower()
        if '오늘' in text_lower or 'today' in text_lower:
            return now
        if '어제' in text_lower or 'yesterday' in text_lower:
            return now - timedelta(days=1)
        if '방금' in text_lower:
            return now
        
        # "N시간 전", "N분 전"
        match = re.search(r'(\d+)\s*시간\s*전', text)
        if match:
            hours = int(match.group(1))
            return now - timedelta(hours=hours)
        
        match = re.search(r'(\d+)\s*분\s*전', text)
        if match:
            minutes = int(match.group(1))
            return now - timedelta(minutes=minutes)
        
        return None
    
    def crawl_article_list(
        self,
        cafe_url: str,
        keywords: List[str] = None,
        start_date: datetime = None,
        end_date: datetime = None,
        exclude_boards: List[str] = None,
        max_pages: int = 50
    ) -> List[Dict]:
        """
        게시글 목록 수집 (키워드 기반 검색)
        
        Args:
            cafe_url: 카페 메인 URL (예: https://cafe.naver.com/imsanbu)
            keywords: 검색 키워드 리스트 (예: ["나는솔로", "나솔"])
            start_date: 시작 날짜 (없으면 최근 2일)
            end_date: 종료 날짜 (없으면 오늘)
            exclude_boards: 제외할 게시판명 리스트
            max_pages: 최대 페이지 수
        
        Returns:
            게시글 목록 (post_id, url, title, date, member_id, nickname, board_name)
        """
        if not self.driver:
            print("[Naver Cafe Crawler] ❌ 브라우저가 시작되지 않았습니다.", file=sys.stderr)
            return []
        
        keywords = keywords or []
        if not keywords:
            print("[Naver Cafe Crawler] ⚠️ 키워드가 없습니다. 키워드를 입력해주세요.", file=sys.stderr)
            return []
        
        # 날짜 기본값 설정 (최근 24시간)
        if not end_date:
            end_date = datetime.now()
        if not start_date:
            start_date = end_date - timedelta(hours=24)  # 24시간 전
        
        exclude_boards = exclude_boards or []
        exclude_boards_lower = [b.lower().replace(' ', '') for b in exclude_boards]
        
        # 카페 ID 추출 (문자열 ID)
        cafe_id_match = re.search(r'cafe\.naver\.com/([^/?]+)', cafe_url)
        cafe_id = cafe_id_match.group(1) if cafe_id_match else None
        if not cafe_id:
            print(f"[Naver Cafe Crawler] ❌ 카페 ID를 추출할 수 없습니다: {cafe_url}", file=sys.stderr)
            return []
        
        # 카페 메인 페이지에서 숫자 clubid 추출
        print(f"[Naver Cafe Crawler] 카페 메인 페이지에서 clubid 추출 중...", file=sys.stderr)
        clubid = self._extract_clubid_from_cafe(cafe_url)
        if not clubid:
            print(f"[Naver Cafe Crawler] ⚠️ 이 카페는 가입이 필요하거나 비공개 카페입니다. 다음 카페로 이동합니다.", file=sys.stderr)
            print(f"[Naver Cafe Crawler] 💡 팁: 크롤링 전에 카페에 가입해두면 더 많은 게시글을 수집할 수 있습니다.", file=sys.stderr)
            return []
        
        print(f"[Naver Cafe Crawler] ✅ clubid: {clubid} (카페: {cafe_id})", file=sys.stderr)
        
        all_posts = []
        
        try:
            # 각 키워드별로 검색
            for keyword in keywords:
                if len(all_posts) >= 1000:  # 안전장치
                    break
                
                print(f"[Naver Cafe Crawler] 키워드 '{keyword}' 검색 중... (카페: {cafe_id})", file=sys.stderr)
                
                # 네이버 카페 검색 URL 생성 (2026년 최신 SPA 방식)
                from urllib.parse import quote
                encoded_keyword = quote(keyword)
                
                # Gemini 전략 A: 목록 뷰 강제 (날짜 정보 표시)
                # viewType=L: 리스트 뷰
                # userDisplay=15: 15개씩 표시
                # sortBy=date: 최신순 정렬
                search_url = f"https://cafe.naver.com/f-e/cafes/{clubid}/menus/0?viewType=L&userDisplay=15&sortBy=date&page=1&q={encoded_keyword}"
                
                print(f"[Naver Cafe Crawler] 검색 URL (목록 뷰 강제): {search_url}", file=sys.stderr)
                print(f"[Naver Cafe Crawler] Gemini 전략 A: 리스트 뷰 강제로 날짜 컬럼 표시", file=sys.stderr)
                
                # 검색 페이지로 이동
                self.driver.get(search_url)
                
                # SPA 방식은 iframe이 없을 수 있음 (URL에 /f-e/ 포함 여부로 판단)
                if '/f-e/' not in search_url:
                        # 구식 iframe 방식만 iframe 전환 시도
                    time.sleep(2)
                    self.switch_to_iframe_if_needed()
                else:
                    print("[Naver Cafe Crawler] SPA 방식 - JavaScript 로딩 대기 중...", file=sys.stderr)
                    # SPA JavaScript 실행 시간 (단축)
                    time.sleep(3)
                    
                    # 페이지 완전 로드 대기 (타임아웃 단축)
                    try:
                        WebDriverWait(self.driver, 5).until(
                            lambda d: d.execute_script("return document.readyState") == "complete"
                        )
                        print("[Naver Cafe Crawler] ✅ 페이지 로드 완료", file=sys.stderr)
                    except:
                        pass
                    
                    # 추가 안정화 대기 (단축)
                    time.sleep(1)
                
                # should_continue_page 변수 초기화 (키워드 레벨)
                should_continue_page = True
                
                # 페이지 소스 확인 (디버깅)
                page_source = self.driver.page_source
                print(f"[Naver Cafe Crawler] 페이지 로드 완료. 페이지 길이: {len(page_source)}", file=sys.stderr)
                
                # 검색 결과 확인
                try:
                    no_result = self.driver.find_elements(By.CSS_SELECTOR, ".nodata, .no_result, .empty, .no-data, .search_no_result")
                    if no_result:
                        print(f"[Naver Cafe Crawler] 키워드 '{keyword}': 검색 결과 없음", file=sys.stderr)
                        continue
                except:
                    pass  # 검색 결과가 있음
                
                # 페이지별로 크롤링
                for page in range(1, max_pages + 1):
                    if len(all_posts) >= 1000:
                        break
                    
                    # 페이지 URL (검색 결과 페이지네이션)
                    if page > 1:
                        # SPA 방식: page 파라미터 업데이트 (Gemini 전략 A 유지)
                        if '/f-e/' in search_url:
                            page_url = search_url.replace(f'page=1', f'page={page}')
                        else:
                            # 구식 방식
                            page_url = f"{search_url}&search.page={page}"
                        
                        print(f"[Naver Cafe Crawler] 페이지 {page}로 이동: {page_url}", file=sys.stderr)
                        self.driver.get(page_url)
                        
                        # iframe 전환 (구식 방식만)
                        if '/f-e/' not in page_url:
                            time.sleep(2)
                            self.switch_to_iframe_if_needed()
                        else:
                            # SPA 페이지 로딩 대기 (단축)
                            print(f"[Naver Cafe Crawler] SPA 페이지 {page} 로딩 대기...", file=sys.stderr)
                            time.sleep(3)
                            try:
                                WebDriverWait(self.driver, 5).until(
                                    lambda d: d.execute_script("return document.readyState") == "complete"
                                )
                            except:
                                pass
                            time.sleep(1)
                    
                    # 스크롤 (SPA는 스크롤이 중요함)
                    self.driver.execute_script("window.scrollTo(0, 1000);")
                    time.sleep(2)
                    
                    # [중요] 테이블 헤더에서 "작성일" 컬럼 인덱스 찾기
                    date_column_index = None
                    try:
                        headers = self.driver.find_elements(By.CSS_SELECTOR, "thead th, thead td")
                        if not headers:
                            headers = self.driver.find_elements(By.CSS_SELECTOR, "tr:first-child th, tr:first-child td")
                        
                        for idx, header in enumerate(headers):
                            header_text = header.text.strip()
                            if '작성일' in header_text or '날짜' in header_text or '등록일' in header_text:
                                date_column_index = idx
                                print(f"[Naver Cafe Crawler] ✅ '작성일' 컬럼 발견: {idx+1}번째 컬럼", file=sys.stderr)
                                break
                    except:
                        pass
                    
                    # SPA 방식: 게시글 로딩 대기 (타임아웃 단축)
                    if '/f-e/' in self.driver.current_url:
                        print("[Naver Cafe Crawler] SPA 게시글 로딩 대기 중...", file=sys.stderr)
                        
                        # 게시글 로드 확인 (타임아웃 단축)
                        loaded = False
                        try:
                            # 방법 1: 게시글 링크가 나타날 때까지 대기 (5초로 단축)
                            WebDriverWait(self.driver, 5).until(
                                lambda d: len(d.find_elements(By.CSS_SELECTOR, "a[href*='articles']")) > 0
                            )
                            loaded = True
                            print("[Naver Cafe Crawler] ✅ SPA 게시글 로드 완료 (링크 발견)", file=sys.stderr)
                        except TimeoutException:
                            print("[Naver Cafe Crawler] ⚠️ 방법 1 실패 - 다른 셀렉터 시도", file=sys.stderr)
                        
                        if not loaded:
                            try:
                                # 방법 2: 리스트 컨테이너 대기 (3초로 단축)
                                WebDriverWait(self.driver, 3).until(
                                    lambda d: len(d.find_elements(By.CSS_SELECTOR, "div[class*='ArticleList'], ul[class*='article'], div.article-board")) > 0
                                )
                                loaded = True
                                print("[Naver Cafe Crawler] ✅ SPA 게시글 로드 완료 (리스트 발견)", file=sys.stderr)
                            except TimeoutException:
                                print("[Naver Cafe Crawler] ⚠️ 방법 2 실패 - 강제 대기", file=sys.stderr)
                        
                        # 최종 안정화 대기 (2초로 단축)
                        time.sleep(2)
                        
                        # 페이지 소스 길이 확인 (디버깅)
                        page_length = len(self.driver.page_source)
                        print(f"[Naver Cafe Crawler] 페이지 소스 길이: {page_length}자", file=sys.stderr)
                        if page_length < 1000:
                            print(f"[Naver Cafe Crawler] ⚠️ 페이지가 너무 짧음 - JavaScript 미실행 가능성", file=sys.stderr)
                    
                    # 게시글 행 찾기 (2026년 최신 네이버 카페 SPA 구조)
                    rows = []
                    selectors = [
                        # [최우선] 2026년 SPA 구조 - 링크 기반으로 역추적
                        # 게시글 링크를 포함하는 부모 요소 찾기
                        "*:has(> a[href*='/articles/'])",
                        "*:has(a[href*='/articles/'])",
                        
                        # [SPA 리스트형] 일반적인 SPA 구조
                        "ul[class*='ArticleList'] > li",
                        "ul[class*='list'] > li",
                        "div[class*='ArticleList'] > div",
                        "div[class*='list-item']",
                        "div[class*='article-item']",
                        
                        # [Gemini 제안] 구식 테이블 구조
                        "div.article-board > table > tbody > tr",
                        "div.article-board table tbody tr",
                        "table.board-list tbody tr",
                        "#main-area table tbody tr",
                        "table[class*='article'] tbody tr",
                        
                        # [범용] 테이블
                        "table tbody tr",
                        "div[id*='cafe_main'] table tbody tr",
                        
                        # [리스트형] 카페별 대체 구조
                        "div.article-board li.board_box",
                        "ul.article_list > li",
                        "div.list_area li",
                        "tr[align='center']",
                        
                        # [최후] 동적 클래스 및 범용
                        "div[class*='ArticleItem']",
                        "li[class*='article']",
                        "div[class*='Item']",
                        "li[class*='item']"
                    ]
                    
                    # [방법 1] 먼저 게시글 링크를 찾아서 부모 요소 수집 (SPA 최적화)
                    if '/f-e/' in self.driver.current_url and not rows:
                        try:
                            print("[Naver Cafe Crawler] SPA 방식: 게시글 링크에서 부모 요소 추출...", file=sys.stderr)
                            article_links = self.driver.find_elements(By.CSS_SELECTOR, "a[href*='/articles/']")
                            if article_links:
                                # 각 링크의 부모 요소를 row로 사용
                                parent_rows = []
                                for link in article_links:
                                    try:
                                        # 부모 요소 중 적절한 컨테이너 찾기 (최대 5단계)
                                        parent = link
                                        for _ in range(5):
                                            parent = parent.find_element(By.XPATH, "..")
                                            # 부모가 리스트 아이템이나 행이면 추가
                                            tag = parent.tag_name.lower()
                                            if tag in ['li', 'tr', 'div'] and parent not in parent_rows:
                                                parent_rows.append(parent)
                                                break
                                    except:
                                        continue
                                
                                if parent_rows:
                                    rows = parent_rows
                                    print(f"[Naver Cafe Crawler] ✅ 링크 기반으로 {len(rows)}개 부모 요소 발견", file=sys.stderr)
                        except Exception as e:
                            print(f"[Naver Cafe Crawler] 링크 기반 추출 오류: {e}", file=sys.stderr)
                    
                    # [방법 2] 일반 셀렉터로 시도
                    if not rows:
                        for selector in selectors:
                            try:
                                # :has() 셀렉터는 건너뛰기 (Selenium 미지원)
                                if ':has(' in selector:
                                    continue
                                
                                rows = self.driver.find_elements(By.CSS_SELECTOR, selector)
                                if rows and len(rows) > 1:  # 최소 2개 이상 (헤더 제외)
                                    print(f"[Naver Cafe Crawler] ✅ 셀렉터 '{selector}'로 {len(rows)}개 행 발견", file=sys.stderr)
                                    break
                                elif rows:
                                    print(f"[Naver Cafe Crawler] ⚠️ 셀렉터 '{selector}'로 {len(rows)}개만 발견 (계속 시도)", file=sys.stderr)
                            except Exception as e:
                                print(f"[Naver Cafe Crawler] 셀렉터 '{selector}' 오류: {e}", file=sys.stderr)
                                continue
                    
                    if not rows:
                        print(f"[Naver Cafe Crawler] ⚠️ 페이지 {page}: 게시글 0개 - 자동 디버깅 시작", file=sys.stderr)
                        
                        # [자동 디버깅 1] 스크린샷 저장
                        self.save_debug_screenshot(f"no_posts_page_{page}")
                        
                        # [자동 디버깅 2] HTML 소스 저장
                        self.save_page_source(f"no_posts_page_{page}")
                        
                        # [자동 디버깅 3] 현재 상태 출력
                        print(f"[DEBUG] 현재 URL: {self.driver.current_url}", file=sys.stderr)
                        
                        # [자동 디버깅 4] iframe 상태 확인
                        try:
                            current_frame = self.driver.execute_script("return self.name")
                            print(f"[DEBUG] 현재 프레임: {current_frame if current_frame else 'default'}", file=sys.stderr)
                        except:
                            print(f"[DEBUG] 프레임 정보 확인 실패", file=sys.stderr)
                        
                        # [자동 디버깅 5] 페이지 내 모든 테이블 구조 출력
                        try:
                            all_tables = self.driver.find_elements(By.TAG_NAME, "table")
                            print(f"[DEBUG] 페이지 내 테이블 개수: {len(all_tables)}", file=sys.stderr)
                            for i, table in enumerate(all_tables[:3]):  # 최대 3개만
                                table_class = table.get_attribute('class') or 'no-class'
                                table_id = table.get_attribute('id') or 'no-id'
                                print(f"[DEBUG] 테이블 {i+1}: class='{table_class}', id='{table_id}'", file=sys.stderr)
                                
                                # 테이블 내 tr 개수
                                try:
                                    trs = table.find_elements(By.TAG_NAME, "tr")
                                    print(f"[DEBUG]   └─ tr 개수: {len(trs)}", file=sys.stderr)
                                except:
                                    pass
                        except Exception as e:
                            print(f"[DEBUG] 테이블 분석 오류: {e}", file=sys.stderr)
                        
                        # [자동 디버깅 6] 게시글 링크 찾기 시도 (SPA)
                        try:
                            article_links = self.driver.find_elements(By.CSS_SELECTOR, "a[href*='/articles/']")
                            print(f"[DEBUG] 게시글 링크 (a[href*='/articles/']) 개수: {len(article_links)}", file=sys.stderr)
                            if article_links:
                                for i, link in enumerate(article_links[:3]):  # 최대 3개만
                                    print(f"[DEBUG] 링크 {i+1}: {link.get_attribute('href')}", file=sys.stderr)
                                    try:
                                        print(f"[DEBUG]   텍스트: {link.text[:50]}", file=sys.stderr)
                                    except:
                                        pass
                        except Exception as e:
                            print(f"[DEBUG] 게시글 링크 찾기 오류: {e}", file=sys.stderr)
                        
                        # [자동 디버깅 7] 모든 링크 확인
                        try:
                            all_links = self.driver.find_elements(By.TAG_NAME, "a")
                            print(f"[DEBUG] 페이지 내 전체 링크 개수: {len(all_links)}", file=sys.stderr)
                            # articles 또는 cafe 관련 링크 필터링
                            relevant_links = [l for l in all_links if l.get_attribute('href') and 'cafe.naver.com' in l.get_attribute('href')]
                            print(f"[DEBUG] 카페 관련 링크 개수: {len(relevant_links)}", file=sys.stderr)
                        except:
                            pass
                        
                        # [자동 디버깅 8] 페이지 소스 샘플
                        page_source_sample = self.driver.page_source[:2000]
                        print(f"[DEBUG] 페이지 소스 샘플 (2000자):\n{page_source_sample}\n", file=sys.stderr)
                        
                        print(f"[Naver Cafe Crawler] 💡 디버깅 파일을 확인하여 실제 HTML 구조를 분석하세요.", file=sys.stderr)
                        break
                    
                    # 페이지별 should_continue_page 플래그 리셋
                    page_should_continue = True
                    
                    for row in rows:
                        try:
                            # 공지/상단 고정 스킵
                            try:
                                row_class = row.get_attribute('class') or ''
                                if 'notice' in row_class.lower() or 'top' in row_class.lower():
                                    continue
                            except Exception as e:
                                # StaleElementReferenceException 등 무시
                                if 'stale element' in str(e).lower():
                                    print(f"[Naver Cafe Crawler] ⚠️ Stale element 스킵 (페이지 업데이트됨)", file=sys.stderr)
                                    continue
                                # 다른 오류는 무시하고 진행
                                pass
                            
                            # 제목/URL 추출 (2026년 최신 SPA 구조 포함)
                            title = ''
                            href = ''
                            title_selectors = [
                                # [최우선] 2026년 SPA 방식
                                "a[href*='/articles/']",  # SPA 게시글 링크
                                "a[href*='/f-e/cafes/']",  # SPA 전체 링크
                                
                                # [우선] Gemini 제안 - 구식 방식
                                "a.article",
                                "td a.article",
                                
                                # [백업] 검증된 링크 셀렉터
                                "a[href*='ArticleRead']",
                                "a[href*='articleid']",
                                
                                # [일반] 제목 셀렉터
                                "td.title a",
                                "td.subject a",
                                ".title a",
                                ".subject a",
                                "a.title",
                                "a.subject",
                                "td.board-list a.article",
                                
                                # [최후] 모든 링크
                                "td a",
                                "a"
                            ]
                            
                            for selector in title_selectors:
                                try:
                                    title_elems = row.find_elements(By.CSS_SELECTOR, selector)
                                    for title_elem in title_elems:
                                        temp_title = title_elem.text.strip()
                                        temp_href = title_elem.get_attribute('href')
                                        # SPA 방식 또는 구식 방식 링크 확인
                                        if temp_title and temp_href and (
                                            '/articles/' in temp_href or  # SPA
                                            'ArticleRead' in temp_href or  # 구식
                                            'articleid' in temp_href       # 구식
                                        ):
                                            title = temp_title
                                            href = temp_href
                                            break
                                    if title and href:
                                        break
                                except:
                                    continue
                            
                            if not href or not title:
                                # 디버깅: 행의 모든 링크 출력
                                try:
                                    all_links = row.find_elements(By.TAG_NAME, "a")
                                    print(f"[Naver Cafe Crawler] 제목/URL 추출 실패. 행에서 발견된 링크 {len(all_links)}개", file=sys.stderr)
                                    for link in all_links[:3]:  # 최대 3개만
                                        print(f"  - {link.text[:30]}: {link.get_attribute('href')}", file=sys.stderr)
                                except:
                                    pass
                                continue
                            
                            # URL 정규화
                            normalized_url = self.normalize_article_url(href)
                            if not normalized_url:
                                continue
                            
                            # post_id 추출 (SPA 및 PC 표준 모두 지원)
                            post_id = None
                            # SPA 형식: /articles/789012
                            match = re.search(r'/articles/(\d+)', normalized_url)
                            if match:
                                post_id = match.group(1)
                            else:
                                # PC 표준 형식: articleid=789012
                                match = re.search(r'articleid=(\d+)', normalized_url)
                                if match:
                                    post_id = match.group(1)
                            
                            if not post_id:
                                continue
                            
                            # [2026년 최신] SPA 검색 결과에는 날짜가 HTML에 없음
                            # → 모든 게시글을 상세 페이지에서 날짜 확인
                            
                            # 변수 초기화
                            date_text = ''
                            detail_info = None
                            
                            # [디버깅] 첫 번째 게시글의 HTML 구조 출력
                            if len(all_posts) == 0 and page == 1:
                                try:
                                    row_html = row.get_attribute('outerHTML')
                                    print(f"\n[DEBUG] 첫 번째 게시글 HTML 구조:\n{row_html[:1000]}\n", file=sys.stderr)
                                    print(f"[DEBUG] 게시글 전체 텍스트:\n{row.text}\n", file=sys.stderr)
                                    print(f"[DEBUG] ⚠️ SPA 검색 결과에는 날짜가 없음 → 상세 페이지에서 확인", file=sys.stderr)
                                except:
                                    pass
                            
                            # [방법 1] 테이블 구조: 작성일 컬럼 인덱스 사용
                            if date_column_index is not None:
                                try:
                                    tds = row.find_elements(By.TAG_NAME, "td")
                                    if len(tds) > date_column_index:
                                        temp_text = tds[date_column_index].text.strip()
                                        if temp_text:
                                            date_text = temp_text
                                            print(f"[DEBUG] ✅ 작성일 컬럼에서 날짜 발견: '{date_text}'", file=sys.stderr)
                                except Exception as e:
                                    if len(all_posts) == 0 and page == 1:
                                        print(f"[DEBUG] 작성일 컬럼 추출 오류: {e}", file=sys.stderr)
                            
                            # [방법 2] SPA 구조: 특정 셀렉터로 날짜 찾기
                            if not date_text:
                                date_selectors = [
                                    # [최우선] 작성일 (네이버 카페 표준)
                                    "td[aria-label*='작성일']",
                                    "div[aria-label*='작성일']",
                                    "span[aria-label*='작성일']",
                                    "*[aria-label*='작성일']",
                                    
                                    # [SPA 최신] 2026년 구조
                                    "span[class*='date']",
                                    "div[class*='date']",
                                    "time",
                                    "span[class*='Date']",
                                    "div[class*='Date']",
                                    
                                    # [구식] 테이블 구조
                                    "td.td_date",
                                    "td.td_normal",  # 일반 게시판 날짜 컬럼
                                    "td[class*='date']",
                                    ".date",
                                    
                                    # [백업] 위치 기반 (제목 다음, 조회수 이전)
                                    "td:nth-child(3)",  # 보통 3번째 컬럼이 작성일
                                    "td:nth-last-child(2)",  # 끝에서 2번째 (조회수 이전)
                                ]
                            
                            if not date_text:
                                for selector in date_selectors:
                                    try:
                                        date_elems = row.find_elements(By.CSS_SELECTOR, selector)
                                        
                                        # [디버깅] 첫 번째 게시글의 날짜 요소 확인
                                        if len(all_posts) == 0 and page == 1 and date_elems:
                                            print(f"[DEBUG] 셀렉터 '{selector}'로 {len(date_elems)}개 요소 발견:", file=sys.stderr)
                                            for i, elem in enumerate(date_elems[:3]):
                                                print(f"  [{i+1}] 텍스트: '{elem.text}'", file=sys.stderr)
                                        
                                        for date_elem in date_elems:
                                            temp_text = date_elem.text.strip() if date_elem else ''
                                            # 날짜 형식만 추출 (숫자 패턴 확인)
                                            if temp_text and (
                                                re.search(r'\d{4}[./]\d{2}[./]\d{2}', temp_text) or 
                                                re.search(r'\d{2}[./]\d{2}', temp_text) or
                                                re.search(r'\d{4}\.\d{2}\.\d{2}', temp_text) or
                                                '오늘' in temp_text or 
                                                '어제' in temp_text or
                                                re.search(r'\d{2}:\d{2}', temp_text)  # 시간 형식
                                            ):
                                                # 댓글수가 아닌지 확인
                                                if '댓글' not in temp_text and '[' not in temp_text and '조회' not in temp_text:
                                                    date_text = temp_text
                                                    if len(all_posts) == 0 and page == 1:
                                                        print(f"[DEBUG] ✅ 날짜 발견: '{date_text}' (셀렉터: {selector})", file=sys.stderr)
                                                    break
                                        if date_text:
                                            break
                                    except Exception as e:
                                        if len(all_posts) == 0 and page == 1:
                                            print(f"[DEBUG] 셀렉터 '{selector}' 오류: {e}", file=sys.stderr)
                                        continue
                            
                            # [방법 3] 행 전체 텍스트에서 날짜 패턴 추출 (Gemini 전략 C)
                            if not date_text:
                                try:
                                    # innerText 전체 가져오기
                                    row_text = row.text
                                    
                                    if len(all_posts) == 0 and page == 1:
                                        print(f"[DEBUG] 행 전체 텍스트:\n{row_text}", file=sys.stderr)
                                    
                                    # "작성일" 근처의 텍스트 우선 확인
                                    if '작성일' in row_text:
                                        match = re.search(r'작성일[^\d]*([\d.:/-]+)', row_text)
                                        if match:
                                            date_text = match.group(1)
                                            if len(all_posts) == 0 and page == 1:
                                                print(f"[DEBUG] ✅ '작성일' 근처에서 날짜 발견: '{date_text}'", file=sys.stderr)
                                    
                                    # Gemini 제안: 다양한 날짜 패턴 (상대적 시간 포함)
                                    if not date_text:
                                        date_patterns = [
                                            (r'\d{4}\.\d{2}\.\d{2}', '완전 날짜'),      # 2024.01.15
                                            (r'\d{4}-\d{2}-\d{2}', '완전 날짜'),        # 2024-01-15
                                            (r'\d{2}\.\d{2}\.', '월일 날짜'),           # 01.15.
                                            (r'\d{2}\.\d{2}(?!\d)', '월일 날짜'),       # 01.15 (뒤에 숫자 없음)
                                            (r'\d{2}/\d{2}', '월일 슬래시'),            # 01/15
                                            (r'\d{1,2}:\d{2}', '시간'),                 # 14:30 또는 9:15
                                            (r'\d+시간\s*전', '상대 시간'),              # 2시간 전
                                            (r'\d+분\s*전', '상대 분'),                 # 30분 전
                                            (r'방금', '방금'),                          # 방금
                                        ]
                                        
                                        # 줄바꿈으로 분리하여 각 줄에서 찾기
                                        lines = row_text.split('\n')
                                        for line in lines:
                                            # 댓글수나 조회수가 아닌 줄에서만 찾기
                                            if '댓글' in line or '조회' in line or '[' in line or ']' in line:
                                                continue
                                            
                                            for pattern, pattern_name in date_patterns:
                                                match = re.search(pattern, line)
                                                if match:
                                                    date_text = match.group(0)
                                                    if len(all_posts) == 0 and page == 1:
                                                        print(f"[DEBUG] ✅ 정규식으로 날짜 발견: '{date_text}' (패턴: {pattern_name}, 라인: '{line[:50]}')", file=sys.stderr)
                                                    break
                                            if date_text:
                                                break
                                    
                                    # 상대적 날짜
                                    if not date_text:
                                        if '오늘' in row_text:
                                            date_text = '오늘'
                                        elif '어제' in row_text:
                                            date_text = '어제'
                                        elif '방금' in row_text:
                                            date_text = '방금'
                                except Exception as e:
                                    if len(all_posts) == 0 and page == 1:
                                        print(f"[DEBUG] 정규식 추출 오류: {e}", file=sys.stderr)
                            
                            # [전문가 검증] 날짜 없으면 API 우선 → 실패 시 상세 페이지
                            if not date_text:
                                # 1단계: Article API로 날짜 확보 시도 (가장 빠름)
                                print(f"[Naver Cafe Crawler] 날짜 없음 - API 확인 시도. 제목: '{title[:30]}...'", file=sys.stderr)
                                
                                # clubid 추출 (이미 추출되어 있어야 함)
                                api_clubid = None
                                if '/cafes/' in normalized_url:
                                    match = re.search(r'/cafes/(\d+)/', normalized_url)
                                    if match:
                                        api_clubid = match.group(1)
                                elif 'clubid=' in normalized_url:
                                    match = re.search(r'clubid=(\d+)', normalized_url)
                                    if match:
                                        api_clubid = match.group(1)
                                
                                if api_clubid and post_id:
                                    api_info = self.get_article_info_from_api(api_clubid, post_id)
                                    if api_info and api_info.get('date'):
                                        date_text = str(api_info.get('date'))
                                        print(f"[Naver Cafe Crawler] ✅ API에서 날짜 발견: '{date_text}'", file=sys.stderr)
                                        # API에서 본문도 가져왔으면 저장
                                        if api_info.get('content'):
                                            detail_info = api_info
                                
                                # 2단계: API 실패 시 상세 페이지 접근
                                if not date_text:
                                    print(f"[Naver Cafe Crawler] API 실패 - 상세 페이지 접근. 제목: '{title[:30]}...'", file=sys.stderr)
                                    try:
                                        # 현재 URL 저장
                                        current_list_url = self.driver.current_url
                                        
                                        # 상세 페이지로 이동
                                        self.driver.get(normalized_url)
                                        time.sleep(2)
                                        
                                        # iframe 전환 (필요시)
                                        if '/f-e/' not in normalized_url:
                                            self.switch_to_iframe_if_needed()
                                        
                                        # [최적화] 상세 페이지에서 날짜, 본문, 댓글 모두 수집
                                        # (어차피 상세 페이지에 왔으니 모든 정보 수집)
                                        detail_info = self.crawl_article_detail(normalized_url, post_id)
                                        
                                        if detail_info and detail_info.get('date'):
                                            date_text = detail_info.get('date', '')
                                            print(f"[Naver Cafe Crawler] ✅ 상세 페이지에서 정보 수집 완료: 날짜='{date_text}', 본문={len(detail_info.get('content', ''))}자", file=sys.stderr)
                                        else:
                                            # crawl_article_detail이 실패한 경우, 날짜만이라도 찾기
                                            detail_date_selectors = [
                                                ".article_date",
                                                ".date_time",
                                                "span.date",
                                                "div.date",
                                                "time",
                                                "*[class*='Date']",
                                                "*[class*='date']"
                                            ]
                                            
                                            for selector in detail_date_selectors:
                                                try:
                                                    date_elem = self.driver.find_element(By.CSS_SELECTOR, selector)
                                                    if date_elem:
                                                        temp_text = date_elem.text.strip()
                                                        if temp_text and re.search(r'\d{4}\.\d{2}\.\d{2}|\d{2}\.\d{2}|\d{2}:\d{2}', temp_text):
                                                            date_text = temp_text
                                                            print(f"[Naver Cafe Crawler] ✅ 상세 페이지에서 날짜 발견: '{date_text}'", file=sys.stderr)
                                                            break
                                                except:
                                                    continue
                                        
                                        # 리스트로 복귀
                                        try:
                                            self.driver.get(current_list_url)
                                            time.sleep(2)
                                            if '/f-e/' not in current_list_url:
                                                self.switch_to_iframe_if_needed()
                                        except Exception as e:
                                            print(f"[Naver Cafe Crawler] ⚠️ 리스트 복귀 오류: {e}", file=sys.stderr)
                                
                                    except Exception as e:
                                        print(f"[Naver Cafe Crawler] ⚠️ 상세 페이지 접근 오류: {e}", file=sys.stderr)
                                        # 검색 결과로 돌아가기 시도
                                        try:
                                            self.driver.get(current_list_url)
                                            time.sleep(2)
                                            if '/f-e/' not in current_list_url:
                                                self.switch_to_iframe_if_needed()
                                        except:
                                            pass
                                
                                # 상세 페이지에서도 날짜 못 찾으면 스킵
                                if not date_text and not detail_info:
                                    print(f"[Naver Cafe Crawler] ⚠️ 상세 페이지에서도 날짜 없음 - 게시글 스킵. 제목: '{title[:30]}...'", file=sys.stderr)
                                    continue
                            
                            # 날짜 파싱
                            date_val = self.parse_date_from_text(date_text)
                            if not date_val:
                                print(f"[Naver Cafe Crawler] ⚠️ 날짜 파싱 실패 - 게시글 스킵. 제목: '{title[:30]}...', 날짜 텍스트: '{date_text}'", file=sys.stderr)
                                continue
                            
                            # 날짜 필터링 (24시간 범위 체크)
                            if date_val > end_date:
                                print(f"[Naver Cafe Crawler] ⏭️ 미래 날짜 스킵: {date_val.strftime('%Y-%m-%d %H:%M')} > {end_date.strftime('%Y-%m-%d %H:%M')}", file=sys.stderr)
                                continue
                            
                            if date_val < start_date:
                                print(f"[Naver Cafe Crawler] ⏸️ 24시간 이전 게시글 발견 - 이 카페에서 중단", file=sys.stderr)
                                print(f"   게시글 날짜: {date_val.strftime('%Y-%m-%d %H:%M')} < 시작: {start_date.strftime('%Y-%m-%d %H:%M')}", file=sys.stderr)
                                print(f"[Naver Cafe Crawler] 💡 다른 카페에서 계속 수집합니다...", file=sys.stderr)
                                page_should_continue = False
                                should_continue_page = False
                                break
                            
                            # 키워드 필터링 (제목에 키워드 포함 확인)
                            if keyword.lower() not in title.lower():
                                continue
                            
                            # [최적화] detail_info가 있으면 그대로 사용
                            if detail_info:
                                post_data = {
                                    'post_id': post_id,
                                    'url': normalized_url,
                                    'title': title,
                                    'date': date_val.isoformat(),
                                    'content': detail_info.get('content', ''),
                                    'viewCount': detail_info.get('viewCount', 0),
                                    'nickname': detail_info.get('nickname', 'Unknown'),
                                    'member_id': detail_info.get('member_id'),
                                    'board_name': detail_info.get('board_name', ''),
                                    'comments': detail_info.get('comments', []),
                                    'commentCount': len(detail_info.get('comments', [])),
                                    'cafe_url': cafe_url,
                                    'keyword': keyword
                                }
                                all_posts.append(post_data)
                                print(f"[Naver Cafe Crawler] ✅ 게시글 완전 수집: {title[:50]}... (날짜: {date_val.strftime('%Y-%m-%d')}, 본문: {len(post_data.get('content', ''))}자, 조회: {post_data.get('viewCount', 0)}, 댓글: {post_data.get('commentCount', 0)}개)", file=sys.stderr)
                            else:
                                # 상세 정보 없으면 기본 정보만 저장 (나중에 상세 수집)
                                board_name = ''
                                nickname = 'Unknown'
                                view_count = 0
                                
                                try:
                                    board_elem = row.find_element(By.CSS_SELECTOR, "a.board_name, td.td_board a, a[href*='/menus/']")
                                    board_name = board_elem.text.strip()
                                except:
                                    pass
                                
                                try:
                                    nickname_elem = row.find_element(By.CSS_SELECTOR, "a[class*='Nickname'], .nick a, td.td_name a, a[class*='Writer'], .writer a")
                                    nickname = nickname_elem.text.strip()
                                    nickname = re.sub(r'\s*님의.*', '', nickname)
                                except:
                                    pass
                                
                                # 조회수 추출 (목록 페이지)
                                try:
                                    view_selectors = [
                                        "td.td_view",
                                        "span.view",
                                        "*[class*='view']",
                                        "*[class*='View']"
                                    ]
                                    for selector in view_selectors:
                                        try:
                                            view_elem = row.find_element(By.CSS_SELECTOR, selector)
                                            text = view_elem.text.strip()
                                            match = re.search(r'(\d+)', text.replace(',', ''))
                                            if match:
                                                view_count = int(match.group(1))
                                                break
                                        except:
                                            continue
                                except:
                                    pass
                                
                                all_posts.append({
                                    'post_id': post_id,
                                    'url': normalized_url,
                                    'title': title,
                                    'date': date_val.isoformat(),
                                    'viewCount': view_count,
                                    'nickname': nickname,
                                    'board_name': board_name,
                                    'cafe_url': cafe_url,
                                    'keyword': keyword
                                })
                                print(f"[Naver Cafe Crawler] ✅ 게시글 수집 (기본): {title[:50]}... (날짜: {date_val.strftime('%Y-%m-%d')}, 조회: {view_count})", file=sys.stderr)
                            
                        except Exception as e:
                            import traceback
                            print(f"[Naver Cafe Crawler] 게시글 파싱 오류: {e}", file=sys.stderr)
                            print(f"[Naver Cafe Crawler] 트레이스백: {traceback.format_exc()}", file=sys.stderr)
                            continue
                    
                    if not page_should_continue:
                        print(f"[Naver Cafe Crawler] 페이지 {page}에서 24시간 이전 게시글 발견 - 다음 페이지 스킵", file=sys.stderr)
                        break
                
                keyword_posts_count = len([p for p in all_posts if p.get('keyword') == keyword])
                print(f"[Naver Cafe Crawler] 키워드 '{keyword}': 페이지 {page}까지 {keyword_posts_count}개 수집", file=sys.stderr)
                
                if not should_continue_page:
                    print(f"[Naver Cafe Crawler] ⏸️ 키워드 '{keyword}': 이 카페에서 24시간 이내 게시글 모두 수집", file=sys.stderr)
                    break
                
                # 키워드 간 딜레이 (단축)
                time.sleep(1)
            
            print(f"[Naver Cafe Crawler] 📊 이 카페 수집 결과: 총 {len(all_posts)}개 (24시간 이내)", file=sys.stderr)
            
            if len(all_posts) == 0:
                print(f"[Naver Cafe Crawler] ⚠️ 이 카페에서 수집된 게시글 없음", file=sys.stderr)
                print(f"  - 키워드: {keywords}", file=sys.stderr)
                print(f"  - 날짜 범위: {start_date.strftime('%Y-%m-%d %H:%M')} ~ {end_date.strftime('%Y-%m-%d %H:%M')}", file=sys.stderr)
                print(f"  💡 다른 카페로 이동합니다...", file=sys.stderr)
            else:
                print(f"[Naver Cafe Crawler] 📊 키워드별 수집:", file=sys.stderr)
                for keyword in keywords:
                    keyword_count = len([p for p in all_posts if p.get('keyword') == keyword])
                    if keyword_count > 0:
                        print(f"  - '{keyword}': {keyword_count}개", file=sys.stderr)
            
            return all_posts
            
        except Exception as e:
            import traceback
            print(f"[Naver Cafe Crawler] 목록 수집 오류: {e}", file=sys.stderr)
            print(f"[Naver Cafe Crawler] 트레이스백: {traceback.format_exc()}", file=sys.stderr)
            return all_posts
    
    def crawl_article_detail(self, article_url: str, post_id: str = None) -> Optional[Dict]:
        """
        게시글 상세 수집 (본문 + 댓글)
        
        Args:
            article_url: 정규화된 게시글 URL
            post_id: 게시글 ID (없으면 URL에서 추출)
        
        Returns:
            {'content': '...', 'member_id': '...', 'comments': [...]}
        """
        if not self.driver:
            return None
        
        try:
            # URL 정규화
            normalized_url = self.normalize_article_url(article_url)
            if not normalized_url:
                return None
            
            # clubid, articleid 추출 (SPA 및 PC 표준 모두 지원)
            clubid = None
            articleid = None
            
            # SPA 형식: /f-e/cafes/123456/articles/789012
            spa_match = re.search(r'/cafes/(\d+)/articles/(\d+)', normalized_url)
            if spa_match:
                clubid, articleid = spa_match.groups()
            else:
                # PC 표준 형식: clubid=123456&articleid=789012
                match = re.search(r'clubid=(\d+)', normalized_url)
                clubid = match.group(1) if match else None
                
                match = re.search(r'articleid=(\d+)', normalized_url)
                articleid = match.group(1) if match else post_id
            
            if not clubid or not articleid:
                return None
            
            # 상세 페이지 이동
            self.driver.get(normalized_url)
            time.sleep(random.uniform(1, 2))
            
            # [전문가 검증] PC 표준 URL은 무조건 iframe 전환
            if 'ArticleRead.nhn' in normalized_url:
                self.switch_to_iframe_if_needed()
                print("[Naver Cafe Crawler] PC 표준 URL - iframe 전환 완료", file=sys.stderr)
            else:
                # SPA 방식도 iframe이 있으면 전환 시도
                try:
                    iframe = self.driver.find_element(By.ID, "cafe_main")
                    self.driver.switch_to.frame(iframe)
                    print("[Naver Cafe Crawler] SPA URL - iframe 발견 및 전환", file=sys.stderr)
                except:
                    print("[Naver Cafe Crawler] SPA URL - iframe 없음", file=sys.stderr)
                    pass
            
            time.sleep(1)  # 콘텐츠 로딩 대기
            
            # 본문 추출 (2026년 최신 SPA 포함)
            content = ''
            selectors = [
                # [최신] 2026년 SPA 방식
                'div[class*="ArticleContentBox"]',
                'div.article-board',
                'div[class*="article_container"]',
                
                # [일반] 스마트에디터
                '.se-main-container',
                
                # [구식] PC 표준
                '#articleBody',
                'div.article_viewer',
                '.article_viewer',
                '.view_content',
                
                # [백업]
                'div[class*="content"]',
                'article',
                '.article'
            ]
            
            for selector in selectors:
                try:
                    elem = self.driver.find_element(By.CSS_SELECTOR, selector)
                    content = elem.text.strip()
                    if len(content) > 100:
                        break
                except:
                    continue
            
            # 치유일기 고정 안내문 제거 (옵션)
            if '치유일기' in content[:200] and '고정' in content[:200]:
                lines = content.split('\n')
                content = '\n'.join([l for l in lines if '고정' not in l and '안내' not in l])
            
            # 조회수 추출
            view_count = 0
            view_selectors = [
                ".count",
                ".view_count",
                "span.count",
                "span[class*='view']",
                "em.num",
                "*[class*='ViewCount']",
                "*[class*='viewCount']"
            ]
            
            for selector in view_selectors:
                try:
                    elem = self.driver.find_element(By.CSS_SELECTOR, selector)
                    text = elem.text.strip()
                    # 숫자만 추출
                    match = re.search(r'(\d+)', text.replace(',', ''))
                    if match:
                        view_count = int(match.group(1))
                        break
                except:
                    continue
            
            # 조회수를 못 찾았으면 페이지 텍스트에서 검색
            if view_count == 0:
                try:
                    page_text = self.driver.find_element(By.TAG_NAME, "body").text
                    # "조회 123" 또는 "조회수 123" 패턴
                    match = re.search(r'조회\s*수?\s*[:\s]*(\d+)', page_text)
                    if match:
                        view_count = int(match.group(1).replace(',', ''))
                except:
                    pass
            
            # 날짜 추출 (상세 페이지)
            date_text = ''
            date_selectors = [
                ".article_date",
                ".date_time",
                "span.date",
                "div.date",
                "time",
                "*[class*='Date']",
                "*[class*='date']",
                ".writer_info .date",
                ".article_info .date"
            ]
            
            for selector in date_selectors:
                try:
                    elem = self.driver.find_element(By.CSS_SELECTOR, selector)
                    text = elem.text.strip()
                    # 날짜 패턴 확인
                    if text and re.search(r'\d{4}[.-/]\d{2}[.-/]\d{2}|\d{2}[.-/]\d{2}|\d{1,2}:\d{2}', text):
                        date_text = text
                        break
                except:
                    continue
            
            # API로 작성자 정보 추출
            author_info = self.extract_member_id_from_api(clubid, articleid)
            member_id = author_info.get('member_id') if author_info else None
            nickname = author_info.get('nickname') if author_info else 'Unknown'
            
            # 댓글 수집 (API 우선)
            comments = self.crawl_comments_via_api(clubid, articleid)
            
            return {
                'content': content,
                'date': date_text,
                'viewCount': view_count,
                'member_id': member_id,
                'nickname': nickname,
                'comments': comments,
                'clubid': clubid,
                'articleid': articleid
            }
            
        except Exception as e:
            print(f"[Naver Cafe Crawler] 상세 수집 오류: {e}", file=sys.stderr)
            return None
    
    def crawl_comments_via_api(self, clubid: str, articleid: str) -> List[Dict]:
        """댓글 수집 (API 우회)"""
        comments = []
        try:
            comment_url = f"https://cafe.naver.com/CommentView.nhn?search.clubid={clubid}&search.articleid={articleid}"
            response = self.session.get(comment_url, timeout=10)
            
            if response.status_code != 200:
                return comments
            
            # JSON 또는 JSONP 파싱
            text = response.text
            if text.startswith('callback('):
                text = text[8:-1]  # JSONP 제거
            
            data = json.loads(text)
            
            # 댓글 항목 추출 (구조에 따라 조정 필요)
            comment_list = []
            if 'result' in data and 'commentList' in data['result']:
                comment_list = data['result']['commentList']
            elif 'commentList' in data:
                comment_list = data['commentList']
            elif 'comments' in data:
                comment_list = data['comments']
            
            for cmt in comment_list:
                writer_id = (
                    cmt.get('writerId') or
                    cmt.get('memberKey') or
                    cmt.get('userKey') or
                    cmt.get('id') or
                    None
                )
                
                nickname = (
                    cmt.get('nickname') or
                    cmt.get('nickName') or
                    cmt.get('displayName') or
                    'Unknown'
                )
                
                content = cmt.get('content') or cmt.get('text') or ''
                
                if writer_id and content:
                    comments.append({
                        'writer_id': str(writer_id),
                        'nickname': nickname,
                        'content': content
                    })
            
        except Exception as e:
            print(f"[Naver Cafe Crawler] 댓글 수집 오류: {e}", file=sys.stderr)
        
        return comments
    
    def close(self):
        """브라우저 종료 (안전한 종료)"""
        if self.driver:
            try:
                # 기본 컨텍스트로 전환
                try:
                    self.driver.switch_to.default_content()
                except:
                    pass
                
                # 브라우저 종료
                try:
                    self.driver.quit()
                except Exception as e:
                    print(f"[Naver Cafe Crawler] 브라우저 종료 중 오류 (무시 가능): {e}", file=sys.stderr)
                
                # 추가 정리
                import time
                time.sleep(0.5)
                
            except Exception as e:
                print(f"[Naver Cafe Crawler] 브라우저 종료 오류 (무시 가능): {e}", file=sys.stderr)
            finally:
                self.driver = None
