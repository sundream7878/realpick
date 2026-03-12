import { Router } from 'express';
import { runMarketerBridge } from '../services/pythonBridge.js';
import admin from 'firebase-admin';
import crypto from 'crypto';

const router = Router();
const db = admin.firestore();

function stripUrls(text: string) {
  if (!text) return text;
  // Remove URLs
  let out = text.replace(/https?:\/\/[^\s)"]+/gi, '').trim();
  // Remove leftover domain-like tokens
  out = out.replace(/\b(realpick|real-pick)\.com\b/gi, '').trim();
  out = out.replace(/\s{2,}/g, ' ').trim();
  // Remove dangling punctuation
  out = out.replace(/[👉➡️]+/g, '').trim();
  out = out.replace(/[\s,.;:!?]+$/g, '').trim();
  return out;
}

function safeDocIdFromPost(post: any) {
  const url = String(post?.url || '').trim();
  const source = String(post?.source || '').trim();
  const title = String(post?.title || '').trim();
  const publishedAt = String(post?.publishedAt || '').trim();
  const seed = url
    ? `url:${url}`
    : `fallback:${source}|${title}|${publishedAt}`;
  // Firestore doc id must not contain '/'
  return crypto.createHash('sha256').update(seed, 'utf8').digest('hex').slice(0, 48);
}

/**
 * 커뮤니티 크롤링 API
 */
router.post('/crawl', async (req, res) => {
  try {
    const { keywords, limit, selectedShowIds, startDate, endDate, target_sites } = req.body;

    const progressId = `crawl_${Date.now()}`;
    const progressRef = db.collection("t_marketing_crawl_progress").doc(progressId);

    await progressRef.set({
      status: "running",
      current: 0,
      total: limit || 10,
      message: "커뮤니티 검색 시작...",
      startedAt: new Date().toISOString(),
      progressId,
      logs: [],
    });

    console.log(`[Community Crawl] 시작 - Progress ID: ${progressId}`);

    // progressId 즉시 반환 (크롤링은 백그라운드에서 계속)
    res.json({ success: true, progressId });

    // ---- 백그라운드 크롤링 ----
    (async () => {
      try {
        let lastLogWriteAt = 0;
        const pushLog = async (message: string) => {
          const now = Date.now();
          if (now - lastLogWriteAt < 700) return;
          lastLogWriteAt = now;
          try {
            await progressRef.update({
              message,
              logs: admin.firestore.FieldValue.arrayUnion({
                timestamp: new Date().toISOString(),
                message,
              }),
            });
          } catch (_) {}
        };

        const result: any = await runMarketerBridge("crawl-community", {
          keywords: keywords || "",
          limit: limit || 10,
          selectedShowIds: selectedShowIds || "",
          startDate: startDate || "",
          endDate: endDate || "",
          target_sites: target_sites || "", // 선택된 커뮤니티 전달
          mode: "board"
        }, {
          onLogLine: (line) => { void pushLog(line); }
        });

        await progressRef.update({
          status: "processing",
          message: "수집된 게시글 저장 중...",
          current: 0,
          total: result.posts?.length || 0
        });

        if (result.success && result.posts) {
          const collectionRef = db.collection("t_marketing_viral_posts");
          let savedCount = 0;
          let skippedCount = 0;

          for (const post of result.posts) {
            if (post?.suggestedComment) {
              post.suggestedComment = stripUrls(String(post.suggestedComment));
            }
            const docId = safeDocIdFromPost(post);
            const docRef = collectionRef.doc(docId);
            const existingDoc = await docRef.get();
            if (existingDoc.exists) { skippedCount++; continue; }
            await docRef.set({ ...post, updatedAt: new Date().toISOString() });
            savedCount++;
            await progressRef.update({
              current: savedCount,
              total: result.posts.length,
              message: `${savedCount}/${result.posts.length}개 저장 중...`,
            });
          }

          await progressRef.update({
            status: "completed",
            message: `완료! ${savedCount}개 저장 (${skippedCount}개 중복 건너뜀)`,
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
      } catch (bgErr: any) {
        console.error("커뮤니티 크롤링 백그라운드 오류:", bgErr);
        try {
          await progressRef.update({
            status: "failed",
            message: bgErr.message || "알 수 없는 오류",
            completedAt: new Date().toISOString()
          });
        } catch (_) {}
      }
    })();

  } catch (error: any) {
    console.error("커뮤니티 크롤링 오류:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 크롤링 진행 상황 조회 (프론트에서 1초 폴링)
 * GET /api/community/crawl?progressId=...
 */
router.get('/crawl', async (req, res) => {
  try {
    const progressId = String(req.query.progressId || '').trim();
    if (!progressId) {
      return res.status(400).json({ success: false, error: 'progressId가 필요합니다.' });
    }
    const snap = await db.collection("t_marketing_crawl_progress").doc(progressId).get();
    if (!snap.exists) {
      return res.status(404).json({ success: false, error: '진행 상황을 찾을 수 없습니다.' });
    }
    return res.json({ success: true, progress: { id: snap.id, ...(snap.data() || {}) } });
  } catch (error: any) {
    console.error("진행 상황 조회 오류:", error);
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
    
    const posts = snapshot.docs.map(doc => {
      const data: any = doc.data() || {};
      if (data.suggestedComment) {
        data.suggestedComment = stripUrls(String(data.suggestedComment));
      }
      // Firestore의 실제 문서 ID(해시값)를 id 필드로 사용하도록 보장
      return { ...data, id: doc.id };
    });
    
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
