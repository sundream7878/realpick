import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET(request: NextRequest) {
  try {
    // dealers 컬렉션에서 최근 수집된 채널들 가져오기
    const dealersRef = adminDb.collection('dealers')
      .orderBy('lastCrawledAt', 'desc')
      .limit(50);
    
    const dealersSnapshot = await dealersRef.get();
    
    const channels: any[] = [];
    dealersSnapshot.forEach((doc) => {
      channels.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return NextResponse.json({
      success: true,
      count: channels.length,
      channels: channels
    });
  } catch (error: any) {
    console.error("채널 목록 조회 오류:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
