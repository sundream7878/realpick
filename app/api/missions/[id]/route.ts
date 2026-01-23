import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const missionId = params.id;

    // missions1, missions2에서 시도
    const collections = ["missions1", "missions2"];
    
    let deleted = false;
    for (const collectionName of collections) {
      const docRef = adminDb.collection(collectionName).doc(missionId);
      const doc = await docRef.get();
      
      if (doc.exists) {
        await docRef.delete();
        deleted = true;
        console.log(`[Mission Delete API] ${collectionName}에서 미션 ${missionId} 삭제 완료`);
        break;
      }
    }

    if (!deleted) {
      return NextResponse.json({ 
        success: false, 
        error: "미션을 찾을 수 없습니다." 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "미션이 삭제되었습니다." 
    });

  } catch (error: any) {
    console.error("[Mission Delete API] 오류:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
