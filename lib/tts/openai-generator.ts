/**
 * 리얼픽 쇼츠용 TTS (OpenAI) - 유튜브 쇼츠 호흡에 맞춘 1.2배속 나레이션
 * 환경변수: OPENAI_API_KEY
 */
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

export type TTSVoice = 'onyx' | 'shimmer' | 'alloy' | 'echo' | 'fable' | 'nova'

/**
 * 쇼츠용 고텐션 나레이션 생성
 * @param text 대본 텍스트
 * @param outputPath 저장할 파일 경로 (예: public/audio/tts_output.mp3)
 * @param options voice 기본 onyx, speed 기본 1.2
 */
export async function generateShortsTTS(
  text: string,
  outputPath: string,
  options?: { voice?: TTSVoice; speed?: number }
): Promise<string> {
  if (!openai) {
    throw new Error('OPENAI_API_KEY가 설정되지 않았습니다. .env에 OPENAI_API_KEY를 추가하세요.')
  }
  const voice = options?.voice ?? 'onyx'
  const speed = options?.speed ?? 1.2

  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const mp3 = await openai.audio.speech.create({
    model: 'tts-1',
    voice,
    input: text,
    speed,
  })

  const buffer = Buffer.from(await mp3.arrayBuffer())
  await fs.promises.writeFile(outputPath, buffer)

  console.log(`[TTS] 생성 완료: ${outputPath} (voice=${voice}, speed=${speed})`)
  return outputPath
}

/**
 * 오디오 파일 길이(초) 반환 - Remotion 등에서 durationInFrames 계산용 (ffprobe 사용)
 */
export function getAudioDurationInSeconds(audioPath: string): number {
  if (!fs.existsSync(audioPath)) {
    throw new Error(`오디오 파일 없음: ${audioPath}`)
  }
  try {
    const abs = path.resolve(audioPath)
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${abs}"`,
      { encoding: 'utf-8' }
    )
    const sec = parseFloat(out.trim())
    return Number.isFinite(sec) ? sec : 0
  } catch {
    return 0
  }
}
