/**
 * Remotion 쇼츠 렌더링 (Node에서 호출)
 * - bundle(entry) → selectComposition → renderMedia
 * 사용 조건: scenePaths, ttsPath 등 로컬 경로 준비 후 호출
 */
import path from 'path'
import { bundle } from '@remotion/bundler'
import { getCompositions, renderMedia, selectComposition } from '@remotion/renderer'

const REMOTION_ROOT = path.join(process.cwd(), 'remotion')

export type RenderShortsInput = {
  hookMessage: string
  question: string
  optionA: string
  optionB: string
  /** 배경 이미지 public 기준 상대 경로 (shorts-temp/id/thumbnail.jpg 등) */
  sceneUrls: string[]
  /** TTS MP3 public 기준 상대 경로 또는 빈 문자열 */
  ttsUrl: string
  /** BGM public 기준 상대 경로 (예: assets/realpick_theme_suno.mp3) */
  bgmUrl?: string
  /** 출력 MP4 경로 */
  outputPath: string
  /** TTS/영상 길이(초) → durationInFrames = ceil(sec * 30) */
  durationInSeconds: number
}

const DEFAULT_BGM_RELATIVE = 'assets/realpick_theme_suno.mp3'

export async function renderRemotionShorts(input: RenderShortsInput): Promise<string> {
  const { outputPath, durationInSeconds, sceneUrls, ttsUrl, bgmUrl, ...props } = input
  const durationInFrames = Math.ceil(durationInSeconds * 30)

  const bundleLocation = await bundle({
    entryPoint: path.join(REMOTION_ROOT, 'entry.ts'),
    webpackOverride: (config) => config,
  })

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'Shorts',
    inputProps: {
      ...props,
      sceneUrls,
      ttsUrl: ttsUrl || '',
      bgmUrl: bgmUrl ?? DEFAULT_BGM_RELATIVE,
    },
  })

  await renderMedia({
    composition: {
      ...composition,
      durationInFrames,
    },
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: {
      ...props,
      sceneUrls,
      ttsUrl: ttsUrl || '',
      bgmUrl: bgmUrl ?? DEFAULT_BGM_RELATIVE,
    },
  })

  console.log(`[Remotion] 렌더 완료: ${outputPath}`)
  return outputPath
}
