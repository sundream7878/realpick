import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Firebase Admin이 초기화되지 않았습니다." }, { status: 500 });
    }

    // JSON 파일에서 맘카페 리스트 읽기
    const jsonPath = path.join(process.cwd(), "scripts", "marketing", "config", "mamacafe_list.json");
    
    if (!fs.existsSync(jsonPath)) {
      return NextResponse.json({ success: false, error: "맘카페 리스트 JSON 파일을 찾을 수 없습니다." }, { status: 404 });
    }

    const mamacafeList = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

    // Firestore에 저장
    const batch = adminDb.batch();
    const collectionRef = adminDb.collection("mamacafe_list");

    let savedCount = 0;
    for (const cafe of mamacafeList) {
      const docRef = collectionRef.doc(cafe.id);
      batch.set(docRef, {
        ...cafe,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      savedCount++;
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `${savedCount}개 맘카페가 Firestore에 저장되었습니다.`,
      count: savedCount
    });
  } catch (error: any) {
    console.error("맘카페 리스트 동기화 오류:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Firebase Admin이 초기화되지 않았습니다." }, { status: 500 });
    }

    // Firestore에서 맘카페 리스트 조회
    const snapshot = await adminDb.collection("mamacafe_list").get();
    const cafes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      success: true,
      cafes: cafes,
      count: cafes.length
    });
  } catch (error: any) {
    console.error("맘카페 리스트 조회 오류:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
