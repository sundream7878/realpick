// app/api/video/download/route.ts
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

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
  const { searchParams } = new URL(req.url)
  const videoPath = searchParams.get('path')
  
  if (!videoPath) {
    return NextResponse.json({ error: '경로가 필요합니다' }, { status: 400 })
  }
  
  try {
    // 보안: temp 폴더 내부만 허용
    const normalizedPath = path.normalize(videoPath)
    const tempDir = path.join(process.cwd(), 'temp')
    
    if (!normalizedPath.startsWith(tempDir)) {
      return NextResponse.json({ error: '잘못된 경로' }, { status: 403 })
    }
    
    if (!fs.existsSync(videoPath)) {
      return NextResponse.json({ error: '파일을 찾을 수 없습니다' }, { status: 404 })
    }
    
    // 파일 읽기
    const fileBuffer = fs.readFileSync(videoPath)
    const fileName = path.basename(videoPath)
    
    // MP4 파일로 응답
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString()
      }
    })
  } catch (error: any) {
    console.error('[Video Download] 실패:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
