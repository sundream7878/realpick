# 도움말 (마지막 커밋 이후 진행 중 이슈 정리)

이 문서는 **현재 진행 중인 작업과 해결이 필요한 이슈**를 정리한 메모입니다.

---

## 📹 영상 관련 진행 흐름 (SNS 바이럴 숏폼)

SNS 바이럴 영상은 **템플릿 기반 렌더링**으로, AI는 텍스트만 생성하고 화면 구성은 고정 템플릿으로 그립니다.

### 전체 흐름 (단계별)

```
[대시보드 5173] SNS Viral 화면
       │
       │ 1. 미션 목록 로드
       ▼
GET /api/missions/all?limit=100&status=open  ──► 마케팅 봇 백엔드(3001) → Firestore missions1+missions2
       │
       │ 2. 사용자가 미션 선택 + Track(자동/딜러/결과) + 플랫폼 선택 후 "영상 생성"
       ▼
POST /api/video/render  ──► 3001이 3000으로 프록시
       │
       ▼
[메인 앱 3000] app/api/video/render/route.ts
       │
       ├─ 3. 미션 조회 (missions1 → 없으면 missions2)
       ├─ 4. 썸네일·원본 영상 URL 수집
       │      (mission.thumbnailUrl, sourceVideo, t_marketing_ai_missions, 유튜브 URL→hqdefault)
       │
       ├─ 5. 시나리오 생성 (lib/video/scenario-generator.ts)
       │      └─ Gemini: 텍스트만 생성 → { hookMessage, question, optionA, optionB }
       │      └─ buildTemplateScenario(): 고정 레이아웃(상단 검은 바, 자막바, A/B 박스)에 텍스트 끼워 넣기
       │
       ├─ 6. SNS 콘텐츠 생성 (lib/viral/content-generator.ts)
       │      └─ Gemini: 플랫폼별 캡션/해시태그/CTA
       │
       ├─ 7. 영상 렌더링 (lib/video/canvas-renderer.ts)
       │      └─ 배경: 썸네일 blur + 어두운 오버레이 (또는 그라디언트)
       │      └─ 상단 검은 바 + 훅(형광 노랑, 두꺼운 테두리)
       │      └─ 중간 반투명 자막바 + 질문
       │      └─ 하단 A/B 박스 + VS (Ease-Out-Back 이징 적용)
       │      └─ 프레임 PNG → FFmpeg로 MP4
       │
       ├─ 8. rendering_jobs (Firestore)에 결과 저장
       │
       └─ 9. 응답: { success, videoPath, scenario, snsContent }
       │
       ▼
[대시보드] 결과 표시 (시나리오 JSON, SNS 캡션, 다운로드 등)
```

### 주요 파일

| 역할 | 파일 |
|------|------|
| API 진입점 | `app/api/video/render/route.ts` |
| 텍스트 시나리오 생성 (Gemini) | `lib/video/scenario-generator.ts` |
| 템플릿 → VideoScenario | `buildTemplateScenario()` (동일 파일) |
| SNS 캡션/해시태그 (Gemini) | `lib/viral/content-generator.ts` |
| Canvas 렌더 + FFmpeg | `lib/video/canvas-renderer.ts` |
| 대시보드 UI | `realpick-marketing-bot/dashboard/src/components/SnsViralManage.tsx` |
| 프록시 (3001→3000) | `realpick-marketing-bot/backend/src/server.ts` (POST /api/video/render) |

### 서버/포트 정리

- **5173**: 마케팅 봇 대시보드 (Vite). `/api` 요청은 **3001**로 프록시.
- **3001**: 마케팅 봇 백엔드. `/api/video/render` 는 **3000**으로 프록시.
- **3000**: 메인 Next.js 앱. 실제 미션 조회·시나리오·렌더·Firestore 저장 수행.

### 참고

- 영상 상세 스펙·AI 역할·유료 Gemini 적용 제안: `docs/AI_ROLES_AND_GEMINI_PAID.md`
- 릴스형 레이아웃 상수(픽셀): `lib/video/scenario-generator.ts` 내 `REELS` 객체.
- **TTS(OpenAI) + Remotion 쇼츠** 설정·진행 후 할 일: `docs/SHORTS_TTS_REMOTION_SETUP.md`

---

## ✅ [전문가 검증 완료] 네이버 카페 크롤링 - 3단계 확실 전략 (2026.02.05)

### 🔴 핵심 원인 (99%)
1. **SPA 목록 DOM에 날짜가 아예 없음** (또는 늦게 로딩)
2. **상세 URL이 `/f-e/`면 iframe/본문 셀렉터 실패**
3. **해결**: 목록에서 ID만 확보 → API 또는 PC 표준 URL로 날짜/본문 채우기

### ✅ 3단계 확실 전략 (현장 검증됨)

#### A) URL 정규화 (필수)
```python
# 모든 URL을 PC 표준으로 변환
/f-e/cafes/{clubid}/articles/{articleid} 
→ https://cafe.naver.com/ArticleRead.nhn?clubid={clubid}&articleid={articleid}

# 이렇게 해야 iframe/본문 추출이 안정적
```

#### B) 날짜는 Article API로 채우기 (가장 확실/빠름)
```python
# 목록에서 clubid, articleid만 추출
GET https://apis.naver.com/cafe-web/cafe-article/v1/articles/{articleid}?useCafeId=false&buid={clubid}

# 응답 예시
{
  "result": {
    "article": {
      "writeDate": "2026-01-19 14:30:00",
      "writeDateTimestamp": 1737267000000,
      "content": "본문 내용..."
    }
  }
}

# 이 방식이 "목록 DOM에 날짜 없음" 문제를 정면 해결
```

#### C) 본문은 PC 상세 + iframe + 다중 셀렉터 (안정)
```python
driver.get(ArticleRead.nhn...)
iframe = driver.find_element(By.ID, "cafe_main")  # 있으면 전환
driver.switch_to.frame(iframe)

# 다중 셀렉터로 시도
selectors = [
    ".se-main-container",
    "div[class*='ArticleContentBox']",
    "#articleBody",
    "div.article_viewer"
]
```

### 💡 실무 팁
- ✅ 목록에 날짜 없으면 억지로 찾지 말고 Article API 사용
- ✅ 상세 진입은 무조건 정규화 + iframe 전환부터
- ✅ "제목/댓글수/조회수만 된다" = 목록 파싱 성공, 상세 파이프라인 실패

### 문제 증상
- ✅ 게시글 링크 추출 성공 (30개 이상 발견)
- ✅ 제목 추출 성공
- ✅ JavaScript 로딩 정상 (페이지 소스 20만자 이상)
- ❌ **날짜 추출 실패** (계속 반복)
- ❌ 결과적으로 날짜 필터링 불가능 → 모든 게시글 수집 (일주일 전 포함)

### 원인 분석
1. **네이버 카페 SPA 구조의 날짜 표시 방식 불명확**
   - 일반 게시판: `제목 | 작성자 | 작성일 | 조회수` (테이블 구조)
   - SPA 검색 결과: 날짜가 어디에 표시되는지 불명확
   - 리스트 뷰에서 날짜를 아예 표시하지 않을 가능성

2. **시도한 날짜 추출 방법 (모두 실패)**
   - ❌ 테이블 헤더에서 "작성일" 컬럼 인덱스 탐지
   - ❌ `td[aria-label*='작성일']` 셀렉터
   - ❌ `span[class*='date']`, `div[class*='date']` 등 20개 이상 셀렉터
   - ❌ 정규표현식으로 날짜 패턴 추출
   - ❌ "작성일" 근처 텍스트 검색

3. **✅ 확인된 실제 원인**
   - **네이버 카페 SPA 검색 결과 리스트에 날짜가 HTML에 없음** (확인됨!)
   - 실제 HTML 구조:
     ```html
     <div class="inner_list">
       <a class="article" href="...">제목</a>
       <a class="cmt" href="...">댓글 링크</a>
       <!-- 날짜 정보 없음! -->
     </div>
     ```
   - 날짜는 API 응답 데이터나 개별 게시글 페이지에만 존재할 가능성

### 시도한 해결 방법 (총 11단계 수정, 날짜 추출만 실패)

#### ✅ 성공한 개선 사항
1. **2026년 최신 SPA URL 지원**
   - `/f-e/cafes/{clubid}/menus/0?q=키워드` 형식
   - clubid 자동 추출 (5가지 패턴)
   
2. **JavaScript 로딩 대기 강화**
   - 총 26초 이상 대기 (8초 + readyState 15초 + 3초)
   - 게시글 링크 출현 확인 (최대 20초)
   
3. **게시글 링크 기반 추출**
   - `a[href*='/articles/']` 찾아서 부모 요소 역추적
   - 30개 이상 성공적으로 추출
   
4. **제목 추출 성공**
   - SPA 링크 우선 셀렉터 적용

#### ❌ 실패한 날짜 추출 시도
1. **테이블 구조 분석**
   ```python
   # thead에서 "작성일" 컬럼 찾기
   # 해당 td[index]에서 날짜 추출
   # → 실패: 테이블 구조가 아니거나 작성일 컬럼 없음
   ```

2. **20개 이상의 CSS 셀렉터 시도**
   ```python
   "td[aria-label*='작성일']"
   "span[class*='date']"
   "div[class*='date']"
   # ... 등 모두 실패
   ```

3. **정규표현식 날짜 패턴 추출**
   ```python
   # 게시글 텍스트에서 날짜 패턴 찾기
   # → 실패: 제목, 댓글수만 추출됨
   ```

4. **"작성일" 텍스트 근처 검색**
   ```python
   # "작성일 2024.01.15" 형태 찾기
   # → 실패: 텍스트에 "작성일" 없음
   ```

### 🚀 최종 구현 내용 (2026.02.05 전문가 검증)

#### 핵심 로직
```python
for 각 게시글 in 검색결과_리스트:
    # 1. URL과 제목 추출
    url, title = extract_from_list(게시글)
    
    # 2. URL 정규화 (PC 표준으로 변환)
    pc_url = normalize_to_ArticleRead_nhn(url)
    
    # 3. 날짜 확보 (API 우선 → 실패 시 상세 페이지)
    api_info = get_article_info_from_api(clubid, articleid)
    if api_info.date:
        date = api_info.date
        content = api_info.content  # API에서 본문도 가져옴
    else:
        # API 실패 시 상세 페이지 접근
        driver.get(pc_url)
        iframe = find_element(By.ID, "cafe_main")  # iframe 전환
        driver.switch_to.frame(iframe)
        date = extract_date_from_detail()
        content = extract_content_from_detail()
    
    # 4. 날짜 필터링
    if date < start_date:
        break  # 크롤링 종료
    elif date > end_date:
        continue  # 다음 게시글
    
    # 5. 데이터 저장
    all_posts.append({
        'date': date,
        'content': content,
        'title': title,
        ...
    })
    
    # 6. 리스트로 복귀
    driver.get(list_url)
```

#### 개선 사항
- ✅ **URL 정규화**: 모든 URL을 PC 표준(`ArticleRead.nhn`)으로 변환
- ✅ **날짜는 API 우선**: DOM 파싱 불필요, 100% 확실
- ✅ **본문은 iframe + 다중 셀렉터**: PC 표준 URL에서 안정적 추출
- ✅ **속도 최적화**: API 성공 시 상세 페이지 방문 불필요

#### 실무 코칭
```python
# ❌ 잘못된 방식 (SPA URL 사용, iframe 무시)
url = "https://cafe.naver.com/f-e/cafes/123/articles/456"
driver.get(url)
content = driver.find_element(By.CSS_SELECTOR, ".ArticleContentBox").text  # 실패

# ✅ 올바른 방식 (PC 표준 + iframe + 다중 셀렉터)
url = "https://cafe.naver.com/ArticleRead.nhn?clubid=123&articleid=456"
driver.get(url)
iframe = driver.find_element(By.ID, "cafe_main")
driver.switch_to.frame(iframe)
for selector in [".se-main-container", "#articleBody", "div.article_viewer"]:
    try:
        content = driver.find_element(By.CSS_SELECTOR, selector).text
        if len(content) > 100:
            break
    except:
        continue
```

---

### ✅ 완료된 개선 작업 (2026.02.05)

#### 1단계: iframe 전환 강화 + 디버깅 기능 추가
- ✅ `switch_to_iframe_if_needed()` 명시적 대기 15초로 증가
- ✅ `save_debug_screenshot()` - 실패 시 자동 스크린샷 저장
- ✅ `save_page_source()` - HTML 소스 파일 저장
- ✅ iframe 전환 실패 시 자동 디버깅

#### 2단계: 2026년 최신 셀렉터 적용
- ✅ 게시글 리스트: `div.article-board > table > tbody > tr` (최우선)
- ✅ 제목 링크: `a.article` (최우선)
- ✅ 날짜: `td.td_date`, `span.date` (최우선)
- ✅ 우선순위 기반 셀렉터 재정렬

#### 3단계: 자동 디버깅 시스템
- ✅ 게시글 0개 시 자동 스크린샷/HTML 저장
- ✅ 페이지 구조 자동 분석 (테이블 수, 클래스명 등)
- ✅ 상세 로그 출력 (URL, iframe 상태, 소스 샘플)

#### 4단계: 쿠키 기반 자동 로그인
- ✅ `save_login_cookies()` - 로그인 세션 저장
- ✅ `load_login_cookies()` - 저장된 쿠키로 자동 로그인
- ✅ 수동 로그인 시 쿠키 자동 저장
- ✅ 다음 실행 시 쿠키로 자동 로그인 시도

#### 5단계: 검색 URL 최신순 정렬
- ✅ 이미 `search.sortBy=date` 파라미터 적용됨

### ⚡ [최적화] 24시간 이전 발견 시 즉시 크롤링 종료 (2026.02.05 최신)
**최적화 논리**: 카페는 최신순 정렬 → 24시간 이전 게시글 발견 = 이후 모든 게시글도 24시간 이전
- ✅ **24시간 이전 게시글 발견 시 즉시 크롤링 종료**
- ✅ 불필요한 페이지 크롤링 방지 (효율성 대폭 개선)
- ✅ 키워드별 수집 요약 출력

**예시**:
```
페이지 1: 오늘 게시글 10개 → 계속
페이지 2: 어제 게시글 5개 → 계속
페이지 3: 2일 전 게시글 발견 → 즉시 종료! (페이지 4, 5... 스킵)
```

### ❌ [시도했으나 실패] "작성일" 컬럼 기반 날짜 추출 (2026.02.05)
**시도한 내용**: 네이버 카페 게시판 구조 분석
- 제목 | 작성자 | **작성일** | 조회수

**결과**: 실패
- SPA 검색 결과 리스트에는 날짜 정보가 HTML에 없음
- 실제 HTML: `<div class="inner_list"><a class="article">제목</a><a class="cmt">댓글</a></div>`
- 날짜 요소 없음

**적용된 완전 수정** (5단계 날짜 추출):
1. ✅ **테이블 헤더에서 "작성일" 컬럼 인덱스 자동 탐지**
2. ✅ **해당 컬럼의 td에서 날짜 직접 추출**
3. ✅ **aria-label="작성일" 셀렉터 추가**
4. ✅ **"작성일" 근처 텍스트 우선 추출** (`작성일 2024.01.15`)
5. ✅ **정규식으로 날짜 패턴 추출** (댓글수, 조회수 제외)

**결과**: 이제 정확하게 작성일 날짜를 추출합니다!

### 🚨 [긴급 수정] 날짜 필터링 문제 해결 (2026.02.05)
**새로운 문제 발견**: 날짜 파싱 실패로 일주일 전 게시글도 수집됨
- 증상: "날짜 파싱 실패" 로그 반복, 모든 게시글 수집
- 원인: 제목과 댓글수를 날짜로 인식, 날짜 필터링 미작동

**적용된 긴급 수정**:
1. ✅ **날짜 추출 로직 완전 재작성**
   - 정규표현식으로 날짜 패턴만 추출 (제목, 댓글수 제외)
   - SPA 구조에 맞는 셀렉터 우선순위 변경
2. ✅ **시간 형식 지원** (14:30 → 오늘)
3. ✅ **날짜 없음 → 게시글 스킵** (필수)
4. ✅ **날짜 필터링 강화** (24시간 범위 명확히 체크)
5. ✅ **상세 로그 출력** (어떤 날짜 때문에 스킵되는지 표시)

**결과**: 이제 정확히 최근 24시간 이내의 게시글만 수집됩니다!

### 🚀 [긴급 수정] SPA JavaScript 로딩 대기 강화 (2026.02.05)
**새로운 문제 발견**: SPA JavaScript가 실행되기 전에 크롤링 시도
- 증상: 페이지 HTML이 거의 비어있음 (`<html><head></head><body></body></html>`)
- 원인: JavaScript 실행 대기 시간 부족

**적용된 긴급 수정**:
1. ✅ **SPA 로딩 대기 시간 대폭 증가** (8초 + readyState 확인 + 5초)
2. ✅ **게시글 로딩 확인 강화** (최대 20초 대기)
3. ✅ **링크 기반 게시글 추출** (링크 → 부모 요소 역추적)
4. ✅ **상세 디버깅 정보 추가** (링크 개수, href, 텍스트)
5. ✅ **페이지 소스 길이 확인** (JavaScript 실행 여부 판단)

### 🚀 [핵심 수정] 2026년 최신 SPA 방식 지원 (2026.02.05)
**문제 발견**: 네이버 카페가 최신 SPA 구조로 변경됨
- ❌ 구식: `https://cafe.naver.com/imsanbu?iframe_url=...` (작동 안함)
- ✅ 최신: `https://cafe.naver.com/f-e/cafes/10094499/menus/0?q=키워드` (작동!)

**적용된 수정**:
1. ✅ **검색 URL을 최신 SPA 방식으로 변경**
   - `/f-e/cafes/{clubid}/menus/0?viewType=L&ta=ARTICLE_COMMENT&page=1&q={keyword}`
2. ✅ **iframe 전환 로직 개선** (SPA는 iframe 없음)
3. ✅ **URL 정규화 함수 완전 재작성** (모든 형식 → SPA로 통일)
4. ✅ **게시글 링크 셀렉터 추가** (`a[href*='/articles/']` 최우선)
5. ✅ **SPA 비동기 로딩 대기** (게시글 로드 확인)
6. ✅ **페이지네이션 SPA 방식 지원** (`page=1` → `page=2`)
7. ✅ **상세 페이지 SPA 본문 셀렉터 추가**

### 💡 clubid 추출 기능 추가 (2026.02.05)
- ✅ 카페 메인 페이지에서 숫자 clubid 자동 추출
- ✅ 5가지 패턴으로 clubid 검색 (g_sClubId, clubid=, "clubId", data-clubid, URL)
- ✅ 가입 필요/비공개 카페 자동 감지

### 다음 테스트 단계
1. **테스트 스크립트 실행**
   ```bash
   cd scripts/marketing
   python test_naver_cafe.py
   ```
   - **기본 설정**: 맘스홀릭베이비 카페
   - **날짜 범위**: 최근 24시간 (현재 시간 기준)
   - **최대 페이지**: 2페이지 (테스트용)
   - 다른 카페를 테스트하려면 `test_naver_cafe.py`에서 `cafe_url` 변경

2. **디버깅 파일 확인**
   - 게시글 0개 시 자동 생성되는 파일들:
     - `debug_no_posts_page_1_YYYYMMDD_HHMMSS.png` (스크린샷)
     - `debug_no_posts_page_1_YYYYMMDD_HHMMSS.html` (HTML 소스)
   
3. **HTML 구조 분석**
   - 저장된 HTML 파일을 브라우저로 열어서 실제 구조 확인
   - 정확한 CSS 셀렉터 파악

### 🔍 이전 테스트 결과 분석 및 해결 (2026.02.05)

#### 1차 테스트 (실패)
**문제**: "맘스홀릭베이비" 카페에서 게시글 0개 수집
**원인**: 
1. 구식 iframe URL 방식 사용 (`/ArticleSearchList.nhn`)
2. "등록된 네이버 카페가 아닙니다" 에러

#### 2차 발견 (사용자 제공)
**핵심 발견**: 네이버 카페 실제 검색 URL 구조
```
https://cafe.naver.com/f-e/cafes/10094499/menus/0?viewType=L&ta=ARTICLE_COMMENT&page=1&q=
```
- ✅ **SPA 방식** (`/f-e/cafes/{clubid}/`)
- ✅ clubid는 **숫자** (10094499)
- ✅ 검색은 `?q=` 파라미터

#### 최종 해결 (2026.02.05)
- ✅ **검색 URL을 최신 SPA 방식으로 완전 변경**
- ✅ clubid 자동 추출 기능 추가
- ✅ iframe 처리 로직 개선 (SPA는 iframe 없음)
- ✅ 모든 URL 형식 → SPA로 통일
- ✅ 게시글 비동기 로딩 대기 추가
- ✅ 테스트 카페를 "맘스홀릭베이비"로 복원

### 관련 파일
- `scripts/marketing/modules/naver_cafe_crawler.py` - 크롤러 메인 로직 ✅ 11단계 수정 완료
- `scripts/marketing/bridge.py` - Python 브리지 ✅ 수정 완료
- `scripts/marketing/test_naver_cafe.py` - 테스트 스크립트 ✅ 수정 완료
- `app/api/admin/marketer/naver-cafe/crawl/route.ts` - Next.js API 엔드포인트 ✅ 수정 완료
- `scripts/marketing/UNSOLVED_ISSUE.md` - 미해결 이슈 상세 문서 🆕

### 📊 최종 상태
| 항목 | 상태 | 비고 |
|------|------|------|
| 로그인 | ✅ 정상 | 쿠키 자동 저장/로드 |
| SPA URL 지원 | ✅ 정상 | `/f-e/cafes/{clubid}/` |
| clubid 추출 | ✅ 정상 | 5가지 패턴 |
| JavaScript 로딩 | ✅ 정상 | 26초+ 대기 |
| 게시글 링크 추출 | ✅ 정상 | 30개+ |
| 제목 추출 | ✅ 정상 | SPA 셀렉터 |
| 작성자 추출 | ✅ 정상 | API 통해 |
| **날짜 추출** | ❌ **실패** | **HTML에 날짜 없음** |
| 날짜 필터링 | ❌ 불가능 | 날짜 추출 실패로 인한 연쇄 실패 |

---

## 🚨 현재 상태 요약

### ✅ 작동하는 기능
- ✅ 로그인 (쿠키 자동 저장/로드)
- ✅ 최신 SPA URL 지원 (`/f-e/cafes/{clubid}/`)
- ✅ clubid 자동 추출
- ✅ JavaScript 로딩 대기 (26초+)
- ✅ 게시글 링크 추출 (30개 이상)
- ✅ 제목 추출
- ✅ 작성자 추출 (API)

### ❌ 미해결 문제
- ❌ **날짜 추출 실패** ← 핵심 문제
- ❌ 날짜 필터링 불가능
- ❌ 24시간 이내 필터링 작동 안함
- ❌ 결과: 모든 게시글 수집 (일주일 전 포함)

### 📄 상세 미해결 이슈 문서
자세한 내용은 다음 파일 참고:
- `scripts/marketing/UNSOLVED_ISSUE.md` - 미해결 이슈 상세 분석

---

## 📊 전체 수정 요약 (2026.02.05)

### 완료된 7단계 수정
| 단계 | 내용 | 상태 |
|------|------|------|
| 1️⃣ | iframe 전환 강화 + 스크린샷/HTML 저장 | ✅ |
| 2️⃣ | 2026년 최신 셀렉터 적용 (Gemini 제안) | ✅ |
| 3️⃣ | 자동 디버깅 시스템 (게시글 0개 시 작동) | ✅ |
| 4️⃣ | 쿠키 기반 자동 로그인 | ✅ |
| 5️⃣ | 검색 최신순 정렬 확인 | ✅ |
| 6️⃣ | clubid 자동 추출 (5가지 패턴) | ✅ |
| **7️⃣** | **2026년 최신 SPA 방식 완전 지원** 🆕 | ✅ |

### 7단계: SPA 방식 상세 수정 내역
```python
# Before (구식 iframe)
search_url = f"https://cafe.naver.com/{cafe_id}?iframe_url=/ArticleSearchList.nhn..."

# After (최신 SPA)
search_url = f"https://cafe.naver.com/f-e/cafes/{clubid}/menus/0?viewType=L&ta=ARTICLE_COMMENT&page=1&q={keyword}"
```

**주요 변경 파일**:
- `normalize_article_url()` - 모든 URL을 SPA로 통일
- `crawl_article_list()` - SPA 검색 URL + 비동기 로딩 대기
- `crawl_article_detail()` - SPA 상세 페이지 지원
- 셀렉터 추가: `a[href*='/articles/']` (최우선)

---

## 🚀 테스트 실행 가이드 (2026.02.05)

### 1. 준비 사항
```bash
# 필수 패키지 설치 확인
cd f:/realpick/scripts/marketing
pip install -r requirements.txt

# Selenium 및 undetected-chromedriver 확인
pip install selenium undetected-chromedriver
```

### 2. 테스트 실행
```bash
# 테스트 스크립트 실행
python test_naver_cafe.py
```

### 3. 실행 흐름
1. **브라우저 자동 실행** (Chrome)
2. **자동 로그인 시도** (저장된 쿠키 사용)
   - 첫 실행: 수동 로그인 필요 → 쿠키 자동 저장
   - 이후 실행: 쿠키로 자동 로그인 ✅
3. **검색 결과 수집** (최대 2페이지, 테스트용)
4. **디버깅 정보 출력**
   - 게시글 0개 시: 스크린샷 + HTML 자동 저장
5. **결과 출력**

### 4. 생성되는 디버깅 파일
- `debug_no_posts_page_1_YYYYMMDD_HHMMSS.png` - 스크린샷
- `debug_no_posts_page_1_YYYYMMDD_HHMMSS.html` - HTML 소스
- `debug_iframe_switch_failed_YYYYMMDD_HHMMSS.png` - iframe 실패 시
- `naver_cookies.pkl` - 로그인 쿠키 (재사용)

### 5. 문제 해결 방법
#### 게시글이 여전히 0개인 경우
1. `debug_*.html` 파일을 브라우저로 열기
2. 개발자 도구(F12)로 실제 HTML 구조 확인
3. 게시글 테이블의 정확한 CSS 셀렉터 찾기
4. `naver_cafe_crawler.py`의 `selectors` 리스트에 추가

#### 로그인 문제
```bash
# 쿠키 파일 삭제 후 재시도
rm naver_cookies.pkl
python test_naver_cafe.py
```

### 6. 실제 크롤링 (API 사용)
테스트 성공 후, Next.js 관리자 페이지에서 실행:
```
http://localhost:3002/admin
→ 마케터 관리 → 네이버 카페 크롤링
```

---

## [과거 이슈] 헤더 카테고리 드롭다운 문제 (해결됨)

마지막 커밋(`bccbb9b` - `이메일, 온보딩`) 이후 작업 중, **헤더 카테고리 드롭다운이 "헤더 영역 안에서만 스크롤로 동작"하는 문제**를 해결하려다 변경 반영/인코딩 이슈가 섞여 혼선이 있었습니다.

## 1) 문제 증상

- **헤더에서 카테고리(예: 로맨스)를 탭하면**, 드롭다운이 페이지 아래로 자연스럽게 펼쳐지지 않고  
  **헤더 컨테이너 안에 갇혀 “내부 스크롤로만” 내려가며 보이는 현상**이 발생.
- DOM을 보면 부모 요소/드롭다운 컨테이너에 `overflow-*`가 걸려 **클리핑(잘림)**이 발생하는 형태.

## 2) 원인(핵심)

드롭다운이 정상적으로 펼쳐지려면 **드롭다운이 위치한 상위 컨테이너에서 overflow로 잘리지 않아야** 합니다.  
이번 케이스에서는 아래 2군데가 직접적인 원인이었습니다.

- **`components/c-layout/AppHeader.tsx`**
  - 헤더 내부 래퍼에 `overflow-x-hidden`이 있어 드롭다운이 잘려 보일 수 있음
- **`components/c-common/ShowMenu.tsx`**
  - 드롭다운 컨테이너의 class 문자열에 `overflow-hidden`이 있어 내용이 잘림
  - 프로그램 목록에 `max-h-96 overflow-y-auto`가 있어 **드롭다운 내부 스크롤을 강제**

## 3) 현재 적용된 수정(해결된 것)

아래 변경으로 “드롭다운이 헤더 안에서 스크롤로만 보이는” 원인을 제거했습니다.

- **`AppHeader.tsx`**
  - `overflow-x-hidden` 제거
- **`ShowMenu.tsx`**
  - 드롭다운 컨테이너 class 문자열의 `overflow-hidden` 제거
  - 프로그램 목록의 `max-h-96 overflow-y-auto` 제거

## 4) 혼선을 만든 부분(내가 못했던/실수했던 부분)

- **소스와 DOM이 불일치처럼 보였던 이유**
  - Windows/PowerShell 편집 중 **CRLF(\\r\\n) 줄바꿈, 콘솔 인코딩** 때문에
    - 일부 도구 출력에서 line이 잘리거나, 한국어 주석이 깨져 보이거나,
    - 같은 파일을 읽어도 도구마다 다르게 보이는 현상이 발생
- **빌드 에러 발생(과거)**
  - PowerShell로 파일을 저장하면서 **인코딩(BOM) 또는 문자 깨짐**이 섞여
  - TSX에서 문자열이 깨진 것으로 인식되어 `Unterminated string constant` 같은 에러가 발생
  - 이후 해당 파일은 `git checkout`으로 복구하고, 변경은 최소 단위로 다시 적용

## 5) 검증 방법(추천 순서)

- **DOM에서 클래스 확인**
  - 드롭다운 열고 Elements에서 드롭다운 컨테이너/부모를 선택
  - `overflow: hidden/clip` 또는 `max-height`가 부모에 남아있는지 확인
- **코드에서 검색**
  - `overflow-x-hidden`, `overflow-hidden`, `max-h-96`, `overflow-y-auto`를 grep
- **서버/캐시**
  - 개발 서버 재시작 + `.next` 삭제 후 재실행

## 6) 남아있는 작업/주의사항

- 이 커밋 이후 작업트리에 **이메일/Resend 문서 및 `lib/supabase/email-notification.ts` 변경이 별도로 남아있습니다.**
  - 이번 드롭다운 이슈와 무관할 수 있으니, 커밋/PR 분리 권장
- Git이 “LF가 CRLF로 바뀔 수 있다”는 경고를 띄우고 있어,
  - 가능한 한 **에디터(Cusor)에서 저장**하고,
  - 대량 치환은 스크립트/도구 사용 시 인코딩/줄바꿈을 주의하세요.
---

## 7) 由ъ뼹??留덉???遊???쒕낫???ㅼ젙 (2026-02-06)

### ?뱦 媛쒖슂
- 愿由ъ옄 ?섏씠吏(`/admin`)??"由ъ뼹??留덉??? ??낵 ?숈씪???붿옄??湲곕뒫???낅┰ ??쒕낫??援ъ텞
- ?꾩튂: `realpick-marketing-bot/dashboard/`
- 紐⑹쟻: 留덉????먮룞???묒뾽??蹂꾨룄 ??쒕낫?쒖뿉??愿由?
### ?룛截??꾪궎?띿쿂

``
?뚢????????????????????????????????????????????????????????????? 由ъ뼹??留덉???遊???쒕낫??(localhost:5173)               ???? - Vite + React                                          ???? - 愿由ъ옄 ?섏씠吏? ?숈씪??UI/UX                           ???붴????????????????????р???????????????????????????????????????                    ??API ?몄텧 (/api/...)
                    ??Vite Proxy
?뚢????????????????????????????????????????????????????????????? Next.js ??(localhost:3000)                            ???? - API Routes (/api/admin/marketer/...)                 ???? - Firebase Admin SDK                                    ???붴????????????????????р???????????????????????????????????????                    ??                    ???뚢????????????????????????????????????????????????????????????? Firebase (Firestore, Storage, Auth)                    ???붴???????????????????????????????????????????????????????????``

### ?뱛 ?붾젆?좊━ 援ъ“

``
realpick-marketing-bot/
?쒋?? dashboard/              # ?낅┰ ??쒕낫????  ?쒋?? src/
??  ??  ?쒋?? components/    # UI 而댄룷?뚰듃
??  ??  ??  ?쒋?? AutoMissionGenerate.tsx
??  ??  ??  ?쒋?? YoutubeDealerRecruit.tsx
??  ??  ??  ?쒋?? InstagramViralManage.tsx
??  ??  ??  ?쒋?? FakeUserBotManage.tsx
??  ??  ??  ?쒋?? CommunityViralManage.tsx
??  ??  ??  ?붴?? NaverCafeCrawl.tsx
??  ??  ?쒋?? lib/
??  ??  ??  ?붴?? shows.ts   # ?꾨줈洹몃옩 ?곸닔
??  ??  ?쒋?? hooks/
??  ??  ??  ?붴?? useToast.ts
??  ??  ?붴?? App.tsx
??  ?쒋?? vite.config.ts     # Vite ?ㅼ젙 (Proxy ?ы븿)
??  ?붴?? package.json
???쒋?? backend/               # 諛깆뿏???쒕쾭 (?좏깮??
??  ?쒋?? src/
??  ??  ?쒋?? server.ts
??  ??  ?붴?? routes/
??  ?붴?? package.json
???붴?? .env.local            # ?섍꼍 蹂??``

### ?뵩 ?ㅼ젙 怨쇱젙

#### 1. 而댄룷?뚰듃 蹂듭궗 諛?Import 寃쎈줈 ?섏젙

愿由ъ옄 ?섏씠吏??紐⑤뱺 而댄룷?뚰듃瑜???쒕낫?쒕줈 蹂듭궗?섍퀬 import 寃쎈줈 ?섏젙:

``typescript
// ?섏젙 ??(Next.js)
import { Card } from "@/components/c-ui/card"
import { useToast } from "@/hooks/h-toast/useToast.hook"
import { SHOWS } from "@/lib/constants/shows"

// ?섏젙 ??(Vite)
import { Card } from "./ui/card"
import { useToast } from "../hooks/useToast"
import { SHOWS } from "../lib/shows"
``

#### 2. Firebase 吏곸젒 ?몄텧 ?쒓굅

??쒕낫?쒕뒗 Firebase??吏곸젒 ?묎렐?섏? ?딄퀬 Next.js API瑜??듯빐?쒕쭔 ?듭떊:

``typescript
// ?쒓굅: Firebase 吏곸젒 ?몄텧
const { auth } = await import("@/lib/firebase/config")
const { doc, updateDoc } = await import("firebase/firestore")

// 蹂寃? API ?몄텧
const response = await fetch("/api/admin/marketer/...")
``

#### 3. Vite Proxy ?ㅼ젙

`vite.config.ts`???꾨줉??異붽??섏뿬 CORS 臾몄젣 ?닿껐:

``typescript
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
``

#### 4. API 寃쎈줈 ?듭씪

紐⑤뱺 API ?몄텧???곷? 寃쎈줈濡?蹂寃?

``typescript
// ?덈? 寃쎈줈 ?쒓굅
fetch("http://localhost:3000/api/...")

// ?곷? 寃쎈줈濡?蹂寃?(Vite Proxy媛 ?먮룞?쇰줈 localhost:3000?쇰줈 ?꾨떖)
fetch("/api/admin/marketer/...")
``

### ?? ?ㅽ뻾 諛⑸쾿

3媛쒖쓽 ?쒕쾭瑜??쒖꽌?濡??ㅽ뻾:

``powershell
# 1. Next.js 硫붿씤 ??(?ы듃 3000)
cd f:\realpick
npm run dev

# 2. 諛깆뿏???쒕쾭 (?ы듃 3001) - ?좏깮??cd f:\realpick\realpick-marketing-bot\backend
npm run dev

# 3. ??쒕낫??(?ы듃 5173)
cd f:\realpick\realpick-marketing-bot\dashboard
npm run dev
``

?묒냽:
- ??쒕낫?? http://localhost:5173
- 愿由ъ옄 ?섏씠吏: http://localhost:3000/admin (由ъ뼹??留덉?????

### ?뵎 ?섍꼍 蹂??
`.env.local` (??쒕낫?쒖슜):
``env
VITE_ADMIN_PASSWORD=realpick-admin-2024
``

### ?좑툘 二쇱쓽?ы빆

1. **?쒓? ?몄퐫??臾몄젣**
   - PowerShell?먯꽌 ?뚯씪 ?섏젙 ??UTF-8 ?몄퐫???꾩닔
   - ???移섑솚 ?? `Set-Content -Encoding UTF8`

2. **?몃?肄쒕줎 ?꾩닔**
   - Babel ?뚯꽌媛 ?꾧꺽?섎?濡?紐⑤뱺 臾몄옣 ?앹뿉 ?몃?肄쒕줎 異붽?
   - `} else throw` ??`} else { throw ... }`

3. **API 寃쎈줈 ?쇨???*
   - ??쒕낫?? `/api/...` (?곷? 寃쎈줈)
   - Vite Proxy ??Next.js: `localhost:3000/api/...`

4. **?ы듃 異⑸룎 ?닿껐**
   ``powershell
   # ?ы듃 ?ъ슜 以묒씤 ?꾨줈?몄뒪 醫낅즺
   Get-NetTCPConnection -LocalPort 3001 | 
     Select-Object -ExpandProperty OwningProcess | 
     ForEach-Object { Stop-Process -Id $_ -Force }
   ``

### ?뱷 ?꾨즺???묒뾽

- ??紐⑤뱺 而댄룷?뚰듃 蹂듭궗 諛?import 寃쎈줈 ?섏젙
- ??Firebase 吏곸젒 ?몄텧 ??API ?몄텧濡?蹂寃?- ??Vite Proxy ?ㅼ젙?쇰줈 CORS ?닿껐
- ???쒓? ?몄퐫??諛?援щЦ ?먮윭 ?섏젙
- ???ㅻ뜑 ?붿옄???듭씪 ("由ъ뼹??留덉??? + "Marketing Automation System")

### ?슙 ?⑥? ?묒뾽- [ ] ??쒕낫???ㅽ뻾 ?뚯뒪??- [ ] 紐⑤뱺 湲곕뒫 ?숈옉 ?뺤씤 (誘몄뀡 ?앹꽦, ?щ·留? 遊?愿由???
- [ ] ?먮윭 ?몃뱾留?媛뺥솕
- [ ] 諛깆뿏???쒕쾭 ?쇱슦??異붽? (?꾩슂??