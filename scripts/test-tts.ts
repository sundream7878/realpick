/**
 * TTS 테스트: 샘플 문장으로 MP3 생성 후 public/audio/test-tts.mp3 저장
 * 실행: npx tsx scripts/test-tts.ts
 */
import path from 'path'
import fs from 'fs'
import { generateShortsTTS, getAudioDurationInSeconds } from '../lib/tts/openai-generator'

async function main() {
  const outDir = path.join(process.cwd(), 'public', 'audio')
  const outputPath = path.join(outDir, 'test-tts.mp3')
  const sample =
    '지금 난리난 한마디. 사이다인가, 무례인가? 당신의 생각을 리얼픽에서 투표하세요.'

  console.log('[Test TTS] 샘플 문장:', sample)
  console.log('[Test TTS] 출력 경로:', outputPath)

  if (!process.env.OPENAI_API_KEY) {
    console.error('[Test TTS] OPENAI_API_KEY가 없습니다. .env.local을 확인하세요.')
    process.exit(1)
  }

  await generateShortsTTS(sample, outputPath)
  const duration = getAudioDurationInSeconds(outputPath)
  console.log('[Test TTS] 완료. 길이:', duration.toFixed(2), '초')
  console.log('[Test TTS] 재생해서 확인:', outputPath)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
