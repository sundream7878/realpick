# 리얼픽 SNS 바이럴 시스템 (제로 코스트 버전)
**문서 버전**: 3.0 (완전 무료 구현)  
**작성일**: 2026-02-10  
**목표**: Gemini AI로 시나리오까지 생성하고, 무료 도구로 영상 제작

---

## 🎯 핵심 변경사항

### 기존 플랜 (v2.1)의 문제점
1. ❌ Remotion Lambda 유료 (~25원/건 × 300건 = 7,500원/월)
2. ❌ 시나리오가 코드로 고정됨 (React 컴포넌트)
3. ❌ 자막이 단순함 (미션 제목만)

### 새로운 접근 (v3.0) ⭐
1. ✅ **Gemini가 영상 시나리오까지 생성** (자막, 타이밍, 효과 등)
2. ✅ **HTML Canvas + FFmpeg로 무료 렌더링** (서버 비용만)
3. ✅ **동적 자막 & 풍부한 스토리텔링**
4. ✅ **월 비용: ~0원** (Gemini API만 450원)

---

## 📋 전체 아키텍처

```
[미션 데이터]
    ↓
[Gemini AI] → {
    SNS 게시글 (캡션 + 해시태그)
    영상 시나리오 (자막, 타이밍, 효과)
}
    ↓
[HTML Canvas 렌더링] → 각 프레임을 이미지로 (Node.js)
    ↓
[FFmpeg] → 이미지들을 MP4로 합침
    ↓
[S3/Storage 업로드]
    ↓
[SNS 자동 배포]
```

---

## 1. Gemini AI 영상 시나리오 생성

### 1.1 시나리오 JSON 구조

```typescript
interface VideoScenario {
  duration: number                    // 총 영상 길이 (초)
  fps: number                         // 프레임 레이트 (30)
  scenes: VideoScene[]                // 장면 배열
  bgm?: {
    url: string
    volume: number
  }
}

interface VideoScene {
  startTime: number                   // 시작 시간 (초)
  endTime: number                     // 종료 시간 (초)
  background: {
    type: 'gradient' | 'solid' | 'blur-thumbnail'
    colors?: string[]                 // 그라디언트 색상
    thumbnailUrl?: string             // 블러 썸네일
  }
  elements: VideoElement[]            // 화면 요소들
}

interface VideoElement {
  type: 'text' | 'image' | 'shape'
  content: string
  position: {
    x: number                         // 가로 위치 (0~1080)
    y: number                         // 세로 위치 (0~1920)
    width?: number
    height?: number
  }
  style: {
    fontSize?: number
    fontWeight?: string
    color?: string
    textAlign?: 'left' | 'center' | 'right'
    backgroundColor?: string
    borderRadius?: number
    padding?: number
  }
  animation?: {
    type: 'fade-in' | 'slide-in' | 'scale' | 'pulse'
    duration: number                  // 애니메이션 길이 (초)
    delay?: number                    // 시작 지연 (초)
  }
}
```

### 1.2 Gemini 프롬프트 (영상 시나리오 생성)

```typescript
// lib/video/scenario-generator.ts
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function generateVideoScenario(params: {
  mission: Mission
  track: 'auto' | 'dealer' | 'result'
  dealer?: Dealer
}): Promise<VideoScenario> {
  const { mission, track, dealer } = params
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
  
  const prompt = `
당신은 숏폼 영상 제작 전문가입니다.
다음 미션에 대해 9:16 세로형 숏폼 영상의 시나리오를 JSON 형식으로 작성하세요.

[미션 정보]
- 제목: ${mission.title}
- 프로그램: ${getShowById(mission.showId)?.displayName}
- 선택지 A: ${mission.optionA}
- 선택지 B: ${mission.optionB}
${dealer ? `- 딜러: ${dealer.channelName}` : ''}

[영상 요구사항]
- 길이: 10초
- 해상도: 1080 x 1920 (9:16)
- FPS: 30
- 목표: 시청자의 시선을 사로잡고 투표 유도

[Track별 스타일]
${track === 'auto' ? '- 일반 사용자 대상, 친근하고 호기심 유발' : ''}
${track === 'dealer' ? `- ${dealer?.channelName} 팬들 대상, 딜러 브랜딩 강조` : ''}
${track === 'result' ? '- 긴급 속보 스타일, 긴박감과 반전 강조' : ''}

[시나리오 구성 가이드]
1. **장면 1 (0~1초)**: 훅(Hook) - 시선을 사로잡는 텍스트
   - 예: "🔥 충격적인 결과 예상"
   - 배경: 그라디언트 (보라→핑크)
   - 애니메이션: 페이드인

2. **장면 2 (1~2초)**: 프로그램 소개
   - 프로그램명 배치
   - 애니메이션: 슬라이드인

3. **장면 3 (2~3초)**: 질문 제시
   - 미션 제목을 재해석한 자막
   - 예: "${mission.title}" → "누가 더 인기 많을까요?"
   - 폰트: 큰 굵은 글씨

4. **장면 4 (3~7초)**: A vs B 선택지 강조
   - 화면 분할: 왼쪽 A, 오른쪽 B
   - 각 선택지를 풍부한 설명으로 확장
   - 애니메이션: 점멸 효과

5. **장면 5 (7~10초)**: CTA
   - "당신의 선택은?"
   - "리얼픽 앱에서 지금 투표하기"
   - 이모지 활용

[JSON 출력 형식]
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
          "content": "🔥 충격적인 결과 예상",
          "position": { "x": 540, "y": 960 },
          "style": {
            "fontSize": 70,
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
    },
    // ... 더 많은 장면들
  ]
}

**중요**: 
1. 모든 텍스트는 이모지를 적극 활용하세요
2. 자막은 짧고 임팩트 있게 (한 줄에 최대 15자)
3. 색상은 대비가 강한 조합 사용
4. 애니메이션은 부드럽게 (fade, slide 위주)
5. JSON 형식 엄수 (주석 없이)
`

  const result = await model.generateContent(prompt)
  const responseText = result.response.text().trim()
  
  // JSON 파싱
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('시나리오 JSON 파싱 실패')
  }
  
  const scenario: VideoScenario = JSON.parse(jsonMatch[0])
  
  return scenario
}
```

### 1.3 Gemini 응답 예시

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
          "position": { "x": 540, "y": 400 },
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
    },
    {
      "startTime": 1,
      "endTime": 2,
      "background": {
        "type": "gradient",
        "colors": ["#667eea", "#764ba2"]
      },
      "elements": [
        {
          "type": "text",
          "content": "나는 솔로",
          "position": { "x": 540, "y": 300 },
          "style": {
            "fontSize": 50,
            "fontWeight": "600",
            "color": "rgba(255,255,255,0.8)",
            "textAlign": "center"
          }
        },
        {
          "type": "text",
          "content": "누가 더 인기 많을까요?",
          "position": { "x": 540, "y": 960 },
          "style": {
            "fontSize": 70,
            "fontWeight": "bold",
            "color": "white",
            "textAlign": "center"
          },
          "animation": {
            "type": "slide-in",
            "duration": 0.5
          }
        }
      ]
    },
    {
      "startTime": 3,
      "endTime": 7,
      "background": {
        "type": "gradient",
        "colors": ["#667eea", "#764ba2"]
      },
      "elements": [
        {
          "type": "shape",
          "content": "",
          "position": { "x": 120, "y": 700, "width": 400, "height": 500 },
          "style": {
            "backgroundColor": "#FF6B6B",
            "borderRadius": 30
          }
        },
        {
          "type": "text",
          "content": "A",
          "position": { "x": 320, "y": 800 },
          "style": {
            "fontSize": 100,
            "fontWeight": "bold",
            "color": "white",
            "textAlign": "center"
          }
        },
        {
          "type": "text",
          "content": "영호\n진중한 매력",
          "position": { "x": 320, "y": 950 },
          "style": {
            "fontSize": 45,
            "color": "white",
            "textAlign": "center"
          },
          "animation": {
            "type": "pulse",
            "duration": 1
          }
        },
        {
          "type": "shape",
          "content": "",
          "position": { "x": 560, "y": 700, "width": 400, "height": 500 },
          "style": {
            "backgroundColor": "#4ECDC4",
            "borderRadius": 30
          }
        },
        {
          "type": "text",
          "content": "B",
          "position": { "x": 760, "y": 800 },
          "style": {
            "fontSize": 100,
            "fontWeight": "bold",
            "color": "white",
            "textAlign": "center"
          }
        },
        {
          "type": "text",
          "content": "광수\n유머러스한 매력",
          "position": { "x": 760, "y": 950 },
          "style": {
            "fontSize": 45,
            "color": "white",
            "textAlign": "center"
          },
          "animation": {
            "type": "pulse",
            "duration": 1
          }
        }
      ]
    },
    {
      "startTime": 7,
      "endTime": 10,
      "background": {
        "type": "gradient",
        "colors": ["#667eea", "#764ba2"]
      },
      "elements": [
        {
          "type": "text",
          "content": "당신의 선택은? 🤔",
          "position": { "x": 540, "y": 800 },
          "style": {
            "fontSize": 65,
            "fontWeight": "bold",
            "color": "white",
            "textAlign": "center"
          }
        },
        {
          "type": "text",
          "content": "💡 리얼픽 앱에서\n지금 투표하기",
          "position": { "x": 540, "y": 1100 },
          "style": {
            "fontSize": 50,
            "fontWeight": "600",
            "color": "#FFE66D",
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

---

## 2. HTML Canvas 기반 무료 렌더링

### 2.1 렌더링 엔진 구현

```typescript
// lib/video/canvas-renderer.ts
import { createCanvas, loadImage, registerFont } from 'canvas'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// 폰트 등록 (한글 지원)
registerFont(path.join(process.cwd(), 'assets/fonts/Pretendard-Bold.ttf'), { 
  family: 'Pretendard' 
})

export async function renderVideoFromScenario(params: {
  missionId: string
  scenario: VideoScenario
  thumbnailUrl?: string
}): Promise<string> {
  const { missionId, scenario, thumbnailUrl } = params
  
  const width = 1080
  const height = 1920
  const fps = scenario.fps || 30
  const totalFrames = scenario.duration * fps
  
  console.log(`[Canvas Render] 시작: ${totalFrames} 프레임 생성`)
  
  // 임시 디렉토리 생성
  const tempDir = path.join('/tmp', `video-${missionId}`)
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }
  
  // 썸네일 이미지 로드 (있을 경우)
  let thumbnailImage = null
  if (thumbnailUrl) {
    try {
      thumbnailImage = await loadImage(thumbnailUrl)
    } catch (e) {
      console.warn('[Canvas Render] 썸네일 로드 실패:', e)
    }
  }
  
  // 각 프레임 렌더링
  for (let frameNum = 0; frameNum < totalFrames; frameNum++) {
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')
    
    const currentTime = frameNum / fps
    
    // 현재 시간에 해당하는 장면 찾기
    const currentScene = scenario.scenes.find(
      scene => currentTime >= scene.startTime && currentTime < scene.endTime
    )
    
    if (!currentScene) continue
    
    // 배경 렌더링
    renderBackground(ctx, currentScene.background, width, height, thumbnailImage)
    
    // 요소들 렌더링
    for (const element of currentScene.elements) {
      const sceneProgress = (currentTime - currentScene.startTime) / (currentScene.endTime - currentScene.startTime)
      renderElement(ctx, element, sceneProgress, currentTime - currentScene.startTime)
    }
    
    // 프레임을 이미지로 저장
    const buffer = canvas.toBuffer('image/png')
    const framePath = path.join(tempDir, `frame${String(frameNum).padStart(5, '0')}.png`)
    fs.writeFileSync(framePath, buffer)
    
    if (frameNum % 30 === 0) {
      console.log(`[Canvas Render] 진행: ${Math.round((frameNum / totalFrames) * 100)}%`)
    }
  }
  
  console.log('[Canvas Render] 프레임 생성 완료, FFmpeg 인코딩 시작')
  
  // FFmpeg로 영상 생성
  const outputPath = path.join('/tmp', `mission-${missionId}.mp4`)
  await execAsync(
    `ffmpeg -framerate ${fps} -i ${tempDir}/frame%05d.png -c:v libx264 -pix_fmt yuv420p -y ${outputPath}`
  )
  
  console.log('[Canvas Render] FFmpeg 인코딩 완료')
  
  // 임시 파일 삭제
  fs.rmSync(tempDir, { recursive: true, force: true })
  
  // S3/Storage 업로드
  const videoUrl = await uploadToStorage(outputPath, `videos/${missionId}.mp4`)
  
  // 로컬 임시 파일 삭제
  fs.unlinkSync(outputPath)
  
  return videoUrl
}

function renderBackground(
  ctx: CanvasRenderingContext2D,
  background: VideoScene['background'],
  width: number,
  height: number,
  thumbnailImage: any
) {
  if (background.type === 'gradient' && background.colors) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    background.colors.forEach((color, i) => {
      gradient.addColorStop(i / (background.colors!.length - 1), color)
    })
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  } else if (background.type === 'blur-thumbnail' && thumbnailImage) {
    ctx.filter = 'blur(40px)'
    ctx.globalAlpha = 0.3
    ctx.drawImage(thumbnailImage, 0, 0, width, height)
    ctx.filter = 'none'
    ctx.globalAlpha = 1
  } else if (background.type === 'solid') {
    ctx.fillStyle = background.colors?.[0] || '#000'
    ctx.fillRect(0, 0, width, height)
  }
}

function renderElement(
  ctx: CanvasRenderingContext2D,
  element: VideoElement,
  sceneProgress: number,
  elementTime: number
) {
  ctx.save()
  
  // 애니메이션 적용
  let opacity = 1
  let translateY = 0
  let scale = 1
  
  if (element.animation) {
    const animProgress = Math.min(elementTime / element.animation.duration, 1)
    
    if (element.animation.type === 'fade-in') {
      opacity = animProgress
    } else if (element.animation.type === 'slide-in') {
      translateY = (1 - animProgress) * 50
    } else if (element.animation.type === 'scale') {
      scale = 0.5 + (animProgress * 0.5)
    } else if (element.animation.type === 'pulse') {
      scale = 0.9 + Math.sin(elementTime * Math.PI * 2) * 0.1
    }
  }
  
  ctx.globalAlpha = opacity
  ctx.translate(element.position.x, element.position.y + translateY)
  ctx.scale(scale, scale)
  
  if (element.type === 'text') {
    ctx.font = `${element.style.fontWeight || 'normal'} ${element.style.fontSize || 40}px Pretendard`
    ctx.fillStyle = element.style.color || 'white'
    ctx.textAlign = (element.style.textAlign || 'center') as CanvasTextAlign
    ctx.textBaseline = 'middle'
    
    // 여러 줄 텍스트 처리
    const lines = element.content.split('\n')
    lines.forEach((line, i) => {
      ctx.fillText(line, 0, i * (element.style.fontSize || 40) * 1.2)
    })
  } else if (element.type === 'shape') {
    if (element.style.backgroundColor) {
      ctx.fillStyle = element.style.backgroundColor
      const radius = element.style.borderRadius || 0
      const w = element.position.width || 100
      const h = element.position.height || 100
      
      // 둥근 사각형
      ctx.beginPath()
      ctx.moveTo(-w/2 + radius, -h/2)
      ctx.lineTo(w/2 - radius, -h/2)
      ctx.quadraticCurveTo(w/2, -h/2, w/2, -h/2 + radius)
      ctx.lineTo(w/2, h/2 - radius)
      ctx.quadraticCurveTo(w/2, h/2, w/2 - radius, h/2)
      ctx.lineTo(-w/2 + radius, h/2)
      ctx.quadraticCurveTo(-w/2, h/2, -w/2, h/2 - radius)
      ctx.lineTo(-w/2, -h/2 + radius)
      ctx.quadraticCurveTo(-w/2, -h/2, -w/2 + radius, -h/2)
      ctx.closePath()
      ctx.fill()
    }
  }
  
  ctx.restore()
}
```

### 2.2 API 라우트

```typescript
// app/api/video/render/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { generateVideoScenario } from '@/lib/video/scenario-generator'
import { renderVideoFromScenario } from '@/lib/video/canvas-renderer'
import { getMissionById } from '@/lib/db/missions'

export async function POST(req: NextRequest) {
  const { missionId } = await req.json()
  
  try {
    // 1. 미션 데이터 가져오기
    const mission = await getMissionById(missionId)
    if (!mission) {
      return NextResponse.json({ error: '미션 없음' }, { status: 404 })
    }
    
    // 2. Gemini로 시나리오 생성
    console.log('[Video] Gemini 시나리오 생성 중...')
    const scenario = await generateVideoScenario({
      mission,
      track: 'auto'
    })
    
    // 3. Canvas로 렌더링
    console.log('[Video] Canvas 렌더링 시작...')
    const videoUrl = await renderVideoFromScenario({
      missionId: mission.id,
      scenario,
      thumbnailUrl: mission.thumbnailUrl
    })
    
    console.log('[Video] 완료:', videoUrl)
    
    return NextResponse.json({ 
      success: true, 
      videoUrl,
      scenario 
    })
  } catch (error) {
    console.error('[Video] 실패:', error)
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 })
  }
}
```

---

## 3. 필요한 패키지 설치

```bash
# Canvas (HTML5 Canvas를 Node.js에서 사용)
npm install canvas

# FFmpeg (영상 인코딩)
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg

# Windows
# https://ffmpeg.org/download.html 에서 다운로드
```

### package.json 의존성

```json
{
  "dependencies": {
    "canvas": "^2.11.2",
    "@google/generative-ai": "^0.1.3",
    "next": "^14.0.0"
  }
}
```

---

## 4. 비용 비교 (최종)

| 항목 | 기존 (v2.1) | 새 플랜 (v3.0) |
|------|------------|--------------|
| 비디오 렌더링 | Remotion Lambda: 7,500원 | Canvas + FFmpeg: **0원** |
| 시나리오 생성 | 코드 고정 | Gemini API: **450원** |
| SNS 콘텐츠 생성 | Gemini API: 450원 | Gemini API: 450원 |
| Storage | 78원 | 78원 |
| **합계** | **~8,030원/월** | **~980원/월** ✅ |

**절감액**: 7,050원/월 (87% 절감!)

---

## 5. 전체 워크플로우

```typescript
// 어드민에서 미션 승인 시
async function handleMissionApprove(missionId: string) {
  // 1. 미션 승인
  await updateMission(missionId, { status: 'approved' })
  
  // 2. Gemini: 영상 시나리오 생성
  const scenario = await generateVideoScenario({
    mission: mission,
    track: 'auto'
  })
  
  // 3. Gemini: SNS 콘텐츠 생성
  const snsContent = await generateMultiPlatformContent({
    mission: mission,
    track: 'auto',
    platforms: ['instagram', 'youtube', 'tiktok']
  })
  
  // 4. Canvas: 영상 렌더링 (무료!)
  const videoUrl = await renderVideoFromScenario({
    missionId: mission.id,
    scenario: scenario,
    thumbnailUrl: mission.thumbnailUrl
  })
  
  // 5. SNS 업로드
  await uploadToInstagram({
    videoUrl: videoUrl,
    caption: snsContent.instagram.caption,
    hashtags: snsContent.instagram.hashtags,
    mentions: mission.castTags
  })
  
  await uploadToYouTube({
    videoUrl: videoUrl,
    title: `${mission.title} #Shorts`,
    description: snsContent.youtube.caption
  })
  
  console.log('✅ 완료!')
}
```

---

## 6. 장단점 비교

### Canvas + FFmpeg 방식 (v3.0)

**장점**:
- ✅ 완전 무료 (서버 비용만)
- ✅ Gemini가 시나리오까지 생성 → 다양한 스타일
- ✅ 자막이 풍부하고 동적
- ✅ 서버에서 직접 렌더링 → 제어 용이

**단점**:
- ⚠️ 렌더링 시간 오래 걸림 (2~3분/영상)
- ⚠️ 서버 CPU/메모리 사용량 높음
- ⚠️ 동시 렌더링 제한 (큐 시스템 필요)

### Remotion Lambda 방식 (v2.1)

**장점**:
- ✅ 렌더링 빠름 (10~30초)
- ✅ 무한 확장 가능

**단점**:
- ❌ 비용 발생 (7,500원/월)
- ❌ 시나리오 고정 (React 코드)

---

## 7. 추천 전략

### Phase 1 (MVP): Canvas 방식으로 시작
- 비용 0원으로 검증
- 초기 30~50개 영상 생성
- 바이럴 효과 측정

### Phase 2 (확장): 하이브리드
- 일반 미션: Canvas (무료)
- 긴급/메인 미션: Remotion Lambda (빠름)
- 렌더링 큐 시스템 구축

### Phase 3 (최적화): 선택적 사용
- 조회수 높은 미션만 Lambda
- 나머지는 Canvas
- 비용 최적화 (~3,000원/월)

---

## 8. 필수 준비물

### 서버 환경
```bash
# 1. FFmpeg 설치
sudo apt-get update
sudo apt-get install ffmpeg

# 2. 한글 폰트 설치
sudo apt-get install fonts-noto-cjk

# 3. Canvas 빌드 의존성
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

### 폰트 파일 준비
```
assets/
  fonts/
    Pretendard-Bold.ttf       # 한글 지원 폰트
    Pretendard-SemiBold.ttf
```

**폰트 다운로드**: https://github.com/orioncactus/pretendard

---

## 9. 구현 체크리스트

### Week 1
- [ ] Canvas + FFmpeg 설치 및 테스트
- [ ] Gemini 시나리오 생성 프롬프트 작성
- [ ] Canvas 렌더링 엔진 구현
- [ ] 단일 프레임 렌더링 테스트

### Week 2
- [ ] 전체 영상 렌더링 테스트 (10초)
- [ ] 애니메이션 구현 (fade, slide, pulse)
- [ ] 한글 폰트 적용
- [ ] 실제 미션으로 영상 생성

### Week 3
- [ ] API 라우트 구현
- [ ] 어드민 UI 통합
- [ ] Gemini 콘텐츠 생성 통합
- [ ] End-to-End 테스트

### Week 4
- [ ] 렌더링 큐 시스템
- [ ] 에러 핸들링
- [ ] 성능 최적화
- [ ] SNS 자동 업로드

---

## 10. 성능 최적화 팁

### 렌더링 속도 개선
```typescript
// 1. 프레임 스킵 (초안 생성 시)
const skipFrames = 2  // 2프레임마다 1개만 렌더링
for (let i = 0; i < totalFrames; i += skipFrames) {
  // 렌더링...
}

// 2. 캔버스 재사용
const canvas = createCanvas(1080, 1920)  // 한 번만 생성
for (let i = 0; i < totalFrames; i++) {
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, 1080, 1920)
  // 렌더링...
}

// 3. 병렬 처리 (여러 미션 동시 렌더링)
const queue = new PQueue({ concurrency: 2 })
queue.add(() => renderVideo(mission1))
queue.add(() => renderVideo(mission2))
```

### 서버 리소스 관리
```typescript
// CPU/메모리 모니터링
import os from 'os'

function checkServerLoad() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length
  const memUsage = 1 - (os.freemem() / os.totalmem())
  
  if (cpuUsage > 0.8 || memUsage > 0.8) {
    console.warn('[Server] 리소스 부족, 렌더링 지연')
    return false
  }
  return true
}

// 렌더링 전 체크
if (!checkServerLoad()) {
  await delay(60000)  // 1분 대기
}
```

---

## 📚 참고 자료

- [Node Canvas 문서](https://github.com/Automattic/node-canvas)
- [FFmpeg 공식 문서](https://ffmpeg.org/documentation.html)
- [Gemini API 가이드](https://ai.google.dev/docs)

---

**작성**: AI Assistant  
**버전**: 3.0 (제로 코스트)  
**최종 수정**: 2026-02-10
