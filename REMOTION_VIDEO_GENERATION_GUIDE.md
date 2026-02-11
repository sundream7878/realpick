# Remotion 영상 생성 가이드
**작성일**: 2026-02-10  
**목표**: Remotion을 사용한 프로그래매틱 비디오 생성 원리 및 구현 방법

---

## 📺 Remotion이란?

**Remotion**은 React 컴포넌트를 영상(MP4)으로 변환해주는 프레임워크입니다.

### 핵심 개념

```
[React 컴포넌트] → [프레임별 렌더링] → [MP4 영상]
```

**일반 웹 개발**:
```jsx
function Card() {
  return <div>안녕하세요</div>  // 화면에 표시
}
```

**Remotion**:
```jsx
import { useCurrentFrame } from 'remotion'

function AnimatedCard() {
  const frame = useCurrentFrame()  // 현재 프레임 번호 (0, 1, 2, 3...)
  const opacity = frame / 30       // 1초(30fps) 동안 서서히 나타남
  
  return <div style={{ opacity }}>안녕하세요</div>  // 영상으로 렌더링
}
```

---

## 🎬 영상 생성 로직 전체 플로우

### Step 1: 시나리오 설계 (템플릿)

**시나리오 = React 컴포넌트로 구현된 영상 템플릿**

예시: "Question Card" 템플릿 (5초 영상)

```
타임라인:
0:00 ~ 0:30 (0~30 프레임)   : 배경 페이드인
0:30 ~ 1:00 (30~60 프레임)  : 질문 텍스트 등장
1:00 ~ 2:00 (60~120 프레임) : A vs B 선택지 슬라이드인
2:00 ~ 4:00 (120~240 프레임): 선택지 점멸 애니메이션
4:00 ~ 5:00 (240~300 프레임): CTA 문구 등장
```

### Step 2: React 컴포넌트로 구현

```tsx
// src/compositions/QuestionCard.tsx
import { AbsoluteFill, Sequence, Audio, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'

export const QuestionCard: React.FC<{
  // 입력 데이터 (미션 정보)
  title: string
  optionA: string
  optionB: string
  thumbnailUrl?: string
  showName: string
}> = ({ title, optionA, optionB, thumbnailUrl, showName }) => {
  
  const frame = useCurrentFrame()  // 현재 프레임 (0부터 시작)
  const { fps, durationInFrames } = useVideoConfig()  // 30fps, 150프레임(5초)
  
  // ===== 애니메이션 타이밍 계산 =====
  
  // 배경 페이드인 (0~30프레임, 0~1초)
  const bgOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' })
  
  // 질문 등장 (30~60프레임, 1~2초)
  const titleOpacity = interpolate(frame, [30, 60], [0, 1], { extrapolateRight: 'clamp' })
  const titleY = interpolate(frame, [30, 60], [50, 0], { extrapolateRight: 'clamp' })
  
  // 선택지 등장 (60~90프레임, 2~3초)
  const optionsScale = interpolate(frame, [60, 90], [0.5, 1], { extrapolateRight: 'clamp' })
  
  // 선택지 점멸 (90~240프레임, 3~8초)
  const pulseA = Math.sin(frame / 10) * 0.1 + 0.9  // 사인파로 크기 변화
  const pulseB = Math.cos(frame / 10) * 0.1 + 0.9
  
  // CTA 등장 (240~270프레임, 8~9초)
  const ctaOpacity = interpolate(frame, [240, 270], [0, 1], { extrapolateRight: 'clamp' })
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* 배경 그라디언트 */}
      <AbsoluteFill style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        opacity: bgOpacity
      }} />
      
      {/* 블러 썸네일 (있을 경우) */}
      {thumbnailUrl && (
        <Img 
          src={thumbnailUrl} 
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(40px)',
            opacity: 0.3
          }}
        />
      )}
      
      {/* 상단: 프로그램 뱃지 */}
      <div style={{
        position: 'absolute',
        top: 100,
        left: 0,
        right: 0,
        textAlign: 'center'
      }}>
        <div style={{
          display: 'inline-block',
          padding: '15px 40px',
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: 50,
          fontSize: 40,
          fontWeight: 'bold',
          color: 'white',
          opacity: titleOpacity
        }}>
          {showName}
        </div>
      </div>
      
      {/* 중앙: 질문 텍스트 */}
      <div style={{
        position: 'absolute',
        top: 300,
        left: 60,
        right: 60,
        opacity: titleOpacity,
        transform: `translateY(${titleY}px)`
      }}>
        <h1 style={{
          fontSize: 70,
          fontWeight: 'bold',
          color: 'white',
          textAlign: 'center',
          lineHeight: 1.4,
          margin: 0,
          textShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}>
          {title}
        </h1>
      </div>
      
      {/* A vs B 선택지 */}
      <div style={{
        position: 'absolute',
        top: 700,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-around',
        padding: '0 80px',
        transform: `scale(${optionsScale})`
      }}>
        {/* Option A */}
        <div style={{
          background: 'linear-gradient(135deg, #FF6B6B 0%, #FF4757 100%)',
          borderRadius: 30,
          padding: '50px 60px',
          width: 400,
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(255,107,107,0.5)',
          transform: `scale(${pulseA})`
        }}>
          <div style={{
            fontSize: 100,
            fontWeight: 'bold',
            color: 'white',
            marginBottom: 20
          }}>
            A
          </div>
          <div style={{
            fontSize: 50,
            color: 'white',
            fontWeight: '600'
          }}>
            {optionA}
          </div>
        </div>
        
        {/* VS */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: 80,
          fontWeight: 'bold',
          color: 'white',
          textShadow: '0 4px 20px rgba(0,0,0,0.8)'
        }}>
          VS
        </div>
        
        {/* Option B */}
        <div style={{
          background: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
          borderRadius: 30,
          padding: '50px 60px',
          width: 400,
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(78,205,196,0.5)',
          transform: `scale(${pulseB})`
        }}>
          <div style={{
            fontSize: 100,
            fontWeight: 'bold',
            color: 'white',
            marginBottom: 20
          }}>
            B
          </div>
          <div style={{
            fontSize: 50,
            color: 'white',
            fontWeight: '600'
          }}>
            {optionB}
          </div>
        </div>
      </div>
      
      {/* 하단: CTA */}
      <div style={{
        position: 'absolute',
        bottom: 150,
        left: 0,
        right: 0,
        textAlign: 'center',
        opacity: ctaOpacity
      }}>
        <div style={{
          fontSize: 55,
          fontWeight: 'bold',
          color: 'white',
          textShadow: '0 4px 20px rgba(0,0,0,0.8)',
          marginBottom: 20
        }}>
          🔥 당신의 선택은?
        </div>
        <div style={{
          fontSize: 45,
          color: '#FFE66D',
          fontWeight: '600'
        }}>
          리얼픽 앱에서 지금 투표하기
        </div>
      </div>
      
      {/* BGM */}
      <Audio 
        src="https://your-storage.com/bgm/energetic-beat.mp3" 
        volume={0.3}
        startFrom={0}
        endAt={durationInFrames}
      />
    </AbsoluteFill>
  )
}
```

### Step 3: Composition 등록

```tsx
// src/Root.tsx
import { Composition } from 'remotion'
import { QuestionCard } from './compositions/QuestionCard'

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="QuestionCard"
        component={QuestionCard}
        durationInFrames={300}  // 10초 (30fps × 10)
        fps={30}
        width={1080}
        height={1920}  // 9:16 세로 비율
        defaultProps={{
          title: "나는 솔로 영호 vs 광수",
          optionA: "영호",
          optionB: "광수",
          thumbnailUrl: "https://example.com/thumbnail.jpg",
          showName: "나는 솔로"
        }}
      />
    </>
  )
}
```

### Step 4: 렌더링 실행

#### 방법 1: 로컬 렌더링 (개발/테스트용)

```bash
# Remotion 프로젝트에서 실행
npx remotion render QuestionCard output.mp4
```

#### 방법 2: Node.js API (프로덕션용)

```typescript
// lib/video/renderer.ts
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { execSync } from 'child_process'
import path from 'path'

export async function renderMissionVideo(params: {
  missionId: string
  title: string
  optionA: string
  optionB: string
  thumbnailUrl?: string
  showName: string
}): Promise<string> {
  
  console.log(`[Video Render] 시작: ${params.missionId}`)
  
  // 1. Remotion 프로젝트 번들링
  const bundleLocation = await bundle({
    entryPoint: path.resolve('./remotion/src/index.tsx'),
    webpackOverride: (config) => config
  })
  
  console.log(`[Video Render] 번들링 완료: ${bundleLocation}`)
  
  // 2. Composition 정보 가져오기
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'QuestionCard',
    inputProps: {
      title: params.title,
      optionA: params.optionA,
      optionB: params.optionB,
      thumbnailUrl: params.thumbnailUrl,
      showName: params.showName
    }
  })
  
  // 3. 렌더링
  const outputPath = path.join('/tmp', `mission-${params.missionId}.mp4`)
  
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: {
      title: params.title,
      optionA: params.optionA,
      optionB: params.optionB,
      thumbnailUrl: params.thumbnailUrl,
      showName: params.showName
    },
    onProgress: ({ progress }) => {
      console.log(`[Video Render] 진행률: ${Math.round(progress * 100)}%`)
    }
  })
  
  console.log(`[Video Render] 완료: ${outputPath}`)
  
  // 4. S3/Storage에 업로드
  const videoUrl = await uploadToStorage(outputPath, `videos/${params.missionId}.mp4`)
  
  return videoUrl
}
```

#### 방법 3: Remotion Lambda (서버리스, 권장 ⭐)

```typescript
// lib/video/lambda-renderer.ts
import { renderMediaOnLambda } from '@remotion/lambda/client'
import { getFunctions, deployFunction } from '@remotion/lambda'

export async function renderOnLambda(params: {
  missionId: string
  title: string
  optionA: string
  optionB: string
  thumbnailUrl?: string
  showName: string
}): Promise<string> {
  
  // Lambda 함수 배포 (최초 1회만)
  const functions = await getFunctions({ region: 'us-east-1' })
  const functionName = functions[0]?.functionName || await deployFunction({
    region: 'us-east-1',
    memorySizeInMb: 2048,
    diskSizeInMb: 2048,
    timeoutInSeconds: 120
  })
  
  // Lambda에서 렌더링 실행
  const { renderId, bucketName } = await renderMediaOnLambda({
    region: 'us-east-1',
    functionName,
    composition: 'QuestionCard',
    serveUrl: 'https://your-remotion-bundle.s3.amazonaws.com/bundle.js',
    inputProps: {
      title: params.title,
      optionA: params.optionA,
      optionB: params.optionB,
      thumbnailUrl: params.thumbnailUrl,
      showName: params.showName
    },
    codec: 'h264',
    imageFormat: 'jpeg',
    maxRetries: 1,
    framesPerLambda: 20
  })
  
  console.log(`[Lambda Render] 작업 ID: ${renderId}`)
  
  // 렌더링 완료 대기 (폴링)
  const videoUrl = await pollLambdaRender(renderId, bucketName)
  
  return videoUrl
}
```

---

## 🎨 시나리오(템플릿) 설계 가이드

### Track별 템플릿

#### 1. Question Card (Track 1: AI 자동 미션)

**타임라인 (10초)**:
```
0:00 - 0:01 (0~30F)    : 배경 페이드인 + 프로그램 뱃지
0:01 - 0:02 (30~60F)   : 질문 텍스트 슬라이드인
0:02 - 0:03 (60~90F)   : A vs B 선택지 등장
0:03 - 0:08 (90~240F)  : 선택지 점멸 + BGM 강조
0:08 - 0:10 (240~300F) : CTA 등장 + QR 코드 (옵션)
```

**디자인 요소**:
- 배경: 그라디언트 or 블러 썸네일
- 폰트: 굵은 고딕체 (가독성 최우선)
- 색상: 대비가 강한 A(빨강), B(청록)
- 애니메이션: 부드러운 이징 (ease-in-out)

#### 2. Partner Card (Track 2: 딜러 파트너십)

**타임라인 (10초)**:
```
0:00 - 0:01 (0~30F)    : 딜러 로고 + 인트로
0:01 - 0:02 (30~60F)   : 딜러 프로필 이미지 등장
0:02 - 0:03 (60~90F)   : 미션 질문
0:03 - 0:08 (90~240F)  : 선택지 + "Created by [딜러명]" 배지
0:08 - 0:10 (240~300F) : CTA + 딜러 채널 링크
```

**차별점**:
- 딜러 브랜딩: 로고, 대표 색상
- 하단 워터마크: "Powered by 리얼픽 × [딜러명]"

#### 3. Data Live (Track 4: 결과 중계)

**타임라인 (8초)**:
```
0:00 - 0:01 (0~30F)    : 긴급 속보 효과 (빨간 테두리)
0:01 - 0:02 (30~60F)   : 미션 제목 + "투표 100건 돌파!"
0:02 - 0:05 (60~150F)  : 실시간 그래프 차오름 (카운트업 애니메이션)
0:05 - 0:07 (150~210F) : "충격! 결과 뒤집혔다!" 텍스트
0:07 - 0:08 (210~240F) : CTA + 투표 링크
```

**디자인 요소**:
- 스포츠 중계 스타일 (ESPN, SPOTV)
- 숫자 카운트업 애니메이션
- 그래프: 막대 or 원형 차트

---

## 🏗️ Remotion 프로젝트 구조

```
realpick-video-renderer/
├── remotion/
│   ├── src/
│   │   ├── compositions/
│   │   │   ├── QuestionCard.tsx       # Track 1 템플릿
│   │   │   ├── PartnerCard.tsx        # Track 2 템플릿
│   │   │   ├── DataLive.tsx           # Track 4 템플릿
│   │   │   └── components/
│   │   │       ├── AnimatedText.tsx   # 재사용 컴포넌트
│   │   │       ├── ProgressBar.tsx
│   │   │       └── PulseButton.tsx
│   │   ├── assets/
│   │   │   ├── fonts/
│   │   │   │   └── Pretendard-Bold.woff2
│   │   │   ├── bgm/
│   │   │   │   ├── energetic-beat.mp3
│   │   │   │   └── suspense-drums.mp3
│   │   │   └── sfx/
│   │   │       └── whoosh.mp3
│   │   ├── Root.tsx                   # 모든 Composition 등록
│   │   └── index.tsx
│   ├── remotion.config.ts
│   └── package.json
├── lib/
│   └── video/
│       ├── renderer.ts                # 렌더링 로직
│       ├── lambda-renderer.ts         # Lambda 렌더링
│       └── uploader.ts                # S3 업로드
├── app/
│   └── api/
│       └── video/
│           └── render/
│               └── route.ts           # 렌더링 API 엔드포인트
└── package.json
```

---

## 🔧 API 통합

### Next.js API Route

```typescript
// app/api/video/render/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { renderMissionVideo } from '@/lib/video/renderer'
import { getMissionById } from '@/lib/db/missions'

export async function POST(req: NextRequest) {
  const { missionId } = await req.json()
  
  // 1. 미션 데이터 가져오기
  const mission = await getMissionById(missionId)
  if (!mission) {
    return NextResponse.json({ error: '미션을 찾을 수 없습니다' }, { status: 404 })
  }
  
  // 2. 영상 렌더링
  try {
    const videoUrl = await renderMissionVideo({
      missionId: mission.id,
      title: mission.title,
      optionA: mission.optionA,
      optionB: mission.optionB,
      thumbnailUrl: mission.thumbnailUrl,
      showName: getShowById(mission.showId)?.displayName || '리얼픽'
    })
    
    // 3. rendering_jobs 업데이트
    await updateRenderingJob(missionId, {
      status: 'completed',
      videoUrl,
      renderTimeMs: Date.now() - startTime
    })
    
    return NextResponse.json({ 
      success: true, 
      videoUrl 
    })
  } catch (error) {
    console.error('[Video Render] 실패:', error)
    
    await updateRenderingJob(missionId, {
      status: 'failed',
      errorMessage: error.message
    })
    
    return NextResponse.json({ 
      error: '영상 렌더링 실패',
      details: error.message 
    }, { status: 500 })
  }
}
```

### 어드민에서 호출

```typescript
// components/c-admin/MissionApprovalModal.tsx
const handleApprove = async () => {
  // 1. 미션 승인
  await updateMission(mission.id, {
    status: 'approved',
    castTags,
    approvedAt: new Date()
  })
  
  // 2. 영상 렌더링 요청
  const renderRes = await fetch('/api/video/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ missionId: mission.id })
  })
  
  const { videoUrl } = await renderRes.json()
  
  // 3. Gemini AI 콘텐츠 생성
  const snsContent = await generateSnsContent({
    mission,
    track: 'auto',
    platform: 'instagram'
  })
  
  // 4. SNS 업로드
  await uploadToSns({
    mission,
    track: 'auto',
    videoUrl,
    snsContent,
    platforms: ['instagram', 'youtube']
  })
  
  toast({ title: '승인 완료', description: 'SNS 업로드까지 완료되었습니다!' })
}
```

---

## 💰 렌더링 비용 비교

### 옵션 1: 로컬 서버 렌더링

**장점**:
- 비용 무료 (서버 유지비만)
- 완전한 제어 가능

**단점**:
- 서버 사양 필요 (CPU, RAM)
- 렌더링 시간 오래 걸림 (1분~3분/영상)
- 동시 렌더링 제한

**비용**: 월 0원 (서버 이미 있을 경우)

### 옵션 2: Remotion Lambda (권장 ⭐)

**장점**:
- 빠른 렌더링 (10~30초/영상)
- 무한 확장 가능 (동시 100개 렌더링)
- 관리 불필요

**단점**:
- 사용량 기반 과금

**비용**: 
- 10초 영상 기준: **~25원/건**
- 월 300건: **~7,500원**

### 옵션 3: Puppeteer + FFmpeg (DIY)

**장점**:
- 완전 커스텀 가능
- 비용 저렴

**단점**:
- 구현 복잡도 높음
- 유지보수 어려움
- 에러 핸들링 까다로움

**비용**: 월 ~5,000원 (서버 + FFmpeg)

---

## 🎯 추천 구성

### Phase 1 (MVP): 로컬 렌더링
- Remotion 로컬에서 테스트
- 템플릿 완성도 검증
- 초기 10~20개 영상 생성

### Phase 2 (확장): Lambda 전환
- 일일 3회 자동 업로드 시작
- Lambda로 마이그레이션
- 렌더링 큐 시스템 구축

### Phase 3 (최적화): 캐싱 + 병렬화
- 템플릿별 렌더링 캐시
- 병렬 렌더링 (동시 5개)
- 실패 시 자동 재시도

---

## 📚 참고 자료

- [Remotion 공식 문서](https://www.remotion.dev/docs)
- [Remotion Lambda 가이드](https://www.remotion.dev/docs/lambda)
- [React Animation 베스트 프랙티스](https://www.remotion.dev/docs/animating)

---

**작성**: AI Assistant  
**버전**: 1.0
