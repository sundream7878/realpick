# 리얼픽 SNS 바이럴 시스템 구축 플랜
**문서 버전**: 2.1 (Gemini AI 콘텐츠 생성 통합)  
**작성일**: 2026-02-10  
**최종 수정**: 2026-02-10  
**목표**: 앱 내 미션 데이터를 숏폼 영상으로 자동 변환하여 Instagram/YouTube/TikTok 배포 및 트래픽 유입

---

## 🚀 핵심 변경사항 (v2.1)

### Gemini AI 전면 도입 ⭐
기존 계획에서는 **해시태그만 AI로 생성**했지만, 이제 **게시글 캡션(본문)도 Gemini AI로 자동 생성**합니다.

**변경 전 (v2.0)**:
```typescript
// ❌ 정형화된 템플릿
const caption = `🔥 ${mission.title}\n\n당신의 선택은?\nA: ${mission.optionA}\nB: ${mission.optionB}`
const hashtags = await generateHashtags(mission)  // AI 생성
```

**변경 후 (v2.1)**:
```typescript
// ✅ 캡션 + 해시태그 모두 AI 생성
const content = await generateSnsContent({
  mission,
  track: 'auto',
  platform: 'instagram'
})
// content.caption: 자연스럽고 바이럴에 최적화된 본문
// content.hashtags: 하이재킹 전략이 포함된 해시태그
// content.cta: 플랫폼별 최적화된 CTA
```

### 주요 장점

1. **더 자연스러운 콘텐츠**: 정형화된 템플릿 벗어남
2. **Track별 차별화**: AI가 상황에 맞는 톤앤매너 자동 조정
3. **플랫폼 최적화**: Instagram/YouTube/TikTok 각각에 맞는 스타일
4. **바이럴 전략**: 해시태그 하이재킹, 출연자 언급 등을 자연스럽게 통합
5. **비용 효율**: 멀티 플랫폼 콘텐츠 1번 API 호출로 생성 (월 150~450원)

---

## 📋 목차
1. [시스템 아키텍처 개요](#1-시스템-아키텍처-개요)
2. [Phase별 구현 계획](#2-phase별-구현-계획)
3. [DB 스키마 설계](#3-db-스키마-설계)
4. [4-Track 시스템 상세](#4-4-track-시스템-상세)
5. [비디오 렌더링 엔진](#5-비디오-렌더링-엔진)
6. [SNS API 연동](#6-sns-api-연동)
7. [태그/해시태그 전략](#7-태그해시태그-전략)
8. [어드민 UI 설계](#8-어드민-ui-설계)
9. [스케줄링 & 자동화](#9-스케줄링--자동화)
10. [비용 및 리스크 관리](#10-비용-및-리스크-관리)

---

## 1. 시스템 아키텍처 개요

### 1.1 핵심 컨셉
```
[리얼픽 앱 미션 데이터] 
    ↓
[프로그래매틱 비디오 생성] (HTML/CSS → Video)
    ↓
[SNS 자동 배포] (Instagram/YouTube/TikTok)
    ↓
[태그/해시태그 하이재킹] → [앱 트래픽 유입]
```

### 1.2 기술 스택 선택

#### Option A: Remotion (권장 ⭐)
- **장점**: React 기반, 타입스크립트 지원, 유지보수 용이
- **단점**: 서버 사양 요구 (렌더링 시 CPU/메모리)
- **비용**: 건당 약 20-30원 (Lambda 기준)

#### Option B: Puppeteer + FFmpeg
- **장점**: 자유도 높음, HTML 템플릿 직접 제어
- **단점**: 복잡한 파이프라인, 에러 핸들링 어려움
- **비용**: 건당 약 15-25원

**→ 결정: Remotion 사용 (개발 속도 + 유지보수성 우선)**

### 1.3 인프라 구조
```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │  어드민 UI  │  │  API Routes│  │ Cron Jobs  │       │
│  └────────────┘  └────────────┘  └────────────┘       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│              Video Rendering Service                    │
│  (Remotion Lambda or Self-hosted Renderer)             │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                 SNS API Gateway                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ Instagram API│ │ YouTube API  │ │  TikTok API  │   │
│  └──────────────┘ └──────────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│              Firebase / Supabase                        │
│  - missions (미션 데이터)                                 │
│  - dealers (딜러 정보)                                    │
│  - sns_posts (SNS 게시 로그)                              │
│  - rendering_jobs (렌더링 작업 큐)                         │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Phase별 구현 계획

### Phase 1: 기반 구축 (2-3주)
**목표**: MVP 완성 - Track 1(AI 자동 미션) 1개 채널(Instagram) 배포

#### Week 1: DB & 렌더링 엔진
- [ ] DB 스키마 업데이트 (dealers, missions)
- [ ] Remotion 프로젝트 초기 설정
- [ ] Question Card 템플릿 개발 (9:16 세로형)
- [ ] 로컬 렌더링 테스트 환경 구축

#### Week 2: SNS 연동 & 어드민
- [ ] Instagram Graph API 연동
- [ ] 어드민 UI: 출연자 태그 입력 필드
- [ ] 어드민 UI: 미션 승인 시 영상 생성 트리거
- [ ] 영상 생성 로그 확인 페이지

#### Week 3: AI 콘텐츠 생성 & 테스트 ⭐
- [ ] **Gemini API: 게시글 캡션 + 해시태그 통합 생성 로직**
- [ ] **Track별 프롬프트 템플릿 작성 (auto/dealer/result)**
- [ ] **플랫폼별 프롬프트 최적화 (Instagram/YouTube/TikTok)**
- [ ] 계정 태그(@) 자동 삽입 로직
- [ ] End-to-End 테스트 (미션 승인 → 영상 생성 → AI 콘텐츠 생성 → 인스타 업로드)
- [ ] **AI 생성 콘텐츠 품질 검증 및 프롬프트 튜닝**
- [ ] 초기 10개 미션 배포 및 반응 분석

### Phase 2: 확장 (2주)
**목표**: Track 2(딜러 파트너십) + YouTube Shorts 추가

- [ ] Partner Card 템플릿 개발
- [ ] 딜러방 UI: 미션 등록 시 영상 다운로드 기능
- [ ] YouTube Data API v3 연동
- [ ] 딜러 인스타 계정 크롤링 자동화

### Phase 3: 고도화 (2-3주)
**목표**: Track 4(핫 이슈 결과) + TikTok + 스케줄링

- [ ] Data Live 템플릿 (그래프 애니메이션)
- [ ] TikTok API 연동
- [ ] 투표수 100건/박빙 상황 실시간 감지
- [ ] Cron Job: 1일 3회 자동 업로드 스케줄링
- [ ] 공식 채널 "리얼픽 랭킹" 오픈

### Phase 4: 최적화 (지속)
- [ ] 비용 최적화 (렌더링 캐싱, 병렬 처리)
- [ ] A/B 테스트 (템플릿 스타일, 해시태그 조합)
- [ ] 분석 대시보드 (조회수, 유입 경로, 전환율)

---

## 3. DB 스키마 설계

### 3.1 기존 테이블 업데이트

#### `dealers` 테이블
```typescript
interface Dealer {
  id: string
  name: string
  channelName: string
  youtubeUrl: string
  subscriberCount: number
  // ✨ NEW
  instagramHandle?: string  // '@' 제외 ID (예: "youngho_official")
  instagramVerified?: boolean // 인증 여부
  tiktokHandle?: string     // 선택
  createdAt: Date
  updatedAt: Date
}
```

#### `missions` 테이블
```typescript
interface Mission {
  id: string
  title: string
  showId: string
  optionA: string
  optionB: string
  thumbnailUrl?: string
  status: 'pending' | 'approved' | 'rejected'
  // ✨ NEW
  castTags?: string[]       // 출연자 인스타 ID 리스트
  viralHashtags?: string    // AI 생성 해시태그 ("#리얼픽 #나는솔로 ...")
  dealerId?: string         // Track 2용
  createdAt: Date
  approvedAt?: Date
}
```

### 3.2 신규 테이블

#### `sns_posts` (SNS 게시 로그)
```typescript
interface SnsPost {
  id: string
  missionId: string
  track: 'auto' | 'dealer' | 'main' | 'result'  // 4-Track
  platform: 'instagram' | 'youtube' | 'tiktok'
  postUrl?: string          // 업로드된 게시물 URL
  videoUrl: string          // 렌더링된 영상 파일 URL
  status: 'pending' | 'uploading' | 'success' | 'failed'
  errorMessage?: string
  metadata: {
    mentions: string[]      // 태그된 계정
    hashtags: string[]      // 사용된 해시태그
    views?: number          // 조회수 (주기적 업데이트)
    likes?: number
    comments?: number
  }
  createdAt: Date
  uploadedAt?: Date
}
```

#### `rendering_jobs` (렌더링 작업 큐)
```typescript
interface RenderingJob {
  id: string
  missionId: string
  track: 'auto' | 'dealer' | 'main' | 'result'
  template: 'question-card' | 'partner-card' | 'data-live'
  status: 'queued' | 'rendering' | 'completed' | 'failed'
  priority: number          // 1(낮음) ~ 5(높음)
  videoUrl?: string         // 렌더링 완료 시
  renderTimeMs?: number
  errorMessage?: string
  createdAt: Date
  completedAt?: Date
}
```

---

## 4. 4-Track 시스템 상세

### Track 1: AI 자동 미션 배포
**트리거**: 마케팅 에이전트가 미션 생성 → 어드민이 승인

**워크플로우**:
```
1. 어드민이 미션 승인 버튼 클릭
2. missions.castTags 확인 (출연자 태그)
3. Gemini API 호출: viralHashtags 생성
4. rendering_jobs에 작업 추가 (template: 'question-card')
5. Remotion 렌더링:
   - 미션 제목 텍스트
   - VS 선택지 (A vs B)
   - 유튜브 썸네일 (블러 처리)
   - 애니메이션: 질문 등장 → 선택지 점멸 → "지금 투표하기"
6. 영상 파일 S3/Storage 업로드
7. Instagram API 호출:
   - caption: missions.viralHashtags
   - user_tags: missions.castTags
8. sns_posts 레코드 생성 (status: 'success')
```

**템플릿 디자인**:
- 비율: 1080x1920 (9:16)
- 배경: 그라디언트 or 블러 썸네일
- 폰트: 굵은 고딕 (가독성 최우선)
- CTA: 하단에 "리얼픽 앱에서 투표하기" + QR 코드 옵션

### Track 2: 딜러 파트너십 배포
**트리거**: 딜러가 딜러방에서 미션 등록

**워크플로우**:
```
1. 딜러가 미션 제출
2. missions.dealerId에 딜러 ID 저장
3. rendering_jobs 추가 (template: 'partner-card')
4. Remotion 렌더링:
   - 딜러 프로필 이미지
   - 미션 내용
   - 하단 배지: "Created by [채널명]"
5. 두 가지 액션:
   a) 공식 SNS 업로드 (딜러 계정 @태그 필수)
   b) 딜러에게 mp4 다운로드 링크 제공 (이메일/앱 알림)
```

**차별점**: 
- 딜러 브랜딩 노출 (로고, 워터마크)
- 딜러 본인 채널 업로드 시 추가 리워드 지급 옵션

### Track 3: 메인 미션 홍보
**현황**: 어드민 메뉴만 생성됨

**추후 개발 시**:
- 주요 이벤트 미션 선정 (어드민이 수동 지정)
- 더 화려한 템플릿 (트레일러 스타일)
- 별도 BGM 및 TTS 나레이션

### Track 4: 핫 이슈 결과 중계
**트리거**: 
- 투표수 100건 돌파
- OR 49:51 박빙 상황

**워크플로우**:
```
1. Firestore Trigger: votes 컬렉션 실시간 감지
2. 조건 충족 시 rendering_jobs 추가 (template: 'data-live')
3. Remotion 렌더링:
   - 실시간 투표 그래프 (막대/원형)
   - 애니메이션: 숫자 카운트업, 바 차오름
   - 텍스트: "충격! 결과 뒤집혔다!" 등
4. SNS 업로드 + 첫 댓글에 투표 링크 고정
```

**템플릿 디자인**:
- 스포츠 중계 스타일
- 강렬한 컬러 (빨강/파랑 대비)
- TTS 옵션: "현재 A가 51%, B가 49%로 앞서고 있습니다!"

---

## 5. 비디오 렌더링 엔진

### 5.1 Remotion 프로젝트 구조
```
realpick-video-renderer/
├── src/
│   ├── compositions/
│   │   ├── QuestionCard.tsx       # Track 1
│   │   ├── PartnerCard.tsx        # Track 2
│   │   ├── DataLive.tsx           # Track 4
│   │   └── Root.tsx
│   ├── components/
│   │   ├── AnimatedText.tsx
│   │   ├── ProgressBar.tsx
│   │   └── QRCode.tsx
│   ├── assets/
│   │   ├── fonts/
│   │   ├── bgm/
│   │   └── sfx/
│   └── utils/
│       ├── renderVideo.ts
│       └── uploadToStorage.ts
├── remotion.config.ts
└── package.json
```

### 5.2 QuestionCard 템플릿 예시
```tsx
// src/compositions/QuestionCard.tsx
import { AbsoluteFill, Audio, Img, interpolate, useCurrentFrame } from 'remotion'

export const QuestionCard: React.FC<{
  title: string
  optionA: string
  optionB: string
  thumbnailUrl?: string
}> = ({ title, optionA, optionB, thumbnailUrl }) => {
  const frame = useCurrentFrame()
  
  // 애니메이션 타이밍
  const titleOpacity = interpolate(frame, [0, 30], [0, 1])
  const optionsScale = interpolate(frame, [40, 60], [0.8, 1], { extrapolateRight: 'clamp' })
  
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* 배경 썸네일 (블러) */}
      {thumbnailUrl && (
        <Img src={thumbnailUrl} style={{ filter: 'blur(20px)', opacity: 0.3 }} />
      )}
      
      {/* 제목 */}
      <div style={{ opacity: titleOpacity, fontSize: 60, fontWeight: 'bold', color: 'white', textAlign: 'center', marginTop: 300 }}>
        {title}
      </div>
      
      {/* A vs B */}
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 100, transform: `scale(${optionsScale})` }}>
        <div style={{ background: '#FF6B6B', padding: 40, borderRadius: 20 }}>
          <div style={{ fontSize: 80, fontWeight: 'bold' }}>A</div>
          <div style={{ fontSize: 40 }}>{optionA}</div>
        </div>
        <div style={{ fontSize: 60, color: 'white' }}>VS</div>
        <div style={{ background: '#4ECDC4', padding: 40, borderRadius: 20 }}>
          <div style={{ fontSize: 80, fontWeight: 'bold' }}>B</div>
          <div style={{ fontSize: 40 }}>{optionB}</div>
        </div>
      </div>
      
      {/* CTA */}
      <div style={{ position: 'absolute', bottom: 100, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 40, color: 'white' }}>🔥 리얼픽 앱에서 지금 투표하기</div>
      </div>
      
      {/* BGM */}
      <Audio src="/assets/bgm/energetic.mp3" volume={0.3} />
    </AbsoluteFill>
  )
}
```

### 5.3 렌더링 API
```typescript
// app/api/video/render/route.ts
import { bundle, renderMedia } from '@remotion/bundler'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { missionId, template } = await req.json()
  
  // 1. 미션 데이터 가져오기
  const mission = await getMissionById(missionId)
  
  // 2. Remotion 번들링
  const bundled = await bundle({
    entryPoint: path.resolve('./src/compositions/Root.tsx'),
    webpackOverride: config => config
  })
  
  // 3. 렌더링
  const outputPath = `/tmp/${missionId}.mp4`
  await renderMedia({
    composition: bundled,
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: {
      title: mission.title,
      optionA: mission.optionA,
      optionB: mission.optionB,
      thumbnailUrl: mission.thumbnailUrl
    }
  })
  
  // 4. S3 업로드
  const videoUrl = await uploadToS3(outputPath, `videos/${missionId}.mp4`)
  
  // 5. rendering_jobs 업데이트
  await updateRenderingJob(missionId, { status: 'completed', videoUrl })
  
  return NextResponse.json({ success: true, videoUrl })
}
```

---

## 6. SNS API 연동

### 6.1 Instagram Graph API

#### 인증 설정
```typescript
// lib/sns/instagram.ts
import axios from 'axios'

const INSTAGRAM_API_URL = 'https://graph.instagram.com/v18.0'
const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN

export async function uploadInstagramReel(params: {
  videoUrl: string
  caption: string
  userTags?: string[]  // 계정 태그
}) {
  // Step 1: Container 생성
  const containerResponse = await axios.post(
    `${INSTAGRAM_API_URL}/${INSTAGRAM_ACCOUNT_ID}/media`,
    {
      media_type: 'REELS',
      video_url: params.videoUrl,
      caption: params.caption,
      collaborators: params.userTags?.map(tag => `@${tag}`).join(' '),
      access_token: ACCESS_TOKEN
    }
  )
  
  const containerId = containerResponse.data.id
  
  // Step 2: 상태 확인 (완료될 때까지 폴링)
  let status = 'IN_PROGRESS'
  while (status === 'IN_PROGRESS') {
    await new Promise(resolve => setTimeout(resolve, 5000))
    const statusResponse = await axios.get(
      `${INSTAGRAM_API_URL}/${containerId}?fields=status_code&access_token=${ACCESS_TOKEN}`
    )
    status = statusResponse.data.status_code
  }
  
  // Step 3: 게시
  if (status === 'FINISHED') {
    const publishResponse = await axios.post(
      `${INSTAGRAM_API_URL}/${INSTAGRAM_ACCOUNT_ID}/media_publish`,
      {
        creation_id: containerId,
        access_token: ACCESS_TOKEN
      }
    )
    
    return {
      success: true,
      postId: publishResponse.data.id,
      postUrl: `https://www.instagram.com/p/${publishResponse.data.id}/`
    }
  } else {
    throw new Error(`Upload failed: ${status}`)
  }
}
```

#### 주의사항
- Instagram Graph API는 **Business 계정** 필요
- 계정 태그(@)는 `collaborators` 필드 사용 (최대 20개)
- 해시태그는 `caption`에 포함
- 영상 요구사항: 최소 3초, 최대 90초, 1080x1920

### 6.2 YouTube Data API v3

```typescript
// lib/sns/youtube.ts
import { google } from 'googleapis'

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
})

export async function uploadYouTubeShort(params: {
  videoPath: string
  title: string
  description: string
  tags: string[]
}) {
  const res = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: params.title,
        description: params.description,
        tags: params.tags,
        categoryId: '22' // People & Blogs
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false
      }
    },
    media: {
      body: fs.createReadStream(params.videoPath)
    }
  })
  
  return {
    success: true,
    videoId: res.data.id,
    videoUrl: `https://www.youtube.com/shorts/${res.data.id}`
  }
}
```

#### Shorts 식별
- 제목에 `#Shorts` 해시태그 필수
- 설명란 첫 줄에 `#Shorts` 추가
- 비율: 9:16 (자동 인식)

### 6.3 TikTok API

```typescript
// lib/sns/tiktok.ts
// TikTok API는 공식 파트너 승인 필요
// 대안: TikTok Creator Portal 사용 또는 서드파티 도구

export async function uploadTikTok(params: {
  videoUrl: string
  caption: string
  hashtags: string[]
}) {
  // TikTok Open API (신청 후 사용)
  const response = await fetch('https://open-api.tiktok.com/share/video/upload/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access-token': process.env.TIKTOK_ACCESS_TOKEN
    },
    body: JSON.stringify({
      video: {
        url: params.videoUrl
      },
      post_info: {
        title: params.caption,
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000
      }
    })
  })
  
  return await response.json()
}
```

#### 주의사항
- TikTok API는 승인 절차가 복잡함 (Phase 3에서 진행)
- 초기에는 수동 업로드 or Zapier 같은 자동화 도구 활용 고려

---

## 7. 태그/해시태그 전략

### 7.1 계정 태그 (@Mentions) 로직

```typescript
// lib/viral/tag-strategy.ts
export function generateMentions(mission: Mission, dealer?: Dealer): string[] {
  const mentions: string[] = []
  
  // 1. 출연자 태그 (castTags)
  if (mission.castTags && mission.castTags.length > 0) {
    mentions.push(...mission.castTags)
  }
  
  // 2. 딜러 태그 (Track 2 전용)
  if (dealer?.instagramHandle) {
    mentions.push(dealer.instagramHandle)
  }
  
  // 3. 공식 계정 (프로그램 공식)
  const show = getShowById(mission.showId)
  if (show?.officialInstagram) {
    mentions.push(show.officialInstagram)
  }
  
  // 중복 제거
  return [...new Set(mentions)]
}
```

### 7.2 해시태그 & 캡션 생성 (Gemini AI) ⭐ 중요

**핵심**: 해시태그뿐만 아니라 **게시글 본문(캡션)도 Gemini AI로 생성**하여 더 자연스럽고 바이럴에 효과적인 콘텐츠 제작

```typescript
// lib/viral/content-generator.ts
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export interface SnsContent {
  caption: string        // 게시글 본문
  hashtags: string       // 해시태그
  cta: string           // CTA 문구
}

export async function generateSnsContent(params: {
  mission: Mission
  track: 'auto' | 'dealer' | 'main' | 'result'
  dealer?: Dealer
  platform: 'instagram' | 'youtube' | 'tiktok'
}): Promise<SnsContent> {
  const { mission, track, dealer, platform } = params
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
  
  // Track별 프롬프트 생성
  const trackContext = {
    auto: '일반 사용자들이 흥미를 느낄 수 있는 친근하고 궁금증을 유발하는 톤',
    dealer: `유튜버 ${dealer?.channelName}의 팬들이 좋아할 만한 톤. 딜러를 자연스럽게 언급`,
    main: '메인 이벤트임을 강조하는 화려하고 임팩트 있는 톤',
    result: '실시간 결과 공개의 긴장감과 반전을 강조하는 톤'
  }
  
  // 플랫폼별 특성
  const platformGuide = {
    instagram: '이모지를 적극 활용하고, 줄바꿈으로 가독성 확보. 캡션 2200자 이내.',
    youtube: '#Shorts 해시태그 필수. 설명란 5000자 이내. 링크 포함 가능.',
    tiktok: '짧고 임팩트 있게. 100자 이내 권장. 이모지와 해시태그 혼용.'
  }
  
  const prompt = `
당신은 SNS 바이럴 마케팅 전문가입니다.
다음 미션에 대해 ${platform.toUpperCase()}용 게시글을 작성하세요.

[미션 정보]
- 제목: ${mission.title}
- 프로그램: ${getShowById(mission.showId)?.displayName}
- 선택지 A: ${mission.optionA}
- 선택지 B: ${mission.optionB}
${dealer ? `- 딜러: ${dealer.channelName} (@${dealer.instagramHandle})` : ''}

[작성 가이드]
1. **톤앤매너**: ${trackContext[track]}
2. **플랫폼 특성**: ${platformGuide[platform]}
3. **핵심 목표**: 댓글/투표 유도, 앱 유입

[콘텐츠 구조]
1. 훅(Hook): 첫 줄에서 시선을 사로잡는 질문이나 충격적인 문구
2. 본문: 미션 내용을 재미있게 풀어쓰기 (2-3줄)
3. 선택지 강조: A vs B를 명확히 제시
4. CTA: 투표 참여 유도 ("당신의 선택은?", "댓글로 A/B 남겨주세요" 등)
5. 해시태그: 필수(#리얼픽 #프로그램명) + 하이재킹(경쟁채널명) + 트렌드 키워드 (총 10-15개)

[하이재킹 전략]
- 경쟁 채널: #촌장엔터테인먼트 #나는솔로갤러리 등
- 트렌드 키워드: #숏폼 #릴스추천 #알고리즘 등

[필수 제약사항]
- 절대 경쟁 유튜버를 @태그(멘션)하지 마세요 (신고 위험)
- 해시태그에만 경쟁 채널명 사용
- 출연자가 있다면 자연스럽게 이름 언급

[출력 형식]
JSON 형식으로 출력하세요:
{
  "caption": "게시글 본문 (이모지 포함, 줄바꿈은 \\n으로)",
  "hashtags": "#태그1 #태그2 ...",
  "cta": "CTA 문구"
}
`

  const result = await model.generateContent(prompt)
  const responseText = result.response.text().trim()
  
  // JSON 파싱 (```json ``` 제거)
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('AI 응답 파싱 실패')
  }
  
  const content: SnsContent = JSON.parse(jsonMatch[0])
  
  // 안전 검증
  if (!content.caption || !content.hashtags) {
    throw new Error('필수 필드 누락')
  }
  
  // 해시태그 정규화 (#이 없으면 추가)
  content.hashtags = content.hashtags.split(' ')
    .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
    .join(' ')
  
  return content
}
```

### 7.2.1 사용 예시 (단일 플랫폼)

```typescript
// 미션 승인 시 - Instagram만
const snsContent = await generateSnsContent({
  mission: approvedMission,
  track: 'auto',
  platform: 'instagram'
})

console.log(snsContent)
// {
//   caption: "🔥 충격적인 결과 예상됨...\n\n나는 솔로 시즌20 영호 vs 광수\n여러분의 최애는?\n\nA: 영호 (진중한 매력)\nB: 광수 (유머러스한 매력)\n\n댓글로 A or B 남겨주세요!👇",
//   hashtags: "#리얼픽 #나는솔로 #나솔20기 #영호 #광수 #촌장엔터테인먼트 #나솔갤 #연애리얼리티 #숏폼추천 #릴스",
//   cta: "💡 리얼픽 앱에서 지금 투표하고 결과 확인하기"
// }
```

### 7.2.2 멀티 플랫폼 콘텐츠 생성 (비용 최적화 ⭐)

```typescript
// lib/viral/multi-platform-generator.ts
export async function generateMultiPlatformContent(params: {
  mission: Mission
  track: 'auto' | 'dealer' | 'main' | 'result'
  dealer?: Dealer
  platforms: ('instagram' | 'youtube' | 'tiktok')[]
}): Promise<Record<string, SnsContent>> {
  const { mission, track, dealer, platforms } = params
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
  
  // 플랫폼별 특성을 하나의 프롬프트로
  const prompt = `
당신은 SNS 바이럴 마케팅 전문가입니다.
다음 미션에 대해 **${platforms.join(', ')} 3개 플랫폼용** 게시글을 한 번에 작성하세요.

[미션 정보]
- 제목: ${mission.title}
- 프로그램: ${getShowById(mission.showId)?.displayName}
- 선택지 A: ${mission.optionA}
- 선택지 B: ${mission.optionB}

[플랫폼별 요구사항]
1. Instagram: 이모지 적극 활용, 2200자 이내, 줄바꿈으로 가독성
2. YouTube: #Shorts 필수, 5000자 이내, 링크 포함 가능
3. TikTok: 짧고 임팩트, 100자 권장, 이모지+해시태그 혼용

[출력 형식]
JSON 형식으로 플랫폼별로 생성하세요:
{
  "instagram": {
    "caption": "...",
    "hashtags": "...",
    "cta": "..."
  },
  "youtube": {
    "caption": "...",
    "hashtags": "...",
    "cta": "..."
  },
  "tiktok": {
    "caption": "...",
    "hashtags": "...",
    "cta": "..."
  }
}
`

  const result = await model.generateContent(prompt)
  const responseText = result.response.text().trim()
  
  // JSON 파싱
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  const allContent = JSON.parse(jsonMatch[0])
  
  // 필요한 플랫폼만 반환
  const filtered: Record<string, SnsContent> = {}
  for (const platform of platforms) {
    if (allContent[platform]) {
      filtered[platform] = allContent[platform]
    }
  }
  
  return filtered
}

// 사용 예시
const contents = await generateMultiPlatformContent({
  mission: approvedMission,
  track: 'auto',
  platforms: ['instagram', 'youtube', 'tiktok']
})

console.log(contents.instagram)  // Instagram 콘텐츠
console.log(contents.youtube)    // YouTube 콘텐츠
console.log(contents.tiktok)     // TikTok 콘텐츠

// → 1번의 API 호출로 3개 플랫폼 콘텐츠 생성 (비용 67% 절감!)
```

### 7.3 하이재킹 대상 리스트 (예시)

```typescript
// constants/hijack-targets.ts
export const HIJACK_TARGETS = {
  nasolo: [
    '#촌장엔터테인먼트',
    '#나는솔로갤러리',
    '#솔로지옥',
    '#나솔리뷰',
    '#나솔떡밥'
  ],
  baseball: [
    '#최강야구리뷰',
    '#야구갤',
    '#야갤',
    '#야구유튜버'
  ],
  transit: [
    '#환승연애리뷰',
    '#환승연애갤러리',
    '#환승갤'
  ]
}

export function getHijackHashtags(showId: string): string[] {
  return HIJACK_TARGETS[showId] || []
}
```

### 7.4 전체 SNS 업로드 워크플로우 (AI 기반)

```typescript
// lib/viral/sns-uploader.ts
export async function uploadToSns(params: {
  mission: Mission
  track: 'auto' | 'dealer' | 'main' | 'result'
  dealer?: Dealer
  videoUrl: string
  platforms: ('instagram' | 'youtube' | 'tiktok')[]
}): Promise<SnsPost[]> {
  const { mission, track, dealer, videoUrl, platforms } = params
  const results: SnsPost[] = []
  
  for (const platform of platforms) {
    try {
      // 1. Gemini AI로 콘텐츠 생성
      const snsContent = await generateSnsContent({
        mission,
        track,
        dealer,
        platform
      })
      
      // 2. 멘션 계정 추출
      const mentions = generateMentions(mission, dealer)
      
      // 3. 최종 캡션 조합
      const finalCaption = `${snsContent.caption}\n\n${snsContent.cta}\n\n${snsContent.hashtags}`
      
      // 4. 플랫폼별 업로드
      let uploadResult
      if (platform === 'instagram') {
        uploadResult = await uploadInstagramReel({
          videoUrl,
          caption: finalCaption,
          userTags: mentions
        })
      } else if (platform === 'youtube') {
        uploadResult = await uploadYouTubeShort({
          videoPath: await downloadVideo(videoUrl),
          title: `${mission.title} #Shorts`,
          description: finalCaption,
          tags: snsContent.hashtags.split(' ').map(t => t.replace('#', ''))
        })
      } else if (platform === 'tiktok') {
        uploadResult = await uploadTikTok({
          videoUrl,
          caption: finalCaption,
          hashtags: snsContent.hashtags.split(' ')
        })
      }
      
      // 5. sns_posts 레코드 생성
      const snsPost = await createSnsPost({
        missionId: mission.id,
        track,
        platform,
        videoUrl,
        postUrl: uploadResult.postUrl,
        status: 'success',
        metadata: {
          mentions,
          hashtags: snsContent.hashtags.split(' '),
          aiGeneratedCaption: snsContent.caption,
          aiGeneratedHashtags: snsContent.hashtags
        }
      })
      
      results.push(snsPost)
      
      console.log(`✅ ${platform} 업로드 성공: ${uploadResult.postUrl}`)
    } catch (error) {
      console.error(`❌ ${platform} 업로드 실패:`, error)
      
      // 실패 로그 저장
      await createSnsPost({
        missionId: mission.id,
        track,
        platform,
        videoUrl,
        status: 'failed',
        errorMessage: error.message
      })
    }
  }
  
  return results
}
```

### 7.4.1 미션 승인 시 전체 플로우

```typescript
// app/api/admin/missions/approve/route.ts
export async function POST(req: NextRequest) {
  const { missionId, castTags } = await req.json()
  
  // 1. 미션 업데이트
  await updateMission(missionId, {
    status: 'approved',
    castTags,
    approvedAt: new Date()
  })
  
  // 2. 비디오 렌더링 (Remotion)
  const videoUrl = await renderVideo({
    missionId,
    template: 'question-card'
  })
  
  // 3. SNS 업로드 (AI 콘텐츠 생성 포함)
  const snsResults = await uploadToSns({
    mission: await getMissionById(missionId),
    track: 'auto',
    videoUrl,
    platforms: ['instagram', 'youtube']  // 초기에는 Instagram + YouTube
  })
  
  return NextResponse.json({
    success: true,
    videoUrl,
    snsResults
  })
}
```

---

## 8. 어드민 UI 설계

### 8.1 미션 승인 화면 업데이트

```tsx
// components/c-admin/MissionApprovalModal.tsx
export function MissionApprovalModal({ mission }: { mission: Mission }) {
  const [castTags, setCastTags] = useState<string[]>(mission.castTags || [])
  const [newTag, setNewTag] = useState('')
  
  const handleAddTag = () => {
    if (newTag && !castTags.includes(newTag)) {
      setCastTags([...castTags, newTag.replace('@', '')])
      setNewTag('')
    }
  }
  
  const handleSearchInstagram = (name: string) => {
    window.open(`https://www.google.com/search?q=인스타그램+${name}`, '_blank')
  }
  
  const handleApprove = async () => {
    // 1. Gemini로 해시태그 생성
    const viralHashtags = await generateViralHashtags(mission)
    
    // 2. 미션 업데이트
    await updateMission(mission.id, {
      status: 'approved',
      castTags,
      viralHashtags,
      approvedAt: new Date()
    })
    
    // 3. 렌더링 작업 큐 추가
    await createRenderingJob({
      missionId: mission.id,
      track: 'auto',
      template: 'question-card',
      priority: 3
    })
    
    toast({ title: '승인 완료', description: '영상 생성이 시작되었습니다.' })
  }
  
  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>미션 승인 및 SNS 배포</DialogTitle>
        </DialogHeader>
        
        {/* 출연자 태그 입력 */}
        <div className="space-y-2">
          <Label>출연자 인스타그램 ID</Label>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="예: youngho_official"
            />
            <Button onClick={handleAddTag}>추가</Button>
            <Button 
              variant="outline" 
              onClick={() => handleSearchInstagram(mission.title)}
            >
              🔍 검색
            </Button>
          </div>
          
          {/* 태그 목록 */}
          <div className="flex flex-wrap gap-2 mt-2">
            {castTags.map(tag => (
              <Badge key={tag} variant="secondary">
                @{tag}
                <X 
                  className="w-3 h-3 ml-1 cursor-pointer" 
                  onClick={() => setCastTags(castTags.filter(t => t !== tag))}
                />
              </Badge>
            ))}
          </div>
        </div>
        
        {/* 예상 해시태그 미리보기 */}
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <Label>AI 생성 해시태그 (미리보기)</Label>
          <p className="text-sm text-gray-600 mt-2">
            #리얼픽 #{getShowById(mission.showId)?.displayName} ...
          </p>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={handleApprove}>승인 & 영상 생성</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### 8.2 SNS 업로드 로그 페이지

```tsx
// app/admin/marketing/sns-logs/page.tsx
export default function SnsLogsPage() {
  const [logs, setLogs] = useState<SnsPost[]>([])
  
  useEffect(() => {
    loadLogs()
  }, [])
  
  const handleRetry = async (postId: string) => {
    await fetch(`/api/sns/retry`, {
      method: 'POST',
      body: JSON.stringify({ postId })
    })
    await loadLogs()
  }
  
  return (
    <div>
      <h1>SNS 배포 로그</h1>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>미션</TableHead>
            <TableHead>트랙</TableHead>
            <TableHead>플랫폼</TableHead>
            <TableHead>영상</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>조회수</TableHead>
            <TableHead>업로드 시간</TableHead>
            <TableHead>액션</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map(log => (
            <TableRow key={log.id}>
              <TableCell>{log.missionId}</TableCell>
              <TableCell>
                <Badge>{log.track}</Badge>
              </TableCell>
              <TableCell>
                {log.platform === 'instagram' && <Instagram className="w-4 h-4" />}
                {log.platform === 'youtube' && <Youtube className="w-4 h-4" />}
              </TableCell>
              <TableCell>
                <a href={log.videoUrl} target="_blank" className="text-blue-600">
                  미리보기
                </a>
              </TableCell>
              <TableCell>
                {log.status === 'success' ? (
                  <Badge variant="success">성공</Badge>
                ) : log.status === 'failed' ? (
                  <Badge variant="destructive">실패</Badge>
                ) : (
                  <Badge variant="secondary">대기중</Badge>
                )}
              </TableCell>
              <TableCell>{log.metadata.views || '-'}</TableCell>
              <TableCell>
                {log.uploadedAt ? new Date(log.uploadedAt).toLocaleString() : '-'}
              </TableCell>
              <TableCell>
                {log.status === 'failed' && (
                  <Button size="sm" onClick={() => handleRetry(log.id)}>
                    재시도
                  </Button>
                )}
                {log.postUrl && (
                  <a href={log.postUrl} target="_blank">
                    <Button size="sm" variant="outline">보기</Button>
                  </a>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

### 8.3 딜러 미션 등록 화면

```tsx
// components/c-dealer/DealerMissionUpload.tsx
export function DealerMissionUpload() {
  const [mission, setMission] = useState({ title: '', optionA: '', optionB: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  
  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    // 1. 미션 생성 (dealerId 포함)
    const res = await fetch('/api/dealer/missions', {
      method: 'POST',
      body: JSON.stringify({ ...mission, dealerId: currentDealerId })
    })
    
    const { missionId } = await res.json()
    
    // 2. 렌더링 작업 생성 (template: 'partner-card')
    await fetch('/api/video/render', {
      method: 'POST',
      body: JSON.stringify({ missionId, template: 'partner-card' })
    })
    
    // 3. 영상 URL 대기 (폴링)
    const video = await pollForVideo(missionId)
    setVideoUrl(video.url)
    
    setIsSubmitting(false)
    toast({ title: '미션 등록 완료', description: '영상을 다운로드할 수 있습니다.' })
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>미션 등록 & 영상 받기</CardTitle>
        <CardDescription>
          미션을 등록하면 자동으로 영상이 생성되고, 리얼픽 공식 SNS에 업로드됩니다.
          영상 파일을 다운로드하여 본인 채널에도 업로드하세요!
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <Input
            placeholder="미션 제목"
            value={mission.title}
            onChange={(e) => setMission({ ...mission, title: e.target.value })}
          />
          <Input
            placeholder="선택지 A"
            value={mission.optionA}
            onChange={(e) => setMission({ ...mission, optionA: e.target.value })}
          />
          <Input
            placeholder="선택지 B"
            value={mission.optionB}
            onChange={(e) => setMission({ ...mission, optionB: e.target.value })}
          />
          
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : '미션 등록'}
          </Button>
          
          {videoUrl && (
            <div className="mt-4 p-4 border rounded">
              <h3 className="font-bold mb-2">✅ 영상 생성 완료!</h3>
              <video src={videoUrl} controls className="w-full mb-2" />
              <Button asChild>
                <a href={videoUrl} download>
                  📥 다운로드 (MP4)
                </a>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## 9. 스케줄링 & 자동화

### 9.1 Cron Jobs (Vercel Cron or Node-Cron)

```typescript
// app/api/cron/auto-post/route.ts
export async function GET(req: NextRequest) {
  // Vercel Cron 인증
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // 승인된 미션 중 SNS 미업로드 미션 찾기
  const pendingMissions = await getPendingMissions({
    status: 'approved',
    snsUploaded: false,
    limit: 3
  })
  
  for (const mission of pendingMissions) {
    try {
      // 1. 영상 렌더링 (이미 완료되었으면 스킵)
      let video = await getRenderingJob(mission.id)
      if (!video || video.status !== 'completed') {
        video = await renderVideo(mission.id, 'question-card')
      }
      
      // 2. Instagram 업로드
      await uploadInstagramReel({
        videoUrl: video.videoUrl,
        caption: generateCaption({ mission, track: 'auto' }).caption,
        userTags: mission.castTags
      })
      
      // 3. YouTube 업로드
      await uploadYouTubeShort({
        videoPath: await downloadVideo(video.videoUrl),
        title: `${mission.title} #Shorts`,
        description: mission.viralHashtags || '',
        tags: mission.viralHashtags?.split(' ').map(tag => tag.replace('#', '')) || []
      })
      
      // 4. 미션 상태 업데이트
      await updateMission(mission.id, { snsUploaded: true })
      
      console.log(`✅ Auto-posted mission ${mission.id}`)
    } catch (error) {
      console.error(`❌ Failed to post mission ${mission.id}:`, error)
    }
  }
  
  return NextResponse.json({ success: true, posted: pendingMissions.length })
}
```

### 9.2 Vercel Cron 설정

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/auto-post",
      "schedule": "0 8,12,18 * * *"
    },
    {
      "path": "/api/cron/update-views",
      "schedule": "0 * * * *"
    }
  ]
}
```

**스케줄 설명**:
- `0 8,12,18 * * *`: 매일 오전 8시, 낮 12시, 저녁 6시
- `0 * * * *`: 매 시간 정각 (조회수 업데이트)

### 9.3 실시간 트리거 (Track 4)

```typescript
// firestore triggers (Firebase Functions)
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'

export const onVoteUpdate = onDocumentUpdated('missions/{missionId}', async (event) => {
  const mission = event.data?.after.data()
  const previousMission = event.data?.before.data()
  
  if (!mission) return
  
  // 조건 1: 투표수 100건 돌파
  const voteCount = (mission.voteA || 0) + (mission.voteB || 0)
  const prevVoteCount = (previousMission?.voteA || 0) + (previousMission?.voteB || 0)
  
  if (voteCount >= 100 && prevVoteCount < 100) {
    await triggerResultVideo(mission.id, '100건 돌파')
  }
  
  // 조건 2: 49:51 박빙 상황
  const ratioA = mission.voteA / voteCount
  const ratioB = mission.voteB / voteCount
  
  if (Math.abs(ratioA - 0.5) <= 0.02 && voteCount >= 50) {
    await triggerResultVideo(mission.id, '박빙 상황')
  }
})

async function triggerResultVideo(missionId: string, reason: string) {
  // 중복 방지 (최근 1시간 내 생성 여부 확인)
  const recent = await checkRecentResultVideo(missionId, 60)
  if (recent) return
  
  // 렌더링 작업 생성
  await createRenderingJob({
    missionId,
    track: 'result',
    template: 'data-live',
    priority: 5  // 높은 우선순위
  })
  
  console.log(`🔥 Result video triggered for ${missionId}: ${reason}`)
}
```

---

## 10. 비용 및 리스크 관리

### 10.1 예상 비용 (월 기준)

| 항목 | 단가 | 예상 사용량 | 월 비용 |
|------|------|------------|---------|
| 비디오 렌더링 (Remotion Lambda) | 25원/건 | 300건 | 7,500원 |
| Firebase Storage (영상 저장) | 2.6원/GB | 30GB | 78원 |
| **Gemini API (캡션+해시태그 생성)** | **0.5원/요청** | **900건** (300미션 × 3플랫폼) | **450원** |
| Instagram API | 무료 | - | 0원 |
| YouTube API | 무료 | - | 0원 |
| **합계** | | | **~8,030원** |

**비고**:
- Gemini API 비용 상세:
  - gemini-pro: 입력 1,000 토큰당 $0.00025, 출력 1,000 토큰당 $0.0005
  - 평균 요청당 약 500토큰 → **건당 약 0.5원**
  - 캡션 생성만 사용 시: 300건 × 0.5원 = 150원
  - 3개 플랫폼 (Instagram/YouTube/TikTok) 사용 시: 900건 × 0.5원 = 450원
- 렌더링 서버 자체 호스팅 시 비용 더 절감 가능
- TikTok API는 승인 후 무료

### 10.1.1 비용 최적화 전략

1. **Gemini 캐싱**: 동일 미션에 대해 플랫폼별 프롬프트를 한 번에 처리
   ```typescript
   // ❌ 비효율: 3번 호출
   await generateSnsContent({ mission, platform: 'instagram' })
   await generateSnsContent({ mission, platform: 'youtube' })
   await generateSnsContent({ mission, platform: 'tiktok' })
   
   // ✅ 효율: 1번 호출로 3개 플랫폼 콘텐츠 생성
   await generateMultiPlatformContent({ mission, platforms: ['instagram', 'youtube', 'tiktok'] })
   ```
   → **비용 67% 절감 (450원 → 150원)**

2. **템플릿 재사용**: 유사한 미션은 이전 결과를 참고하여 생성
3. **토큰 최적화**: 불필요한 컨텍스트 제거, 간결한 프롬프트 사용

### 10.2 리스크 및 대응 방안

#### Risk 1: SNS 계정 정지/제재
**원인**: 
- 스팸 신고 누적
- 경쟁 채널명 하이재킹이 공격적으로 감지됨

**대응**:
1. 초기에는 하이재킹 해시태그를 최소화 (1~2개만)
2. 계정 분산: 메인 계정 + 서브 계정 2개 운영
3. 업로드 빈도 조절: 1일 3회 → 2회로 축소
4. 커뮤니티 가이드라인 철저히 준수

#### Risk 2: 영상 렌더링 실패
**원인**:
- 서버 리소스 부족
- Remotion 코드 에러

**대응**:
1. 렌더링 작업 큐 시스템 (재시도 로직)
2. 에러 발생 시 알림 (Slack/Discord)
3. 템플릿별 사전 테스트 강화

#### Risk 3: API 할당량 초과
**원인**:
- Instagram/YouTube API 일일 요청 제한

**대응**:
1. API 요청 캐싱
2. Rate Limiter 적용
3. 여러 계정 로테이션

#### Risk 4: 낮은 조회수/유입률
**원인**:
- 해시태그 전략 실패
- 콘텐츠 매력도 부족

**대응**:
1. A/B 테스트 (템플릿 스타일, 해시태그 조합)
2. 초기 3개월간 주간 리포트로 최적화
3. 인플루언서 협업 (딜러 파트너십 강화)

### 10.3 성과 측정 지표 (KPI)

| 지표 | 목표 (1개월) | 측정 방법 |
|------|-------------|----------|
| 영상 업로드 수 | 90건 (1일 3회) | sns_posts 테이블 카운트 |
| 평균 조회수 | 500회/영상 | Instagram/YouTube Insights |
| 앱 유입률 | 5% (조회수 대비) | UTM 파라미터 + Firebase Analytics |
| 딜러 참여율 | 20명/월 | dealers 테이블 활동 로그 |
| 해시태그 노출 | 상위 30위권 진입 | Instagram Search Rank Tracking |

---

## 11. 구현 체크리스트

### Phase 1 (MVP) - 2-3주
- [ ] DB 스키마 업데이트
  - [ ] dealers.instagramHandle 추가
  - [ ] missions.castTags, viralHashtags 추가
  - [ ] sns_posts, rendering_jobs 테이블 생성
- [ ] Remotion 프로젝트 초기 설정
  - [ ] QuestionCard 템플릿 개발
  - [ ] 로컬 렌더링 테스트
- [ ] Instagram API 연동
  - [ ] Business 계정 설정
  - [ ] Access Token 발급
  - [ ] uploadInstagramReel 함수 구현
- [ ] Gemini 해시태그 생성
  - [ ] generateViralHashtags 함수
  - [ ] 하이재킹 타겟 리스트 정의
- [ ] 어드민 UI
  - [ ] 미션 승인 모달에 castTags 입력 필드
  - [ ] SNS 로그 페이지
- [ ] End-to-End 테스트
  - [ ] 미션 승인 → 렌더링 → 업로드

### Phase 2 (확장) - 2주
- [ ] PartnerCard 템플릿 개발
- [ ] 딜러 미션 등록 UI
- [ ] 영상 다운로드 기능
- [ ] YouTube API 연동
- [ ] 딜러 인스타 계정 크롤링 자동화

### Phase 3 (고도화) - 2-3주
- [ ] DataLive 템플릿 개발
- [ ] 투표수 실시간 감지 (Firestore Trigger)
- [ ] TikTok API 연동
- [ ] Cron Job 설정 (1일 3회 자동 업로드)
- [ ] 조회수 자동 업데이트

### Phase 4 (최적화) - 지속
- [ ] 비용 최적화 (렌더링 캐싱)
- [ ] A/B 테스트 시스템
- [ ] 분석 대시보드
- [ ] 인플루언서 협업 자동화

---

## 12. 다음 액션 (Immediate Next Steps)

### 🎯 최우선 작업 (Week 1)

1. **Gemini AI 콘텐츠 생성 로직 구현** ⭐⭐⭐
   - `lib/viral/content-generator.ts` 파일 생성
   - `generateMultiPlatformContent` 함수 구현 (비용 최적화 버전)
   - Track별 프롬프트 템플릿 작성
   - 테스트 미션으로 실제 콘텐츠 생성 및 품질 검증

2. **DB 스키마 마이그레이션**
   - Firestore/Supabase 업데이트 스크립트 작성
   - 기존 미션 데이터 백업
   - `missions.castTags`, `missions.viralHashtags` 필드 추가

3. **Remotion 프로젝트 생성**
   ```bash
   npx create-video@latest realpick-video-renderer
   cd realpick-video-renderer
   npm install
   ```

4. **Instagram API 인증**
   - Meta for Developers 앱 생성
   - Instagram Business 계정 연결
   - Access Token 발급 및 테스트

### ⚡ 중요 작업 (Week 2)

5. **QuestionCard 템플릿 개발**
   - 디자인 목업 작성
   - React 컴포넌트 구현
   - 로컬 렌더링 테스트

6. **어드민 UI 업데이트**
   - 미션 승인 모달 수정
   - castTags 입력 필드 추가
   - AI 생성 콘텐츠 미리보기 기능

7. **통합 테스트**
   - 미션 승인 → Gemini 콘텐츠 생성 → 비디오 렌더링 → Instagram 업로드
   - 전체 파이프라인 End-to-End 테스트

---

## 부록: 참고 자료

### A. API 문서
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api/)
- [YouTube Data API v3](https://developers.google.com/youtube/v3)
- [TikTok Open API](https://developers.tiktok.com/)
- [Remotion Docs](https://www.remotion.dev/docs)
- [Gemini AI API](https://ai.google.dev/docs)

### B. 템플릿 디자인 참고
- [Canva Reels Templates](https://www.canva.com/templates/instagram-reels/)
- [Adobe Express Shorts](https://www.adobe.com/express/create/video/youtube-shorts)

### C. 해시태그 리서치 도구
- [Instagram Hashtag Search](https://www.instagram.com/explore/tags/)
- [Hashtagify](https://hashtagify.me/)
- [All Hashtag](https://www.all-hashtag.com/)

### D. Gemini 프롬프트 예시 모음

#### Track 1 (Auto) - Instagram 프롬프트 예시

**입력 데이터**:
```json
{
  "title": "나는 솔로 영호 vs 광수, 누가 더 인기 많을까?",
  "showId": "nasolo",
  "optionA": "영호 (진중한 매력)",
  "optionB": "광수 (유머러스한 매력)",
  "castTags": ["youngho_official", "kwangsu_official"],
  "platform": "instagram"
}
```

**Gemini 응답 예시**:
```json
{
  "caption": "🔥 나솔 팬들 집합! 이번엔 진짜 어려운 선택이에요\n\n영호님의 진중하고 깊은 매력 vs 광수님의 유쾌하고 밝은 에너지\n\n솔직히 말해보세요👇\nA: 영호 (진중파)\nB: 광수 (유머파)\n\n댓글로 A or B 남겨주시고\n친구도 태그해서 같이 투표해요!",
  "hashtags": "#리얼픽 #나는솔로 #나솔20기 #영호 #광수 #촌장엔터테인먼트 #나는솔로갤러리 #연애리얼리티 #데이팅프로그램 #숏폼추천 #릴스 #인스타릴스",
  "cta": "💡 리얼픽 앱에서 실시간 투표 결과 확인하기\n🔗 프로필 링크 클릭!"
}
```

#### Track 2 (Dealer) - YouTube Shorts 프롬프트 예시

**입력 데이터**:
```json
{
  "title": "최강야구 김병현 감독 vs 허일영 감독",
  "showId": "baseball",
  "optionA": "김병현 (카리스마)",
  "optionB": "허일영 (전략)",
  "dealer": {
    "channelName": "야구덕후TV",
    "instagramHandle": "baseball_lover_tv"
  },
  "platform": "youtube"
}
```

**Gemini 응답 예시**:
```json
{
  "caption": "⚾ 야구덕후TV가 준비한 특급 질문!\n\n최강야구 팬이라면 반드시 답해야 하는 이 질문!\n김병현 감독의 불같은 카리스마 vs 허일영 감독의 치밀한 전략\n\n당신의 최애 감독은? 댓글로 A or B!\n\n#Shorts #최강야구 #김병현 #허일영 #야구 #리얼픽 #최강야구리뷰 #야구갤 #예능 #숏폼",
  "hashtags": "#Shorts #최강야구 #김병현 #허일영 #야구 #리얼픽 #최강야구리뷰 #야구갤 #예능 #숏폼",
  "cta": "💡 리얼픽 앱 투표하고 실시간 결과 보기\n📺 야구덕후TV 구독하고 더 많은 콘텐츠 보기!"
}
```

#### Track 4 (Result) - Instagram 프롬프트 예시

**입력 데이터**:
```json
{
  "title": "환승연애 최시훈 vs 이규빈 인기 대결",
  "showId": "transit",
  "optionA": "최시훈",
  "optionB": "이규빈",
  "currentVotes": {
    "A": 523,
    "B": 477,
    "ratio": "52.3% vs 47.7%"
  },
  "platform": "instagram"
}
```

**Gemini 응답 예시**:
```json
{
  "caption": "🚨 긴급 속보! 투표 100건 돌파했는데...\n\n환승연애 최시훈 vs 이규빈 대결\n현재 투표 결과 공개합니다!\n\n💥 A: 최시훈 52.3%\n💥 B: 이규빈 47.7%\n\n불과 5%p 차이! 이거 뒤집힐 수도 있어요😱\n\n지금 바로 투표하면 결과가 바뀔 수 있습니다!\n댓글에 A or B 남기고 친구도 태그하세요👇",
  "hashtags": "#리얼픽 #환승연애 #최시훈 #이규빈 #환승연애3 #연애리얼리티 #투표결과 #실시간 #환승갤 #릴스 #숏폼",
  "cta": "🔥 리얼픽 앱에서 지금 투표하고 결과 뒤집기!\n🔗 링크는 프로필에!"
}
```

### E. 프롬프트 튜닝 가이드

**좋은 프롬프트 특징**:
1. ✅ 구체적인 톤앤매너 지시
2. ✅ 플랫폼별 가이드라인 명시
3. ✅ JSON 출력 형식 강제
4. ✅ 예시와 제약사항 제공
5. ✅ Track별 차별화

**나쁜 프롬프트 예시**:
```
❌ "이 미션에 대해 인스타그램 게시글을 작성해주세요"
→ 너무 모호함, 형식 불명확, 해시태그 전략 없음

✅ "다음 미션에 대해 Instagram Reels용 게시글을 작성하세요. 
   첫 줄에 시선을 사로잡는 질문을 넣고, 
   #리얼픽과 프로그램명 해시태그는 필수이며,
   경쟁 채널명(#촌장엔터)도 자연스럽게 포함하세요.
   JSON 형식으로 caption, hashtags, cta를 출력하세요."
```

---

**문서 작성**: AI Assistant  
**최종 업데이트**: 2026-02-10  
**버전**: 2.0
