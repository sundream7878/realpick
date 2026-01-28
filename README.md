# 🎯 RealPick - 예능 투표 플랫폼

실시간 예능 프로그램 투표 및 예측 게임 플랫폼입니다.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/dreameend/v0-real-pick6)

## 📋 프로젝트 구조

```
realpick/
├── app/                      # Next.js App Router
│   ├── api/                 # API Routes
│   ├── admin/              # 관리자 페이지
│   └── p-*/                # 사용자 페이지들
├── components/              # React 컴포넌트
│   ├── c-admin/            # 관리자 컴포넌트
│   ├── c-ui/               # UI 컴포넌트
│   └── c-vote/             # 투표 컴포넌트
├── lib/                     # 유틸리티 및 설정
├── scripts/                 # 자동화 스크립트
│   └── marketing/          # 🐍 Python 마케팅 자동화 도구
│       ├── modules/        # YouTube 크롤링, AI 분석
│       ├── config/         # 설정 파일
│       └── requirements.txt
└── public/                  # 정적 파일
```

## 🚀 시작하기

### 1. Next.js 앱 실행

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 접속

### 2. Python 마케팅 도구 설정

```bash
cd scripts/marketing
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
```

자세한 내용은 [scripts/marketing/README.md](scripts/marketing/README.md) 참고

## 🔑 환경변수

프로젝트 루트에 `.env.local` 파일 생성:

```env
# Next.js App
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key

# Firebase (Python 마케팅 도구 공유)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY=your_private_key

# Python 마케팅 도구
YOUTUBE_API_KEY=your_youtube_api_key
GEMINI_API_KEY=your_gemini_api_key
```

## 🎯 주요 기능

### 웹 앱
- 실시간 예능 투표 및 예측 게임
- 티어 시스템 및 랭킹
- 댓글 및 커뮤니티 기능
- 포인트 및 보상 시스템

### 마케팅 자동화 (Python)
- YouTube 영상 자동 크롤링
- Gemini AI 기반 미션 자동 생성
- 채널 관리 및 이메일 발송
- Firebase 연동

## 🛠️ 기술 스택

### Frontend/Backend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase / Firebase
- **Deployment**: Vercel

### Marketing Automation
- **Language**: Python 3.8+
- **AI**: Google Gemini Pro
- **APIs**: YouTube Data API v3
- **Database**: Firebase/Firestore

## 📝 개발 가이드

### 관리자 페이지
`/admin` - 미션 관리, 유저 관리, 마케팅 도구

### API Routes
- `/api/missions/*` - 미션 CRUD
- `/api/admin/marketer/*` - 마케팅 자동화
- `/api/admin/ai-missions/*` - AI 생성 미션 관리

## 🔗 배포

프로젝트 배포 주소:
**[https://vercel.com/dreameend/v0-real-pick6](https://vercel.com/dreameend/v0-real-pick6)**

## 📞 지원

개발팀 문의: RealPick Team