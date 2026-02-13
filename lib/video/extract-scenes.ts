/**
 * 소스 영상에서 주요 구간 프레임 추출 (Remotion 배경 슬라이드용)
 * FFmpeg 사용. 20%, 40%, 60%, 80% 지점에서 1장씩 추출.
 */
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

/**
 * 비디오 파일 길이(초) 반환
 */
export function getVideoDurationSeconds(videoPath: string): number {
  if (!fs.existsSync(videoPath)) throw new Error(`비디오 파일 없음: ${videoPath}`)
  const abs = path.resolve(videoPath)
  const out = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${abs}"`,
    { encoding: 'utf-8' }
  )
  const sec = parseFloat(out.trim())
  return Number.isFinite(sec) ? sec : 0
}

/**
 * 영상의 특정 시점(초)에서 프레임 1장 추출
 */
export function extractFrameAt(videoPath: string, timeSeconds: number, outputPath: string): string {
  const absIn = path.resolve(videoPath)
  const absOut = path.resolve(outputPath)
  const dir = path.dirname(absOut)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const t = Math.max(0, timeSeconds)
  execSync(
    `ffmpeg -ss ${t} -i "${absIn}" -frames:v 1 -q:v 2 -y "${absOut}"`,
    { stdio: 'pipe' }
  )
  return absOut
}

/**
 * 20%, 40%, 60%, 80% 지점에서 프레임 추출
 * @param videoPath 소스 영상 경로
 * @param outputDir 저장 폴더 (예: temp/shorts-missionId)
 * @returns [thumbnail.jpg, scene_1.jpg, scene_2.jpg, scene_3.jpg, scene_4.jpg] 경로 배열
 */
export function extractSceneSlides(videoPath: string, outputDir: string): string[] {
  const duration = getVideoDurationSeconds(videoPath)
  if (duration <= 0) throw new Error(`비디오 길이를 구할 수 없음: ${videoPath}`)

  const positions = [0.2, 0.4, 0.6, 0.8].map((p) => duration * p)
  const paths: string[] = []

  // 썸네일(시작 프레임)
  const thumbPath = path.join(outputDir, 'thumbnail.jpg')
  extractFrameAt(videoPath, 0, thumbPath)
  paths.push(thumbPath)

  // scene_1 ~ scene_4
  positions.forEach((sec, i) => {
    const scenePath = path.join(outputDir, `scene_${i + 1}.jpg`)
    extractFrameAt(videoPath, sec, scenePath)
    paths.push(scenePath)
  })

  console.log(`[ExtractScenes] 추출 완료: ${paths.length}장 (duration=${duration.toFixed(1)}s)`)
  return paths
}
