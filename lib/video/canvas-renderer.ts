// lib/video/canvas-renderer.ts
import { createCanvas, loadImage, registerFont, CanvasRenderingContext2D, Image } from 'canvas'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import type { VideoScenario, VideoScene, VideoElement } from './scenario-generator'

const execAsync = promisify(exec)

// 폰트 등록 시도 (에러 무시)
let fontFamily = '"Malgun Gothic", "맑은 고딕", "Noto Sans KR", sans-serif'
try {
  const fontPath = path.join(process.cwd(), 'assets', 'fonts', 'Pretendard-Bold.ttf')
  if (fs.existsSync(fontPath)) {
    registerFont(fontPath, { family: 'Pretendard' })
    fontFamily = 'Pretendard, "Malgun Gothic", sans-serif'
    console.log('[Canvas Renderer] 폰트 로드 성공:', fontPath)
  } else {
    console.warn('[Canvas Renderer] Pretendard 폰트 없음, Windows 시스템 폰트(맑은 고딕) 사용')
  }
} catch (e) {
  console.warn('[Canvas Renderer] 폰트 등록 실패, Windows 시스템 폰트(맑은 고딕) 사용')
}

export { fontFamily }

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
  const tempDir = path.join(process.cwd(), 'temp', `video-${missionId}`)
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }
  
  // 썸네일 이미지 로드 (있을 경우)
  let thumbnailImage: Image | null = null
  if (thumbnailUrl) {
    try {
      thumbnailImage = await loadImage(thumbnailUrl)
      console.log('[Canvas Render] 썸네일 로드 성공')
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
    
    if (!currentScene) {
      // 장면이 없으면 검은 화면
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, width, height)
    } else {
      // 배경 렌더링
      renderBackground(ctx, currentScene.background, width, height, thumbnailImage)
      
      // 요소들 렌더링
      for (const element of currentScene.elements) {
        const sceneProgress = (currentTime - currentScene.startTime) / (currentScene.endTime - currentScene.startTime)
        renderElement(ctx, element, sceneProgress, currentTime - currentScene.startTime)
      }
    }
    
    // 프레임을 이미지로 저장
    const buffer = canvas.toBuffer('image/png')
    const framePath = path.join(tempDir, `frame${String(frameNum).padStart(5, '0')}.png`)
    fs.writeFileSync(framePath, buffer)
    
    if (frameNum % 30 === 0 || frameNum === totalFrames - 1) {
      console.log(`[Canvas Render] 진행: ${Math.round((frameNum / totalFrames) * 100)}%`)
    }
  }
  
  console.log('[Canvas Render] 프레임 생성 완료, FFmpeg 인코딩 시작')
  
  // FFmpeg로 영상 생성
  const outputPath = path.join(process.cwd(), 'temp', `mission-${missionId}.mp4`)
  
  try {
    await execAsync(
      `ffmpeg -framerate ${fps} -i ${tempDir}/frame%05d.png -c:v libx264 -pix_fmt yuv420p -y ${outputPath}`
    )
    console.log('[Canvas Render] FFmpeg 인코딩 완료')
  } catch (error) {
    console.error('[Canvas Render] FFmpeg 실패:', error)
    throw new Error('FFmpeg 인코딩 실패. ffmpeg가 설치되어 있는지 확인하세요.')
  }
  
  // 임시 프레임 파일 삭제
  try {
    fs.rmSync(tempDir, { recursive: true, force: true })
  } catch (e) {
    console.warn('[Canvas Render] 임시 파일 삭제 실패:', e)
  }
  
  console.log(`[Canvas Render] 완료: ${outputPath}`)
  
  return outputPath
}

function renderBackground(
  ctx: CanvasRenderingContext2D,
  background: VideoScene['background'],
  width: number,
  height: number,
  thumbnailImage: Image | null
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
      opacity = animProgress
    } else if (element.animation.type === 'scale') {
      scale = 0.5 + (animProgress * 0.5)
      opacity = animProgress
    } else if (element.animation.type === 'pulse') {
      // 계속 반복되는 pulse 효과
      scale = 0.95 + Math.sin(elementTime * Math.PI * 2) * 0.05
    }
  }
  
  ctx.globalAlpha = opacity
  ctx.translate(element.position.x, element.position.y + translateY)
  ctx.scale(scale, scale)
  
  if (element.type === 'text') {
    // 폰트 설정
    const fontSize = element.style.fontSize || 40
    const fontWeight = element.style.fontWeight || 'normal'
    
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
    ctx.fillStyle = element.style.color || 'white'
    ctx.textAlign = (element.style.textAlign || 'center') as CanvasTextAlign
    ctx.textBaseline = 'middle'
    
    // 텍스트 그림자 (가독성 향상)
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    ctx.shadowBlur = 10
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2
    
    // 여러 줄 텍스트 처리
    const lines = element.content.split('\n')
    const lineHeight = fontSize * 1.3
    const startY = -(lines.length - 1) * lineHeight / 2
    
    lines.forEach((line, i) => {
      ctx.fillText(line, 0, startY + i * lineHeight)
    })
    
    // 그림자 리셋
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
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
      
      // 그림자 효과
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
      ctx.shadowBlur = 20
      ctx.shadowOffsetY = 10
      ctx.fill()
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0
    }
  }
  
  ctx.restore()
}
