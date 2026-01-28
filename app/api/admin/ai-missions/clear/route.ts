import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    // ai_missions 컬렉션의 모든 PENDING 미션 가져오기
    const aiMissionsRef = adminDb.collection('ai_missions')
      .where('status', '==', 'PENDING');
    
    const snapshot = await aiMissionsRef.get();
    
    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        message: "삭제할 미션이 없습니다.",
        deletedCount: 0
      });
    }
    
    // 배치로 삭제
    const batch = adminDb.batch();
    let count = 0;
    
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });
    
    await batch.commit();
    
    console.log(`[AI 미션 일괄 삭제] ${count}개 미션 삭제 완료`);
    
    return NextResponse.json({
      success: true,
      message: `${count}개의 미션이 삭제되었습니다.`,
      deletedCount: count
    });
  } catch (error: any) {
    console.error("AI 미션 삭제 오류:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
