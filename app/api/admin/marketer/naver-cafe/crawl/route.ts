import { NextRequest, NextResponse } from "next/server";
import { runMarketerBridge } from "@/lib/marketer/run-marketer";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keywords, limit, startDate: startDateStr, endDate: endDateStr } = body;

    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Firebase Admin이 초기화되지 않았습니다." }, { status: 500 });
    }

    // 진행 상황 추적
    const progressId = `naver_cafe_${Date.now()}`;
    const progressRef = adminDb.collection("crawl_progress").doc(progressId);
    
    await progressRef.set({
      status: "running",
      current: 0,
      total: 0,
      message: "네이버 카페 크롤링 시작...",
      startedAt: new Date().toISOString(),
      progressId
    });

    console.log(`[Naver Cafe Crawl] 시작 - Progress ID: ${progressId}`);

    // 날짜 범위 설정 (기본값: 최근 24시간)
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    const startDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 맘카페 리스트 로드 (JSON 파일)
    let cafeList: string[] = [];
    
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const jsonPath = path.join(process.cwd(), "scripts", "marketing", "config", "mamacafe_list.json");
      const jsonData = await fs.readFile(jsonPath, "utf-8");
      const cafes = JSON.parse(jsonData);
      
      // 모든 카페 URL 추출 (최대 50개)
      cafeList = cafes.slice(0, 50).map((cafe: any) => cafe.url).filter((url: string) => url);
      console.log(`[Naver Cafe Crawl] JSON에서 ${cafeList.length}개 카페 로드`);
    } catch (error) {
      console.log("[Naver Cafe Crawl] JSON 로드 실패, 기본 카페 사용:", error);
      cafeList = [
        "https://cafe.naver.com/imsanbu",
        "https://cafe.naver.com/no1sejong",
        "https://cafe.naver.com/chengnamomlife",
        "https://cafe.naver.com/nowonmams",
        "https://cafe.naver.com/lovable1"
      ];
    }

    if (cafeList.length === 0) {
      cafeList = ["https://cafe.naver.com/imsanbu"];
    }

    // 크롤링 실행 (여러 카페 순회하여 limit 개수만큼 수집)
    const result: any = await runMarketerBridge("crawl-naver-cafe", {
      cafe_list: cafeList.join(","), // 여러 카페를 쉼표로 구분하여 순회
      keywords: keywords || "나는솔로,나솔,최강야구,나솔사계,돌싱글즈,환승연애,솔로지옥",
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      exclude_boards: "먹거리,맛집,프리마켓",
      limit: limit || 30, // 목표 게시글 수
      use_browser: "true", // 브라우저 모드 (로그인 필요)
      progress_id: progressRef.id // 진행 상황 추적을 위한 ID 전달
    });

    await progressRef.update({
      status: "processing",
      message: "수집된 게시글 저장 중...",
      current: result.posts?.length || 0,
      total: result.posts?.length || 0
    });
    
    // Firestore에 저장 (naver_cafe_posts 컬렉션 사용)
    if (result.success && result.posts) {
      const batch = adminDb.batch();
      const collectionRef = adminDb.collection("naver_cafe_posts");
      let savedCount = 0;
      let skippedCount = 0;

      for (const post of result.posts) {
        // post_id를 기반으로 문서 ID 생성
        const postId = post.post_id || post.articleid;
        if (!postId) {
          continue;
        }
        
        const docId = `naver_cafe_${postId}`;
        const docRef = collectionRef.doc(docId);
        
        // 이미 존재하는지 확인
        const existingDoc = await docRef.get();
        if (existingDoc.exists) {
          console.log(`[Naver Cafe Crawl] 중복 게시글 스킵: ${post.title?.substring(0, 50)}...`);
          skippedCount++;
          continue;
        }
        
        // AI 추천 댓글 생성
        let suggestedComment = "";
        if (post.content) {
          try {
            const { GoogleGenerativeAI } = await import("@google/generative-ai");
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            
            const commentPrompt = `
다음은 네이버 카페 게시글의 본문 내용입니다.
이 게시글에 달 자연스러운 댓글을 작성해주세요.

**게시글 본문:**
${post.content.substring(0, 1000)}

**댓글 작성 규칙:**
1. 진성 유저의 톤앤매너를 유지할 것 (과도한 칭찬이나 홍보 금지)
2. 공감과 의견을 자연스럽게 표현
3. 리얼픽을 은근하게 언급하되 직접 홍보는 금지
4. 50자 이내로 간결하게 작성
5. 이모티콘 사용 가능

댓글만 출력하세요:
`;
            
            const commentResult = await model.generateContent(commentPrompt);
            suggestedComment = commentResult.response.text().trim();
          } catch (error) {
            console.error("[Naver Cafe Crawl] AI 댓글 생성 실패:", error);
            suggestedComment = "재미있는 글이네요! 저도 궁금했던 내용이에요 😊";
          }
        }
        
        // 문서 저장
        batch.set(docRef, {
          id: docId,
          post_id: postId,
          source: 'naver_cafe',
          sourceName: post.cafe_url ? new URL(post.cafe_url).pathname.split('/').pop() : '네이버 카페',
          title: post.title || '',
          content: post.content || '',
          url: post.url || '',
          viewCount: post.viewCount || 0,
          commentCount: post.commentCount || post.comments?.length || 0,
          showId: post.showId || '',
          suggestedComment: suggestedComment,
          status: 'pending',
          member_id: post.member_id || '',
          nickname: post.nickname || '',
          board_name: post.board_name || '',
          publishedAt: post.date || new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          comments: post.comments || []
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
    console.error("네이버 카페 크롤링 오류:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const progressId = searchParams.get('progressId');

    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Firebase Admin이 초기화되지 않았습니다." }, { status: 500 });
    }

    // 진행 상황 조회
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

    // 게시글 목록 조회
    console.log("[GET naver_cafe_posts] 게시글 목록 조회 시작");
    const snapshot = await adminDb.collection("naver_cafe_posts")
      .orderBy("publishedAt", "desc")
      .limit(50)
      .get();
    
    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log("[GET naver_cafe_posts] 조회된 게시글 수:", posts.length);
    console.log("[GET naver_cafe_posts] 게시글 ID 목록:", posts.map(p => p.id).join(", "));
    
    return NextResponse.json({ success: true, posts });
  } catch (error: any) {
    console.error("[GET naver_cafe_posts] 오류:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!adminDb) {
      console.error("[DELETE naver_cafe_posts] Firebase Admin이 초기화되지 않음");
      return NextResponse.json({ success: false, error: "Firebase Admin이 초기화되지 않았습니다." }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    console.log("[DELETE naver_cafe_posts] 삭제 요청 받음 - ID:", id);
    
    if (!id) {
      console.error("[DELETE naver_cafe_posts] ID가 없음");
      return NextResponse.json({ success: false, error: "ID가 필요합니다." }, { status: 400 });
    }
    
    // 삭제 전 문서 존재 확인
    const docRef = adminDb.collection("naver_cafe_posts").doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      console.warn("[DELETE naver_cafe_posts] 문서가 이미 존재하지 않음:", id);
      return NextResponse.json({ success: true, message: "이미 삭제된 문서입니다." });
    }
    
    console.log("[DELETE naver_cafe_posts] 문서 삭제 중:", id);
    await docRef.delete();
    console.log("[DELETE naver_cafe_posts] 문서 삭제 완료:", id);
    
    // 삭제 확인
    const checkDoc = await docRef.get();
    if (checkDoc.exists) {
      console.error("[DELETE naver_cafe_posts] 삭제 실패 - 문서가 여전히 존재함:", id);
      return NextResponse.json({ success: false, error: "삭제에 실패했습니다." }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: "게시글이 성공적으로 삭제되었습니다." });
  } catch (error: any) {
    console.error("[DELETE naver_cafe_posts] 오류:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
