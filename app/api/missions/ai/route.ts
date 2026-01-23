import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET() {
  try {
    // missions1 컬렉션에서 isAIMission이 true인 것만 조회
    const snapshot = await adminDb
      .collection("missions1")
      .where("isAIMission", "==", true)
      .limit(100)
      .get();

    // 클라이언트 사이드에서 정렬 (인덱스 불필요)
    const missions = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .sort((a: any, b: any) => {
        const timeA = a.createdAt?._seconds || 0;
        const timeB = b.createdAt?._seconds || 0;
        return timeB - timeA; // 최신순 정렬
      });

    return NextResponse.json({ 
      success: true, 
      missions 
    });

  } catch (error: any) {
    console.error("[AI Missions API] 오류:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
