import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { missionId, title, description, deadline, options } = body;

    if (!missionId) {
      return NextResponse.json({ 
        success: false, 
        error: "미션 ID가 필요합니다." 
      }, { status: 400 });
    }

    // t_marketing_ai_missions 컬렉션에서 데이터 업데이트
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };
    
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (deadline) updateData.deadline = deadline;
    if (options) updateData.options = options;
    if (kind) updateData.kind = kind;

    await adminDb.collection('t_marketing_ai_missions').doc(missionId).update(updateData);
    
    return NextResponse.json({
      success: true,
      message: "미션이 수정되었습니다."
    });
  } catch (error: any) {
    console.error("AI 미션 수정 오류:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
