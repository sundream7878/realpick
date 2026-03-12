"""
자동 댓글 등록 모듈
- undetected_chromedriver로 봇 탐지 우회
- 사람처럼 랜덤 딜레이, 타이핑 속도 시뮬레이션
- 사이트별 댓글 폼 자동 감지
"""
import sys
import os
import time
import random
import json
import pickle
from typing import Optional
from urllib.parse import urlparse
from dotenv import load_dotenv

try:
    import undetected_chromedriver as uc
    from selenium.webdriver.common.by import By
    from selenium.webdriver.common.keys import Keys
    from selenium.webdriver.common.action_chains import ActionChains
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    HAS_SELENIUM = True
except ImportError:
    HAS_SELENIUM = False


COOKIE_DIR = os.path.join(os.path.dirname(__file__), '..', 'cookies')


class AutoCommenter:
    """사이트별 자동 댓글 등록 (사람처럼 동작)"""

    SITE_MAP = {
        'dcinside.com':  'dcinside',
        'fmkorea.com':   'fmkorea',
        'clien.net':     'clien',
        'pann.nate.com': 'nate',
        'ruliweb.com':   'ruliweb',
        'ppomppu.co.kr': 'ppomppu',
        'cafe.naver.com':'mamacafe',
    }

    def __init__(self, headless: bool = False):
        # 환경 변수 강제 로드 (안전장치)
        try:
            # crawler/modules/auto_commenter.py -> crawler/modules -> crawler -> realpick-marketing-bot
            current_dir = os.path.dirname(os.path.abspath(__file__))
            bot_root = os.path.dirname(os.path.dirname(os.path.dirname(current_dir))) 
            # 위 경로는 실행 위치에 따라 다를 수 있으므로, 상대 경로로 .env.local을 찾음
            # 일반적으로 realpick-marketing-bot/.env.local 위치임
            
            # 더 확실한 방법: 상위 디렉토리를 탐색하며 .env.local 찾기
            search_dir = current_dir
            found_env = False
            for _ in range(4): # 최대 4단계 상위까지 탐색
                env_candidate = os.path.join(search_dir, '.env.local')
                if os.path.exists(env_candidate):
                    load_dotenv(env_candidate, override=True)
                    # print(f"[AutoCommenter] .env.local 로드됨: {env_candidate}", file=sys.stderr)
                    found_env = True
                    break
                search_dir = os.path.dirname(search_dir)
            
            if not found_env:
                # 하드코딩된 경로 시도 (F:\realpick\realpick-marketing-bot\.env.local)
                fixed_path = os.path.join("F:\\", "realpick", "realpick-marketing-bot", ".env.local")
                if os.path.exists(fixed_path):
                    load_dotenv(fixed_path, override=True)
        except Exception as e:
            print(f"[AutoCommenter] 환경변수 로드 중 오류: {e}", file=sys.stderr)

        self.headless = headless
        self.driver: Optional[any] = None
        os.makedirs(COOKIE_DIR, exist_ok=True)

    # ──────────────────────────────────────────────
    # 브라우저 관리
    # ──────────────────────────────────────────────
    def start_browser(self) -> bool:
        if not HAS_SELENIUM:
            print("[AutoCommenter] undetected_chromedriver 미설치", file=sys.stderr)
            return False
        
        # 이전 드라이버가 남아있다면 정리
        if self.driver:
            self.close()

        try:
            # 드라이버 생성 시도 (재시도 로직 추가)
            max_retries = 2
            for attempt in range(max_retries):
                try:
                    # 옵션 객체를 루프 안에서 매번 새로 생성해야 함 (재사용 시 오류 발생 방지)
                    options = uc.ChromeOptions()
                    options.page_load_strategy = 'eager'  # 핵심: 리소스 로딩 완료를 기다리지 않음 (렌더러 타임아웃 방지)
                    
                    if self.headless:
                        options.add_argument("--headless=new")
                    
                    options.add_argument("--no-sandbox")
                    options.add_argument("--disable-dev-shm-usage")
                    options.add_argument("--disable-gpu")
                    options.add_argument("--disable-blink-features=AutomationControlled")
                    options.add_argument("--window-size=1280,900")
                    
                    # 렌더러 타임아웃 방지용 추가 플래그
                    options.add_argument("--disable-renderer-backgrounding")
                    options.add_argument("--disable-background-timer-throttling")
                    options.add_argument("--disable-backgrounding-occluded-windows")
                    options.add_argument("--disable-client-side-phishing-detection")
                    options.add_argument("--disable-crash-reporter")
                    options.add_argument("--disable-oopr-debug-crash-dump")
                    options.add_argument("--no-crash-upload")
                    options.add_argument("--disable-extensions")
                    options.add_argument("--disable-popup-blocking")

                    # 한국어 로케일
                    options.add_argument("--lang=ko-KR")
                    options.add_experimental_option("prefs", {"intl.accept_languages": "ko,ko_KR"})

                    # 현재 설치된 크롬 버전(145)에 맞춰 드라이버 버전을 명시하여 생성 (버전 불일치 에러 방지)
                    self.driver = uc.Chrome(options=options, version_main=145)
                    break
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise e
                    print(f"[AutoCommenter] 브라우저 시작 재시도 ({attempt + 1}/{max_retries})... ({e})", file=sys.stderr)
                    time.sleep(2)

            if self.driver:
                self.driver.set_page_load_timeout(30)
                print("[AutoCommenter] 브라우저 시작 완료", file=sys.stderr)
                return True
            return False
        except Exception as e:
            print(f"[AutoCommenter] 브라우저 시작 실패: {e}", file=sys.stderr)
            return False

    def close(self):
        try:
            if self.driver:
                # undetected_chromedriver의 quit() 시 발생하는 WinError 6 대응
                try:
                    self.driver.close()
                except Exception:
                    pass
                
                try:
                    self.driver.quit()
                except OSError as e:
                    if "WinError 6" in str(e):
                        print("[AutoCommenter] 브라우저 종료 중 무시된 오류 (WinError 6)", file=sys.stderr)
                    else:
                        raise e
                except Exception:
                    pass
                finally:
                    self.driver = None
        except Exception:
            pass

    # ──────────────────────────────────────────────
    # 쿠키 저장/로드
    # ──────────────────────────────────────────────
    def _cookie_path(self, site_id: str) -> str:
        return os.path.join(COOKIE_DIR, f"{site_id}_cookies.pkl")

    def save_cookies(self, site_id: str):
        try:
            cookies = self.driver.get_cookies()
            with open(self._cookie_path(site_id), 'wb') as f:
                pickle.dump(cookies, f)
            print(f"[AutoCommenter] {site_id} 쿠키 저장 완료", file=sys.stderr)
        except Exception as e:
            print(f"[AutoCommenter] 쿠키 저장 실패: {e}", file=sys.stderr)

    def load_cookies(self, site_id: str, base_url: str) -> bool:
        path = self._cookie_path(site_id)
        if not os.path.exists(path):
            return False
        try:
            self.driver.get(base_url)
            self._human_wait(1, 2)
            with open(path, 'rb') as f:
                cookies = pickle.load(f)
            for cookie in cookies:
                try:
                    self.driver.add_cookie(cookie)
                except Exception:
                    pass
            self.driver.refresh()
            self._human_wait(1.5, 3)
            print(f"[AutoCommenter] {site_id} 쿠키 로드 완료", file=sys.stderr)
            return True
        except Exception as e:
            print(f"[AutoCommenter] 쿠키 로드 실패: {e}", file=sys.stderr)
            return False

    # ──────────────────────────────────────────────
    # 사람처럼 동작하는 헬퍼
    # ──────────────────────────────────────────────
    def _human_wait(self, min_sec: float = 0.5, max_sec: float = 2.0):
        time.sleep(random.uniform(min_sec, max_sec))

    def _human_type(self, element, text: str):
        """사람처럼 한 글자씩 타이핑 (랜덤 딜레이)"""
        try:
            # ChromeDriver BMP 에러 방지: 이모지 등 4바이트 문자 제거
            # (ChromeDriver는 기본적으로 BMP 범위 외부 문자를 send_keys로 전송할 수 없음)
            clean_text = "".join(c for c in text if ord(c) <= 0xFFFF)
            if len(clean_text) < len(text):
                print(f"[AutoCommenter] ⚠️ 이모지 등 BMP 외부 문자 제거됨 ({len(text)} -> {len(clean_text)})", file=sys.stderr)
            text = clean_text

            # 클릭이 가로막히는 경우(label 등)를 대비해 자바스크립트로 강제 클릭/포커스
            self.driver.execute_script("arguments[0].click();", element)
            self.driver.execute_script("arguments[0].focus();", element)
        except Exception:
            element.click()
            
        self._human_wait(0.3, 0.8)
        for char in text:
            element.send_keys(char)
            time.sleep(random.uniform(0.04, 0.15))
        self._human_wait(0.5, 1.5)

    def _scroll_to_element(self, element):
        """요소까지 자연스럽게 스크롤"""
        try:
            self.driver.execute_script(
                "arguments[0].scrollIntoView({behavior:'smooth', block:'center'});", element
            )
            self._human_wait(0.8, 1.5)
        except Exception:
            pass

    def _safe_find(self, selectors: list, timeout: int = 8):
        """여러 셀렉터 중 존재하는 첫 번째 요소 반환"""
        wait = WebDriverWait(self.driver, timeout)
        for selector_type, selector in selectors:
            try:
                el = wait.until(EC.presence_of_element_located((selector_type, selector)))
                if el and el.is_displayed():
                    return el
            except Exception:
                continue
        return None

    # ──────────────────────────────────────────────
    # 사이트 감지
    # ──────────────────────────────────────────────
    def detect_site(self, url: str) -> str:
        host = urlparse(url).netloc.lower()
        for domain, site_id in self.SITE_MAP.items():
            if domain in host:
                return site_id
        
        # 추가 감지 로직 (dcinside 갤러리 서브도메인 대응)
        if 'dcinside.com' in host:
            return 'dcinside'
            
        return 'unknown'

    # ──────────────────────────────────────────────
    # 메인 댓글 등록 함수
    # ──────────────────────────────────────────────
    def manual_login(self, url: str, site_id: str) -> dict:
        """수동 로그인을 위해 브라우저를 띄우고 사용자가 로그인할 때까지 대기"""
        if not self.driver:
            # 수동 로그인을 위해 headless 모드 강제 해제
            self.headless = False
            if not self.start_browser():
                return {'success': False, 'error': '브라우저 시작 실패'}

        print(f"[AutoCommenter] {site_id} 수동 로그인 모드 시작. 브라우저에서 로그인을 완료해주세요.", file=sys.stderr)
        self.driver.get(url)
        
        # 사용자가 로그인을 완료할 때까지 대기 (최대 5분)
        # 로그아웃 버튼이나 내 정보 버튼이 나타나면 로그인 성공으로 간주
        success_selectors = {
            'clien': '.link_logout, .menu_my',
            'dcinside': '.link_logout, .btn_logout',
            'fmkorea': '.btn_logout, a[href*="logout"]',
            'ppomppu': 'a[href*="logout"]',
            'nate': 'a[href*="logout"]',
            'ruliweb': 'a[href*="logout"]',
            'mamacafe': '.gnb_btn_login', # 네이버는 복잡하므로 시간 대기 위주
        }
        
        selector = success_selectors.get(site_id, 'a[href*="logout"]')
        
        start_time = time.time()
        while time.time() - start_time < 300: # 5분 대기
            try:
                if self._safe_find([(By.CSS_SELECTOR, selector)], timeout=2):
                    print(f"[AutoCommenter] {site_id} 로그인 감지 완료!", file=sys.stderr)
                    self.save_cookies(site_id)
                    return {'success': True, 'message': f'{site_id} 쿠키 저장 완료'}
            except Exception:
                pass
            time.sleep(2)
            
        return {'success': False, 'error': '로그인 대기 시간 초과'}

    def post_comment(self, url: str, comment_text: str, site_id: str = None) -> dict:
        if not self.driver:
            if not self.start_browser():
                return {'success': False, 'error': '브라우저 시작 실패'}

        if not site_id:
            site_id = self.detect_site(url)

        print(f"[AutoCommenter] 댓글 등록 시작: [{site_id}] {url[:60]}", file=sys.stderr)

        handlers = {
            'dcinside': self._post_dcinside,
            'fmkorea':  self._post_fmkorea,
            'clien':    self._post_clien,
            'nate':     self._post_nate,
            'ruliweb':  self._post_ruliweb,
            'ppomppu':  self._post_ppomppu,
            'mamacafe': self._post_naver_cafe,
        }

        handler = handlers.get(site_id)
        if not handler:
            return {'success': False, 'error': f'지원하지 않는 사이트: {site_id}'}

        try:
            return handler(url, comment_text)
        except Exception as e:
            import traceback
            print(f"[AutoCommenter] 오류: {e}", file=sys.stderr)
            print(traceback.format_exc(), file=sys.stderr)
            return {'success': False, 'error': str(e)}

    # ──────────────────────────────────────────────
    # 디시인사이드
    # ──────────────────────────────────────────────
    def _post_dcinside(self, url: str, text: str) -> dict:
        site_id = 'dcinside'
        id_ = os.environ.get('DC_ID', '')
        pw_ = os.environ.get('DC_PW', '')

        try:
            self.driver.get(url)
        except Exception as e:
            print(f"[AutoCommenter] 페이지 이동 중 타임아웃/오류 발생 (무시하고 진행): {e}", file=sys.stderr)
            # 타임아웃이 발생해도 DOM이 일부 로드되었으면 진행 가능할 수 있음

        self._human_wait(2, 4)

        # 로그인 시도 (쿠키 우선)
        if id_ and pw_:
            # 현재 페이지가 이미 로그인된 상태인지 확인
            if self._safe_find([(By.CSS_SELECTOR, '.link_logout, .btn_logout')], timeout=2):
                pass # 이미 로그인됨
            else:
                # 쿠키 로드 시도
                logged = self.load_cookies(site_id, url) # base_url을 현재 url로 변경하여 해당 갤러리에서 쿠키 적용
                if not logged:
                    # 쿠키 없으면 로그인 페이지로 이동하여 로그인 후 복귀
                    self._login_dcinside(id_, pw_)
                    self.driver.get(url) # 로그인 후 다시 원글로 이동
                    self._human_wait(2, 3)

        # 댓글창까지 스크롤
        self._human_wait(1, 2)
        
        # URL에서 게시글 번호(no) 추출 시도
        post_no = None
        try:
            parsed = urlparse(url)
            from urllib.parse import parse_qs
            qs = parse_qs(parsed.query)
            if 'no' in qs:
                post_no = qs['no'][0]
        except:
            pass
            
        selectors = []
        # 1. 게시글 번호 기반의 정확한 ID 셀렉터 (가장 우선순위 높음)
        if post_no:
            selectors.append((By.ID, f'memo_{post_no}'))
            
        # 2. 일반적인 셀렉터들
        selectors.extend([
            (By.CSS_SELECTOR, 'textarea[id^="memo_"]'), # 디시인사이드 특유의 memo_숫자 ID 대응
            (By.CSS_SELECTOR, 'textarea.tx'),
            (By.CSS_SELECTOR, '#comment_memo'),
            (By.CSS_SELECTOR, 'textarea[name="memo"]'),
        ])
        
        comment_box = self._safe_find(selectors)
        if not comment_box:
            return {'success': False, 'error': '댓글창을 찾을 수 없음'}

        self._scroll_to_element(comment_box)
        self._human_type(comment_box, text)

        # 닉네임/비번 (비회원)
        if not id_:
            nick_box = self._safe_find([(By.CSS_SELECTOR, 'input[name="name"]')], timeout=3)
            pw_box = self._safe_find([(By.CSS_SELECTOR, 'input[name="password"]')], timeout=3)
            if nick_box:
                self._human_type(nick_box, '익명')
            if pw_box:
                self._human_type(pw_box, '1234')

        submit = self._safe_find([
            (By.CSS_SELECTOR, 'button.repley_add'), # 디시인사이드 등록 버튼 클래스 추가
            (By.CSS_SELECTOR, 'button.btn_any_register'),
            (By.CSS_SELECTOR, 'button.btn_submit'),
            (By.CSS_SELECTOR, 'input[type="submit"]'),
            (By.CSS_SELECTOR, '.btn_write'),
        ])
        if not submit:
            return {'success': False, 'error': '제출 버튼을 찾을 수 없음'}

        self._scroll_to_element(submit)
        self._human_wait(0.5, 1.2)
        submit.click()
        self._human_wait(2, 3)
        print(f"[AutoCommenter] ✅ 디시인사이드 댓글 등록 완료", file=sys.stderr)
        return {'success': True, 'site': site_id}

    def _login_dcinside(self, id_: str, pw_: str):
        try:
            # 현재 URL 저장
            current_url = self.driver.current_url
            
            # 로그인 페이지로 직접 이동 (팝업 방식 대신)
            self.driver.get('https://sign.dcinside.com/login?s_url=' + current_url)
            self._human_wait(2, 3)
            
            id_input = self._safe_find([(By.CSS_SELECTOR, '#user_id'), (By.NAME, 'user_id')], timeout=5)
            pw_input = self._safe_find([(By.CSS_SELECTOR, '#pw'), (By.NAME, 'pw')], timeout=5)
            
            if id_input and pw_input:
                self._human_type(id_input, id_)
                self._human_type(pw_input, pw_)
                
                login_btn = self._safe_find([(By.CSS_SELECTOR, '#login_ok'), (By.ID, 'login_ok')], timeout=5)
                if login_btn:
                    login_btn.click()
                else:
                    pw_input.send_keys(Keys.RETURN)
                    
                self._human_wait(3, 5)
                self.save_cookies('dcinside')
            else:
                print("[AutoCommenter] 디시 로그인 입력창 못찾음", file=sys.stderr)
                
        except Exception as e:
            print(f"[AutoCommenter] 디시 로그인 실패: {e}", file=sys.stderr)

    # ──────────────────────────────────────────────
    # 에펨코리아
    # ──────────────────────────────────────────────
    def _post_fmkorea(self, url: str, text: str) -> dict:
        site_id = 'fmkorea'
        id_ = os.environ.get('FM_ID', '')
        pw_ = os.environ.get('FM_PW', '')

        self.driver.get(url)
        self._human_wait(2, 4)

        # 로그인 시도 (쿠키 우선)
        if id_ and pw_:
            # 현재 페이지가 이미 로그인된 상태인지 확인
            # 에펨코리아는 로그인 안 된 상태에서 댓글창에 '로그인 해주세요' 문구가 뜸
            login_needed = self._safe_find([(By.CSS_SELECTOR, '.cmt_disable.bd_login')], timeout=2)
            
            if login_needed:
                print(f"[AutoCommenter] {site_id} 로그인 필요 감지. 로그인 시도...", file=sys.stderr)
                # 쿠키 로드 시도
                logged = self.load_cookies(site_id, url)
                
                # 쿠키 로드 후에도 여전히 로그인이 안 되어 있는지 확인 (새로고침은 load_cookies에서 함)
                # load_cookies가 True를 반환해도 실제 세션이 만료되었을 수 있음
                still_login_needed = self._safe_find([(By.CSS_SELECTOR, '.cmt_disable.bd_login')], timeout=2)
                
                if not logged or still_login_needed:
                    print(f"[AutoCommenter] {site_id} 쿠키 만료 또는 없음. 직접 로그인 시도", file=sys.stderr)
                    # 쿠키 없거나 만료됨 -> 로그인 페이지로 이동하여 로그인 후 복귀
                    login_success = self._login_fmkorea(id_, pw_)
                    if not login_success:
                         return {'success': False, 'error': '로그인 실패 (아이디/비번 확인 필요)'}

                    self.driver.get(url) # 로그인 후 다시 원글로 이동
                    self._human_wait(3, 5)
                    
                    # 로그인 재확인
                    if self._safe_find([(By.CSS_SELECTOR, '.cmt_disable.bd_login')], timeout=2):
                        return {'success': False, 'error': '로그인 후에도 권한이 없습니다 (로그인 풀림)'}

        comment_box = self._safe_find([
            (By.CSS_SELECTOR, '.simple_wrt textarea'),
            (By.CSS_SELECTOR, '.comment_write textarea'),
            (By.CSS_SELECTOR, '#comment_memo'),
            (By.CSS_SELECTOR, 'textarea.xe_content'),
            (By.CSS_SELECTOR, 'textarea[name="content"]'),
        ])
        if not comment_box:
            # 로그인 안 된 상태인지 확인
            if self._safe_find([(By.CSS_SELECTOR, '.cmt_disable.bd_login')], timeout=1):
                return {'success': False, 'error': '로그인이 되어있지 않습니다.'}
            return {'success': False, 'error': '댓글창을 찾을 수 없음'}

        self._scroll_to_element(comment_box)
        self._human_type(comment_box, text)

        submit = self._safe_find([
            (By.CSS_SELECTOR, '.simple_wrt input[type="submit"]'),
            (By.CSS_SELECTOR, '.simple_wrt input[type="button"]'),
            (By.CSS_SELECTOR, '.comment_write button[type="submit"]'),
            (By.CSS_SELECTOR, '.btn_comment_write'),
            (By.CSS_SELECTOR, 'input.bd_btn'),
        ])
        if not submit:
            return {'success': False, 'error': '제출 버튼을 찾을 수 없음'}

        self._scroll_to_element(submit)
        self._human_wait(0.5, 1.5)
        submit.click()
        self._human_wait(2, 3)
        print(f"[AutoCommenter] ✅ 에펨코리아 댓글 등록 완료", file=sys.stderr)
        return {'success': True, 'site': site_id}

    def _login_fmkorea(self, id_: str, pw_: str) -> bool:
        try:
            # 현재 URL 저장
            current_url = self.driver.current_url
            
            # 로그인 페이지로 직접 이동 (팝업 방식 대신)
            self.driver.get('https://www.fmkorea.com/index.php?act=dispMemberLoginForm')
            self._human_wait(2, 3)
            
            id_input = self._safe_find([(By.CSS_SELECTOR, 'input[name="user_id"]')], timeout=5)
            pw_input = self._safe_find([(By.CSS_SELECTOR, 'input[name="password"]')], timeout=5)
            
            if id_input and pw_input:
                self._human_type(id_input, id_)
                self._human_type(pw_input, pw_)
                
                # 로그인 버튼 찾기 시도
                login_btn = self._safe_find([
                    (By.CSS_SELECTOR, 'button.login_btn'), 
                    (By.CSS_SELECTOR, 'input[type="submit"]'),
                    (By.CSS_SELECTOR, '.btn_login')
                ], timeout=2)
                
                if login_btn:
                    login_btn.click()
                else:
                    pw_input.send_keys(Keys.RETURN)
                    
                self._human_wait(3, 5)
                
                # 로그인 성공 여부 확인
                # 1. URL이 변경되었는지 (dispMemberLoginForm이 아니거나, act=IS 등으로 변경)
                # 2. 에러 메시지가 있는지
                
                if "dispMemberLoginForm" in self.driver.current_url:
                     # 여전히 로그인 페이지라면 에러 메시지 확인
                    error_msg = self._safe_find([(By.CSS_SELECTOR, '.error_message'), (By.CSS_SELECTOR, '.validation-error')], timeout=1)
                    if error_msg:
                        print(f"[AutoCommenter] 에펨 로그인 실패 메시지: {error_msg.text}", file=sys.stderr)
                        return False
                    
                    # URL은 그대로지만 로그인이 되었을 수도 있으니 로그아웃 버튼 확인
                    if self._safe_find([(By.CSS_SELECTOR, '.btn_logout'), (By.CSS_SELECTOR, 'a[href*="logout"]')], timeout=2):
                        print("[AutoCommenter] 에펨 로그인 성공 (URL 유지)", file=sys.stderr)
                        self.save_cookies(site_id='fmkorea')
                        return True
                        
                    print("[AutoCommenter] 에펨 로그인 실패: 페이지 이동 안함", file=sys.stderr)
                    return False
                
                # URL이 변경됨 -> 성공 가능성 높음
                self.save_cookies(site_id='fmkorea')
                print("[AutoCommenter] 에펨 로그인 성공 (URL 변경)", file=sys.stderr)
                return True

            else:
                print("[AutoCommenter] 에펨 로그인 입력창 못찾음", file=sys.stderr)
                return False
                
        except Exception as e:
            print(f"[AutoCommenter] 에펨 로그인 실패: {e}", file=sys.stderr)
            return False

    # ──────────────────────────────────────────────
    # 클리앙
    # ──────────────────────────────────────────────
    def _post_clien(self, url: str, text: str) -> dict:
        site_id = 'clien'
        # 환경 변수 직접 읽기 시도 (os.environ 대신 .env.local 파일 직접 참조는 어려우므로 기본 os.environ 사용)
        id_ = os.environ.get('CLIEN_ID', '')
        pw_ = os.environ.get('CLIEN_PW', '')

        # 디버깅: 계정 정보 로드 확인
        if not id_ or not pw_:
            print(f"[AutoCommenter] ⚠️ 경고: CLIEN_ID 또는 CLIEN_PW 환경 변수가 비어있습니다. (ID: {id_[:2]}***)", file=sys.stderr)

        # 1. 쿠키 로드 시도
        logged = self.load_cookies(site_id, 'https://www.clien.net')
        
        # 2. 쿠키 로드 후 실제 로그인 상태인지 추가 검증
        if logged:
            self.driver.get('https://www.clien.net/service/board/park') # 아무 게시판이나 접속
            self._human_wait(1, 2)
            # 내 정보나 로그아웃 버튼이 있는지 확인
            if not self._safe_find([(By.CSS_SELECTOR, '.link_logout, .menu_my')], timeout=3):
                print("[AutoCommenter] 클리앙 쿠키가 만료됨. 재로그인 시도", file=sys.stderr)
                logged = False

        # 3. 로그인 안 되어 있으면 로그인 시도
        if not logged and id_ and pw_:
            self._login_clien(id_, pw_)

        self.driver.get(url)
        self._human_wait(2, 4)

        # 4. 댓글창 확인
        comment_box = self._safe_find([
            (By.CSS_SELECTOR, '.comment_write_content textarea'),
            (By.CSS_SELECTOR, '#comment_content'),
            (By.CSS_SELECTOR, 'textarea.input_text'),
            (By.CSS_SELECTOR, '#commentToogleBtn button'), # 클리앙 로그인 유도 버튼
        ])
        
        if not comment_box:
            return {'success': False, 'error': '댓글창을 찾을 수 없음'}

        # 5. 최종 로그인 체크 (댓글창 위치에 로그인 버튼이 있는지)
        if comment_box.tag_name == 'button' or '로그인' in comment_box.text:
            print("[AutoCommenter] ⚠️ 댓글창 로그인 버튼 감지. 직접 로그인 시도", file=sys.stderr)
            try:
                # 버튼 클릭하여 로그인 페이지로 이동
                self.driver.execute_script("arguments[0].click();", comment_box)
                self._human_wait(2, 3)
                
                # 로그인 수행
                if id_ and pw_:
                    self._login_clien(id_, pw_)
                    # 로그인 후 다시 게시글로 이동
                    self.driver.get(url)
                    self._human_wait(2, 4)
                    # 댓글창 다시 찾기
                    comment_box = self._safe_find([
                        (By.CSS_SELECTOR, '.comment_write_content textarea'),
                        (By.CSS_SELECTOR, '#comment_content'),
                        (By.CSS_SELECTOR, 'textarea.input_text'),
                    ])
                    if not comment_box or comment_box.tag_name == 'button':
                        return {'success': False, 'error': '로그인 후에도 댓글창을 사용할 수 없음'}
                else:
                    return {'success': False, 'error': '로그인이 필요하지만 계정 정보가 없음'}
            except Exception as e:
                return {'success': False, 'error': f'로그인 시도 중 오류: {e}'}

        self._scroll_to_element(comment_box)
        self._human_type(comment_box, text)

        submit = self._safe_find([
            (By.CSS_SELECTOR, 'button.submit_comment'),
            (By.CSS_SELECTOR, '.comment_submit button'),
            (By.CSS_SELECTOR, 'button.comment-open'), # 클리앙 제출 버튼 관련 클래스 대응
            (By.XPATH, "//button[contains(@class, 'button_submit')]"),
            (By.XPATH, "//span[contains(text(), '등록')]/parent::button"),
        ])
        if not submit:
            return {'success': False, 'error': '제출 버튼을 찾을 수 없음'}

        self._scroll_to_element(submit)
        self._human_wait(0.5, 1.5)
        submit.click()
        self._human_wait(2, 3)
        print(f"[AutoCommenter] ✅ 클리앙 댓글 등록 완료", file=sys.stderr)
        return {'success': True, 'site': site_id}

    def _login_clien(self, id_: str, pw_: str):
        try:
            # 1. 로그인 페이지 접속 (URL 수정됨)
            self.driver.get('https://www.clien.net/service/auth/login')
            self._human_wait(2, 3)
            
            # 2. 입력창 찾기 (더 다양한 셀렉터 대응)
            id_input = self._safe_find([
                (By.CSS_SELECTOR, 'input[name="userId"]'),
                (By.CSS_SELECTOR, 'input#userId'),
                (By.CSS_SELECTOR, 'input[type="text"]'),
            ], timeout=10)
            
            pw_input = self._safe_find([
                (By.CSS_SELECTOR, 'input[name="userPassword"]'),
                (By.CSS_SELECTOR, 'input#userPassword'),
                (By.CSS_SELECTOR, 'input[type="password"]'),
            ], timeout=10)
            
            if id_input and pw_input:
                # 3. 기존 내용 삭제 후 입력
                id_input.clear()
                self._human_type(id_input, id_)
                
                pw_input.clear()
                self._human_type(pw_input, pw_)
                
                # 4. 로그인 버튼 클릭
                login_submit = self._safe_find([
                    (By.CSS_SELECTOR, 'button.button_login'),
                    (By.CSS_SELECTOR, 'button[type="submit"]'),
                    (By.XPATH, "//button[contains(text(), '로그인')]")
                ], timeout=5)
                
                if login_submit:
                    self._human_wait(0.5, 1.0)
                    login_submit.click()
                else:
                    pw_input.send_keys(Keys.RETURN)
                
                self._human_wait(3, 5)
                
                # 5. 로그인 성공 여부 확인
                if "login" not in self.driver.current_url.lower():
                    print(f"[AutoCommenter] 클리앙 로그인 성공: {self.driver.current_url}", file=sys.stderr)
                    self.save_cookies('clien')
                else:
                    # 캡차나 2단계 인증이 떴을 가능성 확인
                    page_source = self.driver.page_source
                    if "captcha" in page_source.lower() or "g-recaptcha" in page_source.lower():
                        print("[AutoCommenter] ⚠️ 클리앙 로그인 실패: 캡차(Captcha) 발생", file=sys.stderr)
                    elif "2단계 인증" in page_source or "OTP" in page_source:
                        print("[AutoCommenter] ⚠️ 클리앙 로그인 실패: 2단계 인증 필요", file=sys.stderr)
                    else:
                        print(f"[AutoCommenter] ⚠️ 클리앙 로그인 실패: 여전히 로그인 페이지임 ({self.driver.current_url})", file=sys.stderr)
            else:
                print("[AutoCommenter] 클리앙 로그인 입력창을 찾을 수 없음", file=sys.stderr)
        except Exception as e:
            print(f"[AutoCommenter] 클리앙 로그인 예외 발생: {e}", file=sys.stderr)

    # ──────────────────────────────────────────────
    # 뽐뿌
    # ──────────────────────────────────────────────
    def _post_ppomppu(self, url: str, text: str) -> dict:
        site_id = 'ppomppu'
        id_ = os.environ.get('PPOMPPU_ID', '')
        pw_ = os.environ.get('PPOMPPU_PW', '')

        logged = self.load_cookies(site_id, 'https://www.ppomppu.co.kr')
        if not logged and id_ and pw_:
            self._login_ppomppu(id_, pw_)

        self.driver.get(url)
        self._human_wait(2, 4)

        comment_box = self._safe_find([
            (By.CSS_SELECTOR, 'textarea#comment'),
            (By.CSS_SELECTOR, 'textarea[name="comment"]'),
            (By.CSS_SELECTOR, '.reply_write textarea'),
        ])
        if not comment_box:
            return {'success': False, 'error': '댓글창을 찾을 수 없음'}

        self._scroll_to_element(comment_box)
        self._human_type(comment_box, text)

        submit = self._safe_find([
            (By.CSS_SELECTOR, 'input[name="reply_submit"]'),
            (By.CSS_SELECTOR, '.reply_write input[type="submit"]'),
        ])
        if not submit:
            return {'success': False, 'error': '제출 버튼을 찾을 수 없음'}

        self._scroll_to_element(submit)
        self._human_wait(0.8, 1.5)
        submit.click()
        self._human_wait(2, 3)
        print(f"[AutoCommenter] ✅ 뽐뿌 댓글 등록 완료", file=sys.stderr)
        return {'success': True, 'site': site_id}

    def _login_ppomppu(self, id_: str, pw_: str):
        try:
            self.driver.get('https://www.ppomppu.co.kr/login.php')
            self._human_wait(1, 2)
            id_input = self._safe_find([(By.CSS_SELECTOR, 'input[name="id"]')], timeout=5)
            pw_input = self._safe_find([(By.CSS_SELECTOR, 'input[name="pw"]')], timeout=5)
            if id_input and pw_input:
                self._human_type(id_input, id_)
                self._human_type(pw_input, pw_)
                pw_input.send_keys(Keys.RETURN)
                self._human_wait(2, 3)
                self.save_cookies('ppomppu')
        except Exception as e:
            print(f"[AutoCommenter] 뽐뿌 로그인 실패: {e}", file=sys.stderr)

    # ──────────────────────────────────────────────
    # 루리웹
    # ──────────────────────────────────────────────
    def _post_ruliweb(self, url: str, text: str) -> dict:
        site_id = 'ruliweb'
        id_ = os.environ.get('RULIWEB_ID', '')
        pw_ = os.environ.get('RULIWEB_PW', '')

        logged = self.load_cookies(site_id, 'https://www.ruliweb.com')
        if not logged and id_ and pw_:
            self._login_ruliweb(id_, pw_)

        self.driver.get(url)
        self._human_wait(2, 4)

        comment_box = self._safe_find([
            (By.CSS_SELECTOR, '.reply_write_text textarea'),
            (By.CSS_SELECTOR, '#reply_text'),
            (By.CSS_SELECTOR, 'textarea.reply_content'),
        ])
        if not comment_box:
            return {'success': False, 'error': '댓글창을 찾을 수 없음'}

        self._scroll_to_element(comment_box)
        self._human_type(comment_box, text)

        submit = self._safe_find([
            (By.CSS_SELECTOR, '.reply_write_btn button'),
            (By.CSS_SELECTOR, 'button.btn_reply_submit'),
        ])
        if not submit:
            return {'success': False, 'error': '제출 버튼을 찾을 수 없음'}

        self._scroll_to_element(submit)
        self._human_wait(0.5, 1.5)
        submit.click()
        self._human_wait(2, 3)
        print(f"[AutoCommenter] ✅ 루리웹 댓글 등록 완료", file=sys.stderr)
        return {'success': True, 'site': site_id}

    def _login_ruliweb(self, id_: str, pw_: str):
        try:
            self.driver.get('https://user.ruliweb.com/login')
            self._human_wait(1, 2)
            id_input = self._safe_find([(By.CSS_SELECTOR, 'input#userid')], timeout=5)
            pw_input = self._safe_find([(By.CSS_SELECTOR, 'input#pw')], timeout=5)
            if id_input and pw_input:
                self._human_type(id_input, id_)
                self._human_type(pw_input, pw_)
                pw_input.send_keys(Keys.RETURN)
                self._human_wait(2, 3)
                self.save_cookies('ruliweb')
        except Exception as e:
            print(f"[AutoCommenter] 루리웹 로그인 실패: {e}", file=sys.stderr)

    # ──────────────────────────────────────────────
    # 네이트판
    # ──────────────────────────────────────────────
    def _post_nate(self, url: str, text: str) -> dict:
        site_id = 'nate'
        id_ = os.environ.get('NATE_ID', '')
        pw_ = os.environ.get('NATE_PW', '')

        logged = self.load_cookies(site_id, 'https://pann.nate.com')
        if not logged and id_ and pw_:
            self._login_nate(id_, pw_)

        self.driver.get(url)
        self._human_wait(2, 4)

        comment_box = self._safe_find([
            (By.CSS_SELECTOR, '#comment_form textarea'),
            (By.CSS_SELECTOR, 'textarea.reply_textarea'),
            (By.CSS_SELECTOR, '.comment_write textarea'),
        ])
        if not comment_box:
            return {'success': False, 'error': '댓글창을 찾을 수 없음'}

        self._scroll_to_element(comment_box)
        self._human_type(comment_box, text)

        submit = self._safe_find([
            (By.CSS_SELECTOR, '#comment_form button[type="submit"]'),
            (By.CSS_SELECTOR, '.reply_btn button'),
        ])
        if not submit:
            return {'success': False, 'error': '제출 버튼을 찾을 수 없음'}

        self._scroll_to_element(submit)
        self._human_wait(0.5, 1.5)
        submit.click()
        self._human_wait(2, 3)
        print(f"[AutoCommenter] ✅ 네이트판 댓글 등록 완료", file=sys.stderr)
        return {'success': True, 'site': site_id}

    def _login_nate(self, id_: str, pw_: str):
        try:
            self.driver.get('https://auth.nate.com/login')
            self._human_wait(1, 2)
            id_input = self._safe_find([(By.CSS_SELECTOR, 'input#userId')], timeout=5)
            pw_input = self._safe_find([(By.CSS_SELECTOR, 'input#password')], timeout=5)
            if id_input and pw_input:
                self._human_type(id_input, id_)
                self._human_type(pw_input, pw_)
                pw_input.send_keys(Keys.RETURN)
                self._human_wait(2, 3)
                self.save_cookies('nate')
        except Exception as e:
            print(f"[AutoCommenter] 네이트 로그인 실패: {e}", file=sys.stderr)

    # ──────────────────────────────────────────────
    # 맘카페 (네이버 카페)
    # ──────────────────────────────────────────────
    def _post_naver_cafe(self, url: str, text: str) -> dict:
        site_id = 'mamacafe'

        logged = self.load_cookies(site_id, 'https://cafe.naver.com')
        if not logged:
            print("[AutoCommenter] 네이버 쿠키 없음 - 수동 로그인 필요", file=sys.stderr)
            self.driver.get('https://nid.naver.com/nidlogin.login')
            print("[AutoCommenter] 30초 내에 네이버 로그인을 완료해주세요...", file=sys.stderr)
            time.sleep(30)
            self.save_cookies('mamacafe')

        self.driver.get(url)
        self._human_wait(3, 5)

        # 카페는 iframe 안에 있을 수 있음
        try:
            iframe = self._safe_find([
                (By.CSS_SELECTOR, 'iframe#cafe_main'),
                (By.CSS_SELECTOR, 'iframe.ArticleContentBox'),
            ], timeout=5)
            if iframe:
                self.driver.switch_to.frame(iframe)
                self._human_wait(1, 2)
        except Exception:
            pass

        comment_box = self._safe_find([
            (By.CSS_SELECTOR, '.comment_inbox textarea'),
            (By.CSS_SELECTOR, '#commentBody'),
            (By.CSS_SELECTOR, 'textarea.comment_write'),
        ])
        if not comment_box:
            self.driver.switch_to.default_content()
            return {'success': False, 'error': '댓글창을 찾을 수 없음'}

        self._scroll_to_element(comment_box)
        self._human_type(comment_box, text)

        submit = self._safe_find([
            (By.CSS_SELECTOR, '.comment_inbox .btn_register'),
            (By.CSS_SELECTOR, 'button.write_btn'),
        ])
        if not submit:
            self.driver.switch_to.default_content()
            return {'success': False, 'error': '제출 버튼을 찾을 수 없음'}

        self._scroll_to_element(submit)
        self._human_wait(0.8, 1.5)
        submit.click()
        self._human_wait(2, 3)
        self.driver.switch_to.default_content()
        print(f"[AutoCommenter] ✅ 맘카페 댓글 등록 완료", file=sys.stderr)
        return {'success': True, 'site': site_id}
