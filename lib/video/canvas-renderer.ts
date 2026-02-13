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

// 보다 굵은 자막용 폰트들 추가 시도
try {
  const blackPath = path.join(process.cwd(), 'assets', 'fonts', 'Pretendard-Black.ttf')
  if (fs.existsSync(blackPath)) {
    registerFont(blackPath, { family: 'Pretendard-Black' })
    fontFamily = 'Pretendard-Black, Pretendard, "Malgun Gothic", sans-serif'
    console.log('[Canvas Renderer] Pretendard-Black 폰트 로드 성공:', blackPath)
  }
} catch (e) {
  console.warn('[Canvas Renderer] Pretendard-Black 폰트 등록 실패')
}

try {
  const gmarketPath = path.join(process.cwd(), 'assets', 'fonts', 'GmarketSansBold.ttf')
  if (fs.existsSync(gmarketPath)) {
    registerFont(gmarketPath, { family: 'GmarketSansBold' })
    console.log('[Canvas Renderer] GmarketSansBold 폰트 로드 성공:', gmarketPath)
  }
} catch (e) {
  console.warn('[Canvas Renderer] GmarketSansBold 폰트 등록 실패')
}

export { fontFamily }

/** 기본 BGM 경로 (public/assets) */
const DEFAULT_BGM_PATH = path.join(process.cwd(), 'public', 'assets', 'realpick_theme_suno.mp3')

export async function renderVideoFromScenario(params: {
  missionId: string
  scenario: VideoScenario
  thumbnailUrl?: string
  /** BGM MP3 절대 경로. 없으면 기본 테마음 사용, 파일 없으면 무음 */
  bgmPath?: string | null
}): Promise<string> {
  const { missionId, scenario, thumbnailUrl, bgmPath: bgmPathParam } = params
  const bgmPath = bgmPathParam !== undefined ? bgmPathParam : DEFAULT_BGM_PATH
  
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
  
  // 시나리오 내 type: 'image' 요소의 URL 수집 후 일괄 로드
  const imageUrls = new Set<string>()
  for (const scene of scenario.scenes) {
    for (const el of scene.elements) {
      if (el.type === 'image' && el.content && String(el.content).startsWith('http')) {
        imageUrls.add(el.content)
      }
    }
  }
  const imageMap = new Map<string, Image>()
  for (const url of imageUrls) {
    try {
      imageMap.set(url, await loadImage(url))
    } catch (e) {
      console.warn('[Canvas Render] 이미지 로드 실패:', url, e)
    }
  }
  if (imageMap.size > 0) console.log('[Canvas Render] 시나리오 이미지 로드:', imageMap.size, '개')
  
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
        renderElement(ctx, element, sceneProgress, currentTime - currentScene.startTime, thumbnailImage, imageMap)
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
  
  const outputPath = path.join(process.cwd(), 'temp', `mission-${missionId}.mp4`)
  const tempDirEsc = tempDir.replace(/\\/g, '/')
  const outputEsc = outputPath.replace(/\\/g, '/')
  
  try {
    await execAsync(
      `ffmpeg -framerate ${fps} -i "${tempDirEsc}/frame%05d.png" -c:v libx264 -pix_fmt yuv420p -y "${outputEsc}"`
    )
    console.log('[Canvas Render] FFmpeg 인코딩 완료')
  } catch (error) {
    console.error('[Canvas Render] FFmpeg 실패:', error)
    throw new Error('FFmpeg 인코딩 실패. ffmpeg가 설치되어 있는지 확인하세요.')
  }
  
  // BGM 있으면 무음 영상에 오디오 합성 (BGM 루프, 영상 길이에 맞춤)
  if (bgmPath && fs.existsSync(bgmPath)) {
    const withBgmPath = path.join(process.cwd(), 'temp', `mission-${missionId}-with-bgm.mp4`)
    const bgmEsc = bgmPath.replace(/\\/g, '/')
    try {
      await execAsync(
        `ffmpeg -i "${outputEsc}" -stream_loop -1 -i "${bgmEsc}" -map 0:v -map 1:a -shortest -c:v copy -c:a aac -y "${withBgmPath.replace(/\\/g, '/')}"`
      )
      fs.unlinkSync(outputPath)
      fs.renameSync(withBgmPath, outputPath)
      console.log('[Canvas Render] BGM 합성 완료')
    } catch (e) {
      console.warn('[Canvas Render] BGM 합성 실패, 무음 영상 유지:', e)
    }
  } else if (bgmPath) {
    console.warn('[Canvas Render] BGM 파일 없음:', bgmPath)
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

// 부드러운 튕김 효과(Ease-Out-Back) 이징 함수
function easeOutBack(x: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
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
  } else if (background.type === 'blur-thumbnail') {
    if (thumbnailImage) {
      ctx.filter = 'blur(28px)'
      ctx.globalAlpha = 0.5
      ctx.drawImage(thumbnailImage, 0, 0, width, height)
      ctx.filter = 'none'
      ctx.globalAlpha = 1
      // 릴스 스타일: 글자 가독을 위한 어두운 오버레이
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
      ctx.fillRect(0, 0, width, height)
    } else {
      const gradient = ctx.createLinearGradient(0, 0, 0, height)
      gradient.addColorStop(0, '#1a1a1a')
      gradient.addColorStop(1, '#0a0a0a')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
    }
  } else if (background.type === 'solid') {
    ctx.fillStyle = background.colors?.[0] || '#000'
    ctx.fillRect(0, 0, width, height)
  }
}

function renderElement(
  ctx: CanvasRenderingContext2D,
  element: VideoElement,
  sceneProgress: number,
  elementTime: number,
  thumbnailImage: Image | null,
  imageMap: Map<string, Image>
) {
  ctx.save()
  
  // 애니메이션 적용
  let opacity = 1
  let translateY = 0
  let scale = 1
  
  if (element.animation) {
    const rawProgress = Math.min(elementTime / element.animation.duration, 1)
    const ease = easeOutBack(rawProgress)
    
    if (element.animation.type === 'fade-in') {
      opacity = ease
    } else if (element.animation.type === 'slide-in') {
      translateY = (1 - ease) * 60
      opacity = ease
    } else if (element.animation.type === 'scale') {
      scale = 0.5 + ease * 0.6
      opacity = ease
    } else if (element.animation.type === 'pulse') {
      // 계속 반복되는 pulse 효과
      scale = 0.95 + Math.sin(elementTime * Math.PI * 2) * 0.05
    }
  }
  
  ctx.globalAlpha = opacity
  ctx.translate(element.position.x, element.position.y + translateY)
  ctx.scale(scale, scale)
  
  if (element.type === 'image') {
    const img = element.content ? imageMap.get(element.content) : null
    if (img) {
      const w = element.position.width ?? 800
      const h = element.position.height ?? 450
      ctx.drawImage(img, -w / 2, -h / 2, w, h)
    }
  } else if (element.type === 'text') {
    // content가 없으면 스킵
    if (!element.content) {
      ctx.restore()
      return
    }
    
    // 폰트 설정
    const fontSize = element.style.fontSize || 40
    const fontWeight = element.style.fontWeight || 'normal'
    
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
    ctx.fillStyle = element.style.color || 'white'
    ctx.textAlign = (element.style.textAlign || 'center') as CanvasTextAlign
    ctx.textBaseline = 'middle'
    
    // 릴스 스타일: 두꺼운 검은 테두리 + 그림자
    const strokeW = element.style.strokeWidth ?? Math.max(4, Math.round(fontSize * 0.14))
    ctx.lineWidth = strokeW
    ctx.strokeStyle = '#000000'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
    ctx.shadowBlur = strokeW * 2
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2
    
    // 여러 줄 텍스트 처리
    const lines = element.content.split('\n')
    const lineHeight = fontSize * 1.3
    const startY = -(lines.length - 1) * lineHeight / 2
    
    lines.forEach((line, i) => {
      const y = startY + i * lineHeight
      // 먼저 테두리
      ctx.strokeText(line, 0, y)
      // 그 다음 채우기
      ctx.fillText(line, 0, y)
    })
    
    // 그림자 리셋
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
  } else if (element.type === 'shape') {
    if (element.style.backgroundColor) {
      // rgba(45,45,45,0.85) 등 반투명 지원
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
