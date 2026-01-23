import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET() {
  try {
    // Firestore에서 isBot이 true인 유저들만 조회
    const snapshot = await adminDb
      .collection("users")
      .where("isBot", "==", true)
      .limit(100)
      .get();

    // 클라이언트 사이드에서 정렬 (인덱스 불필요)
    const bots = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          nickname: data.nickname || "익명",
          role: data.role || "PICKER",
          email: data.email || null,
          createdAt: data.createdAt,
          points: data.points || 0,
          _timestamp: data.createdAt?._seconds || 0
        };
      })
      .sort((a, b) => b._timestamp - a._timestamp); // 최신순 정렬

    return NextResponse.json({ 
      success: true, 
      bots,
      count: bots.length
    });

  } catch (error: any) {
    console.error("[Bot List API] 오류:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
