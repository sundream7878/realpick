// app/api/video/render/route.ts
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { generateVideoScenario } from '@/lib/video/scenario-generator'
import { renderVideoFromScenario } from '@/lib/video/canvas-renderer'
import { renderRemotionShorts } from '@/lib/video/render-remotion-shorts'
import { downloadVideoFromUrl, isYtDlpAvailable } from '@/lib/video/download-source'
import { extractSceneSlides } from '@/lib/video/extract-scenes'
import { generateShortsTTS, getAudioDurationInSeconds } from '@/lib/tts/openai-generator'
import { generateMultiPlatformContent } from '@/lib/viral/content-generator'
import { adminDb } from '@/lib/firebase/admin'

export const maxDuration = 300 // 5분 타임아웃 (영상 렌더링용)

// CORS 헤더 설정
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const PUBLIC_SHORTS_PREFIX = 'shorts-temp'

/** 썸네일 URL을 public/shorts-temp/{id}/thumbnail.jpg 로 저장 후 상대 경로 반환 */
async function downloadThumbnailToPublic(
  thumbnailUrl: string,
  missionId: string
): Promise<string[]> {
  const publicDir = path.join(process.cwd(), 'public', PUBLIC_SHORTS_PREFIX, missionId)
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true })
  const outPath = path.join(publicDir, 'thumbnail.jpg')
  const res = await fetch(thumbnailUrl)
  if (!res.ok) throw new Error(`썸네일 다운로드 실패: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(outPath, buf)
  return [`${PUBLIC_SHORTS_PREFIX}/${missionId}/thumbnail.jpg`]
}

/** 소스 영상 다운로드 → 장면 추출 → public/shorts-temp/{id}/ 에 복사 후 상대 경로 배열 반환 */
async function prepareSceneSlidesFromVideo(
  videoUrl: string,
  missionId: string
): Promise<string[]> {
  const tempDir = path.join(process.cwd(), 'temp', `video-${missionId}`)
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })
  const videoPath = await downloadVideoFromUrl(videoUrl, tempDir)
  const scenePaths = extractSceneSlides(videoPath, tempDir)
  const publicDir = path.join(process.cwd(), 'public', PUBLIC_SHORTS_PREFIX, missionId)
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true })
  const sceneUrls: string[] = []
  for (let i = 0; i < scenePaths.length; i++) {
    const name = i === 0 ? 'thumbnail.jpg' : `scene_${i}.jpg`
    const dest = path.join(publicDir, name)
    fs.copyFileSync(scenePaths[i], dest)
    sceneUrls.push(`${PUBLIC_SHORTS_PREFIX}/${missionId}/${name}`)
  }
  return sceneUrls
}

/** TTS 생성 → public/shorts-temp/{id}/tts.mp3 복사 → 길이(초) 반환 */
async function prepareTTS(
  ttsScript: string,
  missionId: string
): Promise<{ ttsUrl: string; durationInSeconds: number }> {
  const tempPath = path.join(process.cwd(), 'temp', `tts-${missionId}.mp3`)
  await generateShortsTTS(ttsScript, tempPath)
  const durationInSeconds = getAudioDurationInSeconds(tempPath)
  const publicDir = path.join(process.cwd(), 'public', PUBLIC_SHORTS_PREFIX, missionId)
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true })
  const destPath = path.join(publicDir, 'tts.mp3')
  fs.copyFileSync(tempPath, destPath)
  const ttsUrl = `${PUBLIC_SHORTS_PREFIX}/${missionId}/tts.mp3`
  return { ttsUrl, durationInSeconds }
}

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(req: NextRequest) {
  try {
    const { missionId, track = 'auto', platforms = ['instagram', 'youtube'] } = await req.json()

    if (!missionId) {
      return NextResponse.json({ error: '미션 ID가 필요합니다' }, { status: 400, headers: corsHeaders })
    }

    console.log(`[Video API] 시작: ${missionId}, track: ${track}`)

    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase Admin이 초기화되지 않았습니다' }, { status: 500, headers: corsHeaders })
    }

    // 1. 미션 데이터 가져오기
    let missionDoc = await adminDb.collection('missions1').doc(missionId).get()
    if (!missionDoc.exists) {
      missionDoc = await adminDb.collection('missions2').doc(missionId).get()
    }
    if (!missionDoc.exists) {
      return NextResponse.json({ error: '미션을 찾을 수 없습니다' }, { status: 404, headers: corsHeaders })
    }

    const mission = { id: missionDoc.id, ...missionDoc.data() } as any

    let thumbnailUrl = mission.thumbnailUrl || mission.sourceVideo?.thumbnailUrl
    const videoUrl = mission.referenceUrl || mission.sourceVideo?.url
    if (!thumbnailUrl && mission.id) {
      const aiSnap = await adminDb.collection('t_marketing_ai_missions').where('publishedMissionId', '==', mission.id).limit(1).get()
      if (!aiSnap.empty) {
        const aiData = aiSnap.docs[0].data()
        thumbnailUrl = aiData.sourceVideo?.thumbnailUrl || thumbnailUrl
      }
    }
    if (!thumbnailUrl && videoUrl && typeof videoUrl === 'string' && videoUrl.includes('youtube.com')) {
      const videoId = videoUrl.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})(?:\?|&|$)/)?.[1]
      if (videoId) thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    }
    if (thumbnailUrl) console.log('[Video API] 썸네일 사용:', thumbnailUrl)

    // 2. Gemini 시나리오 (ttsScript, hookMessage, question, optionA, optionB 포함)
    console.log('[Video API] 시나리오 생성 중...')
    const scenario = await generateVideoScenario({
      mission: { ...mission, thumbnailUrl, videoUrl },
      track,
      dealer: undefined,
    })

    // 3. SNS 콘텐츠 (병렬)
    console.log('[Video API] SNS 콘텐츠 생성 중...')
    const snsContent = await generateMultiPlatformContent({
      mission,
      track,
      platforms,
    })

    // 4. 환경 설정(OPENAI, BGM) → 소스 영상 다운로드 & 장면 추출 → TTS & 길이
    let sceneUrls: string[] = []
    if (videoUrl && typeof videoUrl === 'string' && isYtDlpAvailable()) {
      console.log('[Video API] 소스 영상 다운로드 및 장면 추출...')
      try {
        sceneUrls = await prepareSceneSlidesFromVideo(videoUrl, mission.id)
      } catch (e) {
        console.warn('[Video API] 소스 영상 처리 실패, 썸네일 사용:', e)
        if (thumbnailUrl) sceneUrls = await downloadThumbnailToPublic(thumbnailUrl, mission.id)
      }
    } else if (thumbnailUrl) {
      console.log('[Video API] 썸네일을 배경으로 사용...')
      sceneUrls = await downloadThumbnailToPublic(thumbnailUrl, mission.id)
    }

    let ttsUrl = ''
    let durationInSeconds = 15
    if (scenario.ttsScript && process.env.OPENAI_API_KEY) {
      console.log('[Video API] TTS 생성 중...')
      try {
        const tts = await prepareTTS(scenario.ttsScript, mission.id)
        ttsUrl = tts.ttsUrl
        durationInSeconds = Math.max(15, Math.ceil(tts.durationInSeconds) + 1)
      } catch (e) {
        console.warn('[Video API] TTS 생성 실패, 무음 구간 사용:', e)
      }
    }

    const hookMessage = scenario.hookMessage ?? mission.title ?? '주목!'
    const question = scenario.question ?? mission.title ?? '당신의 선택은?'
    const optionA = scenario.optionA ?? mission.optionA ?? 'A'
    const optionB = scenario.optionB ?? mission.optionB ?? 'B'

    const outputPath = path.join(process.cwd(), 'temp', `mission-${mission.id}.mp4`)

    // 5. Remotion으로 배경+훅+질문+VS+TTS+BGM 덕킹 렌더
    let videoPath: string
    try {
      console.log('[Video API] Remotion 영상 렌더링 시작...')
      videoPath = await renderRemotionShorts({
        hookMessage,
        question,
        optionA,
        optionB,
        sceneUrls,
        ttsUrl,
        outputPath,
        durationInSeconds,
      })
    } catch (remotionError: any) {
      console.warn('[Video API] Remotion 실패, Canvas 폴백:', remotionError?.message)
      videoPath = await renderVideoFromScenario({
        missionId: mission.id,
        scenario,
        thumbnailUrl: thumbnailUrl || undefined,
      })
    }

    // 6. 결과 저장
    if (adminDb) {
      const removeUndefined = (obj: any): any => {
        if (obj === null || obj === undefined) return null
        if (Array.isArray(obj)) return obj.map(removeUndefined)
        if (typeof obj === 'object') {
          return Object.fromEntries(
            Object.entries(obj)
              .filter(([_, v]) => v !== undefined)
              .map(([k, v]) => [k, removeUndefined(v)])
          )
        }
        return obj
      }
      const cleanData = removeUndefined({
        missionId,
        track,
        status: 'completed',
        videoPath,
        scenario,
        snsContent,
        completedAt: new Date(),
      })
      await adminDb.collection('rendering_jobs').doc(missionId).set(cleanData)
    }

    console.log(`[Video API] 완료: ${videoPath}`)

    return NextResponse.json(
      {
        success: true,
        videoPath,
        scenario,
        snsContent,
      },
      { headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('[Video API] 실패:', error)
    return NextResponse.json(
      {
        error: '영상 생성 실패',
        details: error.message,
      },
      { status: 500, headers: corsHeaders }
    )
  }
}

// 렌더링 상태 확인
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const missionId = searchParams.get('missionId')

  if (!missionId) {
    return NextResponse.json({ error: '미션 ID가 필요합니다' }, { status: 400, headers: corsHeaders })
  }

  if (!adminDb) {
    return NextResponse.json({ error: 'Firebase Admin이 초기화되지 않았습니다' }, { status: 500, headers: corsHeaders })
  }

  try {
    const jobDoc = await adminDb.collection('rendering_jobs').doc(missionId).get()

    if (!jobDoc.exists) {
      return NextResponse.json({ error: '렌더링 작업을 찾을 수 없습니다' }, { status: 404, headers: corsHeaders })
    }

    return NextResponse.json(
      {
        success: true,
        job: { id: jobDoc.id, ...jobDoc.data() },
      },
      { headers: corsHeaders }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders })
  }
}
