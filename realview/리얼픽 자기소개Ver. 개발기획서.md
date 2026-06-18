# 리얼픽 자기소개Ver. 개발기획서.md

## 안티그래비티용 통합 개발 지시서

리얼픽 PWA를 기존 미션/픽 중심 구조에서 **“리얼예능방송 출연자 자기소개 정보카드”** 서비스로 리팩토링해줘.

이번 버전의 핵심은 사용자가 리얼예능방송을 보다가 출연자 이름, 직업, 나이, 자기소개 내용이 헷갈릴 때, 리얼픽을 열고 빠르게 정보를 확인하는 것이다.

얼굴인식, 인물 사진 검색, 댓글, 출연자 SNS 연결, 루머 정리, 커뮤니티 반응은 하지 않는다.

---

# 1. 서비스 핵심 정의

## 서비스명

리얼픽 자기소개Ver.

## 한 줄 정의

리얼예능방송을 보다가 출연자 정보가 헷갈릴 때, OCR로 방송명/기수를 찾아 전체 출연자의 자기소개 정보를 한 화면에서 확인하는 PWA 정보카드 서비스.

## 핵심 문구

“누가 누구였지?”

## 보조 문구

“방송 보다가 헷갈릴 때, 출연자 자기소개 정보를 한 화면에서 바로 확인하세요.”

---

# 2. 핵심 방향

## 반드시 유지할 것

* PWA 유지
* 모바일 우선 반응형
* 현재 리얼픽의 핑크 포인트 컬러 유지
* 네이비/딥블루 계열 카드 UI 유지
* 하단 띠배너 광고
* 멀린 패밀리앱 유입 영역
* 기존 미션/픽 기능은 삭제하지 말고 숨김 또는 보류 처리

## 반드시 제거/금지할 것

* 얼굴인식 기능 금지
* 인물 사진 검색 금지
* 출연자 SNS 링크 금지
* 댓글 기능 금지
* 악플/반응/논란/루머 탭 금지
* 출연자 사생활 추적 금지
* 네이티브 앱 전환 유도 금지
* 일반 사용자 로그인 강제 금지

---

# 3. 로그인 정책

이번 MVP에서는 **일반 사용자 로그인은 사용하지 않는다.**

리얼픽 자기소개Ver.은 방송 시청 중 빠르게 확인하는 정보형 서비스이므로 로그인 장벽이 있으면 사용성이 떨어진다.

## 무로그인 제공 기능

* 홈 접근
* 프로그램/기수 페이지 접근
* 출연자 전체 카드 보기
* 출연자 상세 보기
* OCR로 방송 찾기
* 프로그램 직접 검색
* 공식 클립 이동
* OTT 다시보기 링크 이동
* 공식 홈페이지 이동
* 하단 광고 클릭
* 멀린 패밀리앱 이동
* PWA 설치

## 로그인 필요 기능

관리자 기능에만 로그인 적용.

* 관리자 페이지 접속
* 프로그램 생성/수정
* 시즌/기수 생성/수정
* 회차 생성/수정
* 영상 분석 작업 등록
* Gemini 분석 결과 입력
* Claude/GPT 구조화 결과 입력
* 카드 미리보기
* 검수 승인
* 발행
* 광고 관리
* 수정 요청 처리

## 추후 사용자 로그인 도입 조건

현재 MVP에는 넣지 말고, 다음 기능이 들어갈 때만 사용자 로그인을 고려한다.

* 최종 커플 예측
* 첫인상 선택 예측
* 회차별 호감도 픽
* 적중률 랭킹
* 시즌별 예측왕
* 포인트 지급
* 멀린 패밀리앱 포인트 연동

---

# 4. 주요 라우트

## 사용자 라우트

* `/` : 리얼픽 홈
* `/ocr` : OCR 카메라 인식 화면
* `/ocr/result` : OCR 결과 후보 화면
* `/show/:programSlug` : 프로그램 메인
* `/show/:programSlug/:seasonSlug` : 기수/시즌 출연자 전체 카드
* `/show/:programSlug/:seasonSlug/cast/:castId` : 출연자 상세
* `/correction` : 정보 수정 요청
* `/family` : 멀린 패밀리앱 소개

기존 URL 호환 처리:

* 기존 `real-pick.com/?show=nasolo` 형태가 있다면 `/show/nasolo`로 리다이렉트 또는 내부 연결 처리

## 관리자 라우트

* `/admin`
* `/admin/programs`
* `/admin/seasons`
* `/admin/episodes`
* `/admin/analysis-jobs`
* `/admin/analysis-jobs/new`
* `/admin/analysis-jobs/:jobId`
* `/admin/review`
* `/admin/review/:jobId`
* `/admin/corrections`
* `/admin/ads`

관리자 라우트는 인증된 관리자만 접근 가능하게 한다.

---

# 5. 사용자 화면 구성

## 5-1. 홈 화면

홈 화면에는 다음을 구현한다.

* 상단 헤더
* 리얼픽 로고
* 프로그램 선택 드롭다운
* OCR로 찾기 버튼
* 검색 버튼
* PWA 설치 버튼
* 관리자 로그인은 사용자 화면에서 노출하지 않거나 매우 작게 숨김 처리
* 히어로 문구: “누가 누구였지?”
* 보조 문구: “방송 보다가 헷갈릴 때, 출연자 자기소개 정보를 한 화면에서 바로 확인하세요.”
* 주요 버튼:

  * 방송 화면 인식하기
  * 프로그램 직접 선택
* 인기 프로그램 카드 목록
* 최근 업데이트된 기수 카드
* 하단 띠배너 광고
* 멀린 패밀리앱 추천 영역

## 5-2. 프로그램/기수 출연자 전체 카드 화면

라우트:

`/show/:programSlug/:seasonSlug`

상단 정보:

* 프로그램명
* 기수/시즌명
* 기준 회차
* “자기소개 기준” 배지
* “스포일러 없음” 배지
* 공식 링크 버튼

본문:

* 남자 출연자 섹션
* 여자 출연자 섹션
* 전체 출연자를 한 화면에서 빠르게 볼 수 있는 compact card 사용
* 방송마다 출연자 수가 다르므로 그리드는 유동적으로 구성

출연자 카드 기본 노출:

* 공식 사진 1장
* 이름/호칭
* 한 줄 요약
* 핵심 콘텐츠 블록 1~2개
* 상세 보기 버튼

나이, 직업, 지역 같은 항목은 하드코딩하지 않는다.
방송마다 공개 정보가 다르므로 `contentBlocks` 기반으로 자동 렌더링한다.

## 5-3. 출연자 상세 화면/모달

카드 클릭 시 상세 모달 또는 상세 페이지를 보여준다.

상세 정보:

* 공식 사진
* 이름/호칭
* 한 줄 요약
* 자유 콘텐츠 블록 전체
* 첫 등장 회차
* 정보 출처
* 공식 자기소개 클립 보기 버튼
* 정보 수정 요청 버튼

금지:

* 출연자 SNS 버튼 금지
* 댓글 영역 금지
* 논란/루머/커뮤니티 반응 금지

---

# 6. 콘텐츠 구조 정책

출연자 카드 항목은 고정하지 않는다.

리얼예능 프로그램마다 자기소개 방식, 공개 정보, 회차 흐름이 다르기 때문에 고정 필드만으로 구성하지 않는다.

## 기본 원칙

* 최소 고정 필드 + 자유 콘텐츠 블록 구조
* 출연자 정보는 방송에서 공개된 내용만 사용
* 추측성 문장 금지
* 루머/논란/커뮤니티 반응 금지
* 출연자에게 불리하거나 조롱처럼 보일 수 있는 표현 금지
* 회차 기준 스포일러 관리

## 최소 고정 필드

* 프로그램명
* 시즌/기수
* 회차
* 출연자명 또는 방송상 호칭
* 성별 그룹
* 대표 사진 1장
* 한 줄 요약
* 공개 기준 회차
* 정보 출처
* 발행 상태
* 검수 상태

## 자유 콘텐츠 블록 예시

방송 내용에 따라 자동 생성되는 블록.

* 자기소개 핵심
* 공개된 기본 정보
* 성격/취향
* 인상적인 자기소개 문장
* 방송에서 직접 언급한 가치관
* 첫 등장 장면 요약
* 선택/관계 정보
* 주의해서 봐야 할 포인트

단, 자유 블록도 방송에서 공개된 정보만 사용한다.

---

# 7. OCR 기능

OCR은 인물 검색이 아니다.
OCR은 방송 화면의 프로그램명, 기수, 회차, 자막을 읽어 해당 페이지로 빠르게 이동시키는 진입 보조 기능이다.

## OCR 라우트

* `/ocr`
* `/ocr/result`

## OCR 컴포넌트

* `OCRScanner`
* `OCRCaptureGuide`
* `OCRPreview`
* `OCRResultList`
* `OCRConfidenceBadge`
* `ManualProgramSearch`

## OCR 사용 흐름

1. 사용자가 홈에서 “방송 화면 인식하기” 버튼을 누른다.
2. `/ocr` 화면으로 이동한다.
3. 카메라 권한을 요청한다.
4. 사용자가 TV 또는 모바일 화면 상단을 비춘다.
5. 화면 상단 30~40% 영역만 crop한다.
6. 이미지 전처리를 수행한다.
7. 브라우저 OCR을 실행한다.
8. OCR 결과 텍스트를 프로그램/시즌 사전과 매칭한다.
9. confidence 점수에 따라 후보를 보여준다.
10. 사용자가 후보를 선택하면 해당 기수/시즌 페이지로 이동한다.
11. OCR 실패 시 직접 프로그램 선택 화면을 보여준다.

## OCR 인식 대상 예시

* 나는 SOLO
* 나는 솔로
* 나는솔로
* 나는 쏠로
* 28기
* 돌싱글즈
* 환승연애
* 솔로지옥
* 하트시그널
* 커플팰리스
* 자기소개
* 첫인상 선택

## OCR 기술 방향

### 1차 OCR

브라우저 기반 OCR.

* Tesseract.js 사용
* 한국어/영어 혼합 인식 준비
* `kor+eng` 조합 고려
* 서버 비용 최소화
* PWA와 궁합 좋게 구현
* 초기에는 mock OCR 결과도 함께 제공

### 2차 OCR fallback

1차 OCR confidence가 낮거나 실패할 경우 서버 OCR fallback을 호출할 수 있게 service layer만 준비한다.

후보:

* NAVER CLOVA OCR
* Google Cloud Vision OCR

초기 MVP에서는 실제 API 연동 없이 mock 또는 placeholder로 처리한다.
나중에 API 키 연결만으로 확장 가능하게 만든다.

## OCR 전처리 함수

다음 함수를 service/util로 분리한다.

* `cropTopArea(image, ratio = 0.4)`
* `resizeForOCR(image, width = 1280)`
* `enhanceContrast(image)`
* `convertToGrayscale(image)`
* `thresholdImage(image)`
* `normalizeText(text)`

## OCR 매칭 로직

프로그램과 시즌에는 aliases를 둔다.

예시:

```ts
{
  title: "나는 솔로",
  slug: "nasolo",
  aliases: ["나는 SOLO", "나는솔로", "나는 solo", "nasolo", "나는 쏠로"]
}
```

normalize 규칙:

* 공백 제거 비교
* 대소문자 무시
* `S0LO` → `SOLO`
* `쏠로` → `솔로`
* 숫자 OCR 오류 보정
* “기”, “시즌”, “회차” 패턴 추출

confidence 기준:

* 0.8 이상: 바로 이동 가능 후보
* 0.5~0.79: 후보 리스트 표시
* 0.5 미만: 직접 선택 유도

---

# 8. 관리자 자동화 파이프라인

이번 리얼픽의 핵심 운영 방식은 **90% 자동화 + 10% 수동 검수**다.

영상 분석과 콘텐츠 생성은 외부 도구를 사용하고, 관리자 페이지에서는 결과를 붙여넣어 카드화한다.

## 전체 흐름

1. 운영자가 자기소개 구간 영상을 수동으로 준비한다.
2. 관리자 페이지에서 프로그램/시즌/회차를 선택한다.
3. 준비한 영상을 분석 대상으로 등록한다.
4. Gemini 영상분석팀에 영상을 전달해 텍스트와 장면 정보를 추출한다.
5. Gemini 결과 JSON을 관리자 페이지에 붙여넣는다.
6. Claude/GPT로 구조화한 결과 JSON을 관리자 페이지에 붙여넣는다.
7. JSON validation을 수행한다.
8. 앱이 출연자 카드와 상세 페이지를 자동 생성한다.
9. 검수자가 영상과 결과물을 비교 검수한다.
10. 수정 후 승인한다.
11. 공개 발행한다.

## 관리자 기능

### 콘텐츠 생성

* 프로그램 생성
* 시즌/기수 생성
* 회차 생성
* 출연자 임시 생성
* 영상 분석 작업 등록
* Gemini 분석 결과 붙여넣기
* Claude/GPT 구조화 결과 붙여넣기
* JSON validation
* 카드 자동 생성
* 카드 미리보기

### 검수

* 원본 영상 정보 보기
* Gemini 분석 텍스트 보기
* 구조화 JSON 보기
* 출연자별 카드 미리보기
* 정보 수정
* 사진 매칭
* 공식 링크 입력
* 검수 상태 변경
* 승인/반려

### 발행

* 임시 저장
* 검수 대기
* 승인 완료
* 공개 발행
* 비공개 전환
* 수정 이력 저장

## 검수자 역할

검수자는 다음을 확인한다.

* 출연자 이름 또는 호칭이 맞는가
* 방송에서 실제로 공개된 정보인가
* 추측성 문장이 들어가지 않았는가
* 이후 회차 스포일러가 섞이지 않았는가
* 출연자에게 불리한 표현이 없는가
* 커뮤니티 반응이나 루머가 들어가지 않았는가
* 사진이 맞게 매칭되었는가
* 공식 링크가 올바른가
* 한 줄 요약이 과하게 자극적이지 않은가

---

# 9. 정보 수정 요청 기능

각 출연자 상세 카드에 “정보 수정 요청” 버튼을 넣는다.

## 수정 요청 폼 필드

* 요청 대상
* 요청자 유형:

  * 본인
  * 관계자
  * 일반 사용자
* 수정 요청 내용
* 연락처
* 제출 버튼

초기에는 mock submit으로 처리한다.
나중에 Supabase insert로 연결 가능하게 service layer를 분리한다.

---

# 10. 공식 링크 영역

각 프로그램/기수 페이지 하단 또는 상세 카드에 공식 채널 유입 영역을 둔다.

## 링크 유형

* `official_intro_clip`
* `official_highlight`
* `ott_replay`
* `official_homepage`
* `official_preview`

## 버튼 문구

* 공식 자기소개 클립 보기
* 공식 하이라이트 보기
* OTT 다시보기
* 공식 홈페이지
* 공식 예고편 보기

비공식 유튜버 리뷰 영상은 연결하지 않는다.
출연자 SNS도 기본 연결하지 않는다.

---

# 11. 광고 정책

초기 수익화는 하단 띠배너 광고만 사용한다.

## 모바일

* 하단 고정 띠배너
* 콘텐츠를 가리지 않도록 safe-area 고려
* 닫기 버튼은 선택

## PC

* 하단 띠배너 기본
* 사이드 광고는 옵션으로 유지 가능
* 초기에는 과하게 노출하지 않음

## 컴포넌트

* `AdBanner`
* 광고 데이터는 mock data에서 관리
* 나중에 관리자 페이지에서 관리 가능하게 분리

---

# 12. 멀린 패밀리앱 유입

리얼픽은 멀린 패밀리앱 생태계의 유입창구 역할을 한다.

## 컴포넌트

* `FamilyAppBridge`

## 위치

* 페이지 하단
* PC에서는 사이드 영역도 가능
* 본문 정보카드보다 튀지 않게 구성

## 내용

* “리얼픽은 멀린 패밀리앱의 일부입니다.”
* “다른 재미있는 PWA 앱도 둘러보세요.”
* 다른 패밀리앱 이동 버튼

---

# 13. 데이터 모델

초기에는 mock data로 구현하고, 나중에 Supabase 연결이 가능하게 구조를 분리한다.

## Program

```ts
type Program = {
  id: string;
  title: string;
  slug: string;
  aliases: string[];
  category: 'reality_show';
  broadcaster?: string;
  officialHomeUrl?: string;
  officialYoutubeUrl?: string;
  ottUrl?: string;
  logoUrl?: string;
  status: 'active' | 'inactive' | 'draft';
};
```

## Season

```ts
type Season = {
  id: string;
  programId: string;
  title: string;
  slug: string;
  aliases: string[];
  seasonNumber?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  coverImageUrl?: string;
  status: 'active' | 'inactive' | 'draft';
};
```

## Episode

```ts
type Episode = {
  id: string;
  seasonId: string;
  episodeNumber: string;
  title?: string;
  airedAt?: string;
  spoilerLevel?: string;
  officialClipUrl?: string;
};
```

## CastMember

```ts
type CastMember = {
  id: string;
  seasonId: string;
  displayName: string;
  realName?: string;
  genderGroup?: 'male' | 'female' | 'other' | 'unknown';
  profileImageUrl?: string;
  profileImageSource?: string;
  oneLineSummary?: string;
  firstEpisodeId?: string;
  spoilerScope?: string;
  sourceNote?: string;
  publishStatus: 'draft' | 'published' | 'hidden';
  reviewStatus: 'pending' | 'approved' | 'rejected';
  correctionStatus?: 'none' | 'requested' | 'resolved';
};
```

## ContentBlock

```ts
type ContentBlock = {
  id: string;
  castMemberId: string;
  episodeId?: string;
  title: string;
  items: string[];
  sourceTimestamp?: string;
  confidence: 'high' | 'medium' | 'low';
  spoilerFlag: boolean;
  sortOrder: number;
  isPublic: boolean;
};
```

## OfficialLink

```ts
type OfficialLink = {
  id: string;
  programId?: string;
  seasonId?: string;
  episodeId?: string;
  castMemberId?: string;
  linkType:
    | 'official_intro_clip'
    | 'official_highlight'
    | 'ott_replay'
    | 'official_homepage'
    | 'official_preview';
  title: string;
  url: string;
  provider?: string;
};
```

## AnalysisJob

```ts
type AnalysisJob = {
  id: string;
  programId: string;
  seasonId: string;
  episodeId?: string;
  videoTitle?: string;
  videoSourceType?: 'file' | 'url' | 'manual';
  videoFileRef?: string;
  geminiRawOutput?: string;
  structuredOutput?: string;
  reviewStatus: 'draft' | 'pending' | 'approved' | 'rejected';
  createdBy?: string;
  reviewedBy?: string;
  createdAt: string;
  reviewedAt?: string;
};
```

## CorrectionRequest

```ts
type CorrectionRequest = {
  id: string;
  targetType: 'program' | 'season' | 'episode' | 'cast_member' | 'content_block';
  targetId: string;
  requesterType: 'self' | 'official' | 'viewer';
  requestText: string;
  contact?: string;
  status: 'pending' | 'resolved' | 'rejected';
  createdAt: string;
};
```

## Ad

```ts
type Ad = {
  id: string;
  position: 'bottom_banner' | 'side' | 'inline';
  title: string;
  imageUrl?: string;
  linkUrl?: string;
  active: boolean;
};
```

---

# 14. 주요 컴포넌트 구조

## Layout

* `AppLayout`
* `Header`
* `Footer`
* `MobileBottomAdSpace`

## 사용자 화면

* `HeroSection`
* `ProgramSelector`
* `OCRButton`
* `ProgramCard`
* `SeasonCard`
* `CastGrid`
* `CastCard`
* `CastDetailModal`
* `ContentBlockRenderer`
* `OfficialLinks`
* `AdBanner`
* `FamilyAppBridge`
* `PWAInstallPrompt`
* `CorrectionForm`

## OCR

* `OCRScanner`
* `OCRCaptureGuide`
* `OCRPreview`
* `OCRResultList`
* `OCRConfidenceBadge`
* `ManualProgramSearch`

## 관리자

* `AdminLayout`
* `AdminDashboard`
* `ProgramForm`
* `SeasonForm`
* `EpisodeForm`
* `AnalysisJobForm`
* `RawJsonInput`
* `JsonValidator`
* `GeneratedCardPreview`
* `ReviewPanel`
* `PublishControls`
* `CorrectionRequestList`
* `AdManager`

---

# 15. 서비스 레이어 구조

나중에 Supabase와 OCR API를 연결하기 쉽게 service layer를 분리한다.

## Recommended Service Files

* `programService`
* `seasonService`
* `episodeService`
* `castService`
* `contentBlockService`
* `officialLinkService`
* `ocrService`
* `analysisJobService`
* `correctionService`
* `adService`
* `familyAppService`

## OCR Service

```ts
ocrService.recognizeLocal()
ocrService.recognizeServerFallback()
ocrService.matchProgramCandidates()
ocrService.normalizeText()
```

## Analysis Service

```ts
analysisJobService.createJob()
analysisJobService.saveGeminiOutput()
analysisJobService.saveStructuredOutput()
analysisJobService.validateStructuredJson()
analysisJobService.generatePreview()
analysisJobService.publish()
```

---

# 16. Mock 데이터

초기 mock 데이터는 실제 방송 출연자 정보가 아닌 샘플 데이터로 만든다.

## 프로그램 예시

* 나는 솔로
* 돌싱글즈
* 환승연애
* 솔로지옥
* 하트시그널

각 프로그램에는 aliases를 넣는다.

예시:

```ts
{
  id: "program_nasolo",
  title: "나는 솔로",
  slug: "nasolo",
  aliases: ["나는 SOLO", "나는솔로", "나는 solo", "나는 쏠로", "nasolo"],
  category: "reality_show",
  broadcaster: "sample",
  status: "active"
}
```

샘플 출연자도 실제 인물이 아닌 가상 데이터로 만든다.

---

# 17. 디자인 방향

현재 리얼픽의 핑크 포인트와 네이비 카드 톤을 유지한다.

## 톤

* 밝은 배경
* 핑크 포인트
* 네이비/딥블루 카드 강조
* 귀엽지만 너무 유치하지 않게
* 모바일에서 정보 밀도 높게
* 카드가 너무 커지지 않게
* OCR 버튼은 눈에 띄게

## UX 원칙

* 로그인 없이 바로 사용
* 방송 중 3초 안에 정보 확인
* 한 화면에서 출연자 전체 확인
* 카드 클릭 시 상세 확인
* OCR 실패 시 직접 선택 가능
* 광고는 하단 중심
* 패밀리앱 유입은 과하지 않게
* 정보 수정 요청은 쉽게 접근 가능하게

---

# 18. 개발 우선순위

## 1단계: 사용자 MVP

1. 홈 화면 리팩토링
2. 프로그램/기수 mock data 구성
3. 출연자 전체 카드 화면
4. 출연자 상세 모달
5. 공식 링크 영역
6. 하단 띠배너 광고
7. 패밀리앱 유입 영역
8. 기존 미션/픽 메뉴 숨김

## 2단계: OCR MVP

1. `/ocr` 화면
2. 카메라 접근
3. 이미지 캡처
4. 상단 crop
5. mock OCR 결과
6. OCR 후보 매칭
7. 후보 선택 후 페이지 이동
8. Tesseract.js 연결 준비

## 3단계: 관리자 MVP

1. 관리자 라우트
2. 관리자 인증
3. 프로그램/시즌/회차 관리
4. 분석 작업 생성
5. Gemini 결과 붙여넣기
6. 구조화 JSON 붙여넣기
7. JSON validation
8. 카드 미리보기
9. 검수 승인
10. 발행

## 4단계: 운영 확장

1. Supabase 연결
2. 실제 OCR fallback 연결
3. 광고 관리자
4. 수정 요청 처리
5. 공식 링크 관리
6. 조회수/클릭수 통계

---

# 19. 품질 기준

* TypeScript 사용
* 컴포넌트 분리
* mock data 분리
* service layer 분리
* 모바일 우선 반응형
* PWA 유지
* 일반 사용자 무로그인
* 관리자만 로그인
* 얼굴인식 관련 코드/UI 추가 금지
* 출연자 SNS 링크 금지
* 댓글 기능 금지
* 자유 콘텐츠 블록 렌더링
* OCR 실패 시 직접 선택 가능
* 기존 미션/픽 기능은 삭제하지 말고 숨김 처리
* 빌드 에러 없이 동작
* 나중에 Supabase 연결 가능하게 구조화

---

# 20. 최종 목표

리얼픽 자기소개Ver.은 유저가 글을 올려야 작동하는 앱이 아니라, 운영자가 자동화 파이프라인으로 콘텐츠를 생산하고 사용자는 방송 중 바로 확인하는 정보형 PWA다.

초기 목표는 다음이다.

1. 사용자 로그인 없이 빠른 진입
2. OCR로 방송/기수 찾기
3. 전체 출연자 한 화면 확인
4. 자기소개 기반 자유 콘텐츠 카드
5. 공식 클립/OTT/홈페이지 유입
6. 하단 띠배너 광고
7. 멀린 패밀리앱 유입
8. 관리자 자동화 생산 라인 구축

이 개발기획서 기준으로 기존 리얼픽을 자기소개 정보카드 중심 PWA로 리팩토링해줘.
