// app/api/video/render/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { generateVideoScenario } from '@/lib/video/scenario-generator'
import { renderVideoFromScenario } from '@/lib/video/canvas-renderer'
import { generateMultiPlatformContent } from '@/lib/viral/content-generator'
import { db } from '@/lib/firebase/admin'

export const maxDuration = 300 // 5분 타임아웃 (영상 렌더링용)

export async function POST(req: NextRequest) {
  try {
    const { missionId, track = 'auto', platforms = ['instagram', 'youtube'] } = await req.json()
    
    if (!missionId) {
      return NextResponse.json({ error: '미션 ID가 필요합니다' }, { status: 400 })
    }
    
    console.log(`[Video API] 시작: ${missionId}, track: ${track}`)
    
    // 1. 미션 데이터 가져오기
    const missionDoc = await db.collection('missions').doc(missionId).get()
    if (!missionDoc.exists) {
      return NextResponse.json({ error: '미션을 찾을 수 없습니다' }, { status: 404 })
    }
    
    const mission = { id: missionDoc.id, ...missionDoc.data() } as any
    
    // 2. Gemini로 영상 시나리오 생성
    console.log('[Video API] 시나리오 생성 중...')
    const scenario = await generateVideoScenario({
      mission,
      track,
      dealer: undefined // TODO: 딜러 정보 추가
    })
    
    // 3. Gemini로 SNS 콘텐츠 생성 (동시 처리)
    console.log('[Video API] SNS 콘텐츠 생성 중...')
    const snsContent = await generateMultiPlatformContent({
      mission,
      track,
      platforms
    })
    
    // 4. Canvas로 영상 렌더링
    console.log('[Video API] 영상 렌더링 시작...')
    const videoPath = await renderVideoFromScenario({
      missionId: mission.id,
      scenario,
      thumbnailUrl: mission.thumbnailUrl
    })
    
    // 5. 결과 저장 (Firestore)
    await db.collection('rendering_jobs').doc(missionId).set({
      missionId,
      track,
      status: 'completed',
      videoPath,
      scenario,
      snsContent,
      completedAt: new Date()
    })
    
    console.log(`[Video API] 완료: ${videoPath}`)
    
    return NextResponse.json({
      success: true,
      videoPath,
      scenario,
      snsContent
    })
  } catch (error: any) {
    console.error('[Video API] 실패:', error)
    
    return NextResponse.json({
      error: '영상 생성 실패',
      details: error.message
    }, { status: 500 })
  }
}

// 렌더링 상태 확인
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const missionId = searchParams.get('missionId')
  
  if (!missionId) {
    return NextResponse.json({ error: '미션 ID가 필요합니다' }, { status: 400 })
  }
  
  try {
    const jobDoc = await db.collection('rendering_jobs').doc(missionId).get()
    
    if (!jobDoc.exists) {
      return NextResponse.json({ error: '렌더링 작업을 찾을 수 없습니다' }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      job: { id: jobDoc.id, ...jobDoc.data() }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
