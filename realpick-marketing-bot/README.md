# 🚀 리얼픽 마케팅 자동화 봇

> ⚠️ **중요**: 이 프로젝트는 **로컬에서만** 실행됩니다. Netlify 배포에서 자동으로 제외됩니다.

## 📋 개요

리얼픽 서비스를 위한 마케팅 자동화 시스템입니다.

- **YouTube 크롤링**: 키워드 기반 영상 검색 및 정보 수집
- **커뮤니티 크롤링**: 10대 커뮤니티 이슈 모니터링
- **네이버 카페 크롤링**: 맘카페 게시글 수집
- **AI 미션 생성**: Gemini를 활용한 자동 미션 생성
- **로컬 대시보드**: 웹 기반 관리 인터페이스

## 🏗️ 프로젝트 구조

```
realpick-marketing-bot/
├── crawler/          # Python 크롤러 (YouTube, 커뮤니티, 네이버카페)
├── backend/          # Node.js Express 서버 (포트 3001)
├── dashboard/        # React Vite 대시보드 (포트 5173)
├── .env.local        # 환경 변수 (Git 제외됨)
└── README.md         # 이 파일
```

## 🚀 시작하기

### 1. 환경 변수 설정

`.env.example`을 복사하여 `.env.local` 생성:

```bash
cp .env.example .env.local
```

메인 프로젝트(`F:/realpick/.env.local`)에서 Firebase 정보 복사

### 2. Python 의존성 설치

```bash
cd crawler
pip install -r requirements.txt
```

### 3. Node.js 의존성 설치

```bash
npm install
```

### 4. 서버 실행

```bash
# 백엔드 + 대시보드 동시 실행
npm run dev

# 또는 개별 실행
npm run dev:backend   # http://localhost:3001
npm run dev:dashboard # http://localhost:5173
```

### 5. 데이터 마이그레이션 (최초 1회)

```bash
npm run migrate
```

## 🖥️ 대시보드 접속

- **주소**: http://localhost:5173
- **비밀번호**: `.env.local`의 `VITE_ADMIN_PASSWORD` 값

## 📊 DB 테이블

마케팅 전용 테이블 (`t_marketing_*` 접두사):
- `t_marketing_viral_posts`: 커뮤니티 게시글
- `t_marketing_crawl_progress`: 크롤링 진행 상황
- `t_marketing_videos`: YouTube 영상
- `t_marketing_ai_missions`: AI 생성 미션 초안

## ⚠️ 주의사항

### 보안
- **절대 프로덕션 서버에 배포하지 마세요**
- 로컬(`localhost`, `127.0.0.1`)에서만 접근 가능
- `.env.local` 파일은 Git에 커밋되지 않음

### 배포
- Git 커밋: ✅ 허용
- Netlify 배포: 🚫 자동 제외 (`.netlifyignore`)

### 성능
- 크롤링 간격: 3~7초 (IP 차단 방지)
- YouTube API 할당량: 하루 10,000 units
- Firebase 무료 티어: 월 50,000회 읽기/쓰기

## 📝 문서

- [마이그레이션 완료 보고서](./MIGRATION_COMPLETE.md)
- [환경 변수 예시](./.env.example)

## 🔧 문제 해결

### Python 실행 오류
```bash
# Windows
py --version

# macOS/Linux
python3 --version
```

### 포트 충돌
```bash
# 포트 변경: .env.local에서 PORT 수정
PORT=3002
```

### Firebase 연결 오류
- `.env.local`의 Firebase 정보 확인
- 메인 프로젝트 `.env.local`과 동일한지 확인

---

**작성일**: 2026-02-06  
**문서 버전**: 1.0  
**내부 프로젝트** - 외부 공개 금지
