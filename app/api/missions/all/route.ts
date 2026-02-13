// app/api/missions/all/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAllMissions } from '@/lib/firebase/missions'

// CORS 헤더 설정
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status') // 'open', 'approved' 등 필터
    
    console.log('[API] 전체 미션 목록 조회 (missions1 + missions2):', { limit, status })
    
    const result = await getAllMissions(limit)
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500, headers: corsHeaders }
      )
    }
    
    let missions = result.missions || []
    
    // status 필터링 (선택 사항)
    if (status) {
      missions = missions.filter((m: any) => m.status === status)
    }
    
    return NextResponse.json(
      {
        success: true,
        missions,
        count: missions.length
      },
      { headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('[API] 전체 미션 조회 실패:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}
