# ⚠️ 미해결 이슈: 네이버 카페 날짜 추출 실패

## 📋 이슈 요약

**문제**: 네이버 카페 검색 결과 페이지에서 게시글 날짜 추출 실패

**영향**: 
- 날짜 필터링 불가능
- 모든 게시글 수집 (일주일 전, 한달 전 포함)
- 24시간 이내 필터링 작동 안함

**우선순위**: 🔴 High (핵심 기능 미작동)

---

## ✅ 작동하는 것

1. ✅ 로그인 (쿠키 저장/로드)
2. ✅ 최신 SPA URL 지원 (`/f-e/cafes/{clubid}/`)
3. ✅ clubid 자동 추출
4. ✅ JavaScript 로딩 대기 (26초+)
5. ✅ 게시글 링크 추출 (30개 이상)
6. ✅ 제목 추출
7. ✅ 작성자 추출 (API)

## ❌ 작동하지 않는 것

- ❌ **날짜 추출** ← 핵심 문제

---

## 🔍 시도한 해결 방법 (모두 실패)

### 1. 테이블 구조 분석
```python
# thead에서 "작성일" 컬럼 찾기
headers = driver.find_elements(By.CSS_SELECTOR, "thead th")
# 실패: 테이블 구조가 아니거나 작성일 헤더 없음
```

### 2. 20개 이상 CSS 셀렉터 시도
```python
date_selectors = [
    "td[aria-label*='작성일']",
    "span[class*='date']",
    "div[class*='date']",
    "time",
    "td.td_date",
    "td[class*='date']",
    ".date",
    "td:nth-child(3)",
    "td:nth-last-child(2)",
    # ... 등 20개 이상 모두 실패
]
```

### 3. 정규표현식 날짜 패턴
```python
date_patterns = [
    r'\d{4}\.\d{2}\.\d{2}',  # 2024.01.15
    r'\d{2}\.\d{2}',         # 01.15
    r'\d{2}:\d{2}',          # 14:30
]
# 실패: 제목, 댓글수만 추출됨
```

### 4. "작성일" 텍스트 검색
```python
if '작성일' in row_text:
    # "작성일 2024.01.15" 형태 찾기
# 실패: 텍스트에 "작성일" 없음
```

---

## 💡 추정되는 원인

### ✅ 확인된 원인 (2026.02.05)

**실제 HTML 구조 확인 완료**:
```html
<div class="inner_list">
  <a class="article" href="/f-e/cafes/xxx/articles/xxx">아직 두바이 쫀득쿠키...</a>
  <a class="cmt" href="...">댓글 링크</a>
  <!-- 날짜 정보 없음! -->
</div>
```

**결론**: 네이버 카페 SPA 검색 결과 리스트에는 **날짜 정보가 HTML에 포함되어 있지 않음**

이것이 모든 날짜 추출 시도가 실패한 근본 원인입니다.

### ~~가설들~~ (이제 확인됨)
- ✅ **리스트 뷰에 날짜 미표시** ← 확인됨!
- ❓ JavaScript 변수에만 존재 (가능성 있음)
- ❓ API 데이터로만 제공 (가능성 높음)
- ❌ Shadow DOM (아님)

---

## 🚀 다음 단계 (필수)

### ~~1단계: 실제 HTML 구조 확인~~ ✅ 완료

**확인 결과**: 
```html
<div class="inner_list">
  <a class="article">제목</a>
  <a class="cmt">댓글</a>
  <!-- 날짜 없음! -->
</div>
```

**결론**: SPA 검색 결과 리스트에 날짜가 HTML에 없음

### 2단계: 디버깅 파일 분석

생성된 파일 확인:
```bash
f:\realpick\scripts\marketing\debug_no_posts_page_1_*.html
```

브라우저로 열어서:
- 날짜 정보가 HTML에 있는지
- 어떤 구조로 되어 있는지

### 3단계: Console에서 테스트

브라우저 Console에서:
```javascript
// 날짜 요소 찾기 시도
document.querySelectorAll('*').forEach(el => {
    if (el.innerText && /\d{4}\.\d{2}\.\d{2}|\d{2}\.\d{2}/.test(el.innerText)) {
        console.log(el, el.innerText);
    }
});
```

### 4단계: Network 탭 확인

API 요청 확인:
- articles 관련 API 호출
- 응답 데이터에 날짜 포함 여부
- API 엔드포인트 URL

---

## 📝 필요한 정보

이 이슈를 해결하려면 다음 정보가 필요합니다:

1. **실제 HTML 구조**
   - 게시글 하나의 전체 HTML
   - 날짜가 표시되는 정확한 요소
   
2. **브라우저 스크린샷**
   - Elements 탭에서 게시글 선택한 상태
   - 날짜 요소가 하이라이트된 상태

3. **디버깅 HTML 파일 내용**
   - `debug_no_posts_page_1_*.html` 파일
   - 날짜 정보 포함 여부

---

## 🔧 임시 해결책 (Workaround)

현재 사용 가능한 임시 방법:

### 방법 1: 네이버 카페 검색 API 직접 호출 (추천, 장기)
```python
# 1. 브라우저 Network 탭에서 검색 API 확인
# 2. API 엔드포인트: GET /api/v2/cafes/{clubid}/search?query=...
# 3. JSON 응답에서 날짜 추출
# 장점: 빠르고 정확, 날짜 정보 포함
# 단점: API 구조 조사 필요
```

### 방법 2: 개별 게시글 상세 페이지 접근
```python
# 각 게시글 상세 페이지에서 날짜 추출
# 장점: 확실히 날짜 추출 가능
# 단점: 매우 느림 (게시글마다 페이지 로드)
```

### 방법 3: 페이지 수 제한 (임시, 즉시 적용 가능)
```python
# 날짜 필터링 대신 최근 2-3페이지만 수집
max_pages = 3  # 고정
# 최신순 정렬이므로 최근 게시글만 수집됨
# 장점: 즉시 구현 가능
# 단점: 정확한 24시간 필터링 불가능
```

---

## ✅ 권장 해결 방향

**단기 (즉시)**: 방법 3 - 페이지 수 제한
**장기 (완전 해결)**: 방법 1 - API 기반 크롤링

---

## 📅 작성일

2026-02-05

## 👤 작성자

AI Assistant (Agent mode)

## 🔗 관련 파일

- `scripts/marketing/modules/naver_cafe_crawler.py` (크롤러)
- `scripts/marketing/test_naver_cafe.py` (테스트)
- `help.md` (전체 가이드)
