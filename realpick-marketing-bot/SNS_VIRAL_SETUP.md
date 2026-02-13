# SNS 바이럴 시스템 - 리얼픽 마케터 통합 완료 🎉

## ✅ 구현 완료!

SNS 바이럴 영상 생성 시스템이 **localhost:5173 리얼픽 마케터 대시보드**에 완전히 통합되었습니다!

---

## 🚀 바로 시작하기

### 1. 개발 서버 실행

#### 마케터 대시보드 (localhost:5173)
```bash
cd realpick-marketing-bot/dashboard
npm run dev
```

#### 메인 Next.js 서버 (localhost:3002) - API 서버
```bash
cd ../..  # 프로젝트 루트로
npm run dev
```

> **중요**: 두 서버를 모두 실행해야 합니다!
> - localhost:5173: UI (마케터 대시보드)
> - localhost:3002: API (영상 생성 백엔드)

### 2. 대시보드 접속

```
http://localhost:5173
```

**비밀번호**: `realpick-admin-2024`

### 3. SNS 바이럴 탭 클릭

로그인 후 상단 탭에서 **"SNS 바이럴 (영상 생성)"** 클릭

---

## 🎬 사용 방법

### Step 1: 미션 선택
- 승인된 미션 목록에서 영상으로 만들 미션 클릭
- 보라색으로 하이라이트 표시

### Step 2: Track 선택
- 🤖 **AI 자동 미션**: 일반 사용자 타겟
- 🎬 **딜러 파트너십**: 딜러 채널 브랜딩 (추후)
- 🔥 **결과 중계**: 긴급 속보 스타일

### Step 3: 플랫폼 선택 (다중 선택)
- ✅ Instagram
- ✅ YouTube
- ✅ TikTok (추후)

### Step 4: 생성 시작
**"AI 영상 생성 시작"** 버튼 클릭

**진행 순서**:
```
Gemini 시나리오 생성 (10초)
  ↓
Canvas 영상 렌더링 (2~3분)
  ↓
SNS 콘텐츠 생성 (5초)
  ↓
완료!
```

### Step 5: 결과 확인
- 📹 **영상 다운로드**: temp/mission-xxx.mp4
- 📱 **SNS 콘텐츠**: 플랫폼별 캡션, 해시태그, CTA (복사 가능)
- 🎬 **시나리오 JSON**: Gemini가 생성한 시나리오 확인

---

## 📂 구현된 파일

### UI (마케터 대시보드)
```
realpick-marketing-bot/
├── dashboard/
│   ├── src/
│   │   ├── App.tsx                          ✅ 수정됨 (SNS 바이럴 탭 추가)
│   │   └── components/
│   │       └── SnsViralManage.tsx           ✅ 새로 생성 (메인 UI)
│   └── .env.local                           ✅ 수정됨 (VITE_API_URL 추가)
```

### API & 백엔드 (메인 Next.js 서버)
```
app/
├── api/
│   └── video/
│       ├── render/
│       │   └── route.ts                     ✅ 영상 생성 API
│       └── download/
│           └── route.ts                     ✅ 영상 다운로드 API

lib/
├── video/
│   ├── scenario-generator.ts                ✅ Gemini 시나리오 생성
│   └── canvas-renderer.ts                   ✅ Canvas + FFmpeg 렌더링
└── viral/
    └── content-generator.ts                 ✅ Gemini SNS 콘텐츠 생성

types/
└── t-video/
    └── video.types.ts                       ✅ TypeScript 타입 정의
```

---

## 🔧 환경 변수 설정

### realpick-marketing-bot/.env.local
```env
# Gemini API 키 (이미 설정됨)
GEMINI_API_KEY=AIzaSyAbo67FnZs1X2sSFAzRnWRep0zVzvULQac

# 메인 Next.js API 서버 URL (새로 추가됨)
VITE_API_URL=http://localhost:3002

# 대시보드 비밀번호
VITE_ADMIN_PASSWORD=realpick-admin-2024
```

### .env.local (프로젝트 루트)
```env
# Gemini API 키
GEMINI_API_KEY=your_gemini_api_key
```

---

## 💰 비용 분석

| 작업 | 소요 시간 | 비용 |
|------|----------|------|
| Gemini 시나리오 생성 | 10초 | 0.5원 |
| Canvas 렌더링 | 2~3분 | 0원 ✅ |
| Gemini SNS 콘텐츠 생성 | 5초 | 0.5원 |
| **합계** | **~3분** | **~1원** |

**월 300건 생성**: 약 980원

---

## 🎨 UI 특징

### 미션 선택 영역
- 승인된 미션만 표시
- 선택 시 보라색 하이라이트
- 프로그램명 배지 표시

### Track 선택 영역
- 3개 카드 레이아웃
- 이모지로 시각화

### 플랫폼 선택 영역
- 토글 가능 (다중 선택)
- 선택 시 아이콘 색상 변경

### 생성 진행 상황
- 애니메이션 로딩 인디케이터
- 단계별 안내 메시지
- 예상 소요 시간 표시

### 결과 화면
- 영상 다운로드 버튼
- 플랫폼별 SNS 콘텐츠 카드
- 원클릭 복사 기능
- Gemini 시나리오 JSON 확인

---

## 🔄 시스템 아키텍처

```
[마케터 대시보드 - localhost:5173]
         ↓ (HTTP POST)
[Next.js API - localhost:3002/api/video/render]
         ↓
    ┌─────────┐
    │ Gemini  │ → 시나리오 생성 (JSON)
    └─────────┘
         ↓
    ┌─────────┐
    │ Canvas  │ → 프레임 렌더링 (PNG)
    │ FFmpeg  │ → MP4 합성
    └─────────┘
         ↓
    ┌─────────┐
    │ Gemini  │ → SNS 콘텐츠 생성
    └─────────┘
         ↓
    ┌─────────┐
    │Firestore│ → rendering_jobs 저장
    └─────────┘
         ↓
    [대시보드 UI - 결과 표시]
```

---

## 🎯 완료된 기능

- ✅ 미션 선택 UI
- ✅ Track 선택 (AI 자동 / 딜러 / 결과)
- ✅ 플랫폼 선택 (Instagram / YouTube / TikTok)
- ✅ Gemini 시나리오 생성
- ✅ Canvas + FFmpeg 영상 렌더링
- ✅ Gemini SNS 콘텐츠 생성 (멀티 플랫폼)
- ✅ 영상 다운로드
- ✅ SNS 콘텐츠 복사
- ✅ 시나리오 JSON 확인
- ✅ 실시간 진행 상황 표시

---

## 📚 추가 문서

- `SNS_VIRAL_UI_GUIDE.md`: 상세 UI 사용 가이드
- `SNS_VIRAL_ZERO_COST_PLAN.md`: 기술 구현 계획
- `SETUP_GUIDE.md`: FFmpeg, 폰트 설치 가이드
- `INSTALLATION_COMPLETE.md`: 설치 완료 확인

---

## 🚨 주의사항

1. **두 서버 모두 실행 필수**
   - localhost:5173 (마케터 대시보드)
   - localhost:3002 (메인 Next.js API)

2. **Gemini API 키 필수**
   - `.env.local`에 `GEMINI_API_KEY` 설정

3. **FFmpeg 설치 필수**
   - Windows: `winget install ffmpeg`
   - 설치 확인: `ffmpeg -version`

4. **Canvas 패키지 설치**
   - 프로젝트 루트에서 `npm install` 이미 완료됨

---

## 🎉 완료!

이제 **http://localhost:5173**에서 바로 사용할 수 있습니다!

1. 마케터 대시보드 접속
2. 비밀번호 입력
3. "SNS 바이럴" 탭 클릭
4. 미션 선택 후 생성!

**문서 작성**: AI Assistant  
**완료일**: 2026-02-10  
**버전**: 2.0 (마케터 대시보드 통합)
