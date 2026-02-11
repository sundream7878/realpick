import { NextRequest, NextResponse } from "next/server";
import { runMarketerBridge } from "@/lib/marketer/run-marketer";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keywords, limit, selectedShowIds, startDate, endDate } = body;

    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Firebase Admin이 초기화되지 않았습니다." }, { status: 500 });
    }

    // 진행 상황 추적을 위한 상태 저장
    const progressId = `crawl_${Date.now()}`;
    const progressRef = adminDb.collection("t_marketing_crawl_progress").doc(progressId);
    
    await progressRef.set({
      status: "running",
      current: 0,
      total: 0,
      message: "크롤링 시작...",
      startedAt: new Date().toISOString(),
      progressId
    });

    console.log(`[Community Crawl] 시작 - Progress ID: ${progressId}`);
    console.log(`[Community Crawl] 날짜 범위: ${startDate} ~ ${endDate}`);
    console.log(`[Community Crawl] 키워드: ${keywords}`);

    // 비동기로 크롤링 실행 (진행 상황 업데이트 포함)
    const result: any = await runMarketerBridge("crawl-community", { 
      keywords: keywords || "나는솔로,최강야구,나솔사계,돌싱글즈",
      limit: limit || 30,
      start_date: startDate,
      end_date: endDate,
      selected_show_ids: selectedShowIds
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
      
      const collectionRef = adminDb.collection("t_marketing_viral_posts");
      let savedCount = 0;
      let skippedCount = 0;

      for (const post of result.posts) {
        // URL을 기반으로 문서 참조 생성 (중복 방지)
        const docId = Buffer.from(post.url).toString('base64').substring(0, 50);
        const docRef = collectionRef.doc(docId);
        
        // 이미 존재하는 게시글인지 확인
        const existingDoc = await docRef.get();
        if (existingDoc.exists) {
          console.log(`[Community Crawl] 중복 게시글 스킵: ${post.title?.substring(0, 50)}...`);
          skippedCount++;
          continue;
        }
        
        batch.set(docRef, {
          ...post,
          updatedAt: new Date().toISOString()
        });
        savedCount++;

        // 진행 상황 업데이트 (10개마다)
        if (savedCount % 10 === 0) {
          await progressRef.update({
            message: `${savedCount}/${result.posts.length}개 게시글 저장 중... (${skippedCount}개 중복 스킵)`,
            current: savedCount,
            total: result.posts.length
          });
        }
      }
      
      await batch.commit();

      await progressRef.update({
        status: "completed",
        message: `완료! ${savedCount}개 게시글 저장됨 (${skippedCount}개 중복 스킵)`,
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
      const progressDoc = await adminDb.collection("t_marketing_crawl_progress").doc(progressId).get();
      if (progressDoc.exists) {
        return NextResponse.json({ 
          success: true, 
          progress: { id: progressDoc.id, ...progressDoc.data() }
        });
      }
      return NextResponse.json({ success: false, error: "진행 상황을 찾을 수 없습니다." }, { status: 404 });
    }

    // 일반 게시글 목록 조회
    console.log("[GET t_marketing_viral_posts] 게시글 목록 조회 시작");
    const snapshot = await adminDb.collection("t_marketing_viral_posts")
      .orderBy("publishedAt", "desc")
      .limit(50)
      .get();
    
    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log("[GET viral_posts] 조회된 게시글 수:", posts.length);
    console.log("[GET viral_posts] 게시글 ID 목록:", posts.map(p => p.id).join(", "));
    
    return NextResponse.json({ success: true, posts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!adminDb) {
      console.error("[DELETE viral_posts] Firebase Admin이 초기화되지 않음");
      return NextResponse.json({ success: false, error: "Firebase Admin이 초기화되지 않았습니다." }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    console.log("[DELETE viral_posts] 삭제 요청 받음 - ID:", id);
    
    if (!id) {
      console.error("[DELETE viral_posts] ID가 없음");
      return NextResponse.json({ success: false, error: "ID가 필요합니다." }, { status: 400 });
    }
    
    // 삭제 전 문서 존재 확인
    const docRef = adminDb.collection("t_marketing_viral_posts").doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      console.warn("[DELETE viral_posts] 문서가 이미 존재하지 않음:", id);
      return NextResponse.json({ success: true, message: "이미 삭제된 문서입니다." });
    }
    
    console.log("[DELETE viral_posts] 문서 삭제 중:", id);
    await docRef.delete();
    console.log("[DELETE viral_posts] 문서 삭제 완료:", id);
    
    // 삭제 확인
    const checkDoc = await docRef.get();
    if (checkDoc.exists) {
      console.error("[DELETE viral_posts] 삭제 실패 - 문서가 여전히 존재함:", id);
      return NextResponse.json({ success: false, error: "삭제에 실패했습니다." }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: "게시글이 성공적으로 삭제되었습니다." });
  } catch (error: any) {
    console.error("[DELETE viral_posts] 오류:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
