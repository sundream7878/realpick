# 프로젝트 AI 역할 정리 & 유료 Gemini API 적용 제안

## 1. 오픈소스/외부 AI 역할 정리 (현재 구조)

프로젝트에서는 **Google Gemini API**만 사용 중입니다. (OpenAI/Claude 등 다른 LLM은 미사용.)

### 1.1 메인 앱 (Next.js, 포트 3000)

| 위치 | 모델 | 역할 | 입력/출력 |
|------|------|------|-----------|
| `lib/video/scenario-generator.ts` | **gemini-1.5-flash** | SNS 바이럴 영상용 **텍스트 시나리오** 생성 | 미션 정보 → `{ hookMessage, question, optionA, optionB }` |
| `lib/viral/content-generator.ts` | **gemini-1.5-flash** | 플랫폼별 **SNS 캡션/해시태그/CTA** 생성 | 미션 + track → Instagram/YouTube/TikTok용 텍스트 |
| `app/api/missions/verify/route.ts` | **gemini-2.0-flash-exp** | 미션 **중복 검사** (의미 유사도) | 신규 제목 + 기존 제목 목록 → `{ isDuplicate, reason }` |
| `app/api/admin/marketer/naver-cafe/crawl/route.ts` | **gemini-1.5-flash** | 네이버 카페 **댓글/리플 생성** (바이럴용) | 게시글 내용 → 자연어 댓글 |
| `app/api/admin/marketer/instagram/generate-hashtags/route.ts` | **gemini-1.5-flash** | **해시태그 자동 생성** | 미션/콘텐츠 → 해시태그 문자열 |

- **환경 변수**: `GEMINI_API_KEY` (대부분), `GOOGLE_API_KEY` (verify만 별도 사용 가능)

### 1.2 마케팅 봇 크롤러 (Python)

| 위치 | 모델 | 역할 | 입력/출력 |
|------|------|------|-----------|
| `crawler/modules/gemini_analyzer.py` | **gemini-2.0-flash** | 유튜브 영상 **자막 분석 → AI 미션 생성** | 영상 메타 + 자막 → 제목/선택지/카테고리/showId |
| `crawler/modules/gemini_analyzer.py` | **gemini-2.0-flash** | 커뮤니티 **바이럴 댓글 생성** | 게시글 제목+내용 → 리얼픽 홍보 댓글 |
| `crawler/modules/recruit_analyzer.py` | **gemini-2.0-flash** | **방송국 모집 공고** 텍스트 분석 → JSON 구조화 | 원문 텍스트 → 정형 JSON |

- **환경 변수**: `GEMINI_API_KEY` (`.env.local` 등)

### 1.3 요약

- **Flash 계열**(1.5-flash, 2.0-flash, 2.0-flash-exp): 저렴·빠른 처리용.
- **역할**: (1) 영상/게시글 → 미션/댓글/해시태그 생성, (2) 미션 제목 중복 검사, (3) 공고 텍스트 정형화.
- **Pro/고급 모델**은 현재 어디에도 사용하지 않음.

---

## 2. 유료 Gemini API를 쓸 만한 곳 (우선순위 제안)

유료(유로) 구간에서는 **Gemini 1.5 Pro / 2.0 Pro** 같은 상위 모델과 **높은 rate limit**을 쓸 수 있습니다.

### 2.1 최우선 추천 (품질·비즈니스 임팩트 큼)

| 구간 | 현재 | 유료 적용 제안 | 이유 |
|------|------|-----------------|------|
| **유튜브 자막 → AI 미션 생성** (`gemini_analyzer.analyze_with_transcript`) | 2.0-flash | **1.5 Pro 또는 2.0 Pro** | 자막 길이·맥락이 길고, “프로그램/출연진 오판” 방지·선택지 품질이 수익/UX에 직결. Pro가 지시 따르기·일관성에서 유리. |
| **미션 제목 중복 검사** (`missions/verify`) | 2.0-flash-exp | **1.5 Pro** | “의미적으로 비슷한가” 판단이 까다로움. 오탐(유일한 미션 막음)·미탐(진짜 중복 통과) 둘 다 줄이려면 추론이 더 나은 Pro가 유리. |

### 2.2 두 번째로 추천 (사용자 노출·전환 관련)

| 구간 | 현재 | 유료 적용 제안 | 이유 |
|------|------|----------------|------|
| **SNS 바이럴 텍스트 시나리오** (`scenario-generator`) | 1.5-flash | **1.5 Pro** (또는 유료 1.5-flash로 호출량 여유) | 훅/질문/선택지 문구가 영상 클릭·공유에 직결. Pro로 더 임팩트 있는 카피 기대. |
| **멀티 플랫폼 SNS 콘텐츠** (`content-generator`) | 1.5-flash | **1.5 Pro** | 인스타/유튜브/틱톡별 톤·해시태그 품질이 전환에 영향. Pro로 플랫폼별 뉘앙스 개선 가능. |

### 2.3 선택 적용 (비용 대비 효과 고려)

| 구간 | 현재 | 유료 적용 제안 | 이유 |
|------|------|----------------|------|
| **바이럴 댓글 생성** (카페/커뮤니티) | 1.5-flash / 2.0-flash | 유료 **Flash**로 rate limit만 확대 | 짧은 댓글 생성이라 Flash로도 충분. 429 줄이려면 유료 할당량이면 됨. |
| **해시태그 생성** | 1.5-flash | 현행 유지 또는 Flash 유료 | 짧은 출력 위주라 Pro까지는 필요성 낮음. |
| **방송국 모집 공고 분석** (`recruit_analyzer`) | 2.0-flash | 호출 많으면 **Pro** | 구조화 정확도가 중요하면 Pro, 호출 수 적으면 Flash 유지. |

---

## 3. 적용 시 기술적 포인트

- **모델만 바꾸면 됨**  
  - 예: `getGenerativeModel({ model: 'gemini-1.5-flash' })` → `gemini-1.5-pro`  
  - Python: `GenerativeModel('gemini-2.0-flash')` → `gemini-1.5-pro` 등
- **환경 변수**  
  - 유료 키를 쓸 경로만 `GEMINI_API_KEY`를 유료 프로젝트 키로 두거나,  
  - “고품질 전용 키”를 `GEMINI_PRO_API_KEY` 같은 식으로 분리해 Pro 호출에만 사용할 수 있음.
- **비용**  
  - Pro는 입력/출력 토큰당 비용이 Flash보다 큼.  
  - “미션 생성·중복 검사”처럼 호출 수가 제한적인 곳부터 Pro를 쓰고, 댓글/해시태그는 Flash(유료 할당량)로 두는 식이 무난함.

---

## 4. 한 줄 요약

- **AI 역할**: 전부 Gemini로, “영상/게시글 → 미션·댓글·캡션·해시태그 생성” + “미션 제목 중복 검사” + “공고 텍스트 정형화”.
- **유료 Gemini 쓰기 좋은 곳**:  
  (1) **유튜브 자막 → 미션 생성**, (2) **미션 제목 중복 검사**를 Pro로 올리고,  
  (3) 여유 있으면 **SNS 시나리오/멀티플랫폼 콘텐츠**도 Pro로 올리는 순서를 추천.
