# 🎯 리얼픽 마케팅 자동화 시스템

리얼픽 앱 런칭을 위한 마케팅 자동화 도구입니다.

> **Note**: 이 도구는 `D:\realpick\scripts\marketing` 폴더로 통합되었습니다.

## 📋 프로젝트 개요

### 목표
- 유튜버 '딜러' 자동 모집 및 관리
- AI 기반 미션 자동 생성
- Next.js 앱과의 통합

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# scripts/marketing 폴더로 이동
cd scripts/marketing

# 가상환경 생성
python -m venv venv

# 가상환경 활성화 (Windows)
venv\Scripts\activate

# 가상환경 활성화 (Mac/Linux)
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt
```

### 2. 환경변수 설정

프로젝트 루트의 `.env.local` 파일에 다음 환경변수가 필요합니다:

```env
# YouTube API
YOUTUBE_API_KEY=your_youtube_api_key

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Firebase (Next.js 앱과 공유)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY=your_private_key
```

### 3. Next.js 앱과의 통합

이 마케팅 도구는 Next.js 앱의 API 라우트를 통해 실행됩니다:

- `/api/admin/marketer/youtube/crawl` - YouTube 크롤링
- `/api/admin/marketer/youtube/analyze` - AI 미션 분석
- `/api/admin/ai-missions/list` - 생성된 미션 목록

## 📁 프로젝트 구조

```
scripts/marketing/
├── modules/                  # 핵심 모듈들
│   ├── __init__.py
│   ├── youtube_crawler.py    # YouTube 크롤링
│   ├── gemini_analyzer.py    # AI 분석
│   ├── firebase_manager.py   # Firebase 관리
│   └── email_sender.py       # 이메일 발송
├── config/
│   └── settings.py           # 설정 파일
├── prompts/
│   └── recruit_analyzer_prompt.txt
├── requirements.txt          # Python 의존성
└── README.md                # 이 파일
```

## 🔧 주요 기능

### 1. **🔍 YouTube 크롤링**
   - 타겟 키워드의 최신 영상 자동 수집
   - 영상 메타데이터 및 통계 정보 추출
   - 자막 데이터 수집

### 2. **🤖 AI 분석**
   - Gemini AI를 통한 영상 내용 분석
   - 투표 주제 자동 추출
   - 미션 제목 및 선택지 자동 생성

### 3. **📝 미션 생성**
   - AI 분석 결과를 Firebase에 저장
   - 관리자 승인 워크플로우
   - 자동 미션 게시

### 4. **📧 이메일 발송**
   - 파트너십 제안 이메일 자동 생성
   - 채널 정보 기반 맞춤 이메일

## 🎯 사용 방법

Next.js 앱의 관리자 페이지(`/admin`)에서:

1. **마케터 관리** 탭으로 이동
2. **완전 자동 미션 생성** 또는 **YouTube 딜러 리쿠르팅** 사용
3. 생성된 미션을 **미션 승인 관리**에서 확인 및 승인

## 📊 모니터링

- Next.js 앱의 관리자 대시보드에서 실시간 통계 확인
- 수집된 영상/채널 목록
- 생성된 AI 미션 목록
- 발송된 이메일 추적

## 🛠️ 개발 정보

### 기술 스택
- **Language**: Python 3.8+
- **AI**: Google Gemini Pro
- **Database**: Firebase/Firestore
- **APIs**: YouTube Data API v3

### 통합
- Next.js API Routes를 통한 Python 실행
- Firebase를 통한 데이터 공유
- 환경변수 공유

## 📞 지원

문제가 발생하거나 기능 요청이 있으시면 개발팀에 연락해주세요.

---

**⚠️ 주의사항**
- 이 도구는 리얼픽 내부 사용 전용입니다
- API 키와 인증 정보를 안전하게 관리하세요
- 이메일 발송 시 스팸 정책을 준수하세요
