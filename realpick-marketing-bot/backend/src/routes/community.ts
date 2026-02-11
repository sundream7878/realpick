import { Router } from 'express';
import { runMarketerBridge } from '../services/pythonBridge.js';
import admin from 'firebase-admin';

const router = Router();
const db = admin.firestore();

/**
 * 커뮤니티 크롤링 API
 */
router.post('/crawl', async (req, res) => {
  try {
    const { keywords, limit } = req.body;

    // 진행 상황 추적
    const progressId = `crawl_${Date.now()}`;
    const progressRef = db.collection("t_marketing_crawl_progress").doc(progressId);
    
    await progressRef.set({
      status: "running",
      current: 0,
      total: 0,
      message: "크롤링 시작...",
      startedAt: new Date().toISOString(),
      progressId
    });

    console.log(`[Community Crawl] 시작 - Progress ID: ${progressId}`);

    // Python 브릿지로 크롤링 실행
    const result: any = await runMarketerBridge("crawl-community", { 
      keywords: keywords || "나는솔로,최강야구,나솔사계,돌싱글즈",
      limit: limit || 30
    });

    await progressRef.update({
      status: "processing",
      message: "수집된 게시글 저장 중...",
      current: result.posts?.length || 0,
      total: result.posts?.length || 0
    });
    
    // Firestore에 저장
    if (result.success && result.posts) {
      const batch = db.batch();
      const collectionRef = db.collection("t_marketing_viral_posts");
      let savedCount = 0;
      let skippedCount = 0;

      for (const post of result.posts) {
        const docId = Buffer.from(post.url).toString('base64').substring(0, 50);
        const docRef = collectionRef.doc(docId);
        
        const existingDoc = await docRef.get();
        if (existingDoc.exists) {
          skippedCount++;
          continue;
        }
        
        batch.set(docRef, {
          ...post,
          updatedAt: new Date().toISOString()
        });
        savedCount++;

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
        message: `완료! ${savedCount}개 저장 (${skippedCount}개 중복)`,
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
    
    return res.json({ ...result, progressId });
  } catch (error: any) {
    console.error("커뮤니티 크롤링 오류:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 게시글 목록 조회
 */
router.get('/posts', async (req, res) => {
  try {
    const snapshot = await db.collection("t_marketing_viral_posts")
      .orderBy("publishedAt", "desc")
      .limit(50)
      .get();
    
    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return res.json({ success: true, posts });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 게시글 삭제
 */
router.delete('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection("t_marketing_viral_posts").doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return res.json({ success: true, message: "이미 삭제된 문서입니다." });
    }
    
    await docRef.delete();
    return res.json({ success: true, message: "게시글이 삭제되었습니다." });
  } catch (error: any) {
    console.error("게시글 삭제 오류:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
