import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET(request: NextRequest) {
  try {
    // videos 컬렉션에서 최근 수집된 영상들 가져오기
    const videosRef = adminDb.collection('videos')
      .orderBy('collectedAt', 'desc')
      .limit(100);
    
    const videosSnapshot = await videosRef.get();
    
    const allVideos: any[] = [];
    
    videosSnapshot.forEach((doc) => {
      const data = doc.data();
      allVideos.push({
        id: doc.id,
        ...data
      });
    });
    
    return NextResponse.json({
      success: true,
      count: allVideos.length,
      videos: allVideos
    });
  } catch (error: any) {
    console.error("영상 목록 조회 오류:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
