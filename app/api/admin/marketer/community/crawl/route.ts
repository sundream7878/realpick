import { NextRequest, NextResponse } from "next/server";
import { runMarketerBridge } from "@/lib/marketer/run-marketer";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keywords, limit } = body; // limit 파라미터 추가

    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Firebase Admin이 초기화되지 않았습니다." }, { status: 500 });
    }

    // 진행 상황 추적을 위한 상태 저장
    const progressId = `crawl_${Date.now()}`;
    const progressRef = adminDb.collection("crawl_progress").doc(progressId);
    
    await progressRef.set({
      status: "running",
      current: 0,
      total: 0,
      message: "크롤링 시작...",
      startedAt: new Date().toISOString(),
      progressId
    });

    console.log(`[Community Crawl] 시작 - Progress ID: ${progressId}`);

    // 비동기로 크롤링 실행 (진행 상황 업데이트 포함)
    const result: any = await runMarketerBridge("crawl-community", { 
      keywords: keywords || "나는솔로,최강야구,나솔사계,돌싱글즈",
      limit: limit || 30 // 기본값 30개, 테스트용으로 10개 설정 가능
    });

    await progressRef.update({
      status: "processing",
      message: "수집된 게시글 저장 중...",
      current: result.posts?.length || 0,
      total: result.posts?.length || 0
    });
    
    // 크롤링된 게시글들을 Firestore 컬렉션에 저장
    if (result.success && result.posts) {
      const batch = adminDb.batch();
      
      const collectionRef = adminDb.collection("viral_posts");
      let savedCount = 0;

      for (const post of result.posts) {
        // URL이나 ID를 기반으로 문서 참조 생성 (중복 방지)
        const docId = Buffer.from(post.url).toString('base64').substring(0, 50);
        const docRef = collectionRef.doc(docId);
        
        batch.set(docRef, {
          ...post,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        savedCount++;

        // 진행 상황 업데이트 (10개마다)
        if (savedCount % 10 === 0) {
          await progressRef.update({
            message: `${savedCount}/${result.posts.length}개 게시글 저장 중...`,
            current: savedCount,
            total: result.posts.length
          });
        }
      }
      
      await batch.commit();

      await progressRef.update({
        status: "completed",
        message: `완료! ${savedCount}개 게시글 저장됨`,
        current: savedCount,
        total: savedCount,
        completedAt: new Date().toISOString()
      });
    } else {
      await progressRef.update({
        status: "failed",
        message: result.error || "크롤링 실패",
        completedAt: new Date().toISOString()
      });
    }
    
    return NextResponse.json({ ...result, progressId });
  } catch (error: any) {
    console.error("커뮤니티 크롤링 오류:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const progressId = searchParams.get("progressId");

    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Firebase Admin이 초기화되지 않았습니다." }, { status: 500 });
    }

    // 진행 상황 조회 요청인 경우
    if (progressId) {
      const progressDoc = await adminDb.collection("crawl_progress").doc(progressId).get();
      if (progressDoc.exists) {
        return NextResponse.json({ 
          success: true, 
          progress: { id: progressDoc.id, ...progressDoc.data() }
        });
      }
      return NextResponse.json({ success: false, error: "진행 상황을 찾을 수 없습니다." }, { status: 404 });
    }

    // 일반 게시글 목록 조회
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
    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Firebase Admin이 초기화되지 않았습니다." }, { status: 500 });
    }

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
