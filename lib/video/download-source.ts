/**
 * 유튜브 등 URL에서 소스 영상 다운로드 (Remotion 전처리용)
 * yt-dlp가 설치되어 있으면 사용. 없으면 호출 측에서 로컬 경로를 직접 사용.
 */
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url)
}

/**
 * yt-dlp 설치 여부 확인
 */
export function isYtDlpAvailable(): boolean {
  try {
    execSync('yt-dlp --version', { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

/**
 * URL에서 영상 다운로드 (yt-dlp 필요)
 * @param videoUrl 유튜브 등 영상 URL
 * @param outputDir 저장 디렉터리 (파일명은 자동 생성)
 * @returns 다운로드된 비디오 파일 경로 (720p 이하)
 */
export async function downloadVideoFromUrl(
  videoUrl: string,
  outputDir: string
): Promise<string> {
  if (!isYtDlpAvailable()) {
    throw new Error(
      'yt-dlp가 설치되어 있지 않습니다. 소스 영상을 직접 다운로드한 뒤 로컬 경로를 사용하세요. (choco install yt-dlp 또는 https://github.com/yt-dlp/yt-dlp)'
    )
  }
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })
  const outTemplate = path.join(path.resolve(outputDir), 'source.%(ext)s')
  execSync(
    `yt-dlp -f "bestvideo[height<=720]+bestaudio/best[height<=720]" --merge-output-format mp4 -o "${outTemplate.replace(/"/g, '\\"')}" "${videoUrl}"`,
    { stdio: 'pipe' }
  )
  const mp4 = path.join(outputDir, 'source.mp4')
  if (fs.existsSync(mp4)) return mp4
  const files = fs.readdirSync(outputDir).filter((f) => /\.(mp4|mkv|webm)$/i.test(f))
  if (files.length === 0) throw new Error('다운로드된 영상 파일을 찾을 수 없습니다.')
  return path.join(outputDir, files[0])
}
