import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // ai_missions 컬렉션에서 승인 대기 중인 미션들 가져오기
    const aiMissionsRef = adminDb.collection('ai_missions')
      .where('status', '==', 'PENDING')
      .orderBy('createdAt', 'desc')
      .limit(500); // 더 많은 미션 가져오기
    
    const snapshot = await aiMissionsRef.get();
    
    const missions: any[] = [];
    snapshot.forEach((doc) => {
      missions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`[AI 미션 목록] 총 ${missions.length}개 조회됨`);
    
    return NextResponse.json({
      success: true,
      count: missions.length,
      missions: missions
    });
  } catch (error: any) {
    console.error("AI 미션 목록 조회 오류:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
