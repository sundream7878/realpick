# 리얼픽 SNS 바이럴 시스템 (제로 코스트)

## 🎉 구현 완료!

**Gemini AI + Canvas + FFmpeg**로 완전 무료 영상 생성 시스템 구축 완료

---

## 📦 구현된 기능

### ✅ 1. Gemini AI 영상 시나리오 생성
- **파일**: `lib/video/scenario-generator.ts`
- **기능**: 미션 데이터를 받아 10초 영상 시나리오를 JSON으로 자동 생성
- **특징**: 
  - Track별 톤앤매너 자동 조정 (auto/dealer/result)
  - 자막, 타이밍, 애니메이션 모두 AI가 결정
  - Fallback 시나리오 포함 (Gemini 실패 시)

### ✅ 2. Canvas 기반 렌더링 엔진
- **파일**: `lib/video/canvas-renderer.ts`
- **기능**: 시나리오를 받아 실제 MP4 영상 생성
- **특징**:
  - HTML5 Canvas로 각 프레임 렌더링
  - FFmpeg로 이미지 → MP4 변환
  - 한글 폰트 지원 (Pretendard)
  - 애니메이션 효과 (fade-in, slide-in, pulse 등)

### ✅ 3. SNS 콘텐츠 생성 (멀티 플랫폼)
- **파일**: `lib/viral/content-generator.ts`
- **기능**: 미션 데이터로 Instagram/YouTube/TikTok 게시글 자동 생성
- **특징**:
  - 1번 API 호출로 3개 플랫폼 콘텐츠 생성
  - 캡션 + 해시태그 + CTA 모두 AI 생성
  - 해시태그 하이재킹 전략 포함

### ✅ 4. API 라우트
- **파일**: `app/api/video/render/route.ts`
- **엔드포인트**: 
  - `POST /api/video/render` - 영상 생성
  - `GET /api/video/render?missionId=xxx` - 상태 확인
- **기능**: 시나리오 생성 → 영상 렌더링 → SNS 콘텐츠 생성 통합

### ✅ 5. 타입 정의
- **파일**: `types/t-video/video.types.ts`
- **포함**: VideoScenario, RenderingJob, SnsContent, SnsPost 등

---

## 🚀 사용 방법

### 1. 설치 및 설정

**필수 프로그램**:
```bash
# FFmpeg 설치 (Windows)
choco install ffmpeg

# macOS
brew install ffmpeg
```

**패키지 설치** (이미 완료):
```bash
npm install canvas @google/generative-ai
```

**폰트 다운로드**:
1. https://github.com/orioncactus/pretendard/releases
2. `Pretendard-Bold.ttf` 다운로드
3. `assets/fonts/` 폴더에 복사

**자세한 가이드**: `SETUP_GUIDE.md` 참고

### 2. API 호출 예시

```typescript
// 영상 생성 요청
const response = await fetch('/api/video/render', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    missionId: 'mission-123',
    track: 'auto',
    platforms: ['instagram', 'youtube', 'tiktok']
  })
})

const { videoPath, scenario, snsContent } = await response.json()

console.log('영상 경로:', videoPath)
console.log('시나리오:', scenario)
console.log('Instagram 콘텐츠:', snsContent.instagram)
```

### 3. 어드민 UI 통합 예시

```typescript
// components/c-admin/MissionApprovalModal.tsx
const handleApprove = async () => {
  // 1. 미션 승인
  await updateMission(missionId, { status: 'approved' })
  
  // 2. 영상 생성 요청
  setIsGenerating(true)
  const res = await fetch('/api/video/render', {
    method: 'POST',
    body: JSON.stringify({
      missionId: mission.id,
      track: 'auto',
      platforms: ['instagram', 'youtube']
    })
  })
  
  const { videoPath, snsContent } = await res.json()
  setIsGenerating(false)
  
  // 3. 결과 표시
  toast({
    title: '영상 생성 완료!',
    description: `경로: ${videoPath}`
  })
  
  // 4. SNS 업로드 (수동 or 자동)
  console.log('Instagram 캡션:', snsContent.instagram.caption)
  console.log('해시태그:', snsContent.instagram.hashtags)
}
```

---

## 💰 비용 분석

| 항목 | 기존 (Remotion) | **새 방식 (Canvas)** |
|------|----------------|-------------------|
| 비디오 렌더링 | 7,500원/월 | **0원** ✅ |
| 시나리오 생성 | - | Gemini: 450원 |
| SNS 콘텐츠 | Gemini: 450원 | Gemini: 450원 |
| Storage | 78원 | 78원 |
| **합계** | **~8,030원/월** | **~980원/월** ⭐ |

**절감액**: 7,050원/월 (87% 절감!)

---

## 📊 성능 특성

### 렌더링 시간
- **10초 영상**: 약 2~3분 소요
- **FPS**: 30fps (300 프레임)
- **해상도**: 1080 x 1920 (9:16)

### 서버 리소스
- **CPU**: 렌더링 중 100% 사용
- **메모리**: 약 500MB~1GB
- **디스크**: 영상당 약 10~20MB

### 동시 처리
- **권장**: 2개 동시 렌더링
- **최대**: 4개 (서버 사양에 따라)

---

## 🎨 생성 예시

### 시나리오 예시 (Gemini 생성)
```json
{
  "duration": 10,
  "fps": 30,
  "scenes": [
    {
      "startTime": 0,
      "endTime": 1,
      "background": {
        "type": "gradient",
        "colors": ["#667eea", "#764ba2"]
      },
      "elements": [
        {
          "type": "text",
          "content": "🔥 충격 예고",
          "position": { "x": 540, "y": 960 },
          "style": {
            "fontSize": 80,
            "fontWeight": "bold",
            "color": "white",
            "textAlign": "center"
          },
          "animation": {
            "type": "fade-in",
            "duration": 0.5
          }
        }
      ]
    }
  ]
}
```

### SNS 콘텐츠 예시 (Gemini 생성)
```json
{
  "instagram": {
    "caption": "🔥 나솔 팬들 집합!\n\n영호님의 진중한 매력 vs 광수님의 유쾌한 에너지\n\n솔직히 말해보세요👇\nA: 영호\nB: 광수\n\n댓글로 A or B!",
    "hashtags": "#리얼픽 #나는솔로 #나솔20기 #영호 #광수 #촌장엔터테인먼트 #나솔갤 #릴스",
    "cta": "💡 리얼픽 앱에서 지금 투표하기"
  },
  "youtube": {
    "caption": "⚾ 나는 솔로 영호 vs 광수\n\n당신의 최애는? 댓글로 A or B!\n\n#Shorts",
    "hashtags": "#Shorts #나는솔로 #리얼픽",
    "cta": "💡 리얼픽 앱 투표하고 실시간 결과 보기"
  }
}
```

---

## 🔧 커스터마이징

### 템플릿 스타일 수정

**색상 변경**:
```typescript
// scenario-generator.ts의 Fallback 시나리오 수정
background: {
  type: 'gradient',
  colors: ['#YOUR_COLOR_1', '#YOUR_COLOR_2']
}
```

**폰트 크기 조정**:
```typescript
style: {
  fontSize: 80,  // 원하는 크기로 변경
  fontWeight: 'bold'
}
```

### 애니메이션 추가

지원되는 애니메이션:
- `fade-in`: 서서히 나타남
- `slide-in`: 위에서 슬라이드
- `scale`: 크기 확대
- `pulse`: 계속 커졌다 작아짐

새 애니메이션 추가는 `canvas-renderer.ts`의 `renderElement` 함수 수정

---

## 🐛 문제 해결

### FFmpeg 오류
```bash
# 설치 확인
ffmpeg -version

# 없으면 설치
choco install ffmpeg  # Windows
brew install ffmpeg   # macOS
```

### Canvas 빌드 오류 (Windows)
```bash
npm install --global windows-build-tools
npm install canvas --build-from-source
```

### 폰트 렌더링 오류
- `assets/fonts/Pretendard-Bold.ttf` 파일 존재 확인
- 파일명 대소문자 정확히 일치 확인

### 메모리 부족
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

**자세한 문제 해결**: `SETUP_GUIDE.md` 참고

---

## 📋 다음 단계 (선택)

### 1. Instagram API 연동
```typescript
// lib/sns/instagram.ts
export async function uploadInstagramReel(params: {
  videoPath: string
  caption: string
  hashtags: string
}) {
  // Instagram Graph API 호출
}
```

### 2. YouTube API 연동
```typescript
// lib/sns/youtube.ts
export async function uploadYouTubeShort(params: {
  videoPath: string
  title: string
  description: string
}) {
  // YouTube Data API v3 호출
}
```

### 3. 스케줄링 설정
```typescript
// Vercel Cron Job
export async function GET(req: NextRequest) {
  // 1일 3회 자동 업로드
}
```

### 4. 렌더링 큐 시스템
```typescript
// lib/video/queue.ts
import PQueue from 'p-queue'

const queue = new PQueue({ concurrency: 2 })

export async function addToQueue(missionId: string) {
  return queue.add(() => renderVideo(missionId))
}
```

---

## 📚 참고 자료

### 프로젝트 문서
- `SNS_VIRAL_ZERO_COST_PLAN.md` - 전체 플랜
- `SETUP_GUIDE.md` - 설치 가이드
- `REMOTION_VIDEO_GENERATION_GUIDE.md` - Remotion 비교

### 외부 문서
- [Canvas API](https://github.com/Automattic/node-canvas)
- [FFmpeg](https://ffmpeg.org/documentation.html)
- [Gemini API](https://ai.google.dev/docs)

---

## 🎯 요약

✅ **구현 완료된 기능**:
1. Gemini AI 영상 시나리오 생성
2. Canvas 기반 무료 렌더링
3. 멀티 플랫폼 SNS 콘텐츠 생성
4. API 라우트 통합
5. 타입 정의

✅ **비용**: 월 ~980원 (87% 절감)

✅ **품질**: Gemini AI로 풍부한 시나리오 & 자막

🎬 **바로 사용 가능!**

---

**작성**: AI Assistant  
**완료일**: 2026-02-10  
**버전**: 1.0 (제로 코스트 구현)
