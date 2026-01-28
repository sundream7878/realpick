import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { missionId } = body;

    if (!missionId) {
      return NextResponse.json({ 
        success: false, 
        error: "미션 ID가 필요합니다." 
      }, { status: 400 });
    }

    // ai_missions 컬렉션에서 status를 REJECTED로 변경
    await adminDb.collection('ai_missions').doc(missionId).update({
      status: 'REJECTED',
      rejectedAt: new Date().toISOString()
    });
    
    return NextResponse.json({
      success: true,
      message: "미션이 거부되었습니다."
    });
  } catch (error: any) {
    console.error("AI 미션 거부 오류:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
