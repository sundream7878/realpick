import { NextRequest, NextResponse } from "next/server";
import { runMarketerBridge } from "@/lib/marketer/run-marketer";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keywords } = body;

    const result: any = await runMarketerBridge("crawl-community", { 
      keywords: keywords || "나는솔로,최강야구,나솔사계,돌싱글즈"
    });
    
    // 크롤링된 게시글들을 Firestore 컬렉션에 저장
    if (result.success && result.posts) {
      const batch = adminDb.batch();
      const collectionRef = adminDb.collection("viral_posts");

      for (const post of result.posts) {
        // URL이나 ID를 기반으로 문서 참조 생성 (중복 방지)
        const docId = Buffer.from(post.url).toString('base64').substring(0, 50);
        const docRef = collectionRef.doc(docId);
        
        batch.set(docRef, {
          ...post,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
      
      await batch.commit();
    }
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("커뮤니티 크롤링 오류:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const snapshot = await adminDb.collection("viral_posts")
      .orderBy("publishedAt", "desc")
      .limit(50)
      .get();
    
    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return NextResponse.json({ success: true, posts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ success: false, error: "ID가 필요합니다." }, { status: 400 });
    }
    
    await adminDb.collection("viral_posts").doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
