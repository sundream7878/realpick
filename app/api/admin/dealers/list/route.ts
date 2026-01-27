import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET(request: NextRequest) {
  try {
    const dealersRef = adminDb.collection('dealers').limit(100);
    const dealersSnapshot = await dealersRef.get();
    
    const dealers: any[] = [];
    dealersSnapshot.forEach((doc) => {
      dealers.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // 구독자 수 기준으로 정렬
    dealers.sort((a, b) => (b.subscriberCount || 0) - (a.subscriberCount || 0));
    
    return NextResponse.json({
      success: true,
      count: dealers.length,
      dealers: dealers
    });
  } catch (error: any) {
    console.error("Dealers 목록 조회 오류:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
